import type { Zone, DropValidationResult, UserRole } from "@/types";

const ADVISOR_FORBIDDEN_ZONES = ["salon", "wydawka", "myjnia_salon", "garaz"] as const;

export function validateDrop(
  zone: Zone,
  userRole: UserRole
): DropValidationResult {
  if (zone.type === "blocked") {
    return {
      allowed: false,
      message: "Ta strefa nie jest przeznaczona do parkowania aut.",
    };
  }

  if (
    userRole === "advisor" &&
    ADVISOR_FORBIDDEN_ZONES.includes(zone.id as (typeof ADVISOR_FORBIDDEN_ZONES)[number])
  ) {
    return {
      allowed: false,
      message: "Nie masz uprawnień do przemieszczania aut do tej strefy.",
    };
  }

  if (zone.type === "strict" && zone.currentCount >= (zone.capacity ?? 0)) {
    return {
      allowed: false,
      message: "Strefa jest pełna – brak wolnych miejsc.",
    };
  }

  return { allowed: true };
}

// ─── RBAC helpers ─────────────────────────────────────────────────────────────

export function canUserMoveVehicle(role: UserRole): boolean {
  return role === "logistics" || role === "advisor";
}

export function canChangeQueueOrder(role: UserRole): boolean {
  return role === "logistics";
}

export function canCreateServiceOrder(role: UserRole): boolean {
  return role === "logistics";
}

export function canUpdateServiceOrderStatus(role: UserRole): boolean {
  return role === "logistics";
}

export function canCreateDamageReport(role: UserRole): boolean {
  return role === "logistics" || role === "advisor";
}

export function canEditWashQueue(role: UserRole): boolean {
  return role === "logistics";
}

export function canManageDamageReport(role: UserRole): boolean {
  return role === "logistics";
}

export function canManageDelivery(role: UserRole): boolean {
  return role === "logistics";
}

export function canManageUsers(role: UserRole): boolean {
  return role === "logistics";
}
