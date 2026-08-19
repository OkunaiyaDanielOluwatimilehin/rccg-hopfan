import express from "express";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import path from "path";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import dotenv from "dotenv";
import { createRequire } from "module";
import { createClient } from "@supabase/supabase-js";
import webPush from "web-push";
import { buildAnalyticsPayload } from "./src/lib/analytics";

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

const supabaseAdmin = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  : null;

const VAPID_PUBLIC_KEY = (process.env.VAPID_PUBLIC_KEY || "").trim();
const VAPID_PRIVATE_KEY = (process.env.VAPID_PRIVATE_KEY || "").trim();
const VAPID_SUBJECT = (process.env.VAPID_SUBJECT || "mailto:admin@rccghopfan.org").trim();

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webPush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

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
    const auth = await authenticateAdminRequest(req, res);
    if (!auth) return;

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

  app.get("/api/admin/analytics", async (req, res) => {
    const auth = await authenticateAdminRequest(req, res);
    if (!auth) return;

    const daysRaw = Number(req.query.days || 7);
    const days = [7, 30, 90].includes(daysRaw) ? daysRaw : 7;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    try {
      const [viewsRes, downloadsRes, watchRes] = await Promise.all([
        supabaseAdmin!
          .from("content_activity")
          .select("id,created_at")
          .eq("action", "view")
          .gte("created_at", since),
        supabaseAdmin!
          .from("content_downloads")
          .select("id,created_at")
          .gte("created_at", since),
        supabaseAdmin!
          .from("watch_progress")
          .select("duration_seconds,completion_percentage,last_viewed_at")
          .gte("last_viewed_at", since),
      ]);

      const firstError = viewsRes.error || downloadsRes.error || watchRes.error;
      if (firstError) throw firstError;

      res.json(buildAnalyticsPayload({
        days,
        views: viewsRes.data || [],
        downloads: downloadsRes.data || [],
        watchRows: watchRes.data || [],
      }));
    } catch (error) {
      console.error("Error loading analytics:", error);
      res.status(500).json({ error: "Failed to load analytics data" });
    }
  });

  app.post("/api/admin/push/send", async (req, res) => {
    const auth = await authenticateAdminRequest(req, res);
    if (!auth) return;

    if (!supabaseAdmin || !VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      return res.status(500).json({ error: "Push notifications are not configured." });
    }

    const title = String(req.body?.title || "RCCG HOPFAN").trim();
    const body = String(req.body?.body || req.body?.message || "").trim();
    const url = String(req.body?.url || "/").trim();
    const userId = typeof req.body?.user_id === "string" ? req.body.user_id.trim() : "";

    if (!body) return res.status(400).json({ error: "Missing notification body." });

    const query = supabaseAdmin.from("push_subscriptions").select("id,subscription");
    const { data, error } = userId ? await query.eq("user_id", userId) : await query;
    if (error) throw error;

    const results = await Promise.allSettled((data || []).map((row: any) =>
      webPush.sendNotification(row.subscription, JSON.stringify({ title, body, url })),
    ));

    const staleIds = results
      .map((result, index) => ({ result, id: (data || [])[index]?.id }))
      .filter(({ result }) => result.status === "rejected" && [404, 410].includes(Number((result as PromiseRejectedResult).reason?.statusCode)))
      .map(({ id }) => id)
      .filter(Boolean);

    if (staleIds.length > 0) {
      await supabaseAdmin.from("push_subscriptions").delete().in("id", staleIds);
    }

    res.json({
      sent: results.filter((result) => result.status === "fulfilled").length,
      failed: results.filter((result) => result.status === "rejected").length,
      removed: staleIds.length,
    });
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
