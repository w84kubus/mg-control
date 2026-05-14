import { create } from "zustand";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Vehicle } from "@/types";

interface VehiclesState {
  vehicles: Vehicle[];
  loading: boolean;
  error: string | null;
  subscribe: () => () => void;
  getVehicleById: (id: string) => Vehicle | undefined;
  getVehicleByVin: (vin: string) => Vehicle | undefined;
  getVehiclesInZone: (zoneId: string) => Vehicle[];
  getUnzoned: () => Vehicle[];
}

export const useVehiclesStore = create<VehiclesState>()((set, get) => ({
  vehicles: [],
  loading: true,
  error: null,

  subscribe: () => {
    const q = query(collection(db, "vehicles"), orderBy("arrivalDate", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        set({
          vehicles: snap.docs.map((d) => ({ id: d.id, ...d.data() } as Vehicle)),
          loading: false,
          error: null,
        });
      },
      (err) => set({ error: err.message, loading: false })
    );
    return unsub;
  },

  getVehicleById: (id) => get().vehicles.find((v) => v.id === id),
  getVehicleByVin: (vin) =>
    get().vehicles.find((v) => v.vin.toLowerCase() === vin.toLowerCase()),
  getVehiclesInZone: (zoneId) =>
    get().vehicles.filter((v) => v.zoneId === zoneId),
  getUnzoned: () => get().vehicles.filter((v) => !v.zoneId),
}));
