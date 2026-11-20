"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import majors from "@/data/majors.json";
import { useTerrarium } from "@/lib/store";
import { Year } from "@/lib/schemas";

const CAMPUS_BY_MAJOR = new Map(majors.map((m) => [m.name, m.campus as "north" | "central"]));

/** STUB: 2-step stepper (year, then major). Real UI lives in components/onboarding/. */
export default function Onboarding() {
  const router = useRouter();
  const patchProfile = useTerrarium((s) => s.patchProfile);
  const [step, setStep] = useState<1 | 2>(1);
  const [year, setYear] = useState<Year | null>(null);
  const [major, setMajor] = useState<string>("");

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 p-8">
      <p className="text-sm">Step {step} of 2</p>

      {step === 1 ? (
        <>
          <h1 className="text-xl font-semibold">What year are you?</h1>
          <div className="flex flex-wrap gap-2">
            {Year.options.map((y) => (
              <button
                key={y.replace("_", " ")}
                onClick={() => setYear(y)}
                className={`rounded border px-3 py-1 ${year === y ? "font-bold underline" : ""}`}
              >
                {y.replace("_", " ")}
              </button>
            ))}
          </div>
          <button disabled={!year} onClick={() => setStep(2)} className="rounded border px-4 py-2 disabled:opacity-40">
            Next
          </button>
        </>
      ) : (
        <>
          <h1 className="text-xl font-semibold">What&apos;s your major?</h1>
          <select value={major} onChange={(e) => setMajor(e.target.value)} className="rounded border p-2">
            <option value="">Select a major</option>
            {majors.map((m) => (
              <option key={m.name} value={m.name}>
                {m.name}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <button onClick={() => setStep(1)} className="rounded border px-4 py-2">
              Back
            </button>
            <button
              disabled={!major}
              onClick={() => {
                patchProfile({ year, major, majorCampus: CAMPUS_BY_MAJOR.get(major) ?? null });
                router.push("/explore");
              }}
              className="rounded border px-4 py-2 disabled:opacity-40"
            >
              Done
            </button>
          </div>
        </>
      )}
    </main>
  );
}
