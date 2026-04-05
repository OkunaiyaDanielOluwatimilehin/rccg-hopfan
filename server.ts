import express from "express";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import path from "path";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import dotenv from "dotenv";

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
