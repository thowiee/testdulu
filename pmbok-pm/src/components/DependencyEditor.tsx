"use client";

import { useState, useTransition } from "react";
import { DEPENDENCY_TYPES, dependencyTypeLabel } from "@/lib/pmbok/schedule";
import {
  deleteDependency,
  saveDependency,
} from "@/app/(app)/projects/[id]/schedule/actions";

const FIELD =
  "w-full rounded-lg border border-line bg-white px-2.5 py-1.5 text-[11px] text-ink outline-none focus:border-brand/60";

export type DependencyActivity = {
  id: string;
  name: string;
  code: string;
  critical: boolean;
  totalFloat: number;
};

export type DependencyItem = {
  id: string;
  predId: string;
  succId: string;
  type: string;
  lagDays: number;
  predName: string;
  predCode: string;
  succName: string;
  succCode: string;
};

export function DependencyEditor({
  projectId,
  canEdit,
  activities,
  dependencies,
}: {
  projectId: string;
  canEdit: boolean;
  activities: DependencyActivity[];
  dependencies: DependencyItem[];
}) {
  const [predId, setPredId] = useState(activities[0]?.id ?? "");
  const [succId, setSuccId] = useState(activities[1]?.id ?? activities[0]?.id ?? "");
  const [type, setType] = useState("FS");
  const [lag, setLag] = useState("0");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await saveDependency({
        projectId,
        predId,
        succId,
        type,
        lagDays: Number(lag),
      });
      if (!result.ok) {
        setError(result.error ?? "Gagal menambah dependensi.");
        return;
      }
      setMessage(result.message ?? "Dependensi ditambahkan.");
      setLag("0");
    });
  };

  const remove = (dependency: DependencyItem) => {
    if (!window.confirm(`Hapus relasi ${dependency.predName} → ${dependency.succName}?`)) return;
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await deleteDependency(dependency.id);
      if (!result.ok) setError(result.error ?? "Gagal menghapus dependensi.");
      else setMessage(result.message ?? "Dependensi dihapus.");
    });
  };

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">Dependency jaringan</h2>
          <p className="text-[11px] text-muted">
            FS / SS / FF / SF dengan lag. Sistem menolak relasi yang membentuk siklus.
          </p>
        </div>
        <span className="chip bg-slate-100 text-slate-600">{dependencies.length} relasi</span>
      </div>

      {canEdit ? (
        <form onSubmit={submit} className="mt-3 rounded-xl border border-line bg-slate-50/70 p-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="text-[10px] font-medium text-muted">
              Predecessor
              <select className={`${FIELD} mt-1`} value={predId} onChange={(event) => setPredId(event.target.value)}>
                {activities.map((activity) => (
                  <option key={activity.id} value={activity.id}>
                    {activity.code} · {activity.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-[10px] font-medium text-muted">
              Successor
              <select className={`${FIELD} mt-1`} value={succId} onChange={(event) => setSuccId(event.target.value)}>
                {activities.map((activity) => (
                  <option key={activity.id} value={activity.id}>
                    {activity.code} · {activity.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            <label className="text-[10px] font-medium text-muted">
              Tipe
              <select className={`${FIELD} mt-1`} value={type} onChange={(event) => setType(event.target.value)}>
                {DEPENDENCY_TYPES.map((option) => (
                  <option key={option} value={option}>
                    {option} — {dependencyTypeLabel(option)}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-[10px] font-medium text-muted">
              Lag (hari, boleh negatif)
              <input
                className={`${FIELD} mt-1`}
                value={lag}
                onChange={(event) => setLag(event.target.value)}
                type="number"
                min={-30}
                max={60}
              />
            </label>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={pending || activities.length < 2}
                className="w-full rounded-lg bg-brand px-3 py-1.5 text-[11px] font-semibold text-white disabled:opacity-60"
              >
                {pending ? "Memproses…" : "Tambah relasi"}
              </button>
            </div>
          </div>
        </form>
      ) : (
        <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
          Hanya PM pemilik proyek atau admin PMO yang boleh mengubah jaringan dependensi.
        </p>
      )}

      {error ? (
        <p className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-[11px] font-medium text-rose-700">{error}</p>
      ) : null}
      {message ? (
        <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-[11px] font-medium text-emerald-700">
          {message}
        </p>
      ) : null}

      <ul className="mt-3 space-y-1.5">
        {dependencies.map((dependency) => (
          <li
            key={dependency.id}
            className="flex flex-wrap items-center gap-2 rounded-lg border border-line px-2.5 py-1.5 text-[11px]"
          >
            <span className="font-mono text-[10px] text-slate-400">{dependency.predCode}</span>
            <span className="min-w-0 flex-1 truncate">{dependency.predName}</span>
            <span className="chip bg-brand-soft text-brand">{dependency.type}</span>
            {dependency.lagDays !== 0 ? (
              <span className="text-[10px] text-muted">
                lag {dependency.lagDays > 0 ? "+" : ""}
                {dependency.lagDays}h
              </span>
            ) : null}
            <span className="text-slate-300">→</span>
            <span className="font-mono text-[10px] text-slate-400">{dependency.succCode}</span>
            <span className="min-w-0 flex-1 truncate">{dependency.succName}</span>
            {canEdit ? (
              <button
                type="button"
                disabled={pending}
                onClick={() => remove(dependency)}
                className="rounded-md border border-line px-2 py-0.5 text-[10px] font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-50"
              >
                hapus
              </button>
            ) : null}
          </li>
        ))}
        {dependencies.length === 0 ? (
          <li className="text-[12px] text-muted">Belum ada relasi — aktivitas berjalan independen.</li>
        ) : null}
      </ul>
    </div>
  );
}
