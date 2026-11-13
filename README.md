# Photo Diary

A photo diary: every day you can upload photos and write an entry, and a
calendar lets you click any day to see that day's photos with the writing
underneath them.

Days with photos show a thumbnail in the calendar; days with writing show a
green dot. Click a photo to see it full-screen; each photo can be deleted.

## Run it

It's a plain static site — no build step, no server.

- **Locally:** open `index.html` in a browser (or serve the folder, e.g.
  `python3 -m http.server`).
- **On GitHub Pages:** in this repo, Settings → Pages → "Deploy from a
  branch" → `main` / `(root)`. The site then lives at
  `https://catherinesu-png.github.io/photo-diary/`.

## Where your data lives — important

The code lives in this repository. **Your photos and writing do not.**

GitHub Pages only serves static files, so this version stores everything in
your browser's IndexedDB, on the device and browser where you use it:

- Entries do not sync between devices.
- Clearing the browser's site data deletes the diary.
- Use **Export backup** (top right) to download one JSON file containing all
  entries and photos, and **Import backup** to restore it — in any browser,
  on any copy of this site.

If you later want entries synced across devices, the diary needs a real
backend (for example Firebase, Supabase, or a small server) instead of
browser storage — the page and calendar code would stay the same, only the
storage layer in `app.js` would change.

## Files

- `index.html` — page structure: calendar + day view (photos on top, writing below)
- `styles.css` — all styling
- `app.js` — calendar logic, IndexedDB storage, photo upload/delete,
  full-screen viewer, backup export/import

## Roadmap — later, not in this version

Right now this is a **non-social, private photo journaling app**. The
framework is being built first. Long-term ideas (Catherine's, 2026-11-13),
in no promised order:

- **Social layer:** choose per photo whether it is visible to friends or
  public. Friends can open each other's profiles, which show a calendar
  they can scroll through.
- **The diary text itself is never visible to anyone else** — that is a
  hard rule, not a setting. What friends could see is photos, and possibly
  a caption on each photo.
- **Engagement on shared photos:** comments and likes — details to figure
  out later.
- **Daily reminder** to do your diary-ing.
- **Vacation mode:** upload photos for a block of time at once; on the
  calendar those days show as one connected block of photos that opens the
  same way as a regular single day.

To keep those possible without a rewrite, photo records already store a
`caption` (empty for now) and a `visibility` (`"private"` for now) from
day one, and diary text is stored separately from photos.

## Note on the Muse version

This is a standalone rewrite of the Photo Diary that was first built as an
interactive app inside Muse. That version is hosted in Muse's own
environment with its own database, and interactive Muse apps can't be
published or exported as-is — so this repository re-implements the same
diary (calendar, daily photos, writing underneath) in plain
HTML/CSS/JavaScript that runs anywhere.
