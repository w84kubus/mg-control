import {
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { auth, db } from "./firebase";
import type { AppUser, UserRole } from "@/types";

// ─── Error translation ────────────────────────────────────────────────────────

export function getAuthErrorMessage(code: string): string {
  const messages: Record<string, string> = {
    "auth/user-not-found": "Nie znaleziono konta z tym adresem e-mail.",
    "auth/wrong-password": "Nieprawidłowe hasło. Spróbuj ponownie.",
    "auth/invalid-credential": "Nieprawidłowy e-mail lub hasło.",
    "auth/invalid-email": "Podany adres e-mail jest nieprawidłowy.",
    "auth/email-already-in-use": "Konto z tym adresem e-mail już istnieje.",
    "auth/weak-password": "Hasło jest za słabe. Użyj co najmniej 6 znaków.",
    "auth/popup-closed-by-user": "Logowanie przez Google zostało anulowane.",
    "auth/network-request-failed":
      "Błąd sieci. Sprawdź połączenie z internetem.",
    "auth/too-many-requests":
      "Zbyt wiele prób logowania. Spróbuj ponownie za chwilę.",
    "auth/user-disabled":
      "To konto zostało dezaktywowane. Skontaktuj się z administratorem.",
    "auth/requires-recent-login":
      "Ta operacja wymaga ponownego zalogowania.",
    "auth/cancelled-popup-request":
      "Logowanie przez Google zostało anulowane.",
    "auth/operation-not-allowed":
      "Ta metoda logowania jest niedostępna. Skontaktuj się z administratorem.",
  };
  return messages[code] ?? "Wystąpił błąd. Spróbuj ponownie.";
}

// ─── Whitelist check ──────────────────────────────────────────────────────────

async function checkEmailWhitelist(
  email: string
): Promise<{ allowed: boolean; role: UserRole }> {
  const ref = doc(db, "allowedEmails", email.toLowerCase());
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    return { allowed: false, role: "salesperson" };
  }
  return { allowed: true, role: snap.data().role as UserRole };
}

// ─── User document helpers ────────────────────────────────────────────────────

async function ensureUserDocument(firebaseUser: User, role: UserRole = "salesperson") {
  const ref = doc(db, "users", firebaseUser.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: firebaseUser.displayName ?? firebaseUser.email?.split("@")[0],
      role,
      isActive: true,
      fcmToken: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
}

export async function getUserDocument(uid: string): Promise<AppUser | null> {
  try {
    const snap = await getDoc(doc(db, "users", uid));
    if (!snap.exists()) return null;
    return snap.data() as AppUser;
  } catch {
    return null;
  }
}

// ─── Google OAuth ─────────────────────────────────────────────────────────────

export async function signInWithGoogle(): Promise<{
  user: User;
  isNew: boolean;
}> {
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  const { user } = result;

  // Check whitelist
  const { allowed, role } = await checkEmailWhitelist(user.email ?? "");
  if (!allowed) {
    await firebaseSignOut(auth);
    throw new Error(
      "Twój adres e-mail nie został zaakceptowany przez administratora. Skontaktuj się z Logistykiem."
    );
  }

  // Check if user doc exists
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  const isNew = !snap.exists();

  await ensureUserDocument(user, role);
  return { user, isNew };
}

// ─── Email/Password ───────────────────────────────────────────────────────────

export async function signInWithEmail(
  email: string,
  password: string
): Promise<User> {
  const result = await signInWithEmailAndPassword(auth, email, password);
  const { user } = result;

  // Check email verification
  if (!user.emailVerified) {
    await firebaseSignOut(auth);
    throw Object.assign(
      new Error(
        "Najpierw potwierdź swój adres e-mail. Sprawdź skrzynkę odbiorczą."
      ),
      { code: "auth/email-not-verified" }
    );
  }

  // Check if account is active
  const userData = await getUserDocument(user.uid);
  if (userData && !userData.isActive) {
    await firebaseSignOut(auth);
    throw Object.assign(
      new Error(
        "Twoje konto zostało dezaktywowane. Skontaktuj się z administratorem."
      ),
      { code: "auth/user-disabled-custom" }
    );
  }

  return user;
}

export async function registerWithEmail(
  email: string,
  password: string
): Promise<User> {
  // Check whitelist first
  const { allowed, role } = await checkEmailWhitelist(email);
  if (!allowed) {
    throw new Error(
      "Twój adres e-mail nie został zaakceptowany przez administratora. Skontaktuj się z Logistykiem."
    );
  }

  const result = await createUserWithEmailAndPassword(auth, email, password);
  const { user } = result;

  await sendEmailVerification(user);
  await ensureUserDocument(user, role);
  await firebaseSignOut(auth);

  return user;
}

export async function resendVerificationEmail(): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error("Brak zalogowanego użytkownika.");
  await sendEmailVerification(user);
}

// ─── Password reset ───────────────────────────────────────────────────────────

export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email);
}

// ─── Sign out ─────────────────────────────────────────────────────────────────

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}
