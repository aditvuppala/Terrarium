import Link from "next/link";

export default function Welcome() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-3xl font-semibold">Terrarium</h1>
      <p>Find Ann Arbor housing that fits your priorities.</p>
      <div className="flex gap-4">
        <Link href="/explore" className="rounded border px-4 py-2">
          Just browse
        </Link>
        <Link href="/onboarding" className="rounded border px-4 py-2">
          Help me narrow it down
        </Link>
      </div>
    </main>
  );
}
