"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { assertCanPlan } from "@/lib/pmbok/planning-guard";
import { computeSchedule, normalizeDependencyType } from "@/lib/pmbok/schedule";

export type PlanActionResult = { ok: boolean; error?: string; message?: string };

function revalidateSchedule(projectId: string): void {
  revalidatePath(`/projects/${projectId}/schedule`);
  revalidatePath(`/projects/${projectId}`);
}

export type DependencyInput = {
  projectId: string;
  predId: string;
  succId: string;
  type: string;
  lagDays: number;
};

export async function saveDependency(input: DependencyInput): Promise<PlanActionResult> {
  const guard = await assertCanPlan(input.projectId);
  if (!guard.ok) return { ok: false, error: guard.error };

  if (input.predId === input.succId) {
    return { ok: false, error: "Aktivitas tidak boleh bergantung pada dirinya sendiri." };
  }
  const lag = Number(input.lagDays);
  if (!Number.isFinite(lag) || lag < -30 || lag > 60) {
    return { ok: false, error: "Lag harus angka antara -30 dan 60 hari." };
  }

  const activities = await prisma.activity.findMany({
    where: { projectId: input.projectId },
    select: { id: true, name: true, durationDays: true },
  });
  const pred = activities.find((activity) => activity.id === input.predId);
  const succ = activities.find((activity) => activity.id === input.succId);
  if (!pred || !succ) {
    return { ok: false, error: "Kedua aktivitas harus berasal dari proyek ini." };
  }

  const existing = await prisma.dependency.findMany({
    where: { pred: { projectId: input.projectId } },
    select: { predId: true, succId: true, type: true, lagDays: true },
  });
  if (existing.some((dependency) => dependency.predId === input.predId && dependency.succId === input.succId)) {
    return {
      ok: false,
      error: `Relasi ${pred.name} → ${succ.name} sudah ada. Hapus dulu bila ingin mengubahnya.`,
    };
  }

  const type = normalizeDependencyType(input.type);
  const candidate = [
    ...existing,
    { predId: input.predId, succId: input.succId, type, lagDays: Math.round(lag) },
  ];
  const network = computeSchedule(activities, candidate);
  if (network.cycles.length > 0) {
    return {
      ok: false,
      error: `Relasi ${pred.name} → ${succ.name} membentuk siklus. Jaringan dependensi harus tanpa loop.`,
    };
  }

  const created = await prisma.dependency.create({
    data: {
      predId: input.predId,
      succId: input.succId,
      type,
      lagDays: Math.round(lag),
    },
  });
  await prisma.auditLog.create({
    data: {
      projectId: input.projectId,
      actorId: guard.userId,
      action: "DEPENDENCY_CREATED",
      entity: "Dependency",
      entityId: created.id,
      detail: `${pred.name} → ${succ.name} (${type}${lag !== 0 ? ` ${lag > 0 ? "+" : ""}${lag}h` : ""})`,
    },
  });
  revalidateSchedule(input.projectId);
  return { ok: true, message: "Dependensi ditambahkan." };
}

export async function deleteDependency(id: string): Promise<PlanActionResult> {
  const dependency = await prisma.dependency.findUnique({
    where: { id },
    select: {
      id: true,
      type: true,
      lagDays: true,
      pred: { select: { name: true, projectId: true } },
      succ: { select: { name: true } },
    },
  });
  if (!dependency) return { ok: false, error: "Dependensi tidak ditemukan." };

  const projectId = dependency.pred.projectId;
  const guard = await assertCanPlan(projectId);
  if (!guard.ok) return { ok: false, error: guard.error };

  await prisma.dependency.delete({ where: { id } });
  await prisma.auditLog.create({
    data: {
      projectId,
      actorId: guard.userId,
      action: "DEPENDENCY_DELETED",
      entity: "Dependency",
      entityId: dependency.id,
      detail: `${dependency.pred.name} → ${dependency.succ.name} (${dependency.type}) dihapus`,
    },
  });
  revalidateSchedule(projectId);
  return { ok: true, message: "Dependensi dihapus." };
}
