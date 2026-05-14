import type { DamageStage } from "@/types";

const STAGE_ORDER: DamageStage[] = [
  "to_report",
  "reported",
  "accepted_pending",
  "resolved",
];

export function getNextStage(current: DamageStage): DamageStage | null {
  const idx = STAGE_ORDER.indexOf(current);
  if (idx === -1 || idx === STAGE_ORDER.length - 1) return null;
  return STAGE_ORDER[idx + 1];
}

export function canAdvanceStage(current: DamageStage): boolean {
  return getNextStage(current) !== null;
}

export function isResolved(stage: DamageStage): boolean {
  return stage === "resolved";
}

export function canClose(
  stage: DamageStage,
  physicallyRepaired: boolean,
  financiallySettled: boolean
): boolean {
  return stage === "accepted_pending" && physicallyRepaired && financiallySettled;
}

export function getStageLabelPL(stage: DamageStage): string {
  const labels: Record<DamageStage, string> = {
    to_report: "Do zgłoszenia",
    reported: "Zgłoszona",
    accepted_pending: "Do rozliczenia",
    resolved: "Rozliczona ✓",
  };
  return labels[stage];
}

export function getStageIndex(stage: DamageStage): number {
  return STAGE_ORDER.indexOf(stage);
}
