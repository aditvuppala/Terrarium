"use client";

import { useId, useRef, useState } from "react";
import { CheckIcon, EditIcon, PlusIcon, TrashIcon, UploadIcon } from "@/components/ui/Icons";
import { suggestionsFor } from "@/lib/deposit/rooms";
import type { Phase, Room, VaultItem } from "@/lib/deposit/types";
import ItemCard from "./ItemCard";

const btn =
  "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-3.5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2F6B47] disabled:cursor-not-allowed disabled:opacity-60";

export default function RoomCard({
  room,
  phase,
  items,
  checked,
  busy,
  getBlob,
  onAddFiles,
  onToggleCheck,
  onRename,
  onRemove,
  onNote,
  onDeleteItem,
}: {
  room: Room;
  phase: Phase;
  items: VaultItem[];
  checked: string[];
  busy: boolean;
  getBlob: (id: string) => Promise<Blob | null>;
  onAddFiles: (roomId: string, files: File[]) => void;
  onToggleCheck: (roomId: string, label: string) => void;
  onRename: (roomId: string, name: string) => void;
  onRemove: (room: Room) => void;
  onNote: (id: string, note: string) => void;
  onDeleteItem: (item: VaultItem) => void;
}) {
  const uid = useId();
  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(room.name);
  const suggestions = suggestionsFor(room.name);
  const headingId = `${uid}-h`;

  function commitRename() {
    const name = draft.trim();
    if (name && name !== room.name) onRename(room.id, name);
    else setDraft(room.name);
    setEditing(false);
  }

  function handleFiles(input: HTMLInputElement) {
    const files = Array.from(input.files ?? []);
    input.value = "";
    if (files.length) onAddFiles(room.id, files);
  }

  const doneCount = suggestions.filter((s) => checked.includes(s)).length;

  return (
    <section
      aria-labelledby={headingId}
      className="rounded-2xl border border-[#C8D3C1] bg-[#FCFDFB] p-4 shadow-[0_1px_0_rgba(22,36,27,0.04)] sm:p-5"
      data-room={room.name}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        {editing ? (
          <form
            className="flex min-w-0 flex-1 items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              commitRename();
            }}
          >
            <label htmlFor={`${uid}-name`} className="sr-only">
              Room name
            </label>
            <input
              id={`${uid}-name`}
              autoFocus
              value={draft}
              maxLength={60}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setDraft(room.name);
                  setEditing(false);
                }
              }}
              className="min-h-[44px] min-w-0 flex-1 rounded-xl border border-[#2F6B47] bg-white px-3 font-heading text-lg font-bold text-[#16241B] focus:outline-2 focus:outline-[#2F6B47]/30"
            />
            <button type="submit" className={`${btn} bg-[#2F6B47] text-white hover:bg-[#245538]`}>
              <CheckIcon size={16} />
              Save
            </button>
          </form>
        ) : (
          <h3 id={headingId} className="min-w-0 break-words font-heading text-xl font-bold text-[#16241B]">
            {room.name}
            <span className="ml-2 align-middle text-sm font-normal text-[#3D5245]">
              {items.length} {items.length === 1 ? "file" : "files"}
            </span>
          </h3>
        )}
        {!editing && (
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => {
                setDraft(room.name);
                setEditing(true);
              }}
              className={`${btn} px-2.5 text-[#3D5245] hover:bg-[#DFEAE2]`}
              aria-label={`Rename ${room.name}`}
            >
              <EditIcon size={16} />
            </button>
            <button
              type="button"
              onClick={() => onRemove(room)}
              className={`${btn} px-2.5 text-[#7A3415] hover:bg-[#FBF1E8]`}
              aria-label={`Remove ${room.name}`}
            >
              <TrashIcon size={16} />
            </button>
          </div>
        )}
      </div>

      <fieldset className="mt-3">
        <legend className="text-sm font-semibold text-[#3D5245]">
          What to capture <span className="font-normal">({doneCount}/{suggestions.length} ticked)</span>
        </legend>
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {suggestions.map((s) => {
            const on = checked.includes(s);
            const id = `${uid}-${s}`;
            return (
              <li key={s}>
                <input
                  type="checkbox"
                  id={id}
                  checked={on}
                  onChange={() => onToggleCheck(room.id, s)}
                  className="peer sr-only"
                />
                <label
                  htmlFor={id}
                  className={`inline-flex min-h-[36px] cursor-pointer items-center gap-1.5 rounded-full border px-3 text-[13px] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#2F6B47] ${
                    on
                      ? "border-[#2F6B47] bg-[#DFEAE2] font-semibold text-[#16241B]"
                      : "border-[#C8D3C1] bg-white text-[#3D5245] hover:border-[#2F6B47]"
                  }`}
                >
                  {on ? <CheckIcon size={13} /> : <span aria-hidden="true" className="size-[13px] rounded-full border border-[#C8D3C1]" />}
                  {s}
                </label>
              </li>
            );
          })}
        </ul>
      </fieldset>

      <div className="mt-4 flex flex-wrap gap-2">
        <input
          ref={cameraRef}
          type="file"
          accept="image/*,video/*"
          capture="environment"
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          data-testid={`camera-${room.id}`}
          onChange={(e) => handleFiles(e.currentTarget)}
        />
        <input
          ref={libraryRef}
          type="file"
          accept="image/*,video/*"
          multiple
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          data-testid={`library-${room.id}`}
          onChange={(e) => handleFiles(e.currentTarget)}
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => cameraRef.current?.click()}
          className={`${btn} bg-[#2F6B47] text-white hover:bg-[#245538]`}
        >
          <PlusIcon size={16} />
          Take photo or video
          <span className="sr-only"> in {room.name}</span>
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => libraryRef.current?.click()}
          className={`${btn} border border-[#C8D3C1] bg-white text-[#16241B] hover:border-[#2F6B47] hover:bg-[#DFEAE2]`}
        >
          <UploadIcon size={16} />
          Choose from library
          <span className="sr-only"> for {room.name}</span>
        </button>
      </div>

      {items.length > 0 ? (
        <ul className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(min(100%,220px),1fr))] gap-3" aria-label={`${room.name} files`}>
          {items.map((it) => (
            <ItemCard key={it.id} item={it} getBlob={getBlob} onNote={onNote} onDelete={onDeleteItem} />
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-[#3D5245]">
          No {phase === "move-in" ? "move-in" : "move-out"} files yet. Start with a slow video walk-through, then close-ups of anything damaged.
        </p>
      )}
    </section>
  );
}
