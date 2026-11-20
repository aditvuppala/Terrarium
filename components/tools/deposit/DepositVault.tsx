"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PlusIcon, PrivacyShieldIcon, UploadIcon, WarningIcon } from "@/components/ui/Icons";
import { todayIso } from "@/lib/deposit/deadlines";
import { sha256Hex } from "@/lib/deposit/hash";
import { formatBytes, itemsFor } from "@/lib/deposit/manifest";
import { buildPacketZip, packetFileName } from "@/lib/deposit/packet";
import { defaultState, newId } from "@/lib/deposit/rooms";
import { getStorageInfo, openVault, requestPersist, type StorageInfo, type Vault } from "@/lib/deposit/storage";
import { PHASES, checkKey, type Phase, type Room, type VaultItem, type VaultState } from "@/lib/deposit/types";
import DeadlinesPanel from "./DeadlinesPanel";
import { LARGE_FILE_BYTES } from "./ItemCard";
import RoomCard from "./RoomCard";

const btn =
  "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2F6B47] disabled:cursor-not-allowed disabled:opacity-60";

export default function DepositVault() {
  const vaultRef = useRef<Vault | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [state, setState] = useState<VaultState>(defaultState);
  const [items, setItems] = useState<VaultItem[]>([]);
  const [phase, setPhase] = useState<Phase>("move-in");
  const [memoryOnly, setMemoryOnly] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [info, setInfo] = useState<StorageInfo>({ usage: null, quota: null, persisted: null });
  const [adding, setAdding] = useState<{ done: number; total: number } | null>(null);
  const [exporting, setExporting] = useState(false);
  const [status, setStatus] = useState("");
  const [newRoom, setNewRoom] = useState("");
  const [today, setToday] = useState<string | null>(null);
  const askedPersist = useRef(false);

  const syncMode = useCallback(() => {
    const v = vaultRef.current;
    if (!v) return;
    setMemoryOnly(v.mode === "memory");
    setStorageError(v.error);
  }, []);

  const refreshInfo = useCallback(() => {
    getStorageInfo().then(setInfo);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      const v = await openVault();
      const all = await v.loadAll();
      if (!alive) return;
      vaultRef.current = v;
      setState(all.state);
      setItems(all.items);
      setLoaded(true);
      setToday(todayIso());
      syncMode();
      refreshInfo();
    })();
    return () => {
      alive = false;
    };
  }, [syncMode, refreshInfo]);

  const updateState = useCallback(
    (fn: (s: VaultState) => VaultState) => {
      setState((prev) => {
        const next = fn(prev);
        vaultRef.current?.saveState(next).then(syncMode);
        return next;
      });
    },
    [syncMode],
  );

  const getBlob = useCallback(async (id: string) => (await vaultRef.current?.getBlob(id)) ?? null, []);

  async function addFiles(roomId: string, files: File[]) {
    const v = vaultRef.current;
    if (!v) return;
    const big = files.filter((f) => f.size > LARGE_FILE_BYTES);
    if (big.length) {
      setStatus(
        `Heads up: ${big.map((f) => `${f.name} (${formatBytes(f.size)})`).join(", ")} ${big.length === 1 ? "is" : "are"} very large. It will be saved, but it uses a lot of this browser's storage and makes the export slower.`,
      );
    }
    if (!askedPersist.current) {
      askedPersist.current = true;
      requestPersist().then(refreshInfo);
    }
    setAdding({ done: 0, total: files.length });
    let added = 0;
    for (const file of files) {
      const kind = file.type.startsWith("video/") ? "video" : file.type.startsWith("image/") ? "photo" : null;
      if (!kind) {
        setStatus(`Skipped ${file.name}: only photos and videos can be added.`);
        setAdding((a) => a && { ...a, done: a.done + 1 });
        continue;
      }
      let hash: string | null = null;
      try {
        hash = await sha256Hex(await file.arrayBuffer());
      } catch {
        hash = null;
      }
      const item: VaultItem = {
        id: newId("item"),
        phase,
        roomId,
        kind,
        fileName: file.name || `${kind}-${Date.now()}`,
        size: file.size,
        mimeType: file.type,
        lastModified: file.lastModified || Date.now(),
        addedAt: Date.now(),
        sha256: hash,
        note: "",
      };
      await v.putItem(item, file);
      added++;
      setItems((prev) => [...prev, item]);
      setAdding((a) => a && { ...a, done: a.done + 1 });
    }
    setAdding(null);
    syncMode();
    refreshInfo();
    if (added && !big.length) setStatus(`Added ${added} ${added === 1 ? "file" : "files"}.`);
  }

  function setNote(id: string, note: string) {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;
        const next = { ...it, note };
        vaultRef.current?.updateItem(next).then(syncMode);
        return next;
      }),
    );
  }

  async function deleteItem(item: VaultItem) {
    if (!window.confirm(`Delete ${item.fileName} from this device? This can't be undone.`)) return;
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    await vaultRef.current?.deleteItems([item.id]);
    syncMode();
    refreshInfo();
    setStatus(`Deleted ${item.fileName}.`);
  }

  async function removeRoom(room: Room) {
    const roomItems = items.filter((i) => i.roomId === room.id);
    const warn = roomItems.length
      ? `Remove ${room.name} and its ${roomItems.length} file${roomItems.length === 1 ? "" : "s"} (both move-in and move-out)? This can't be undone.`
      : `Remove ${room.name}?`;
    if (!window.confirm(warn)) return;
    setItems((prev) => prev.filter((i) => i.roomId !== room.id));
    updateState((s) => {
      const checks = { ...s.checks };
      PHASES.forEach((p) => delete checks[checkKey(p.id, room.id)]);
      return { ...s, rooms: s.rooms.filter((r) => r.id !== room.id), checks };
    });
    if (roomItems.length) await vaultRef.current?.deleteItems(roomItems.map((i) => i.id));
    refreshInfo();
    setStatus(`Removed ${room.name}.`);
  }

  function addRoom(e: React.FormEvent) {
    e.preventDefault();
    const name = newRoom.trim() || suggestRoomName(state.rooms);
    updateState((s) => ({ ...s, rooms: [...s.rooms, { id: newId("room"), name }] }));
    setNewRoom("");
    setStatus(`Added room ${name}.`);
  }

  function toggleCheck(roomId: string, label: string) {
    updateState((s) => {
      const key = checkKey(phase, roomId);
      const cur = s.checks[key] ?? [];
      const next = cur.includes(label) ? cur.filter((x) => x !== label) : [...cur, label];
      return { ...s, checks: { ...s.checks, [key]: next } };
    });
  }

  async function exportPacket(phases: Phase[]) {
    const v = vaultRef.current;
    if (!v) return;
    setExporting(true);
    setStatus("Building your packet…");
    try {
      const { zip, missing } = await buildPacketZip(state, items, phases, async (id) => {
        const b = await v.getBlob(id);
        return b ? new Uint8Array(await b.arrayBuffer()) : null;
      });
      const blob = new Blob([zip as Uint8Array<ArrayBuffer>], { type: "application/zip" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = packetFileName(phases);
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      setStatus(
        `Downloaded ${a.download} (${formatBytes(blob.size)}).` +
          (missing.length ? ` ${missing.length} file(s) were missing from this browser and are not included.` : "") +
          " Save it somewhere safe, like your email or cloud drive.",
      );
    } catch (e) {
      setStatus(`Export failed: ${e instanceof Error ? e.message : String(e)}. Try exporting one phase at a time.`);
    } finally {
      setExporting(false);
    }
  }

  async function clearEverything() {
    if (!window.confirm("Delete ALL rooms, photos, videos and notes from this device? Export first if you need them. This can't be undone.")) return;
    await vaultRef.current?.clearAll();
    setItems([]);
    setState(defaultState());
    syncMode();
    refreshInfo();
    setStatus("Everything was deleted from this device.");
  }

  const phaseItems = useMemo(() => items.filter((i) => i.phase === phase), [items, phase]);
  const phaseLabel = PHASES.find((p) => p.id === phase)!.label;
  const countFor = (p: Phase) => items.filter((i) => i.phase === p).length;

  return (
    <div className="space-y-6">
      {/* Privacy + storage */}
      <section
        aria-labelledby="dep-privacy"
        className="rounded-2xl border border-[#C8D3C1] bg-[#FCFDFB] p-4 sm:p-5"
      >
        <div className="flex items-start gap-3">
          <span className="mt-0.5 hidden size-9 shrink-0 sm:inline-flex items-center justify-center rounded-full bg-[#DFEAE2] text-[#2F6B47]">
            <PrivacyShieldIcon size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="dep-privacy" className="font-heading text-lg font-bold text-[#16241B]">
              Saved only on this device
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-[#3D5245]">
              Your photos, videos and notes stay in this browser on this device. Nothing is uploaded and Terrarium stores
              nothing. Clearing this site&apos;s data (or using a different browser or phone) means they&apos;re gone, so
              download a packet and keep a copy somewhere safe.
            </p>
            <details className="group mt-2 text-sm text-[#3D5245]">
              <summary className="inline-flex min-h-[32px] cursor-pointer items-center font-semibold text-[#2F6B47] underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-[#2F6B47]">
                What&apos;s the fingerprint on each file?
              </summary>
              <p className="mt-1 leading-relaxed">
                When you add a file, this page calculates its SHA-256 fingerprint: a code made from the file&apos;s exact
                bytes. Change even one pixel and the code changes. The packet lists every fingerprint, so anyone can
                re-check a file later and see it wasn&apos;t edited after you added it.
              </p>
            </details>
            <p className="mt-2 text-xs text-[#3D5245]" aria-live="polite">
              {loaded ? (
                <>
                  {items.length} {items.length === 1 ? "file" : "files"}
                  {info.usage !== null && <> · {formatBytes(info.usage)} used by this site</>}
                  {info.quota !== null && <> of about {formatBytes(info.quota)} available</>}
                  {info.persisted === true && <> · Browser will keep this data unless you clear it</>}
                  {info.persisted === false && items.length > 0 && <> · Browser may clear this data if the device runs low on space</>}
                </>
              ) : (
                "Opening your vault…"
              )}
            </p>
          </div>
        </div>
        {memoryOnly && loaded && (
          <div role="alert" className="mt-3 flex gap-2 rounded-xl border border-[#DFB391] bg-[#FBF1E8] p-3 text-sm text-[#7A3415]">
            <WarningIcon size={18} className="mt-0.5 shrink-0" />
            <p>
              <strong>This browser isn&apos;t letting us save files</strong> (private browsing or blocked site data
              {storageError ? `: ${storageError}` : ""}). You can still add photos, but they&apos;ll disappear when you close
              this tab. Download a packet before leaving.
            </p>
          </div>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-4">
          {/* Phase switch + export */}
          <div className="flex flex-col gap-3 rounded-2xl border border-[#C8D3C1] bg-[#FCFDFB] p-3 sm:flex-row sm:items-center sm:justify-between">
            <div role="group" aria-label="Inspection" className="grid grid-cols-2 gap-1 rounded-xl bg-[#E6ECE1] p-1">
              {PHASES.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  aria-pressed={phase === p.id}
                  onClick={() => setPhase(p.id)}
                  className={`min-h-[40px] rounded-lg px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-[#2F6B47] ${
                    phase === p.id ? "bg-[#FCFDFB] text-[#16241B] shadow-sm" : "text-[#3D5245] hover:text-[#16241B]"
                  }`}
                >
                  {p.label} <span className="font-normal">({countFor(p.id)})</span>
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={!loaded || exporting || phaseItems.length === 0}
                onClick={() => exportPacket([phase])}
                className={`${btn} flex-1 bg-[#2F6B47] text-white hover:bg-[#245538] sm:flex-none`}
              >
                <UploadIcon size={16} className="rotate-180" />
                {exporting ? "Preparing…" : `Download ${phaseLabel.toLowerCase()} packet`}
              </button>
              {countFor("move-in") > 0 && countFor("move-out") > 0 && (
                <button
                  type="button"
                  disabled={exporting}
                  onClick={() => exportPacket(["move-in", "move-out"])}
                  className={`${btn} border border-[#C8D3C1] bg-white text-[#16241B] hover:border-[#2F6B47] hover:bg-[#DFEAE2]`}
                >
                  Both phases
                </button>
              )}
            </div>
          </div>

          <p className="text-sm text-[#3D5245]">
            {phase === "move-in"
              ? "Before you unpack, go room by room. Capture every wall, floor and appliance, plus close-ups of anything already damaged. The packet is a .zip with your files, a readable report and a manifest of fingerprints."
              : "After you've cleaned and moved your things out, shoot the same angles again so you can compare against move-in."}
          </p>

          <div role="status" aria-live="polite" className="min-h-0 empty:hidden">
            {(adding || status) && (
              <p className="rounded-xl border border-[#C8D3C1] bg-[#DFEAE2] px-3 py-2 text-sm text-[#16241B]">
                {adding ? `Saving and fingerprinting ${Math.min(adding.done + 1, adding.total)} of ${adding.total}…` : status}
              </p>
            )}
          </div>

          {!loaded ? (
            <p className="text-sm text-[#3D5245]">Loading…</p>
          ) : (
            state.rooms.map((room) => (
              <RoomCard
                key={room.id}
                room={room}
                phase={phase}
                items={itemsFor(phaseItems, phase, room.id)}
                checked={state.checks[checkKey(phase, room.id)] ?? []}
                busy={!!adding}
                getBlob={getBlob}
                onAddFiles={addFiles}
                onToggleCheck={toggleCheck}
                onRename={(id, name) =>
                  updateState((s) => ({ ...s, rooms: s.rooms.map((r) => (r.id === id ? { ...r, name } : r)) }))
                }
                onRemove={removeRoom}
                onNote={setNote}
                onDeleteItem={deleteItem}
              />
            ))
          )}

          <form onSubmit={addRoom} className="flex flex-col gap-2 rounded-2xl border border-dashed border-[#C8D3C1] p-4 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label htmlFor="dep-new-room" className="text-sm font-semibold text-[#16241B]">
                Add a room
              </label>
              <input
                id="dep-new-room"
                value={newRoom}
                maxLength={60}
                onChange={(e) => setNewRoom(e.target.value)}
                placeholder={suggestRoomName(state.rooms)}
                className="mt-1 block min-h-[44px] w-full rounded-xl border border-[#C8D3C1] bg-white px-3 text-[#16241B] placeholder:text-[#3D5245]/70 focus:border-[#2F6B47] focus:outline-2 focus:outline-[#2F6B47]/30"
              />
            </div>
            <button type="submit" disabled={!loaded} className={`${btn} border border-[#2F6B47] bg-white text-[#2F6B47] hover:bg-[#DFEAE2]`}>
              <PlusIcon size={16} />
              Add room
            </button>
          </form>
        </div>

        <aside className="min-w-0 space-y-4">
          <DeadlinesPanel
            leaseStart={state.leaseStart}
            leaseEnd={state.leaseEnd}
            today={today}
            onChange={(patch) => updateState((s) => ({ ...s, ...patch }))}
          />
          <div className="rounded-2xl border border-[#C8D3C1] bg-[#FCFDFB] p-4 text-sm text-[#3D5245]">
            <h2 className="font-heading text-base font-bold text-[#16241B]">Done with this place?</h2>
            <p className="mt-1">Export your packets first, then you can wipe everything from this device.</p>
            <button
              type="button"
              onClick={clearEverything}
              disabled={!loaded}
              className={`${btn} mt-3 w-full border border-[#DFB391] bg-[#FBF1E8] text-[#7A3415] hover:bg-[#F6E3D2]`}
            >
              Delete everything on this device
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}

function suggestRoomName(rooms: Room[]): string {
  const beds = rooms.filter((r) => /^bedroom \d+$/i.test(r.name.trim())).length;
  return `Bedroom ${beds + 1}`;
}
