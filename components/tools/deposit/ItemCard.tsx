"use client";

import { useEffect, useState } from "react";
import { TrashIcon, WarningIcon } from "@/components/ui/Icons";
import { shortHash } from "@/lib/deposit/hash";
import { formatBytes } from "@/lib/deposit/manifest";
import type { VaultItem } from "@/lib/deposit/types";

export const LARGE_FILE_BYTES = 250 * 1024 * 1024;

const fmt = (ms: number) =>
  new Date(ms).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

export default function ItemCard({
  item,
  getBlob,
  onNote,
  onDelete,
}: {
  item: VaultItem;
  getBlob: (id: string) => Promise<Blob | null>;
  onNote: (id: string, note: string) => void;
  onDelete: (item: VaultItem) => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [note, setNote] = useState(item.note);

  useEffect(() => {
    let alive = true;
    let objectUrl: string | null = null;
    getBlob(item.id).then((b) => {
      if (!alive) return;
      if (!b) return setFailed(true);
      objectUrl = URL.createObjectURL(b);
      setUrl(objectUrl);
    });
    return () => {
      alive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [item.id, getBlob]);

  const noteId = `note-${item.id}`;

  return (
    <li className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-[#C8D3C1] bg-white">
      <div className="relative aspect-[4/3] bg-[#DFEAE2]">
        {url && item.kind === "video" ? (
          <video
            src={`${url}#t=0.1`}
            preload="metadata"
            muted
            playsInline
            controls
            className="h-full w-full object-cover"
            aria-label={`Video: ${item.fileName}`}
          />
        ) : url ? (
          <a href={url} target="_blank" rel="noopener" className="block h-full w-full focus-visible:outline-3 focus-visible:outline-offset-[-3px] focus-visible:outline-[#2F6B47]">
            {/* eslint-disable-next-line @next/next/no-img-element -- local object URL */}
            <img src={url} alt={item.note ? item.note : `Photo: ${item.fileName}`} className="h-full w-full object-cover" />
          </a>
        ) : (
          <div className="flex h-full items-center justify-center px-3 text-center text-xs text-[#3D5245]">
            {failed ? "Preview unavailable (file missing from this browser)" : "Loading…"}
          </div>
        )}
        <span className="pointer-events-none absolute left-2 top-2 rounded-md bg-[#16241B]/80 px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white">
          {item.kind}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3 text-xs text-[#3D5245]">
        <div className="flex items-start justify-between gap-2">
          <p className="min-w-0 break-all font-semibold text-[#16241B]" title={item.fileName}>
            {item.fileName}
          </p>
          <button
            type="button"
            onClick={() => onDelete(item)}
            className="-m-1 inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-[#7A3415] hover:bg-[#FBF1E8] focus-visible:outline-2 focus-visible:outline-[#2F6B47]"
            aria-label={`Delete ${item.fileName}`}
          >
            <TrashIcon size={16} />
          </button>
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5">
          <dt>Added</dt>
          <dd className="text-[#16241B]">{fmt(item.addedAt)}</dd>
          <dt>File date</dt>
          <dd className="text-[#16241B]">{fmt(item.lastModified)}</dd>
          <dt>Size</dt>
          <dd className="text-[#16241B]">{formatBytes(item.size)}</dd>
          <dt>Fingerprint</dt>
          <dd className="font-mono text-[11px] text-[#16241B]" title={item.sha256 ? `SHA-256 ${item.sha256}` : undefined}>
            {shortHash(item.sha256)}
          </dd>
        </dl>
        {item.size > LARGE_FILE_BYTES && (
          <p className="flex gap-1.5 rounded-lg border border-[#DFB391] bg-[#FBF1E8] p-2 text-[#7A3415]">
            <WarningIcon size={14} className="mt-px shrink-0" />
            Large file: exporting may be slow. Keep the original on your phone too.
          </p>
        )}
        <label htmlFor={noteId} className="mt-auto font-semibold text-[#16241B]">
          Note
        </label>
        <textarea
          id={noteId}
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={() => note !== item.note && onNote(item.id, note)}
          placeholder="e.g. scratch on left cabinet door"
          className="w-full resize-y rounded-lg border border-[#C8D3C1] bg-[#FCFDFB] px-2 py-1.5 text-sm text-[#16241B] placeholder:text-[#3D5245]/70 focus:border-[#2F6B47] focus:outline-2 focus:outline-[#2F6B47]/30"
        />
      </div>
    </li>
  );
}
