# PIS Content Creator — Claude Code Context

## What This App Is
A full-stack React + Vite web app for Podcast Impact Studio. It generates AI-powered content packages for podcast clients using the Anthropic Claude API. Editors paste a transcript, select a show, and get show notes, YouTube descriptions, social media posts, email newsletters, blog posts, and more.

## Stack
- **Frontend:** React + Vite (single page app)
- **Backend/DB:** Supabase (auth, profiles, shows, settings tables)
- **AI:** Anthropic Claude API (`claude-sonnet-4-20250514`) — called directly from browser
- **Deployment:** Vercel (serverless functions in `/api/`)
- **Email invites:** Supabase Auth via `/api/invite.js` proxy

## Local Project Path
```
~/Documents/Podcast Impact Studio/06-App-Development/Content Creator/pis-content-creator/
```

## Key Commands
```bash
npm run dev          # Start local dev server at localhost:5173
git add . && git commit -m "message" && git push && npx vercel --prod  # Deploy
```

## File Structure
```
src/
  App.jsx           # Main app — all content generation, show select, modes
  AdminPanel.jsx    # Admin panel — Show DNA Manager + Settings (Integrations, Workspace, Team, Billing)
  Auth.jsx          # Login screen + account setup for invited users
  Profile.jsx       # Editor profile — name, timezone, password
  lib/
    shows.js        # loadShows(), saveShow(), deleteShow() — reads from Supabase
    supabase.js     # Supabase client init
  index.css         # Inter font, CSS variables, global styles
api/
  descript.js       # Vercel proxy — forwards clip timestamps to Descript API (avoids CORS)
  invite.js         # Vercel proxy — sends Supabase invite emails using service role key
```

## Environment Variables (Vercel + local .env)
```
VITE_ANTHROPIC_API_KEY       # Anthropic API key
VITE_SUPABASE_URL            # Supabase project URL
VITE_SUPABASE_ANON_KEY       # Supabase anon key
DESCRIPT_API_KEY             # Descript API key (server-side only)
SUPABASE_SERVICE_ROLE_KEY    # Supabase service role (server-side only, for invites)
```

## Supabase Project
- **URL:** https://envrtfevbiiaovfeoxvv.supabase.co
- **Tables:**
  - `shows` — id (text PK), name, dna (jsonb), updated_at
  - `settings` — key (text PK), value (jsonb), updated_at — stores global settings (Descript API key, admin emails, workspace info, team)
  - `profiles` — id (uuid FK auth.users), name, timezone, role, updated_at
- **Auth:** Supabase Auth with email/password. Invite flow via `/api/invite.js`

## Design System
- **Colors:** `#D97757` coral, `#1A1A1A` bg, `#212121` surface, `#2A2A2A` card, `#3A3A3A` borders
- **Font:** Inter (Google Fonts, loaded in index.css)
- **T object:** All colors defined in `const T = {...}` near top of App.jsx and AdminPanel.jsx

## App Flow
1. **Login** (Auth.jsx) → Supabase email/password
2. **Show Select** → click show → auto-advances to mode
3. **Mode Select** → Full Content / Clips & Shorts / Editor Brief → auto-advances
4. **Configure** → episode number, guest/solo, platforms
5. **Input** → paste transcript or upload .txt
6. **Generate** → Claude API call → results
7. **Results** → copy sections, download Word doc, send to Descript (Editor Brief only)

## User Roles
- **Admin** (`tamar@podcastimpactstudio.com`, `tamarroutly@gmail.com`) — sees ⚙️ gear, accesses admin panel
- **Editor** — sees 👤 profile icon only, uses content creator

## Admin Panel
- **Show DNA Manager** — CRUD for show profiles with tabs: Basic Info, Voice DNA, Audience, Platforms, Show Notes Builder, Boilerplate
- **Settings** — Integrations (Descript API key), Workspace (name, URL, admin emails), Team (invite/edit/remove), Billing (placeholder)

## Shows in Database
DEI AF, Ellevated Achievers, Eternally Amy, Fat Science, Leaving CrazyTown, Mindshift, The Sober Curator, The Unique Ability Podcast

## Critical Patterns & Rules

### React Hooks
- ALL useState/useEffect hooks MUST be at the top level of the component
- NEVER put hooks inside IIFEs, switch/case blocks, or conditional renders
- Violation causes white screen (React error #310)

### File Editing
- NEVER use binary replacement on JSX files — causes silent truncation
- Always use string replacement with exact matches
- After any edit, verify file size is reasonable (App.jsx ~70kb, AdminPanel.jsx ~60kb)
- Run syntax check after edits: `node -e "const fs=require('fs'),p=require('@babel/parser');p.parse(fs.readFileSync('src/App.jsx','utf8'),{sourceType:'module',plugins:['jsx']});console.log('OK')"`

### Boilerplate Injection
- `show.bp` stores HTML from the rich text editor
- `stripHtml()` converts to plain text preserving link URLs as `text (url)`
- Boilerplate is injected directly into `buildSections()` — not via Claude instruction

### Platform Hub
- Shows have `platforms` object: `{ podcast: [], social: [], community: [], email: [], blog: [], extras: [] }`
- `buildSections(show, guest, snTemplate)` reads from `show.platforms` to decide what to generate

### Publish Schedule
- Stored in show DNA as `publishDay`, `publishTime`, `publishTz`
- `formatPublishSchedule(show)` converts to editor's local browser timezone automatically

### Descript Integration
- Browser calls `/api/descript` (Vercel proxy) — NOT Descript directly (CORS blocked)
- Proxy uses `DESCRIPT_API_KEY` env var
- Project ID extracted from full URL via `.split("/").pop()`

### Content Generation Modes
- `"full"` — Full Content Package (show notes, YouTube, social, email, blog, extras)
- `"clips"` — Clips & Shorts (per-clip content for each platform)
- `"editor"` — Editor Brief (hook recommendations, clip timestamps, editor notes)

## Common Tasks

### Add a new show
Go to app → Admin (⚙️) → Show DNA Manager → + Add Show

### Deploy to Vercel
```bash
git add . && git commit -m "description" && git push && npx vercel --prod
```

### Update Supabase schema
```bash
supabase login
supabase link --project-ref envrtfevbiiaovfeoxvv
# Then make changes and push
supabase db push
```

### Run a SQL migration
Go to Supabase → SQL Editor → paste and run

### Invite a team member
Admin panel → Settings → Team → Invite Team Member → enter email → Send Invite
(Uses `/api/invite.js` with `SUPABASE_SERVICE_ROLE_KEY`)

## What NOT to Do
- Don't use `sed` for multi-line JSX replacements — use Python string replacement
- Don't expose `SUPABASE_SERVICE_ROLE_KEY` or `DESCRIPT_API_KEY` in frontend code
- Don't call Descript or Supabase admin APIs directly from the browser
- Don't sort arrays in place before rendering — use non-mutating sort (`[...arr].sort()`)
- Don't put React hooks inside conditional blocks

## Backup Location
`~/Desktop/pis-backup-before-redesign.zip` (pre-redesign snapshot)
