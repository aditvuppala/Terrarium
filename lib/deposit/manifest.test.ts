import { unzipSync, strFromU8 } from "fflate";
import { describe, expect, it } from "vitest";
import { sha256Hex } from "./hash";
import { assignPaths, buildManifest, buildReportHtml, escapeHtml, formatBytes, slug } from "./manifest";
import { buildPacketZip } from "./packet";
import type { VaultItem, VaultState } from "./types";

const state: VaultState = {
  rooms: [
    { id: "r1", name: "Kitchen" },
    { id: "r2", name: "Bedroom 1 <Alex's>" },
  ],
  leaseStart: "2026-08-28",
  leaseEnd: "2027-04-30",
  checks: { "move-in:r1": ["Fridge (inside & out)"] },
};

const item = (over: Partial<VaultItem>): VaultItem => ({
  id: "i1",
  phase: "move-in",
  roomId: "r1",
  kind: "photo",
  fileName: "IMG 0001.JPG",
  size: 3,
  mimeType: "image/jpeg",
  lastModified: Date.UTC(2026, 7, 28, 15),
  addedAt: Date.UTC(2026, 7, 28, 16),
  sha256: "ab".repeat(32),
  note: "",
  ...over,
});

const items: VaultItem[] = [
  item({ id: "a", addedAt: 2 }),
  item({ id: "b", addedAt: 1, fileName: "IMG 0001.JPG" }), // same name, earlier
  item({ id: "c", roomId: "r2", kind: "video", fileName: "walk.mov", mimeType: "video/quicktime", note: "Stain <by> door" }),
  item({ id: "d", phase: "move-out", fileName: "out.png" }),
];

describe("manifest", () => {
  it("slugs names safely", () => {
    expect(slug("Bedroom 1 <Alex's>")).toBe("bedroom-1-alex-s");
    expect(slug("Café façade")).toBe("cafe-facade");
    expect(slug("***", "room")).toBe("room");
  });

  it("assigns unique, ordered paths per phase and room", () => {
    const p = assignPaths(state, items, ["move-in"]);
    expect(p.get("b")).toBe("move-in/01-kitchen/001-img-0001.jpg");
    expect(p.get("a")).toBe("move-in/01-kitchen/002-img-0001.jpg");
    expect(p.get("c")).toBe("move-in/02-bedroom-1-alex-s/001-walk.mov");
    expect(p.has("d")).toBe(false);
  });

  it("builds manifest with metadata and hashes for the requested phases only", () => {
    const m = buildManifest(state, items, ["move-in"], new Date("2026-09-01T00:00:00Z"));
    expect(m.generatedAt).toBe("2026-09-01T00:00:00.000Z");
    expect(m.lease).toEqual({ start: "2026-08-28", end: "2027-04-30" });
    expect(m.rooms[0].phases["move-in"]?.checked).toEqual(["Fridge (inside & out)"]);
    expect(m.rooms[0].phases["move-in"]?.files.map((f) => f.path)).toHaveLength(2);
    expect(m.rooms[0].phases["move-out"]).toBeUndefined();
    const f = m.rooms[1].phases["move-in"]!.files[0];
    expect(f).toMatchObject({ kind: "video", originalName: "walk.mov", sha256: "ab".repeat(32), sizeBytes: 3 });
    expect(f.fileLastModified).toBe("2026-08-28T15:00:00.000Z");
  });

  it("escapes user text in the HTML report and links files by relative path", () => {
    const html = buildReportHtml(buildManifest(state, items, ["move-in"]));
    expect(html).toContain("Bedroom 1 &lt;Alex&#39;s&gt;");
    expect(html).toContain("Stain &lt;by&gt; door");
    expect(html).not.toContain("<by>");
    expect(html).toContain('src="move-in/01-kitchen/001-img-0001.jpg"');
    expect(html).toContain("<video controls");
    expect(html).toContain("Return the move-in inventory checklist");
    expect(escapeHtml(`"&'`)).toBe("&quot;&amp;&#39;");
  });

  it("formats sizes", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(250 * 1024 * 1024)).toBe("250 MB");
  });
});

describe("packet zip", () => {
  it("contains manifest, report, and every file at its manifest path", async () => {
    const bytes: Record<string, Uint8Array> = { a: new Uint8Array([1, 2, 3]), b: new Uint8Array([4]), c: new Uint8Array([5, 6]) };
    const { zip, missing } = await buildPacketZip(state, items, ["move-in"], async (id) => bytes[id] ?? null);
    expect(missing).toEqual([]);
    const files = unzipSync(zip);
    expect(Object.keys(files).sort()).toEqual([
      "index.html",
      "manifest.json",
      "move-in/01-kitchen/001-img-0001.jpg",
      "move-in/01-kitchen/002-img-0001.jpg",
      "move-in/02-bedroom-1-alex-s/001-walk.mov",
    ]);
    expect(Array.from(files["move-in/01-kitchen/002-img-0001.jpg"])).toEqual([1, 2, 3]);
    const m = JSON.parse(strFromU8(files["manifest.json"]));
    expect(m.hashAlgorithm).toBe("SHA-256");
  });

  it("reports files whose bytes are missing", async () => {
    const { missing } = await buildPacketZip(state, items, ["move-out"], async () => null);
    expect(missing).toEqual(["move-out/01-kitchen/001-out.png"]);
  });
});

describe("hash", () => {
  it("computes SHA-256 hex", async () => {
    expect(await sha256Hex(new TextEncoder().encode("abc"))).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });
});
