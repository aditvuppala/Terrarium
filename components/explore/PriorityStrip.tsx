"use client";

import { useMemo, useState } from "react";
import { ALL_PRIORITY_KEYS, EMPTY_PRIORITIES, PRIORITY_LABELS } from "@/components/shared/constants";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CloseIcon,
  DealbreakerIcon,
  GripIcon,
  PlusIcon,
} from "@/components/ui/Icons";
import type { PriorityKey } from "@/lib/schemas";
import { useTerrarium } from "@/lib/store";

export default function PriorityStrip() {
  const priorities = useTerrarium((s) => s.profile.priorities ?? EMPTY_PRIORITIES);
  const reorderPriorities = useTerrarium((s) => s.reorderPriorities);
  const toggleDealbreaker = useTerrarium((s) => s.toggleDealbreaker);
  const addPriority = useTerrarium((s) => s.addPriority);
  const removePriority = useTerrarium((s) => s.removePriority);

  const sorted = useMemo(
    () => [...priorities].sort((a, b) => a.rank - b.rank),
    [priorities],
  );

  const [dragKey, setDragKey] = useState<PriorityKey | null>(null);
  const [previewKeys, setPreviewKeys] = useState<PriorityKey[] | null>(null);
  const [showManageMenu, setShowManageMenu] = useState<boolean>(false);

  const orderedItems = useMemo(() => {
    if (!previewKeys) return sorted;
    const byKey = new Map(sorted.map((p) => [p.key, p]));
    return previewKeys
      .map((k) => byKey.get(k))
      .filter((p): p is (typeof sorted)[number] => Boolean(p));
  }, [previewKeys, sorted]);

  const unusedKeys = useMemo(() => {
    const active = new Set(sorted.map((p) => p.key));
    return ALL_PRIORITY_KEYS.filter((k) => !active.has(k));
  }, [sorted]);

  function moveItem(fromIdx: number, toIdx: number) {
    if (toIdx < 0 || toIdx >= sorted.length || fromIdx === toIdx) return;
    const keys = sorted.map((p) => p.key);
    const [moved] = keys.splice(fromIdx, 1);
    keys.splice(toIdx, 0, moved);
    reorderPriorities(keys);
  }

  function handleDragStart(e: React.DragEvent<HTMLDivElement>, key: PriorityKey) {
    setDragKey(key);
    setPreviewKeys(sorted.map((p) => p.key));
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", key);
  }

  function handleDragEnter(targetKey: PriorityKey) {
    if (!dragKey || dragKey === targetKey) return;
    setPreviewKeys((curr) => {
      const base = curr ? [...curr] : sorted.map((p) => p.key);
      const from = base.indexOf(dragKey);
      const to = base.indexOf(targetKey);
      if (from < 0 || to < 0 || from === to) return base;
      base.splice(from, 1);
      base.splice(to, 0, dragKey);
      return base;
    });
  }

  function commitDrag() {
    if (previewKeys && dragKey) {
      const orig = sorted.map((p) => p.key);
      const changed = previewKeys.some((k, idx) => k !== orig[idx]);
      if (changed) {
        reorderPriorities(previewKeys);
      }
    }
    setDragKey(null);
    setPreviewKeys(null);
  }

  return (
    <div className="relative flex flex-wrap items-center gap-2">
      <span className="mr-1 text-xs font-bold uppercase tracking-wider text-[#3D5245]">
        Your priorities
      </span>

      <div
        role="list"
        aria-label="Your ranked housing priorities (drag or use arrow keys to reorder)"
        className="flex flex-wrap items-center gap-2"
      >
        {orderedItems.map((item, idx) => {
          const isDragging = dragKey === item.key;
          return (
            <div
              key={item.key}
              role="listitem"
              draggable
              onDragStart={(e) => handleDragStart(e, item.key)}
              onDragEnter={() => handleDragEnter(item.key)}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
              }}
              onDrop={(e) => {
                e.preventDefault();
                commitDrag();
              }}
              onDragEnd={commitDrag}
              className={`group inline-flex min-h-[44px] items-center rounded-full border transition-all ${
                isDragging
                  ? "scale-[1.03] border-[#2F6B47] bg-[#DFEAE2] shadow-sm"
                  : idx === 0
                    ? "border-[#2F6B47] bg-[#FCFDFB]"
                    : "border-[#C8D3C1] bg-[#FCFDFB] hover:border-[#2F6B47]"
              }`}
            >
              <button
                type="button"
                title="Drag chip or press Left/Right arrow keys to reorder"
                onKeyDown={(e) => {
                  if (e.key === "ArrowLeft") {
                    e.preventDefault();
                    moveItem(idx, idx - 1);
                  } else if (e.key === "ArrowRight") {
                    e.preventDefault();
                    moveItem(idx, idx + 1);
                  }
                }}
                className="inline-flex min-h-[44px] cursor-grab items-center gap-2 rounded-full px-3.5 py-1.5 text-left text-sm text-[#16241B] active:cursor-grabbing"
              >
                <GripIcon size={14} className="shrink-0 text-[#3D5245]" />
                <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#2F6B47] text-xs font-bold text-white">
                  {idx + 1}
                </span>
                <span className="font-semibold">{PRIORITY_LABELS[item.key]}</span>
                {item.note && (
                  <span
                    className="max-w-[150px] truncate text-xs text-[#3D5245]"
                    title={item.note}
                  >
                    ({item.note})
                  </span>
                )}
                {item.dealbreaker && (
                  <span
                    className="inline-flex items-center gap-1 rounded-full bg-[#FBF1E8] px-2 py-0.5 text-xs font-semibold text-[#7A3415]"
                    title="Dealbreaker: listings that fail this criterion move below passing matches"
                  >
                    <DealbreakerIcon size={13} />
                    <span className="sr-only sm:not-sr-only">Must</span>
                  </span>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Accessible Customize / Touch-Reorder Popover Trigger */}
      <div className="relative">
        <button
          type="button"
          aria-expanded={showManageMenu}
          onClick={() => setShowManageMenu((v) => !v)}
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-[#C8D3C1] bg-[#E6ECE1] px-3.5 py-1.5 text-xs font-semibold text-[#16241B] hover:border-[#2F6B47] hover:bg-[#DFEAE2]"
        >
          <PlusIcon size={14} />
          <span>Edit / Add</span>
        </button>

        {showManageMenu && (
          <div className="absolute left-0 top-full z-[1200] mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-[#C8D3C1] bg-[#FCFDFB] p-4 shadow-xl sm:left-auto sm:right-0">
            <div className="mb-3 flex items-center justify-between">
              <span className="font-heading text-sm font-bold text-[#16241B]">
                Adjust priorities &amp; dealbreakers
              </span>
              <button
                type="button"
                aria-label="Close priority editor"
                onClick={() => setShowManageMenu(false)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-[#3D5245] hover:bg-[#E6ECE1] hover:text-[#16241B]"
              >
                <CloseIcon size={16} />
              </button>
            </div>

            <div className="space-y-2">
              {sorted.map((p, idx) => (
                <div
                  key={p.key}
                  className="flex items-center justify-between gap-1 rounded-xl border border-[#E6ECE1] bg-[#F3F5EF] px-2.5 py-1.5"
                >
                  <span className="truncate text-xs font-semibold text-[#16241B]">
                    {idx + 1}. {PRIORITY_LABELS[p.key]}
                  </span>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      disabled={idx === 0}
                      aria-label={`Move ${PRIORITY_LABELS[p.key]} higher`}
                      onClick={() => moveItem(idx, idx - 1)}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-[#C8D3C1] bg-[#FCFDFB] text-[#16241B] hover:bg-[#E6ECE1] disabled:opacity-35"
                    >
                      <ChevronLeftIcon size={15} />
                    </button>
                    <button
                      type="button"
                      disabled={idx === sorted.length - 1}
                      aria-label={`Move ${PRIORITY_LABELS[p.key]} lower`}
                      onClick={() => moveItem(idx, idx + 1)}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-[#C8D3C1] bg-[#FCFDFB] text-[#16241B] hover:bg-[#E6ECE1] disabled:opacity-35"
                    >
                      <ChevronRightIcon size={15} />
                    </button>
                    <button
                      type="button"
                      aria-pressed={p.dealbreaker}
                      title="Toggle dealbreaker"
                      onClick={() => toggleDealbreaker(p.key)}
                      className={`inline-flex h-11 items-center gap-1 rounded-lg border px-2.5 text-xs font-semibold ${
                        p.dealbreaker
                          ? "border-[#DFB391] bg-[#FBF1E8] text-[#7A3415]"
                          : "border-[#C8D3C1] bg-[#FCFDFB] text-[#3D5245] hover:bg-[#E6ECE1]"
                      }`}
                    >
                      <DealbreakerIcon size={13} />
                      <span>Must</span>
                    </button>
                    {sorted.length > 1 && (
                      <button
                        type="button"
                        aria-label={`Remove ${PRIORITY_LABELS[p.key]}`}
                        onClick={() => removePriority(p.key)}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-[#3D5245] hover:bg-[#FBECEB] hover:text-[#84231F]"
                      >
                        <CloseIcon size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {unusedKeys.length > 0 && (
              <div className="mt-3 border-t border-[#E6ECE1] pt-3">
                <p className="mb-2 text-xs font-semibold text-[#3D5245]">
                  Add a priority
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {unusedKeys.map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => addPriority(k, false)}
                      className="inline-flex min-h-[44px] items-center gap-1 rounded-full border border-[#C8D3C1] bg-[#F3F5EF] px-3 py-1.5 text-xs font-medium text-[#16241B] hover:border-[#2F6B47] hover:bg-[#DFEAE2]"
                    >
                      <PlusIcon size={12} />
                      <span>{PRIORITY_LABELS[k]}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <span className="hidden text-xs text-[#3D5245] xl:inline">
        Drag chips to test how ranking shifts
      </span>
    </div>
  );
}
