import express from "express";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import path from "path";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import dotenv from "dotenv";
import { createRequire } from "module";
import { createClient } from "@supabase/supabase-js";
import { StreamClient } from "@stream-io/node-sdk";

function loadEnv() {
  // Match Vite's typical env file precedence:
  // .env, .env.local, .env.<mode>, .env.<mode>.local
  const mode = process.env.NODE_ENV || "development";
  const candidates = [".env", ".env.local", `.env.${mode}`, `.env.${mode}.local`];
  for (const candidate of candidates) {
    const fullPath = path.join(process.cwd(), candidate);
    if (fs.existsSync(fullPath)) {
      dotenv.config({ path: fullPath, override: false });
    }
  }
}

loadEnv();

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").trim();
const SUPABASE_SERVICE_ROLE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
const STREAM_API_KEY = (process.env.STREAM_API_KEY || process.env.VITE_STREAM_API_KEY || "").trim();
const STREAM_API_SECRET = (process.env.STREAM_API_SECRET || "").trim();

const supabaseAdmin = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  : null;

const streamServerClient = STREAM_API_KEY && STREAM_API_SECRET
  ? new StreamClient(STREAM_API_KEY, STREAM_API_SECRET)
  : null;

const require = createRequire(import.meta.url);
const { getVerse } = require("@glowstudent/youversion");

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Cloudflare R2 / S3 Configuration
  const s3Client = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID || "placeholder",
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "placeholder",
    },
  });

  // Endpoint to get a presigned URL for uploading to R2
  app.post("/api/storage/upload-url", async (req, res) => {
    const fileName: string | undefined = req.body?.fileName;
    const fileType: string | undefined = req.body?.fileType || req.body?.contentType;
    const requestedPath: string | undefined = req.body?.path;

    if (!process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
      return res.status(500).json({ error: "Storage credentials not configured" });
    }

    if (!fileName || typeof fileName !== "string") {
      return res.status(400).json({ error: "Missing fileName" });
    }

    try {
      const safePath = (p: string) => p.replace(/\\/g, "/").replace(/^\/+/, "").replace(/\.\./g, "");
      const key = requestedPath ? safePath(requestedPath) : `uploads/${Date.now()}-${safePath(fileName)}`;
      const command = new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key,
        ContentType: fileType || "application/octet-stream",
      });

      const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
      const publicUrl = `${process.env.VITE_R2_PUBLIC_DOMAIN}/${key}`;

      res.json({ uploadUrl, publicUrl, key });
    } catch (error) {
      console.error("Error generating presigned URL:", error);
      res.status(500).json({ error: "Failed to generate upload URL" });
    }
  });

  app.get("/api/bible/verse", async (req, res) => {
    const reference = typeof req.query.reference === "string" ? req.query.reference.trim() : "";
    const version = typeof req.query.version === "string" ? req.query.version.trim().toUpperCase() || "NIV" : "NIV";

    const match = reference.match(/^(?<book>(?:[1-3]\s)?[A-Za-z][A-Za-z'\-\s]+?)\s+(?<chapter>\d+):(?<start>\d+)(?:-(?<end>\d+))?$/);
    if (!match?.groups?.book || !match.groups.chapter || !match.groups.start) {
      return res.status(400).json({ error: "Invalid reference format" });
    }

    const book = match.groups.book.trim();
    const chapter = match.groups.chapter.trim();
    const verseStart = match.groups.start.trim();
    const verseEnd = match.groups.end?.trim();
    const verses = verseEnd ? `${verseStart}-${verseEnd}` : verseStart;

    try {
      const result = await getVerse(book, chapter, verses, version);
      if (!result?.passage) {
        return res.status(404).json({ error: "Verse not found" });
      }

      return res.json({
        book: result.book || book,
        chapter,
        verses,
        version: result.version || version,
        reference: `${book} ${chapter}:${verses}`,
        passage: result.passage,
      });
    } catch (error) {
      console.error("Error looking up bible verse:", error);
      return res.status(500).json({ error: "Failed to look up verse" });
    }
  });

  async function authenticateAdminRequest(req: express.Request, res: express.Response) {
    if (!supabaseAdmin) {
      res.status(500).json({ error: "Supabase service role key is not configured." });
      return null;
    }

    const authHeader = typeof req.headers.authorization === "string" ? req.headers.authorization : "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
    if (!token) {
      res.status(401).json({ error: "Missing authorization token." });
      return null;
    }

    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData.user) {
      res.status(401).json({ error: "Invalid session." });
      return null;
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id,role,full_name")
      .eq("id", userData.user.id)
      .maybeSingle();

    if (profileError || !profile || profile.role !== "admin") {
      res.status(403).json({ error: "Admin access required." });
      return null;
    }

    return {
      user: userData.user,
      profile,
    };
  }

  function assertStreamClient() {
    if (!streamServerClient) {
      throw new Error("Stream API credentials are not configured.");
    }
    return streamServerClient;
  }

  async function createStreamCall(params: {
    callId: string;
    title: string;
    description: string;
    createdById: string;
    createdByName: string;
    createdByImage?: string | null;
  }) {
    const client = assertStreamClient();
    await client.upsertUsers([
      {
        id: params.createdById,
        role: "admin",
        name: params.createdByName,
        image: params.createdByImage || undefined,
      },
    ]);

    const call = client.video.call("livestream", params.callId);
    const response = await call.getOrCreate({
      data: {
        created_by_id: params.createdById,
        members: [{ user_id: params.createdById, role: "host" }],
        custom: {
          title: params.title,
          description: params.description,
          source: "church-dashboard",
        },
      },
    });

    return response;
  }

  async function createStreamToken(params: {
    userId: string;
    userName: string;
    userImage?: string | null;
  }) {
    const client = assertStreamClient();
    await client.upsertUsers([
      {
        id: params.userId,
        role: "admin",
        name: params.userName,
        image: params.userImage || undefined,
      },
    ]);

    return client.generateUserToken({
      user_id: params.userId,
      validity_in_seconds: 60 * 60,
    });
  }

  async function endStreamCall(callId: string) {
    const client = assertStreamClient();
    const call = client.video.call("livestream", callId);
    await call.endCall();
  }

  async function logAdminActivity(params: {
    action: string;
    entityType: string;
    entityId: string | null;
    actorName: string;
    title: string;
    body?: string | null;
    metadata?: Record<string, unknown>;
  }) {
    if (!supabaseAdmin) return;

    await supabaseAdmin.from("admin_activity_logs").insert({
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId,
      actor_name: params.actorName,
      title: params.title,
      body: params.body || null,
      metadata: params.metadata || {},
    });
  }

  async function publishLiveAnnouncement(params: {
    streamId: string;
    title: string;
    body: string;
    metadata?: Record<string, unknown>;
    actorId: string;
  }) {
    if (!supabaseAdmin) return null;

    const { data, error } = await supabaseAdmin
      .from("live_announcements")
      .insert({
        stream_id: params.streamId,
        title: params.title,
        body: params.body,
        status: "live",
        published_at: new Date().toISOString(),
        metadata: params.metadata || {},
        created_by: params.actorId,
      })
      .select("*")
      .single();

    if (error) throw error;
    return data;
  }

  app.post("/api/stream/token", async (req, res) => {
    const admin = await authenticateAdminRequest(req, res);
    if (!admin) return;

    try {
      const token = await createStreamToken({
        userId: admin.user.id,
        userName: admin.profile.full_name || admin.user.email || "Admin",
        userImage: null,
      });

      return res.json({
        token,
        user: {
          id: admin.user.id,
          name: admin.profile.full_name || admin.user.email || "Admin",
        },
      });
    } catch (error) {
      console.error("Error creating Stream token:", error);
      return res.status(500).json({ error: error instanceof Error ? error.message : "Failed to create Stream token." });
    }
  });

  app.post("/api/streams/go-live", async (req, res) => {
    const admin = await authenticateAdminRequest(req, res);
    if (!admin) return;

    const title = typeof req.body?.title === "string" ? req.body.title.trim() : "";
    const description = typeof req.body?.description === "string" ? req.body.description.trim() : "";
    const callId = typeof req.body?.callId === "string" ? req.body.callId.trim() : crypto.randomUUID();

    if (!title) {
      return res.status(400).json({ error: "Stream title is required." });
    }

    try {
      await createStreamCall({
        callId,
        title,
        description,
        createdById: admin.user.id,
        createdByName: admin.profile.full_name || admin.user.email || "Admin",
        createdByImage: null,
      });
      const now = new Date().toISOString();

      if (!supabaseAdmin) {
        return res.status(500).json({ error: "Supabase admin client not configured." });
      }

      const { data: stream, error: streamError } = await supabaseAdmin
        .from("streams")
        .insert({
          title,
          description: description || null,
          status: "starting",
          input_mode: "browser_webrtc",
          input_label: "Browser room",
          input_constraints: {
            mode: "browser_webrtc",
          },
          stream_call_type: "livestream",
          stream_call_id: callId,
          stream_join_url: `/live?callId=${encodeURIComponent(callId)}`,
          started_at: now,
          created_by: admin.profile.id,
          updated_by: admin.profile.id,
          metadata: {
            stream_call_id: callId,
            stream_call_type: "livestream",
            initiated_by: admin.profile.full_name || admin.user.email || admin.user.id,
            source: "admin-go-live",
            input_mode: "browser_webrtc",
          },
        })
        .select("*")
        .single();

      if (streamError) throw streamError;

      const announcement = await publishLiveAnnouncement({
        streamId: stream.id,
        title: title || "We are live now",
        body: description || "Join us live for worship and the Word.",
        metadata: {
          stream_id: stream.id,
          stream_call_id: callId,
        },
        actorId: admin.profile.id,
      });

      await logAdminActivity({
        action: "create",
        entityType: "stream",
        entityId: stream.id,
        actorName: admin.profile.full_name || admin.user.email || "Admin",
        title: "Live stream started",
        body: title,
        metadata: {
          stream_call_id: callId,
        },
      });

      return res.json({ stream, announcement });
    } catch (error) {
      console.error("Error starting live stream:", error);
      return res.status(500).json({ error: error instanceof Error ? error.message : "Failed to start live stream." });
    }
  });

  app.post("/api/streams/end", async (req, res) => {
    const admin = await authenticateAdminRequest(req, res);
    if (!admin) return;

    const streamId = typeof req.body?.streamId === "string" ? req.body.streamId.trim() : "";
    if (!streamId) {
      return res.status(400).json({ error: "streamId is required." });
    }

    try {
      if (!supabaseAdmin) {
        return res.status(500).json({ error: "Supabase admin client not configured." });
      }

      const { data: streamRow, error: streamError } = await supabaseAdmin
        .from("streams")
        .select("*")
        .eq("id", streamId)
        .maybeSingle();

      if (streamError) throw streamError;
      if (!streamRow) {
        return res.status(404).json({ error: "Stream not found." });
      }

      if (streamRow.stream_call_id) {
        await endStreamCall(streamRow.stream_call_id);
      }

      const { data: stream, error: updateError } = await supabaseAdmin
        .from("streams")
        .update({
          status: "ended",
          ended_at: new Date().toISOString(),
          updated_by: admin.profile.id,
        })
        .eq("id", streamId)
        .select("*")
        .single();

      if (updateError) throw updateError;

      await logAdminActivity({
        action: "end",
        entityType: "stream",
        entityId: stream.id,
        actorName: admin.profile.full_name || admin.user.email || "Admin",
        title: "Live stream ended",
        body: stream.title,
        metadata: {
          cloudflare_uid: stream.cloudflare_uid,
        },
      });

      return res.json({ stream });
    } catch (error) {
      console.error("Error ending live stream:", error);
      return res.status(500).json({ error: error instanceof Error ? error.message : "Failed to end live stream." });
    }
  });


  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
