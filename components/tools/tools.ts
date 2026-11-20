/** The renter tools reachable from the explore page's sidebar. */
export const TOOLS = [
  {
    href: "/lease-check",
    title: "Lease reviewer",
    blurb: "Upload your lease and see clauses that break Michigan or Ann Arbor rental law.",
  },
  {
    href: "/deposit",
    title: "Deposit vault",
    blurb: "Photo and video your place room by room at move-in, saved only on this device.",
  },
  {
    href: "/split",
    title: "Rent splitter",
    blurb: "Everyone bids on the rooms once; get a split where nobody wants to swap.",
  },
] as const;

export type ToolHref = (typeof TOOLS)[number]["href"];
