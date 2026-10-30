"use client";

import { useMemo, useState, useTransition } from "react";
import { ActivityPanel } from "@/components/ActivityPanel";
import { ProgressBar } from "@/components/charts";
import { formatCompactRupiah } from "@/lib/format";
import type { EditorWbsNode } from "@/lib/pmbok/planning-data";
import { deleteWbs, saveWbs } from "@/app/(app)/projects/[id]/scope/actions";

const FIELD =
  "w-full rounded-lg border border-line bg-white px-2.5 py-1.5 text-[12px] text-ink outline-none focus:border-brand/60";

type EditorState =
  | { mode: "create"; parentId: string | null }
  | { mode: "edit"; nodeId: string }
  | null;

function WbsForm({
  projectId,
  node,
  parentId,
  parentLabel,
  onClose,
  onError,
}: {
  projectId: string;
  node?: EditorWbsNode;
  parentId: string | null;
  parentLabel?: string;
  onClose: () => void;
  onError: (message: string) => void;
}) {
  const [name, setName] = useState(node?.name ?? "");
  const [code, setCode] = useState(node?.code ?? "");
  const [kind, setKind] = useState(node?.kind ?? "WORK_PACKAGE");
  const [weight, setWeight] = useState(String(node?.weight ?? (parentId ? 10 : 100)));
  const [description, setDescription] = useState(node?.description ?? "");
  const [acceptance, setAcceptance] = useState(node?.acceptanceCriteria ?? "");
  const [responsible, setResponsible] = useState(node?.responsible ?? "");
  const [pending, startTransition] = useTransition();

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    startTransition(async () => {
      const result = await saveWbs({
        id: node?.id,
        projectId,
        parentId,
        code: code.trim() || undefined,
        name,
        kind,
        weight: Number(weight),
        description,
        acceptanceCriteria: acceptance,
        responsible,
      });
      if (!result.ok) {
        onError(result.error ?? "Gagal menyimpan elemen WBS.");
        return;
      }
      onClose();
    });
  };

  return (
    <form onSubmit={submit} className="rounded-xl border border-line bg-slate-50/80 p-3">
      <p className="text-[11px] font-semibold text-slate-700">
        {node ? `Edit ${node.code}` : parentLabel ? `Tambah sub-elemen di bawah ${parentLabel}` : "Tambah deliverable level atas"}
      </p>

      <div className="mt-2.5 grid gap-2 sm:grid-cols-3">
        <label className="text-[10px] font-medium text-muted">
          Kode WBS
          <input
            className={`${FIELD} mt-1`}
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="otomatis, mis. 1.7"
          />
        </label>
        <label className="text-[10px] font-medium text-muted">
          Jenis
          <select className={`${FIELD} mt-1`} value={kind} onChange={(event) => setKind(event.target.value)}>
            <option value="WORK_PACKAGE">Work package</option>
            <option value="DELIVERABLE">Deliverable</option>
          </select>
        </label>
        <label className="text-[10px] font-medium text-muted">
          Bobot (%)
          <input
            className={`${FIELD} mt-1`}
            value={weight}
            onChange={(event) => setWeight(event.target.value)}
            inputMode="decimal"
            type="number"
            min={0}
            max={100}
            step="0.1"
          />
          <span className="mt-0.5 block text-[9px] font-normal text-slate-400">
            Relatif terhadap saudara sekandung
          </span>
        </label>
      </div>

      <label className="mt-2 block text-[10px] font-medium text-muted">
        Nama elemen
        <input
          className={`${FIELD} mt-1`}
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="mis. Migrasi data pelanggan"
        />
      </label>

      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <label className="text-[10px] font-medium text-muted">
          Deskripsi (WBS dictionary)
          <textarea
            className={`${FIELD} mt-1 min-h-[62px]`}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Apa yang termasuk dan tidak termasuk dalam elemen ini"
          />
        </label>
        <label className="text-[10px] font-medium text-muted">
          Kriteria penerimaan
          <textarea
            className={`${FIELD} mt-1 min-h-[62px]`}
            value={acceptance}
            onChange={(event) => setAcceptance(event.target.value)}
            placeholder="Bukti bahwa elemen ini selesai dan diterima"
          />
        </label>
      </div>

      <label className="mt-2 block text-[10px] font-medium text-muted">
        Penanggung jawab
        <input
          className={`${FIELD} mt-1`}
          value={responsible}
          onChange={(event) => setResponsible(event.target.value)}
          placeholder="mis. Tech Lead"
        />
      </label>

      <div className="mt-3 flex items-center gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-brand px-3 py-1.5 text-[11px] font-semibold text-white disabled:opacity-60"
        >
          {pending ? "Menyimpan…" : "Simpan"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-line bg-white px-3 py-1.5 text-[11px] font-medium text-slate-600"
        >
          Batal
        </button>
        <span className="text-[10px] text-muted">
          Bobot & dictionary langsung memengaruhi roll-up dan kelengkapan WBS.
        </span>
      </div>
    </form>
  );
}

