<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/161dd800-f188-4a4e-9862-5d4910409c35

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Create a local env file (server + client):
   - Copy `.env.example` to `.env.local` (or `.env`)
   - Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (client-side)
   - (Optional) Set Cloudflare R2 env vars if you want in-app uploads for gallery/posts
3. Run the app:
   `npm run dev`
