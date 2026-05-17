"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, doc, updateDoc, deleteDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthStore } from "@/store/authStore";
import { toast } from "react-toastify";
import { UserCheck, UserX, Trash2, Plus, Shield } from "lucide-react";
import type { AppUser, AllowedEmail, UserRole } from "@/types";
import { useRouter } from "next/navigation";

const ROLE_LABELS: Record<UserRole, string> = {
  logistics: "Logistyk",
  salesperson: "Handlowiec",
  advisor: "Doradca Serwisu",
  detailer: "Pracownik Myjni",
};

export default function UsersPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [whitelist, setWhitelist] = useState<AllowedEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"users" | "whitelist">("users");

  // Whitelist form
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<UserRole>("salesperson");
  const [newNotes, setNewNotes] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (user?.role !== "logistics") {
      router.replace("/dashboard");
      return;
    }
    loadData();
  }, [user, router]);

  async function loadData() {
    setLoading(true);
    try {
      const [usersSnap, wlSnap] = await Promise.all([
        getDocs(collection(db, "users")),
        getDocs(collection(db, "allowedEmails")),
      ]);
      setUsers(usersSnap.docs.map((d) => ({ uid: d.id, ...d.data() } as AppUser)));
      setWhitelist(wlSnap.docs.map((d) => ({ email: d.id, ...d.data() } as AllowedEmail)));
    } catch {
      toast.error("Nie udało się załadować danych.");
    } finally {
      setLoading(false);
    }
  }

  async function changeRole(uid: string, role: UserRole) {
    try {
      await updateDoc(doc(db, "users", uid), { role, updatedAt: serverTimestamp() });
      setUsers((u) => u.map((x) => x.uid === uid ? { ...x, role } : x));
      toast.success("Rola zaktualizowana.");
    } catch {
      toast.error("Nie udało się zmienić roli.");
    }
  }

  async function toggleActive(u: AppUser) {
    try {
      await updateDoc(doc(db, "users", u.uid), { isActive: !u.isActive, updatedAt: serverTimestamp() });
      setUsers((arr) => arr.map((x) => x.uid === u.uid ? { ...x, isActive: !u.isActive } : x));
      toast.success(u.isActive ? "Konto dezaktywowane." : "Konto aktywowane.");
    } catch {
      toast.error("Nie udało się zmienić statusu konta.");
    }
  }

  async function deleteUser(uid: string) {
    if (!confirm("Usunąć konto z Firestore? Konto Firebase Auth pozostanie.")) return;
    try {
      await deleteDoc(doc(db, "users", uid));
      setUsers((u) => u.filter((x) => x.uid !== uid));
      toast.success("Konto usunięte z Firestore.");
    } catch {
      toast.error("Nie udało się usunąć konta.");
    }
  }

  async function addToWhitelist(e: React.FormEvent) {
    e.preventDefault();
    if (!newEmail.trim()) return;
    setAdding(true);
    try {
      const email = newEmail.trim().toLowerCase();
      await setDoc(doc(db, "allowedEmails", email), {
        email,
        role: newRole,
        addedBy: user!.uid,
        addedAt: serverTimestamp(),
        usedAt: null,
        notes: newNotes.trim(),
      });
      setWhitelist((w) => [...w, { email, role: newRole, addedBy: user!.uid, addedAt: null as never, usedAt: null, notes: newNotes.trim() }]);
      setNewEmail("");
      setNewNotes("");
      toast.success(`${email} dodany do whitelist.`);
    } catch {
      toast.error("Nie udało się dodać e-maila.");
    } finally {
      setAdding(false);
    }
  }

  async function removeFromWhitelist(email: string) {
    if (!confirm(`Usunąć ${email} z whitelist?`)) return;
    try {
      await deleteDoc(doc(db, "allowedEmails", email));
      setWhitelist((w) => w.filter((x) => x.email !== email));
      toast.success("E-mail usunięty z whitelist.");
    } catch {
      toast.error("Nie udało się usunąć e-maila.");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
             style={{ borderColor: "var(--color-accent)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Shield size={22} style={{ color: "var(--color-accent)" }} />
        <h1 className="text-xl font-bold" style={{ color: "var(--color-text)" }}>
          Zarządzanie użytkownikami
        </h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl w-fit"
           style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border)" }}>
        {(["users", "whitelist"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
                  className="px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
                  style={{
                    background: tab === t ? "var(--color-accent)" : "transparent",
                    color: tab === t ? "#fff" : "var(--color-muted)",
                  }}>
            {t === "users" ? `Użytkownicy (${users.length})` : `Whitelist (${whitelist.length})`}
          </button>
        ))}
      </div>

      {tab === "users" && (
        <div className="rounded-2xl overflow-hidden"
             style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border)" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--bg-border)", color: "var(--color-muted)" }}>
                  {["Użytkownik", "Rola", "Status", "Akcje"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.uid} style={{ borderBottom: "1px solid var(--bg-border)" }}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-sm" style={{ color: "var(--color-text)" }}>
                        {u.displayName}
                      </p>
                      <p className="text-xs" style={{ color: "var(--color-muted)" }}>{u.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      {u.uid === user?.uid ? (
                        <span className="text-xs font-semibold" style={{ color: "var(--color-accent)" }}>
                          {ROLE_LABELS[u.role]}
                        </span>
                      ) : (
                        <select
                          value={u.role}
                          onChange={(e) => changeRole(u.uid, e.target.value as UserRole)}
                          className="text-xs px-2 py-1 rounded-lg outline-none"
                          style={{ background: "var(--bg-primary)", border: "1px solid var(--bg-border2)", color: "var(--color-text)" }}
                        >
                          {(Object.entries(ROLE_LABELS) as [UserRole, string][]).map(([val, label]) => (
                            <option key={val} value={val}>{label}</option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{
                              background: u.isActive ? "rgba(34,197,94,.15)" : "rgba(239,68,68,.15)",
                              color: u.isActive ? "var(--color-success)" : "var(--color-danger)",
                            }}>
                        {u.isActive ? "Aktywne" : "Dezaktywowane"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {u.uid !== user?.uid && (
                        <div className="flex items-center gap-2">
                          <button onClick={() => toggleActive(u)}
                                  title={u.isActive ? "Dezaktywuj" : "Aktywuj"}
                                  className="p-1.5 rounded-lg hover:opacity-70"
                                  style={{ color: u.isActive ? "var(--color-warning)" : "var(--color-success)" }}>
                            {u.isActive ? <UserX size={14} /> : <UserCheck size={14} />}
                          </button>
                          <button onClick={() => deleteUser(u.uid)}
                                  title="Usuń z Firestore"
                                  className="p-1.5 rounded-lg hover:opacity-70"
                                  style={{ color: "var(--color-danger)" }}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "whitelist" && (
        <div className="flex flex-col gap-4">
          {/* Add form */}
          <form onSubmit={addToWhitelist}
                className="rounded-2xl p-4 flex flex-col sm:flex-row gap-3"
                style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border)" }}>
            <input
              type="email" placeholder="adres@email.com" value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)} required
              className="flex-1 px-3 py-2 rounded-xl text-sm outline-none"
              style={{ background: "var(--bg-primary)", border: "1px solid var(--bg-border2)", color: "var(--color-text)" }}
            />
            <select value={newRole} onChange={(e) => setNewRole(e.target.value as UserRole)}
                    className="px-3 py-2 rounded-xl text-sm outline-none"
                    style={{ background: "var(--bg-primary)", border: "1px solid var(--bg-border2)", color: "var(--color-text)" }}>
              {(Object.entries(ROLE_LABELS) as [UserRole, string][]).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
            <input
              type="text" placeholder="Notatka (opcja)" value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              className="flex-1 px-3 py-2 rounded-xl text-sm outline-none"
              style={{ background: "var(--bg-primary)", border: "1px solid var(--bg-border2)", color: "var(--color-text)" }}
            />
            <button type="submit" disabled={adding}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50"
                    style={{ background: "var(--color-accent)", color: "#fff" }}>
              <Plus size={14} /> Dodaj
            </button>
          </form>

          {/* Whitelist table */}
          <div className="rounded-2xl overflow-hidden"
               style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border)" }}>
            {whitelist.length === 0 ? (
              <p className="px-6 py-8 text-sm text-center" style={{ color: "var(--color-muted)" }}>
                Whitelist jest pusta. Dodaj pierwsze e-maile powyżej.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--bg-border)", color: "var(--color-muted)" }}>
                      {["E-mail", "Rola", "Notatka", "Użyto", ""].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {whitelist.map((w) => (
                      <tr key={w.email} style={{ borderBottom: "1px solid var(--bg-border)" }}>
                        <td className="px-4 py-3 text-sm" style={{ color: "var(--color-text)" }}>{w.email}</td>
                        <td className="px-4 py-3 text-xs" style={{ color: "var(--color-muted)" }}>{ROLE_LABELS[w.role]}</td>
                        <td className="px-4 py-3 text-xs" style={{ color: "var(--color-muted)" }}>{w.notes || "—"}</td>
                        <td className="px-4 py-3 text-xs" style={{ color: w.usedAt ? "var(--color-success)" : "var(--color-muted2)" }}>
                          {w.usedAt ? "✓ Tak" : "Nie"}
                        </td>
                        <td className="px-4 py-3">
                          <button onClick={() => removeFromWhitelist(w.email)}
                                  className="p-1.5 rounded-lg hover:opacity-70"
                                  style={{ color: "var(--color-danger)" }}>
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
