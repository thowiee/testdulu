"use client";

import { useActionState } from "react";
import { signMomAction, type SignState } from "@/app/(app)/projects/[id]/meetings/[momId]/actions";

const initialState: SignState = {};

export function SignForm({ meetingId }: { meetingId: string }) {
  const [state, formAction, pending] = useActionState(signMomAction, initialState);

  return (
    <form action={formAction} className="mt-3 space-y-2.5 rounded-xl border border-brand/30 bg-brand-soft/60 p-3">
      <input type="hidden" name="meetingId" value={meetingId} />
      <div>
        <label htmlFor="sign-password" className="text-[11px] font-semibold text-slate-700">
          Konfirmasi password untuk mengesahkan notulen
        </label>
        <p className="mt-0.5 text-[10px] text-muted">
          Tindakan ini tercatat di audit log: identitas, waktu server, dan hash isi dokumen.
        </p>
      </div>
      <input
        id="sign-password"
        name="password"
        type="password"
        autoComplete="current-password"
        placeholder="Password akun Anda"
        className="w-full rounded-lg border border-line bg-white px-2.5 py-2 text-[12px] outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
      />

      {state.error ? (
        <p className="rounded-lg bg-rose-50 px-2.5 py-1.5 text-[11px] font-medium text-rose-700">{state.error}</p>
      ) : null}
      {state.ok ? (
        <p className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[11px] font-medium text-emerald-700">
          Tanda tangan tersimpan. Halaman diperbarui otomatis.
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-brand px-3 py-2 text-[12px] font-semibold text-white transition hover:bg-brand/90 disabled:opacity-60"
      >
        {pending ? "Menyimpan tanda tangan…" : "Tanda tangani MOM"}
      </button>
    </form>
  );
}
