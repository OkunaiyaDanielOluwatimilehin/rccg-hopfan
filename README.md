# RCCG HOPFAN Website

Church website and admin dashboard for RCCG House of Prayer for All Nations.

## Stack

- Frontend: React 19, TypeScript, Vite, Tailwind CSS 4
- Routing: React Router
- Backend API: Express in `server.ts`
- Database/Auth/Storage: Supabase
- Media CDN: Cloudflare R2 for gallery uploads, Supabase Storage for site images
- Analytics: Vercel Analytics plus internal engagement tables

## Local Setup

1. Install Node.js 20 or newer.
2. Install packages:

```bash
npm install
```

3. Create `.env.local` from `.env.example`.
4. Add required values:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

5. Add optional Cloudflare R2 values for gallery uploads:

```env
CLOUDFLARE_R2_ACCOUNT_ID=
CLOUDFLARE_R2_ACCESS_KEY_ID=
CLOUDFLARE_R2_SECRET_ACCESS_KEY=
CLOUDFLARE_R2_BUCKET=
CLOUDFLARE_R2_PUBLIC_URL=
```

6. Add optional web push values:

```env
VITE_VAPID_PUBLIC_KEY=
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:admin@rccghopfan.org
```

7. Start dev server:

```bash
npm run dev
```

## Main Commands

```bash
npm run dev      # Express + Vite dev server
npm run build    # Production build + prerender
npm run preview  # Preview built app
npm run lint     # TypeScript check
npm test         # Node test runner
```

## Frontend Map

- `src/App.tsx`: route tree, auth provider, notifications, public/admin layout split
- `src/components/Layout.tsx`: public nav and footer
- `src/components/Navbar.tsx`: site navigation
- `src/pages/Home.tsx`: homepage sections, hero carousel, events, giving, visit form, newsletter
- `src/pages/About.tsx`: about, leadership, departments, contact/social links
- `src/pages/Sermons.tsx`: sermon listing
- `src/pages/SermonDetail.tsx`: sermon playback, notes, comments, reactions, downloads
- `src/pages/Editorial.tsx`: post listing
- `src/pages/PostDetail.tsx`: article detail, comments, sharing
- `src/pages/Devotionals.tsx`: devotional feed
- `src/pages/Events.tsx`: event listing
- `src/pages/EventDetail.tsx`: event detail and interest flow
- `src/pages/Gallery.tsx`: grouped gallery
- `src/pages/Newcomers.tsx`: public newcomer form
- `src/pages/FormPage.tsx`: dynamic custom forms
- `src/pages/Profile.tsx`: member profile and birthday data

## Admin Map

- `src/pages/Admin/DashboardLayout.tsx`: admin shell, permissions, sidebar, mobile nav
- `src/pages/Admin/Overview.tsx`: dashboard summary
- `src/pages/Admin/Settings.tsx`: site content, branding, social links, teams, uploads
- `src/pages/Admin/Posts.tsx`: editorial CRUD
- `src/pages/Admin/Sermons.tsx`: sermon CRUD
- `src/pages/Admin/Devotionals.tsx`: devotional CRUD
- `src/pages/Admin/Events.tsx`: event CRUD
- `src/pages/Admin/Forms.tsx`: custom forms
- `src/pages/Admin/Newcomers.tsx`: newcomer form builder
- `src/pages/Admin/NewcomerResponses.tsx`: newcomer submissions
- `src/pages/Admin/PrayerRequests.tsx`: prayer inbox
- `src/pages/Admin/CounselingRequests.tsx`: counseling inbox
- `src/pages/Admin/FollowUp.tsx`: follow-up assignments
- `src/pages/Admin/DepartmentRequests.tsx`: department interest inbox
- `src/pages/Admin/Notifications.tsx`: assigned alerts
- `src/pages/Admin/Analytics.tsx`: engagement metrics
- `src/pages/Admin/Users.tsx`: roles and profiles

## Backend API

`server.ts` runs Express and Vite middleware in development.

Main endpoints:

- `GET /api/admin/analytics?days=7|30|90`
- `POST /api/uploads/r2/presign`
- `POST /api/admin/push/send`

Analytics requires:

```http
Authorization: Bearer <supabase_access_token>
```

The server validates admin access through Supabase profile roles.

Push send body:

```json
{
  "title": "RCCG HOPFAN",
  "body": "New message",
  "url": "/events",
  "user_id": "optional-user-id"
}
```

Omit `user_id` to send to every stored browser subscription.

## Supabase Database

Run migrations in `supabase/migrations` in date order.

Important tables:

- `profiles`: auth profile, role, avatar, birthday month/day
- `site_settings`: homepage, branding, contact, social links, giving, role permissions
- `posts`: editorial articles
- `sermons`: sermons and media
- `devotionals`: devotionals
- `events`: church events
- `departments`: ministry departments
- `leadership`: leader profiles
- `gallery`: image gallery
- `testimonials`: homepage testimonials
- `newsletter_subscriptions`: newsletter signups
- `prayer_requests`: prayer inbox
- `counseling_requests`: counseling inbox
- `department_requests`: department interest forms
- `newcomers`: newcomer responses
- `custom_forms` and `custom_form_entries`: dynamic forms
- `request_notifications`: admin assignment alerts
- `push_subscriptions`: browser push subscriptions
- `content_views`, `content_downloads`, `watch_progress`: engagement analytics

