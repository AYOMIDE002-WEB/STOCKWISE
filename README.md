# Stockwise

A modern rebuild of the SME Manager project using **Next.js + Tailwind CSS + Supabase**.

## Why this stack
- **Next.js + Tailwind** gives a genuinely modern, competition-ready UI.
- **Supabase** provides the Postgres database, authentication, and row-level
  security out of the box, so you're not hand-rolling login/password hashing.
- You can deploy this to **Vercel** (free) for a live public link judges can
  actually open and click through, instead of only running on your laptop.

## Setup

### 1. Create a Supabase project
Go to https://supabase.com, create a free project, and note down:
- Project URL
- Anon/public API key

### 2. Run the database schema
In your Supabase project, open the **SQL Editor** and run the entire contents
of `supabase/schema.sql`. This creates all tables, security policies, and a
bit of sample data.

### 3. Create your first Admin user
1. In Supabase, go to **Authentication -> Users -> Add User**, and create
   yourself an account with an email and password.
2. In the SQL Editor, run:
   ```sql
   update profiles set role = 'Admin' where id = 'PASTE-YOUR-USER-ID-HERE';
   ```
   (Your user ID is shown in the Authentication -> Users table.)

### 4. Configure environment variables
Copy `.env.local.example` to `.env.local` and fill in your Supabase URL,
anon key, AND service role key (Project Settings -> API -> service_role,
Supabase's admin key). The service role key is only ever used
server-side (in `app/api/*/route.ts`) — it must never be exposed with the
`NEXT_PUBLIC_` prefix or committed to a public repo.

### 5. Install and run
```bash
npm install
npm run dev
```
Then open http://localhost:3000 — it will redirect you to the login page.

### 6. Deploy (optional, for your competition demo)
Push this project to a GitHub repo, then import it at https://vercel.com —
it will detect Next.js automatically. Add the same three environment
variables from Step 4 in the Vercel project settings.

## What's built
- [x] Project scaffold (Next.js App Router, Tailwind, TypeScript)
- [x] Database schema with roles (Admin/Staff), row-level security, and a
      `record_sale_cart()` function that safely records a multi-item sale
      and decrements stock for every item in one atomic transaction
- [x] Login page
- [x] Sidebar navigation (role-aware) with a live online/offline indicator
- [x] Dashboard with live charts: revenue trend (14 days) and top-selling
      products (30 days), plus summary cards and recent sales
- [x] Products page: add, restock, edit, delete (Admin only) — Staff see a
      read-only view
- [x] Customers page: add and edit (both roles)
- [x] Sales page: build a multi-product cart, record it as ONE sale,
      stock updates for every item automatically, and one PDF invoice
      lists every item purchased
- [x] Offline mode: if you record a sale with no internet, it's saved to
      the browser (IndexedDB) and automatically synced the moment you're
      back online
- [x] Manage Users page (Admin only): create accounts (with the service
      role key, server-side only), edit name/role/password, delete users —
      with safeguards against deleting/demoting the last Admin
- [x] PWA setup — manifest + service worker + placeholder icons, so it's
      installable like a real app

## Known limitations / things to polish before the competition
- The placeholder app icons (`public/icons/`) are simple text badges —
  swap in a real logo before your demo.
- The service worker caches pages but does not yet cache Supabase API
  responses for a fully offline browsing experience — only the *recording
  a sale* flow works offline, per your original ask.
- No automated tests yet.



## Upgrading an existing database to multi-item sales
If you ran an earlier version of `schema.sql`, run
`supabase/migration_multi_item_sales.sql` ONCE in the Supabase SQL Editor.
It keeps your existing sales (each becomes a sale with one line item) and
switches the database over to the new cart-based structure. Fresh installs
should just run `schema.sql` as normal and skip the migration.
