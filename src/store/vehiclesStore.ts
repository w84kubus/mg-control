import { create } from "zustand";
import type { Vehicle } from "@/types";

interface VehiclesState {
  vehicles: Vehicle[];
  isLoading: boolean;
  searchQuery: string;
  setVehicles: (vehicles: Vehicle[]) => void;
  setLoading: (loading: boolean) => void;
  setSearchQuery: (query: string) => void;
  getVehicleById: (id: string) => Vehicle | undefined;
  getVehicleByVin: (vin: string) => Vehicle | undefined;
  getVehiclesByZone: (zoneId: string) => Vehicle[];
}

export const useVehiclesStore = create<VehiclesState>()((set, get) => ({
  vehicles: [],
  isLoading: true,
  searchQuery: "",
  setVehicles: (vehicles) => set({ vehicles }),
  setLoading: (isLoading) => set({ isLoading }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  getVehicleById: (id) => get().vehicles.find((v) => v.id === id),
  getVehicleByVin: (vin) =>
    get().vehicles.find((v) => v.vin.toLowerCase() === vin.toLowerCase()),
  getVehiclesByZone: (zoneId) =>
    get().vehicles.filter((v) => v.zoneId === zoneId),
}));
