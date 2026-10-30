"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { activityDurationDays, deriveActivityStatus } from "@/lib/pmbok/activity";
import { startOfDay } from "@/lib/pmbok/evm";
import { assertCanPlan } from "@/lib/pmbok/planning-guard";

export type ActivityActionResult = { ok: boolean; error?: string; message?: string };

export type ActivityInput = {
  id?: string;
  projectId: string;
  wbsId: string;
  name: string;
  start: string;
  finish: string;
  budget: number;
  percentComplete: number;
};

function revalidateProject(projectId: string): void {
  revalidatePath(`/projects/${projectId}/scope`);
  revalidatePath(`/projects/${projectId}/schedule`);
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
  revalidatePath("/portfolio");
  revalidatePath("/governance");
}

function rupiah(value: number): string {
  return `Rp${Math.round(value).toLocaleString("id-ID")}`;
}

export async function saveActivity(input: ActivityInput): Promise<ActivityActionResult> {
  const guard = await assertCanPlan(input.projectId);
  if (!guard.ok) return { ok: false, error: guard.error };

  const name = input.name.trim();
  if (name.length < 3) return { ok: false, error: "Nama aktivitas minimal 3 karakter." };
  if (name.length > 140) return { ok: false, error: "Nama aktivitas maksimal 140 karakter." };

  const start = startOfDay(new Date(`${input.start}T00:00:00Z`));
  const finish = startOfDay(new Date(`${input.finish}T00:00:00Z`));
  if (Number.isNaN(start.getTime()) || Number.isNaN(finish.getTime())) {
    return { ok: false, error: "Tanggal mulai/selesai tidak valid." };
  }
  if (finish.getTime() < start.getTime()) {
    return { ok: false, error: "Tanggal selesai tidak boleh sebelum tanggal mulai." };
  }

  const budget = Number(input.budget);
  if (!Number.isFinite(budget) || budget < 0) {
    return { ok: false, error: "Anggaran aktivitas harus angka ≥ 0." };
  }
  const percent = Number(input.percentComplete);
  if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
    return { ok: false, error: "Progress harus berada di antara 0 dan 100." };
  }

  const wbs = await prisma.wbsElement.findUnique({
    where: { id: input.wbsId },
    select: {
      projectId: true,
      kind: true,
      _count: { select: { children: true } },
    },
  });
  if (!wbs || wbs.projectId !== input.projectId) {
    return { ok: false, error: "Work package tidak ditemukan pada proyek ini." };
  }
  if (wbs._count.children > 0) {
    return { ok: false, error: "Aktivitas hanya boleh ditempel pada work package daun." };
  }
  if (wbs.kind !== "WORK_PACKAGE") {
    return { ok: false, error: "Aktivitas hanya boleh ditempel pada work package." };
  }

  const durationDays = activityDurationDays(start, finish);
  const status = deriveActivityStatus(percent);
  const roundedBudget = Math.round(budget);
  const roundedPercent = Math.round(percent * 10) / 10;

  if (input.id) {
    const existing = await prisma.activity.findUnique({
      where: { id: input.id },
      select: { projectId: true, wbsId: true },
    });
    if (!existing || existing.projectId !== input.projectId) {
      return { ok: false, error: "Aktivitas tidak ditemukan pada proyek ini." };
    }
    if (existing.wbsId !== input.wbsId) {
      return {
        ok: false,
        error: "Aktivitas tidak boleh dipindah antar work package dari editor ini.",
      };
    }

    await prisma.activity.update({
      where: { id: input.id },
      data: {
        name,
        startBaseline: start,
        finishBaseline: finish,
        durationDays,
        budget: roundedBudget,
        percentComplete: roundedPercent,
        status,
      },
    });
    await prisma.auditLog.create({
      data: {
        projectId: input.projectId,
        actorId: guard.userId,
        action: "ACTIVITY_UPDATED",
        entity: "Activity",
        entityId: input.id,
        detail: `${name}: ${durationDays} hari · ${rupiah(roundedBudget)} · progress ${roundedPercent}%`,
      },
    });
  } else {
    const created = await prisma.activity.create({
      data: {
        projectId: input.projectId,
        wbsId: input.wbsId,
        name,
        startBaseline: start,
        finishBaseline: finish,
        durationDays,
        budget: roundedBudget,
        percentComplete: roundedPercent,
        status,
        effortHours: 0,
      },
    });
    await prisma.auditLog.create({
      data: {
        projectId: input.projectId,
        actorId: guard.userId,
        action: "ACTIVITY_CREATED",
        entity: "Activity",
        entityId: created.id,
        detail: `${name}: ${durationDays} hari · ${rupiah(roundedBudget)} ditambahkan ke WBS`,
      },
    });
  }

  const [project, allocation] = await Promise.all([
    prisma.project.findUnique({ where: { id: input.projectId }, select: { bac: true } }),
    prisma.activity.aggregate({
      where: { projectId: input.projectId },
      _sum: { budget: true },
    }),
  ]);
  const allocated = allocation._sum.budget ?? 0;

  revalidateProject(input.projectId);

  let message = `${name} tersimpan. Roll-up WBS, EVM, dan CPM sudah dihitung ulang.`;
  if (project && allocated > project.bac + 0.5) {
    message += ` Perhatian: total anggaran aktivitas ${rupiah(allocated)} melebihi BAC ${rupiah(
      project.bac
    )}.`;
  }
  return { ok: true, message };
}

export async function deleteActivity(id: string): Promise<ActivityActionResult> {
  const activity = await prisma.activity.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      projectId: true,
      _count: { select: { timesheets: true, preds: true, succs: true } },
    },
  });
  if (!activity) return { ok: false, error: "Aktivitas tidak ditemukan." };

  const guard = await assertCanPlan(activity.projectId);
  if (!guard.ok) return { ok: false, error: guard.error };

  if (activity._count.timesheets > 0) {
    return {
      ok: false,
      error:
        "Aktivitas ini sudah punya timesheet/actual cost, jadi tidak boleh dihapus (jejak biaya harus utuh). Ubah progress atau anggarannya bila perlu.",
    };
  }

  await prisma.$transaction([
    prisma.dependency.deleteMany({ where: { OR: [{ predId: id }, { succId: id }] } }),
    prisma.activity.delete({ where: { id } }),
  ]);
  await prisma.auditLog.create({
    data: {
      projectId: activity.projectId,
      actorId: guard.userId,
      action: "ACTIVITY_DELETED",
      entity: "Activity",
      entityId: activity.id,
      detail: `${activity.name} dihapus beserta ${activity._count.preds + activity._count.succs} relasi jadwalnya`,
    },
  });

  revalidateProject(activity.projectId);
  return { ok: true, message: `${activity.name} dihapus.` };
}
