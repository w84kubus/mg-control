// Valid VIN characters – I, O, Q are excluded per ISO 3779
const VALID_VIN_CHARS = /^[A-HJ-NPR-Z0-9]{17}$/;

export interface VinValidationResult {
  valid: boolean;
  error?: string;
}

export function validateVin(vin: string): VinValidationResult {
  const trimmed = vin.trim().toUpperCase();

  if (trimmed.length !== 17) {
    return { valid: false, error: "VIN musi mieć dokładnie 17 znaków." };
  }

  if (!VALID_VIN_CHARS.test(trimmed)) {
    return {
      valid: false,
      error: "VIN zawiera niedozwolone znaki (I, O, Q są wykluczone).",
    };
  }

  return { valid: true };
}

export function normalizeVin(vin: string): string {
  return vin.trim().toUpperCase();
}

export function getVinShort(vin: string): string {
  return vin.slice(-6).toUpperCase();
}
