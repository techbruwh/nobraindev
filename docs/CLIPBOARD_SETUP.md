# Clipboard Management - Setup Guide

## Supabase Table Creation

Run this SQL in your Supabase SQL Editor to create the clipboard history table:

```sql
-- Create clipboard_history table
CREATE TABLE clipboard_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_email TEXT NOT NULL,
    local_id INTEGER,
    content TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'system',
    category TEXT NOT NULL DEFAULT 'general',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create index for user_email and created_at for efficient querying
CREATE INDEX idx_clipboard_user_created ON clipboard_history(user_email, created_at DESC);

-- Create index for local_id for sync operations
CREATE INDEX idx_clipboard_local_id ON clipboard_history(user_email, local_id);

-- Enable Row Level Security (RLS)
ALTER TABLE clipboard_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policy: Users can only see their own clipboard history
CREATE POLICY "Users can view their own clipboard history"
    ON clipboard_history
    FOR SELECT
    USING (auth.uid()::text = user_email OR user_email = current_setting('request.jwt.claims')::json->>'email');

CREATE POLICY "Users can insert their own clipboard history"
    ON clipboard_history
    FOR INSERT
    WITH CHECK (auth.uid()::text = user_email OR user_email = current_setting('request.jwt.claims')::json->>'email');

CREATE POLICY "Users can update their own clipboard history"
    ON clipboard_history
    FOR UPDATE
    USING (auth.uid()::text = user_email OR user_email = current_setting('request.jwt.claims')::json->>'email');

CREATE POLICY "Users can delete their own clipboard history"
    ON clipboard_history
    FOR DELETE
    USING (auth.uid()::text = user_email OR user_email = current_setting('request.jwt.claims')::json->>'email');
```

## Features

### 1. Local Storage (SQLite)
- Stores last 100 clipboard entries locally
- Fast access without network dependency
- Automatic cleanup of old entries

### 2. Cloud Sync (Supabase)
- Two-way sync with Supabase
- Push local changes to cloud
- Pull cloud changes to local
- Conflict resolution (cloud takes precedence if newer)

### 3. Convert to Snippets
- Convert any clipboard entry to a code snippet
- Select language, add tags, and add description
- Entry remains in clipboard history for reference

### 4. Search & Filter
- Search clipboard history by content
- Filter by category or source
- Quick access to previously copied items

## Sync Integration

The clipboard feature is fully integrated with the existing sync capability:

1. When you sync snippets, clipboard history is also synced
2. Returns push/pull/update counts for clipboard entries
3. Handles rate limiting and error recovery
4. Respects the same sync approval workflow

## Category Types

Pre-defined categories for organization:
- `general` - General text
- `code` - Code snippets
- `url` - Links and URLs
- `json` - JSON data
- `api` - API responses
- `config` - Configuration files
- `notes` - Quick notes

## Usage

### Record Clipboard Entry
Automatically recorded when you click "Record" button in the clipboard panel.

### Convert to Snippet
1. Browse clipboard history
2. Click "Snippet" button on the entry
3. Set title, language, and tags
4. Click "Convert"

### Sync Clipboard
Use the existing Sync button in the Account panel - it automatically includes clipboard history.

### Search History
Use the search box in the Clipboard panel to find previous entries quickly.
