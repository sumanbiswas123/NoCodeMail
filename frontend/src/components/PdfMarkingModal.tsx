import React, { useState, useEffect, useRef, useCallback } from "react";
import { 
  X, 
  Layers, 
  Eye, 
  EyeOff, 
  Trash2, 
  ZoomIn, 
  ZoomOut, 
  Crop, 
  Type, 
  Image as ImageIcon, 
  Square, 
  Info,
  ChevronRight,
  RefreshCw,
  Maximize,
  Minimize,
  Sliders,
  Sparkles
} from "lucide-react";
import { nativeIPC, PDFComponent, PDFPageComponentsData, MarkedRegion } from "../services/ipc";

interface PdfMarkingModalProps {
  pdfPath: string;
  targetPage?: number;
  emailWidth?: number;
  onClose: () => void;
  onConfirm: (markedRegions: MarkedRegion[]) => void;
}

export const PdfMarkingModal: React.FC<PdfMarkingModalProps> = ({
  pdfPath,
  targetPage = 1,
  onClose,
  onConfirm,
}) => {
  const [loading, setLoading] = useState(true);
  const [pageData, setPageData] = useState<PDFPageComponentsData | null>(null);
  const [markedRegions, setMarkedRegions] = useState<MarkedRegion[]>([]);
  const [activeDrawing, setActiveDrawing] = useState<{ startX: number; startY: number; currentX: number; currentY: number } | null>(null);
  const [selectedMarkId, setSelectedMarkId] = useState<string | null>(null);
  
  // Toggles for layer overlays
  const [showTextOverlay, setShowTextOverlay] = useState(true);
  const [showImageOverlay, setShowImageOverlay] = useState(true);
  const [showPathOverlay, setShowPathOverlay] = useState(true);
  const [hoveredComponent, setHoveredComponent] = useState<PDFComponent | null>(null);

  // Zoom & View scaling: Target standard email preview width ~720px by default
  const [zoom, setZoom] = useState<number>(1.0); // 1.0 = 720px, 1.2 = 864px
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const svgOverlayRef = useRef<SVGSVGElement>(null);

  // Load components from Zig engine
  const loadComponents = useCallback(async () => {
    try {
      setLoading(true);
      const data = await nativeIPC.getPdfComponents(pdfPath, targetPage);
      setPageData(data);
      if (canvasContainerRef.current) {
        const availableWidth = canvasContainerRef.current.clientWidth - 80;
        const targetW = availableWidth * 0.70;
        setZoom(Math.max(0.5, Math.min(2.5, targetW / 720)));
      } else {
        setZoom(1.0);
      }
    } catch (e) {
      console.error("Failed to load PDF components:", e);
    } finally {
      setLoading(false);
    }
  }, [pdfPath, targetPage]);

  useEffect(() => {
    loadComponents();
  }, [loadComponents]);

  // Touchpad pinch-to-zoom & Ctrl+Wheel listener on canvas area
  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const factor = e.deltaY > 0 ? 0.95 : 1.05;
        setZoom(prev => Math.max(0.3, Math.min(3.0, prev * factor)));
      }
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      container.removeEventListener("wheel", handleWheel);
    };
  }, []);

  // Ctrl + Plus / Ctrl + Minus keyboard shortcuts for PDF canvas zoom
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === "=" || e.key === "+") {
          e.preventDefault();
          setZoom(prev => Math.min(3.0, prev + 0.1));
        } else if (e.key === "-" || e.key === "_") {
          e.preventDefault();
          setZoom(prev => Math.max(0.3, prev - 0.1));
        } else if (e.key === "0") {
          e.preventDefault();
          setZoom(1.0);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Fit to 70% of available width of the canvas area
  const handleFitWidth = () => {
    if (!canvasContainerRef.current) return;
    const availableWidth = canvasContainerRef.current.clientWidth - 80;
    const targetW = availableWidth * 0.70; // 70% of available space
    setZoom(Math.max(0.4, Math.min(2.5, targetW / 720)));
  };

  // Fit to Screen Height handler
  const handleFitHeight = () => {
    if (!pageData || !canvasContainerRef.current || pageData.canvas_height_pt <= 0) return;
    const containerH = canvasContainerRef.current.clientHeight - 80;
    const aspectRatio = pageData.canvas_height_pt / Math.max(1, pageData.canvas_width_pt);
    const targetW = containerH / aspectRatio;
    setZoom(Math.max(0.3, targetW / 720));
  };

  const [smartSnap, setSmartSnap] = useState<boolean>(true);
  const [hiddenCategories, setHiddenCategories] = useState<{ text: boolean; shapes: boolean; images: boolean }>({ text: false, shapes: false, images: false });
  const [hiddenComponentIds, setHiddenComponentIds] = useState<Set<string>>(new Set());
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);
  const [hoveredComponentId, setHoveredComponentId] = useState<string | null>(null);
  const [activeSidebarTab, setActiveSidebarTab] = useState<"marked" | "layers">("marked");

  // Resize & Move State for Marked Regions
  const [resizingMark, setResizingMark] = useState<{
    regionId: string;
    handle: "nw" | "ne" | "sw" | "se" | "n" | "s" | "w" | "e";
    startX: number;
    startY: number;
    origLeft: number;
    origTop: number;
    origRight: number;
    origBottom: number;
  } | null>(null);

  const [movingMark, setMovingMark] = useState<{
    regionId: string;
    startX: number;
    startY: number;
    origLeft: number;
    origTop: number;
    origRight: number;
    origBottom: number;
  } | null>(null);

  const selectedComponent = (selectedComponentId && !hiddenComponentIds.has(selectedComponentId))
    ? pageData?.components.find(c => c.id === selectedComponentId) || null
    : null;

  const toggleComponentVisibility = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setHiddenComponentIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    // Remove active selection border immediately if hiding this component
    if (selectedComponentId === id) {
      setSelectedComponentId(null);
    }
  };

  const toggleCategoryVisibility = (cat: "text" | "shapes" | "images") => {
    setHiddenCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  // Magnetic edge snapping helper for resize and move
  const snapCoordinateToNearbyEdges = (coord: number, isVertical: boolean): number => {
    if (!smartSnap || !pageData || !pageData.components.length) return coord;
    const SNAP_DISTANCE = 6; // 6pt magnetic threshold
    let bestSnap = coord;
    let minDiff = SNAP_DISTANCE + 1;

    for (const comp of pageData.components) {
      if (hiddenComponentIds.has(comp.id)) continue;
      if (comp.type === "text" && hiddenCategories.text) continue;
      if (comp.type === "path" && hiddenCategories.shapes) continue;
      if (comp.type === "image" && hiddenCategories.images) continue;

      const [cl, ct, cr, cb] = comp.bbox;
      if (isVertical) {
        const diffT = Math.abs(coord - ct);
        if (diffT < minDiff) { minDiff = diffT; bestSnap = ct; }
        const diffB = Math.abs(coord - cb);
        if (diffB < minDiff) { minDiff = diffB; bestSnap = cb; }
      } else {
        const diffL = Math.abs(coord - cl);
        if (diffL < minDiff) { minDiff = diffL; bestSnap = cl; }
        const diffR = Math.abs(coord - cr);
        if (diffR < minDiff) { minDiff = diffR; bestSnap = cr; }
      }
    }

    return minDiff <= SNAP_DISTANCE ? Math.round(bestSnap * 10) / 10 : Math.round(coord * 10) / 10;
  };

  // Compute smart magnetic snapping: tight-fit directly to visible selected components and eliminate empty whitespace
  const computeSmartSnappedBounds = (rawL: number, rawT: number, rawR: number, rawB: number) => {
    if (!smartSnap || !pageData || !pageData.components.length) {
      return { left: rawL, top: rawT, right: rawR, bottom: rawB };
    }

    const rawW = rawR - rawL;
    const rawH = rawB - rawT;
    const rawArea = rawW * rawH;
    if (rawArea <= 0.01) return { left: rawL, top: rawT, right: rawR, bottom: rawB };

    const matchedComps: Array<{ bbox: [number, number, number, number] }> = [];

    for (const comp of pageData.components) {
      // If component or its layer is hidden (peeled away), ignore it completely!
      if (hiddenComponentIds.has(comp.id)) continue;
      if (comp.type === "text" && hiddenCategories.text) continue;
      if (comp.type === "path" && hiddenCategories.shapes) continue;
      if (comp.type === "image" && hiddenCategories.images) continue;

      const [cl, ct, cr, cb] = comp.bbox;
      const cw = cr - cl;
      const ch = cb - ct;
      const compArea = cw * ch;
      if (compArea <= 0.001) continue;

      // Ignore full-page background container
      if (cw >= pageData.canvas_width_pt * 0.94 && ch >= pageData.canvas_height_pt * 0.94) {
        continue;
      }

      // Intersection calculation
      const il = Math.max(rawL, cl);
      const it = Math.max(rawT, ct);
      const ir = Math.min(rawR, cr);
      const ib = Math.min(rawB, cb);

      if (ir > il && ib > it) {
        const interArea = (ir - il) * (ib - it);
        const compOverlap = interArea / compArea; // How much of the component did the user cover?

        // STRICT INTENT CHECK:
        // A component is selected if the user covered at least 35% of THAT component.
        // If the component is a large parent container (area > rawArea * 2.5), require user to have covered at least 60% of it,
        // so selecting a small icon (like WhatsApp) never triggers an enclosing giant parent card!
        const isMuchBiggerContainer = compArea > rawArea * 2.5;
        const requiredOverlap = isMuchBiggerContainer ? 0.60 : 0.35;

        if (compOverlap >= requiredOverlap) {
          matchedComps.push(comp);
        }
      }
    }

    // If components were selected, TIGHT-FIT directly to their exact union bounding box (no empty space!)
    if (matchedComps.length > 0) {
      let minL = matchedComps[0].bbox[0];
      let minT = matchedComps[0].bbox[1];
      let maxR = matchedComps[0].bbox[2];
      let maxB = matchedComps[0].bbox[3];

      for (let i = 1; i < matchedComps.length; i++) {
        const [cl, ct, cr, cb] = matchedComps[i].bbox;
        minL = Math.min(minL, cl);
        minT = Math.min(minT, ct);
        maxR = Math.max(maxR, cr);
        maxB = Math.max(maxB, cb);
      }

      return {
        left: Math.round(minL * 10) / 10,
        top: Math.round(minT * 10) / 10,
        right: Math.round(maxR * 10) / 10,
        bottom: Math.round(maxB * 10) / 10,
      };
    }

    // Fallback if user dragged over pure blank area
    return {
      left: Math.round(rawL * 10) / 10,
      top: Math.round(rawT * 10) / 10,
      right: Math.round(rawR * 10) / 10,
      bottom: Math.round(rawB * 10) / 10,
    };
  };

  // Convert mouse event to top-down PDF points
  const clientToPdfCoords = useCallback((clientX: number, clientY: number) => {
    if (!svgOverlayRef.current || !pageData) return null;
    const rect = svgOverlayRef.current.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;

    const relX = (clientX - rect.left) / rect.width;
    const relY = (clientY - rect.top) / rect.height;

    return {
      x: Math.max(0, Math.min(pageData.canvas_width_pt, relX * pageData.canvas_width_pt)),
      y: Math.max(0, Math.min(pageData.canvas_height_pt, relY * pageData.canvas_height_pt)),
    };
  }, [pageData]);

  const startResize = (region: MarkedRegion, handle: "nw" | "ne" | "sw" | "se" | "n" | "s" | "w" | "e", e: React.PointerEvent) => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    const pt = clientToPdfCoords(e.clientX, e.clientY);
    if (!pt) return;
    setSelectedMarkId(region.id);
    setResizingMark({
      regionId: region.id,
      handle,
      startX: pt.x,
      startY: pt.y,
      origLeft: region.left,
      origTop: region.top,
      origRight: region.right,
      origBottom: region.bottom,
    });
  };

  const startMove = (region: MarkedRegion, e: React.PointerEvent) => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    const pt = clientToPdfCoords(e.clientX, e.clientY);
    if (!pt) return;
    setSelectedMarkId(region.id);
    setMovingMark({
      regionId: region.id,
      startX: pt.x,
      startY: pt.y,
      origLeft: region.left,
      origTop: region.top,
      origRight: region.right,
      origBottom: region.bottom,
    });
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    if (activeSidebarTab === "layers") {
      // In Layer Peeler tab, canvas clicks select layers, not drag marker
      return;
    }
    const pt = clientToPdfCoords(e.clientX, e.clientY);
    if (!pt) return;

    // Capture pointer
    (e.target as Element).setPointerCapture(e.pointerId);
    setActiveDrawing({
      startX: pt.x,
      startY: pt.y,
      currentX: pt.x,
      currentY: pt.y,
    });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const pt = clientToPdfCoords(e.clientX, e.clientY);
    if (!pt) return;

    // 1. Resizing Marked Region
    if (resizingMark) {
      const dx = pt.x - resizingMark.startX;
      const dy = pt.y - resizingMark.startY;
      let newL = resizingMark.origLeft;
      let newT = resizingMark.origTop;
      let newR = resizingMark.origRight;
      let newB = resizingMark.origBottom;

      const { handle } = resizingMark;
      if (handle === "nw" || handle === "w" || handle === "sw") {
        newL = Math.min(snapCoordinateToNearbyEdges(resizingMark.origLeft + dx, false), newR - 5);
      }
      if (handle === "ne" || handle === "e" || handle === "se") {
        newR = Math.max(snapCoordinateToNearbyEdges(resizingMark.origRight + dx, false), newL + 5);
      }
      if (handle === "nw" || handle === "n" || handle === "ne") {
        newT = Math.min(snapCoordinateToNearbyEdges(resizingMark.origTop + dy, true), newB - 5);
      }
      if (handle === "sw" || handle === "s" || handle === "se") {
        newB = Math.max(snapCoordinateToNearbyEdges(resizingMark.origBottom + dy, true), newT + 5);
      }

      setMarkedRegions(prev => prev.map(r => r.id === resizingMark.regionId ? {
        ...r,
        left: Math.round(newL * 10) / 10,
        top: Math.round(newT * 10) / 10,
        right: Math.round(newR * 10) / 10,
        bottom: Math.round(newB * 10) / 10,
      } : r));
      return;
    }

    // 2. Moving Marked Region
    if (movingMark && pageData) {
      const dx = pt.x - movingMark.startX;
      const dy = pt.y - movingMark.startY;
      const w = movingMark.origRight - movingMark.origLeft;
      const h = movingMark.origBottom - movingMark.origTop;

      let newL = snapCoordinateToNearbyEdges(movingMark.origLeft + dx, false);
      let newT = snapCoordinateToNearbyEdges(movingMark.origTop + dy, true);

      newL = Math.max(0, Math.min(pageData.canvas_width_pt - w, newL));
      newT = Math.max(0, Math.min(pageData.canvas_height_pt - h, newT));

      setMarkedRegions(prev => prev.map(r => r.id === movingMark.regionId ? {
        ...r,
        left: Math.round(newL * 10) / 10,
        top: Math.round(newT * 10) / 10,
        right: Math.round((newL + w) * 10) / 10,
        bottom: Math.round((newT + h) * 10) / 10,
      } : r));
      return;
    }

    // 3. Active New Drag Drawing
    if (activeDrawing) {
      setActiveDrawing(prev => prev ? { ...prev, currentX: pt.x, currentY: pt.y } : null);
    }
  };

  const handlePointerUp = () => {
    if (resizingMark) {
      setResizingMark(null);
    }
    if (movingMark) {
      setMovingMark(null);
    }

    if (activeDrawing && pageData) {
      const endX = activeDrawing.currentX;
      const endY = activeDrawing.currentY;

      const rawLeft = Math.min(activeDrawing.startX, endX);
      const rawTop = Math.min(activeDrawing.startY, endY);
      const rawRight = Math.max(activeDrawing.startX, endX);
      const rawBottom = Math.max(activeDrawing.startY, endY);

      const rawW = rawRight - rawLeft;
      const rawH = rawBottom - rawTop;

      // Only create marked region if size is deliberate (>= 3pt)
      if (rawW >= 3 && rawH >= 3) {
        const snapped = computeSmartSnappedBounds(rawLeft, rawTop, rawRight, rawBottom);
        const newId = `mark_${Date.now()}_${markedRegions.length + 1}`;
        const newRegion: MarkedRegion = {
          id: newId,
          page: targetPage,
          left: snapped.left,
          top: snapped.top,
          right: snapped.right,
          bottom: snapped.bottom,
        };
        setMarkedRegions(prev => [...prev, newRegion]);
        setSelectedMarkId(newId);
      }

      setActiveDrawing(null);
    }
  };

  // Instant Click-to-Mark component
  const handleComponentClick = (comp: PDFComponent, e: React.MouseEvent) => {
    e.stopPropagation();
    const [cl, ct, cr, cb] = comp.bbox;
    const newId = `mark_${Date.now()}_${markedRegions.length + 1}`;
    const newRegion: MarkedRegion = {
      id: newId,
      page: targetPage,
      left: Math.round(cl * 10) / 10,
      top: Math.round(ct * 10) / 10,
      right: Math.round(cr * 10) / 10,
      bottom: Math.round(cb * 10) / 10,
    };
    setMarkedRegions(prev => [...prev, newRegion]);
    setSelectedMarkId(newId);
  };

  const handleDeleteMark = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setMarkedRegions(prev => prev.filter(r => r.id !== id));
    if (selectedMarkId === id) setSelectedMarkId(null);
  };

  const handleClearAll = () => {
    setMarkedRegions([]);
    setSelectedMarkId(null);
  };

  const handleConfirmAndProceed = () => {
    onConfirm(markedRegions);
  };

  const textComponents = pageData?.components.filter(c => c.type === "text") || [];
  const imageComponents = pageData?.components.filter(c => c.type === "image") || [];
  const pathComponents = pageData?.components.filter(c => c.type === "path") || [];

  const ptWidth = Math.round(pageData?.canvas_width_pt || 0);
  const ptHeight = Math.round(pageData?.canvas_height_pt || 0);
  const baseWidthPx = 720; // Full standard 720px email width
  const renderedWidthPx = Math.round(baseWidthPx * zoom);
  const aspectRatio = (pageData?.canvas_height_pt && pageData?.canvas_width_pt && pageData.canvas_width_pt > 0)
    ? (pageData.canvas_height_pt / pageData.canvas_width_pt)
    : 1.4;
  const renderedHeightPx = Math.round(renderedWidthPx * aspectRatio);
  const unitScale = ((pageData?.canvas_width_pt || 600) / Math.max(1, renderedWidthPx));

  return (
    <div className="ios-modal-overlay" onClick={onClose} style={{ zIndex: 9999, background: "rgba(15, 23, 42, 0.45)", backdropFilter: "blur(8px)" }}>
      <div 
        className="ios-glass-modal marking-studio-light-modal" 
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "96vw",
          maxWidth: "1480px",
          height: "94vh",
          maxHeight: "960px",
          display: "flex",
          flexDirection: "column",
          padding: 0,
          overflow: "hidden",
          borderRadius: "20px",
          background: "#ffffff",
          border: "1px solid rgba(226, 232, 240, 0.9)",
          boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(0, 0, 0, 0.05)",
          color: "#0f172a",
        }}
      >
        {/* Top Header Bar - Clean Light Theme */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 24px",
          background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
          borderBottom: "1px solid #e2e8f0",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div style={{
              width: "38px",
              height: "38px",
              borderRadius: "10px",
              background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              boxShadow: "0 4px 12px rgba(79, 70, 229, 0.25)",
            }}>
              <Crop size={20} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <h3 style={{ fontSize: "17px", fontWeight: "700", color: "#0f172a", margin: 0, letterSpacing: "-0.01em" }}>
                  PDF Marking & Component Inspector
                </h3>
                <span style={{
                  fontSize: "11px",
                  fontWeight: "700",
                  padding: "3px 9px",
                  borderRadius: "6px",
                  background: "#e0e7ff",
                  color: "#4338ca",
                  border: "1px solid #c7d2fe",
                }}>
                  Page {targetPage} of {pageData?.total_pages || 1}
                </span>
                {ptWidth > 0 && (
                  <span style={{
                    fontSize: "11px",
                    fontWeight: "600",
                    padding: "3px 9px",
                    borderRadius: "6px",
                    background: "#f1f5f9",
                    color: "#475569",
                    border: "1px solid #e2e8f0",
                  }}>
                    Email Width: {renderedWidthPx}px ({ptWidth} × {ptHeight} pt)
                  </span>
                )}
              </div>
              <p style={{ fontSize: "12px", color: "#64748b", margin: "3px 0 0 0" }}>
                Review detected text & images, or <strong>drag on the canvas</strong> to mark sections to extract as clean, isolated <strong>transparent PNGs</strong>.
              </p>
            </div>
          </div>

          {/* Top Right Zoom Controls */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              background: "#f1f5f9",
              borderRadius: "8px",
              padding: "3px 4px",
              border: "1px solid #e2e8f0",
              gap: "2px",
            }}>
              <button 
                type="button"
                onClick={() => setZoom(prev => Math.max(0.5, prev - 0.1))}
                style={{ background: "transparent", border: "none", color: "#475569", padding: "5px 7px", cursor: "pointer", borderRadius: "6px" }}
                title="Zoom Out"
              >
                <ZoomOut size={15} />
              </button>
              <span style={{ fontSize: "12px", fontWeight: "700", color: "#334155", minWidth: "48px", textAlign: "center" }}>
                {Math.round(zoom * 100)}%
              </span>
              <button 
                type="button"
                onClick={() => setZoom(prev => Math.min(2.5, prev + 0.1))}
                style={{ background: "transparent", border: "none", color: "#475569", padding: "5px 7px", cursor: "pointer", borderRadius: "6px" }}
                title="Zoom In"
              >
                <ZoomIn size={15} />
              </button>
              <div style={{ width: "1px", height: "16px", background: "#cbd5e1", margin: "0 2px" }}></div>
              <button 
                type="button"
                onClick={handleFitWidth}
                style={{
                  background: "#ffffff",
                  border: "1px solid #cbd5e1",
                  color: "#4338ca",
                  fontSize: "11px",
                  fontWeight: "700",
                  padding: "4px 8px",
                  cursor: "pointer",
                  borderRadius: "5px",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                }}
                title="Fit Width (Standard Full Email View)"
              >
                Fit Width
              </button>
              <button 
                type="button"
                onClick={() => setZoom(1.0)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#64748b",
                  fontSize: "11px",
                  fontWeight: "600",
                  padding: "4px 8px",
                  cursor: "pointer",
                  borderRadius: "5px",
                }}
                title="Reset to 720px 100%"
              >
                100% (720px)
              </button>
              <button 
                type="button"
                onClick={handleFitHeight}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#64748b",
                  fontSize: "11px",
                  fontWeight: "600",
                  padding: "4px 8px",
                  cursor: "pointer",
                  borderRadius: "5px",
                }}
                title="Fit Full Height"
              >
                Fit Height
              </button>
            </div>

            <button 
              type="button" 
              onClick={onClose}
              style={{
                width: "34px",
                height: "34px",
                borderRadius: "8px",
                background: "#f1f5f9",
                border: "1px solid #e2e8f0",
                color: "#64748b",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              title="Close modal"
            >
              <X size={17} />
            </button>
          </div>
        </div>

        {/* Toolbar & Layer Filter Toggles */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 24px",
          background: "#f8fafc",
          borderBottom: "1px solid #e2e8f0",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "11.5px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Component Overlays:
            </span>

            {/* Text Toggle */}
            <button
              type="button"
              onClick={() => setShowTextOverlay(!showTextOverlay)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "5px 12px",
                borderRadius: "7px",
                fontSize: "12px",
                fontWeight: "600",
                background: showTextOverlay ? "#eff6ff" : "#ffffff",
                color: showTextOverlay ? "#2563eb" : "#94a3b8",
                border: showTextOverlay ? "1px solid #bfdbfe" : "1px solid #e2e8f0",
                cursor: "pointer",
                transition: "all 0.15s ease",
                boxShadow: showTextOverlay ? "0 1px 3px rgba(37, 99, 235, 0.1)" : "none",
              }}
            >
              <Type size={13} />
              <span>Text ({textComponents.length})</span>
              {showTextOverlay ? <Eye size={12} /> : <EyeOff size={12} />}
            </button>

            {/* Image Toggle */}
            <button
              type="button"
              onClick={() => setShowImageOverlay(!showImageOverlay)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "5px 12px",
                borderRadius: "7px",
                fontSize: "12px",
                fontWeight: "600",
                background: showImageOverlay ? "#ecfdf5" : "#ffffff",
                color: showImageOverlay ? "#059669" : "#94a3b8",
                border: showImageOverlay ? "1px solid #a7f3d0" : "1px solid #e2e8f0",
                cursor: "pointer",
                transition: "all 0.15s ease",
                boxShadow: showImageOverlay ? "0 1px 3px rgba(5, 150, 105, 0.1)" : "none",
              }}
            >
              <ImageIcon size={13} />
              <span>Images ({imageComponents.length})</span>
              {showImageOverlay ? <Eye size={12} /> : <EyeOff size={12} />}
            </button>

            {/* Shape Toggle */}
            <button
              type="button"
              onClick={() => setShowPathOverlay(!showPathOverlay)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "5px 12px",
                borderRadius: "7px",
                fontSize: "12px",
                fontWeight: "600",
                background: showPathOverlay ? "#fffbeb" : "#ffffff",
                color: showPathOverlay ? "#d97706" : "#94a3b8",
                border: showPathOverlay ? "1px solid #fde68a" : "1px solid #e2e8f0",
                cursor: "pointer",
                transition: "all 0.15s ease",
                boxShadow: showPathOverlay ? "0 1px 3px rgba(217, 119, 6, 0.1)" : "none",
              }}
            >
              <Square size={13} />
              <span>Shapes & Cards ({pathComponents.length})</span>
              {showPathOverlay ? <Eye size={12} /> : <EyeOff size={12} />}
            </button>

            <div style={{ width: "1px", height: "18px", background: "#cbd5e1", margin: "0 4px" }}></div>

            {/* Smart Magnetic Snap Toggle */}
            <button
              type="button"
              onClick={() => setSmartSnap(!smartSnap)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "5px 12px",
                borderRadius: "7px",
                fontSize: "12px",
                fontWeight: "700",
                background: smartSnap ? "#f5f3ff" : "#ffffff",
                color: smartSnap ? "#7c3aed" : "#94a3b8",
                border: smartSnap ? "1px solid #c4b5fd" : "1px solid #e2e8f0",
                cursor: "pointer",
                transition: "all 0.15s ease",
                boxShadow: smartSnap ? "0 1px 4px rgba(124, 58, 237, 0.2)" : "none",
              }}
              title="Automatically snaps & expands drag selections to enclose entire card containers & graphics"
            >
              <span>🧲 Smart Snap: {smartSnap ? "Active (Auto-Enclose)" : "Off"}</span>
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{
              fontSize: "12px",
              color: "#7c3aed",
              fontWeight: "600",
              background: "#f5f3ff",
              padding: "4px 12px",
              borderRadius: "6px",
              border: "1px solid #ddd6fe",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#7c3aed" }}></span>
              Drag or Click any component to mark
            </span>
          </div>
        </div>

        {/* Modal Center Body: Canvas + Right Sidebar */}
        <div style={{ display: "flex", flex: "1 1 auto", minHeight: 0, overflow: "hidden" }}>
          {/* Main Interactive Document Canvas Area */}
          <div 
            ref={canvasContainerRef}
            style={{
              flex: "1 1 auto",
              minWidth: 0,
              background: "#e2e8f0",
              overflow: "auto",
              display: "flex",
              justifyContent: "center",
              alignItems: "flex-start",
              padding: "36px",
              position: "relative",
            }}
          >
            {loading ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "#64748b", gap: "12px" }}>
                <RefreshCw className="animate-spin" size={32} color="#4f46e5" />
                <span style={{ fontSize: "14px", fontWeight: "600" }}>Analyzing PDF document components...</span>
              </div>
            ) : pageData ? (
              <div
                style={{
                  position: "relative",
                  width: `${renderedWidthPx}px`,
                  height: `${renderedHeightPx}px`,
                  boxShadow: "0 20px 45px -10px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.08)",
                  borderRadius: "6px",
                  overflow: "hidden",
                  userSelect: "none",
                  cursor: "crosshair",
                  background: "#ffffff",
                }}
              >
                {/* 1. Underlying Rendered High-Res PDF Page Image */}
                {pageData.preview_image_path ? (
                  <img
                    src={`/pkg/${encodeURIComponent(pageData.preview_image_path)}`}
                    alt={`PDF Page ${targetPage}`}
                    draggable={false}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: "100%",
                      display: "block",
                      pointerEvents: "none",
                    }}
                  />
                ) : (
                  <div style={{ width: "100%", height: "100%", background: "#ffffff" }} />
                )}

                {/* 2. Interactive SVG Component & Marked Regions Overlay */}
                <svg
                  ref={svgOverlayRef}
                  viewBox={`0 0 ${pageData.canvas_width_pt} ${pageData.canvas_height_pt}`}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    zIndex: 10,
                  }}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                >
                  {/* Shapes / Cards Layer */}
                  {showPathOverlay && !hiddenCategories.shapes && pathComponents.map((comp) => {
                    if (hiddenComponentIds.has(comp.id)) return null;
                    const [l, t, r, b] = comp.bbox;
                    const w = r - l;
                    const h = b - t;
                    const isSelected = selectedComponentId === comp.id && !hiddenComponentIds.has(comp.id);
                    const isHovered = hoveredComponentId === comp.id && activeSidebarTab === "layers" && !isSelected;
                    return (
                      <g key={comp.id}>
                        <rect
                          x={l}
                          y={t}
                          width={w}
                          height={h}
                          fill={isSelected ? "rgba(2, 132, 199, 0.22)" : isHovered ? "rgba(14, 165, 233, 0.16)" : "rgba(245, 158, 11, 0.08)"}
                          stroke={isSelected ? "#0284c7" : isHovered ? "#0ea5e9" : "#d97706"}
                          strokeWidth={isSelected ? 2.5 : isHovered ? 1.8 : 1.0}
                          vectorEffect="non-scaling-stroke"
                          strokeDasharray={isSelected ? undefined : "4 3"}
                          rx={Math.max(0.1, 2 * unitScale)}
                          style={{
                            pointerEvents: activeSidebarTab === "layers" ? "auto" : "none",
                            cursor: activeSidebarTab === "layers" ? "pointer" : "crosshair",
                          }}
                          onPointerEnter={() => {
                            if (activeSidebarTab === "layers") {
                              setHoveredComponentId(comp.id);
                            }
                          }}
                          onPointerLeave={() => {
                            if (activeSidebarTab === "layers") {
                              setHoveredComponentId(null);
                            }
                          }}
                          onClick={(e) => {
                            if (activeSidebarTab === "layers") {
                              e.stopPropagation();
                              setSelectedComponentId(comp.id);
                            }
                          }}
                        />
                      </g>
                    );
                  })}

                  {/* Images Layer */}
                  {showImageOverlay && !hiddenCategories.images && imageComponents.map((comp) => {
                    if (hiddenComponentIds.has(comp.id)) return null;
                    const [l, t, r, b] = comp.bbox;
                    const w = r - l;
                    const h = b - t;
                    const isSelected = selectedComponentId === comp.id && !hiddenComponentIds.has(comp.id);
                    const isHovered = hoveredComponentId === comp.id && activeSidebarTab === "layers" && !isSelected;
                    return (
                      <g key={comp.id}>
                        <rect
                          x={l}
                          y={t}
                          width={w}
                          height={h}
                          fill={isSelected ? "rgba(2, 132, 199, 0.24)" : isHovered ? "rgba(14, 165, 233, 0.18)" : "rgba(16, 185, 129, 0.09)"}
                          stroke={isSelected ? "#0284c7" : isHovered ? "#0ea5e9" : "#059669"}
                          strokeWidth={isSelected ? 2.5 : isHovered ? 1.8 : 1.2}
                          vectorEffect="non-scaling-stroke"
                          rx={Math.max(0.1, 2 * unitScale)}
                          style={{
                            pointerEvents: activeSidebarTab === "layers" ? "auto" : "none",
                            cursor: activeSidebarTab === "layers" ? "pointer" : "crosshair",
                          }}
                          onPointerEnter={() => {
                            if (activeSidebarTab === "layers") {
                              setHoveredComponentId(comp.id);
                            }
                          }}
                          onPointerLeave={() => {
                            if (activeSidebarTab === "layers") {
                              setHoveredComponentId(null);
                            }
                          }}
                          onClick={(e) => {
                            if (activeSidebarTab === "layers") {
                              e.stopPropagation();
                              setSelectedComponentId(comp.id);
                            }
                          }}
                        />
                      </g>
                    );
                  })}

                  {/* Text Layer - Thin 1px non-scaling stroke */}
                  {showTextOverlay && !hiddenCategories.text && textComponents.map((comp) => {
                    if (hiddenComponentIds.has(comp.id)) return null;
                    const [l, t, r, b] = comp.bbox;
                    const w = r - l;
                    const h = b - t;
                    const isSelected = selectedComponentId === comp.id && !hiddenComponentIds.has(comp.id);
                    const isHovered = hoveredComponentId === comp.id && activeSidebarTab === "layers" && !isSelected;
                    return (
                      <g key={comp.id}>
                        <rect
                          x={l}
                          y={t}
                          width={w}
                          height={h}
                          fill={isSelected ? "rgba(2, 132, 199, 0.24)" : isHovered ? "rgba(14, 165, 233, 0.18)" : "rgba(59, 130, 246, 0.08)"}
                          stroke={isSelected ? "#0284c7" : isHovered ? "#0ea5e9" : "#2563eb"}
                          strokeWidth={isSelected ? 2.5 : isHovered ? 1.8 : 1.0}
                          vectorEffect="non-scaling-stroke"
                          rx={Math.max(0.05, 1.5 * unitScale)}
                          style={{
                            pointerEvents: activeSidebarTab === "layers" ? "auto" : "none",
                            cursor: activeSidebarTab === "layers" ? "pointer" : "crosshair",
                          }}
                          onPointerEnter={() => {
                            if (activeSidebarTab === "layers") {
                              setHoveredComponentId(comp.id);
                            }
                          }}
                          onPointerLeave={() => {
                            if (activeSidebarTab === "layers") {
                              setHoveredComponentId(null);
                            }
                          }}
                          onClick={(e) => {
                            if (activeSidebarTab === "layers") {
                              e.stopPropagation();
                              setSelectedComponentId(comp.id);
                            }
                          }}
                        />
                      </g>
                    );
                  })}

                  {/* Selected Layer Glowing Ring (In Layer Peeler Mode) */}
                  {activeSidebarTab === "layers" && selectedComponent && !hiddenComponentIds.has(selectedComponent.id) && (() => {
                    const [sl, st, sr, sb] = selectedComponent.bbox;
                    return (
                      <rect
                        x={sl}
                        y={st}
                        width={sr - sl}
                        height={sb - st}
                        fill="rgba(2, 132, 199, 0.22)"
                        stroke="#0284c7"
                        strokeWidth={2.5}
                        vectorEffect="non-scaling-stroke"
                        strokeDasharray="4 2"
                        rx={Math.max(0.1, 2.5 * unitScale)}
                        style={{ pointerEvents: "none" }}
                      />
                    );
                  })()}

                  {/* User Marked Image Regions (Purple Gradient & Dynamic Tag) */}
                  {markedRegions.map((region, idx) => {
                    const { left, top, right, bottom } = region;
                    const w = right - left;
                    const h = bottom - top;
                    const isSel = selectedMarkId === region.id;
                    const tagH = 18 * unitScale;
                    const tagW = Math.min(w, 130 * unitScale);
                    const tagFont = 9.5 * unitScale;
                    const delR = 8 * unitScale;
                    const delFont = 9 * unitScale;

                    return (
                      <g key={region.id} onClick={(e) => { e.stopPropagation(); setSelectedMarkId(region.id); }}>
                        {/* Background tint and drag-to-move body */}
                        <rect
                          x={left}
                          y={top}
                          width={w}
                          height={h}
                          fill={isSel ? "rgba(124, 58, 237, 0.28)" : "rgba(124, 58, 237, 0.16)"}
                          stroke="#7c3aed"
                          strokeWidth={isSel ? 2.5 : 1.8}
                          vectorEffect="non-scaling-stroke"
                          rx={Math.max(0.1, 3 * unitScale)}
                          style={{ pointerEvents: "auto", cursor: isSel ? "move" : "pointer" }}
                          onPointerDown={(e) => {
                            if (isSel) {
                              startMove(region, e);
                            } else {
                              setSelectedMarkId(region.id);
                            }
                          }}
                        />

                        {/* Top Badge: Marked Image #N */}
                        <rect
                          x={left}
                          y={Math.max(0, top - tagH)}
                          width={tagW}
                          height={tagH}
                          fill={isSel ? "#6d28d9" : "#7c3aed"}
                          rx={Math.max(0.1, 2 * unitScale)}
                          style={{ pointerEvents: "auto", cursor: isSel ? "move" : "pointer" }}
                          onPointerDown={(e) => {
                            if (isSel) {
                              startMove(region, e);
                            } else {
                              setSelectedMarkId(region.id);
                            }
                          }}
                        />
                        <text
                          x={left + (4 * unitScale)}
                          y={Math.max(0, top - (4 * unitScale))}
                          fill="#ffffff"
                          fontSize={tagFont}
                          fontWeight="bold"
                          fontFamily="sans-serif"
                          style={{ pointerEvents: "none" }}
                        >
                          ✦ Marked Image #{idx + 1}
                        </text>

                        {/* Delete Button (Circular badge on top right) */}
                        <circle
                          cx={right - delR}
                          cy={Math.max(delR, top - (delR * 0.5))}
                          r={delR}
                          fill="#ef4444"
                          style={{ pointerEvents: "auto", cursor: "pointer" }}
                          onClick={(e) => handleDeleteMark(region.id, e)}
                        />
                        <text
                          x={right - delR}
                          y={Math.max(delR, top - (delR * 0.5)) + (delFont * 0.35)}
                          fill="#ffffff"
                          fontSize={delFont}
                          fontWeight="900"
                          textAnchor="middle"
                          fontFamily="sans-serif"
                          style={{ pointerEvents: "none" }}
                        >
                          ✕
                        </text>

                        {/* 8 Resize Handles (Corner & Edge) when Selected */}
                        {isSel && (() => {
                          const handleSize = 6.5 * unitScale;
                          const handleHalf = handleSize / 2;
                          const midX = left + (w / 2);
                          const midY = top + (h / 2);

                          return (
                            <g>
                              {/* NW Handle */}
                              <rect
                                x={left - handleHalf}
                                y={top - handleHalf}
                                width={handleSize}
                                height={handleSize}
                                fill="#ffffff"
                                stroke="#7c3aed"
                                strokeWidth={2}
                                vectorEffect="non-scaling-stroke"
                                rx={1 * unitScale}
                                style={{ cursor: "nwse-resize", pointerEvents: "auto" }}
                                onPointerDown={(e) => startResize(region, "nw", e)}
                              />
                              {/* N Handle */}
                              <rect
                                x={midX - handleHalf}
                                y={top - handleHalf}
                                width={handleSize}
                                height={handleSize}
                                fill="#ffffff"
                                stroke="#7c3aed"
                                strokeWidth={2}
                                vectorEffect="non-scaling-stroke"
                                rx={1 * unitScale}
                                style={{ cursor: "ns-resize", pointerEvents: "auto" }}
                                onPointerDown={(e) => startResize(region, "n", e)}
                              />
                              {/* NE Handle */}
                              <rect
                                x={right - handleHalf}
                                y={top - handleHalf}
                                width={handleSize}
                                height={handleSize}
                                fill="#ffffff"
                                stroke="#7c3aed"
                                strokeWidth={2}
                                vectorEffect="non-scaling-stroke"
                                rx={1 * unitScale}
                                style={{ cursor: "nesw-resize", pointerEvents: "auto" }}
                                onPointerDown={(e) => startResize(region, "ne", e)}
                              />
                              {/* E Handle */}
                              <rect
                                x={right - handleHalf}
                                y={midY - handleHalf}
                                width={handleSize}
                                height={handleSize}
                                fill="#ffffff"
                                stroke="#7c3aed"
                                strokeWidth={2}
                                vectorEffect="non-scaling-stroke"
                                rx={1 * unitScale}
                                style={{ cursor: "ew-resize", pointerEvents: "auto" }}
                                onPointerDown={(e) => startResize(region, "e", e)}
                              />
                              {/* SE Handle */}
                              <rect
                                x={right - handleHalf}
                                y={bottom - handleHalf}
                                width={handleSize}
                                height={handleSize}
                                fill="#ffffff"
                                stroke="#7c3aed"
                                strokeWidth={2}
                                vectorEffect="non-scaling-stroke"
                                rx={1 * unitScale}
                                style={{ cursor: "nwse-resize", pointerEvents: "auto" }}
                                onPointerDown={(e) => startResize(region, "se", e)}
                              />
                              {/* S Handle */}
                              <rect
                                x={midX - handleHalf}
                                y={bottom - handleHalf}
                                width={handleSize}
                                height={handleSize}
                                fill="#ffffff"
                                stroke="#7c3aed"
                                strokeWidth={2}
                                vectorEffect="non-scaling-stroke"
                                rx={1 * unitScale}
                                style={{ cursor: "ns-resize", pointerEvents: "auto" }}
                                onPointerDown={(e) => startResize(region, "s", e)}
                              />
                              {/* SW Handle */}
                              <rect
                                x={left - handleHalf}
                                y={bottom - handleHalf}
                                width={handleSize}
                                height={handleSize}
                                fill="#ffffff"
                                stroke="#7c3aed"
                                strokeWidth={2}
                                vectorEffect="non-scaling-stroke"
                                rx={1 * unitScale}
                                style={{ cursor: "nesw-resize", pointerEvents: "auto" }}
                                onPointerDown={(e) => startResize(region, "sw", e)}
                              />
                              {/* W Handle */}
                              <rect
                                x={left - handleHalf}
                                y={midY - handleHalf}
                                width={handleSize}
                                height={handleSize}
                                fill="#ffffff"
                                stroke="#7c3aed"
                                strokeWidth={2}
                                vectorEffect="non-scaling-stroke"
                                rx={1 * unitScale}
                                style={{ cursor: "ew-resize", pointerEvents: "auto" }}
                                onPointerDown={(e) => startResize(region, "w", e)}
                              />
                            </g>
                          );
                        })()}
                      </g>
                    );
                  })}

                  {/* Active Drag Marker preview */}
                  {activeDrawing && (() => {
                    const l = Math.min(activeDrawing.startX, activeDrawing.currentX);
                    const t = Math.min(activeDrawing.startY, activeDrawing.currentY);
                    const r = Math.max(activeDrawing.startX, activeDrawing.currentX);
                    const b = Math.max(activeDrawing.startY, activeDrawing.currentY);
                    const tagH = 18 * unitScale;
                    const tagW = Math.min(r - l, 100 * unitScale);
                    const tagFont = 9 * unitScale;

                    return (
                      <g>
                        <rect
                          x={l}
                          y={t}
                          width={r - l}
                          height={b - t}
                          fill="rgba(124, 58, 237, 0.22)"
                          stroke="#7c3aed"
                          strokeWidth={2}
                          vectorEffect="non-scaling-stroke"
                          strokeDasharray="4 2"
                          rx={Math.max(0.1, 3 * unitScale)}
                        />
                        <rect
                          x={l}
                          y={Math.max(0, t - tagH)}
                          width={tagW}
                          height={tagH}
                          fill="#7c3aed"
                          rx={Math.max(0.1, 2 * unitScale)}
                        />
                        <text
                          x={l + (4 * unitScale)}
                          y={Math.max(0, t - (4 * unitScale))}
                          fill="#ffffff"
                          fontSize={tagFont}
                          fontWeight="bold"
                          fontFamily="sans-serif"
                        >
                          Marking Area...
                        </text>
                      </g>
                    );
                  })()}
                </svg>

              </div>
            ) : null}
          </div>

          {/* Right Sidebar: Inspection Summary, Layer Peeler & Marked Regions */}
          <div style={{
            width: "360px",
            flexShrink: 0,
            background: "#ffffff",
            borderLeft: "1px solid #e2e8f0",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}>
            {/* Sidebar Scrollable Body */}
            <div style={{ padding: "16px 20px", overflowY: "auto", flex: "1 1 auto" }}>
              {/* Tab Switcher: Marked Regions vs Layer Peeler */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "4px",
                background: "#f1f5f9",
                padding: "3px",
                borderRadius: "9px",
                marginBottom: "14px",
              }}>
                <button
                  type="button"
                  onClick={() => setActiveSidebarTab("marked")}
                  style={{
                    padding: "7px 10px",
                    borderRadius: "7px",
                    fontSize: "12px",
                    fontWeight: activeSidebarTab === "marked" ? "700" : "600",
                    background: activeSidebarTab === "marked" ? "#ffffff" : "transparent",
                    color: activeSidebarTab === "marked" ? "#7c3aed" : "#64748b",
                    border: "none",
                    cursor: "pointer",
                    boxShadow: activeSidebarTab === "marked" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                    transition: "all 0.15s ease",
                    whiteSpace: "nowrap",
                    textAlign: "center",
                  }}
                >
                  Marked Areas ({markedRegions.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSidebarTab("layers")}
                  style={{
                    padding: "7px 10px",
                    borderRadius: "7px",
                    fontSize: "12px",
                    fontWeight: activeSidebarTab === "layers" ? "700" : "600",
                    background: activeSidebarTab === "layers" ? "#ffffff" : "transparent",
                    color: activeSidebarTab === "layers" ? "#7c3aed" : "#64748b",
                    border: "none",
                    cursor: "pointer",
                    boxShadow: activeSidebarTab === "layers" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                    transition: "all 0.15s ease",
                    whiteSpace: "nowrap",
                    textAlign: "center",
                  }}
                >
                  Layer Peeler{hiddenComponentIds.size > 0 ? ` (${hiddenComponentIds.size})` : ""}
                </button>
              </div>

              {activeSidebarTab === "marked" ? (
                <>
                  {/* Component Stats Card */}
                  <div style={{
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "12px",
                    padding: "12px",
                    marginBottom: "16px",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                      <Layers size={15} color="#4f46e5" />
                      <span style={{ fontSize: "12.5px", fontWeight: "700", color: "#0f172a" }}>Detected Elements</span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", textAlign: "center" }}>
                      <div style={{ background: "#eff6ff", borderRadius: "8px", padding: "6px 4px", border: "1px solid #bfdbfe" }}>
                        <div style={{ fontSize: "15px", fontWeight: "700", color: "#1d4ed8" }}>{textComponents.length}</div>
                        <div style={{ fontSize: "10px", color: "#64748b", fontWeight: "600" }}>Text Spans</div>
                      </div>
                      <div style={{ background: "#ecfdf5", borderRadius: "8px", padding: "6px 4px", border: "1px solid #a7f3d0" }}>
                        <div style={{ fontSize: "15px", fontWeight: "700", color: "#047857" }}>{imageComponents.length}</div>
                        <div style={{ fontSize: "10px", color: "#64748b", fontWeight: "600" }}>Images</div>
                      </div>
                      <div style={{ background: "#fffbeb", borderRadius: "8px", padding: "6px 4px", border: "1px solid #fde68a" }}>
                        <div style={{ fontSize: "15px", fontWeight: "700", color: "#b45309" }}>{pathComponents.length}</div>
                        <div style={{ fontSize: "10px", color: "#64748b", fontWeight: "600" }}>Shapes</div>
                      </div>
                    </div>
                  </div>

                  {/* Marked Sections Header */}
                  <div style={{ marginBottom: "12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: "12.5px", fontWeight: "700", color: "#0f172a" }}>
                      Marked Image Sections ({markedRegions.length})
                    </span>
                    {markedRegions.length > 0 && (
                      <button
                        type="button"
                        onClick={handleClearAll}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "#ef4444",
                          fontSize: "11px",
                          fontWeight: "700",
                          cursor: "pointer",
                        }}
                      >
                        Clear All
                      </button>
                    )}
                  </div>

                  {markedRegions.length === 0 ? (
                    <div style={{
                      padding: "24px 16px",
                      borderRadius: "10px",
                      border: "1.5px dashed #cbd5e1",
                      background: "#f8fafc",
                      textAlign: "center",
                      color: "#64748b",
                      fontSize: "12px",
                    }}>
                      <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#f5f3ff", color: "#7c3aed", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px" }}>
                        <Crop size={18} />
                      </div>
                      <p style={{ margin: "0 0 4px 0", color: "#0f172a", fontWeight: "700" }}>No sections marked</p>
                      <span style={{ fontSize: "11.5px", lineHeight: "1.45", color: "#64748b" }}>
                        Drag on the document canvas to mark complex areas (badges, hero banners, artwork with text).
                      </span>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      {markedRegions.map((region, i) => {
                        const isSel = selectedMarkId === region.id;
                        const w = Math.round(region.right - region.left);
                        const h = Math.round(region.bottom - region.top);

                        return (
                          <div
                            key={region.id}
                            onClick={() => setSelectedMarkId(region.id)}
                            style={{
                              background: isSel ? "#f5f3ff" : "#f8fafc",
                              border: isSel ? "1.5px solid #7c3aed" : "1px solid #e2e8f0",
                              borderRadius: "10px",
                              padding: "10px 12px",
                              cursor: "pointer",
                              transition: "all 0.15s ease",
                              boxShadow: isSel ? "0 2px 8px rgba(124, 58, 237, 0.15)" : "none",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                              <span style={{ fontSize: "12px", fontWeight: "700", color: "#0f172a" }}>
                                Marked Section #{i + 1}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => handleDeleteMark(region.id, e)}
                                style={{ background: "transparent", border: "none", color: "#ef4444", cursor: "pointer", padding: "2px" }}
                                title="Delete marked area"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "#64748b" }}>
                              <span>Size: {w} × {h} pt</span>
                              <span>•</span>
                              <span style={{ color: "#7c3aed", fontWeight: "700" }}>Transparent PNG</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              ) : (
                /* Layer Peeler Tab */
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div style={{
                    background: "#f0fdf4",
                    border: "1px solid #bbf7d0",
                    borderRadius: "8px",
                    padding: "9px 11px",
                    fontSize: "11px",
                    color: "#166534",
                    lineHeight: "1.4",
                  }}>
                    Hover & click any layer on the PDF to <strong>select</strong> or <strong>peel/hide</strong> it.
                  </div>

                  {/* 1. Selected Layer Card */}
                  {selectedComponent && !hiddenComponentIds.has(selectedComponent.id) && (
                    <div style={{
                      background: "#f0f9ff",
                      border: "1.5px solid #0284c7",
                      borderRadius: "10px",
                      padding: "12px",
                      boxShadow: "0 2px 8px rgba(2, 132, 199, 0.15)",
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{
                            fontSize: "9px",
                            fontWeight: "700",
                            textTransform: "uppercase",
                            padding: "2px 5px",
                            borderRadius: "4px",
                            background: "#0284c7",
                            color: "#ffffff",
                          }}>
                            {selectedComponent.type}
                          </span>
                          <span style={{ fontSize: "12px", fontWeight: "700", color: "#0369a1" }}>
                            Selected on PDF
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedComponentId(null)}
                          style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: "13px", fontWeight: "700" }}
                          title="Deselect"
                        >
                          ✕
                        </button>
                      </div>
                      <div style={{ fontSize: "11px", color: "#334155", marginBottom: "10px", fontWeight: "500", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {selectedComponent.type === "text" ? (selectedComponent.text_content || "Text span") :
                         selectedComponent.type === "image" ? `Image (${selectedComponent.image_width || Math.round(selectedComponent.bbox[2]-selectedComponent.bbox[0])}×${selectedComponent.image_height || Math.round(selectedComponent.bbox[3]-selectedComponent.bbox[1])}px)` :
                         `Shape / Card (${Math.round(selectedComponent.bbox[2]-selectedComponent.bbox[0])}×${Math.round(selectedComponent.bbox[3]-selectedComponent.bbox[1])}pt)`}
                      </div>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <button
                          type="button"
                          onClick={() => handleComponentClick(selectedComponent, { stopPropagation: () => {} } as any)}
                          style={{
                            flex: 1,
                            padding: "7px 10px",
                            borderRadius: "7px",
                            background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
                            color: "#ffffff",
                            border: "none",
                            fontSize: "11.5px",
                            fontWeight: "700",
                            cursor: "pointer",
                            boxShadow: "0 2px 6px rgba(124, 58, 237, 0.25)",
                          }}
                        >
                          ✦ Mark as Image
                        </button>
                        <button
                          type="button"
                          onClick={(e) => toggleComponentVisibility(selectedComponent.id, e)}
                          style={{
                            padding: "7px 12px",
                            borderRadius: "7px",
                            background: "#fee2e2",
                            color: "#ef4444",
                            border: "1px solid #fecaca",
                            fontSize: "11.5px",
                            fontWeight: "600",
                            cursor: "pointer",
                          }}
                        >
                          Hide / Peel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 2. Hidden / Peeled Layers Section */}
                  <div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                      <span style={{ fontSize: "12px", fontWeight: "700", color: "#0f172a" }}>
                        Peeled / Hidden Layers ({hiddenComponentIds.size})
                      </span>
                      {hiddenComponentIds.size > 0 && (
                        <button
                          type="button"
                          onClick={() => setHiddenComponentIds(new Set())}
                          style={{
                            background: "#f1f5f9",
                            border: "1px solid #cbd5e1",
                            borderRadius: "6px",
                            padding: "3px 8px",
                            fontSize: "10.5px",
                            fontWeight: "700",
                            color: "#475569",
                            cursor: "pointer",
                          }}
                        >
                          ↺ Restore All
                        </button>
                      )}
                    </div>

                    {hiddenComponentIds.size === 0 ? (
                      <div style={{
                        padding: "20px 14px",
                        borderRadius: "8px",
                        border: "1.5px dashed #cbd5e1",
                        background: "#f8fafc",
                        textAlign: "center",
                        color: "#64748b",
                        fontSize: "11.5px",
                      }}>
                        <p style={{ margin: "0 0 4px 0", color: "#0f172a", fontWeight: "700" }}>No layers peeled yet</p>
                        <span>Click any layer on the PDF canvas to select it, then click "Hide / Peel" to uncover layers beneath.</span>
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "360px", overflowY: "auto" }}>
                        {pageData?.components.filter(c => hiddenComponentIds.has(c.id)).map((comp) => {
                          const [l, t, r, b] = comp.bbox;
                          const w = Math.round(r - l);
                          const h = Math.round(b - t);

                          return (
                            <div
                              key={comp.id}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                padding: "8px 10px",
                                borderRadius: "8px",
                                background: "#f8fafc",
                                border: "1px dashed #cbd5e1",
                                opacity: 0.85,
                                transition: "all 0.15s ease",
                              }}
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0, flex: "1 1 auto" }}>
                                <span style={{
                                  fontSize: "9px",
                                  fontWeight: "700",
                                  textTransform: "uppercase",
                                  padding: "2px 5px",
                                  borderRadius: "4px",
                                  background: comp.type === "text" ? "#eff6ff" : comp.type === "image" ? "#ecfdf5" : "#fffbeb",
                                  color: comp.type === "text" ? "#1d4ed8" : comp.type === "image" ? "#047857" : "#b45309",
                                  border: `1px solid ${comp.type === "text" ? "#bfdbfe" : comp.type === "image" ? "#a7f3d0" : "#fde68a"}`,
                                  flexShrink: 0,
                                }}>
                                  {comp.type}
                                </span>
                                <div style={{ minWidth: 0, flex: "1 1 auto" }}>
                                  <div style={{
                                    fontSize: "11px",
                                    fontWeight: "600",
                                    color: "#64748b",
                                    textDecoration: "line-through",
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                  }}>
                                    {comp.type === "text" ? (comp.text_content || "Text span") :
                                     comp.type === "image" ? `Image (${comp.image_width || w}×${comp.image_height || h}px)` :
                                     `Shape / Card (${w}×${h}pt)`}
                                  </div>
                                  <span style={{ fontSize: "10px", color: "#94a3b8" }}>
                                    {w}×{h}pt at ({Math.round(l)}, {Math.round(t)})
                                  </span>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={(e) => toggleComponentVisibility(comp.id, e)}
                                style={{
                                  background: "#f0fdf4",
                                  border: "1px solid #bbf7d0",
                                  color: "#16a34a",
                                  borderRadius: "6px",
                                  padding: "4px 8px",
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  fontSize: "10.5px",
                                  fontWeight: "700",
                                  flexShrink: 0,
                                }}
                                title="Restore/unhide this layer"
                              >
                                <Eye size={12} />
                                <span>Unhide</span>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Extraction Feature Notice */}
              <div style={{
                marginTop: "20px",
                padding: "12px",
                borderRadius: "8px",
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                display: "flex",
                gap: "10px",
              }}>
                <Info size={16} color="#16a34a" style={{ flexShrink: 0, marginTop: "2px" }} />
                <p style={{ fontSize: "11.5px", color: "#166534", margin: 0, lineHeight: "1.45" }}>
                  <strong>How it works:</strong> In the next step, marked regions are extracted as isolated <strong>transparent PNGs</strong>. All text inside these regions will be suppressed so you get clean, unbroken graphics.
                </p>
              </div>
            </div>

            {/* Sidebar Bottom Action Bar */}
            <div style={{
              padding: "16px 20px",
              borderTop: "1px solid #e2e8f0",
              background: "#ffffff",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}>
              <button
                type="button"
                onClick={handleConfirmAndProceed}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  borderRadius: "10px",
                  background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
                  border: "none",
                  color: "#ffffff",
                  fontSize: "13.5px",
                  fontWeight: "700",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  cursor: "pointer",
                  boxShadow: "0 4px 14px rgba(79, 70, 229, 0.3)",
                  transition: "all 0.15s ease",
                }}
              >
                <span>{markedRegions.length > 0 ? `Continue with ${markedRegions.length} Marked Areas` : "Continue to Extraction"}</span>
                <ChevronRight size={16} />
              </button>

              <button
                type="button"
                onClick={onClose}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  background: "transparent",
                  border: "none",
                  color: "#64748b",
                  fontSize: "12px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                Back to Selection
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
