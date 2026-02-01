/**
 * ProSys sidebar groups – UX-driven: Getting Started / Workflow / Rules & Governance.
 * Only used for space tet-prosys. Other spaces use flat PageTree.
 */

export const TET_PROSYS_GROUPS = [
  {
    id: "getting-started",
    label: "Getting Started",
    icon: "🚀",
    titles: [
      "Overview",
      "ProSys Core Design & Operating Model",
      "Board Usage Guide",
    ],
  },
  {
    id: "workflow",
    label: "Workflow",
    icon: "🔁",
    titles: [
      "Workflow & Status",
      "Services to Procure",
      "Quotes",
      "PM Approve Quote",
      "FM Approve Quote",
      "Services Being Delivered",
      "Invoice",
      "FM Approve To Pay",
      "Done",
    ],
  },
  {
    id: "rules",
    label: "Rules & Governance",
    icon: "⚙️",
    titles: [
      "Task Rules",
      "Automation Rules",
      "Labels & Batch System",
      "Roles & Responsibilities",
      "Finance & Audit",
    ],
  },
] as const;

export function getGroupForTitle(title: string): string | null {
  for (const g of TET_PROSYS_GROUPS) {
    if ((g.titles as readonly string[]).includes(title)) return g.id;
  }
  return null;
}
