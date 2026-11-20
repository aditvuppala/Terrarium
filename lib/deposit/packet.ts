import { zip, strToU8, type AsyncZippable } from "fflate";
import { assignPaths, buildManifest, buildReportHtml } from "./manifest";
import type { Phase, VaultItem, VaultState } from "./types";

/** Photos/videos are already compressed; storing them (level 0) keeps export fast on phones. */
export async function buildPacketZip(
  state: VaultState,
  items: VaultItem[],
  phases: Phase[],
  getBytes: (id: string) => Promise<Uint8Array | null>,
  now = new Date(),
): Promise<{ zip: Uint8Array; missing: string[] }> {
  const manifest = buildManifest(state, items, phases, now);
  const paths = assignPaths(state, items, phases);
  const files: AsyncZippable = {
    "manifest.json": [strToU8(JSON.stringify(manifest, null, 2)), { level: 6 }],
    "index.html": [strToU8(buildReportHtml(manifest)), { level: 6 }],
  };
  const missing: string[] = [];
  for (const [id, path] of paths) {
    const bytes = await getBytes(id);
    if (bytes) files[path] = [bytes, { level: 0 }];
    else missing.push(path);
  }
  const out = await new Promise<Uint8Array>((resolve, reject) =>
    zip(files, { level: 0 }, (err, data) => (err ? reject(err) : resolve(data))),
  );
  return { zip: out, missing };
}

export function packetFileName(phases: Phase[], now = new Date()): string {
  const d = now.toISOString().slice(0, 10);
  return phases.length === 1 ? `${phases[0]}-packet-${d}.zip` : `deposit-packet-${d}.zip`;
}
