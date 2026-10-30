"use client";

import { useState, useTransition } from "react";
import { ProgressBar } from "@/components/charts";
import { formatCompactRupiah, formatDateShort, formatPercent } from "@/lib/format";
import type { EditorWbsNode } from "@/lib/pmbok/planning-data";
import {
  deleteActivity,
  saveActivity,
} from "@/app/(app)/projects/[id]/scope/activity-actions";

type ActivityItem = EditorWbsNode["activities"][number];

type Draft = {
  id?: string;
  name: string;
  start: string;
  finish: string;
  budget: string;
  percent: string;
};

const FIELD =
  "w-full rounded-lg border border-line bg-white px-2.5 py-1.5 text-[11px] text-ink outline-none focus:border-brand/60";

function emptyDraft(): Draft {
  const today = new Date();
  const start = today.toISOString().slice(0, 10);
  const finish = new Date(today.getTime() + 5 * 86_400_000).toISOString().slice(0, 10);
  return { name: "", start, finish, budget: "0", percent: "0" };
}

function draftFrom(activity: ActivityItem): Draft {
  return {
    id: activity.id,
    name: activity.name,
    start: activity.startBaseline.slice(0, 10),
    finish: activity.finishBaseline.slice(0, 10),
    budget: String(activity.budget),
    percent: String(Math.round(activity.percentComplete * 10) / 10),
  };
}

function durationHint(draft: Draft): number {
  const start = new Date(`${draft.start}T00:00:00Z`).getTime();
  const finish = new Date(`${draft.finish}T00:00:00Z`).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(finish)) return 0;
  return Math.max(0, Math.round((finish - start) / 86_400_000));
}

function ActivityForm({
  projectId,
  wbsId,
  initial,
  onClose,
  onError,
  onMessage,
}: {
  projectId: string;
  wbsId: string;
  initial: Draft;
  onClose: () => void;
  onError: (message: string) => void;
  onMessage: (message: string) => void;
}) {
  const [draft, setDraft] = useState<Draft>(initial);
  const [pending, startTransition] = useTransition();
  const duration = durationHint(draft);

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    startTransition(async () => {
      const result = await saveActivity({
        id: draft.id,
        projectId,
        wbsId,
        name: draft.name,
        start: draft.start,
        finish: draft.finish,
        budget: Number(draft.budget),
        percentComplete: Number(draft.percent),
      });
      if (!result.ok) {
        onError(result.error ?? "Gagal menyimpan aktivitas.");
        return;
      }
      onMessage(result.message ?? "Aktivitas tersimpan.");
      onClose();
    });
  };

  return (
    <form onSubmit={submit} className="mt-2 rounded-lg border border-brand/20 bg-brand-soft/40 p-2.5">
      <p className="text-[10px] font-semibold text-slate-700">
        {draft.id ? "Ubah aktivitas & progress" : "Aktivitas baru"}
      </p>

      <label className="mt-1.5 block text-[10px] font-medium text-muted">
        Nama aktivitas
        <input
          className={`${FIELD} mt-1`}
          value={draft.name}
          onChange={(event) => setDraft({ ...draft, name: event.target.value })}
          placeholder="mis. Migrasi data pelanggan"
        />
      </label>

      <div className="mt-1.5 grid gap-1.5 sm:grid-cols-2">
        <label className="text-[10px] font-medium text-muted">
          Mulai
          <input
            type="date"
            className={`${FIELD} mt-1`}
            value={draft.start}
            onChange={(event) => setDraft({ ...draft, start: event.target.value })}
          />
        </label>
        <label className="text-[10px] font-medium text-muted">
          Selesai
          <input
            type="date"
            className={`${FIELD} mt-1`}
            value={draft.finish}
            onChange={(event) => setDraft({ ...draft, finish: event.target.value })}
          />
        </label>
      </div>

      <div className="mt-1.5 grid gap-1.5 sm:grid-cols-2">
        <label className="text-[10px] font-medium text-muted">
          Anggaran (Rp)
          <input
            type="number"
            min={0}
            step={1000}
            className={`${FIELD} mt-1`}
            value={draft.budget}
            onChange={(event) => setDraft({ ...draft, budget: event.target.value })}
          />
        </label>
        <label className="text-[10px] font-medium text-muted">
          Progress (%)
          <input
            type="number"
            min={0}
            max={100}
            step={1}
            className={`${FIELD} mt-1`}
            value={draft.percent}
            onChange={(event) => setDraft({ ...draft, percent: event.target.value })}
          />
        </label>
      </div>

      <p className="mt-1.5 text-[10px] text-muted">
        Durasi CPM: <b>{duration} hari</b> (dari tanggal). Status mengikuti progress: 0% TODO, 1–99%
        ONGOING, 100% DONE.
      </p>

      <div className="mt-2 flex items-center gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-brand px-3 py-1.5 text-[11px] font-semibold text-white disabled:opacity-60"
        >
          {pending ? "Menyimpan…" : "Simpan aktivitas"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-line bg-white px-3 py-1.5 text-[11px] font-medium text-slate-600"
        >
          Batal
        </button>
      </div>
    </form>
  );
}

