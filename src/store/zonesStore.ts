import { create } from "zustand";
import type { Zone } from "@/types";

// Zone definitions – authoritative source for map rendering
export const ZONE_DEFINITIONS: Omit<Zone, "currentCount">[] = [
  // PLAC GŁÓWNY
  { id: "strefa_ladownice", name: "Strefa Ładowarek EV", type: "strict", area: "plac", capacity: 4, svgElementId: null },
  { id: "strefa_1", name: "Strefa 1", type: "strict", area: "plac", capacity: 9, svgElementId: null },
  { id: "strefa_2", name: "Strefa 2", type: "flexible", area: "plac", capacity: null, svgElementId: null },
  { id: "strefa_3", name: "Strefa 3", type: "flexible", area: "plac", capacity: null, svgElementId: null },
  { id: "strefa_4", name: "Strefa 4", type: "flexible", area: "plac", capacity: null, svgElementId: null },
  { id: "strefa_5", name: "Strefa 5", type: "flexible", area: "plac", capacity: null, svgElementId: null },
  { id: "strefa_6", name: "Strefa 6", type: "flexible", area: "plac", capacity: null, svgElementId: null },
  { id: "strefa_7", name: "Strefa 7", type: "strict", area: "plac", capacity: 6, svgElementId: null },
  { id: "garaz", name: "Garaż", type: "strict", area: "plac", capacity: 10, svgElementId: null },
  // SALON
  { id: "salon", name: "Salon", type: "strict", area: "salon", capacity: 12, svgElementId: null },
  { id: "myjnia_salon", name: "Myjnia (salon)", type: "strict", area: "salon", capacity: 18, svgElementId: null },
  // SERWIS
  { id: "hala_1", name: "Hala 1", type: "strict", area: "serwis", capacity: 4, svgElementId: null },
  { id: "hala_2", name: "Hala 2", type: "strict", area: "serwis", capacity: 4, svgElementId: null },
  { id: "hala_3", name: "Hala 3", type: "strict", area: "serwis", capacity: 4, svgElementId: null },
  { id: "recepcja_serwisu", name: "Recepcja Serwisu", type: "blocked", area: "serwis", capacity: 0, svgElementId: null },
  { id: "myjnia_serwis", name: "Myjnia (serwis)", type: "strict", area: "serwis", capacity: 2, svgElementId: null },
  // BLACHARNIA
  { id: "dach_rzad_1", name: "Dach – rząd 1", type: "strict", area: "blacharnia", capacity: 4, svgElementId: null },
  { id: "dach_rzad_2", name: "Dach – rząd 2", type: "strict", area: "blacharnia", capacity: 4, svgElementId: null },
  { id: "dach_rzad_3", name: "Dach – rząd 3", type: "strict", area: "blacharnia", capacity: 4, svgElementId: null },
  { id: "dach_rzad_4", name: "Dach – rząd 4", type: "strict", area: "blacharnia", capacity: 4, svgElementId: null },
  { id: "dach_rzad_5", name: "Dach – rząd 5", type: "strict", area: "blacharnia", capacity: 4, svgElementId: null },
  { id: "dach_rzad_6", name: "Dach – rząd 6", type: "strict", area: "blacharnia", capacity: 4, svgElementId: null },
  { id: "blacharnia_hala", name: "Blacharnia (hala)", type: "flexible", area: "blacharnia", capacity: null, svgElementId: null },
  { id: "myjnia_blacharnia", name: "Myjnia (blacharnia)", type: "strict", area: "blacharnia", capacity: 1, svgElementId: null },
  { id: "tunel", name: "Tunel", type: "strict", area: "blacharnia", capacity: 5, svgElementId: null },
];

interface ZonesState {
  zones: Zone[];
  setZones: (zones: Zone[]) => void;
  getZoneById: (id: string) => Zone | undefined;
  incrementZoneCount: (id: string) => void;
  decrementZoneCount: (id: string) => void;
}

export const useZonesStore = create<ZonesState>()((set, get) => ({
  zones: ZONE_DEFINITIONS.map((z) => ({ ...z, currentCount: 0 })),
  setZones: (zones) => set({ zones }),
  getZoneById: (id) => get().zones.find((z) => z.id === id),
  incrementZoneCount: (id) =>
    set((state) => ({
      zones: state.zones.map((z) =>
        z.id === id ? { ...z, currentCount: z.currentCount + 1 } : z
      ),
    })),
  decrementZoneCount: (id) =>
    set((state) => ({
      zones: state.zones.map((z) =>
        z.id === id ? { ...z, currentCount: Math.max(0, z.currentCount - 1) } : z
      ),
    })),
}));
