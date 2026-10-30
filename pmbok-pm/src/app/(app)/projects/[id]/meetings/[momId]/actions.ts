"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { getSession, verifyPassword } from "@/lib/session";

export type SignState = { error?: string; ok?: boolean };

/**
 * Tanda tangan MOM (Tier 1: re-autentikasi + hash + audit log).
 * Dampak proyek baru terbuka ketika seluruh tanda tangan lengkap.
 */
export async function signMomAction(_prev: SignState, formData: FormData): Promise<SignState> {
  const session = await getSession();
  if (!session) return { error: "Sesi berakhir, silakan login ulang." };

  const meetingId = String(formData.get("meetingId") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!meetingId) return { error: "Rapat tidak dikenali." };
  if (!password) return { error: "Password wajib diisi untuk mengesahkan notulen." };

  const user = await prisma.user.findUnique({ where: { id: session.id } });
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return { error: "Password salah — tanda tangan dibatalkan." };
  }

  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId },
    include: {
      versions: {
        orderBy: { version: "desc" },
        include: { requests: { include: { signature: true } } },
      },
    },
  });
  if (!meeting) return { error: "MOM tidak ditemukan." };

  const version = meeting.versions[0];
  if (!version) return { error: "Versi MOM tidak ditemukan." };
  if (version.status === "APPROVED") return { error: "MOM ini sudah disahkan." };

  const request = version.requests.find(
    (item) => item.signerId === session.id && item.signature === null
  );
  if (!request) {
    return { error: "Tidak ada permintaan tanda tangan yang menunggu untuk akun ini." };
  }

  const blockedByOrder = version.requests.some(
    (item) =>
      item.signature === null &&
      item.orderNo !== null &&
      request.orderNo !== null &&
      item.orderNo < request.orderNo
  );
  if (blockedByOrder) {
    return { error: "Menunggu tanda tangan pada urutan sebelumnya (alur berurutan)." };
  }

  const headerList = await headers();
  await prisma.$transaction([
    prisma.signature.create({
      data: {
        signatureRequestId: request.id,
        signerId: session.id,
        method: "click_reath",
        contentHash: version.contentHash,
        ip: headerList.get("x-forwarded-for") ?? "127.0.0.1",
        userAgent: headerList.get("user-agent") ?? "unknown",
      },
    }),
    prisma.signatureRequest.update({
      where: { id: request.id },
      data: { status: "SIGNED" },
    }),
  ]);

  const remaining = await prisma.signatureRequest.count({
    where: { momVersionId: version.id, signature: { is: null } },
  });

  if (remaining === 0) {
    await prisma.$transaction([
      prisma.momVersion.update({
        where: { id: version.id },
        data: { status: "APPROVED", lockedAt: new Date() },
      }),
      prisma.meeting.update({ where: { id: meeting.id }, data: { status: "APPROVED" } }),
      prisma.auditLog.create({
        data: {
          projectId: meeting.projectId,
          actorId: session.id,
          action: "MOM_APPROVED",
          entity: "Meeting",
          entityId: meeting.id,
          detail: `${meeting.momNo} disahkan lengkap; dampak proyek aktif`,
        },
      }),
    ]);
  } else {
    await prisma.auditLog.create({
      data: {
        projectId: meeting.projectId,
        actorId: session.id,
        action: "MOM_SIGNED",
        entity: "Meeting",
        entityId: meeting.id,
        detail: `${meeting.momNo}: tanda tangan ${user.name} tersimpan`,
      },
    });
  }

  if (meeting.projectId) {
    revalidatePath(`/projects/${meeting.projectId}/meetings/${meeting.id}`);
    revalidatePath(`/projects/${meeting.projectId}/meetings`);
    revalidatePath(`/projects/${meeting.projectId}`);
  }
  revalidatePath("/governance");
  revalidatePath("/portfolio");
  revalidatePath("/projects");

  return { ok: true };
}
