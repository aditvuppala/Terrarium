import majorsJson from "@/data/majors.json";

/**
 * Frontend-only mapping of data/majors.json onto the illustrated Ann Arbor map.
 *
 * Zones are purely visual. The `campus` handed to onFinish always comes from
 * majors.json (north | central); e.g. Nursing sits in the Medical zone on the
 * map but still reports campus "central".
 */

export type MajorCampus = "north" | "central";

export interface MajorEntry {
  name: string;
  campus: MajorCampus;
}

export type ZoneId = "north" | "medical" | "central";

export const ZONE_LABELS: Record<ZoneId, string> = {
  north: "North Campus",
  medical: "Medical Campus",
  central: "Central Campus",
};

export type ArtId = "north" | "medical" | "lsa" | "ross" | "central-schools";

export interface GroupSection {
  /** School name used as a sub-heading inside the panel. */
  school: string;
  majors: MajorEntry[];
}

export interface MajorGroup {
  id: string;
  zone: ZoneId;
  /** Label printed on the map. */
  label: string;
  /** Heading of the panel. */
  title: string;
  /** One-line flavor text for the panel (names the landmarks drawn). */
  blurb: string;
  art: ArtId;
  /** Center of the building art, and its width, in map viewBox units (800 x 640). */
  x: number;
  y: number;
  w: number;
  sections: GroupSection[];
}

interface SectionDef {
  school: string;
  majorNames: string[];
}

interface GroupDef extends Omit<MajorGroup, "sections"> {
  sections: SectionDef[];
}

const GROUP_DEFS: GroupDef[] = [
  {
    id: "north",
    zone: "north",
    label: "North Campus",
    title: "North Campus",
    blurb: "Lurie Bell Tower, the Duderstadt Center and the Art & Architecture studios.",
    art: "north",
    x: 590,
    y: 106,
    w: 280,
    sections: [
      {
        school: "Engineering",
        majorNames: [
          "Computer Science (Engineering)",
          "Computer Engineering",
          "Electrical Engineering",
          "Mechanical Engineering",
          "Aerospace Engineering",
          "Biomedical Engineering",
          "Chemical Engineering",
          "Civil Engineering",
          "Industrial and Operations Engineering",
          "Materials Science and Engineering",
          "Nuclear Engineering",
          "Robotics",
        ],
      },
      { school: "Music, Theatre & Dance", majorNames: ["Music"] },
      { school: "Art & Design", majorNames: ["Art and Design"] },
      { school: "Architecture", majorNames: ["Architecture"] },
    ],
  },
  {
    id: "nursing",
    zone: "medical",
    label: "Nursing",
    title: "School of Nursing",
    blurb: "On the Medical Campus, next to University Hospital and Mott Children's.",
    art: "medical",
    x: 540,
    y: 345,
    w: 160,
    sections: [{ school: "Nursing", majorNames: ["Nursing"] }],
  },
  {
    id: "lsa",
    zone: "central",
    label: "Literature, Science, and the Arts",
    title: "Literature, Science, and the Arts",
    blurb: "Angell Hall, Burton Memorial Tower and the Diag.",
    art: "lsa",
    x: 400,
    y: 500,
    w: 270,
    sections: [
      {
        school: "Sciences & Math",
        majorNames: [
          "Computer Science (LSA)",
          "Data Science",
          "Mathematics",
          "Statistics",
          "Physics",
          "Chemistry",
          "Biology",
          "Neuroscience",
        ],
      },
      {
        school: "Social Sciences & Humanities",
        majorNames: [
          "Economics",
          "Psychology",
          "Political Science",
          "English",
          "History",
          "Communication and Media",
        ],
      },
    ],
  },
  {
    id: "ross",
    zone: "central",
    label: "Ross",
    title: "Ross School of Business",
    blurb: "The glass-and-limestone Ross building on Tappan Ave.",
    art: "ross",
    x: 660,
    y: 500,
    w: 150,
    sections: [{ school: "Business", majorNames: ["Business Administration (BBA)"] }],
  },
  {
    id: "central-schools",
    zone: "central",
    label: "Central Campus schools",
    title: "Central Campus schools",
    blurb: "North Quad (Information) and Weill Hall (Public Policy) on State St.",
    art: "central-schools",
    x: 270,
    y: 345,
    w: 160,
    sections: [
      { school: "School of Information", majorNames: ["Information (UMSI)"] },
      { school: "Ford School of Public Policy", majorNames: ["Public Policy"] },
    ],
  },
];

export const MAJORS: MajorEntry[] = majorsJson as MajorEntry[];

/** Where a major lands if it is not listed above (keeps the map in sync with new data). */
const FALLBACK_GROUP: Record<MajorCampus, string> = { north: "north", central: "lsa" };

function buildGroups(): MajorGroup[] {
  const byName = new Map(MAJORS.map((m) => [m.name, m]));
  const groups: MajorGroup[] = GROUP_DEFS.map(({ sections, ...rest }) => ({
    ...rest,
    sections: sections
      .map((s) => ({
        school: s.school,
        majors: s.majorNames
          .map((n) => byName.get(n))
          .filter((m): m is MajorEntry => m !== undefined),
      }))
      .filter((s) => s.majors.length > 0),
  }));
  const assigned = new Set(groups.flatMap((g) => groupMajors(g).map((m) => m.name)));
  const extras = MAJORS.filter((m) => !assigned.has(m.name));
  for (const m of extras) {
    const g = groups.find((x) => x.id === FALLBACK_GROUP[m.campus]);
    if (!g) continue;
    let other = g.sections.find((s) => s.school === "Other");
    if (!other) {
      other = { school: "Other", majors: [] };
      g.sections.push(other);
    }
    other.majors.push(m);
  }
  return groups.filter((g) => g.sections.length > 0);
}

export function groupMajors(g: MajorGroup): MajorEntry[] {
  return g.sections.flatMap((s) => s.majors);
}

export const GROUPS: MajorGroup[] = buildGroups();

export function groupForMajor(name: string): MajorGroup | undefined {
  const n = name.trim().toLowerCase();
  return GROUPS.find((g) => groupMajors(g).some((m) => m.name.toLowerCase() === n));
}

export interface SearchHit {
  group: MajorGroup;
  majors: MajorEntry[];
}

/**
 * Case-insensitive match on major name; a query of 3+ chars that starts a word of
 * the group label or a school name ("engineering", "lsa", "ross") pulls in that
 * whole school.
 */
export function searchGroups(query: string): SearchHit[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const wordStarts = (text: string) =>
    q.length >= 3 &&
    text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .some((w) => w.startsWith(q));
  const out: SearchHit[] = [];
  for (const group of GROUPS) {
    const groupHit = wordStarts(group.label) || wordStarts(group.title) || (q === "lsa" && group.id === "lsa");
    const majors = group.sections.flatMap((s) =>
      groupHit || wordStarts(s.school)
        ? s.majors
        : s.majors.filter((m) => m.name.toLowerCase().includes(q)),
    );
    if (majors.length > 0) out.push({ group, majors });
  }
  return out;
}
