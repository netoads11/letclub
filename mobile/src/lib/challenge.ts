export function getCurrentDay(startDate: string | null): number {
  if (!startDate) return 1;
  // Handle both "2026-06-04" and "2026-06-04T00:00:00+00:00" formats
  const dateOnly = startDate.slice(0, 10);
  const start = new Date(dateOnly + "T00:00:00");
  if (isNaN(start.getTime())) return 1;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  start.setHours(0, 0, 0, 0);
  const diffMs = today.getTime() - start.getTime();
  const day = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(1, day);
}

export function getChallengePhase(day: number): "active" | "post" | "expired" {
  if (day <= 15) return "active";
  if (day <= 22) return "post";
  return "expired";
}

export function formatDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

export function formatShortDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}
