"use client";

import { useRef } from "react";
import { TransformWrapper, TransformComponent, useControls } from "react-zoom-pan-pinch";
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import type { Zone, Vehicle } from "@/types";
import ZoneOverlay, { type ZonePos } from "./ZoneOverlay";

// Zone positions as % of SVG viewBox (1088 × 1098).
// Dach rows (dach_rzad_1-6) are pixel-accurate from SVG rect analysis.
// Other zones are approximate and can be calibrated after visual review.
export const ZONE_POSITIONS: Record<string, ZonePos> = {
  // PLAC GŁÓWNY
  strefa_ladownice: { x: 3,    y: 2,    w: 25,   h: 5   },
  strefa_1:         { x: 17,   y: 6,    w: 21,   h: 27  },
  strefa_2:         { x: 3,    y: 16,   w: 13,   h: 16  },
  strefa_3:         { x: 3,    y: 33,   w: 13,   h: 11  },
  strefa_4:         { x: 3,    y: 45,   w: 13,   h: 11  },
  strefa_5:         { x: 3,    y: 57,   w: 13,   h: 11  },
  strefa_6:         { x: 3,    y: 69,   w: 13,   h: 11  },
  strefa_7:         { x: 22,   y: 33,   w: 22,   h: 6   },
  garaz:            { x: 19,   y: 19,   w: 12,   h: 13  },
  // SALON
  salon:            { x: 39,   y: 6,    w: 20,   h: 30  },
  myjnia_salon:     { x: 44,   y: 36,   w: 14,   h: 9   },
  // SERWIS
  hala_1:           { x: 39,   y: 36,   w: 14,   h: 9   },
  hala_2:           { x: 39,   y: 46,   w: 14,   h: 9   },
  hala_3:           { x: 39,   y: 56,   w: 14,   h: 9   },
  recepcja_serwisu: { x: 39,   y: 66,   w: 14,   h: 8   },
  myjnia_serwis:    { x: 54,   y: 47,   w: 11,   h: 9   },
  // BLACHARNIA
  blacharnia_hala:  { x: 65,   y: 6,    w: 7,    w2: 7, h: 32  } as unknown as ZonePos,
  myjnia_blacharnia:{ x: 65,   y: 90,   w: 7,    h: 8   },
  tunel:            { x: 65,   y: 39,   w: 7,    h: 52  },
  // DACH — pixel-accurate from SVG rect data
  dach_rzad_1:      { x: 72.4, y: 39.7, w: 23.3, h: 7.8 },
  dach_rzad_2:      { x: 72.4, y: 48.2, w: 23.3, h: 7.8 },
  dach_rzad_3:      { x: 72.4, y: 56.8, w: 23.3, h: 7.8 },
  dach_rzad_4:      { x: 72.4, y: 65.4, w: 23.3, h: 7.8 },
  dach_rzad_5:      { x: 72.4, y: 74.0, w: 23.3, h: 7.8 },
  dach_rzad_6:      { x: 72.4, y: 82.6, w: 23.3, h: 7.8 },
};

// Fix the blacharnia_hala entry (TypeScript workaround for copy-paste above)
ZONE_POSITIONS.blacharnia_hala = { x: 65, y: 6, w: 7, h: 32 };

function Controls() {
  const { zoomIn, zoomOut, resetTransform } = useControls();
  return (
    <div
      className="absolute bottom-3 right-3 z-10 flex flex-col gap-1"
    >
      {[
        { icon: ZoomIn,    fn: () => zoomIn(),        title: "Powiększ" },
        { icon: ZoomOut,   fn: () => zoomOut(),       title: "Pomniejsz" },
        { icon: Maximize2, fn: () => resetTransform(), title: "Resetuj widok" },
      ].map(({ icon: Icon, fn, title }) => (
        <button
          key={title}
          onClick={fn}
          title={title}
          className="w-8 h-8 flex items-center justify-center rounded-lg shadow"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border2)", color: "var(--color-muted)" }}
        >
          <Icon size={14} />
        </button>
      ))}
    </div>
  );
}

interface Props {
  zones: Zone[];
  vehicles: Vehicle[];
  selectedZoneId: string | null;
  selectedVehicleId: string | null;
  onZoneClick: (zoneId: string) => void;
  onVehicleClick: (v: Vehicle) => void;
  filteredVehicleIds: Set<string>;
}

export default function MapView({
  zones,
  vehicles,
  selectedZoneId,
  selectedVehicleId,
  onZoneClick,
  onVehicleClick,
  filteredVehicleIds,
}: Props) {
  return (
    <div
      className="relative rounded-2xl overflow-hidden"
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--bg-border)",
        height: "calc(100vh - 220px)",
        minHeight: 400,
      }}
    >
      <TransformWrapper
        minScale={0.4}
        maxScale={4}
        initialScale={0.9}
        centerOnInit
        limitToBounds={false}
      >
        <>
          <Controls />
          <TransformComponent
            wrapperStyle={{ width: "100%", height: "100%" }}
            contentStyle={{ width: 1088, height: 1098, position: "relative" }}
          >
            {/* SVG map background */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/map-background.svg"
              alt="Mapa placu MG Plaza"
              width={1088}
              height={1098}
              style={{ display: "block", userSelect: "none" }}
              draggable={false}
            />

            {/* Zone overlays */}
            {zones.map((zone) => {
              const pos = ZONE_POSITIONS[zone.id];
              if (!pos) return null;

              const zoneVehicles = vehicles.filter(
                (v) => v.zoneId === zone.id && filteredVehicleIds.has(v.id)
              );

              return (
                <ZoneOverlay
                  key={zone.id}
                  zone={zone}
                  vehicles={zoneVehicles}
                  pos={pos}
                  selected={selectedZoneId === zone.id}
                  selectedVehicleId={selectedVehicleId}
                  onClick={() => onZoneClick(zone.id)}
                  onVehicleClick={onVehicleClick}
                />
              );
            })}
          </TransformComponent>
        </>
      </TransformWrapper>
    </div>
  );
}
