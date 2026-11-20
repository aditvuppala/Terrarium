import type { Metadata } from "next";
import ToolShell from "@/components/tools/ToolShell";
import RentSplitter from "@/components/tools/split/RentSplitter";

export const metadata: Metadata = {
  title: "Rent splitter — Terrarium",
  description: "Split rent for rooms of different sizes so nobody would rather swap rooms.",
};

export default function SplitPage() {
  return (
    <ToolShell
      title="Rent splitter"
      intro={
        <p>
          Bedrooms aren&apos;t all equal, so the rent shouldn&apos;t be either. Everyone bids once on what each room is
          worth to them, and you get who-gets-which-room plus prices where nobody would rather swap. Everything stays
          on this device.
        </p>
      }
    >
      <RentSplitter />
    </ToolShell>
  );
}
