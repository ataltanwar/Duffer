<img width="884" height="282" alt="Header Icon" src="https://github.com/user-attachments/assets/1f93e37e-0f91-40e2-b7b8-3c43ef47d946" />


> A competitive anonymous social network where content wins, not popularity.

Anonymous social feed built with **React + Vite + TailwindCSS + Supabase**.

## Quick Start

### 1. Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the contents of [`supabase/schema.sql`](supabase/schema.sql)
3. Enable **Google OAuth**:
   - Go to **Authentication → Providers → Google**
   - Add your Google OAuth client ID and secret ([Google Cloud Console](https://console.cloud.google.com/apis/credentials))
   - Set the redirect URL from Supabase in your Google OAuth config
4. Enable **Realtime** for the `posts` and `reactions` tables (already done in the schema SQL)

### 2. Environment Variables

```bash
cp .env.example .env
```

Fill in your Supabase project URL and anon key (found in **Settings → API**):

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Install & Run

```bash
npm install
npm run dev
```

### 4. Make Yourself Admin

After signing in for the first time, find your user ID in the `users` table and run:

```sql
UPDATE public.users SET is_admin = true WHERE id = 'your-user-id';
```

## Project Structure

```
duffer-app/
├── public/
├── src/
│   ├── components/
│   │   ├── CreatePost.jsx    # Post creation form
│   │   ├── EmojiPicker.jsx   # Lightweight emoji picker
│   │   ├── Header.jsx        # Navigation header
│   │   └── PostCard.jsx      # Individual post with reactions
│   ├── lib/
│   │   ├── AuthContext.jsx   # Auth state management
│   │   └── supabase.js      # Supabase client
│   ├── pages/
│   │   ├── FeedPage.jsx     # Global feed
│   │   └── LoginPage.jsx    # Google sign-in
│   ├── App.jsx              # Router
│   ├── index.css            # Tailwind + custom theme
│   └── main.jsx             # Entry point
├── supabase/
│   └── schema.sql           # Database schema + RLS policies
├── .env.example
└── vite.config.js
```

## Features

- **Google OAuth** login with persistent anonymous usernames
- **Global feed** with reverse-chronological posts
- **Text posts** (200 char max)
- **Emoji reactions** on any post
- **Realtime updates** via Supabase subscriptions
- **Admin moderation** (delete posts, ban users)
- **Lazy-loaded** pages for fast initial load
- **RLS policies** for security

## Tech Stack

| Layer    | Tech                  |
|----------|-----------------------|
| Frontend | React, Vite, Tailwind |
| Backend  | Supabase              |
| Database | PostgreSQL (Supabase) |
| Auth     | Google OAuth          |
