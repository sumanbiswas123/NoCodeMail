import React, { useState, useEffect, useRef, useCallback } from "react";
import { 
  Pencil, 
  Monitor, 
  Smartphone, 
  ChevronDown, 
  Undo2, 
  Redo2, 
  Code2, 
  FileDown,
  Check,
  Copy,
  X
} from "lucide-react";
import { StyleInspector } from "../components/StyleInspector";
import { nativeIPC } from "../services/ipc";

interface Screen3Props {
  initialHtml: string;
  initialFileName: string;
  initialFilePath?: string;
  onBackToHome: () => void;
}

const DEFAULT_FALLBACK_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Email Campaign</title>
</head>
<body style="margin: 0; padding: 24px; background-color: #f1f5f9; font-family: Arial, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 32px; border-radius: 8px; border: 1px solid #e2e8f0;">
    <h1 style="margin: 0 0 16px 0; font-size: 28px; font-weight: 700; color: #0f172a; line-height: 1.3;">Welcome to your email</h1>
    <p style="margin: 0 0 20px 0; font-size: 15px; color: #475569; line-height: 1.6;">Click anywhere on this design to edit text directly or inspect and refine styling in the inspector on the right.</p>
    <a href="#" style="display: inline-block; background-color: #4f46e5; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px;">Get Started</a>
  </div>
