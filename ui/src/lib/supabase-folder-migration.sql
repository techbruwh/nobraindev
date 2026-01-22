-- ============================================
-- Folder Management Migration for NoBrainDev
-- ============================================

-- ============================================
-- 1. Create Folders Table (WITHOUT FK to auth.users)
-- ============================================
CREATE TABLE IF NOT EXISTS folders (
    id BIGSERIAL PRIMARY KEY,
    user_email TEXT NOT NULL,
    local_id INTEGER NOT NULL UNIQUE,
    name TEXT NOT NULL,
    icon TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Create indexes for folder lookups
CREATE INDEX IF NOT EXISTS idx_folders_user_email ON folders(user_email);
CREATE INDEX IF NOT EXISTS idx_folders_local_id ON folders(local_id);

-- Add unique constraint per user-email + name combination
CREATE UNIQUE INDEX IF NOT EXISTS idx_folders_user_name ON folders(user_email, name);

-- ============================================
-- 2. Add folder_id to Snippets Table
-- ============================================
-- Add folder_id column to snippets table (if not exists)
ALTER TABLE snippets
ADD COLUMN IF NOT EXISTS folder_id INTEGER;

-- Note: We don't add FK constraint to folders.id here because:
-- 1. It references local_id (INTEGER), not the cloud id (BIGSERIAL)
-- 2. The relationship is maintained at application level during sync
-- 3. The folder_id in snippets stores the LOCAL SQLite folder ID

-- Create index for folder queries
CREATE INDEX IF NOT EXISTS idx_snippets_folder_id ON snippets(folder_id);

-- ============================================
-- 3. Enable Row Level Security (RLS)
-- ============================================
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. Create RLS Policies for Folders
-- ============================================

-- Helper: Get email from auth.uid()
-- This uses a subquery to get the email from the auth.users table

-- Users can view their own folders
CREATE POLICY "Users can view their own folders"
    ON folders FOR SELECT
    USING (
        user_email = (
            SELECT email FROM auth.users WHERE id = auth.uid()
        )
    );

-- Users can insert their own folders
CREATE POLICY "Users can insert their own folders"
    ON folders FOR INSERT
    WITH CHECK (
        user_email = (
            SELECT email FROM auth.users WHERE id = auth.uid()
        )
    );

-- Users can update their own folders
CREATE POLICY "Users can update their own folders"
    ON folders FOR UPDATE
    USING (
        user_email = (
            SELECT email FROM auth.users WHERE id = auth.uid()
        )
    );

-- Users can delete their own folders
CREATE POLICY "Users can delete their own folders"
    ON folders FOR DELETE
    USING (
        user_email = (
            SELECT email FROM auth.users WHERE id = auth.uid()
        )
    );

-- ============================================
-- 5. Verification Queries
-- ============================================

-- Check folders table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'folders'
ORDER BY ordinal_position;

-- Check snippets table has folder_id
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'snippets'
  AND column_name = 'folder_id';

-- Check RLS policies on folders
SELECT policyname, tablename, cmd
FROM pg_policies
WHERE tablename = 'folders';

-- Check indexes on folders
SELECT indexname, tablename, indexdef
FROM pg_indexes
WHERE tablename = 'folders';

-- ============================================
-- 6. Test Data (Optional - for testing only)
-- ============================================

-- Get your user email first:
-- SELECT email FROM auth.users WHERE id = auth.uid();

-- Then insert a test folder (replace with your actual email):
/*
INSERT INTO folders (user_email, local_id, name, created_at, updated_at)
VALUES (
    'your-email@example.com',
    1,
    'JavaScript',
    '2024-01-22T00:00:00Z',
    '2024-01-22T00:00:00Z'
);
*/

-- Verify the insert:
/*
SELECT * FROM folders WHERE user_email = 'your-email@example.com';
*/

-- Clean up test data:
/*
DELETE FROM folders WHERE user_email = 'your-email@example.com' AND local_id = 1;
*/
