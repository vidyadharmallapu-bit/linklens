# LinkLens — AI Image-Link Manager

> Store, organize and share your images with AI-ready public HTTPS links.

LinkLens is a production-quality Chrome extension (Manifest V3) built with **WXT 0.21.5**, **React 19**, and **TypeScript**. Upload images locally, generate permanent public HTTPS links via Supabase Storage, and share them directly with AI platforms like ChatGPT, Gemini, and Claude.

---

## Features

- **Drag-and-drop upload** — supports JPG, JPEG, PNG, WebP, GIF (max 10 MB each)
- **IndexedDB persistence** — images survive popup close and browser restart
- **Supabase cloud storage** — generates permanent, publicly-accessible HTTPS CDN URLs
- **AI-ready share formats** — copy links as Raw URL, Markdown, HTML, or AI Prompt
- **Gallery management** — search, sort, filter, grid/list view, bulk delete
- **Supabase Auth** — email/password sign-in with Row Level Security
- **Offline-first** — fully functional without Supabase credentials (local IndexedDB only)

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Extension Framework | WXT 0.21.5 (Chrome Manifest V3) |
| UI | React 19, TypeScript |
| Styling | Vanilla CSS (warm off-white SaaS theme) |
| Local Storage | IndexedDB (`linklens-db`) |
| Cloud Storage | Supabase Storage (`linklens-images` bucket) |
| Authentication | Supabase Auth (email/password) |
| Database | Supabase PostgreSQL (`public.images`) |

---

## Getting Started

### 1. Clone and install

```bash
git clone <your-repo-url>
cd linklens
npm install
```

### 2. Configure Supabase (optional — required for public HTTPS links)

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key-here
```

> ⚠️ **Never** use the `service_role` key here. Use only the **anonymous (anon) public key** from your Supabase Dashboard → Project Settings → API.

### 3. Set up the Supabase database schema

In your [Supabase SQL Editor](https://app.supabase.com), run the contents of:

```
supabase/schema.sql
```

This script:
- Creates the `public.images` metadata table
- Enables Row Level Security (RLS) with per-user policies
- Creates the `linklens-images` storage bucket (public, 10 MB limit)
- Configures storage bucket RLS policies

### 4. Development

```bash
npm run dev
```

WXT will open a browser with the extension loaded. Click the puzzle icon and pin **LinkLens** to your toolbar.

### 5. Production Build

```bash
npm run build
```

Output: `.output/chrome-mv3/`

**Loading into Chrome:**
1. Open `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select the `.output/chrome-mv3/` folder

---

## Project Structure

```
linklens/
├── entrypoints/
│   ├── popup/
│   │   ├── App.tsx              # Root component & state management
│   │   ├── App.css              # Complete popup stylesheet
│   │   ├── types.ts             # Shared TypeScript types
│   │   ├── components/
│   │   │   ├── Header.tsx       # Brand bar + auth/settings controls
│   │   │   ├── Hero.tsx         # Upload call-to-action
│   │   │   ├── UploadZone.tsx   # Drag-and-drop upload area
│   │   │   ├── StorageSummary.tsx # IndexedDB usage stats
│   │   │   ├── ImageGallery.tsx # Gallery with search/sort/filter/select
│   │   │   ├── ImagePreview.tsx # Lightbox with carousel navigation
│   │   │   ├── ShareModal.tsx   # Public link generator + AI format picker
│   │   │   ├── AuthModal.tsx    # Supabase sign-in / sign-up / reset
│   │   │   ├── SettingsModal.tsx # Preferences + clear gallery
│   │   │   ├── BulkDeleteModal.tsx # Bulk delete confirmation
│   │   │   ├── EmptyState.tsx   # Empty gallery state
│   │   │   ├── Footer.tsx       # Status bar
│   │   │   └── Icon.tsx         # SVG icon library
│   │   ├── services/
│   │   │   ├── db.ts            # IndexedDB CRUD operations
│   │   │   └── supabase.ts      # Supabase auth + storage + DB
│   │   └── utils/
│   │       ├── fileValidation.ts # MIME type & size validation
│   │       └── preferences.ts   # localStorage user preferences
│   ├── background.ts            # Service worker
│   └── content.ts               # Content script
├── supabase/
│   └── schema.sql               # Database schema & RLS policies
├── wxt.config.ts                # WXT + manifest configuration
├── .env.example                 # Supabase credentials template
└── package.json
```

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start WXT development build with hot reload |
| `npm run build` | Build production extension to `.output/chrome-mv3/` |
| `npm run compile` | TypeScript type-check (no emit) |
| `npm run zip` | Package extension as a distributable `.zip` |

---

## Cloud Link Workflow

1. **Sign in** — click the user icon in the header and authenticate with Supabase
2. **Upload** — drag images or click "Browse Files"
3. **Share** — click the share icon on any image card
4. **Generate** — if the image is local only, click "Generate Public HTTPS Link"
5. **Copy** — choose format (URL, Markdown, HTML, AI Prompt) and copy

Images without a Supabase account are stored **locally only** in IndexedDB — `blob:` URLs cannot be accessed by external AI services.

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Your Supabase project URL (`https://xxx.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous public key (safe to expose) |

---

## Security Notes

- All storage operations are protected by **Row Level Security** — users can only access their own images
- The Supabase storage bucket is **public** (images are accessible by URL without authentication), which is required for AI platforms to fetch them
- The `anon` key is safe to bundle in client-side code; it cannot bypass RLS policies
- Blob URLs are never presented as public shareable links in the UI
