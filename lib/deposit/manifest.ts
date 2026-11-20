import { computeDeadlines, formatIsoDate } from "./deadlines";
import { PHASES, checkKey, type Phase, type VaultItem, type VaultState } from "./types";

export const MANIFEST_VERSION = 1;

/** Lowercase, filesystem-safe slug (keeps the extension readable). */
export function slug(s: string, fallback = "file"): string {
  const out = s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "");
  return out.slice(0, 60) || fallback;
}

function splitExt(name: string): [string, string] {
  const i = name.lastIndexOf(".");
  if (i <= 0 || i === name.length - 1) return [name, ""];
  return [name.slice(0, i), name.slice(i + 1)];
}

/**
 * Deterministic zip paths: `<phase>/<NN-room>/<NNN-file.ext>`.
 * The numeric prefixes keep order and guarantee uniqueness even when two files share a name.
 */
export function assignPaths(state: VaultState, items: VaultItem[], phases: Phase[]): Map<string, string> {
  const paths = new Map<string, string>();
  for (const phase of phases) {
    state.rooms.forEach((room, ri) => {
      const roomDir = `${String(ri + 1).padStart(2, "0")}-${slug(room.name, "room")}`;
      itemsFor(items, phase, room.id).forEach((it, ii) => {
        const [base, ext] = splitExt(it.fileName);
        const name = `${String(ii + 1).padStart(3, "0")}-${slug(base)}${ext ? "." + slug(ext, "bin") : ""}`;
        paths.set(it.id, `${phase}/${roomDir}/${name}`);
      });
    });
  }
  return paths;
}

export function itemsFor(items: VaultItem[], phase: Phase, roomId: string): VaultItem[] {
  return items.filter((i) => i.phase === phase && i.roomId === roomId).sort((a, b) => a.addedAt - b.addedAt);
}

export type Manifest = {
  manifestVersion: number;
  generator: string;
  generatedAt: string;
  phases: Phase[];
  lease: { start: string | null; end: string | null };
  hashAlgorithm: "SHA-256";
  rooms: {
    id: string;
    name: string;
    phases: Partial<Record<Phase, { checked: string[]; files: ManifestFile[] }>>;
  }[];
};

export type ManifestFile = {
  path: string;
  kind: "photo" | "video";
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  fileLastModified: string;
  addedToVault: string;
  sha256: string | null;
  note: string;
};

const iso = (ms: number) => new Date(ms).toISOString();

