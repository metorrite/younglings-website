// Run with: node --test tests/   (Node 22.18+/24 strips the TypeScript types itself)
import assert from "node:assert/strict";
import { test } from "node:test";
import { ADMIN_GROUPS, activeAdmin, adminGroupsFor } from "../src/lib/adminNav.ts";

const page = (href) => ({ href, label: href, blurb: "" });

test("every group shown has a page to link to", () => {
  // AdminNav links each group to its first page, so an empty group would crash the whole admin area.
  for (const isOwner of [true, false]) {
    for (const group of adminGroupsFor(isOwner)) assert.ok(group.pages.length > 0, `${group.id} has no pages`);
  }
});

test("a group left with no pages is not shown", () => {
  // #145 moved Bot health out of Monitor and #153 moved Audit log and Ticket history out; together Monitor was empty.
  const groups = [
    { id: "overview", label: "Overview", icon: "", blurb: "", pages: [page("/admin")] },
    { id: "monitor", label: "Monitor", icon: "", blurb: "", pages: [] },
    { id: "super", label: "Super", icon: "", blurb: "", ownerOnly: true, pages: [page("/admin/super")] },
  ];
  assert.deepEqual(adminGroupsFor(true, groups).map((g) => g.id), ["overview", "super"]);
  assert.deepEqual(adminGroupsFor(false, groups).map((g) => g.id), ["overview"]);
});

test("the owner-only groups stay hidden from other admins", () => {
  assert.ok(!adminGroupsFor(false).some((g) => g.ownerOnly));
  assert.equal(adminGroupsFor(true).length, ADMIN_GROUPS.filter((g) => g.pages.length > 0).length);
});

test("the admin home is the fallback page", () => {
  assert.equal(activeAdmin("/admin/nowhere", adminGroupsFor(false)).page.href, "/admin");
});
