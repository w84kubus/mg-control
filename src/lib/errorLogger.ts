import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "./firebase";
import type { ErrorSeverity } from "@/types";

export async function logError(
  error: Error | unknown,
  context?: { component?: string; severity?: ErrorSeverity }
): Promise<void> {
  const err = error instanceof Error ? error : new Error(String(error));

  try {
    const user = auth.currentUser;
    await addDoc(collection(db, "errorLogs"), {
      message: err.message,
      stack: err.stack ?? null,
      context: {
        url: typeof window !== "undefined" ? window.location.href : "",
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
        userId: user?.uid ?? null,
        userRole: null,
        timestamp: serverTimestamp(),
        component: context?.component ?? null,
      },
      severity: context?.severity ?? "medium",
      resolved: false,
      resolvedBy: null,
      resolvedAt: null,
    });
  } catch {
    // Silently fail – logging errors should never crash the app
  }
}
