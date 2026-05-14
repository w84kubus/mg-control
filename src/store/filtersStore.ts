import { create } from "zustand";
import type { VehicleStatus } from "@/types";

export type AreaFilter = "all" | "plac" | "salon" | "serwis" | "blacharnia";

interface FiltersState {
  search: string;
  status: VehicleStatus | "all";
  area: AreaFilter;
  zoneId: string | "all";
  view: "map" | "list";
  setSearch: (s: string) => void;
  setStatus: (s: VehicleStatus | "all") => void;
  setArea: (a: AreaFilter) => void;
  setZoneId: (z: string | "all") => void;
  setView: (v: "map" | "list") => void;
  reset: () => void;
}

const defaults = {
  search: "",
  status: "all" as const,
  area: "all" as const,
  zoneId: "all" as const,
  view: "map" as const,
};

export const useFiltersStore = create<FiltersState>()((set) => ({
  ...defaults,
  setSearch: (search) => set({ search }),
  setStatus: (status) => set({ status }),
  setArea: (area) => set({ area }),
  setZoneId: (zoneId) => set({ zoneId }),
  setView: (view) => set({ view }),
  reset: () => set(defaults),
}));
