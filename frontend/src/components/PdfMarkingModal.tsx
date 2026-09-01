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

  // Compute smart magnetic snapping: tight-fit directly to selected components and eliminate empty whitespace
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

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
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
    if (!activeDrawing) return;
    const pt = clientToPdfCoords(e.clientX, e.clientY);
    if (!pt) return;

    setActiveDrawing(prev => prev ? { ...prev, currentX: pt.x, currentY: pt.y } : null);
  };

  const handlePointerUp = () => {
    if (!activeDrawing || !pageData) return;
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
                  {showPathOverlay && pathComponents.map((comp) => {
                    const [l, t, r, b] = comp.bbox;
                    const w = r - l;
                    const h = b - t;
                    return (
                      <g key={comp.id}>
                        <rect
                          x={l}
                          y={t}
                          width={w}
                          height={h}
                          fill="rgba(245, 158, 11, 0.08)"
                          stroke="#d97706"
                          strokeWidth={1.0}
                          vectorEffect="non-scaling-stroke"
                          strokeDasharray="4 3"
                          rx={Math.max(0.1, 2 * unitScale)}
                          style={{ pointerEvents: "none" }}
                        />
                      </g>
                    );
                  })}

                  {/* Images Layer */}
                  {showImageOverlay && imageComponents.map((comp) => {
                    const [l, t, r, b] = comp.bbox;
                    const w = r - l;
                    const h = b - t;
                    return (
                      <g key={comp.id}>
                        <rect
                          x={l}
                          y={t}
                          width={w}
                          height={h}
                          fill="rgba(16, 185, 129, 0.09)"
                          stroke="#059669"
                          strokeWidth={1.2}
                          vectorEffect="non-scaling-stroke"
                          rx={Math.max(0.1, 2 * unitScale)}
                          style={{ pointerEvents: "none" }}
                        />
                      </g>
                    );
                  })}

                  {/* Text Layer - Thin 1px non-scaling stroke */}
                  {showTextOverlay && textComponents.map((comp) => {
                    const [l, t, r, b] = comp.bbox;
                    const w = r - l;
                    const h = b - t;
                    return (
                      <g key={comp.id}>
                        <rect
                          x={l}
                          y={t}
                          width={w}
                          height={h}
                          fill="rgba(59, 130, 246, 0.08)"
                          stroke="#2563eb"
                          strokeWidth={1.0}
                          vectorEffect="non-scaling-stroke"
                          rx={Math.max(0.05, 1.5 * unitScale)}
                          style={{ pointerEvents: "none" }}
                        />
                      </g>
                    );
                  })}

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
                        {/* Background tint */}
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
                          style={{ pointerEvents: "auto", cursor: "move" }}
                        />

                        {/* Top Badge Tag */}
                        <rect
                          x={left}
                          y={Math.max(0, top - tagH)}
                          width={tagW}
                          height={tagH}
                          fill="#7c3aed"
                          rx={Math.max(0.1, 2.5 * unitScale)}
                        />
                        <text
                          x={left + (4 * unitScale)}
                          y={Math.max(0, top - (5 * unitScale))}
                          fill="#ffffff"
                          fontSize={tagFont}
                          fontWeight="bold"
                          fontFamily="sans-serif"
                          style={{ pointerEvents: "none", userSelect: "none" }}
                        >
                          ✦ Marked Image #{idx + 1}
                        </text>

                        {/* Delete 'x' Button */}
                        <circle
                          cx={right - delR}
                          cy={Math.max(delR, top - delR)}
                          r={delR}
                          fill="#ef4444"
                          style={{ pointerEvents: "auto", cursor: "pointer" }}
                          onClick={(e) => handleDeleteMark(region.id, e)}
                        />
                        <text
                          x={right - delR}
                          y={Math.max(delR, top - (delR * 0.65))}
                          textAnchor="middle"
                          fill="#ffffff"
                          fontSize={delFont}
                          fontWeight="bold"
                          style={{ pointerEvents: "none" }}
                        >
                          ✕
                        </text>
                      </g>
                    );
                  })}

                  {/* Active In-Progress Drawing Shape */}
                  {activeDrawing && (() => {
                    const l = Math.min(activeDrawing.startX, activeDrawing.currentX);
                    const t = Math.min(activeDrawing.startY, activeDrawing.currentY);
                    const w = Math.abs(activeDrawing.currentX - activeDrawing.startX);
                    const h = Math.abs(activeDrawing.currentY - activeDrawing.startY);
                    const tagH = 16 * unitScale;
                    const tagW = Math.min(w, 110 * unitScale);
                    const tagFont = 9 * unitScale;

                    return (
                      <g>
                        <rect
                          x={l}
                          y={t}
                          width={w}
                          height={h}
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

          {/* Right Sidebar: Inspection Summary & Marked Region Management (Light Theme) */}
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
            <div style={{ padding: "20px", overflowY: "auto", flex: "1 1 auto" }}>
              {/* Component Stats Card */}
              <div style={{
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: "12px",
                padding: "14px",
                marginBottom: "18px",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                  <Layers size={16} color="#4f46e5" />
                  <span style={{ fontSize: "13px", fontWeight: "700", color: "#0f172a" }}>Detected Elements</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", textAlign: "center" }}>
                  <div style={{ background: "#eff6ff", borderRadius: "8px", padding: "8px 4px", border: "1px solid #bfdbfe" }}>
                    <div style={{ fontSize: "16px", fontWeight: "700", color: "#1d4ed8" }}>{textComponents.length}</div>
                    <div style={{ fontSize: "10px", color: "#64748b", fontWeight: "600" }}>Text Spans</div>
                  </div>
                  <div style={{ background: "#ecfdf5", borderRadius: "8px", padding: "8px 4px", border: "1px solid #a7f3d0" }}>
                    <div style={{ fontSize: "16px", fontWeight: "700", color: "#047857" }}>{imageComponents.length}</div>
                    <div style={{ fontSize: "10px", color: "#64748b", fontWeight: "600" }}>Images</div>
                  </div>
                  <div style={{ background: "#fffbeb", borderRadius: "8px", padding: "8px 4px", border: "1px solid #fde68a" }}>
                    <div style={{ fontSize: "16px", fontWeight: "700", color: "#b45309" }}>{pathComponents.length}</div>
                    <div style={{ fontSize: "10px", color: "#64748b", fontWeight: "600" }}>Shapes</div>
                  </div>
                </div>
              </div>

              {/* Marked Sections List */}
              <div style={{ marginBottom: "14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "13px", fontWeight: "700", color: "#0f172a" }}>
                    Marked Image Sections ({markedRegions.length})
                  </span>
                </div>
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
