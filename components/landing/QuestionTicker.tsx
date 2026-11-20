/**
 * Endless horizontal ticker of example questions, faded at both edges.
 * CSS-only (see `.tr-ticker*` in globals.css); pauses on hover and stops
 * for prefers-reduced-motion.
 */

const QUESTIONS = [
  "How long is my walk between classes?",
  "Is my street a construction zone?",
  "How far is the closest bus stop?",
  "Can I grab late-night food nearby?",
  "What will rent plus utilities really cost?",
  "Is there a grocery store within walking distance?",
  "Will I have laundry in my unit?",
  "Can my pet come with me?",
];

function Row({ hidden = false }: { hidden?: boolean }) {
  return (
    <ul className="flex shrink-0 items-center gap-3 pr-3" aria-hidden={hidden || undefined}>
      {QUESTIONS.map((q) => (
        <li
          key={q}
          className="whitespace-nowrap rounded-full border border-[#C8D3C1] bg-[#FCFDFB]/85 px-4 py-2 text-sm font-medium text-[#1C452C] shadow-[0_1px_3px_rgba(22,36,27,0.06)]"
        >
          {q}
        </li>
      ))}
    </ul>
  );
}

export function QuestionTicker() {
  return (
    <div className="tr-ticker mt-6 w-full overflow-hidden" aria-label="Questions Terrarium helps answer">
      <div className="tr-ticker-track flex w-max">
        <Row />
        <Row hidden />
      </div>
    </div>
  );
}
