import { prisma } from "../db";
import { getSession, type SessionUser } from "../session";

export type PlanTarget = {
  id: string;
  code: string;
  name: string;
  managerId: string;
  sponsorId: string;
};

/**
 * PMBOK governance: baseline lingkup & jadwal hanya boleh diubah PM pemilik
 * proyek atau admin PMO. Sponsor bersifat read-only (mengawasi, tidak mengedit).
 */
export function canEditPlan(
  session: Pick<SessionUser, "id" | "role"> | null,
  project: Pick<PlanTarget, "managerId">
): boolean {
  if (!session) return false;
  if (session.role === "ADMIN") return true;
  return session.role === "PM" && project.managerId === session.id;
}

export async function assertCanPlan(
  projectId: string
): Promise<{ ok: true; userId: string; project: PlanTarget } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Sesi berakhir, silakan login ulang." };

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, code: true, name: true, managerId: true, sponsorId: true },
  });
  if (!project) return { ok: false, error: "Proyek tidak ditemukan." };

  if (!canEditPlan(session, project)) {
    return {
      ok: false,
      error:
        "Hanya PM pemilik proyek atau admin PMO yang boleh mengubah struktur lingkup dan jadwal.",
    };
  }
  return { ok: true, userId: session.id, project };
}
