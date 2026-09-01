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

  // Inline CSS state for StyleInspector
  const [inlineStyles, setInlineStyles] = useState<Record<string, string>>({});

  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const emailContainerRef = useRef<HTMLDivElement>(null);
  const isInternalUpdateRef = useRef<boolean>(false);
  const hasInitSelectionRef = useRef<boolean>(false);

  // Extract base URL for image resolution
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

  const selectedDomElementRef = useRef<HTMLElement | null>(null);

  // Extract natural styling for Style Inspector (Explicit styles + natural HTML attributes)
  const extractElementStyles = (el: HTMLElement) => {
    const stylesObj: Record<string, string> = {};
    for (let i = 0; i < el.style.length; i++) {
      const prop = el.style[i];
      const val = el.style.getPropertyValue(prop);
      if (val && !prop.startsWith("-webkit-")) {
        stylesObj[prop] = val;
      }
    }

    // Natural HTML attributes if style is not explicitly defined
    if (!stylesObj["width"] && el.getAttribute("width")) {
      const w = el.getAttribute("width")!;
      stylesObj["width"] = w.includes("%") ? w : `${w}px`;
    }
    if (!stylesObj["height"] && el.getAttribute("height")) {
      const h = el.getAttribute("height")!;
      stylesObj["height"] = h.includes("%") ? h : `${h}px`;
    }
    if (!stylesObj["background-color"] && el.getAttribute("bgcolor")) {
      stylesObj["background-color"] = el.getAttribute("bgcolor")!;
    }
    return stylesObj;
  };

  // Handler for selecting an element in the email canvas
  const handleSelectElement = useCallback((target: HTMLElement) => {
    if (!target) return;
    if (target === emailContainerRef.current) return;

    // Deselect previous node
    if (emailContainerRef.current) {
      emailContainerRef.current.querySelectorAll(".editor-active-selected").forEach((node) => {
        (node as HTMLElement).classList.remove("editor-active-selected");
      });
    }

    target.classList.add("editor-active-selected");
    selectedDomElementRef.current = target;
    setSelectedDomElement(target);
    setSelectedTagName(target.tagName.toLowerCase());

    const styles = extractElementStyles(target);
    setInlineStyles(styles);
  }, []);

  // Export clean HTML (strips editor attributes)
  const exportPristineHtml = useCallback((): string => {
    const container = emailContainerRef.current;
    if (!container) {
      return history[historyIndex] || startHtml;
    }

    // Deep clone the document root in memory
    const clone = container.cloneNode(true) as HTMLElement;

    // Remove all editor attributes
    clone.querySelectorAll("[contenteditable]").forEach((el) => {
      el.removeAttribute("contenteditable");
      el.removeAttribute("spellcheck");
    });
    clone.querySelectorAll(".editor-active-selected").forEach((el) => {
      el.classList.remove("editor-active-selected");
    });

    let cleanHtml = clone.innerHTML;
    if (pkgPrefix) {
      const escapedPrefix = pkgPrefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      cleanHtml = cleanHtml.replace(new RegExp(escapedPrefix + "assets/", "g"), "assets/");
      cleanHtml = cleanHtml.replace(new RegExp(escapedPrefix, "g"), "");
    }
    cleanHtml = cleanHtml.replace(/http:\/\/127\.0\.0\.1:28941\/pkg\/[^/]+\/assets\//g, "assets/");
    cleanHtml = cleanHtml.replace(/http:\/\/127\.0\.0\.1:28941\/pkg\/[^/]+\//g, "");

    // Wrap in standard doctype if needed
    if (!cleanHtml.toLowerCase().includes("<!doctype html>")) {
      cleanHtml = `<!DOCTYPE html>\n<html>\n<head>\n<meta charset="utf-8">\n</head>\n<body style="margin:0;padding:0;">\n${cleanHtml}\n</body>\n</html>`;
    }

    return cleanHtml;
  }, [history, historyIndex, startHtml, pkgPrefix]);

  // 1. Persistent event listeners on canvas container (registered once)
  useEffect(() => {
    const container = emailContainerRef.current;
    if (!container) return;

    const handleContainerPointerDown = (e: MouseEvent) => {
      let target = e.target as HTMLElement | null;
      if (!target || target === container) {
        if (selectedDomElementRef.current) {
          selectedDomElementRef.current.classList.remove("editor-active-selected");
        }
        selectedDomElementRef.current = null;
        setSelectedDomElement(null);
        setInlineStyles({});
        return;
      }

      handleSelectElement(target);
    };

    const handleContainerInput = () => {
      setIsSaved(false);
    };

    const handleDragStart = (e: DragEvent) => {
      e.preventDefault();
    };

    container.addEventListener("pointerdown", handleContainerPointerDown, true);
    container.addEventListener("click", handleContainerPointerDown, true);
    container.addEventListener("dragstart", handleDragStart);
    container.addEventListener("input", handleContainerInput);

    return () => {
      container.removeEventListener("pointerdown", handleContainerPointerDown, true);
      container.removeEventListener("click", handleContainerPointerDown, true);
      container.removeEventListener("dragstart", handleDragStart);
      container.removeEventListener("input", handleContainerInput);
    };
  }, [handleSelectElement]);

  // 2. Mount document into direct DOM container on load or Undo/Redo
  useEffect(() => {
    if (isInternalUpdateRef.current) {
      isInternalUpdateRef.current = false;
      return;
    }

    const container = emailContainerRef.current;
    if (!container) return;

    const currentHtml = history[historyIndex] || startHtml;

    let preparedHtml = currentHtml;
    preparedHtml = preparedHtml.replace(/src=["'](?:[a-zA-Z]:[/\\][^"']*[/\\]assets[/\\])([^"']+)["']/gi, (_m, fname) => {
      return pkgPrefix ? `src="${pkgPrefix}assets/${fname}"` : `src="/assets/${fname}"`;
    });
    preparedHtml = preparedHtml.replace(/src=["'](?:\.\/)?assets\/([^"']+)["']/gi, (_m, fname) => {
      return pkgPrefix ? `src="${pkgPrefix}assets/${fname}"` : `src="/assets/${fname}"`;
    });
    preparedHtml = preparedHtml.replace(/src=["'](?:\.\/)?(asset_[^"']+)["']/gi, (_m, fname) => {
      return pkgPrefix ? `src="${pkgPrefix}assets/${fname}"` : `src="/assets/${fname}"`;
    });
    preparedHtml = preparedHtml.replace(/url\(['"]?(?:[a-zA-Z]:[/\\][^'")]+[/\\]assets[/\\])([^'")]+)['"]?\)/gi, (_m, fname) => {
      return pkgPrefix ? `url('${pkgPrefix}assets/${fname}')` : `url('/assets/${fname}')`;
    });
    preparedHtml = preparedHtml.replace(/url\(['"]?(?:\.\/)?assets\/([^'")]+)['"]?\)/gi, (_m, fname) => {
      return pkgPrefix ? `url('${pkgPrefix}assets/${fname}')` : `url('/assets/${fname}')`;
    });
    preparedHtml = preparedHtml.replace(/url\(['"]?(?:\.\/)?(asset_[^'")]+)['"]?\)/gi, (_m, fname) => {
      return pkgPrefix ? `url('${pkgPrefix}assets/${fname}')` : `url('/assets/${fname}')`;
    });

    let bodyContent = preparedHtml;
    const bodyMatch = /<body[^>]*>([\s\S]*)<\/body>/i.exec(preparedHtml);
    if (bodyMatch) {
      bodyContent = bodyMatch[1];
    }

    container.innerHTML = bodyContent;

    // Enable inline contentEditable on text leaf elements & disable phantom image drag
    const editableTags = ["h1", "h2", "h3", "h4", "h5", "h6", "p", "span", "a", "td", "li", "button", "b", "strong", "em", "div"];
    container.querySelectorAll("*").forEach((node) => {
      const el = node as HTMLElement;
      if (el.tagName.toLowerCase() === "img") {
        el.setAttribute("draggable", "false");
      }
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
  }, [historyIndex, startHtml, pkgPrefix]);

  // Style update handlers
  const handleUpdateStyle = (property: string, value: string) => {
    let cleanVal = value.trim();

    // Auto-append px for pure numeric dimensions (e.g. "20" -> "20px")
    const dimensionProps = [
      "font-size", "width", "height", "max-width", "min-width", "max-height", "min-height",
      "padding", "padding-top", "padding-right", "padding-bottom", "padding-left",
      "margin", "margin-top", "margin-right", "margin-bottom", "margin-left",
      "border-width", "border-radius", "top", "left", "right", "bottom", "letter-spacing"
    ];
    if (dimensionProps.includes(property.toLowerCase()) && /^[+-]?\d+(\.\d+)?$/.test(cleanVal)) {
      cleanVal = `${cleanVal}px`;
    }

    const updated = { ...inlineStyles, [property]: cleanVal };
    setInlineStyles(updated);

    const el = selectedDomElementRef.current || selectedDomElement;
    if (el) {
      // 1. Direct style property assignment
      el.style.setProperty(property, cleanVal, "important");
      const camelProp = property.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
      (el.style as any)[camelProp] = cleanVal;

      // 2. Direct attribute sync for email engines
      const propLower = property.toLowerCase();
      if (propLower === "width") {
        el.setAttribute("width", cleanVal.replace(/px/g, ""));
        el.style.maxWidth = cleanVal;
      } else if (propLower === "height") {
        el.setAttribute("height", cleanVal.replace(/px/g, ""));
      } else if (propLower === "background-color" || propLower === "background") {
        el.setAttribute("bgcolor", cleanVal);
        el.style.backgroundColor = cleanVal;
      } else if (propLower === "text-align") {
        el.setAttribute("align", cleanVal);
      } else if (propLower === "color") {
        el.style.color = cleanVal;
      } else if (propLower === "font-size") {
        el.style.fontSize = cleanVal;
      }

      setIsSaved(false);
      isInternalUpdateRef.current = true;
      pushHistory(exportPristineHtml());
    }
  };

  const handleRemoveStyle = (property: string) => {
    const updated = { ...inlineStyles };
    delete updated[property];
    setInlineStyles(updated);

    const el = selectedDomElementRef.current || selectedDomElement;
    if (el) {
      el.style.removeProperty(property);
      const camelProp = property.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
      (el.style as any)[camelProp] = "";

      const propLower = property.toLowerCase();
      if (propLower === "width") {
        el.removeAttribute("width");
      } else if (propLower === "height") {
        el.removeAttribute("height");
      } else if (propLower === "background-color" || propLower === "background") {
        el.removeAttribute("bgcolor");
      } else if (propLower === "text-align") {
        el.removeAttribute("align");
      }
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

    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [historyIndex, history, fileName, initialFilePath]);

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

          {/* Email Direct DOM Card */}
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
            <div
              ref={emailContainerRef}
              className="email-direct-dom-root"
              style={{
                width: "100%",
                minHeight: "450px",
                display: "block",
                backgroundColor: "#ffffff",
              }}
            />
          </div>
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

