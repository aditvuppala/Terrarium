"use client";

import { useRef, useState } from "react";
import {
  BUILDINGS,
  BUILDINGS_BY_CODE,
  EMPTY_COURSES,
  guessBuildingClient,
  normalizeCourseCodeClient,
} from "@/components/shared/constants";
import {
  CheckIcon,
  CloseIcon,
  EditIcon,
  PlusIcon,
  TrashIcon,
  UploadIcon,
} from "@/components/ui/Icons";
import { BackpackResponse, type Course } from "@/lib/schemas";
import { useTerrarium } from "@/lib/store";

interface CourseManagerProps {
  expandedByDefault?: boolean;
}

export default function CourseManager({ expandedByDefault = false }: CourseManagerProps) {
  const courses = useTerrarium((s) => s.profile.courses ?? EMPTY_COURSES);
  const mergeCourses = useTerrarium((s) => s.mergeCourses);
  const upsertCourse = useTerrarium((s) => s.upsertCourse);
  const removeCourse = useTerrarium((s) => s.removeCourse);
  const confirmCourse = useTerrarium((s) => s.confirmCourse);
  const confirmAllCourses = useTerrarium((s) => s.confirmAllCourses);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [panelOpen, setPanelOpen] = useState<boolean>(expandedByDefault);
  const [uploading, setUploading] = useState<boolean>(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);

  /* Manual course entry form (for this term and next term) */
  const [courseText, setCourseText] = useState<string>("");
  const [courseTerm, setCourseTerm] = useState<Course["term"]>("current");
  const [courseBuilding, setCourseBuilding] = useState<string>("");

  /* Inline edit state */
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editCode, setEditCode] = useState<string>("");
  const [editTerm, setEditTerm] = useState<Course["term"]>("current");
  const [editBuilding, setEditBuilding] = useState<string>("");

  const showList = panelOpen || courses.length > 0 || warnings.length > 0 || Boolean(uploadError);
  const hasUnconfirmed = courses.some((c) => !c.confirmed || c.source === "guess");

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploading(true);
    setUploadError(null);
    setWarnings([]);
    setPanelOpen(true);

    const formData = new FormData();
    formData.append("image", file);

    try {
      const res = await fetch("/api/backpack", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(
          (errJson && typeof errJson.error === "string" && errJson.error) ||
            `Upload failed (${res.status})`,
        );
      }
      const parsed = BackpackResponse.parse(await res.json());
      if (parsed.courses.length > 0) {
        mergeCourses(parsed.courses);
      }
      setWarnings(parsed.warnings);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Could not read screenshot");
    } finally {
      setUploading(false);
    }
  }

  function handleAddTypedCourses(e: React.FormEvent) {
    e.preventDefault();
    const parts = courseText
      .split(/[,;\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length === 0) return;

    for (const raw of parts) {
      const code = normalizeCourseCodeClient(raw);
      if (!code) continue;
      const explicitBuilding =
        courseBuilding && BUILDINGS_BY_CODE.has(courseBuilding) ? courseBuilding : null;
      const guessed = explicitBuilding ?? guessBuildingClient(code);
      upsertCourse({
        code,
        term: courseTerm,
        buildingCode: guessed,
        source: explicitBuilding ? "typed" : guessed ? "guess" : "typed",
        confirmed: Boolean(explicitBuilding) || !guessed,
      });
    }
    setCourseText("");
    setCourseBuilding("");
    setPanelOpen(true);
  }

  function startEdit(idx: number) {
    const c = courses[idx];
    if (!c) return;
    setEditingIdx(idx);
    setEditCode(c.code);
    setEditTerm(c.term);
    setEditBuilding(c.buildingCode ?? "");
  }

  function saveEdit(idx: number) {
    const code = normalizeCourseCodeClient(editCode);
    if (!code) return;
    upsertCourse(
      {
        code,
        term: editTerm,
        buildingCode: editBuilding || null,
        source: "typed",
        confirmed: true,
      },
      idx,
    );
    setEditingIdx(null);
  }

  return (
    <div className="border-b border-[#C8D3C1] bg-[#F3F5EF] px-3.5 py-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileInputRef}
            id="backpack-file-upload"
            type="file"
            accept="image/png,image/jpeg"
            onChange={handleFileSelect}
            className="sr-only"
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[#2F6B47] bg-[#FCFDFB] px-3.5 py-2 text-xs font-semibold text-[#16241B] hover:bg-[#DFEAE2] disabled:opacity-50"
          >
            <UploadIcon size={16} className="text-[#2F6B47]" />
            <span>{uploading ? "Reading screenshot..." : "Upload Backpack screenshot"}</span>
          </button>

          <button
            type="button"
            aria-expanded={showList}
            onClick={() => setPanelOpen((v) => !v)}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-[#C8D3C1] bg-[#E6ECE1] px-3 py-2 text-xs font-semibold text-[#16241B] hover:bg-[#DCE5D5]"
          >
            <span>
              {courses.length > 0 ? `Classes (${courses.length})` : "Type classes"}
            </span>
          </button>
        </div>

        {showList && courses.length > 0 && panelOpen && (
          <button
            type="button"
            aria-label="Hide class list"
            onClick={() => setPanelOpen(false)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-[#3D5245] hover:bg-[#E6ECE1]"
          >
            <CloseIcon size={16} />
          </button>
        )}
      </div>

      {showList && (
        <div className="mt-3 max-h-64 space-y-3 overflow-y-auto rounded-xl border border-[#C8D3C1] bg-[#FCFDFB] p-3">
          {uploadError && (
            <p role="alert" className="rounded-lg bg-[#FBECEB] px-3 py-2 text-xs font-medium text-[#84231F]">
              {uploadError}
            </p>
          )}

          {warnings.length > 0 && (
            <div className="rounded-lg border border-[#DFB391] bg-[#FBF1E8] px-3 py-2 text-xs text-[#7A3415]">
              {warnings.map((w, i) => (
                <p key={i}>{w}</p>
              ))}
            </div>
          )}

          {courses.length > 0 && (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-bold text-[#16241B]">
                  {hasUnconfirmed ? "We read these classes. Correct?" : "Confirmed classes"}
                </p>
                {hasUnconfirmed && (
                  <button
                    type="button"
                    onClick={confirmAllCourses}
                    className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg bg-[#2F6B47] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#245538]"
                  >
                    <CheckIcon size={14} />
                    <span>Confirm all</span>
                  </button>
                )}
              </div>

              <ul className="space-y-2">
                {courses.map((c, idx) => {
                  const isEditing = editingIdx === idx;
                  const bldg = c.buildingCode ? BUILDINGS_BY_CODE.get(c.buildingCode) : null;

                  if (isEditing) {
                    return (
                      <li
                        key={`${c.code}-${c.term}-${idx}`}
                        className="space-y-2 rounded-xl border border-[#2F6B47] bg-[#F3F5EF] p-2.5"
                      >
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                          <div>
                            <label
                              htmlFor={`edit-code-${idx}`}
                              className="block text-[11px] font-semibold text-[#3D5245]"
                            >
                              Course
                            </label>
                            <input
                              id={`edit-code-${idx}`}
                              type="text"
                              value={editCode}
                              onChange={(e) => setEditCode(e.target.value)}
                              className="mt-0.5 min-h-[44px] w-full rounded-lg border border-[#C8D3C1] bg-[#FCFDFB] px-2.5 text-xs font-medium text-[#16241B]"
                            />
                          </div>

                          <div>
                            <label
                              htmlFor={`edit-term-${idx}`}
                              className="block text-[11px] font-semibold text-[#3D5245]"
                            >
                              Term
                            </label>
                            <select
                              id={`edit-term-${idx}`}
                              value={editTerm}
                              onChange={(e) => setEditTerm(e.target.value as Course["term"])}
                              className="mt-0.5 min-h-[44px] w-full rounded-lg border border-[#C8D3C1] bg-[#FCFDFB] px-2 text-xs text-[#16241B]"
                            >
                              <option value="current">This term</option>
                              <option value="next">Next term</option>
                            </select>
                          </div>

                          <div>
                            <label
                              htmlFor={`edit-bldg-${idx}`}
                              className="block text-[11px] font-semibold text-[#3D5245]"
                            >
                              Building
                            </label>
                            <select
                              id={`edit-bldg-${idx}`}
                              value={editBuilding}
                              onChange={(e) => setEditBuilding(e.target.value)}
                              className="mt-0.5 min-h-[44px] w-full rounded-lg border border-[#C8D3C1] bg-[#FCFDFB] px-2 text-xs text-[#16241B]"
                            >
                              <option value="">Not sure</option>
                              {BUILDINGS.map((b) => (
                                <option key={b.code} value={b.code}>
                                  {b.code} — {b.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingIdx(null)}
                            className="inline-flex min-h-[44px] items-center rounded-lg border border-[#C8D3C1] bg-[#FCFDFB] px-3 text-xs font-semibold text-[#3D5245]"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => saveEdit(idx)}
                            className="inline-flex min-h-[44px] items-center gap-1 rounded-lg bg-[#2F6B47] px-3 text-xs font-semibold text-white hover:bg-[#245538]"
                          >
                            <CheckIcon size={14} />
                            <span>Save</span>
                          </button>
                        </div>
                      </li>
                    );
                  }

                  return (
                    <li
                      key={`${c.code}-${c.term}-${idx}`}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#E6ECE1] bg-[#F3F5EF] px-3 py-1.5 text-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-bold text-[#16241B]">{c.code}</span>
                          <span className="rounded bg-[#E6ECE1] px-1.5 py-0.5 text-[11px] text-[#3D5245]">
                            {c.term === "current" ? "This term" : "Next term"}
                          </span>
                          {(c.source === "guess" || !c.confirmed) && (
                            <span className="rounded bg-[#FBF1E8] px-1.5 py-0.5 text-[11px] font-semibold text-[#7A3415]">
                              Please confirm
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 truncate text-[#3D5245]">
                          {bldg ? `${bldg.code} · ${bldg.name}` : "No building selected"}
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-1">
                        {!c.confirmed && (
                          <button
                            type="button"
                            aria-label={`Confirm ${c.code}`}
                            onClick={() => confirmCourse(idx)}
                            className="inline-flex h-11 items-center gap-1 rounded-lg bg-[#DFEAE2] px-2.5 font-semibold text-[#1C452C] hover:bg-[#2F6B47] hover:text-white"
                          >
                            <CheckIcon size={14} />
                            <span>Confirm</span>
                          </button>
                        )}
                        <button
                          type="button"
                          aria-label={`Edit ${c.code}`}
                          onClick={() => startEdit(idx)}
                          className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-[#3D5245] hover:bg-[#E6ECE1] hover:text-[#16241B]"
                        >
                          <EditIcon size={15} />
                        </button>
                        <button
                          type="button"
                          aria-label={`Remove ${c.code}`}
                          onClick={() => removeCourse(idx)}
                          className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-[#3D5245] hover:bg-[#FBECEB] hover:text-[#84231F]"
                        >
                          <TrashIcon size={15} />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Type courses for this term and next term */}
          <form onSubmit={handleAddTypedCourses} className="border-t border-[#E6ECE1] pt-2.5">
            <label
              htmlFor="manual-course-input"
              className="block text-xs font-semibold text-[#16241B]"
            >
              Add classes for this term or next term
            </label>
            <div className="mt-1.5 flex flex-wrap gap-2">
              <input
                id="manual-course-input"
                type="text"
                value={courseText}
                onChange={(e) => setCourseText(e.target.value)}
                placeholder="e.g. EECS 281, STATS 250"
                className="min-h-[44px] min-w-[150px] flex-1 rounded-xl border border-[#C8D3C1] bg-[#F3F5EF] px-3 text-xs text-[#16241B] placeholder:text-[#3D5245]/70 focus:border-[#2F6B47] focus:bg-[#FCFDFB] focus:outline-none"
              />

              <label htmlFor="manual-course-term" className="sr-only">
                Select term
              </label>
              <select
                id="manual-course-term"
                value={courseTerm}
                onChange={(e) => setCourseTerm(e.target.value as Course["term"])}
                className="min-h-[44px] rounded-xl border border-[#C8D3C1] bg-[#F3F5EF] px-2.5 text-xs font-medium text-[#16241B]"
              >
                <option value="current">This term</option>
                <option value="next">Next term</option>
              </select>

              <label htmlFor="manual-course-building" className="sr-only">
                Optional building
              </label>
              <select
                id="manual-course-building"
                value={courseBuilding}
                onChange={(e) => setCourseBuilding(e.target.value)}
                className="min-h-[44px] max-w-[140px] rounded-xl border border-[#C8D3C1] bg-[#F3F5EF] px-2 text-xs text-[#16241B]"
              >
                <option value="">Auto building</option>
                {BUILDINGS.map((b) => (
                  <option key={b.code} value={b.code}>
                    {b.code} — {b.name}
                  </option>
                ))}
              </select>

              <button
                type="submit"
                disabled={!courseText.trim()}
                className="inline-flex min-h-[44px] items-center gap-1 rounded-xl bg-[#2F6B47] px-3.5 text-xs font-semibold text-white hover:bg-[#245538] disabled:opacity-45"
              >
                <PlusIcon size={14} />
                <span>Add</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
