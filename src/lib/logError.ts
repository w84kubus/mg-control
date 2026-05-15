import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export type ErrorSeverity = "low" | "medium" | "high" | "critical";

export async function logError(opts: {
  message: string;
  context?: string;
  severity?: ErrorSeverity;
  uid?: string;
  displayName?: string;
  stack?: string;
}) {
  try {
    await addDoc(collection(db, "appErrors"), {
      message: opts.message,
      context: opts.context ?? null,
      severity: opts.severity ?? "medium",
      uid: opts.uid ?? null,
      displayName: opts.displayName ?? null,
      stack: opts.stack ?? null,
      resolved: false,
      createdAt: serverTimestamp(),
    });
  } catch {
    // Never throw from error logger
  }
}
