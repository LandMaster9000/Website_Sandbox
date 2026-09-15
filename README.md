# Cramers Landscaping — Divi → HTML port sandbox

Six service pages rebuilt as plain HTML + CSS, so they can be reviewed side by
side instead of one WordPress draft at a time.

Open `index.html` for the list. Each page has a bar at the top to jump between
pages and to open the current live page for comparison.

## Publishing this on GitHub Pages

1. Create a new repository (public — Pages needs public on the free plan).
2. Upload everything in this folder to the repository root.
3. Repo **Settings → Pages** → *Source*: **Deploy from a branch**;
   *Branch*: **main**, folder **/ (root)** → **Save**.
4. Wait ~1 minute. The URL is `https://<username>.github.io/<repo>/`.

## What is what

| Path | What it is |
|---|---|
| `assets/theme.css` | **The real stylesheet.** Byte-identical to the file pasted into WordPress → Appearance → Customize → Additional CSS. Edit this to change how the pages look. |
| `assets/sandbox.css` | Sandbox chrome only — the dark top bar and the index page. Never goes into WordPress. All rules prefixed `.sb` / `.idx` so they cannot collide. |
| `*.html` | One per ported page. The part inside `<main class="cl-page">` is exactly the HTML that gets written into the WordPress page. |

## Notes

- There is **no JavaScript**. The expand/collapse cards use `<details>` and the
  before/after flip uses a checkbox plus sibling selectors — both native CSS.
  That keeps the pages fast and means nothing to break in WordPress.
- Images are absolute URLs pointing at cramerslandscaping.com, so they render
  here without copying any media.
- Nothing in this repo is connected to the live site. Editing it changes nothing.
