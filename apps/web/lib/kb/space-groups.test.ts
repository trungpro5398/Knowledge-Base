import assert from "node:assert/strict";
import test from "node:test";
import type { Space } from "@/lib/api/types";
import { filterPublicSpaceGroups, groupPublicSpaces } from "./space-groups";

function space(overrides: Partial<Space> & Pick<Space, "id" | "name" | "slug">): Space {
  return {
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

test("groups libraries by organization identity and keeps the active group first", () => {
  const groups = groupPublicSpaces(
    [
      space({ id: "1", name: "Kho B", slug: "b", organization_id: "org-1", organization_name: "TET" }),
      space({ id: "2", name: "Kho A", slug: "a", organization_id: "org-1", organization_name: "TET" }),
      space({ id: "3", name: "Kho C", slug: "c", organization_id: "org-2", organization_name: "TET" }),
      space({ id: "4", name: "Kho riêng", slug: "standalone" }),
    ],
    { locale: "vi", standaloneLabel: "Kho độc lập", activeSpaceSlug: "c" }
  );

  assert.equal(groups.length, 3);
  assert.equal(groups[0]?.key, "organization:org-2");
  assert.deepEqual(groups.find((group) => group.key === "organization:org-1")?.spaces.map((item) => item.name), ["Kho A", "Kho B"]);
  assert.equal(groups.find((group) => group.key === "organization-name:kho doc lap")?.spaces[0]?.slug, "standalone");
});

test("filters by organization, library description, and Vietnamese text without accents", () => {
  const groups = groupPublicSpaces(
    [
      space({ id: "1", name: "Quy trình", slug: "process", description: "Hướng dẫn vận hành", organization_id: "org-1", organization_name: "Đào tạo" }),
      space({ id: "2", name: "Nhân sự", slug: "people", organization_id: "org-2", organization_name: "Vận hành" }),
    ],
    { locale: "vi", standaloneLabel: "Kho độc lập" }
  );

  assert.deepEqual(filterPublicSpaceGroups(groups, "dao tao").flatMap((group) => group.spaces.map((item) => item.slug)), ["process"]);
  assert.deepEqual(filterPublicSpaceGroups(groups, "huong dan").flatMap((group) => group.spaces.map((item) => item.slug)), ["process"]);
  assert.deepEqual(filterPublicSpaceGroups(groups, "khong co"), []);
});
