"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
  hint: string;
  icon: React.ReactNode;
};

const NAV: NavItem[] = [
  {
    href: "/portfolio",
    label: "Portfolio",
    hint: "Kesehatan portofolio",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    href: "/projects",
    label: "Proyek",
    hint: "Daftar & EVM",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 7a2 2 0 0 1 2-2h3l2 2h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
      </svg>
    ),
  },
  {
    href: "/governance",
    label: "Governance",
    hint: "MOM & perubahan",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 3l7 3v6c0 4.2-2.8 7.6-7 9-4.2-1.4-7-4.8-7-9V6Z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    ),
  },
];

export function Sidebar({
  userName,
  userRole,
  initials,
  color,
  pendingMom,
}: {
  userName: string;
  userRole: string;
  initials: string;
  color: string;
  pendingMom: number;
}) {
  const pathname = usePathname();

  return (
    <aside className="flex w-full shrink-0 flex-col border-b border-line bg-white lg:h-screen lg:w-64 lg:border-b-0 lg:border-r">
      <div className="flex items-center gap-2 px-5 py-5">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand text-sm font-bold text-white">PM</span>
        <div>
          <p className="text-sm font-semibold leading-tight">PMBOK-PM</p>
          <p className="text-[11px] text-muted">Portfolio Workspace</p>
        </div>
      </div>

      <div className="px-3">
        <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-widest text-muted">Main menu</p>
        <nav className="space-y-1">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition ${
                  active
                    ? "bg-brand-soft font-semibold text-brand"
                    : "text-slate-600 hover:bg-slate-50 hover:text-ink"
                }`}
              >
                <span className={active ? "text-brand" : "text-slate-400"}>{item.icon}</span>
                <span className="flex-1">{item.label}</span>
                {item.href === "/governance" && pendingMom > 0 ? (
                  <span className="rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700">
                    {pendingMom}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="mt-6 px-3">
        <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-widest text-muted">Modul PMBOK</p>
        <ul className="space-y-1 px-2 text-[12px] text-slate-500">
          <li className="flex items-center justify-between gap-2">
            <span>Scope · WBS &amp; roll-up</span>
            <span className="text-[10px] font-semibold text-emerald-600">aktif</span>
          </li>
          <li className="flex items-center justify-between gap-2">
            <span>Schedule · CPM &amp; Gantt</span>
            <span className="text-[10px] font-semibold text-emerald-600">aktif</span>
          </li>
          <li className="flex items-center justify-between gap-2">
            <span>Cost · EVM</span>
            <span className="text-[10px] text-slate-400">fase 4</span>
          </li>
          <li className="flex items-center justify-between gap-2">
            <span>Risk · register &amp; heatmap</span>
            <span className="text-[10px] text-slate-400">fase 5</span>
          </li>
          <li className="flex items-center justify-between gap-2">
            <span>Stakeholder &amp; komunikasi</span>
            <span className="text-[10px] text-slate-400">fase 6</span>
          </li>
        </ul>
        <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-[11px] leading-relaxed text-slate-500">
          Scope &amp; Schedule dibuka dari tab proyek. Modul Cost, Risk, dan Team menyusul.
        </p>
      </div>

      <div className="mt-auto p-3">
        <div className="flex items-center gap-2.5 rounded-xl border border-line px-3 py-2">
          <span
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11px] font-semibold text-white"
            style={{ backgroundColor: color }}
          >
            {initials}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold">{userName}</p>
            <p className="truncate text-[11px] text-muted">{userRole}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
