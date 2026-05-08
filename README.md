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

## Content Guide

Use these sizes when designing images so they stay sharp on both desktop and mobile:

- Sermons: `1600 x 900` or `1920 x 1080` ratio `16:9`
- Editorial posts: `1200 x 900` or `1600 x 1200` ratio `4:3`
- Events: `1600 x 900` or `1920 x 1080` ratio `16:9`

For mobile-safe results, keep faces, titles, and logos centered so the sides can crop cleanly.

### Sample Sermon Text

```text
Title: Walking in Faith
Speaker: Pastor John Doe
Description: A practical message on trusting God through every season.
Content: Full sermon notes go here.
```

### Sample Editorial Text

```text
Title: Living with Hope
Byline: By RCCG HOPFAN Media Team
Summary: A short reflection on hope, grace, and daily discipleship.
Content: Full article content goes here.
```

### Sample Event Text

```text
Title: Family Thanksgiving Service
Description: Join us for worship, testimonies, and a special time of thanksgiving.
Date: 2026-04-12
Time: 10:00 AM
Location: Main Sanctuary
Category: Worship
```

If you want to add more examples, keep them in this same format and replace the sample values with your own church content.
