importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

// Config injected at build time — must match NEXT_PUBLIC_FIREBASE_* vars
self.__WB_MANIFEST; // workbox compat shim (ignored if not used)

// Firebase config is read from a cookie set by the app on first load
self.addEventListener("message", (event) => {
  if (event.data?.type === "FIREBASE_CONFIG") {
    firebase.initializeApp(event.data.config);
    const messaging = firebase.messaging();

    messaging.onBackgroundMessage((payload) => {
      const { title = "MG Control", body = "" } = payload.notification ?? {};
      self.registration.showNotification(title, {
        body,
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        data: payload.data,
      });
    });
  }
});
