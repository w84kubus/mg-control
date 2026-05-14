import { create } from "zustand";

interface VehicleModalState {
  vehicleId: string | null;
  isOpen: boolean;
  isAdding: boolean;
  open: (vehicleId: string) => void;
  openAdd: () => void;
  close: () => void;
}

export const useVehicleModalStore = create<VehicleModalState>()((set) => ({
  vehicleId: null,
  isOpen: false,
  isAdding: false,
  open: (vehicleId) => set({ vehicleId, isOpen: true, isAdding: false }),
  openAdd: () => set({ vehicleId: null, isOpen: true, isAdding: true }),
  close: () => set({ isOpen: false, vehicleId: null, isAdding: false }),
}));
