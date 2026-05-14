"use client";

import { useState } from "react";
import { TransformWrapper, TransformComponent, useControls } from "react-zoom-pan-pinch";
import {
  DndContext, DragOverlay, useSensor, useSensors,
  MouseSensor, TouchSensor, useDroppable, useDraggable,
  type DragEndEvent, type DragStartEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { doc, updateDoc, serverTimestamp, addDoc, collection } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "react-toastify";
import { validateDrop, canUserMoveVehicle } from "@/lib/validation/validateDrop";
import { useAuthStore } from "@/store/authStore";
import { useZonesStore } from "@/store/zonesStore";
import type { Zone, Vehicle } from "@/types";
import { STATUS_COLORS } from "./VehicleTile";

// ─── Zone positions (% of SVG 1088×1098) ─────────────────────────────────────
// Dach rows are pixel-accurate; others are approximate.

export type ZonePos = { x: number; y: number; w: number; h: number };

export const ZONE_POSITIONS: Record<string, ZonePos> = {
  strefa_ladownice:  { x: 3,    y: 2,    w: 25,   h: 5   },
  strefa_1:          { x: 17,   y: 6,    w: 21,   h: 27  },
  strefa_2:          { x: 3,    y: 16,   w: 13,   h: 16  },
  strefa_3:          { x: 3,    y: 33,   w: 13,   h: 11  },
  strefa_4:          { x: 3,    y: 45,   w: 13,   h: 11  },
  strefa_5:          { x: 3,    y: 57,   w: 13,   h: 11  },
  strefa_6:          { x: 3,    y: 69,   w: 13,   h: 11  },
  strefa_7:          { x: 22,   y: 33,   w: 22,   h: 6   },
  garaz:             { x: 19,   y: 19,   w: 12,   h: 13  },
  salon:             { x: 39,   y: 6,    w: 20,   h: 30  },
  myjnia_salon:      { x: 44,   y: 36,   w: 14,   h: 9   },
  hala_1:            { x: 39,   y: 36,   w: 14,   h: 9   },
  hala_2:            { x: 39,   y: 46,   w: 14,   h: 9   },
  hala_3:            { x: 39,   y: 56,   w: 14,   h: 9   },
  recepcja_serwisu:  { x: 39,   y: 66,   w: 14,   h: 8   },
  myjnia_serwis:     { x: 54,   y: 47,   w: 11,   h: 9   },
  blacharnia_hala:   { x: 65,   y: 6,    w: 7,    h: 32  },
  myjnia_blacharnia: { x: 65,   y: 90,   w: 7,    h: 8   },
  tunel:             { x: 65,   y: 39,   w: 7,    h: 52  },
  dach_rzad_1:       { x: 72.4, y: 39.7, w: 23.3, h: 7.8 },
  dach_rzad_2:       { x: 72.4, y: 48.2, w: 23.3, h: 7.8 },
  dach_rzad_3:       { x: 72.4, y: 56.8, w: 23.3, h: 7.8 },
  dach_rzad_4:       { x: 72.4, y: 65.4, w: 23.3, h: 7.8 },
  dach_rzad_5:       { x: 72.4, y: 74.0, w: 23.3, h: 7.8 },
  dach_rzad_6:       { x: 72.4, y: 82.6, w: 23.3, h: 7.8 },
};

// ─── Zoom controls ────────────────────────────────────────────────────────────

function Controls() {
  const { zoomIn, zoomOut, resetTransform } = useControls();
  return (
    <div className="absolute bottom-3 right-3 z-10 flex flex-col gap-1">
      {([
        [ZoomIn,    () => zoomIn(),         "Powiększ"],
        [ZoomOut,   () => zoomOut(),        "Pomniejsz"],
        [Maximize2, () => resetTransform(), "Resetuj widok"],
      ] as const).map(([Icon, fn, title]) => (
        <button key={title} onClick={fn} title={title}
          className="w-8 h-8 flex items-center justify-center rounded-lg shadow"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border2)", color: "var(--color-muted)" }}>
          <Icon size={14} />
        </button>
      ))}
    </div>
  );
}

// ─── Draggable vehicle dot ────────────────────────────────────────────────────

function DraggableVehicle({
  vehicle,
  fromZoneId,
  canDrag,
  onClick,
  selected,
}: {
  vehicle: Vehicle;
  fromZoneId: string | null;
  canDrag: boolean;
  onClick: (e: React.MouseEvent) => void;
  selected: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: vehicle.id,
    disabled: !canDrag,
    data: { vehicle, fromZoneId },
  });
  const color = STATUS_COLORS[vehicle.status] ?? "#64748b";

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={onClick}
      title={`${vehicle.brand} ${vehicle.model} | ${vehicle.vinShort}`}
      className="cursor-pointer rounded transition-transform hover:scale-110 shrink-0"
      style={{
        width: 26,
        height: 16,
        background: color,
        opacity: isDragging ? 0.25 : selected ? 1 : 0.82,
        outline: selected ? "2px solid #fff" : "none",
        outlineOffset: 1,
        transform: CSS.Translate.toString(transform),
        touchAction: "none",
      }}
    />
  );
}

// ─── Droppable zone overlay ───────────────────────────────────────────────────

const ZONE_BG = { strict: "rgba(59,130,246,0.12)", flexible: "rgba(34,197,94,0.08)", blocked: "rgba(239,68,68,0.08)" };
const ZONE_BORDER = { strict: "rgba(59,130,246,0.45)", flexible: "rgba(34,197,94,0.35)", blocked: "rgba(239,68,68,0.4)" };