</body>
</html>`;

export const Screen3Editor: React.FC<Screen3Props> = ({
  initialHtml,
  initialFileName,
  initialFilePath,
  onBackToHome,
}) => {
  const [fileName, setFileName] = useState(initialFileName || "campaign_v2.html");
  const [isEditingName, setIsEditingName] = useState(false);
  const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop");
  const [canvasWidth, setCanvasWidth] = useState("700px");
  const [isSaved, setIsSaved] = useState(true);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [rawCodeText, setRawCodeText] = useState("");
  const [codeCopied, setCodeCopied] = useState(false);

  // Folder path of the file on disk
  const rawFolder = initialFilePath && (initialFilePath.includes("/") || initialFilePath.includes("\\"))
    ? initialFilePath.replace(/[/\\][^/\\]+$/, "")
    : "";
  const fileFolder = rawFolder || localStorage.getItem("nocodemail_last_pkg_dir") || "";
  const normalizedFolder = fileFolder ? fileFolder.replace(/\\/g, "/") : "";
  const pkgPrefix = normalizedFolder ? `http://127.0.0.1:28941/pkg/${encodeURIComponent(normalizedFolder)}/` : "";

  const startHtml = initialHtml && initialHtml.trim() ? initialHtml : DEFAULT_FALLBACK_HTML;

  // History stack
  const [history, setHistory] = useState<string[]>([startHtml]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Selected DOM element state
  const [selectedDomElement, setSelectedDomElement] = useState<HTMLElement | null>(null);
  const [selectedTagName, setSelectedTagName] = useState<string>("div");
  const [selectionRect, setSelectionRect] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);

  // Inline CSS state for StyleInspector
  const [inlineStyles, setInlineStyles] = useState<Record<string, string>>({});

  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const isInternalUpdateRef = useRef<boolean>(false);
  const hasInitSelectionRef = useRef<boolean>(false);

  // Extract base URL for iframe head
  const getBaseUrl = useCallback(() => {
    if (!normalizedFolder) return "";
    return `http://127.0.0.1:28941/pkg/${encodeURIComponent(normalizedFolder)}/`;
  }, [normalizedFolder]);

  // Push new state to history
  const pushHistory = useCallback((newHtml: string) => {
    if (!newHtml) return;
    setHistory((prev) => {
      const updated = prev.slice(0, historyIndex + 1);
      if (updated[updated.length - 1] === newHtml) return prev;
      updated.push(newHtml);
      return updated;
    });
    setHistoryIndex((prev) => prev + 1);
    setIsSaved(false);
  }, [historyIndex]);

  // Extract styles helper
  const extractElementStyles = (el: HTMLElement) => {
    const stylesObj: Record<string, string> = {};
    for (let i = 0; i < el.style.length; i++) {
      const prop = el.style[i];
      stylesObj[prop] = el.style.getPropertyValue(prop);
    }

    const win = el.ownerDocument?.defaultView || window;
    const computed = win.getComputedStyle(el);
    const standardProps = [
      "color",
      "font-size",
      "font-weight",
      "font-family",
      "line-height",
      "margin",
      "padding",
      "background-color",
      "text-align",
      "border-radius",
    ];

    standardProps.forEach((prop) => {
      if (!stylesObj[prop]) {
        const val = computed.getPropertyValue(prop);
        if (val && val !== "rgba(0, 0, 0, 0)" && val !== "normal" && val !== "none") {
          stylesObj[prop] = val;
        }
      }
    });

    return stylesObj;
  };

  // Update selection bounding box relative to canvasContainerRef
  const updateSelectionOverlay = useCallback((el: HTMLElement | null) => {
    if (!el || !canvasContainerRef.current || !iframeRef.current) {
      setSelectionRect(null);
      return;
    }
    const containerRect = canvasContainerRef.current.getBoundingClientRect();
    const iframeRect = iframeRef.current.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();

    setSelectionRect({
      top: iframeRect.top - containerRect.top + canvasContainerRef.current.scrollTop + elRect.top,
      left: iframeRect.left - containerRect.left + canvasContainerRef.current.scrollLeft + elRect.left,
      width: elRect.width,
      height: elRect.height,
    });
  }, []);

  // Handler for selecting an element in the email canvas
  const handleSelectElement = useCallback((target: HTMLElement) => {
    if (!target) return;
    const doc = iframeRef.current?.contentDocument;
    if (!doc || target === doc.body || target === doc.documentElement) return;

    setSelectedDomElement(target);
    setSelectedTagName(target.tagName.toLowerCase());

    const styles = extractElementStyles(target);
    setInlineStyles(styles);
    updateSelectionOverlay(target);
  }, [updateSelectionOverlay]);

  // Adjust iframe height to fit its internal content accurately without runaway scrollHeight growth
  const autoResizeIframe = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe || !iframe.contentDocument) return;
    const doc = iframe.contentDocument;
    if (!doc.body) return;

    let maxBottom = 0;
    Array.from(doc.body.children).forEach((child) => {
      const el = child as HTMLElement;
      if (el.tagName.toLowerCase() === "script" || el.tagName.toLowerCase() === "style") return;
      const bottom = el.offsetTop + el.offsetHeight;
      if (bottom > maxBottom) maxBottom = bottom;
    });

    if (maxBottom <= 0) {
      const firstChild = doc.body.firstElementChild as HTMLElement | null;
      maxBottom = firstChild ? firstChild.offsetHeight : doc.body.scrollHeight;
    }

    const finalH = Math.max(Math.ceil(maxBottom) + 20, 450);
    iframe.style.height = `${finalH}px`;
  }, []);

  // Export clean HTML (strips <base> tag and editor attributes)
  const exportPristineHtml = useCallback((): string => {
    const iframe = iframeRef.current;
    if (!iframe || !iframe.contentDocument) {
      return history[historyIndex] || startHtml;
    }

    const doc = iframe.contentDocument;
    // Deep clone the document root in memory (< 1ms execution)
    const clone = doc.documentElement.cloneNode(true) as HTMLElement;

    // 1. Remove the injected runtime <base> tag
    const baseEl = clone.querySelector("base");
    if (baseEl) baseEl.remove();

    // 2. Remove all editor attributes
    clone.querySelectorAll("[contenteditable]").forEach((el) => {
      el.removeAttribute("contenteditable");
      el.removeAttribute("spellcheck");
    });

    let cleanHtml = `<!DOCTYPE html>\n${clone.outerHTML}`;
    if (pkgPrefix) {
      const escapedPrefix = pkgPrefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      cleanHtml = cleanHtml.replace(new RegExp(escapedPrefix + "assets/", "g"), "assets/");
      cleanHtml = cleanHtml.replace(new RegExp(escapedPrefix, "g"), "");
    }
    cleanHtml = cleanHtml.replace(/http:\/\/127\.0\.0\.1:28941\/pkg\/[^/]+\/assets\//g, "assets/");
    cleanHtml = cleanHtml.replace(/http:\/\/127\.0\.0\.1:28941\/pkg\/[^/]+\//g, "");

    return cleanHtml;
  }, [history, historyIndex, startHtml, pkgPrefix]);

  // Mount document into isolated Iframe with injected <base> tag
  useEffect(() => {
    if (isInternalUpdateRef.current) {
      isInternalUpdateRef.current = false;
      return;
    }

    const iframe = iframeRef.current;
    if (!iframe) return;

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;

    const currentHtml = history[historyIndex] || startHtml;
    const baseUrl = getBaseUrl();
    const baseTag = baseUrl ? `<base href="${baseUrl}">` : "";

    let preparedHtml = currentHtml;
    // 1. Rewrite absolute disk paths e.g. src="C:\Users\..." or src="C:/Users/..."
    preparedHtml = preparedHtml.replace(/src=["'](?:[a-zA-Z]:[/\\][^"']*[/\\]assets[/\\])([^"']+)["']/gi, (_m, fname) => {
      return pkgPrefix ? `src="${pkgPrefix}assets/${fname}"` : `src="/assets/${fname}"`;
    });
    // 2. Rewrite src="assets/..." or src="./assets/..."
    preparedHtml = preparedHtml.replace(/src=["'](?:\.\/)?assets\/([^"']+)["']/gi, (_m, fname) => {
      return pkgPrefix ? `src="${pkgPrefix}assets/${fname}"` : `src="/assets/${fname}"`;
    });
    // 3. Rewrite src="asset_..." or src="./asset_..."
    preparedHtml = preparedHtml.replace(/src=["'](?:\.\/)?(asset_[^"']+)["']/gi, (_m, fname) => {
      return pkgPrefix ? `src="${pkgPrefix}assets/${fname}"` : `src="/assets/${fname}"`;
    });
    // 4. Rewrite background-image URLs
    preparedHtml = preparedHtml.replace(/url\(['"]?(?:[a-zA-Z]:[/\\][^'")]+[/\\]assets[/\\])([^'")]+)['"]?\)/gi, (_m, fname) => {
      return pkgPrefix ? `url('${pkgPrefix}assets/${fname}')` : `url('/assets/${fname}')`;
    });
    preparedHtml = preparedHtml.replace(/url\(['"]?(?:\.\/)?assets\/([^'")]+)['"]?\)/gi, (_m, fname) => {
      return pkgPrefix ? `url('${pkgPrefix}assets/${fname}')` : `url('/assets/${fname}')`;
    });
    preparedHtml = preparedHtml.replace(/url\(['"]?(?:\.\/)?(asset_[^'")]+)['"]?\)/gi, (_m, fname) => {
      return pkgPrefix ? `url('${pkgPrefix}assets/${fname}')` : `url('/assets/${fname}')`;
    });

    if (preparedHtml.includes("<head>")) {
      preparedHtml = preparedHtml.replace("<head>", `<head>${baseTag}`);
    } else if (preparedHtml.includes("<html>")) {
      preparedHtml = preparedHtml.replace("<html>", `<html><head>${baseTag}</head>`);
    } else {
      preparedHtml = `<!DOCTYPE html><html><head><meta charset="utf-8">${baseTag}</head><body style="margin:0;padding:0;">${preparedHtml}</body></html>`;
    }

    doc.open();
    doc.write(preparedHtml);
    doc.close();

    // Enable inline contentEditable on text leaf elements
    const editableTags = ["h1", "h2", "h3", "h4", "h5", "h6", "p", "span", "a", "td", "li", "button", "b", "strong", "em", "div"];
    doc.querySelectorAll("*").forEach((node) => {
      const el = node as HTMLElement;
      if (editableTags.includes(el.tagName.toLowerCase())) {
        const hasBlockChildren = Array.from(el.children).some((c) =>
          ["div", "table", "p", "h1", "h2", "h3", "h4", "h5", "h6", "section"].includes(c.tagName.toLowerCase())
        );
        if (!hasBlockChildren) {
          el.contentEditable = "true";
          el.spellcheck = false;
        }
      }
    });

    // Auto-resize height once images finish layout
    autoResizeIframe();
    setTimeout(autoResizeIframe, 150);

    // Event listeners on iframe document
    const handleDocPointerDown = (e: MouseEvent) => {
      let target = e.target as HTMLElement | null;
      if (!target || target === doc.body || target === doc.documentElement) return;
      handleSelectElement(target);
    };

    const handleDocInput = () => {
      setIsSaved(false);
      autoResizeIframe();
      if (selectedDomElement) {
        updateSelectionOverlay(selectedDomElement);
      }
    };

    const handleDocBlur = () => {
      isInternalUpdateRef.current = true;
      pushHistory(exportPristineHtml());
    };

    doc.addEventListener("pointerdown", handleDocPointerDown, true);
    doc.addEventListener("click", handleDocPointerDown, true);
    doc.addEventListener("input", handleDocInput);
    doc.addEventListener("blur", handleDocBlur, true);

    // Auto select first element only on initial load
    if (!hasInitSelectionRef.current) {
      hasInitSelectionRef.current = true;
      const firstHeading = doc.querySelector("h1, h2, h3, p, a, div, img");
      if (firstHeading) {
        handleSelectElement(firstHeading as HTMLElement);
      }
    } else if (selectedDomElement) {
      updateSelectionOverlay(selectedDomElement);
    }

    return () => {
      doc.removeEventListener("pointerdown", handleDocPointerDown, true);
      doc.removeEventListener("click", handleDocPointerDown, true);
      doc.removeEventListener("input", handleDocInput);
      doc.removeEventListener("blur", handleDocBlur, true);
    };
  }, [historyIndex, startHtml, getBaseUrl, handleSelectElement, autoResizeIframe, pushHistory, exportPristineHtml]);

  // Keep selection overlay updated on scroll or resize
  useEffect(() => {
    const handleScrollOrResize = () => {
      if (selectedDomElement) {
        updateSelectionOverlay(selectedDomElement);
      }
    };
    const scrollContainer = canvasContainerRef.current;
    if (scrollContainer) {
      scrollContainer.addEventListener("scroll", handleScrollOrResize);
    }
    window.addEventListener("resize", handleScrollOrResize);
    return () => {
      if (scrollContainer) {
        scrollContainer.removeEventListener("scroll", handleScrollOrResize);
      }
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [selectedDomElement, updateSelectionOverlay]);

  // Style update handlers
  const handleUpdateStyle = (property: string, value: string) => {
    const updated = { ...inlineStyles, [property]: value };
    setInlineStyles(updated);

    if (selectedDomElement) {
      selectedDomElement.style.setProperty(property, value);
      updateSelectionOverlay(selectedDomElement);
      autoResizeIframe();
      setIsSaved(false);
      isInternalUpdateRef.current = true;
      pushHistory(exportPristineHtml());
    }
  };

  const handleRemoveStyle = (property: string) => {
    const updated = { ...inlineStyles };
    delete updated[property];
    setInlineStyles(updated);

    if (selectedDomElement) {
      selectedDomElement.style.removeProperty(property);
      updateSelectionOverlay(selectedDomElement);
      autoResizeIframe();
      setIsSaved(false);
      isInternalUpdateRef.current = true;
      pushHistory(exportPristineHtml());
    }
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setIsSaved(false);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setIsSaved(false);
    }
  };

  const handleSave = async () => {
    try {
      const fullHtml = exportPristineHtml();
      const saveTarget = initialFilePath || fileName;
      await nativeIPC.saveFile(saveTarget, fullHtml);
      setIsSaved(true);
    } catch (e) {
      console.error("Save error:", e);
    }
  };

  const handleOpenCodeView = () => {
    setRawCodeText(exportPristineHtml());
    setShowCodeModal(true);
  };

  const handleApplyCodeModal = () => {
    if (rawCodeText.trim()) {
      pushHistory(rawCodeText);
      setShowCodeModal(false);
    }
  };

  // Keyboard shortcut listeners (Ctrl+S, Ctrl+Z, Ctrl+Y) on both main window & iframe
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      if (cmdOrCtrl && (e.key === "s" || e.key === "S")) {
        e.preventDefault();
        e.stopPropagation();
        handleSave();
      } else if (cmdOrCtrl && (e.key === "z" || e.key === "Z")) {
        e.preventDefault();
        e.stopPropagation();
        handleUndo();
      } else if (cmdOrCtrl && (e.key === "y" || e.key === "Y")) {
        e.preventDefault();
        e.stopPropagation();
        handleRedo();
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);

    const iframeDoc = iframeRef.current?.contentDocument;
    const iframeWin = iframeRef.current?.contentWindow;
    if (iframeDoc) iframeDoc.addEventListener("keydown", handleKeyDown, true);
    if (iframeWin) iframeWin.addEventListener("keydown", handleKeyDown, true);

    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
      if (iframeDoc) iframeDoc.removeEventListener("keydown", handleKeyDown, true);
      if (iframeWin) iframeWin.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [historyIndex, history, fileName, initialFilePath]);

  // Drag resize handler for selected element (Smooth 60fps RAF, 0 DOM clone overhead during drag)
  const handleResizeMouseDown = (e: React.MouseEvent, handle: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!selectedDomElement || !selectionRect) return;

    const el = selectedDomElement;
    const startX = e.clientX;
    const startY = e.clientY;
    const startW = selectionRect.width;
    const startH = selectionRect.height;
    let finalW = startW;
    let finalH = startH;
    let rafId: number | null = null;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      moveEvent.preventDefault();
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      let newW = startW;
      let newH = startH;

      if (handle.includes("right") || handle.includes("e")) newW += deltaX;
      if (handle.includes("left") || handle.includes("w")) newW -= deltaX;
      if (handle.includes("bottom") || handle.includes("s")) newH += deltaY;
      if (handle.includes("top") || handle.includes("n")) newH -= deltaY;

      newW = Math.max(20, Math.round(newW));
      newH = Math.max(14, Math.round(newH));
      finalW = newW;
      finalH = newH;

      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        el.style.width = `${newW}px`;
        el.style.height = `${newH}px`;
        updateSelectionOverlay(el);
      });
    };

    const handleMouseUp = () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);

      // Commit to React state and push a single Undo history checkpoint
      el.style.width = `${finalW}px`;
      el.style.height = `${finalH}px`;
      setInlineStyles((prev) => ({
        ...prev,
        width: `${finalW}px`,
        height: `${finalH}px`,
      }));
      updateSelectionOverlay(el);
      autoResizeIframe();
      setIsSaved(false);
      isInternalUpdateRef.current = true;
      pushHistory(exportPristineHtml());
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: false });
    window.addEventListener("mouseup", handleMouseUp, { once: true });
  };

  return (
    <div className="screen3-container">
      {/* Top Navbar */}
      <header className="editor-top-nav">
        <div className="nav-left">
          <div className="brand-logo small" onClick={onBackToHome} style={{ cursor: "pointer" }}>
            <div className="logo-badge">N</div>
            <span className="logo-text">NoCodeMail</span>
          </div>

          <div className="filename-editor-wrapper">
            {isEditingName ? (
              <input
                type="text"
                className="filename-input"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                onBlur={() => setIsEditingName(false)}
                onKeyDown={(e) => e.key === "Enter" && setIsEditingName(false)}
                autoFocus
              />
            ) : (
              <div className="filename-display" onClick={() => setIsEditingName(true)}>
                <span>{fileName}</span>
                <Pencil size={13} className="pencil-icon" />
              </div>
            )}
          </div>
        </div>

        {/* Center Controls: Viewport, Width, Undo/Redo */}
        <div className="nav-center">
          <div className="viewport-toggle-group">
            <button
              className={`vp-btn ${viewMode === "desktop" ? "active" : ""}`}
              onClick={() => {
                setViewMode("desktop");
                setCanvasWidth("700px");
              }}
            >
              <Monitor size={14} />
              <span>Desktop</span>
            </button>
            <button
              className={`vp-btn ${viewMode === "mobile" ? "active" : ""}`}
              onClick={() => {
                setViewMode("mobile");
                setCanvasWidth("375px");
              }}
            >
              <Smartphone size={14} />
              <span>Mobile</span>
            </button>
          </div>

          <div className="width-dropdown">
            <span>{canvasWidth}</span>
            <ChevronDown size={13} />
          </div>

          <div className="undo-redo-group">
            <button
              className="icon-btn"
              onClick={handleUndo}
              disabled={historyIndex === 0}
              title="Undo (Ctrl+Z)"
            >
              <Undo2 size={16} />
            </button>
            <button
              className="icon-btn"
              onClick={handleRedo}
              disabled={historyIndex === history.length - 1}
              title="Redo (Ctrl+Y)"
            >
              <Redo2 size={16} />
            </button>
          </div>

          <div className="save-status-indicator">
            <button className="save-btn" onClick={handleSave}>
              <span className={`status-dot ${isSaved ? "saved" : "unsaved"}`}></span>
              <span>{isSaved ? "Saved" : "Save"}</span>
            </button>
          </div>
        </div>

        {/* Right Controls: Code & Export buttons */}
        <div className="nav-right">
          <button className="btn btn-secondary nav-action-btn" onClick={handleOpenCodeView} title="Code View">
            <Code2 size={16} />
            <span>Code</span>
          </button>
          <button className="btn btn-secondary nav-action-btn" onClick={handleSave} title="Export / Save HTML">
            <FileDown size={16} />
            <span>Export HTML</span>
          </button>
        </div>
      </header>

      {/* Main Workspace: Split Canvas & Inspector */}
      <div className="editor-workspace">
        {/* Left / Center Canvas Area */}
        <div className="canvas-scroll-area" ref={canvasContainerRef} style={{ position: "relative" }}>
          <div className="canvas-width-indicator">
            <div className="indicator-line"></div>
            <span className="indicator-text">{canvasWidth}</span>
            <div className="indicator-line"></div>
          </div>

          {/* Email Iframe Sandbox Card */}
          <div
            className="email-iframe-wrapper"
            style={{ 
              width: canvasWidth, 
              maxWidth: canvasWidth, 
              minHeight: "450px", 
              position: "relative",
              borderRadius: "8px",
              boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
              background: "#ffffff",
              marginBottom: "60px",
              transition: "width 0.2s ease",
            }}
          >
            <iframe
              ref={iframeRef}
              title="email-canvas"
              className="email-sandboxed-iframe"
              style={{
                width: "100%",
                height: "500px",
                border: "none",
                borderRadius: "8px",
                display: "block",
                backgroundColor: "#ffffff",
              }}
            />
          </div>

          {/* Dynamic Selection Overlay Box & Resize Handles */}
          {selectionRect && selectedDomElement && (
            <div
              className="dynamic-selection-overlay"
              style={{
                position: "absolute",
                top: `${selectionRect.top}px`,
                left: `${selectionRect.left}px`,
                width: `${selectionRect.width}px`,
                height: `${selectionRect.height}px`,
                pointerEvents: "none",
              }}
            >
              {/* Tag Badge */}
              <div className="element-tag-badge" style={{ pointerEvents: "auto", display: "flex", alignItems: "center", gap: "6px" }}>
                <span>{selectedTagName}</span>
                {selectedTagName === "img" && (
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      const res = await nativeIPC.chooseImage();
                      if (res.success && res.path && selectedDomElement) {
                        const newPath = res.path.replace(/\\/g, "/");
                        const filename = newPath.substring(newPath.lastIndexOf("/") + 1);
                        // Update image src in DOM with clean relative asset path
                        (selectedDomElement as HTMLImageElement).setAttribute("src", `assets/${filename}`);
                        (selectedDomElement as HTMLImageElement).src = `http://127.0.0.1:28941/pkg/${encodeURIComponent(fileFolder)}/assets/${filename}`;
                        setIsSaved(false);
                        isInternalUpdateRef.current = true;
                        pushHistory(exportPristineHtml());
                        updateSelectionOverlay(selectedDomElement);
                      }
                    }}
                    style={{
                      background: "#ffffff",
                      color: "#2563eb",
                      border: "none",
                      borderRadius: "3px",
                      padding: "1px 5px",
                      fontSize: "9px",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "3px",
                    }}
                    title="Replace Image File"
                  >
                    Replace Image
                  </button>
                )}
              </div>

              {/* Dimension Pill */}
              <div className="dimension-pill" style={{ pointerEvents: "auto" }}>
                {Math.round(selectionRect.width)} × {Math.round(selectionRect.height)}
              </div>

              {/* 8 Active Resize Handles */}
              <div className="resize-handle top-left" style={{ pointerEvents: "auto" }} onMouseDown={(e) => handleResizeMouseDown(e, "top-left")}></div>
              <div className="resize-handle top-center" style={{ pointerEvents: "auto" }} onMouseDown={(e) => handleResizeMouseDown(e, "top")}></div>
              <div className="resize-handle top-right" style={{ pointerEvents: "auto" }} onMouseDown={(e) => handleResizeMouseDown(e, "top-right")}></div>
              <div className="resize-handle middle-right" style={{ pointerEvents: "auto" }} onMouseDown={(e) => handleResizeMouseDown(e, "right")}></div>
              <div className="resize-handle bottom-right" style={{ pointerEvents: "auto" }} onMouseDown={(e) => handleResizeMouseDown(e, "bottom-right")}></div>
              <div className="resize-handle bottom-center" style={{ pointerEvents: "auto" }} onMouseDown={(e) => handleResizeMouseDown(e, "bottom")}></div>
              <div className="resize-handle bottom-left" style={{ pointerEvents: "auto" }} onMouseDown={(e) => handleResizeMouseDown(e, "bottom-left")}></div>
              <div className="resize-handle middle-left" style={{ pointerEvents: "auto" }} onMouseDown={(e) => handleResizeMouseDown(e, "left")}></div>
            </div>
          )}
        </div>

        {/* Right Sidebar: Chrome DevTools Style Inspector */}
        <aside className="editor-sidebar-inspector">
          <StyleInspector
            selectedElement={selectedDomElement}
            inlineStyles={inlineStyles}
            onUpdateStyle={handleUpdateStyle}
            onRemoveStyle={handleRemoveStyle}
          />
        </aside>
      </div>

      {/* Raw HTML Code View Modal */}
      {showCodeModal && (
        <div className="modal-backdrop" onClick={() => setShowCodeModal(false)}>
          <div className="modal-window" style={{ width: "880px", maxWidth: "94vw", height: "80vh" }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Code2 size={18} color="#4f46e5" />
                <h3>HTML Source Editor — {fileName}</h3>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <button
                  className="pane-btn"
                  onClick={() => {
                    navigator.clipboard.writeText(rawCodeText);
                    setCodeCopied(true);
                    setTimeout(() => setCodeCopied(false), 2000);
                  }}
                  style={{ display: "flex", alignItems: "center", gap: "4px", padding: "4px 10px", borderRadius: "6px", border: "1px solid #e2e8f0", background: "#f8fafc", cursor: "pointer", fontSize: "11px" }}
                >
                  {codeCopied ? <Check size={12} color="#16a34a" /> : <Copy size={12} />}
                  <span>{codeCopied ? "Copied" : "Copy"}</span>
                </button>
                <button className="close-btn" onClick={() => setShowCodeModal(false)}>
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className="modal-body" style={{ display: "flex", flexDirection: "column", padding: "16px", background: "#0f172a" }}>
              <textarea
                value={rawCodeText}
                onChange={(e) => setRawCodeText(e.target.value)}
                style={{
                  flex: 1,
                  width: "100%",
                  height: "100%",
                  background: "transparent",
                  color: "#f8fafc",
                  fontFamily: "var(--font-mono)",
                  fontSize: "12px",
                  lineHeight: "1.6",
                  border: "none",
                  outline: "none",
                  resize: "none",
                }}
                spellCheck={false}
              />
            </div>
            <div style={{ padding: "12px 20px", display: "flex", justifyContent: "flex-end", gap: "10px", background: "#ffffff", borderTop: "1px solid #e2e8f0" }}>
              <button
                className="btn btn-secondary"
                onClick={() => setShowCodeModal(false)}
                style={{ padding: "6px 16px", fontSize: "12px" }}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleApplyCodeModal}
                style={{ padding: "6px 18px", fontSize: "12px", background: "#4f46e5" }}
              >
                Apply Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

