# WES Job Costing

Job-level cost tracking for Worldwide Electrical Services. Tracks material, labor, and component costs per job against sell price for margin visibility.

## Stack
- Next.js 14
- Supabase (project: ulyycjtrshpsjpvbztkr)
- Vercel

## Deploy

1. Push this folder to a new GitHub repo
2. Import to Vercel
3. Set environment variables in Vercel dashboard:

```
NEXT_PUBLIC_SUPABASE_URL=https://ulyycjtrshpsjpvbztkr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

The Supabase schema is already live — 5 tables created, 14 materials seeded.

## Local dev

```bash
npm install
npm run dev
```

## Schema

- `wes_materials` — material library with unit costs
- `wes_jobs` — job header (name, customer, date, sell price)
- `wes_job_materials` — material line items per job
- `wes_job_labor` — labor entries per job (hours × rate)
- `wes_job_components` — components/misc line items per job

## Labor rate

Currently $30/hr, stored as `rate` on each `wes_job_labor` row.
To change the default, update `LABOR_RATE` in `pages/jobs/[id].js`.
