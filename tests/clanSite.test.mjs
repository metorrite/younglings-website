// Run with: node --test tests/*.test.mjs   (Node 22.18+/24 strips the TypeScript types itself)
import assert from "node:assert/strict";
import { test } from "node:test";
import { parsePages, parseTemplate, parseTheme, safeImageUrl, cssVariables } from "../src/lib/clanSiteTheme.ts";
import { parseInline, parseMarkdown, safeHref } from "../src/lib/miniMarkdown.ts";

test("a theme only takes palette colours, known fonts and https images", () => {
  const t = parseTheme({ primary: "crimson", accent: "#ff00ff", font: "comic", logoUrl: "https://cdn.example.test/logo.png", bannerUrl: "javascript:alert(1)" }, "HALL");
  assert.equal(t.primary, "#c0392b");
  assert.equal(t.accent, "#c9a227", "an unknown colour falls back to the template's accent");
  assert.equal(t.font, "serif", "an unknown font falls back to the template's");
  assert.equal(t.logoUrl, "https://cdn.example.test/logo.png");
  assert.equal(t.bannerUrl, null);
  assert.equal(safeImageUrl("http://example.test/a.png"), null);
  assert.equal(safeImageUrl("data:image/png;base64,AAAA"), null);
  assert.deepEqual(parseTheme(null, "MINIMAL").primary, "#2f7fd1");
  assert.equal(parseTemplate("FANCY"), "CLASSIC");
  assert.equal(cssVariables("MINIMAL", parseTheme({}, "MINIMAL"))["--cs-bg"], "#fafafa");
});

test("pages: home first and always on, the clan's order kept, every page once", () => {
  const pages = parsePages([{ key: "about" }, { key: "home", enabled: false }, { key: "roster", enabled: false, showJoined: true }, { key: "about" }, { key: "nope" }]);
  assert.deepEqual(pages.map((p) => p.key), ["home", "about", "roster", "stats", "events", "recaps", "apply", "custom1", "custom2", "custom3"]);
  assert.equal(pages[0].enabled, true);
  assert.equal(pages.find((p) => p.key === "roster").enabled, false);
  assert.equal(pages.find((p) => p.key === "roster").showJoined, true);
  assert.equal(pages.find((p) => p.key === "stats").enabled, true, "a page not mentioned is on");
});

test("custom pages need a title and keep it short", () => {
  const pages = parsePages([{ key: "custom1", title: "  Our   rules  " }, { key: "custom2", enabled: true }, { key: "custom3", title: "x".repeat(80), enabled: false }]);
  const c1 = pages.find((p) => p.key === "custom1");
  assert.equal(c1.enabled, true);
  assert.equal(c1.title, "Our rules");
  assert.equal(pages.find((p) => p.key === "custom2").enabled, false, "no title, no page");
  const c3 = pages.find((p) => p.key === "custom3");
  assert.equal(c3.enabled, false);
  assert.equal(c3.title.length, 30);
  assert.deepEqual(parsePages(undefined).filter((p) => p.enabled).map((p) => p.key), ["home", "roster", "stats", "events", "recaps", "apply", "about"]);
});

test("markdown: headings, paragraphs and lists", () => {
  const md = parseMarkdown("# Welcome\nWe run **weekly** bossing.\nAll welcome.\n\n- One\n- Two *really*\n1. First\n2) Second\n#### not a heading");
  assert.equal(md[0].type, "heading");
  assert.equal(md[0].level, 1);
  assert.deepEqual(md[1], { type: "paragraph", children: [{ type: "text", text: "We run " }, { type: "bold", children: [{ type: "text", text: "weekly" }] }, { type: "text", text: " bossing. All welcome." }] });
  assert.equal(md[2].type, "list");
  assert.equal(md[2].ordered, false);
  assert.equal(md[2].items.length, 2);
  assert.equal(md[3].ordered, true);
  assert.equal(md[4].type, "paragraph", "#### is just text");
});

test("markdown: html is text and only http(s) links are links", () => {
  const md = parseMarkdown("<script>alert(1)</script> [x](javascript:alert(1)) [ok](https://example.test/a)");
  const inline = md[0].children;
  assert.equal(inline[0].type, "text");
  assert.ok(inline[0].text.includes("<script>"), "markup stays as visible text");
  assert.ok(inline[0].text.includes("[x](javascript:alert(1))"), "an unsafe link stays as text");
  assert.deepEqual(inline[1], { type: "link", href: "https://example.test/a", children: [{ type: "text", text: "ok" }] });
  assert.equal(safeHref("data:text/html,hi"), null);
  assert.equal(safeHref("/relative"), null);
});

test("markdown: unclosed marks are plain text, nesting is bounded", () => {
  assert.deepEqual(parseInline("2 * 3 = 6"), [{ type: "text", text: "2 * 3 = 6" }]);
  assert.deepEqual(parseInline("**open"), [{ type: "text", text: "**open" }]);
  const deep = parseInline("**a *b [c](https://e.test) b* a**");
  assert.equal(deep[0].type, "bold");
  assert.ok(parseMarkdown("x".repeat(9000))[0].children[0].text.length <= 5000);
});
