"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import type { Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthStore } from "@/store/authStore";
import { useNotificationsStore } from "@/store/notificationsStore";
import {
  Bell,
  CheckCircle,
  Clock,
  Droplets,
  AlertTriangle,
  Truck,
  Car,
  Check,
  ArrowLeft,
} from "lucide-react";
import type { AppNotification } from "@/types";

type NotifType = AppNotification["type"];

function getTypeIcon(type: NotifType) {
  switch (type) {
    case "order_ready":
      return <CheckCircle size={18} style={{ color: "#22c55e" }} />;
    case "order_partial":
      return <Clock size={18} style={{ color: "#eab308" }} />;
    case "wash_done":
      return <Droplets size={18} style={{ color: "#3b82f6" }} />;
    case "damage_new":
      return <AlertTriangle size={18} style={{ color: "#ef4444" }} />;
    case "delivery_arriving":
      return <Truck size={18} style={{ color: "#f97316" }} />;
    case "vehicle_stale":
      return <Car size={18} style={{ color: "#64748b" }} />;
    default:
      return <Bell size={18} style={{ color: "var(--color-muted)" }} />;
  }
}

function isSameDay(ts: Timestamp): boolean {
  const d = ts.toDate();
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function formatNotifDate(ts: Timestamp): string {
  return ts.toDate().toLocaleString("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function NotificationsPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const { setNotifications, markAsRead } = useNotificationsStore();
  const [notifications, setLocalNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "notifications"),
      where("recipientUid", "==", user.uid),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as AppNotification));
        setLocalNotifications(data);
        setNotifications(data);
        setLoading(false);
      },
      () => {
        setLoading(false);
      }
    );
    return unsub;
  }, [user, setNotifications]);

  async function handleMarkAllRead() {
    const unread = notifications.filter((n) => !n.isRead);
    if (unread.length === 0) return;
    try {
      const batch = writeBatch(db);
      unread.forEach((n) => {
        batch.update(doc(db, "notifications", n.id), { isRead: true });
      });
      await batch.commit();
    } catch {
      // silently ignore — snapshot will update state anyway
    }
  }

  async function handleClickNotif(notif: AppNotification) {
    if (notif.isRead) return;
    markAsRead(notif.id);
    try {
      await updateDoc(doc(db, "notifications", notif.id), { isRead: true });
    } catch {
      // silently ignore
    }
  }

  const today = notifications.filter((n) => isSameDay(n.createdAt));
  const earlier = notifications.filter((n) => !isSameDay(n.createdAt));
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  function NotifCard({ notif }: { notif: AppNotification }) {
    return (
      <button
        onClick={() => handleClickNotif(notif)}
        className="w-full flex items-start gap-3 px-4 py-3 text-left transition-opacity hover:opacity-80"
        style={{
          background: notif.isRead ? "transparent" : "var(--bg-surface2)",
          borderBottom: "1px solid var(--bg-border)",
          cursor: notif.isRead ? "default" : "pointer",
        }}
      >
        <div className="mt-0.5 shrink-0">{getTypeIcon(notif.type)}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p
              className="text-sm font-semibold leading-snug"
              style={{ color: "var(--color-text)" }}
            >
              {notif.title}
            </p>
            {!notif.isRead && (
              <span
                className="shrink-0 w-2 h-2 rounded-full mt-1"
                style={{ background: "var(--color-accent)" }}
              />
            )}
          </div>
          <p className="text-xs mt-0.5" style={{ color: "var(--color-muted)" }}>
            {notif.body}
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--color-muted)", opacity: 0.7 }}>
            {notif.createdAt ? formatNotifDate(notif.createdAt) : ""}
          </p>
        </div>
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/dashboard")}
            className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg hover:opacity-70"
            style={{ color: "var(--color-muted)", background: "var(--bg-surface)", border: "1px solid var(--bg-border)" }}
            title="Powrót do mapy"
          >
            <ArrowLeft size={16} />
          </button>
          <Bell size={22} style={{ color: "var(--color-accent)" }} />
          <h1 className="text-xl font-bold" style={{ color: "var(--color-text)" }}>
            Powiadomienia
          </h1>
          {unreadCount > 0 && (
            <span
              className="px-2 py-0.5 rounded-full text-xs font-semibold"
              style={{ background: "var(--color-accent)", color: "#fff" }}
            >
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium hover:opacity-70 transition-opacity"
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--bg-border)",
              color: "var(--color-muted)",
            }}
          >
            <Check size={12} />
            Zaznacz wszystkie jako przeczytane
          </button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div
            className="w-6 h-6 border-2 rounded-full animate-spin"
            style={{ borderColor: "var(--color-accent)", borderTopColor: "transparent" }}
          />
        </div>
      ) : notifications.length === 0 ? (
        <div
          className="rounded-2xl flex flex-col items-center justify-center py-16 gap-3"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border)" }}
        >
          <Bell size={32} style={{ color: "var(--color-muted)" }} />
          <p className="text-sm" style={{ color: "var(--color-muted)" }}>
            Brak powiadomień
          </p>
        </div>
      ) : (
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border)" }}
        >
          {today.length > 0 && (
            <>
              <div
                className="px-4 py-2 text-xs font-semibold uppercase tracking-wide"
                style={{
                  color: "var(--color-muted)",
                  background: "var(--bg-surface2)",
                  borderBottom: "1px solid var(--bg-border)",
                }}
              >
                Dzisiaj
              </div>
              {today.map((n) => (
                <NotifCard key={n.id} notif={n} />
              ))}
            </>
          )}
          {earlier.length > 0 && (
            <>
              <div
                className="px-4 py-2 text-xs font-semibold uppercase tracking-wide"
                style={{
                  color: "var(--color-muted)",
                  background: "var(--bg-surface2)",
                  borderBottom: "1px solid var(--bg-border)",
                  borderTop: today.length > 0 ? "1px solid var(--bg-border)" : undefined,
                }}
              >
                Wcześniej
              </div>
              {earlier.map((n) => (
                <NotifCard key={n.id} notif={n} />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
