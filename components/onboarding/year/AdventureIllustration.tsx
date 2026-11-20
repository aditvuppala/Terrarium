"use client";

import { useId } from "react";
import type { ReactNode } from "react";
import type { Year } from "@/lib/schemas";
import { BearScene, ClimbScene, HikeScene, IceScene, WalkScene } from "./scenes";
import "./adventure.css";
import styles from "./styles";

const SCENES: Array<{ year: Year; caption: string; Scene: (p: { uid: string }) => ReactNode }> = [
  { year: "first_year", caption: "A casual stroll", Scene: WalkScene },
  { year: "sophomore", caption: "Hitting the trail", Scene: HikeScene },
  { year: "junior", caption: "Learning the ropes", Scene: ClimbScene },
  { year: "senior", caption: "Ice-cold veteran", Scene: IceScene },
  { year: "grad", caption: "Apex predator", Scene: BearScene },
];

/**
 * The escalating adventurer: one stacked SVG per year, crossfaded on change.
 * Circle vignette on desktop, a compact rounded banner on phones.
 */
export default function AdventureIllustration({ scene }: { scene: Year }) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const current = SCENES.find((s) => s.year === scene) ?? SCENES[0];

  return (
    <figure aria-hidden="true" className="relative mx-auto w-full max-w-[380px] lg:max-w-none">
      {/* warm offset disc behind the vignette */}
      <div className="pointer-events-none absolute -right-3 -top-3 hidden aspect-square w-[88%] rounded-full bg-[#F7DCC9] lg:block" />
      <div
        className={`${styles.stage} aspect-[16/10] w-full rounded-[28px] bg-[#EEF3E6] shadow-[0_10px_30px_-12px_rgba(22,36,27,0.35)] ring-1 ring-[#C8D3C1] lg:aspect-square lg:rounded-full lg:ring-[10px] lg:ring-[#F3F5EF]`}
      >
        {SCENES.map(({ year, Scene }) => (
          <svg
            key={year}
            viewBox="0 0 400 400"
            preserveAspectRatio="xMidYMid slice"
            className={`${styles.scene} ${year === scene ? styles.active : ""}`}
          >
            <Scene uid={`${uid}-${year}`} />
          </svg>
        ))}
      </div>
      <figcaption
        key={current.year}
        className={`${styles.caption} mt-3 text-center text-xs font-semibold uppercase tracking-[0.14em] text-[#3D5245] lg:mt-5`}
      >
        {current.caption}
      </figcaption>
    </figure>
  );
}
