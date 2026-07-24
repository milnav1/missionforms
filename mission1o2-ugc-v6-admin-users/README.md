# Mission 1o2 — UGC, Testimonial & Release Tracker

A full-stack site for collecting customer testimonials/UGC and signed media releases, backed by a real Postgres database, with an authenticated admin dashboard and CSV export. Branded to Mission 1o2's 2026 brand guidelines.

## What changed from the prototype

This used to be a static site using Netlify Forms and a browser-only sample-data dashboard. It's now wired to real infrastructure:

- **Netlify Database** (managed Postgres) stores every submission and release.
- **Netlify Blobs** stores uploaded photos/videos and signature images.
- **Netlify Functions** handle form submissions and power the admin dashboard's reads, edits, deletes, and CSV export.
- **Netlify Identity** gates the admin dashboard with real per-person login (email/password or Google), replacing the shared Basic Auth password.

Because it now needs a build step (to install dependencies for the Functions), this site has to be deployed via a **connected GitHub repo** rather than dragging a zip onto Netlify Drop.

## One-time setup (do these in order)

### 1. Push this project to GitHub

```bash
cd mission1o2-ugc
git init
git add .
git commit -m "Initial commit"
```

Create an empty repository on GitHub (no README/license — just an empty repo), then:

```bash
git remote add origin https://github.com/<your-org>/<your-repo>.git
git branch -M main
git push -u origin main
```

### 2. Connect the repo to your existing Netlify site

In Netlify: your site → **Project configuration → Build & deploy → Link repository** (or "Link site to Git" if offered) → choose the GitHub repo you just created. Netlify should auto-detect the `netlify.toml` (build command `npm install`, functions directory `netlify/functions`, publish directory `.`).

### 3. Confirm your Netlify plan supports Netlify Database

**Netlify Database is only available on Credit-based plans** (Pro and above at the time of writing) — it's not included on the free Starter plan. If you're currently on Starter, you'll need to upgrade before the database provisions successfully. Check **Team settings → Billing** if you're not sure which plan you're on.

### 4. Let the database provision itself

Once the repo is connected and a deploy runs, Netlify automatically provisions a Postgres database for this site and applies the schema in `netlify/database/migrations/0001_init.sql` — no manual database setup needed. You can watch this happen in the deploy log, and browse the resulting tables afterward under the **Database** tab in your site's Netlify dashboard.

### 5. Enable Identity and invite yourself as an admin

1. In Netlify: your site → **Project configuration → Identity → Enable Identity**.
2. Still on that page, under **Registration**, set it to **Invite only** (so random visitors can't self-register as admins).
3. Click **Invite users**, enter your email (and any teammates who need admin access), and send the invite.
4. Check your email, click the invite link — it'll land back on `/admin.html` and prompt you to set a password.
5. If you want "Sign in with Google" to work, go to **Identity → External providers → Google** and enable it (you'll need a Google OAuth Client ID/Secret — Netlify's UI links directly to the Google Cloud Console setup steps).

### 6. Deploy

Push to `main` (or trigger a deploy in the Netlify UI) and you're live. Netlify Blobs needs no setup — it's available automatically once the site deploys.

## Testing it end-to-end

1. Go to `/index.html`, submit a test story (with a photo if you like).
2. Go to `/release.html`, sign a test release.
3. Go to `/admin.html`, log in, and confirm both show up under their respective tabs — including the media/signature "View" link and the stats at the top.
4. Try editing a row's status and notes, then deleting a row, to confirm both work.
5. Click "Export CSV" on each tab and confirm the download opens cleanly in Excel/Sheets.
6. Go to the **Users** tab, click "Add admin user," enter a teammate's email, and confirm they receive a "set your password" email and can sign in afterward. Try "Reset password" on an existing user, and "Delete" on a non-you user, to confirm both work.

## What's included

- **`index.html` / `release.html`** — public forms. Both submit via `fetch` (not Netlify Forms) directly to Netlify Functions, which write to Postgres and (for photos/videos/signatures) Netlify Blobs.
- **`thank-you.html` / `release-thank-you.html`** — confirmation pages.
- **`admin.html`** — Identity-gated dashboard: Submissions and Releases tabs, search/filter, edit, delete, and CSV export, all backed by live data.
- **`netlify/functions/`**
  - `submit-story.js`, `submit-release.js` — public, unauthenticated write endpoints (each includes a honeypot field for basic bot filtering).
  - `admin-data.js`, `admin-update.js`, `admin-delete.js`, `export-csv.js`, `media.js`, `admin-users.js` — all require a signed-in Identity user. `admin-users.js` powers the Users tab (list/add/reset-password/delete admin accounts) via `@netlify/identity`'s server-only `admin.*` API.
- **`netlify/database/migrations/0001_init.sql`** — schema for the `submissions` and `releases` tables. Add new migration files here for future schema changes (see [Netlify's migration docs](https://docs.netlify.com/build/data-and-storage/netlify-database/migrations/)).
- **`css/style.css`**, **`js/main.js`**, **`js/release.js`**, **`js/admin.js`** — front-end behavior.
- **`assets/logos/`**, **`assets/favicon.png`** — brand assets extracted from the brand guidelines PDF.

## CSV export for your CRM

Each tab in `/admin.html` has an **Export CSV** button that downloads all rows in that table (submissions or releases) as a CSV, including status, notes, opt-in info, and timestamps — ready to import into most CRMs. Both are also available directly (while logged in) at `/api/export-csv?table=submissions` and `/api/export-csv?table=releases`.

## Before this goes live

- **Fonts:** the brand guide specifies Adelphi PE Variable Text and Config Variable Condensed, both licensed/custom fonts. This site substitutes free, similar-shaped Google Fonts (Manrope + Barlow Condensed). Swap in the real fonts (as web font files) before final launch.
- **Release form text** (in the modal on `index.html`, and inline on `release.html`) is template legal language for demonstration only — have it reviewed and finalized by legal counsel, especially the unrestricted-use language on `release.html`.
- **Logo files** were extracted from the brand PDF at reasonable resolution for web use; ask your designer for official vector/PNG exports for print or very large use cases.
- **Admin roles:** every admin user has full access (view/edit/delete/export everything, plus managing other admins). Manage who has access from the **Users** tab in `/admin.html` itself — no need to use Netlify's dashboard. "Add admin user" creates the account and emails them a link to set their own password; "Reset password" re-sends that link; "Delete" revokes access immediately. You can't delete your own account or the last remaining admin. If you want tiered permissions (e.g. view-only staff) later, `@netlify/identity` supports role-based access — happy to add that when needed.
- Consider adding spam protection beyond the built-in honeypot fields (e.g., a CAPTCHA) if either public form gets abused.