## Auth And Roles

Users sign in through Supabase Auth.

Supported roles:

- `admin`
- `editorial`
- `prayer`
- `counselor`
- `follow_up`
- `department_admin`
- `member`

Role access is enforced in frontend routing and server analytics checks. The editable access matrix lives in `site_settings.role_permissions`.

## Uploads And CDN

Site images use Supabase Storage bucket:

- Bucket: `site-images`
- Public read access required
- Used for hero, pastor, identity, auth, department, leadership, and page header images

Gallery uploads use Cloudflare R2:

1. Create R2 bucket.
2. Create R2 API token with object read/write for that bucket.
3. Add R2 env vars to hosting provider.
4. Set `CLOUDFLARE_R2_PUBLIC_URL` to custom domain or public bucket URL.
5. Ensure Cloudflare cache rules allow public image delivery.

Recommended Cloudflare setup:

- Add custom domain like `media.example.com`.
- Point it to R2 public bucket.
- Enable HTTPS.
- Cache static assets aggressively.
- Keep browser cache at 1 month or longer for immutable upload paths.

## Website Content Steps

1. Log in at `/admin/login`.
2. Open `/admin/settings`.
3. Add hero title, subtitle, hero image, service times, contact details, giving accounts.
4. Open `/admin/settings/content`.
5. Edit About, Social Links, page headers, Mission/Vision, Pastor section.
6. Open `/admin/settings/branding`.
7. Set fonts, identity image, auth images.
8. Open `/admin/settings/community`.
9. Add leadership, departments, teams, gallery images, newsletter records.
10. Save each section after edits.

## Content Publishing Steps

Articles:

1. Go to `/admin/posts`.
2. Add title, slug, summary, content, category, image.
3. Set status to `published`.
4. Set `published_at`.
5. Save.

Sermons:

1. Go to `/admin/sermons`.
2. Add title, speaker, date, media URL, thumbnail, notes.
3. Save.

Devotionals:

1. Go to `/admin/devotionals`.
2. Add title, scripture, content, date, image.
3. Publish.

Events:

1. Go to `/admin/events`.
2. Add title, date, time, location, description, category, image.
3. Publish.

Forms:

1. Go to `/admin/forms`.
2. Create form title and slug.
3. Add fields.
4. Publish.
5. Share `/forms/<slug>`.

Newcomers:

1. Go to `/admin/newcomers`.
2. Choose fields shown on `/newcomers`.
3. Review responses at `/admin/newcomers/responses`.
4. Assign follow-up in `/admin/follow-up`.

## Notifications

- Birthday toast appears on the home route when logged-in user visits on their birthday.
- Birthday toast appears once for first visit, once after midday, and once after evening on that birthday.
- New content toasts show for recent events, sermons, articles, and devotionals.
- Assignment notifications are stored in `request_notifications`.
- Browser push subscriptions are stored in `push_subscriptions`.

Push setup:

1. Generate VAPID keys:

```bash
npx web-push generate-vapid-keys
```

2. Add public key to `VITE_VAPID_PUBLIC_KEY`.
3. Add same public key to `VAPID_PUBLIC_KEY`.
4. Add private key to `VAPID_PRIVATE_KEY`.
5. Add contact mailto URL to `VAPID_SUBJECT`.
6. Run `20260819_add_push_subscriptions.sql`.
7. Log in once from each browser and allow notifications.
8. Send from `POST /api/admin/push/send`.

## Deployment

Vercel:

1. Connect repo.
2. Set framework to Vite or use existing `vercel.json`.
3. Add all Supabase env vars.
4. Add R2 env vars if uploads are needed.
5. Deploy.
6. Test `/`, `/admin/login`, `/api/admin/analytics`.

Supabase:

1. Create project.
2. Run migrations.
3. Create `site-images` bucket.
4. Add public read policy for published images.
5. Confirm RLS policies allow public reads for published content.
6. Create first admin user.
7. Set that profile role to `admin`.

Cloudflare:

1. Create R2 bucket.
2. Add custom domain for media.
3. Add DNS record.
4. Enable cache.
5. Add R2 env vars to Vercel.
6. Upload test gallery image from admin.

## Verification Checklist

- Homepage loads without console errors.
- Hero image or carousel displays.
- Social links save and display in footer/About.
- Birthday toast appears on home for matching profile date.
- Admin sidebar collapses and expands on desktop.
- Content pages show only published/scheduled-visible content.
- Forms write rows to Supabase.
- Uploads return public URLs.
- Analytics endpoint rejects missing token and accepts admin token.
- `npm run lint` passes.
- `npm test` passes.
- `npm run build` completes.

## Image Sizes

- Hero: `2400 x 1400`
- Page headers: `1920 x 800`
- Sermons: `1600 x 900`
- Events: `1600 x 900`
- Editorial posts: `1600 x 1200`
- Gallery: `1600 x 1200` or larger
- Leadership: `1200 x 1200`

Keep faces and important text centered so mobile cropping works.