export function ActivityPanel({
  projectId,
  wbsId,
  activities,
  canEdit,
}: {
  projectId: string;
  wbsId: string;
  activities: ActivityItem[];
  canEdit: boolean;
}) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const totalBudget = activities.reduce((sum, activity) => sum + activity.budget, 0);

  const remove = (activity: ActivityItem) => {
    setError(null);
    setMessage(null);
    if (activity.timesheetCount > 0) {
      setError(
        "Aktivitas ini punya timesheet/actual cost sehingga tidak bisa dihapus. Ubah progress atau anggarannya."
      );
      return;
    }
    if (!window.confirm(`Hapus aktivitas ${activity.name}? Relasi jadwalnya ikut dihapus.`)) return;
    startTransition(async () => {
      const result = await deleteActivity(activity.id);
      if (!result.ok) setError(result.error ?? "Gagal menghapus aktivitas.");
      else setMessage(result.message ?? "Aktivitas dihapus.");
    });
  };

  return (
    <div className="rounded-xl border border-line bg-white p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold">Aktivitas work package</p>
          <p className="text-[10px] text-muted">
            {activities.length} aktivitas · anggaran {formatCompactRupiah(totalBudget)}
          </p>
        </div>
        {canEdit ? (
          <button
            type="button"
            onClick={() => {
              setError(null);
              setMessage(null);
              setDraft(emptyDraft());
            }}
            className="rounded-lg border border-brand/30 bg-brand-soft px-2.5 py-1 text-[10px] font-semibold text-brand"
          >
            + Aktivitas
          </button>
        ) : null}
      </div>

      {error ? (
        <p className="mt-2 rounded-lg bg-rose-50 px-2.5 py-1.5 text-[10px] font-medium text-rose-700">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="mt-2 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[10px] font-medium text-emerald-700">
          {message}
        </p>
      ) : null}

      <ul className="mt-2 space-y-1.5">
        {activities.map((activity) => (
          <li key={activity.id} className="rounded-lg border border-line px-2.5 py-2">
            <div className="flex flex-wrap items-center gap-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-medium">{activity.name}</p>
                <p className="text-[10px] text-muted">
                  {formatDateShort(activity.startBaseline)} – {formatDateShort(activity.finishBaseline)} ·{" "}
                  {activity.durationDays} hari · {formatCompactRupiah(activity.budget)}
                </p>
              </div>
              <span
                className={`chip ${
                  activity.status === "DONE"
                    ? "bg-emerald-50 text-emerald-700"
                    : activity.status === "ONGOING"
                      ? "bg-brand-soft text-brand"
                      : "bg-slate-100 text-slate-500"
                }`}
              >
                {activity.status.toLowerCase()}
              </span>
              <span className="w-10 text-right text-[10px] font-semibold">
                {formatPercent(activity.percentComplete, 0)}
              </span>
              {canEdit ? (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setMessage(null);
                      setDraft(draftFrom(activity));
                    }}
                    className="rounded-md border border-line px-2 py-0.5 text-[10px] font-medium text-slate-600 hover:bg-slate-50"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => remove(activity)}
                    className="rounded-md border border-line px-2 py-0.5 text-[10px] font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                  >
                    Hapus
                  </button>
                </div>
              ) : null}
            </div>

            <ProgressBar
              value={activity.percentComplete}
              tone={activity.status === "DONE" ? "bg-emerald-500" : "bg-brand"}
              className="mt-1.5"
            />

            {draft?.id === activity.id ? (
              <ActivityForm
                projectId={projectId}
                wbsId={wbsId}
                initial={draft}
                onClose={() => setDraft(null)}
                onError={setError}
                onMessage={setMessage}
              />
            ) : null}
          </li>
        ))}
        {activities.length === 0 ? (
          <li className="rounded-lg border border-dashed border-line px-2.5 py-3 text-center text-[10px] text-muted">
            Belum ada aktivitas. Work package tanpa aktivitas tidak menghasilkan earned value.
          </li>
        ) : null}
      </ul>

      {draft && !draft.id ? (
        <ActivityForm
          projectId={projectId}
          wbsId={wbsId}
          initial={draft}
          onClose={() => setDraft(null)}
          onError={setError}
          onMessage={setMessage}
        />
      ) : null}
    </div>
  );
}
