import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import type { NotificationType } from "@/types";

interface CreateNotificationParams {
  type: NotificationType;
  title: string;
  body: string;
  recipientUid: string;
  relatedVehicleId?: string | null;
  relatedVehicleVin?: string | null;
}

export async function createNotification(params: CreateNotificationParams): Promise<void> {
  try {
    await addDoc(collection(db, "notifications"), {
      type: params.type,
      title: params.title,
      body: params.body,
      recipientUid: params.recipientUid,
      relatedVehicleId: params.relatedVehicleId ?? null,
      relatedVehicleVin: params.relatedVehicleVin ?? null,
      isRead: false,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Failed to create notification:", error);
  }
}

export async function notifyOrderReady(params: {
  vehicleVin: string;
  vehicleModel: string;
  vehicleId: string;
  orderedByUid: string;
  logisticsUid: string;
}): Promise<void> {
  const body = `Auto ${params.vehicleVin} (${params.vehicleModel}) jest gotowe.`;

  await Promise.all([
    createNotification({
      type: "order_ready",
      title: "Zlecenie gotowe",
      body,
      recipientUid: params.orderedByUid,
      relatedVehicleId: params.vehicleId,
      relatedVehicleVin: params.vehicleVin,
    }),
    createNotification({
      type: "order_ready",
      title: "Zlecenie gotowe",
      body,
      recipientUid: params.logisticsUid,
      relatedVehicleId: params.vehicleId,
      relatedVehicleVin: params.vehicleVin,
    }),
  ]);
}

export async function notifyWashDone(params: {
  vehicleVin: string;
  vehicleModel: string;
  vehicleId: string;
  orderedByUid: string;
  logisticsUid: string;
}): Promise<void> {
  const body = `Auto ${params.vehicleVin} (${params.vehicleModel}) zostało umyte.`;

  await Promise.all([
    createNotification({
      type: "wash_done",
      title: "Mycie zakończone",
      body,
      recipientUid: params.orderedByUid,
      relatedVehicleId: params.vehicleId,
      relatedVehicleVin: params.vehicleVin,
    }),
    createNotification({
      type: "wash_done",
      title: "Mycie zakończone",
      body,
      recipientUid: params.logisticsUid,
      relatedVehicleId: params.vehicleId,
      relatedVehicleVin: params.vehicleVin,
    }),
  ]);
}

export async function notifyDamageReported(params: {
  vehicleVin: string;
  vehicleModel: string;
  vehicleId: string;
  logisticsUid: string;
}): Promise<void> {
  await createNotification({
    type: "damage_new",
    title: "Nowa szkoda transportowa",
    body: `Zgłoszono szkodę dla auta ${params.vehicleVin} (${params.vehicleModel}).`,
    recipientUid: params.logisticsUid,
    relatedVehicleId: params.vehicleId,
    relatedVehicleVin: params.vehicleVin,
  });
}
