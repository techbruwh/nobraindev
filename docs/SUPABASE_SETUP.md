# Supabase Setup Guide for NoBrainDev

This guide will help you set up Supabase for cloud sync and authentication in NoBrainDev.

## Prerequisites

- A Supabase account (free tier is sufficient)
- Node.js and npm installed
- Tauri development environment set up

## Step 1: Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Fill in:
   - Project name: `nobraindev` (or your preferred name)
   - Database password: (save this securely)
   - Region: Choose closest to your users
5. Click "Create new project" and wait for setup to complete

## Step 2: Get Your API Credentials

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy the following:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **anon/public key** (this is safe to use in your client app)

## Step 3: Configure Environment Variables

1. Navigate to `ui/` directory in your NoBrainDev project
2. Create a `.env` file (copy from `.env.example`):

```bash
cd ui
cp .env.example .env
```

3. Edit `.env` and add your credentials:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_APP_ENV=development
```

⚠️ **Important**: Never commit your `.env` file to git! It's already in `.gitignore`.

## Step 4: Create Database Table

Run this SQL in your Supabase SQL Editor (**SQL Editor** in left sidebar):

```sql
-- Create snippets table for cloud sync
CREATE TABLE snippets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email TEXT NOT NULL,
  local_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  language TEXT NOT NULL,
  tags TEXT,
  description TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure unique local_id per user
  UNIQUE(user_email, local_id)
);

-- Create index for faster lookups
CREATE INDEX idx_snippets_user_email ON snippets(user_email);
CREATE INDEX idx_snippets_updated_at ON snippets(updated_at DESC);

-- Enable Row Level Security
ALTER TABLE snippets ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can only access their own snippets
CREATE POLICY "Users can view their own snippets"
  ON snippets FOR SELECT
  USING (auth.jwt() ->> 'email' = user_email);

CREATE POLICY "Users can insert their own snippets"
  ON snippets FOR INSERT
  WITH CHECK (auth.jwt() ->> 'email' = user_email);

CREATE POLICY "Users can update their own snippets"
  ON snippets FOR UPDATE
  USING (auth.jwt() ->> 'email' = user_email)
  WITH CHECK (auth.jwt() ->> 'email' = user_email);

CREATE POLICY "Users can delete their own snippets"
  ON snippets FOR DELETE
  USING (auth.jwt() ->> 'email' = user_email);
```

## Step 5: Configure Google OAuth (Optional but Recommended)

1. In Supabase dashboard, go to **Authentication** → **Providers**
2. Find **Google** and toggle it on
3. You'll need to create a Google OAuth app:

### Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth client ID**
5. Choose **Web application**
6. Add authorized redirect URIs:
   - `https://your-project-id.supabase.co/auth/v1/callback`
   - `http://localhost:1420` (for local development)
7. Copy the **Client ID** and **Client Secret**

### Configure in Supabase

1. Back in Supabase, paste your Google OAuth credentials
2. Click **Save**

## Step 6: Test the Integration

1. Start your NoBrainDev app:

```bash
./dev.sh
```

2. Click on the **Account** icon in the left sidebar
3. Click **Continue with Google**
4. Complete the Google sign-in flow
5. Once signed in, try syncing your snippets with the **Sync Now** button

## Step 7: Production Setup

For production builds, update `ui/.env.production`:

```env
VITE_SUPABASE_URL=https://your-production-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-production-anon-key
VITE_APP_ENV=production
```

Then build with:

```bash
npm run build
```

## Security Features

✅ **Row Level Security (RLS)**: Users can only access their own data
✅ **Secure Token Storage**: OAuth tokens stored in OS keychain via Rust
✅ **No Credentials in Code**: All secrets in environment variables
✅ **HTTPS Only**: All API calls over secure connections

## Troubleshooting

### "Supabase not configured" error
- Make sure your `.env` file exists in the `ui/` directory
- Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set
- Restart the dev server after creating `.env`

### Google OAuth not working
- Check authorized redirect URIs match exactly
- Verify Google OAuth is enabled in Supabase
- Clear browser cache and try again

### Sync not working
- Check browser console for errors
- Verify you're signed in
- Ensure database table and policies are created
- Check Supabase logs in dashboard

## Architecture Overview

```
┌─────────────────┐
│   NoBrainDev    │
│   (Frontend)    │
└────────┬────────┘
         │
         ├─── Supabase Auth ──→ Google OAuth
         │
         ├─── Local SQLite ───→ Snippets
         │
         └─── Supabase DB ────→ Cloud Sync
                ↓
         Rust Backend
         (Secure Tokens)
```

## Next Steps

- Set up auto-sync on app start
- Add conflict resolution UI
- Implement offline mode handling
- Add sync status indicators

## Support

For issues or questions:
- Check [Supabase Documentation](https://supabase.com/docs)
- Open an issue on GitHub
- Visit [techbruwh.com](https://techbruwh.com)