export function buildManifest(state: VaultState, items: VaultItem[], phases: Phase[], now = new Date()): Manifest {
  const paths = assignPaths(state, items, phases);
  return {
    manifestVersion: MANIFEST_VERSION,
    generator: "Terrarium Deposit vault (files never left the student's device)",
    generatedAt: now.toISOString(),
    phases,
    lease: { start: state.leaseStart || null, end: state.leaseEnd || null },
    hashAlgorithm: "SHA-256",
    rooms: state.rooms.map((room) => ({
      id: room.id,
      name: room.name,
      phases: Object.fromEntries(
        phases.map((phase) => [
          phase,
          {
            checked: state.checks[checkKey(phase, room.id)] ?? [],
            files: itemsFor(items, phase, room.id).map((it) => ({
              path: paths.get(it.id)!,
              kind: it.kind,
              originalName: it.fileName,
              mimeType: it.mimeType,
              sizeBytes: it.size,
              fileLastModified: iso(it.lastModified),
              addedToVault: iso(it.addedAt),
              sha256: it.sha256,
              note: it.note,
            })),
          },
        ]),
      ),
    })),
  };
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** Encode each path segment so files with spaces etc. still resolve from index.html. */
function href(path: string): string {
  return path.split("/").map(encodeURIComponent).join("/");
}

export function formatBytes(n: number): string {
  if (!Number.isFinite(n) || n < 0) return "?";
  if (n < 1024) return `${n} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let v = n / 1024;
  let u = 0;
  while (v >= 1024 && u < units.length - 1) {
    v /= 1024;
    u++;
  }
  return `${v < 10 ? v.toFixed(1) : Math.round(v)} ${units[u]}`;
}

const fmtTime = (s: string) =>
  new Date(s).toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" });

/** Self-contained, human-readable report. Media are referenced by relative path inside the zip. */
export function buildReportHtml(m: Manifest): string {
  const phaseLabel = (p: Phase) => PHASES.find((x) => x.id === p)?.label ?? p;
  const title = `${m.phases.map(phaseLabel).join(" + ")} condition report`;
  const deadlines = computeDeadlines(m.lease.start ?? "", m.lease.end ?? "").filter((d) => d.date);
  const total = m.rooms.reduce(
    (n, r) => n + m.phases.reduce((k, p) => k + (r.phases[p]?.files.length ?? 0), 0),
    0,
  );

  const roomBlocks = m.phases
    .map((phase) => {
      const rooms = m.rooms
        .map((r) => {
          const ph = r.phases[phase];
          if (!ph) return "";
          const checked = ph.checked.length
            ? `<p class="checked"><strong>Captured:</strong> ${ph.checked.map(escapeHtml).join(", ")}</p>`
            : "";
          const files = ph.files.length
            ? ph.files
                .map((f) => {
                  const media =
                    f.kind === "video"
                      ? `<video controls preload="metadata" src="${escapeHtml(href(f.path))}"></video>`
                      : `<a href="${escapeHtml(href(f.path))}"><img loading="lazy" src="${escapeHtml(href(f.path))}" alt="${escapeHtml(`${r.name}: ${f.note || f.originalName}`)}"></a>`;
                  return `<figure>${media}<figcaption>
<div class="name">${escapeHtml(f.originalName)}</div>
${f.note ? `<div class="note">${escapeHtml(f.note)}</div>` : ""}
<dl>
<dt>Added</dt><dd>${escapeHtml(fmtTime(f.addedToVault))}</dd>
<dt>File modified</dt><dd>${escapeHtml(fmtTime(f.fileLastModified))}</dd>
<dt>Size</dt><dd>${escapeHtml(formatBytes(f.sizeBytes))} &middot; ${escapeHtml(f.mimeType || "unknown type")}</dd>
<dt>SHA-256</dt><dd class="hash">${f.sha256 ? escapeHtml(f.sha256) : "not computed"}</dd>
<dt>In this zip</dt><dd><a href="${escapeHtml(href(f.path))}">${escapeHtml(f.path)}</a></dd>
</dl></figcaption></figure>`;
                })
                .join("\n")
            : `<p class="empty">No photos or videos for this room.</p>`;
          return `<section><h3>${escapeHtml(r.name)}</h3>${checked}<div class="grid">${files}</div></section>`;
        })
        .join("\n");
      return `<h2>${escapeHtml(phaseLabel(phase))}</h2>${rooms}`;
    })
    .join("\n");

  const deadlineList = deadlines.length
    ? `<h2>Key dates (Michigan Security Deposit Act)</h2><ul class="dates">${deadlines
        .map(
          (d) =>
            `<li><strong>${escapeHtml(formatIsoDate(d.date!))}</strong> &mdash; ${escapeHtml(d.title)} (${escapeHtml(d.section)})</li>`,
        )
        .join("")}</ul><p class="small">Counted in calendar days from the lease dates entered. Move-out deadlines run from when you actually move out. If you receive a damages list, respond by mail within 7 days (MCL 554.609, 554.612). Not legal advice.</p>`
    : "";

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#16241B;background:#F3F5EF;margin:0;padding:24px;line-height:1.45}
main{max-width:1000px;margin:0 auto}
h1{margin:0 0 4px}h2{margin-top:32px;border-bottom:2px solid #C8D3C1;padding-bottom:4px}h3{margin:20px 0 8px}
.meta,.small{color:#3D5245}.small{font-size:13px}
section{background:#FCFDFB;border:1px solid #C8D3C1;border-radius:12px;padding:12px 16px;margin:12px 0}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px}
figure{margin:0;border:1px solid #C8D3C1;border-radius:10px;overflow:hidden;background:#fff}
img,video{display:block;width:100%;max-height:260px;object-fit:cover;background:#DFEAE2}
figcaption{padding:8px 10px;font-size:13px}.name{font-weight:600;word-break:break-all}.note{margin:4px 0;white-space:pre-wrap}
dl{display:grid;grid-template-columns:auto 1fr;gap:2px 8px;margin:6px 0 0}dt{color:#3D5245}dd{margin:0;word-break:break-all}
.hash{font-family:ui-monospace,Consolas,monospace;font-size:11px}.empty{color:#3D5245;font-style:italic}
.checked{font-size:14px}a{color:#2F6B47}
@media print{body{background:#fff}section{break-inside:avoid}}
</style></head><body><main>
<h1>${escapeHtml(title)}</h1>
<p class="meta">Generated ${escapeHtml(fmtTime(m.generatedAt))} &middot; ${total} file${total === 1 ? "" : "s"}${m.lease.start ? ` &middot; Lease start ${escapeHtml(formatIsoDate(m.lease.start))}` : ""}${m.lease.end ? ` &middot; Lease end ${escapeHtml(formatIsoDate(m.lease.end))}` : ""}</p>
<p class="small">Each file's SHA-256 fingerprint was computed on the renter's device when the file was added. Recomputing the hash of the file in this zip (for example <code>certutil -hashfile FILE SHA256</code> on Windows or <code>shasum -a 256 FILE</code> on macOS) and getting the same value shows the file has not been changed since. Full metadata is in <code>manifest.json</code>.</p>
${deadlineList}
${roomBlocks}
</main></body></html>`;
}
