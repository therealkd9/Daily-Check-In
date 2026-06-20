# Daily Check-In Dashboard

A simple dashboard for checking in on **Reid** and **Kaden** every day, backed by
**Supabase** (database) and deployed as a static site on **Vercel**.

## What it does

- **Daily check-in cards** for Reid and Kaden — log a mood (Good / Okay / Rough) and a note.
- **Streak tracking** — consecutive days each person has been checked in on.
- **Shared history** — last 14 days of check-ins, synced across every device via Supabase.
- **No login** — anyone with the link can view and add check-ins (single shared dashboard).

## Architecture

```
Browser (index.html + app.js)
        │  @supabase/supabase-js (anon key)
        ▼
Supabase  →  Postgres table `check_ins`  (Row Level Security: public read/write)
```

There is **no server code** — the page talks to Supabase directly from the browser.

---

## 1. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. In the dashboard, open **SQL Editor → New query**, paste the contents of
   [`supabase-schema.sql`](./supabase-schema.sql), and click **Run**.
   This creates the `check_ins` table and the public read/write RLS policies.
3. Go to **Project Settings → API** and copy:
   - **Project URL**
   - **Project API keys → `anon` `public`**

> The `anon` key is meant to be public and is safe to ship in the browser.
> Access is controlled by Row Level Security, not by hiding the key.
> **Never** put the `service_role` key in this app.

## 2. Configure the app

Open [`config.js`](./config.js) and paste your values:

```js
window.SUPABASE_URL = "https://YOUR-PROJECT.supabase.co";
window.SUPABASE_ANON_KEY = "eyJhbGciOi...your anon key...";
```

## 3. Run locally

It's a static site — serve the folder with anything, e.g.:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

(Open via a server, not `file://`, so the ES module import works.)

## 4. Deploy to Vercel

1. Push this repo to GitHub (already done if you're reading this on GitHub).
2. In [vercel.com](https://vercel.com), **Add New → Project → Import** this repo.
3. Framework preset: **Other** (it's a static site — no build step needed).
4. Click **Deploy**. Vercel serves the static files directly.

Every push to your branch redeploys automatically.

> Because this is a static site, `config.js` is committed with your Supabase
> URL + anon key (both public-safe). If you'd rather not commit them, you can
> instead inject them at build time, but for the anon key it isn't necessary.

---

## Files

| File | Purpose |
|------|---------|
| `index.html` | Page structure |
| `styles.css` | Styling / layout |
| `app.js` | Check-in logic + Supabase queries |
| `config.js` | Your Supabase URL + anon key |
| `supabase-schema.sql` | Database table + RLS policies |
| `vercel.json` | Vercel static-site config |

## Possible next steps

- **Add Supabase Auth** (email magic link) to make it private + per-user.
- **Daily reminder** email/notification via a Supabase Edge Function + cron.
- **Charts/trends** over weeks and months.
