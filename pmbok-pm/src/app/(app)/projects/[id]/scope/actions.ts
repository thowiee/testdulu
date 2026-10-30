"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { assertCanPlan } from "@/lib/pmbok/planning-guard";
import {
  MAX_WBS_DEPTH,
  isValidWbsCode,
  nextChildCode,
  wbsDepthById,
} from "@/lib/pmbok/wbs";

export type PlanActionResult = { ok: boolean; error?: string; message?: string };

export type WbsInput = {
  id?: string;
  projectId: string;
  parentId: string | null;
  code?: string;
  name: string;
  kind: string;
  weight: number;
  description?: string;
  acceptanceCriteria?: string;
  responsible?: string;
};

function clean(value: string | undefined): string | null {
  const trimmed = (value ?? "").trim();
  return trimmed.length > 0 ? trimmed : null;
}

function revalidateScope(projectId: string): void {
  revalidatePath(`/projects/${projectId}/scope`);
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
}

export async function saveWbs(input: WbsInput): Promise<PlanActionResult> {
  const guard = await assertCanPlan(input.projectId);
  if (!guard.ok) return { ok: false, error: guard.error };

  const name = input.name.trim();
  if (name.length < 3) return { ok: false, error: "Nama elemen WBS minimal 3 karakter." };
  if (name.length > 140) return { ok: false, error: "Nama elemen WBS maksimal 140 karakter." };
  if (input.kind !== "DELIVERABLE" && input.kind !== "WORK_PACKAGE") {
    return { ok: false, error: "Jenis elemen harus deliverable atau work package." };
  }
  const weight = Number(input.weight);
  if (!Number.isFinite(weight) || weight < 0 || weight > 100) {
    return { ok: false, error: "Bobot harus berupa angka 0–100." };
  }

  const elements = await prisma.wbsElement.findMany({
    where: { projectId: input.projectId },
    select: { id: true, parentId: true, code: true, kind: true },
  });

  let parentId: string | null = null;
  if (input.parentId) {
    const parent = elements.find((element) => element.id === input.parentId);
    if (!parent) return { ok: false, error: "Induk WBS tidak ditemukan pada proyek ini." };
    parentId = parent.id;
    if (wbsDepthById(elements, parentId) + 1 > MAX_WBS_DEPTH) {
      return { ok: false, error: `Kedalaman WBS maksimal ${MAX_WBS_DEPTH} level.` };
    }
  }

  const code =
    (input.code ?? "").trim() ||
    nextChildCode(
      parentId ? elements.find((element) => element.id === parentId)?.code ?? null : null,
      elements.map((element) => element.code)
    );

  if (!isValidWbsCode(code)) {
    return { ok: false, error: "Kode WBS hanya boleh angka dan titik, contoh 1.2.3." };
  }
  const duplicate = elements.find(
    (element) => element.code === code && element.id !== input.id
  );
  if (duplicate) return { ok: false, error: `Kode ${code} sudah dipakai elemen lain.` };

  if (input.id) {
    const existing = elements.find((element) => element.id === input.id);
    if (!existing) return { ok: false, error: "Elemen WBS tidak ditemukan." };

    await prisma.wbsElement.update({
      where: { id: input.id },
      data: {
        code,
        name,
        kind: input.kind,
        weight: Math.round(weight * 10) / 10,
        description: clean(input.description),
        acceptanceCriteria: clean(input.acceptanceCriteria),
        responsible: clean(input.responsible),
      },
    });
    await prisma.auditLog.create({
      data: {
        projectId: input.projectId,
        actorId: guard.userId,
        action: "WBS_UPDATED",
        entity: "WbsElement",
        entityId: input.id,
        detail: `${code} ${name} diperbarui (bobot ${weight}%)`,
      },
    });
    revalidateScope(input.projectId);
    return { ok: true, message: `${code} diperbarui.` };
  }

  const created = await prisma.wbsElement.create({
    data: {
      projectId: input.projectId,
      parentId,
      code,
      name,
      kind: input.kind,
      weight: Math.round(weight * 10) / 10,
      description: clean(input.description),
      acceptanceCriteria: clean(input.acceptanceCriteria),
      responsible: clean(input.responsible),
    },
  });
  await prisma.auditLog.create({
    data: {
      projectId: input.projectId,
      actorId: guard.userId,
      action: "WBS_CREATED",
      entity: "WbsElement",
      entityId: created.id,
      detail: `${code} ${name} ditambahkan ke WBS`,
    },
  });
  revalidateScope(input.projectId);
  return { ok: true, message: `${code} ditambahkan.` };
}

export async function deleteWbs(id: string): Promise<PlanActionResult> {
  const element = await prisma.wbsElement.findUnique({
    where: { id },
    select: {
      id: true,
      code: true,
      name: true,
      projectId: true,
      _count: { select: { children: true, activities: true } },
    },
  });
  if (!element) return { ok: false, error: "Elemen WBS tidak ditemukan." };

  const guard = await assertCanPlan(element.projectId);
  if (!guard.ok) return { ok: false, error: guard.error };

  if (element._count.children > 0) {
    return {
      ok: false,
      error: "Elemen ini masih punya sub-elemen. Hapus atau pindahkan anaknya lebih dulu.",
    };
  }
  if (element._count.activities > 0) {
    return {
      ok: false,
      error: "Elemen ini masih menaungi aktivitas. Aktivitas harus dipindahkan lebih dulu.",
    };
  }

  await prisma.wbsElement.delete({ where: { id } });
  await prisma.auditLog.create({
    data: {
      projectId: element.projectId,
      actorId: guard.userId,
      action: "WBS_DELETED",
      entity: "WbsElement",
      entityId: element.id,
      detail: `${element.code} ${element.name} dihapus dari WBS`,
    },
  });
  revalidateScope(element.projectId);
  return { ok: true, message: `${element.code} dihapus.` };
}
