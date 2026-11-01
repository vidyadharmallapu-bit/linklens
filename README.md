# LinkLens — AI Image-Link Manager

> Store, organize and share your images with AI-ready HTTPS links via Supabase signed URLs.

LinkLens is a Chrome extension (Manifest V3) built with **WXT 0.21.5**, **React 19**, and **TypeScript**. Upload images locally, generate time-limited HTTPS links via Supabase Storage signed URLs, and share them directly with AI platforms like ChatGPT, Gemini, and Claude.

---

## Features

- **Drag-and-drop upload** — supports JPG, JPEG, PNG, WebP, GIF (max 10 MB each)
- **IndexedDB persistence** — images survive popup close and browser restart
- **Supabase cloud storage** — uploads to a **private** bucket; generates **signed HTTPS URLs** with configurable expiry (1 hour to 30 days)
- **AI-ready share formats** — copy links as Raw URL, Markdown, HTML, or AI Prompt
- **Gallery management** — search, sort (6 options), filter by format (4 options), grid/list view, bulk delete
- **Supabase Auth** — email/password sign-in with Row Level Security
- **Offline-capable** — fully functional for local storage without Supabase credentials; cloud features require Supabase configuration and authentication

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Extension Framework | WXT 0.21.5 (Chrome Manifest V3) |
| UI | React 19, TypeScript |
| Styling | Vanilla CSS (warm off-white SaaS theme) |
| Local Storage | IndexedDB (`linklens-db`) |
| Cloud Storage | Supabase Storage (`linklens-images` bucket, **private**) |
| Authentication | Supabase Auth (email/password) |
| Database | Supabase PostgreSQL (`public.images`) |

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
│   │   │   ├── ShareModal.tsx   # Signed URL generator + AI format picker
│   │   │   ├── AuthModal.tsx    # Supabase sign-in / sign-up / reset
│   │   │   ├── SettingsModal.tsx # Preferences + clear gallery
│   │   │   ├── BulkDeleteModal.tsx # Bulk delete confirmation
│   │   │   ├── EmptyState.tsx   # Empty gallery state
│   │   │   ├── Footer.tsx       # Status bar
│   │   │   └── Icon.tsx         # SVG icon library
│   │   ├── services/
│   │   │   ├── db.ts            # IndexedDB CRUD operations
│   │   │   └── supabase.ts      # Supabase auth + storage + DB (signed URLs)
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

## Prerequisites

- Node.js 18+
- npm 9+
- Supabase account (optional — required only for cloud HTTPS links)

---

## Local Installation and Setup

### 1. Clone and install

```bash
git clone <your-repo-url>
cd linklens
npm install
```

### 2. Configure Supabase (optional — required for cloud HTTPS links)

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
- **Requires manual bucket creation** in Supabase Dashboard: `linklens-images` bucket, **private**, 10 MB limit, allowed MIME types: image/jpeg, image/png, image/webp, image/gif
- Configures storage bucket RLS policies for private bucket access

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
2. **Upload** — drag images or click "Browse Files" (stored locally in IndexedDB)
3. **Share** — click the share icon on any image card
4. **Generate** — if the image is local only, click "Generate Public HTTPS Link" to upload to Supabase and create a **signed URL**
5. **Copy** — choose format (URL, Markdown, HTML, AI Prompt) and copy

Images without a Supabase account are stored **locally only** in IndexedDB — `blob:` URLs cannot be accessed by external AI services.

### Signed URL Details

- **Default expiry:** 30 days (configurable: 1 hour, 24 hours, 7 days, 30 days)
- **Security:** Signed URLs are JWT tokens embedded in the URL — they do not require authentication to use, but they expire at the requested time
- **Access:** Anyone holding a valid signed URL may access the image until it expires
- **Revocation:** True revocation is not possible — distributed signed URLs remain valid until expiry. The extension can clear its stored URL and prevent new ones, but cannot invalidate already-shared links
- **AI Platforms:** ChatGPT, Gemini, and Claude can fetch images via signed URLs. Short expiry windows (< 1 hour) may cause failures in long AI sessions

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Your Supabase project URL (`https://xxx.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous public key (safe to expose in client) |

---

## Architecture and Supabase Integration

### Supabase Storage Bucket
- **Name:** `linklens-images`
- **Public:** **No** — private bucket created manually in Supabase Dashboard
- **File size limit:** 10 MB
- **Allowed MIME types:** image/jpeg, image/png, image/webp, image/gif
- **Access:** Via signed URLs only (generated on-demand)

### Database Schema (`public.images` table)
- `id` (uuid, PK) — unique identifier
- `user_id` (uuid, FK → auth.users) — owner reference
- `file_name`, `file_size`, `mime_type`, `width`, `height` — metadata
- `storage_path` — path in Supabase Storage
- `is_public` (boolean) — whether a signed URL exists
- `signed_url`, `signed_url_expires_at` — time-limited HTTPS URL and expiry
- `created_at`, `updated_at` — timestamps

### Row Level Security (RLS)
All operations on `public.images` and `storage.objects` are protected by RLS policies ensuring users can only access their own data.

---

## Security and Privacy Notes

- All storage operations are protected by **Row Level Security** — users can only access their own images
- The Supabase storage bucket is **private** — objects are not accessible by URL alone
- Access requires either a valid **signed URL** (time-limited, JWT-based) or an authenticated session
- The `anon` key is safe to bundle in client-side code; it cannot bypass RLS policies
- Blob URLs are never presented as public shareable links in the UI
- No `service_role` keys, database passwords, or private keys are ever bundled or committed
- `.env` files are ignored by Git (see `.gitignore`)

---

## Current Project Status

- ✅ Core extension framework (WXT + React 19 + TypeScript)
- ✅ IndexedDB local persistence with full CRUD
- ✅ Supabase Auth integration (sign up, sign in, password reset)
- ✅ Supabase Storage upload to **private** bucket with **signed URL** generation
- ✅ Gallery UI with search, sort, filter, grid/list views
- ✅ Image preview lightbox with carousel navigation
- ✅ Share modal with AI-ready format options (URL, Markdown, HTML, AI Prompt)
- ✅ Configurable signed URL expiry (1h, 24h, 7d, 30d)
- ✅ Bulk delete with confirmation
- ✅ Settings modal (preferences, clear local gallery)
- ✅ Offline-capable: local storage works without Supabase credentials

---

## Future Improvements

- [ ] Multi-image drag-and-drop upload queue with progress
- [ ] Image tagging and custom folders/albums
- [ ] OCR text extraction from images
- [ ] Automatic image optimization (WebP conversion, compression)
- [ ] Keyboard shortcuts for power users
- [ ] Firefox Manifest V3 support
- [ ] Unit and integration tests (Vitest + Playwright)

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -m "feat: your feature"`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a Pull Request

Please ensure:
- Code passes `npm run compile` (TypeScript type-check)
- No secrets or credentials are committed
- Changes follow the existing code style