function DroppableZone({
  zone, vehicles, pos, selected, selectedVehicleId, onClick, onVehicleClick, canDrag,
}: {
  zone: Zone; vehicles: Vehicle[]; pos: ZonePos;
  selected: boolean; selectedVehicleId: string | null;
  onClick: () => void;
  onVehicleClick: (v: Vehicle) => void;
  canDrag: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: zone.id, disabled: zone.type === "blocked" });

  const bg = isOver ? "rgba(59,130,246,0.28)" : selected ? "rgba(59,130,246,0.22)" : ZONE_BG[zone.type];
  const border = isOver ? "rgba(59,130,246,1)" : selected ? "rgba(59,130,246,0.9)" : ZONE_BORDER[zone.type];
  const isFull = zone.capacity !== null && vehicles.length >= zone.capacity;

  return (
    <div
      ref={setNodeRef}
      onClick={onClick}
      className="absolute cursor-pointer overflow-hidden transition-all"
      style={{ left: `${pos.x}%`, top: `${pos.y}%`, width: `${pos.w}%`, height: `${pos.h}%`, background: bg, border: `1.5px solid ${border}`, borderRadius: 5 }}
    >
      <div className="flex items-center justify-between px-1 py-0.5 select-none" style={{ background: "rgba(0,0,0,0.45)" }}>
        <span className="text-[7px] font-bold truncate leading-tight" style={{ color: "#f1f5f9" }}>
          {zone.name}
        </span>
        <span className="text-[7px] font-mono shrink-0 ml-1" style={{ color: isFull ? "#ef4444" : "#22c55e" }}>
          {vehicles.length}{zone.capacity ? `/${zone.capacity}` : ""}
        </span>
      </div>

      {vehicles.length > 0 && (
        <div className="flex flex-wrap gap-0.5 p-0.5">
          {vehicles.map((v) => (
            <DraggableVehicle
              key={v.id}
              vehicle={v}
              fromZoneId={zone.id}
              canDrag={canDrag}
              selected={v.id === selectedVehicleId}
              onClick={(e) => { e.stopPropagation(); onVehicleClick(v); }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main MapView ─────────────────────────────────────────────────────────────

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
  zones, vehicles, selectedZoneId, selectedVehicleId,
  onZoneClick, onVehicleClick, filteredVehicleIds,
}: Props) {
  const { user } = useAuthStore();
  const { zones: allZones } = useZonesStore();
  const [activeVehicle, setActiveVehicle] = useState<Vehicle | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const canDrag = user ? canUserMoveVehicle(user.role) : false;

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } })
  );

  function onDragStart(e: DragStartEvent) {
    const v = (e.active.data.current as { vehicle: Vehicle })?.vehicle;
    setActiveVehicle(v ?? null);
    setIsDragging(true);
  }

  async function onDragEnd(e: DragEndEvent) {
    setIsDragging(false);
    setActiveVehicle(null);

    const { active, over } = e;
    if (!over || !user) return;

    const vehicle = (active.data.current as { vehicle: Vehicle })?.vehicle;
    if (!vehicle) return;

    const toZoneId = over.id as string;
    if (vehicle.zoneId === toZoneId) return;

    const toZone = allZones.find((z) => z.id === toZoneId);
    if (!toZone) return;

    const result = validateDrop(toZone, user.role);
    if (!result.allowed) {
      toast.warning(result.message);
      return;
    }

    try {
      const fromZoneName = allZones.find((z) => z.id === vehicle.zoneId)?.name ?? "Bez strefy";
      const toZoneName = toZone.name;

      await updateDoc(doc(db, "vehicles", vehicle.id), {
        zoneId: toZoneId,
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
      });

      await addDoc(collection(db, "vehicles", vehicle.id, "logs"), {
        vehicleId: vehicle.id,
        type: "zone_change",
        action: "Przesunięcie na mapie",
        details: `${fromZoneName} → ${toZoneName}`,
        performedBy: user.uid,
        performedByName: user.displayName ?? "Nieznany",
        performedAt: serverTimestamp(),
        metadata: null,
      });

      toast.success(`Przeniesiono do: ${toZoneName}`);
    } catch {
      toast.error("Nie udało się przenieść pojazdu.");
    }
  }

  const activeColor = activeVehicle ? (STATUS_COLORS[activeVehicle.status] ?? "#64748b") : "#64748b";

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
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
          minScale={0.35}
          maxScale={4}
          initialScale={0.85}
          centerOnInit
          limitToBounds={false}
          panning={{ disabled: isDragging }}
        >
          <>
            <Controls />
            <TransformComponent
              wrapperStyle={{ width: "100%", height: "100%" }}
              contentStyle={{ width: 1088, height: 1098, position: "relative" }}
            >
              {/* SVG background */}
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
                  <DroppableZone
                    key={zone.id}
                    zone={zone}
                    vehicles={zoneVehicles}
                    pos={pos}
                    selected={selectedZoneId === zone.id}
                    selectedVehicleId={selectedVehicleId}
                    onClick={() => onZoneClick(zone.id)}
                    onVehicleClick={onVehicleClick}
                    canDrag={canDrag}
                  />
                );
              })}
            </TransformComponent>
          </>
        </TransformWrapper>
      </div>

      {/* Drag overlay — renders outside TransformWrapper, follows cursor */}
      <DragOverlay>
        {activeVehicle ? (
          <div
            className="rounded shadow-lg"
            style={{ width: 26, height: 16, background: activeColor, opacity: 0.95 }}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
