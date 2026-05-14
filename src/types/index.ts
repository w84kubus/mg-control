import type { Timestamp } from "firebase/firestore";

// ─── Auth & Users ────────────────────────────────────────────────────────────

export type UserRole = "logistics" | "salesperson" | "mechanic" | "detailer";

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  isActive: boolean;
  fcmToken: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface AllowedEmail {
  email: string;
  role: UserRole;
  addedBy: string;
  addedAt: Timestamp;
  usedAt: Timestamp | null;
  notes: string;
}

// ─── Zones ───────────────────────────────────────────────────────────────────

export type ZoneType = "strict" | "flexible" | "blocked";
export type ZoneArea = "plac" | "salon" | "serwis" | "blacharnia";

export interface Zone {
  id: string;
  name: string;
  type: ZoneType;
  area: ZoneArea;
  capacity: number | null;
  currentCount: number;
  svgElementId: string | null;
}

// ─── Vehicles ────────────────────────────────────────────────────────────────

export type VehicleStatus = "new" | "ordered" | "damaged" | "ready" | "ready_wash" | "delivered";
export type VehicleType = "stock" | "demo" | "fleet";

export interface Vehicle {
  id: string;
  vin: string;
  vinShort: string;
  brand: string;
  model: string;
  color: string;
  licensePlate: string | null;
  vehicleType: VehicleType;
  status: VehicleStatus;
  zoneId: string | null;
  slotIndex: number | null;
  assignedSalespersonUid: string | null;
  assignedSalespersonName: string | null;
  deliveryId: string | null;
  arrivalDate: Timestamp | null;
  plannedDeliveryDate: Timestamp | null;
  activeDamageReportIds: string[];
  activeServiceOrderIds: string[];
  hasDocument: boolean;
  documentCount: number;
  notes: string;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  updatedBy: string;
}

// ─── Service Orders ──────────────────────────────────────────────────────────

export type ServiceOrderType = "pdi" | "wash" | "ceramic" | "accessory" | "other";
export type ServiceOrderStatus = "ordered" | "in_progress" | "partial" | "ready";

export interface ServiceOrder {
  id: string;
  vehicleId: string;
  vehicleVin: string;
  vehicleModel: string;
  type: ServiceOrderType;
  status: ServiceOrderStatus;
  description: string;
  orderedBy: string;
  orderedByName: string;
  assignedMechanicUid: string | null;
  assignedMechanicName: string | null;
  plannedDeliveryDate: Timestamp | null;
  completionDate: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── Wash Queue ───────────────────────────────────────────────────────────────

export interface WashQueueItem {
  id: string;
  vehicleId: string;
  vehicleVin: string;
  vehicleVinShort: string;
  vehicleModel: string;
  vehicleColor: string;
  queueOrder: number;
  orderedBy: string;
  orderedByName: string;
  plannedDeliveryDate: Timestamp | null;
  plannedDeliveryNote: string;
  status: "waiting" | "in_progress" | "done";
  completedAt: Timestamp | null;
  createdAt: Timestamp;
}

// ─── Deliveries ──────────────────────────────────────────────────────────────

export type DeliveryStatus = "in_transit" | "received";

export interface Delivery {
  id: string;
  plannedArrivalDate: Timestamp;
  actualArrivalDate: Timestamp | null;
  vehicleCount: number;
  driverName: string;
  driverPhone: string;
  notes: string;
  status: DeliveryStatus;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── Damage Reports ──────────────────────────────────────────────────────────

export type DamageStage =
  | "to_report"
  | "reported"
  | "accepted_pending"
  | "resolved";

export interface DamageStageHistory {
  stage: DamageStage;
  changedAt: Timestamp;
  changedBy: string;
  changedByName: string;
  notes: string;
}

export interface DamageReport {
  id: string;
  vehicleId: string;
  vehicleVin: string;
  vehicleModel: string;
  stage: DamageStage;
  stageHistory: DamageStageHistory[];
  damageLocation: string;
  description: string;
  photoUrls: string[];
  documentUrls: string[];
  physicallyRepaired: boolean;
  financiallySettled: boolean;
  closedAt: Timestamp | null;
  reportedBy: string;
  reportedByName: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── Documents ───────────────────────────────────────────────────────────────

export type DocumentType =
  | "list_przewozowy"
  | "protokol_odbioru"
  | "faktura"
  | "inne";

export interface VehicleDocument {
  id: string;
  vehicleId: string | null;
  vehicleVin: string | null;
  deliveryId: string | null;
  type: DocumentType;
  displayName: string;
  fileName: string;
  fileUrl: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  uploadedBy: string;
  uploadedByName: string;
  uploadedAt: Timestamp;
  notes: string;
}

// ─── Vehicle Logs ─────────────────────────────────────────────────────────────

export type VehicleLogType =
  | "location_change"
  | "status_change"
  | "order_created"
  | "order_completed"
  | "damage_reported"
  | "damage_stage_change"
  | "document_uploaded"
  | "delivered"
  | "other";

export interface VehicleLog {
  id: string;
  vehicleId: string;
  type: VehicleLogType;
  action: string;
  details: string;
  performedBy: string;
  performedByName: string;
  performedAt: Timestamp;
  metadata: Record<string, unknown> | null;
}

// ─── Archive ──────────────────────────────────────────────────────────────────

export type DeliveryRecipientType = "individual" | "fleet" | "branch" | "demo";

export interface ArchivedVehicle {
  id: string;
  vehicle: Vehicle;
  serviceOrders: ServiceOrder[];
  damageReports: DamageReport[];
  documents: VehicleDocument[];
  logs: VehicleLog[];
  daysOnLot: number;
  totalServiceOrders: number;
  totalDamageReports: number;
  totalDocuments: number;
  deliveredAt: Timestamp;
  deliveredBy: string;
  deliveredByName: string;
  recipientType: DeliveryRecipientType;
  customerName: string | null;
  archivedAt: Timestamp;
  archivedBy: string;
}

// ─── Notifications ────────────────────────────────────────────────────────────

export type NotificationType =
  | "order_ready"
  | "order_partial"
  | "wash_done"
  | "damage_new"
  | "delivery_arriving"
  | "vehicle_stale";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  recipientUid: string;
  relatedVehicleId: string | null;
  relatedVehicleVin: string | null;
  isRead: boolean;
  createdAt: Timestamp;
}

// ─── Error Logs ───────────────────────────────────────────────────────────────

export type ErrorSeverity = "low" | "medium" | "high" | "critical";

export interface ErrorLog {
  id: string;
  message: string;
  stack: string | null;
  context: {
    url: string;
    userAgent: string;
    userId: string | null;
    userRole: string | null;
    timestamp: Timestamp;
    component: string | null;
  };
  severity: ErrorSeverity;
  resolved: boolean;
  resolvedBy: string | null;
  resolvedAt: Timestamp | null;
}

// ─── Mileage (Demo/Fleet) ─────────────────────────────────────────────────────

export interface MileageEntry {
  id: string;
  vehicleId: string;
  mileage: number;
  recordedAt: Timestamp;
  recordedBy: string;
  recordedByName: string;
  notes: string;
}

// ─── UI helpers ───────────────────────────────────────────────────────────────

export type ThemeMode = "light" | "dark" | "system";

export type ViewMode = "map" | "list";

export interface DropValidationResult {
  allowed: boolean;
  message?: string;
}
