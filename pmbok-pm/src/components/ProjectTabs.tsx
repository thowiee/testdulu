import Link from "next/link";

type Tab = { key: string; label: string; segment?: string; soon?: boolean };

const TABS: Tab[] = [
  { key: "overview", label: "Overview", segment: "" },
  { key: "scope", label: "Scope & WBS", segment: "/scope" },
  { key: "schedule", label: "Schedule", segment: "/schedule" },
  { key: "cost", label: "Cost & EVM", soon: true },
  { key: "risk", label: "Risk", soon: true },
  { key: "team", label: "Team & RACI", soon: true },
];

export function ProjectTabs({
  projectId,
  active,
}: {
  projectId: string;
  active: "overview" | "scope" | "schedule";
}) {
  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-line pb-1">
      {TABS.map((tab) => {
        if (tab.soon) {
          return (
            <span
              key={tab.key}
              title="Modul ini dibuka pada fase berikutnya"
              className="cursor-default rounded-lg px-3 py-1.5 text-[12px] text-slate-400"
            >
              {tab.label}
              <span className="ml-1 text-[9px] uppercase">soon</span>
            </span>
          );
        }
        const isActive = tab.key === active;
        return (
          <Link
            key={tab.key}
            href={`/projects/${projectId}${tab.segment ?? ""}`}
            className={`rounded-lg px-3 py-1.5 text-[12px] transition ${
              isActive
                ? "bg-brand-soft font-semibold text-brand"
                : "text-slate-600 hover:bg-slate-50 hover:text-ink"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
      <Link
        href={`/projects/${projectId}/meetings`}
        className="rounded-lg px-3 py-1.5 text-[12px] font-semibold text-brand hover:bg-brand-soft"
      >
        Meetings &amp; MOM →
      </Link>
    </div>
  );
}
