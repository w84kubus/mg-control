"use client";

import { useState, useRef, useLayoutEffect, useCallback } from "react";
import { TransformWrapper, TransformComponent, useControls } from "react-zoom-pan-pinch";
import {
  DndContext, useSensor, useSensors,
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

// ─── SVG canvas & zone polygons ───────────────────────────────────────────────
// Coordinate space matches the source floor-plan SVG (public/floorplan.svg) 1:1.
// All zone shapes below are the exact rectangles/quads extracted from that file,
// so the interactive overlay lines up pixel-perfectly with the drawn plan.

export const SVG_W = 1088;
export const SVG_H = 1098;

// Base path for the static floor-plan asset (GitHub Pages basePath aware).
const FLOORPLAN_SRC = `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/floorplan.svg`;

// Exact shape points lifted verbatim from public/floorplan.svg (angled shapes
// preserved) so every interactive overlay matches the drawn plan pixel-for-pixel.
export const ZONE_POLYGONS: Record<string, string> = {
  // ── Top buildings ──────────────────────────────────────────────────────────
  salon:             "37,31 207,31 207,236 37,236",
  wydawka:           "206,30 306,30 306,236 206,236",
  myjnia_salon:      "327,31 526,31 526,236 327,236",
  garaz:             "772,30 1056,30 1056,236 772,236",

  // ── Middle transition (angled) ─────────────────────────────────────────────
  tunel:             "210,259 299,259 323,364 234,364",
  strefa_ladownice:  "66,363 191,363 191,418 66,418",
  strefa_1:          "234,363 735,363 706,418 234,418",

  // ── Left parking strip (angled parallelograms) ─────────────────────────────
  strefa_2:          "179,473 179,618 34,635 34,487",
  strefa_3:          "179,618 179,769 34,788 34,635",
  strefa_4:          "179,769 179,914 34,938 34,788",
  strefa_5:          "179,914 179,1048 60,1068 34,936",
  strefa_6:          "179,981 574,981 574,1068 179,1068",

  // ── Service centre ─────────────────────────────────────────────────────────
  hala_1:            "244,487 563,487 563,593 244,593",
  hala_2:            "244,602 472,602 472,712 244,712",
  recepcja_serwisu:  "244,721 412,721 412,795 244,795",
  hala_3:            "244,806 472,806 472,903 244,903",
  myjnia_serwis:     "244,915 422,915 422,970 244,970",
  strefa_7:          "573,478 629,512 629,1067 573,1067",

  // ── Blacharnia: one drawn block. Right column = the 6 drawn <rect> roof-row
  // boxes (exact coords); left column = body (top) + wash (bottom). ───────────
  dach_rzad_6:       "788,436 1041,436 1041,521 788,521",
  dach_rzad_5:       "788,530 1041,530 1041,615 788,615",
  dach_rzad_4:       "788,624 1041,624 1041,709 788,709",
  dach_rzad_3:       "788,718 1041,718 1041,803 788,803",
  dach_rzad_2:       "788,812 1041,812 1041,898 788,898",
  dach_rzad_1:       "788,907 1042,907 1042,992 788,992",
  // myjnia rect is rotate(180)-transformed in the source SVG; these are the
  // real on-screen corners. hala = the rest of the left column above it.
  blacharnia_hala:   "710,431 788,422 788,882 710,882",
  myjnia_blacharnia: "722,884 778,884 778,991 722,991",
};

// Parse polygon points string → bounding box + centroid
function polyBounds(pts: string) {
  const n = pts.split(/[ ,]+/).map(Number);
  const xs: number[] = [], ys: number[] = [];
  for (let i = 0; i < n.length; i += 2) { xs.push(n[i]); ys.push(n[i + 1]); }
  const x = Math.min(...xs), y = Math.min(...ys);
  const mx = Math.max(...xs), my = Math.max(...ys);
  return { x, y, w: mx - x, h: my - y, cx: (x + mx) / 2, cy: (y + my) / 2 };
}

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

// Default (maximum) dot size – scaled down when a zone overflows.
const DOT_W_MAX = 44;
const DOT_H_MAX = 25;
const DOT_GAP_X = 6;
const DOT_GAP_Y = 5;
const ZONE_PAD = 4;
const BADGE_H = 20; // vertical space reserved for the occupancy badge

/** Compute dot dimensions and grid layout that fits `count` vehicles in a zone. */
function fitGrid(b: { w: number; h: number }, count: number) {
  const availW = b.w - ZONE_PAD * 2;
  const availH = b.h - ZONE_PAD - BADGE_H;

  if (count === 0) return { dotW: DOT_W_MAX, dotH: DOT_H_MAX, cols: 1, stepX: 0, stepY: 0 };

  // Start with default size and shrink if needed
  let dotW = DOT_W_MAX;
  let dotH = DOT_H_MAX;
  let gapX = DOT_GAP_X;
  let gapY = DOT_GAP_Y;

  // Try to fit with decreasing scale (100% → 40%)
  for (let scale = 1.0; scale >= 0.4; scale -= 0.05) {
    dotW = Math.round(DOT_W_MAX * scale);
    dotH = Math.round(DOT_H_MAX * scale);
    gapX = Math.max(1, Math.round(DOT_GAP_X * scale));
    gapY = Math.max(1, Math.round(DOT_GAP_Y * scale));

    const stepX = dotW + gapX;
    const stepY = dotH + gapY;
    const cols = Math.max(1, Math.floor(availW / stepX));
    const rows = Math.ceil(count / cols);
    const neededH = rows * stepY;

    if (neededH <= availH) {
      return { dotW, dotH, cols, stepX, stepY };
    }
  }

  // Absolute minimum – just cram them in
  const stepX = dotW + gapX;
  const stepY = dotH + gapY;
  const cols = Math.max(1, Math.floor(availW / stepX));
  return { dotW, dotH, cols, stepX, stepY };
}

function DraggableVehicle({
  vehicle, fromZoneId, canDrag, onClick, selected, svgX, svgY, dotW, dotH, scaleRef,
}: {
  vehicle: Vehicle; fromZoneId: string | null; canDrag: boolean;
  onClick: (e: React.MouseEvent) => void; selected: boolean;
  svgX: number; svgY: number; dotW: number; dotH: number;
  scaleRef: React.RefObject<number>;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: vehicle.id,
    disabled: !canDrag,
    data: { vehicle, fromZoneId },
  });
  const color = STATUS_COLORS[vehicle.status] ?? "#64748b";
  const fontSize = Math.max(5, Math.round(dotW * 0.18));

  // Compensate for zoom scale: @dnd-kit reports delta in screen pixels,
  // but the SVG content is scaled by TransformWrapper. Dividing by scale
  // keeps the dragged dot under the cursor at any zoom level.
  const scale = scaleRef.current ?? 1;
  const adjustedTransform = transform
    ? { ...transform, x: transform.x / scale, y: transform.y / scale }
    : null;

  return (
    <g
      ref={setNodeRef as unknown as (el: SVGGElement | null) => void}
      {...attributes}
      {...listeners}
      onClick={onClick}
      style={{
        transform: CSS.Translate.toString(adjustedTransform),
        cursor: canDrag ? "grab" : "default",
        opacity: isDragging ? 0.25 : 1,
        touchAction: "none",
      }}
    >
      <rect
        x={svgX} y={svgY} width={dotW} height={dotH} rx={Math.min(4, dotW * 0.1)}
        fill={color}
        stroke={selected ? "#ffffff" : "rgba(0,0,0,0.3)"}
        strokeWidth={selected ? 2 : 1}
      />
      <text
        x={svgX + dotW / 2} y={svgY + dotH / 2 + 1}
        textAnchor="middle" dominantBaseline="middle"
        fontSize={fontSize} fontFamily="'Courier New', monospace" fontWeight="bold"
        fill="#ffffff"
        style={{ pointerEvents: "none", userSelect: "none" }}
      >
        {vehicle.vinShort}
      </text>
    </g>
  );
}

