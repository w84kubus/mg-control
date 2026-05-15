"use client";

import { useEffect } from "react";
import { getToken } from "firebase/messaging";
import { doc, updateDoc } from "firebase/firestore";
import { messaging, db } from "@/lib/firebase";
import { useAuthStore } from "@/store/authStore";

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY ?? "";

export function useFcmToken() {
  const { user } = useAuthStore();

  useEffect(() => {
    if (!user || !messaging || !VAPID_KEY) return;

    async function register() {
      try {
        // Send Firebase config to SW so it can init Firebase
        const sw = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
        await navigator.serviceWorker.ready;

        sw.active?.postMessage({
          type: "FIREBASE_CONFIG",
          config: {
            apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
            authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
            storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
            messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
            appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
          },
        });

        const permission = await Notification.requestPermission();
        if (permission !== "granted") return;

        const token = await getToken(messaging!, {
          vapidKey: VAPID_KEY,
          serviceWorkerRegistration: sw,
        });

        if (token && user) {
          await updateDoc(doc(db, "users", user.uid), {
            fcmToken: token,
            lastSeen: new Date(),
          });
        }
      } catch {
        // Silently ignore — FCM is optional
      }
    }

    register();
  }, [user]);
}
