"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "@/app/actions";

type DemoUser = { name: string; email: string; role: string; jobTitle: string | null };

const initialState: LoginState = {};

export function LoginForm({ users }: { users: DemoUser[] }) {
  const [state, formAction, pending] = useActionState(loginAction, initialState);
  const defaultEmail = users[0]?.email ?? "";

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="email" className="text-xs font-semibold uppercase tracking-wide text-muted">
          Masuk sebagai
        </label>
        <select
          id="email"
          name="email"
          defaultValue={defaultEmail}
          className="w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
        >
          {users.map((user) => (
            <option key={user.email} value={user.email}>
              {user.name} — {user.role} ({user.jobTitle ?? "-"})
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="password" className="text-xs font-semibold uppercase tracking-wide text-muted">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          defaultValue="demo1234"
          className="w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
        />
        <p className="text-[11px] text-muted">Password demo: demo1234 (semua akun)</p>
      </div>

      {state.error ? (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">{state.error}</p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand/90 disabled:opacity-60"
      >
        {pending ? "Memproses…" : "Masuk"}
      </button>
    </form>
  );
}
