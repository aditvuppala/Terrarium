import type { Metadata } from "next";
import LeaseReviewer from "@/components/tools/lease/LeaseReviewer";
import ToolShell from "@/components/tools/ToolShell";

export const metadata: Metadata = {
  title: "Lease reviewer · Terrarium",
  description: "Upload your lease and see clauses that conflict with Michigan or Ann Arbor rental law, with the rule and where to read it.",
};

export default function LeaseCheckPage() {
  return (
    <ToolShell
      title="Lease reviewer"
      intro="Upload your lease and we'll highlight clauses that conflict with Michigan or Ann Arbor rental law, each with the rule, a link to the official text, and what to ask your landlord."
    >
      <LeaseReviewer />
    </ToolShell>
  );
}
