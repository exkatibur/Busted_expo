# Supabase Migration Guide - BUSTED!

This guide explains how to set up and run the database migrations for BUSTED!

## Overview

The database schema consists of:
- **5 tables**: rooms, players, questions, votes, round_results
- **4 functions**: generate_room_code, calculate_round_results, cleanup_old_rooms, get_random_question
- **RLS policies**: Permissive policies for anonymous auth
- **100+ seeded questions**: Across all 4 vibes (party, date_night, family, spicy)

## Prerequisites

1. **Supabase Project**
   - Create a project at https://supabase.com
   - Note your project URL and anon key

2. **Supabase CLI** (recommended)
   ```bash
   npm install -g supabase
   ```

   Or use the Supabase Dashboard SQL Editor (manual method)

## Migration Files

```
supabase/migrations/
├── 001_create_rooms.sql           # Rooms table
├── 002_create_players.sql         # Players table
├── 003_create_questions.sql       # Questions table
├── 004_create_votes.sql           # Votes table
├── 005_create_round_results.sql   # Round results table
├── 006_create_functions.sql       # Database functions
├── 007_enable_rls.sql             # RLS policies
└── 008_seed_questions.sql         # Initial questions (100+)
```

## Method 1: Using Supabase CLI (Recommended)

### 1. Link to your project

```bash
cd /Users/katrinhoerschelmann/development/exkatibur/Kassiopeia/Apps/Busted
supabase link --project-ref YOUR_PROJECT_REF
```

Find your project ref in the Supabase Dashboard URL:
`https://app.supabase.com/project/YOUR_PROJECT_REF`

### 2. Push migrations

```bash
supabase db push
```

This will:
- Execute all migrations in order
- Create all tables, functions, and policies
- Seed 100+ questions
- Show you a summary of changes

### 3. Verify

```bash
supabase db diff
```

Should show "No schema changes detected" if everything is up to date.

## Method 2: Using Supabase Dashboard (Manual)

If you prefer the dashboard or don't want to use the CLI:

### 1. Open SQL Editor

Go to your Supabase Dashboard:
- Navigate to **SQL Editor**
- Click **+ New query**

### 2. Run migrations in order

Copy and paste each migration file content in order:

1. `001_create_rooms.sql`
2. `002_create_players.sql`
3. `003_create_questions.sql`
4. `004_create_votes.sql`
5. `005_create_round_results.sql`
6. `006_create_functions.sql`
7. `007_enable_rls.sql`
8. `008_seed_questions.sql`

Click **Run** after pasting each file.

### 3. Verify

After running all migrations, check:
- **Database** → **Tables** - Should show 5 tables
- **Database** → **Functions** - Should show 4 functions
- **Authentication** → **Policies** - Should show RLS policies
- Run this query to verify questions:
  ```sql
  SELECT vibe, COUNT(*) as count
  FROM questions
  GROUP BY vibe;
  ```

Expected output:
```
party       | 25
date_night  | 25
family      | 25
spicy       | 25
```

## Verification Checklist

After running migrations, verify:

- [ ] All 5 tables exist: `rooms`, `players`, `questions`, `votes`, `round_results`
- [ ] All functions exist: `generate_room_code`, `calculate_round_results`, `cleanup_old_rooms`, `get_random_question`
- [ ] RLS is enabled on all tables
- [ ] Questions are seeded (100+ total)
- [ ] Test room creation:
  ```sql
  SELECT generate_room_code();
  ```

## Environment Variables

Update your `.env` file with your Supabase credentials:

```env
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

Find these in:
- **Settings** → **API** → Project URL
- **Settings** → **API** → Project API keys → `anon` `public`

## Testing the Setup

### Test 1: Create a room via SQL

```sql
-- Generate a room code
SELECT generate_room_code();