export function WbsEditor({
  projectId,
  nodes,
  canEdit,
}: {
  projectId: string;
  nodes: EditorWbsNode[];
  canEdit: boolean;
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [editor, setEditor] = useState<EditorState>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const byId = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);

  const visible = useMemo(() => {
    const byParent = new Map<string | null, EditorWbsNode[]>();
    for (const node of nodes) {
      const parentKey = node.parentId && byId.has(node.parentId) ? node.parentId : null;
      const group = byParent.get(parentKey) ?? [];
      group.push(node);
      byParent.set(parentKey, group);
    }
    const output: EditorWbsNode[] = [];
    const walk = (parentId: string | null) => {
      for (const node of byParent.get(parentId) ?? []) {
        output.push(node);
        if (!collapsed.has(node.id)) walk(node.id);
      }
    };
    walk(null);
    return output;
  }, [nodes, collapsed, byId]);

  const toggle = (id: string) => {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const remove = (node: EditorWbsNode) => {
    if (!window.confirm(`Hapus ${node.code} ${node.name} dari WBS?`)) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteWbs(node.id);
      if (!result.ok) setError(result.error ?? "Gagal menghapus elemen WBS.");
      else setMessage(result.message ?? "Elemen dihapus.");
    });
  };

  return (
    <div className="card">
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-line px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold">WBS Editor</h2>
          <p className="text-[11px] text-muted">
            Pecah lingkup menjadi deliverable dan work package. Roll-up progress memakai bobot tiap
            elemen, bukan rata-rata sederhana.
          </p>
        </div>
        {canEdit ? (
          <button
            type="button"
            onClick={() => {
              setError(null);
              setEditor({ mode: "create", parentId: null });
            }}
            className="rounded-lg bg-brand px-3 py-1.5 text-[11px] font-semibold text-white"
          >
            + Deliverable
          </button>
        ) : (
          <span className="chip bg-slate-100 text-slate-500">read-only · bukan PM proyek</span>
        )}
      </div>

      {error ? (
        <p className="mx-5 mt-3 rounded-lg bg-rose-50 px-3 py-2 text-[11px] font-medium text-rose-700">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="mx-5 mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-[11px] font-medium text-emerald-700">
          {message}
        </p>
      ) : null}

      <div className="px-3 py-2">
        {visible.map((node) => {
          const isEditing = editor?.mode === "edit" && editor.nodeId === node.id;
          const isAddingChild = editor?.mode === "create" && editor.parentId === node.id;
          return (
            <div key={node.id} className="border-b border-line/60 last:border-b-0">
              <div
                className="flex flex-wrap items-center gap-2 py-2 pr-2"
                style={{ paddingLeft: 8 + node.depth * 14 }}
              >
                {node.childCount > 0 ? (
                  <button
                    type="button"
                    onClick={() => toggle(node.id)}
                    aria-label={collapsed.has(node.id) ? "Buka sub-elemen" : "Tutup sub-elemen"}
                    className="grid h-5 w-5 shrink-0 place-items-center rounded-md text-[10px] text-slate-500 hover:bg-slate-100"
                  >
                    {collapsed.has(node.id) ? "▸" : "▾"}
                  </button>
                ) : (
                  <span className="h-5 w-5 shrink-0" />
                )}

                <span className="chip shrink-0 bg-slate-100 font-mono text-slate-600">{node.code}</span>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-medium" title={node.name}>
                    {node.name}
                  </p>
                  <p className="text-[10px] text-muted">
                    {node.kind === "DELIVERABLE" ? "Deliverable" : "Work package"} · bobot{" "}
                    {node.share}% · {node.activityCount} aktivitas · {formatCompactRupiah(node.budget)}
                  </p>
                </div>

                {!node.dictionaryComplete ? (
                  <span className="chip shrink-0 bg-amber-50 text-amber-700">dictionary belum lengkap</span>
                ) : null}

                <div className="w-24 shrink-0">
                  <ProgressBar
                    value={node.progress}
                    tone={node.progress >= 100 ? "bg-emerald-500" : "bg-brand"}
                  />
                  <p className="mt-1 text-right text-[10px] font-semibold">{node.progress}%</p>
                </div>

                {canEdit ? (
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setError(null);
                        setMessage(null);
                        setEditor({ mode: "edit", nodeId: node.id });
                      }}
                      className="rounded-md border border-line px-2 py-1 text-[10px] font-medium text-slate-600 hover:bg-slate-50"
                    >
                      Edit
                    </button>
                    {node.depth < 4 ? (
                      <button
                        type="button"
                        onClick={() => {
                          setError(null);
                          setMessage(null);
                          setEditor({ mode: "create", parentId: node.id });
                        }}
                        className="rounded-md border border-line px-2 py-1 text-[10px] font-medium text-brand hover:bg-brand-soft"
                      >
                        + anak
                      </button>
                    ) : null}
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => remove(node)}
                      className="rounded-md border border-line px-2 py-1 text-[10px] font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                    >
                      Hapus
                    </button>
                  </div>
                ) : null}
              </div>

              {isEditing ? (
                <div className="space-y-2 pb-3 pr-3 pl-6">
                  <WbsForm
                    projectId={projectId}
                    node={node}
                    parentId={node.parentId}
                    parentLabel={node.code}
                    onClose={() => setEditor(null)}
                    onError={setError}
                  />
                  {node.childCount === 0 && node.kind === "WORK_PACKAGE" ? (
                    <ActivityPanel
                      projectId={projectId}
                      wbsId={node.id}
                      activities={node.activities}
                      canEdit={canEdit}
                    />
                  ) : null}
                </div>
              ) : null}
              {isAddingChild ? (
                <div className="pb-3 pr-3 pl-6">
                  <WbsForm
                    projectId={projectId}
                    parentId={node.id}
                    parentLabel={node.code}
                    onClose={() => setEditor(null)}
                    onError={setError}
                  />
                </div>
              ) : null}
            </div>
          );
        })}

        {nodes.length === 0 ? (
          <p className="px-3 py-6 text-center text-[12px] text-muted">
            WBS belum disusun. Mulai dengan satu deliverable utama.
          </p>
        ) : null}
      </div>

      {editor?.mode === "create" && editor.parentId === null && canEdit ? (
        <div className="px-5 pb-4">
          <WbsForm
            projectId={projectId}
            parentId={null}
            onClose={() => setEditor(null)}
            onError={setError}
          />
        </div>
      ) : null}
    </div>
  );
}
