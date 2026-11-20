import type { Metadata } from "next";
import ToolShell from "@/components/tools/ToolShell";
import DepositVault from "@/components/tools/deposit/DepositVault";

export const metadata: Metadata = {
  title: "Deposit vault — Terrarium",
  description:
    "Photograph and video your apartment room by room at move-in and move-out. Files stay on your device; export a fingerprinted packet.",
};

export default function DepositPage() {
  return (
    <ToolShell
      title="Deposit vault"
      intro={
        <>
          Document your place room by room at move-in and again at move-out, so you have dated, fingerprinted proof of its
          condition when it&apos;s time to get your security deposit back. Everything stays on this device.
        </>
      }
    >
      <DepositVault />
    </ToolShell>
  );
}