-- Create a test room
INSERT INTO rooms (code, host_id, vibe)
VALUES ('TEST01', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'party')
RETURNING *;
```

### Test 2: Get a random question

```sql
SELECT * FROM get_random_question('party', '{}');
```

### Test 3: Test from app

1. Start the app: `npx expo start`
2. Create a room - should generate a 6-character code
3. Join the room with the code
4. Check Supabase Dashboard → **Database** → **rooms** table

## Row Level Security (RLS)

**Important**: This app uses **permissive RLS policies** because we use anonymous UUIDs instead of Supabase Auth.

The policies allow:
- Anyone can view rooms (needed for joining by code)
- Anyone can insert/update rooms, players, votes
- Security is enforced by app logic and database constraints

For production with real user accounts, you would tighten these policies to use `auth.uid()`.

## Rollback (If needed)

If something goes wrong and you need to start over:

### Option 1: Using CLI

```bash
# Reset local database
supabase db reset
```

### Option 2: Manual (Dashboard)

Run this SQL to drop everything:

```sql
-- Drop tables (cascade will remove foreign keys)
DROP TABLE IF EXISTS round_results CASCADE;
DROP TABLE IF EXISTS votes CASCADE;
DROP TABLE IF EXISTS players CASCADE;
DROP TABLE IF EXISTS rooms CASCADE;
DROP TABLE IF EXISTS questions CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS generate_room_code();
DROP FUNCTION IF EXISTS calculate_round_results(UUID, INTEGER, UUID);
DROP FUNCTION IF EXISTS cleanup_old_rooms();
DROP FUNCTION IF EXISTS get_random_question(VARCHAR, UUID[]);
```

Then re-run all migrations.

## Common Issues

### Issue: "relation already exists"

**Solution**: You're running migrations twice. Either:
- Reset the database (see Rollback)
- Or skip to the next migration

### Issue: "function already exists"

**Solution**: Same as above - either reset or skip

### Issue: "permission denied"

**Solution**: Make sure you're using the service role key (for migrations) or check RLS policies

### Issue: No questions seeded

**Solution**: Run `008_seed_questions.sql` again. It's safe to run multiple times.

## Next Steps

After migrations are complete:

1. **Test the app**: Create and join rooms
2. **Add more questions**: Duplicate and modify `008_seed_questions.sql`
3. **Monitor**: Check Supabase Dashboard → **Database** → **Logs**
4. **Setup Realtime**: Already configured in `useRealtime.ts` hook

## Optional: Scheduled Cleanup

To automatically delete old rooms (older than 24 hours), set up a cron job:

### Using Supabase Edge Functions

Create an edge function that runs daily:

```typescript
// supabase/functions/cleanup-rooms/index.ts
import { createClient } from '@supabase/supabase-js';

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { data, error } = await supabase.rpc('cleanup_old_rooms');

  return new Response(
    JSON.stringify({ deleted: data, error }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});
```

Then schedule it using a service like:
- GitHub Actions
- Vercel Cron
- Cloud Scheduler

Or use Supabase's pg_cron extension (requires Pro plan).

## Support

If you run into issues:

1. Check Supabase Dashboard → **Database** → **Logs**
2. Check app console for errors
3. Verify environment variables are set correctly
4. Try resetting and re-running migrations

## Database Diagram

```
┌─────────────┐
│   rooms     │
├─────────────┤
│ id (PK)     │
│ code (UK)   │──┐
│ host_id     │  │
│ vibe        │  │
│ status      │  │
└─────────────┘  │
                 │
       ┌─────────┼────────────┐
       │         │            │
       ▼         ▼            ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│  players    │ │   votes     │ │round_results│
├─────────────┤ ├─────────────┤ ├─────────────┤
│ id (PK)     │ │ id (PK)     │ │ id (PK)     │
│ room_id (FK)│ │ room_id (FK)│ │ room_id (FK)│
│ user_id     │ │question_id  │ │ question_id │
│ username    │ │ round       │ │ round       │
│ is_host     │ │ voter_id    │ │ winner_id   │
└─────────────┘ │voted_for_id │ │ results_json│
                └─────────────┘ └─────────────┘
                       │
                       ▼
                ┌─────────────┐
                │ questions   │
                ├─────────────┤
                │ id (PK)     │
                │ vibe        │
                │ text        │
                │ is_premium  │
                └─────────────┘
```

## Migration History

| Version | Date | Description |
|---------|------|-------------|
| 001 | 2024-12-05 | Create rooms table |
| 002 | 2024-12-05 | Create players table |
| 003 | 2024-12-05 | Create questions table |
| 004 | 2024-12-05 | Create votes table |
| 005 | 2024-12-05 | Create round_results table |
| 006 | 2024-12-05 | Create database functions |
| 007 | 2024-12-05 | Enable RLS policies |
| 008 | 2024-12-05 | Seed initial questions (100+) |

---

**Last updated**: December 5, 2024
**Database Version**: 1.0.0
**Status**: Production Ready
