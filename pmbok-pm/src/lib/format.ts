const MONTHS_ID = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

export function formatCompactRupiah(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000_000) return `Rp${trim(value / 1_000_000_000_000)} T`;
  if (abs >= 1_000_000_000) return `Rp${trim(value / 1_000_000_000)} M`;
  if (abs >= 1_000_000) return `Rp${trim(value / 1_000_000)} jt`;
  if (abs >= 1_000) return `Rp${trim(value / 1_000)} rb`;
  return `Rp${Math.round(value)}`;
}

function trim(value: number): string {
  return value.toFixed(1).replace(".", ",").replace(/,0$/, "");
}

export function formatDateID(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return `${date.getUTCDate()} ${MONTHS_ID[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

export function formatDateShort(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return `${date.getUTCDate()} ${MONTHS_ID[date.getUTCMonth()]}`;
}

export function monthLabel(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return MONTHS_ID[date.getUTCMonth()];
}

export function formatPercent(value: number, digits = 0): string {
  return `${value.toFixed(digits).replace(".", ",")}%`;
}

export function formatIndex(value: number): string {
  return value.toFixed(2).replace(".", ",");
}

export function daysAgo(value: Date | string): number {
  const date = typeof value === "string" ? new Date(value) : value;
  return Math.round((Date.now() - date.getTime()) / 86_400_000);
}

export function roleLabel(role: string): string {
  switch (role) {
    case "ADMIN":
      return "PMO / Admin";
    case "PM":
      return "Project Manager";
    case "SPONSOR":
      return "Sponsor";
    case "MEMBER":
      return "Team Member";
    default:
      return "Stakeholder";
  }
}

export function meetingTypeLabel(type: string): string {
  switch (type) {
    case "kickoff":
      return "Kickoff";
    case "weekly_status":
      return "Weekly Status";
    case "gate_review":
      return "Gate Review";
    case "ccb":
      return "CCB";
    case "steering":
      return "Steering";
    case "closure":
      return "Closure";
    default:
      return "Ad-hoc";
  }
}

export function meetingStatusLabel(status: string): string {
  switch (status) {
    case "DRAFT":
      return "Draft";
    case "REVIEW":
      return "Menunggu tanda tangan";
    case "APPROVED":
      return "Disahkan";
    case "REJECTED":
      return "Ditolak";
    case "EXPIRED":
      return "Kedaluwarsa";
    case "SUPERSEDED":
      return "Digantikan";
    default:
      return status;
  }
}
