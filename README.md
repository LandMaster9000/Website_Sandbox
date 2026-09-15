# Cramers Landscaping — full static replica

The entire site rebuilt as plain HTML + CSS: **39 pages and 21 blog posts**,
wrapped in a measured replica of the live header and footer.

`index.html` is the homepage. Nav, footer, mega menu and in-page links all
resolve to local files — 3,250 internal links — so you can click through the
whole site offline. `_all-pages.html` lists everything with a "live" link
beside each page for side-by-side comparison.

## Files

| Path | What it is |
|---|---|
| `assets/theme.css` | **The real stylesheet.** Byte-identical to the file pasted into WordPress → Appearance → Customize → Additional CSS. |
| `assets/site.css` | Header, nav, mega menu, footer, and the sandbox strip. **Never goes into WordPress** — Divi's Theme Builder supplies those there. |
| `*.html` | One per page/post. Everything inside `<main class="cl-page">` is exactly what would be written into the WordPress page. |

## How faithful is it

The chrome was measured off the live site at a 1440px viewport, not estimated.
37 computed-style checks — font sizes, weights, colours, padding, border radii —
match the live page exactly, verified in a headless browser rather than by eye.
On the page checked line by line, all 54 text blocks were present.

Deliberate decisions:

- **Divi's own quirks are reproduced, not fixed.** The Patios heading still
  renders "Our PatioInstallation Process" with no space, because it does on the
  live site.
- **Malformed markup is repaired only where a browser would repair it, and only
  when the repair changes nothing visible.** One blog post opens a `<table>` it
  never closes; those pages are re-serialised through a real HTML parser — what
  the browser does anyway — and the repair is discarded unless the visible text
  is identical. Two pages keep stray `</p>` / `</section>` tags precisely
  because repairing them *would* alter the text; browsers discard them, and
  they are on the live site too.
- **The mega menu is CSS-only** (`:hover` + `:focus-within`), where Divi uses
  JavaScript. Same behaviour, no script.
- **Social icons are text glyphs**, not Divi's icon font.
- `blog.html` gets a generated post index; on the live site WordPress builds
  that list, so there is nothing in the Divi layout to port.

## Notes

- **No JavaScript anywhere.** Collapsible cards use `<details>`; the
  before/after flip uses a checkbox with sibling selectors.
- Images load from cramerslandscaping.com, so no media is copied here.
- Nothing in this repo touches the live site.

## Publishing

Settings → Pages → Deploy from a branch → `main` → `/ (root)`.
Live at `https://landmaster9000.github.io/Website_Sandbox/`.