// ─── Droppable zone (SVG polygon) ─────────────────────────────────────────────

function DroppableZone({
  zone, vehicles, polygonPoints, selected, selectedVehicleId,
  onClick, onVehicleClick, canDrag, scaleRef,
}: {
  zone: Zone; vehicles: Vehicle[]; polygonPoints: string;
  selected: boolean; selectedVehicleId: string | null;
  onClick: () => void; onVehicleClick: (v: Vehicle) => void; canDrag: boolean;
  scaleRef: React.RefObject<number>;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: zone.id, disabled: zone.type === "blocked" });
  const b = polyBounds(polygonPoints);
  const isFull = zone.capacity !== null && vehicles.length >= zone.capacity;

  // The floor-plan SVG underneath already carries the visual zone styling and
  // names, so the overlay stays transparent and only lights up on interaction.
  const fill = isOver
    ? "rgba(59,130,246,0.32)"
    : selected
    ? "rgba(59,130,246,0.18)"
    : "transparent";

  const stroke = isOver
    ? "rgba(59,130,246,1)"
    : selected
    ? "rgba(59,130,246,0.9)"
    : "transparent";

  // Vehicle grid — auto-scales dots to fit inside the zone bounds
  const { dotW, dotH, cols, stepX, stepY } = fitGrid(b, vehicles.length);
  const vStartX = b.x + ZONE_PAD;
  const vStartY = b.y + BADGE_H;

  return (
    <g
      ref={setNodeRef as unknown as (el: SVGGElement | null) => void}
      onClick={onClick}
      style={{ cursor: "pointer" }}
    >
      {/* Zone fill */}
      <polygon
        points={polygonPoints}
        fill={fill}
        stroke={stroke}
        strokeWidth={isFull ? 2.5 : 1.5}
        strokeLinejoin="round"
      />

      {/* Live occupancy badge (top-right of the zone) */}
      {(vehicles.length > 0 || zone.capacity !== null) && (
        <>
          <rect
            x={b.x + b.w - 34} y={b.y + 3} width={31} height={15} rx={3}
            fill="rgba(15,23,42,0.82)"
            style={{ pointerEvents: "none" }}
          />
          <text
            x={b.x + b.w - 18.5} y={b.y + 11}
            textAnchor="middle" dominantBaseline="middle"
            fontSize={9} fontWeight="bold" fontFamily="monospace"
            fill={isFull ? "#ef4444" : "#22c55e"}
            style={{ pointerEvents: "none", userSelect: "none" }}
          >
            {vehicles.length}{zone.capacity ? `/${zone.capacity}` : ""}
          </text>
        </>
      )}

      {/* Vehicle dots — clipped to zone bounds */}
      {vehicles.map((v, i) => (
        <DraggableVehicle
          key={v.id}
          vehicle={v}
          fromZoneId={zone.id}
          canDrag={canDrag}
          selected={v.id === selectedVehicleId}
          dotW={dotW}
          dotH={dotH}
          svgX={vStartX + (i % cols) * stepX}
          svgY={vStartY + Math.floor(i / cols) * stepY}
          onClick={(e) => { e.stopPropagation(); onVehicleClick(v); }}
          scaleRef={scaleRef}
        />
      ))}
    </g>
  );
}

