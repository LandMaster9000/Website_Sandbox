# Cramers Landscaping — Divi → HTML port sandbox

Six service pages rebuilt as plain HTML + CSS, wrapped in a replica of the live
site's header and footer so each page can be judged as a whole.

Open `index.html`, or jump between pages with the dark strip at the top. Each
page has a "compare live" link that opens the real WordPress page in a new tab.

## Files

| Path | What it is |
|---|---|
| `assets/theme.css` | **The real stylesheet.** Byte-identical to the file pasted into WordPress → Appearance → Customize → Additional CSS. Change how pages look by editing this. |
| `assets/site.css` | Header, nav, footer, and the sandbox strip. **Never goes into WordPress** — there the Divi Theme Builder supplies the header and footer. |
| `*.html` | One per ported page. Everything inside `<main class="cl-page">` is exactly what gets written into the WordPress page. |

## How faithful is it

The chrome was measured off the live site at a 1440px viewport rather than
estimated. 37 computed-style checks — font sizes, weights, colours, padding,
border radii — match the live page exactly, verified automatically in a headless
browser, not by eye.

Known and deliberate:

- **Divi's own quirks are reproduced, not fixed.** For example the Patios page
  heading renders as "Our PatioInstallation Process" with no space, because the
  green kicker span abuts the next word on the live site.
- **The mega menu is CSS-only.** Divi opens it with JavaScript and a fade; here
  it is `:hover` plus `:focus-within`, which behaves the same and keeps the page
  script-free.
- **Social icons are text glyphs**, not Divi's icon font.
- The header is `position:absolute` over the hero, matching how the live header
  floats on the hero image.

## Notes

- **No JavaScript anywhere.** Collapsible cards use `<details>`; the
  before/after flip uses a checkbox with sibling selectors.
- Images load straight from cramerslandscaping.com, so no media is copied here.
- Nothing in this repo touches the live site.

## Publishing

Settings → Pages → Deploy from a branch → `main` → `/ (root)`.
Live at `https://landmaster9000.github.io/Website_Sandbox/`.