// ─── Floor-plan background (the user-authored SVG, rendered 1:1) ──────────────

function MapBackground() {
  return (
    <image
      href={FLOORPLAN_SRC}
      x={0}
      y={0}
      width={SVG_W}
      height={SVG_H}
      preserveAspectRatio="xMidYMid meet"
      style={{ pointerEvents: "none", userSelect: "none" }}
    />
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
  const [isDragging, setIsDragging] = useState(false);
  const scaleRef = useRef(1);

  const canDrag = user ? canUserMoveVehicle(user.role) : false;

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 10 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 300, tolerance: 10 } })
  );

  const onDragStart = useCallback((e: DragStartEvent) => {
    setIsDragging(true);
  }, []);

  const onDragEnd = useCallback(async (e: DragEndEvent) => {
    setIsDragging(false);

    const { active, over } = e;
    if (!over || !user) return;
    const vehicle = (active.data.current as { vehicle: Vehicle })?.vehicle;
    if (!vehicle) return;
    const toZoneId = over.id as string;
    if (vehicle.zoneId === toZoneId) return;
    const toZone = allZones.find((z) => z.id === toZoneId);
    if (!toZone) return;

    const result = validateDrop(toZone, user.role);
    if (!result.allowed) { toast.warning(result.message); return; }

    try {
      const fromZoneName = allZones.find((z) => z.id === vehicle.zoneId)?.name ?? "Bez strefy";
      await updateDoc(doc(db, "vehicles", vehicle.id), {
        zoneId: toZoneId,
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
      });
      await addDoc(collection(db, "vehicles", vehicle.id, "logs"), {
        vehicleId: vehicle.id,
        type: "zone_change",
        action: "Przesunięcie na mapie",
        details: `${fromZoneName} → ${toZone.name}`,
        performedBy: user.uid,
        performedByName: user.displayName ?? "Nieznany",
        performedAt: serverTimestamp(),
        metadata: null,
      });
      toast.success(`Przeniesiono do: ${toZone.name}`);
    } catch {
      toast.error("Nie udało się przenieść pojazdu.");
    }
  }, [user, allZones]);


  // Fit-to-container scale: the map can be zoomed out only until the whole
  // floor plan is visible — never smaller.
  const containerRef = useRef<HTMLDivElement>(null);
  // Scales are computed exactly ONCE at mount and never touched again. No
  // ResizeObserver / post-mount setState → clicking a zone (or any re-render)
  // can never re-clamp or re-center the TransformWrapper. initS fills the
  // width; minS is the zoom-out floor (whole plan visible).
  const [scales, setScales] = useState<{ initS: number; minS: number } | null>(null);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const w = el.clientWidth, h = el.clientHeight;
    if (w <= 0 || h <= 0) return;
    const widthFit = (w / SVG_W) * 0.99;
    const heightFit = (h / SVG_H) * 0.98;
    setScales({
      initS: Number(widthFit.toFixed(4)),
      minS: Number(Math.min(widthFit, heightFit).toFixed(4)),
    });
  }, []);

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div
        ref={containerRef}
        className="relative rounded-2xl overflow-hidden"
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--bg-border)",
          height: "calc(100dvh - 220px)",
          minHeight: 300,
        }}
      >
        {scales !== null && (
        <TransformWrapper
          minScale={scales.minS}
          maxScale={2}
          initialScale={scales.initS}
          initialPositionX={0}
          initialPositionY={0}
          limitToBounds={false}
          smooth={false}
          wheel={{ step: 0.07 }}
          pinch={{ step: 3 }}
          panning={{ disabled: isDragging, velocityDisabled: true }}
          doubleClick={{ disabled: true }}
          onTransform={(_ref, state) => { scaleRef.current = state.scale; }}
          onInit={(ref) => { scaleRef.current = ref.state.scale; }}
        >
          <>
            <Controls />
            <TransformComponent
              wrapperStyle={{ width: "100%", height: "100%" }}
              contentStyle={{ width: SVG_W, height: SVG_H, position: "relative" }}
            >
              <svg
                width={SVG_W}
                height={SVG_H}
                viewBox={`0 0 ${SVG_W} ${SVG_H}`}
                style={{ display: "block", background: "var(--bg-surface2)", borderRadius: 8 }}
              >
                <MapBackground />

                {zones.map((zone) => {
                  const pts = ZONE_POLYGONS[zone.id];
                  if (!pts) return null;
                  const zoneVehicles = vehicles.filter(
                    (v) => v.zoneId === zone.id && filteredVehicleIds.has(v.id)
                  );
                  return (
                    <DroppableZone
                      key={zone.id}
                      zone={zone}
                      vehicles={zoneVehicles}
                      polygonPoints={pts}
                      selected={selectedZoneId === zone.id}
                      selectedVehicleId={selectedVehicleId}
                      onClick={() => onZoneClick(zone.id)}
                      onVehicleClick={onVehicleClick}
                      canDrag={canDrag}
                      scaleRef={scaleRef}
                    />
                  );
                })}
              </svg>
            </TransformComponent>
          </>
        </TransformWrapper>
        )}
      </div>

      {/* DragOverlay intentionally omitted — it renders outside
          TransformComponent causing coordinate mismatches and view jumps.
          The dragged vehicle remains visible in-place at reduced opacity. */}
    </DndContext>
  );
}
