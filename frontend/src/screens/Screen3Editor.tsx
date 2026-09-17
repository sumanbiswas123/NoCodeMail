import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
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
  X, 
  ExternalLink, 
  Globe, 
  ArrowLeft,
  Bold,
  Italic,
  Underline,
  Link2,
  Unlink,
  Superscript as SuperIcon,
  Subscript as SubIcon,
  Palette,
  Image as ImageIcon,
  CheckSquare,
  Square,
  Plus,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ChevronUp,
  Eye,
  Cloud
} from "lucide-react";
import { StyleInspector } from "../components/StyleInspector";
import { EMAIL_COMPONENT_PRESETS } from "../components/ComponentPresets";
import { DevicePreviewViewer } from "../components/DevicePreviewViewer";
import { nativeIPC, BrowserInfo } from "../services/ipc";


interface Screen3Props {
  initialHtml: string;
  initialFileName: string;
  initialFilePath?: string;
  onBackToHome: () => void;
  onBackToProcess?: () => void;
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
  onBackToProcess,
}) => {
  const [fileName, setFileName] = useState(initialFileName || "campaign_v2.html");
  const [isEditingName, setIsEditingName] = useState(false);
  const [editorMode, setEditorMode] = useState<"edit" | "preview">("edit");
  const [previewHtmlSnapshot, setPreviewHtmlSnapshot] = useState<string>("");
  const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop");
  const [mobileWidth, setMobileWidth] = useState<number>(375);
  const [isResizingMobile, setIsResizingMobile] = useState<boolean>(false);
  const resizeStartXRef = useRef<number>(0);
  const resizeStartWidthRef = useRef<number>(375);

  const canvasWidth = viewMode === "mobile" ? `${mobileWidth}px` : "700px";

  const handleResizePointerDown = (e: React.PointerEvent, direction: "right" | "left") => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizingMobile(true);
    resizeStartXRef.current = e.clientX;
    resizeStartWidthRef.current = mobileWidth;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - resizeStartXRef.current;
      const widthChange = direction === "right" ? deltaX * 2 : -deltaX * 2;
      const newWidth = Math.min(490, Math.max(320, Math.round(resizeStartWidthRef.current + widthChange)));
      setMobileWidth(newWidth);
    };

    const handlePointerUp = () => {
      setIsResizingMobile(false);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  const [isSaved, setIsSaved] = useState(true);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [rawCodeText, setRawCodeText] = useState("");
  const [codeCopied, setCodeCopied] = useState(false);

  // Multi-browser menu state
  const [showBrowserMenu, setShowBrowserMenu] = useState(false);
  const [detectedBrowsers, setDetectedBrowsers] = useState<BrowserInfo[]>([]);
  const [loadingBrowsers, setLoadingBrowsers] = useState(false);
  const browserMenuRef = useRef<HTMLDivElement>(null);

  // Close browser menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (browserMenuRef.current && !browserMenuRef.current.contains(e.target as Node)) {
        setShowBrowserMenu(false);
      }
    };
    if (showBrowserMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showBrowserMenu]);


  // Folder path of the file on disk
  const rawFolder = initialFilePath && (initialFilePath.includes("/") || initialFilePath.includes("\\"))
    ? initialFilePath.replace(/[/\\][^/\\]+$/, "")
    : "";
  const fileFolder = rawFolder;
  const normalizedFolder = fileFolder ? fileFolder.replace(/\\/g, "/") : "";
  const pkgPrefix = normalizedFolder ? `http://127.0.0.1:28941/pkg/${encodeURIComponent(normalizedFolder)}/` : "";

  const startHtml = initialHtml && initialHtml.trim() ? initialHtml : DEFAULT_FALLBACK_HTML;
  const HISTORY_LIMIT = 80;
  const EDITOR_STYLE_ATTR = "data-email-editor-style";
  const LEGACY_EDITOR_STYLE_ATTR = "data-email-injected-style";
  const PRODUCTION_STYLE_ID = "nocodemail-responsive-utilities";
  const PRODUCTION_STYLE_ATTR = "data-ncm-production-style";
  const PRODUCTION_RESPONSIVE_CSS = `
@media only screen and (max-width: 490px) {
  /* 1. Universal Mobile Align Center */
  .mobile-align-center,
  .mobile-align-center td,
  .mobile-align-center p,
  .mobile-align-center div,
  .mobile-align-center span,
  .mobile-align-center h1,
  .mobile-align-center h2,
  .mobile-align-center h3,
  .mobile-align-center h4,
  .mobile-align-center h5,
  .mobile-align-center h6,
  .mobile-align-center a,
  .mobile-center-img,
  .mobile-center-img td,
  .mobile-center-img p,
  .mobile-center-img div {
    text-align: center !important;
  }

  .mobile-align-center table,
  table.mobile-align-center,
  .mobile-center-img table,
  table.mobile-center-img {
    margin: 0 auto !important;
    margin-left: auto !important;
    margin-right: auto !important;
    float: none !important;
    display: table !important;
  }

  .mobile-align-center img,
  img.mobile-align-center,
  .mobile-center-img img,
  img.mobile-center-img {
    display: block !important;
    margin: 0 auto !important;
    margin-left: auto !important;
    margin-right: auto !important;
    float: none !important;
  }

  .mobile-center-img a,
  .mobile-align-center a {
    display: inline-block !important;
    margin-left: auto !important;
    margin-right: auto !important;
    text-align: center !important;
  }

  /* 2. Universal Mobile Align Left */
  .mobile-align-left,
  .mobile-align-left td,
  .mobile-align-left p,
  .mobile-align-left div,
  .mobile-align-left span,
  .mobile-align-left h1,
  .mobile-align-left h2,
  .mobile-align-left h3,
  .mobile-align-left h4,
  .mobile-align-left h5,
  .mobile-align-left h6,
  .mobile-align-left a {
    text-align: left !important;
  }

  .mobile-align-left table,
  table.mobile-align-left {
    margin: 0 auto 0 0 !important;
    margin-left: 0 !important;
    margin-right: auto !important;
    float: none !important;
    display: table !important;
  }

  .mobile-align-left img,
  img.mobile-align-left {
    display: block !important;
    margin-left: 0 !important;
    margin-right: auto !important;
    float: none !important;
  }

  .mobile-align-left a {
    display: inline-block !important;
    text-align: left !important;
    margin-left: 0 !important;
    margin-right: auto !important;
  }

  /* 3. Universal Mobile Align Right */
  .mobile-align-right,
  .mobile-align-right td,
  .mobile-align-right p,
  .mobile-align-right div,
  .mobile-align-right span,
  .mobile-align-right h1,
  .mobile-align-right h2,
  .mobile-align-right h3,
  .mobile-align-right h4,
  .mobile-align-right h5,
  .mobile-align-right h6,
  .mobile-align-right a {
    text-align: right !important;
  }

  .mobile-align-right table,
  table.mobile-align-right {
    margin: 0 0 0 auto !important;
    margin-left: auto !important;
    margin-right: 0 !important;
    float: none !important;
    display: table !important;
  }

  .mobile-align-right img,
  img.mobile-align-right {
    display: block !important;
    margin-left: auto !important;
    margin-right: 0 !important;
    float: none !important;
  }

  .mobile-align-right a {
    display: inline-block !important;
    text-align: right !important;
    margin-left: auto !important;
    margin-right: 0 !important;
  }

  /* Multi-column stacking */
  .mobile-force-stack,
  .mobile-force-stack > [class*="mj-column"],
  .mobile-force-stack [class*="mj-column"] {
    display: block !important;
    width: 100% !important;
    max-width: 100% !important;
  }
  .mobile-force-row > [class*="mj-column"],
  .mobile-force-row [class*="mj-column"] {
    display: inline-block !important;
    vertical-align: middle !important;
  }
}`.trim();

  // History stack
  const [history, setHistory] = useState<string[]>([startHtml]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const historyRef = useRef<string[]>([startHtml]);
  const historyIndexRef = useRef<number>(0);
  const skipNextDomRestoreRef = useRef<boolean>(false);
  const iframeCleanupRef = useRef<(() => void) | null>(null);
  const copyFeedbackTimerRef = useRef<number | null>(null);
  const saveVersionRef = useRef(0);
  const [saveError, setSaveError] = useState<string>("");
  const [sectionCopyStatus, setSectionCopyStatus] = useState<"idle" | "copied" | "error">("idle");

  const setHistoryState = useCallback((items: string[], index: number) => {
    historyRef.current = items;
    historyIndexRef.current = index;
    setHistory(items);
    setHistoryIndex(index);
  }, []);

  useEffect(() => {
    return () => {
      iframeCleanupRef.current?.();
      iframeCleanupRef.current = null;
      if (copyFeedbackTimerRef.current) {
        window.clearTimeout(copyFeedbackTimerRef.current);
        copyFeedbackTimerRef.current = null;
      }
      if (inputDebounceTimerRef.current) {
        clearTimeout(inputDebounceTimerRef.current);
        inputDebounceTimerRef.current = null;
      }
    };
  }, []);

  // Selected DOM element state
  const [selectedDomElement, setSelectedDomElement] = useState<HTMLElement | null>(null);
  const [selectedTagName, setSelectedTagName] = useState<string>("div");

  // Inline CSS state for StyleInspector
  const [inlineStyles, setInlineStyles] = useState<Record<string, string>>({});

  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const emailIframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeDomRoot, setIframeDomRoot] = useState<HTMLElement | null>(null);
  const isInternalUpdateRef = useRef<boolean>(false);
  const hasInitSelectionRef = useRef<boolean>(false);

  // Dynamic iframe height recalculation for exact pixel-fit scrolling in both Desktop and Mobile views
  const recalcIframeHeight = useCallback(() => {
    const iframe = emailIframeRef.current;
    const doc = iframe?.contentDocument;
    if (!iframe || !doc || !doc.body) return;

    const body = doc.body;
    const bodyRect = body.getBoundingClientRect();

    let maxContentBottom = 0;
    const children = body.children;
    for (let i = 0; i < children.length; i++) {
      const child = children[i] as HTMLElement;
      if (child.tagName === "SCRIPT" || child.tagName === "STYLE") continue;
      const childRect = child.getBoundingClientRect();
      const bottom = childRect.bottom - bodyRect.top;
      if (bottom > maxContentBottom) {
        maxContentBottom = bottom;
      }
    }

    // Also check all direct section containers
    const sections = body.querySelectorAll(".email-section-wrapper, [class*='mj-section'], table.mj-full-width-mobile, body > table, body > div");
    sections.forEach((sec) => {
      const rect = (sec as HTMLElement).getBoundingClientRect();
      const bottom = rect.bottom - bodyRect.top;
      if (bottom > maxContentBottom) {
        maxContentBottom = bottom;
      }
    });

    const finalHeight = Math.max(Math.ceil(maxContentBottom), 200);
    iframe.style.height = `${finalHeight}px`;
  }, []);

  // Re-measure iframe height whenever viewMode, mobileWidth, or history changes
  useEffect(() => {
    recalcIframeHeight();
    const timers = [
      setTimeout(recalcIframeHeight, 50),
      setTimeout(recalcIframeHeight, 150),
      setTimeout(recalcIframeHeight, 300),
      setTimeout(recalcIframeHeight, 500),
    ];
    return () => timers.forEach(clearTimeout);
  }, [viewMode, mobileWidth, historyIndex, recalcIframeHeight]);

  // Extract base URL for image resolution
  const getBaseUrl = useCallback(() => {
    if (!normalizedFolder) return "";
    return `http://127.0.0.1:28941/pkg/${encodeURIComponent(normalizedFolder)}/`;
  }, [normalizedFolder]);

  // Push new state to history without nested state updates or unbounded snapshots.
  const pushHistory = useCallback((newHtml: string, markDirty = true): boolean => {
    if (!newHtml) return false;
    const currentIndex = historyIndexRef.current;
    let updated = historyRef.current.slice(0, currentIndex + 1);
    if (updated[updated.length - 1] === newHtml) {
      if (markDirty) setIsSaved(false);
      return false;
    }

    updated.push(newHtml);
    if (updated.length > HISTORY_LIMIT) {
      updated = updated.slice(updated.length - HISTORY_LIMIT);
    }

    const nextIdx = updated.length - 1;
    setHistoryState(updated, nextIdx);
    if (markDirty) setIsSaved(false);
    return true;
  }, [setHistoryState]);

  // Floating text formatting toolbar state
  const [floatingToolbarPos, setFloatingToolbarPos] = useState<{ top: number; left: number } | null>(null);
  const [savedRange, setSavedRange] = useState<Range | null>(null);
  const [activeLinkNode, setActiveLinkNode] = useState<HTMLAnchorElement | null>(null);
  const [showLinkPopover, setShowLinkPopover] = useState(false);
  const [linkHref, setLinkHref] = useState("");
  const [linkTargetBlank, setLinkTargetBlank] = useState(true);
  const [showColorPopover, setShowColorPopover] = useState(false);
  const [selectedTextColor, setSelectedTextColor] = useState("#151515");
  const [showImageUrlPopover, setShowImageUrlPopover] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState("");
  const floatingToolbarRef = useRef<HTMLDivElement>(null);

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

  const [inspectorTab, setInspectorTab] = useState<"components" | "ai" | "styles">("components");
  const inspectorTabRef = useRef<"components" | "ai" | "styles">("components");
  useEffect(() => {
    inspectorTabRef.current = inspectorTab;
  }, [inspectorTab]);

  // Switch between desktop & mobile viewport, clearing any active floating toolbar and element selection
  const handleSwitchViewMode = useCallback((mode: "desktop" | "mobile") => {
    setViewMode(mode);
    setFloatingToolbarPos(null);
    setShowLinkPopover(false);
    setShowColorPopover(false);
    setShowImageUrlPopover(false);
    const doc = emailIframeRef.current?.contentDocument;
    if (doc) {
      doc.querySelectorAll(".editor-active-selected").forEach((node) => {
        (node as HTMLElement).classList.remove("editor-active-selected");
      });
    }
    selectedDomElementRef.current = null;
    setSelectedDomElement(null);
    setSelectedTagName("div");
    setInlineStyles({});
  }, []);

  const [insertScope, setInsertScope] = useState<"column" | "section">("column");
  const insertScopeRef = useRef<"column" | "section">("column");
  useEffect(() => {
    insertScopeRef.current = insertScope;
  }, [insertScope]);

  // Resolve the complete enclosing email section without depending on the active inspector tab.
  const findSectionElement = useCallback((target: HTMLElement, doc: Document): HTMLElement => {
    if (!target || target === doc.body || target === doc.documentElement) return target;

    const isEditorRoot = (el: HTMLElement | null) =>
      !el || el === doc.body || el === doc.documentElement || el.classList?.contains("email-direct-dom-root");

    // 1. Explicit section wrapper classes / attributes
    const explicit = target.closest(".email-section-wrapper, .mj-section, [data-email-section], [data-section]") as HTMLElement | null;
    if (explicit && !isEditorRoot(explicit)) return explicit;

    // 2. Walk up from target and return the CLOSEST enclosing section container
    let node: HTMLElement | null = target;
    while (node && !isEditorRoot(node)) {
      // Must not be a column or small inline element
      const isColumn = node.classList.contains("mj-column") || /mj-column-per-/i.test(node.className);
      if (!isColumn && (node.tagName === "DIV" || node.tagName === "SECTION" || node.tagName === "TABLE")) {
        const style = node.getAttribute("style") || "";
        const widthAttr = node.getAttribute("width") || "";
        const maxWidth = node.style.maxWidth || "";

        const hasEmailWidth =
          /(?:max-)?width\s*:\s*(?:[4-9]\d{2}|100%)px/i.test(style) ||
          /(?:^|\D)(?:500|550|600|620|640|650|660|700)(?:px)?(?:\D|$)/.test(`${widthAttr} ${maxWidth}`);
        const centeredBlock =
          /margin\s*:\s*0(?:px)?\s+auto/i.test(style) ||
          (node.style.marginLeft === "auto" && node.style.marginRight === "auto");

        // The closest centered container with email width encountered when walking up is the exact section
        if (hasEmailWidth && centeredBlock) {
          return node;
        }
      }
      node = node.parentElement;
    }

    // 3. Fallback: walk up until reaching the top-level element under doc.body / root container
    let fallback: HTMLElement = target;
    while (fallback.parentElement && !isEditorRoot(fallback.parentElement)) {
      fallback = fallback.parentElement;
    }
    return fallback;
  }, []);

  // Handler for selecting an element in the email canvas
  const handleSelectElement = useCallback((target: HTMLElement) => {
    if (!target) return;
    const doc = emailIframeRef.current?.contentDocument;
    if (doc && (target === doc.body || target === doc.documentElement)) return;

    let finalTarget = target;
    // In "New Section Row" mode or AI mode, ALWAYS ensure we select the main outer section parent
    const isSectionSelectionMode = (insertScopeRef.current === "section" && inspectorTabRef.current === "components") || inspectorTabRef.current === "ai";
    if (isSectionSelectionMode && doc) {
      finalTarget = findSectionElement(target, doc);
    }

    // Deselect previous node
    if (doc) {
      doc.querySelectorAll(".editor-active-selected").forEach((node) => {
        (node as HTMLElement).classList.remove("editor-active-selected");
      });
    }

    finalTarget.classList.add("editor-active-selected");
    selectedDomElementRef.current = finalTarget;
    setSelectedDomElement(finalTarget);
    setSelectedTagName(finalTarget.tagName.toLowerCase());

    const styles = extractElementStyles(finalTarget);
    setInlineStyles(styles);
  }, [findSectionElement]);

  const handleInsertScopeChange = useCallback((scope: "column" | "section") => {
    setInsertScope(scope);
    insertScopeRef.current = scope;
    const doc = emailIframeRef.current?.contentDocument;
    if (scope === "section" && selectedDomElementRef.current && doc) {
      const section = findSectionElement(selectedDomElementRef.current, doc);
      if (section) {
        handleSelectElement(section);
      }
    }
  }, [findSectionElement, handleSelectElement]);

  const handleTabChange = useCallback((tab: "components" | "ai" | "styles") => {
    setInspectorTab(tab);
    inspectorTabRef.current = tab;
    const doc = emailIframeRef.current?.contentDocument;
    if (tab === "ai" && selectedDomElementRef.current && doc) {
      const section = findSectionElement(selectedDomElementRef.current, doc);
      if (section) {
        handleSelectElement(section);
      }
    } else if (tab === "components" && insertScopeRef.current === "section" && selectedDomElementRef.current && doc) {
      const section = findSectionElement(selectedDomElementRef.current, doc);
      if (section) {
        handleSelectElement(section);
      }
    }
  }, [findSectionElement, handleSelectElement]);

  const isSelectedSectionResponsive = useMemo(() => {
    if (!selectedDomElement) return true;
    const doc = emailIframeRef.current?.contentDocument;
    if (!doc) return true;
    const section = findSectionElement(selectedDomElement, doc);
    return !section?.classList.contains("mobile-force-row");
  }, [selectedDomElement, findSectionElement, historyIndex]);

  const escapeRegExp = useCallback((value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), []);

  const reverseEditorAssetUrls = useCallback((html: string): string => {
    if (!pkgPrefix) return html;
    const escapedPrefix = escapeRegExp(pkgPrefix);
    return html
      .replace(new RegExp(`${escapedPrefix}assets/`, "g"), "assets/")
      .replace(new RegExp(escapedPrefix, "g"), "");
  }, [escapeRegExp, pkgPrefix]);

  const removeEditorArtifactsFromClone = useCallback((root: ParentNode) => {
    root.querySelectorAll(`[${EDITOR_STYLE_ATTR}], [${LEGACY_EDITOR_STYLE_ATTR}]`).forEach((el) => el.remove());
    root.querySelectorAll("[contenteditable], [spellcheck]").forEach((el) => {
      el.removeAttribute("contenteditable");
      el.removeAttribute("spellcheck");
    });
    root.querySelectorAll(".editor-active-selected").forEach((el) => {
      el.classList.remove("editor-active-selected");
    });
    root.querySelectorAll("[data-ncm-editor-title]").forEach((el) => {
      const htmlEl = el as HTMLElement;
      const original = htmlEl.getAttribute("data-ncm-original-title");
      if (original !== null) {
        htmlEl.setAttribute("title", original);
      } else if (htmlEl.getAttribute("title") === "Double-click to choose image from disk") {
        htmlEl.removeAttribute("title");
      }
      htmlEl.removeAttribute("data-ncm-editor-title");
      htmlEl.removeAttribute("data-ncm-original-title");
    });
    root.querySelectorAll("[draggable='false']").forEach((el) => {
      if (el.getAttribute("data-ncm-original-draggable") === null) {
        el.removeAttribute("draggable");
      } else {
        el.setAttribute("draggable", el.getAttribute("data-ncm-original-draggable") || "false");
        el.removeAttribute("data-ncm-original-draggable");
      }
    });
  }, [EDITOR_STYLE_ATTR, LEGACY_EDITOR_STYLE_ATTR]);

  const serializeCleanElement = useCallback((element: HTMLElement): string => {
    const clone = element.cloneNode(true) as HTMLElement;
    removeEditorArtifactsFromClone(clone);
    return reverseEditorAssetUrls(clone.outerHTML);
  }, [removeEditorArtifactsFromClone, reverseEditorAssetUrls]);

  const getAdjacentMsoCommentBefore = (element: HTMLElement): Comment | null => {
    let prev = element.previousSibling;
    while (prev && prev.nodeType === Node.TEXT_NODE && !prev.textContent?.trim()) {
      prev = prev.previousSibling;
    }
    if (prev && prev.nodeType === Node.COMMENT_NODE && (prev.textContent || "").includes("[if mso")) {
      return prev as Comment;
    }
    return null;
  };

  const getAdjacentMsoCommentAfter = (element: HTMLElement): Comment | null => {
    let next = element.nextSibling;
    while (next && next.nodeType === Node.TEXT_NODE && !next.textContent?.trim()) {
      next = next.nextSibling;
    }
    if (next && next.nodeType === Node.COMMENT_NODE && (next.textContent || "").includes("[if mso")) {
      return next as Comment;
    }
    return null;
  };

  const removeNodeAndPrecedingWhitespace = (node: Node) => {
    const prev = node.previousSibling;
    if (prev && prev.nodeType === Node.TEXT_NODE && !prev.textContent?.trim()) {
      prev.parentNode?.removeChild(prev);
    }
    node.parentNode?.removeChild(node);
  };

  const removeNodeAndFollowingWhitespace = (node: Node) => {
    const next = node.nextSibling;
    if (next && next.nodeType === Node.TEXT_NODE && !next.textContent?.trim()) {
      next.parentNode?.removeChild(next);
    }
    node.parentNode?.removeChild(node);
  };

  const serializeCleanSectionWithMso = useCallback((section: HTMLElement): string => {
    const msoBefore = getAdjacentMsoCommentBefore(section);
    const msoAfter = getAdjacentMsoCommentAfter(section);

    const sectionHtml = serializeCleanElement(section);

    let result = "";
    if (msoBefore) {
      result += `<!--${msoBefore.textContent}-->\n`;
    }
    result += sectionHtml;
    if (msoAfter) {
      result += `\n<!--${msoAfter.textContent}-->`;
    }
    return result;
  }, [serializeCleanElement]);

  // Export clean HTML while preserving the document envelope and production responsive utilities.
  const exportPristineHtml = useCallback((): string => {
    const iframe = emailIframeRef.current;
    const doc = iframe?.contentDocument;
    if (!doc) {
      return historyRef.current[historyIndexRef.current] || startHtml;
    }

    const clone = doc.documentElement.cloneNode(true) as HTMLElement;
    removeEditorArtifactsFromClone(clone);

    let cleanHtml = reverseEditorAssetUrls(clone.outerHTML);
    if (!cleanHtml.toLowerCase().includes("<!doctype html>")) {
      cleanHtml = `<!DOCTYPE html>\n${cleanHtml}`;
    }

    return cleanHtml;
  }, [removeEditorArtifactsFromClone, reverseEditorAssetUrls, startHtml]);

  const writeClipboardText = useCallback(async (text: string): Promise<boolean> => {
    if (!text) return false;
    try {
      if (navigator.clipboard?.writeText && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      // Fall through to execCommand fallback below.
    }

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "true");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    textarea.style.top = "0";
    document.body.appendChild(textarea);

    const previousActive = document.activeElement as HTMLElement | null;
    textarea.focus();
    textarea.select();

    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {
      ok = false;
    } finally {
      document.body.removeChild(textarea);
      previousActive?.focus?.();
    }
    return ok;
  }, []);

  const getCopyableSection = useCallback((): HTMLElement | null => {
    const doc = emailIframeRef.current?.contentDocument;
    const selected = selectedDomElementRef.current || selectedDomElement;
    if (!doc || !selected || !doc.body.contains(selected)) return null;
    const section = findSectionElement(selected, doc);
    if (!section || section === doc.body || section === doc.documentElement || !doc.body.contains(section)) return null;
    return section;
  }, [findSectionElement, selectedDomElement]);

  const canCopySectionCode = !!getCopyableSection();

  const handleCopySectionCode = useCallback(async (): Promise<boolean> => {
    const section = getCopyableSection();
    if (!section) {
      setSectionCopyStatus("error");
      return false;
    }

    const iframeWin = emailIframeRef.current?.contentWindow;
    const selection = iframeWin?.getSelection();
    const ranges: Range[] = [];
    if (selection) {
      for (let i = 0; i < selection.rangeCount; i += 1) {
        ranges.push(selection.getRangeAt(i).cloneRange());
      }
    }

    const ok = await writeClipboardText(serializeCleanSectionWithMso(section));
    setSectionCopyStatus(ok ? "copied" : "error");
    if (copyFeedbackTimerRef.current) window.clearTimeout(copyFeedbackTimerRef.current);
    copyFeedbackTimerRef.current = window.setTimeout(() => setSectionCopyStatus("idle"), 1800);

    if (selection && ranges.length > 0) {
      try {
        selection.removeAllRanges();
        ranges.forEach((range) => selection.addRange(range));
      } catch {
        // Ignore disconnected ranges after user edits.
      }
    }
    return ok;
  }, [getCopyableSection, serializeCleanSectionWithMso, writeClipboardText]);

  const ensureProductionUtilityStyle = useCallback((doc: Document) => {
    if (!doc.head) return;
    let style = doc.getElementById(PRODUCTION_STYLE_ID) as HTMLStyleElement | null;
    if (!style) {
      style = doc.createElement("style");
      style.id = PRODUCTION_STYLE_ID;
      style.setAttribute(PRODUCTION_STYLE_ATTR, "true");
      doc.head.appendChild(style);
    }
    style.textContent = PRODUCTION_RESPONSIVE_CSS;
  }, [PRODUCTION_RESPONSIVE_CSS, PRODUCTION_STYLE_ATTR, PRODUCTION_STYLE_ID]);

  const isPermittedUrlValue = useCallback((value: string): boolean => {
    const raw = value.trim();
    if (!raw) return true;
    if (/^(https?:|mailto:|tel:|#|\/|\.\/|\.\.\/|data:image\/)/i.test(raw)) return true;
    if (/^[a-z][a-z0-9+.-]*:/i.test(raw)) return false;
    return /^[A-Za-z0-9._~!$&'()*+,;=@%-]+(?:\/[A-Za-z0-9._~!$&'()*+,;=:@%/-]*)?(?:\?[A-Za-z0-9._~!$&'()*+,;=:@%/?-]*)?(?:#[A-Za-z0-9._~!$&'()*+,;=:@%/?-]*)?$/.test(raw);
  }, []);

  const sanitizeDocumentForEditor = useCallback((doc: Document) => {
    doc.querySelectorAll("script, iframe, object, embed, form, input, textarea, meta[http-equiv='refresh']").forEach((el) => el.remove());
    doc.querySelectorAll("*").forEach((node) => {
      const el = node as HTMLElement;
      Array.from(el.attributes).forEach((attr) => {
        const name = attr.name.toLowerCase();
        const value = attr.value || "";
        if (name.startsWith("on") || name === "srcdoc") {
          el.removeAttribute(attr.name);
          return;
        }
        if (["href", "src", "xlink:href", "background"].includes(name) && !isPermittedUrlValue(value)) {
          el.removeAttribute(attr.name);
        }
      });
    });
  }, [isPermittedUrlValue]);

  const sanitizeHtmlForEditor = useCallback((html: string): string => {
    const parser = new DOMParser();
    const parsed = parser.parseFromString(html, "text/html");
    sanitizeDocumentForEditor(parsed);
    const serialized = parsed.documentElement.outerHTML;
    return html.trim().toLowerCase().startsWith("<!doctype") ? `<!DOCTYPE html>\n${serialized}` : serialized;
  }, [sanitizeDocumentForEditor]);

  // Helper to enable contentEditable on text leaf elements in a DOM tree
  const makeTextElementsEditable = useCallback((root: HTMLElement) => {
    if (!root) return;
    const editableTags = ["h1", "h2", "h3", "h4", "h5", "h6", "p", "span", "a", "td", "li", "button", "b", "strong", "em", "div"];
    root.querySelectorAll("*").forEach((node) => {
      const el = node as HTMLElement;
      if (el.tagName.toLowerCase() === "img") {
        if (el.getAttribute("draggable") !== null && el.getAttribute("data-ncm-original-draggable") === null) {
          el.setAttribute("data-ncm-original-draggable", el.getAttribute("draggable") || "false");
        }
        el.setAttribute("draggable", "false");
      }
      if (editableTags.includes(el.tagName.toLowerCase())) {
        const hasBlock = Array.from(el.children).some((c) =>
          ["div", "table", "p", "h1", "h2", "h3", "h4", "h5", "h6", "section"].includes(c.tagName.toLowerCase())
        );
        if (!hasBlock) {
          el.contentEditable = "true";
          el.spellcheck = false;
        }
      }
    });
    if (editableTags.includes(root.tagName.toLowerCase())) {
      const hasBlock = Array.from(root.children).some((c) =>
        ["div", "table", "p", "h1", "h2", "h3", "h4", "h5", "h6", "section"].includes(c.tagName.toLowerCase())
      );
      if (!hasBlock) {
        root.contentEditable = "true";
        root.spellcheck = false;
      }
    }
  }, []);

  // Helper to extract inner widget (table, image, text) when inserting inside a column
  const extractInnerWidget = useCallback((presetHtml: string): string => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(presetHtml, "text/html");
      const wrapper = doc.querySelector(".email-section-wrapper");
      if (wrapper) {
        return wrapper.innerHTML.trim();
      }
      return presetHtml.trim();
    } catch {
      return presetHtml.trim();
    }
  }, []);
  const sanitizeFragmentHtml = useCallback((html: string): string => {
    const doc = document.implementation.createHTMLDocument("NoCodeMail Fragment");
    doc.body.innerHTML = html;
    sanitizeDocumentForEditor(doc);
    return doc.body.innerHTML;
  }, [sanitizeDocumentForEditor]);


  // Handler for inserting preset component into the email DOM (supporting column-level and section-level scopes)
  const handleInsertPreset = useCallback((
    presetHtml: string,
    targetPosition: "bottom" | "top" | "left" | "right" = "bottom",
    targetScope: "section" | "column" = "column"
  ) => {
    const iframe = emailIframeRef.current;
    const doc = iframe?.contentDocument;
    if (!doc || !doc.body) return;

    const selected = selectedDomElementRef.current;

    // 1. COLUMN-LEVEL INSERTION: Insert widget directly inside current column/td
    if (targetScope === "column" && selected && selected !== doc.body) {
      let anchorEl: HTMLElement = selected;
      while (
        anchorEl.parentElement &&
        anchorEl.parentElement.tagName.toLowerCase() !== "td" &&
        anchorEl.parentElement.tagName.toLowerCase() !== "body" &&
        !anchorEl.parentElement.classList?.contains("email-section-wrapper") &&
        !["p", "div", "table", "h1", "h2", "h3", "h4", "h5", "h6", "img", "hr"].includes(anchorEl.tagName.toLowerCase())
      ) {
        anchorEl = anchorEl.parentElement;
      }

      const widgetHtml = sanitizeFragmentHtml(extractInnerWidget(presetHtml));
      const tempDiv = doc.createElement("div");
      tempDiv.innerHTML = widgetHtml;

      if (targetPosition === "left" || targetPosition === "right") {
        const existingCol = (selected.closest("[class*='mj-column']") as HTMLElement | null) || (selected.closest("td") as HTMLElement | null);
        const rowParent = existingCol?.parentElement || null;
        if (existingCol && rowParent && rowParent !== doc.body) {
          const newCol = doc.createElement(existingCol.tagName.toLowerCase());
          newCol.className = existingCol.className || "mj-column-per-50 mj-outlook-group-fix";
          newCol.style.cssText = existingCol.getAttribute("style") || "font-size:0px;text-align:left;direction:ltr;display:inline-block;vertical-align:top;width:50%;";
          newCol.innerHTML = widgetHtml;
          makeTextElementsEditable(newCol);

          const siblings = Array.from(rowParent.children).filter((child) => child.nodeType === 1) as HTMLElement[];
          const totalCols = Math.min(4, siblings.length + 1);
          const widthPct = `${Math.round((100 / totalCols) * 100000) / 100000}%`;
          [...siblings, newCol].forEach((col) => {
            col.style.width = widthPct;
            if (/mj-column-per-\d/i.test(col.className)) {
              col.className = col.className.replace(/mj-column-per-[\d-]+/g, `mj-column-per-${String(widthPct).replace(".", "-").replace("%", "")}`);
            }
          });

          if (targetPosition === "left") {
            rowParent.insertBefore(newCol, existingCol);
          } else {
            rowParent.insertBefore(newCol, existingCol.nextSibling);
          }

          handleSelectElement(newCol);
          setIsSaved(false);
          isInternalUpdateRef.current = true;
          pushHistory(exportPristineHtml());
          return;
        }
      }

      const insertedElements: HTMLElement[] = [];
      const parent = anchorEl.parentElement || doc.body;

      if (targetPosition === "top" || targetPosition === "left") {
        while (tempDiv.firstChild) {
          const child = tempDiv.firstChild;
          if (child.nodeType === 1) {
            insertedElements.push(child as HTMLElement);
          }
          parent.insertBefore(child, anchorEl);
        }
      } else {
        const nextSibling = anchorEl.nextSibling;
        while (tempDiv.firstChild) {
          const child = tempDiv.firstChild;
          if (child.nodeType === 1) {
            insertedElements.push(child as HTMLElement);
          }
          parent.insertBefore(child, nextSibling);
        }
      }

      makeTextElementsEditable(doc.body);
      insertedElements.forEach((el) => {
        const imgs = el.tagName?.toLowerCase() === "img" ? [el] : Array.from(el.querySelectorAll("img"));
        imgs.forEach((img) => {
          const imgEl = img as HTMLElement;
          imgEl.style.cursor = "pointer";
          if (imgEl.getAttribute("title") !== null && imgEl.getAttribute("data-ncm-original-title") === null) {
            imgEl.setAttribute("data-ncm-original-title", imgEl.getAttribute("title") || "");
          }
          imgEl.setAttribute("title", "Double-click to choose image from disk");
          imgEl.setAttribute("data-ncm-editor-title", "true");
          imgEl.addEventListener("dblclick", (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (isPickingImageRef.current) return;
            isPickingImageRef.current = true;
            handleReplaceImage(imgEl).finally(() => {
              setTimeout(() => {
                isPickingImageRef.current = false;
              }, 500);
            });
          });
        });
      });

      if (insertedElements.length > 0) {
        handleSelectElement(insertedElements[0]);
      }

      setIsSaved(false);
      isInternalUpdateRef.current = true;
      pushHistory(exportPristineHtml());
      return;
    }

    // 2. SECTION-LEVEL INSERTION: Standalone full 700px section row
    const tempDiv = doc.createElement("div");
    tempDiv.innerHTML = sanitizeFragmentHtml(presetHtml.trim());
    const newElement = tempDiv.firstElementChild as HTMLElement;
    if (!newElement) return;

    makeTextElementsEditable(newElement);

    if (targetPosition === "left" || targetPosition === "right") {
      let inserted = false;
      const existingBtnTable = selected ? (selected.closest("table[role='presentation']") as HTMLElement || selected.querySelector("table[role='presentation']") as HTMLElement) : null;
      const newBtnTable = newElement.querySelector("table[role='presentation']") as HTMLElement;

      if (existingBtnTable && newBtnTable) {
        const existingTd = existingBtnTable.closest("td");
        if (existingTd && existingTd.parentElement && existingTd.parentElement.tagName === "TR") {
          const newTd = doc.createElement("td");
          newTd.style.padding = targetPosition === "left" ? "0 8px 0 0" : "0 0 0 8px";
          newTd.setAttribute("valign", "middle");
          newTd.setAttribute("align", "center");
          newTd.appendChild(newBtnTable);
          makeTextElementsEditable(newTd);

          if (targetPosition === "left") {
            existingTd.parentElement.insertBefore(newTd, existingTd);
          } else {
            existingTd.parentElement.insertBefore(newTd, existingTd.nextSibling);
          }
          inserted = true;
          handleSelectElement(newTd);
        }
      }

      if (!inserted) {
        let col = selected ? (selected.closest("[class*='mj-column']") as HTMLElement || selected.querySelector("[class*='mj-column']") as HTMLElement || selected.closest("td") as HTMLElement) : null;
        if (col && col.parentElement) {
          if (col.classList.contains("mj-column-per-100") || col.style.width === "100%") {
            col.classList.remove("mj-column-per-100");
            col.classList.add("mj-column-per-50");
            col.style.width = "50%";
          }
          const innerContent = newElement.querySelector("[class*='mj-column']") || newElement.querySelector("td") || newElement;
          const newCol = doc.createElement("div");
          newCol.className = "mj-column-per-50 mj-outlook-group-fix";
          newCol.style.cssText = "font-size:0px;text-align:center;direction:ltr;display:inline-block;vertical-align:top;width:50%;";
          newCol.innerHTML = innerContent.innerHTML;
          makeTextElementsEditable(newCol);

          if (targetPosition === "left") {
            col.parentElement.insertBefore(newCol, col);
          } else {
            col.parentElement.insertBefore(newCol, col.nextSibling);
          }
          inserted = true;
          handleSelectElement(newCol);
        }
      }

      if (!inserted) {
        if (selected) {
          selected.insertAdjacentElement("afterend", newElement);
        } else {
          doc.body.appendChild(newElement);
        }
        handleSelectElement(newElement);
      }
    } else if (targetPosition === "top") {
      // Row Above Insertion
      if (selected) {
        const targetSection = findSectionElement(selected, doc);
        targetSection.insertAdjacentElement("beforebegin", newElement);
      } else {
        const container = doc.querySelector(".container") || doc.querySelector(".mj-body") || doc.body;
        container.insertBefore(newElement, container.firstChild);
      }
      handleSelectElement(newElement);
    } else {
      // Row Below Insertion
      if (selected) {
        const targetSection = findSectionElement(selected, doc);
        targetSection.insertAdjacentElement("afterend", newElement);
      } else {
        const container = doc.querySelector(".container") || doc.querySelector(".mj-body") || doc.body;
        container.appendChild(newElement);
      }
      handleSelectElement(newElement);
    }

    setIsSaved(false);
    isInternalUpdateRef.current = true;
    pushHistory(exportPristineHtml());
  }, [handleSelectElement, exportPristineHtml, pushHistory, makeTextElementsEditable, extractInnerWidget, findSectionElement]);

  const selectedSectionHtml = useMemo(() => {
    const section = getCopyableSection();
    if (!section) return "";
    return serializeCleanSectionWithMso(section);
  }, [getCopyableSection, serializeCleanSectionWithMso, historyIndex]);

  // Replace targeted section in-place with AI-generated HTML
  const handleAiReplaceSection = useCallback((aiHtml: string): boolean => {
    const iframe = emailIframeRef.current;
    const doc = iframe?.contentDocument;
    const selected = selectedDomElementRef.current || selectedDomElement;
    if (!doc || !doc.body || !selected) return false;

    const targetSection = findSectionElement(selected, doc);
    if (!targetSection || targetSection === doc.body || targetSection === doc.documentElement || !targetSection.parentElement) {
      return false;
    }

    let cleaned = aiHtml.trim();
    cleaned = cleaned.replace(/^```(?:html)?\s*/i, "").replace(/\s*```$/i, "").trim();
    if (!cleaned) return false;

    const sanitized = sanitizeFragmentHtml(cleaned);
    const temp = doc.createElement("div");
    temp.innerHTML = sanitized;
    if (!temp.firstElementChild && !temp.firstChild) return false;

    const parent = targetSection.parentElement;

    // Check if incoming AI snippet includes outer MSO comments
    const hasIncomingMso = /<!--\s*\[if\s+mso/i.test(cleaned) || /\[if\s+mso/i.test(cleaned);

    const msoBefore = getAdjacentMsoCommentBefore(targetSection);
    const msoAfter = getAdjacentMsoCommentAfter(targetSection);

    // If incoming HTML provides its own MSO envelope, remove old outer MSO comments to avoid duplicate MSO tables
    if (hasIncomingMso) {
      if (msoBefore && msoBefore.parentElement === parent) {
        removeNodeAndPrecedingWhitespace(msoBefore);
      }
      if (msoAfter && msoAfter.parentElement === parent) {
        removeNodeAndFollowingWhitespace(msoAfter);
      }
    }

    const insertedNodes: HTMLElement[] = [];
    while (temp.firstChild) {
      const child = temp.firstChild;
      if (child.nodeType === 1) {
        insertedNodes.push(child as HTMLElement);
      }
      parent.insertBefore(child, targetSection);
    }

    targetSection.remove();
    makeTextElementsEditable(doc.body);

    if (insertedNodes.length > 0) {
      handleSelectElement(insertedNodes[0]);
    }

    setIsSaved(false);
    isInternalUpdateRef.current = true;
    pushHistory(exportPristineHtml());
    return true;
  }, [findSectionElement, sanitizeFragmentHtml, makeTextElementsEditable, handleSelectElement, exportPristineHtml, pushHistory, selectedDomElement]);

  // Insert AI-generated section above or below the current section
  const handleAiInsertSection = useCallback((aiHtml: string, position: "below" | "above" = "below"): boolean => {
    const iframe = emailIframeRef.current;
    const doc = iframe?.contentDocument;
    if (!doc || !doc.body) return false;

    const selected = selectedDomElementRef.current || selectedDomElement;
    let targetSection = selected ? findSectionElement(selected, doc) : null;
    if (targetSection === doc.body || targetSection === doc.documentElement) {
      targetSection = null;
    }

    let cleaned = aiHtml.trim();
    cleaned = cleaned.replace(/^```(?:html)?\s*/i, "").replace(/\s*```$/i, "").trim();
    if (!cleaned) return false;

    const sanitized = sanitizeFragmentHtml(cleaned);
    const temp = doc.createElement("div");
    temp.innerHTML = sanitized;
    if (!temp.firstElementChild && !temp.firstChild) return false;

    const insertedNodes: HTMLElement[] = [];
    const container = doc.querySelector(".container") || doc.querySelector(".mj-body") || doc.body;

    if (targetSection && targetSection.parentElement) {
      const parent = targetSection.parentElement;
      if (position === "above") {
        const msoBefore = getAdjacentMsoCommentBefore(targetSection);
        const insertAnchor = (msoBefore && msoBefore.parentElement === parent) ? msoBefore : targetSection;
        while (temp.firstChild) {
          const child = temp.firstChild;
          if (child.nodeType === 1) insertedNodes.push(child as HTMLElement);
          parent.insertBefore(child, insertAnchor);
        }
      } else {
        const msoAfter = getAdjacentMsoCommentAfter(targetSection);
        const insertAnchor = (msoAfter && msoAfter.parentElement === parent) ? msoAfter.nextSibling : targetSection.nextSibling;
        while (temp.firstChild) {
          const child = temp.firstChild;
          if (child.nodeType === 1) insertedNodes.push(child as HTMLElement);
          parent.insertBefore(child, insertAnchor);
        }
      }
    } else {
      if (position === "above") {
        const firstChild = container.firstElementChild;
        while (temp.firstChild) {
          const child = temp.firstChild;
          if (child.nodeType === 1) insertedNodes.push(child as HTMLElement);
          if (firstChild) {
            container.insertBefore(child, firstChild);
          } else {
            container.appendChild(child);
          }
        }
      } else {
        while (temp.firstChild) {
          const child = temp.firstChild;
          if (child.nodeType === 1) insertedNodes.push(child as HTMLElement);
          container.appendChild(child);
        }
      }
    }

    makeTextElementsEditable(doc.body);

    if (insertedNodes.length > 0) {
      handleSelectElement(insertedNodes[0]);
    }

    setIsSaved(false);
    isInternalUpdateRef.current = true;
    pushHistory(exportPristineHtml());
    return true;
  }, [findSectionElement, sanitizeFragmentHtml, makeTextElementsEditable, handleSelectElement, exportPristineHtml, pushHistory, selectedDomElement]);

  // Swap Left and Right columns in 2-column sections / cards
  const handleSwapColumns = useCallback(() => {
    const iframe = emailIframeRef.current;
    const doc = iframe?.contentDocument;
    if (!doc || !doc.body) return;

    const selected = selectedDomElementRef.current || selectedDomElement;
    if (!selected) return;

    const section = findSectionElement(selected, doc);
    let columns = Array.from(section.querySelectorAll(":scope > table > tbody > tr > td > [class*='mj-column'], :scope [class*='mj-column']")) as HTMLElement[];
    if (columns.length < 2) {
      columns = Array.from(section.querySelectorAll(":scope > table > tbody > tr > td, :scope tr > td")) as HTMLElement[];
    }
    if (columns.length >= 2) {
      const col1 = columns[0];
      const col2 = columns[1];
      if (col1.parentElement && col1.parentElement === col2.parentElement) {
        col1.parentElement.insertBefore(col2, col1);

        setIsSaved(false);
        isInternalUpdateRef.current = true;
        pushHistory(exportPristineHtml());
        handleSelectElement(col2);
      }
    }
  }, [findSectionElement, exportPristineHtml, pushHistory, handleSelectElement, selectedDomElement]);

  // Swap Vertical Order (e.g. Text Top / Button Bottom <-> Button Top / Text Bottom)
  const handleSwapVerticalOrder = useCallback(() => {
    const iframe = emailIframeRef.current;
    const doc = iframe?.contentDocument;
    if (!doc || !doc.body) return;

    const selected = selectedDomElementRef.current || selectedDomElement;
    if (!selected) return;

    let container: HTMLElement | null = selected;
    while (
      container &&
      container !== doc.body &&
      container.tagName.toLowerCase() !== "td" &&
      !container.classList.contains("mj-column-per-100") &&
      !container.classList.contains("mj-column-per-50") &&
      !container.classList.contains("mj-column-per-60") &&
      !container.classList.contains("mj-column-per-40")
    ) {
      container = container.parentElement;
    }

    if (!container) container = selected.parentElement;
    if (!container) return;

    const innerTd = (container.querySelector("table > tbody > tr > td") as HTMLElement) || container;
    const childBlocks = Array.from(innerTd.children).filter(
      (c) => c.nodeType === 1 && !c.classList?.contains("editor-selection-overlay")
    ) as HTMLElement[];

    if (childBlocks.length >= 2) {
      for (let i = childBlocks.length - 1; i >= 0; i--) {
        innerTd.appendChild(childBlocks[i]);
      }
      setIsSaved(false);
      isInternalUpdateRef.current = true;
      pushHistory(exportPristineHtml());
      handleSelectElement(childBlocks[0]);
    }
  }, [exportPristineHtml, pushHistory, handleSelectElement, selectedDomElement]);

  // Quick 1-click alignment for selected element or active section/column
  const handleQuickAlign = useCallback((align: "left" | "center" | "right") => {
    const iframe = emailIframeRef.current;
    const doc = iframe?.contentDocument;
    if (!doc || !doc.body) return;

    const selected = selectedDomElementRef.current || selectedDomElement;
    if (!selected) return;

    const isSectionOrColumn = selected.classList.contains("email-section-wrapper") || 
      selected.matches("[class*='mj-column']") || 
      selected.classList.contains("header-group");

    if (viewMode === "mobile") {
      // Mobile-Aware Alignment (Applies responsive CSS classes without altering desktop inline styles)
      const mobileAlignClasses = ["mobile-align-left", "mobile-align-center", "mobile-align-right", "mobile-center-img"];
      const newClass = `mobile-align-${align}`;

      if (isSectionOrColumn) {
        mobileAlignClasses.forEach((c) => selected.classList.remove(c));
        selected.classList.add(newClass);

        selected.querySelectorAll("table, img, div, p, a, h1, h2, h3, h4, h5, h6, td").forEach((n) => {
          const el = n as HTMLElement;
          mobileAlignClasses.forEach((c) => el.classList.remove(c));
          if (el.tagName === "IMG" && align === "center") {
            el.classList.add("mobile-center-img");
          }
          el.classList.add(newClass);
        });
      } else {
        // Individual Element Scope
        const tag = selected.tagName.toLowerCase();
        const imgEl = (tag === "img" ? selected : selected.querySelector("img")) as HTMLElement | null;
        if (imgEl) {
          let cell = imgEl.closest("td") as HTMLElement | null;
          const tableWrapper = imgEl.closest("table") as HTMLElement | null;
          if (cell && tableWrapper && cell.closest("table") === tableWrapper && tableWrapper.parentElement?.tagName === "TD") {
            cell = tableWrapper.parentElement as HTMLElement;
          }

          const targets = [selected, imgEl, imgEl.parentElement, tableWrapper, cell].filter(Boolean) as HTMLElement[];
          targets.forEach((el) => {
            mobileAlignClasses.forEach((c) => el.classList.remove(c));
            el.classList.add(newClass);
            if (align === "center") {
              el.classList.add("mobile-center-img");
            }
          });

          // Also check enclosing column div if found
          let p: HTMLElement | null = (cell || imgEl).parentElement;
          while (p && p !== doc.body && !p.classList.contains("email-section-wrapper")) {
            if (p.matches("[class*='mj-column']") || p.classList.contains("header-col") || p.classList.contains("logo-container")) {
              mobileAlignClasses.forEach((c) => p?.classList.remove(c));
              p.classList.add(newClass);
              if (align === "center") {
                p.classList.add("mobile-center-img");
              }
              break;
            }
            p = p.parentElement;
          }
        } else {
          mobileAlignClasses.forEach((c) => selected.classList.remove(c));
          selected.classList.add(newClass);

          // Also ensure parent block / column knows about mobile alignment if needed
          let p: HTMLElement | null = selected.parentElement;
          while (p && p !== doc.body && !p.classList.contains("email-section-wrapper")) {
            if (p.classList.contains("header-col") || p.classList.contains("logo-container") || p.tagName === "TD" || p.matches("[class*='mj-column']")) {
              mobileAlignClasses.forEach((c) => p?.classList.remove(c));
              p.classList.add(newClass);
              break;
            }
            p = p.parentElement;
          }
        }
      }
    } else {
      // Desktop Alignment (Updates standard inline styles, attributes, and image margins)
      if (isSectionOrColumn) {
        // 1. Text elements inside section/column
        const textEls = selected.querySelectorAll("p, h1, h2, h3, h4, h5, h6, span, div:not([class*='mj-column']), td");
        textEls.forEach((el) => {
          const htmlEl = el as HTMLElement;
          htmlEl.style.textAlign = align;
          htmlEl.setAttribute("align", align);
        });

        // 2. Buttons and Tables inside section/column
        const tables = selected.querySelectorAll("table");
        tables.forEach((tbl) => {
          const tableEl = tbl as HTMLElement;
          tableEl.setAttribute("align", align);
          if (align === "left") {
            tableEl.style.marginLeft = "0px";
            tableEl.style.marginRight = "auto";
          } else if (align === "center") {
            tableEl.style.marginLeft = "auto";
            tableEl.style.marginRight = "auto";
          } else if (align === "right") {
            tableEl.style.marginLeft = "auto";
            tableEl.style.marginRight = "0px";
          }
        });

        // 3. Images inside section/column
        const imgs = Array.from(selected.querySelectorAll("img"));
        imgs.forEach((img) => {
          const imgEl = img as HTMLElement;
          imgEl.style.display = "block";
          imgEl.setAttribute("align", align);
          if (align === "left") {
            imgEl.style.marginLeft = "0px";
            imgEl.style.marginRight = "auto";
          } else if (align === "center") {
            imgEl.style.marginLeft = "auto";
            imgEl.style.marginRight = "auto";
          } else if (align === "right") {
            imgEl.style.marginLeft = "auto";
            imgEl.style.marginRight = "0px";
          }
        });
      } else {
        // Individual Element Scope
        const tag = selected.tagName.toLowerCase();

        if (tag === "img") {
          const imgEl = selected as HTMLElement;
          imgEl.setAttribute("align", align);
          imgEl.style.display = "block";

          // Find the outer image cell (the TD containing the image/table in MJML)
          let cell = imgEl.closest("td") as HTMLElement | null;
          const tableWrapper = imgEl.closest("table") as HTMLElement | null;

          if (cell && tableWrapper && cell.closest("table") === tableWrapper && tableWrapper.parentElement?.tagName === "TD") {
            cell = tableWrapper.parentElement as HTMLElement;
          }

          if (cell) {
            cell.setAttribute("align", align);
            cell.style.textAlign = align;
          }

          if (tableWrapper) {
            tableWrapper.setAttribute("align", align);
            if (align === "left") {
              tableWrapper.style.marginLeft = "0px";
              tableWrapper.style.marginRight = "auto";
            } else if (align === "center") {
              tableWrapper.style.marginLeft = "auto";
              tableWrapper.style.marginRight = "auto";
            } else if (align === "right") {
              tableWrapper.style.marginLeft = "auto";
              tableWrapper.style.marginRight = "0px";
            }
          }

          if (align === "left") {
            imgEl.style.marginLeft = "0px";
            imgEl.style.marginRight = "auto";
          } else if (align === "center") {
            imgEl.style.marginLeft = "auto";
            imgEl.style.marginRight = "auto";
          } else if (align === "right") {
            imgEl.style.marginLeft = "auto";
            imgEl.style.marginRight = "0px";
          }
        } else if (tag === "table") {
          const tbl = selected as HTMLElement;
          tbl.setAttribute("align", align);
          if (align === "left") {
            tbl.style.marginLeft = "0px";
            tbl.style.marginRight = "auto";
          } else if (align === "center") {
            tbl.style.marginLeft = "auto";
            tbl.style.marginRight = "auto";
          } else if (align === "right") {
            tbl.style.marginLeft = "auto";
            tbl.style.marginRight = "0px";
          }
          tbl.querySelectorAll("td, p, a, div").forEach((n) => {
            const el = n as HTMLElement;
            el.style.textAlign = align;
            el.setAttribute("align", align);
          });
        } else {
          // Text element (p, h1-h6, span, a, div, td, etc.)
          selected.style.textAlign = align;
          selected.setAttribute("align", align);

          // If inline element (span, a, strong, etc.), also align the enclosing block element
          const parentBlock = selected.closest("p, h1, h2, h3, h4, h5, h6, td, div:not([class*='mj-column'])") as HTMLElement | null;
          if (parentBlock && parentBlock !== selected) {
            parentBlock.style.textAlign = align;
            parentBlock.setAttribute("align", align);
          }
        }
      }
    }

    ensureProductionUtilityStyle(doc);
    setIsSaved(false);
    isInternalUpdateRef.current = true;
    pushHistory(exportPristineHtml());
    if (selected) {
      setInlineStyles(extractElementStyles(selected));
    }
  }, [exportPristineHtml, pushHistory, extractElementStyles, ensureProductionUtilityStyle, selectedDomElement, viewMode]);

  // Vertical Alignment: Top, Middle (Center), Bottom
  const handleVerticalAlign = useCallback((valign: "top" | "middle" | "bottom") => {
    const iframe = emailIframeRef.current;
    const doc = iframe?.contentDocument;
    if (!doc || !doc.body) return;

    const selected = selectedDomElementRef.current || selectedDomElement;
    if (!selected) return;

    // Find the entire section container so all sibling columns align consistently (e.g. Image and Text columns)
    const section = findSectionElement(selected, doc);
    if (!section) return;

    // 1. Update all column containers in the section
    const columns = Array.from(section.querySelectorAll("[class*='mj-column'], tr > td")) as HTMLElement[];
    columns.forEach((col) => {
      col.style.verticalAlign = valign;
      col.setAttribute("valign", valign);

      // 2. Update all tables, rows, cells inside each column
      col.querySelectorAll("table, tr, td, div").forEach((node) => {
        const el = node as HTMLElement;
        el.style.verticalAlign = valign;
        el.setAttribute("valign", valign);
      });
    });

    // 3. Update section level tables & cells
    section.querySelectorAll("table, tr, td").forEach((node) => {
      const el = node as HTMLElement;
      el.style.verticalAlign = valign;
      el.setAttribute("valign", valign);
    });

    setIsSaved(false);
    isInternalUpdateRef.current = true;
    pushHistory(exportPristineHtml());
    if (selected) {
      setInlineStyles(extractElementStyles(selected));
    }
  }, [exportPristineHtml, pushHistory, extractElementStyles, selectedDomElement]);

  // Section-level Mobile Responsiveness (Stacking vs Fixed Row)
  const handleToggleSectionResponsiveness = useCallback((isResponsive: boolean) => {
    const iframe = emailIframeRef.current;
    const doc = iframe?.contentDocument;
    if (!doc || !doc.body) return;

    const selected = selectedDomElementRef.current || selectedDomElement;
    if (!selected) return;

    const section = findSectionElement(selected, doc);
    if (!section) return;

    if (isResponsive) {
      section.classList.remove("mobile-force-row");
      section.classList.add("mobile-force-stack");
      section.querySelectorAll("table, tr, td, div").forEach((n) => {
        (n as HTMLElement).classList.remove("mobile-force-row");
      });
    } else {
      section.classList.remove("mobile-force-stack");
      section.classList.add("mobile-force-row");
    }

    setIsSaved(false);
    isInternalUpdateRef.current = true;
    pushHistory(exportPristineHtml());
  }, [findSectionElement, exportPristineHtml, pushHistory, selectedDomElement]);

  const isPickingImageRef = useRef<boolean>(false);

  const inputDebounceTimerRef = useRef<any>(null);

  // Snapshot current DOM state into history cleanly
  const commitCurrentDomToHistory = useCallback((skipRestore = true) => {
    if (inputDebounceTimerRef.current) {
      clearTimeout(inputDebounceTimerRef.current);
      inputDebounceTimerRef.current = null;
    }
    const currentClean = exportPristineHtml();
    const currentIndex = historyIndexRef.current;
    const currentSnapshot = historyRef.current[currentIndex];
    if (currentClean && currentClean !== currentSnapshot) {
      if (skipRestore) skipNextDomRestoreRef.current = true;
      pushHistory(currentClean);
    }
  }, [exportPristineHtml, pushHistory]);

  const handleUndo = useCallback(() => {
    if (inputDebounceTimerRef.current) {
      clearTimeout(inputDebounceTimerRef.current);
      inputDebounceTimerRef.current = null;
      const currentClean = exportPristineHtml();
      const currentIndex = historyIndexRef.current;
      if (currentClean && currentClean !== historyRef.current[currentIndex]) {
        pushHistory(currentClean);
      }
    }

    const currentIndex = historyIndexRef.current;
    if (currentIndex > 0) {
      const targetIdx = currentIndex - 1;
      setHistoryState(historyRef.current, targetIdx);
      setIsSaved(false);
    }
  }, [exportPristineHtml, pushHistory, setHistoryState]);

  const handleRedo = useCallback(() => {
    if (inputDebounceTimerRef.current) {
      clearTimeout(inputDebounceTimerRef.current);
      inputDebounceTimerRef.current = null;
    }
    const currentClean = exportPristineHtml();
    const currentIndex = historyIndexRef.current;
    if (currentClean && currentClean !== historyRef.current[currentIndex]) {
      // Redo should not overwrite unsaved DOM edits; commit them as a new branch.
      pushHistory(currentClean);
      return;
    }

    if (currentIndex < historyRef.current.length - 1) {
      const targetIdx = currentIndex + 1;
      setHistoryState(historyRef.current, targetIdx);
      setIsSaved(false);
    }
  }, [exportPristineHtml, pushHistory, setHistoryState]);

  const sanitizeFileName = useCallback((name: string) => {
    const base = (name || "campaign.html").split(/[/\\]/).pop() || "campaign.html";
    const cleaned = base.replace(/[<>:"/\\|?*\x00-\x1F]/g, "_").trim();
    return cleaned.toLowerCase().endsWith(".html") || cleaned.toLowerCase().endsWith(".htm")
      ? cleaned
      : `${cleaned || "campaign"}.html`;
  }, []);

  const resolveSaveTarget = useCallback(() => {
    const cleanName = sanitizeFileName(fileName);
    if (initialFilePath && rawFolder) {
      const sep = initialFilePath.includes("\\") ? "\\" : "/";
      return `${rawFolder}${sep}${cleanName}`;
    }
    return initialFilePath || cleanName;
  }, [fileName, initialFilePath, rawFolder, sanitizeFileName]);

  const handleSave = useCallback(async () => {
    const saveVersion = ++saveVersionRef.current;
    try {
      commitCurrentDomToHistory();
      const fullHtml = exportPristineHtml();
      const saveTarget = resolveSaveTarget();
      const ok = await nativeIPC.saveFile(saveTarget, fullHtml);
      if (!ok) {
        if (saveVersion === saveVersionRef.current) {
          setSaveError("Save failed. Your changes remain unsaved.");
          setIsSaved(false);
        }
        return;
      }
      if (saveVersion === saveVersionRef.current && fullHtml === exportPristineHtml()) {
        setSaveError("");
        setIsSaved(true);
      }
    } catch (e) {
      console.error("Save error:", e);
      if (saveVersion === saveVersionRef.current) {
        setSaveError("Save failed. Your changes remain unsaved.");
        setIsSaved(false);
      }
    }
  }, [commitCurrentDomToHistory, exportPristineHtml, resolveSaveTarget]);

  // Unified keyboard shortcut handler (Ctrl+S, Ctrl+Z, Ctrl+Y, Ctrl+Shift+Z)
  const handleKeyDownShared = useCallback((e: KeyboardEvent) => {
    const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
    const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

    if (cmdOrCtrl && (e.key === "s" || e.key === "S")) {
      e.preventDefault();
      e.stopPropagation();
      handleSave();
    } else if (cmdOrCtrl && !e.shiftKey && (e.key === "z" || e.key === "Z")) {
      e.preventDefault();
      e.stopPropagation();
      handleUndo();
    } else if (cmdOrCtrl && (e.key === "y" || e.key === "Y" || (e.shiftKey && (e.key === "z" || e.key === "Z")))) {
      e.preventDefault();
      e.stopPropagation();
      handleRedo();
    }
  }, [handleSave, handleUndo, handleRedo]);

  const attachIframeListeners = useCallback((doc: Document, win: Window | null): (() => void) => {
    if (!doc || !doc.body) return () => {};
    iframeCleanupRef.current?.();
    iframeCleanupRef.current = null;

    const handleDocPointerDown = (e: MouseEvent) => {
      let target = e.target as HTMLElement | null;
      if (!target || target === doc.body || target === doc.documentElement) {
        if (selectedDomElementRef.current) {
          selectedDomElementRef.current.classList.remove("editor-active-selected");
        }
        selectedDomElementRef.current = null;
        setSelectedDomElement(null);
        setInlineStyles({});
        setFloatingToolbarPos(null);
        setShowLinkPopover(false);
        setShowColorPopover(false);
        setShowImageUrlPopover(false);
        setActiveLinkNode(null);
        return;
      }

      // Enable contentEditable on text leaf elements if not already set
      if (["h1","h2","h3","h4","h5","h6","p","span","a","td","li","b","strong","em","div"].includes(target.tagName.toLowerCase())) {
        if (!target.contentEditable || target.contentEditable === "inherit" || target.contentEditable === "false") {
          const hasBlock = Array.from(target.children).some((c) => ["div", "table", "p", "section"].includes(c.tagName.toLowerCase()));
          if (!hasBlock) {
            target.contentEditable = "true";
            target.spellcheck = false;
          }
        }
      }

      // Check if clicked element is an Image
      if (target.tagName.toLowerCase() === "img") {
        const iframe = emailIframeRef.current;
        const rect = target.getBoundingClientRect();
        const iframeRect = iframe ? iframe.getBoundingClientRect() : { top: 0, left: 0 };
        const topPos = Math.max(10, iframeRect.top + rect.top - 52);
        const leftPos = Math.max(10, Math.min(window.innerWidth - 360, iframeRect.left + rect.left + rect.width / 2 - 170));
        setFloatingToolbarPos({ top: topPos, left: leftPos });

        const currentSrc = target.getAttribute("src") || "";
        setImageUrlInput(currentSrc);

        const imgLink = target.closest("a") as HTMLAnchorElement | null;
        setActiveLinkNode(imgLink);
        if (imgLink) {
          setLinkHref(imgLink.getAttribute("href") || "");
          setLinkTargetBlank(imgLink.getAttribute("target") === "_blank");
        } else {
          setLinkHref("");
          setLinkTargetBlank(false);
        }
      }

      // If in "New Section Row" mode or "AI" mode, selecting any component selects the outer section parent
      if ((inspectorTabRef.current === "components" && insertScopeRef.current === "section") || inspectorTabRef.current === "ai") {
        const sectionTarget = findSectionElement(target, doc);
        handleSelectElement(sectionTarget);
      } else {
        // In "Inside Column" or styles mode, select the exact element so user can edit text, style, or add components inside
        handleSelectElement(target);
      }
    };

    const handleDocDblClick = async (e: MouseEvent) => {
      let target = e.target as HTMLElement | null;
      if (!target) return;
      const imgEl = target.tagName.toLowerCase() === "img" ? (target as HTMLImageElement) : null;
      if (!imgEl) return;

      e.stopPropagation();
      e.preventDefault();

      if (isPickingImageRef.current) return;
      isPickingImageRef.current = true;

      try {
        const res = await nativeIPC.chooseImage();
        if (res && res.success && res.path) {
          const chosenPath = res.path;
          const pkgDir = normalizedFolder || localStorage.getItem("nocodemail_last_pkg_dir") || "";
          const assetsDir = pkgDir ? `${pkgDir}\\assets` : "assets";

          const copyRes = await nativeIPC.copyAsset(chosenPath, assetsDir);
          if (!copyRes.success || !copyRes.new_relative_path) {
            throw new Error(copyRes.error || "Failed to copy image into assets");
          }
          const finalRelPath = copyRes.new_relative_path;
          const liveSrc = pkgPrefix ? `${pkgPrefix}${finalRelPath}` : finalRelPath;

          imgEl.src = liveSrc;
          imgEl.setAttribute("src", liveSrc);

          setIsSaved(false);
          isInternalUpdateRef.current = true;
          pushHistory(exportPristineHtml());
        }
      } catch (err) {
        console.error("Image replace error:", err);
      } finally {
        isPickingImageRef.current = false;
      }
    };

    const handleDocInput = () => {
      setIsSaved(false);
      if (inputDebounceTimerRef.current) {
        clearTimeout(inputDebounceTimerRef.current);
      }
      inputDebounceTimerRef.current = setTimeout(() => {
        commitCurrentDomToHistory();
      }, 500);
    };

    const handleDocBlur = () => {
      commitCurrentDomToHistory();
    };

    const handleDocSelectionChange = () => {
      if (!win) return;
      const selection = win.getSelection();
      if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
        if (floatingToolbarRef.current && floatingToolbarRef.current.contains(document.activeElement)) {
          return;
        }
        setFloatingToolbarPos(null);
        setShowLinkPopover(false);
        setShowColorPopover(false);
        setShowImageUrlPopover(false);
        setActiveLinkNode(null);
        return;
      }

      const range = selection.getRangeAt(0);
      const commonAncestor = range.commonAncestorContainer;
      const anchorNode = commonAncestor.nodeType === Node.TEXT_NODE ? commonAncestor.parentElement : (commonAncestor as HTMLElement);

      if (!anchorNode || !doc.body.contains(anchorNode)) {
        setFloatingToolbarPos(null);
        return;
      }

      const rect = range.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) {
        setFloatingToolbarPos(null);
        return;
      }

      let currentLink: HTMLAnchorElement | null = null;
      let checkNode: HTMLElement | null = anchorNode;
      while (checkNode && checkNode !== doc.body) {
        if (checkNode.tagName.toLowerCase() === "a") {
          currentLink = checkNode as HTMLAnchorElement;
          break;
        }
        checkNode = checkNode.parentElement;
      }

      setActiveLinkNode(currentLink);
      if (currentLink) {
        setLinkHref(currentLink.getAttribute("href") || "");
        setLinkTargetBlank(currentLink.getAttribute("target") === "_blank");
      }

      setSavedRange(range.cloneRange());

      const iframe = emailIframeRef.current;
      const iframeRect = iframe ? iframe.getBoundingClientRect() : { top: 0, left: 0 };
      const topPos = Math.max(10, iframeRect.top + rect.top - 52);
      const leftPos = Math.max(10, Math.min(window.innerWidth - 360, iframeRect.left + rect.left + rect.width / 2 - 170));
      setFloatingToolbarPos({ top: topPos, left: leftPos });
    };

    const handleDocClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest("a")) {
        e.preventDefault();
      }
    };

    doc.addEventListener("pointerdown", handleDocPointerDown, true);
    doc.addEventListener("click", handleDocClick, true);
    doc.addEventListener("dblclick", handleDocDblClick, true);
    doc.addEventListener("input", handleDocInput);
    doc.addEventListener("blur", handleDocBlur, true);
    doc.addEventListener("selectionchange", handleDocSelectionChange);
    doc.addEventListener("keydown", handleKeyDownShared, true);

    const cleanup = () => {
      doc.removeEventListener("pointerdown", handleDocPointerDown, true);
      doc.removeEventListener("click", handleDocClick, true);
      doc.removeEventListener("dblclick", handleDocDblClick, true);
      doc.removeEventListener("input", handleDocInput);
      doc.removeEventListener("blur", handleDocBlur, true);
      doc.removeEventListener("selectionchange", handleDocSelectionChange);
      doc.removeEventListener("keydown", handleKeyDownShared, true);
    };
    iframeCleanupRef.current = cleanup;
    return cleanup;
  }, [findSectionElement, handleSelectElement, handleKeyDownShared, commitCurrentDomToHistory, exportPristineHtml, pushHistory, normalizedFolder, pkgPrefix]);

  // 1. Persistent keyboard listener on the host window plus iframe load hookup.
  useEffect(() => {
    const iframe = emailIframeRef.current;
    if (!iframe) return;

    const onLoad = () => {
      const doc = iframe.contentDocument;
      if (doc) attachIframeListeners(doc, iframe.contentWindow);
    };

    iframe.addEventListener("load", onLoad);
    window.addEventListener("keydown", handleKeyDownShared, true);

    return () => {
      iframe.removeEventListener("load", onLoad);
      window.removeEventListener("keydown", handleKeyDownShared, true);
      iframeCleanupRef.current?.();
      iframeCleanupRef.current = null;
    };
  }, [attachIframeListeners, handleKeyDownShared]);

  // 2. Mount document into direct DOM container on load or Undo/Redo
  useEffect(() => {
    if (isInternalUpdateRef.current || skipNextDomRestoreRef.current) {
      isInternalUpdateRef.current = false;
      skipNextDomRestoreRef.current = false;
      return;
    }

    const iframe = emailIframeRef.current;
    if (!iframe) return;
    const doc = iframe.contentDocument;
    if (!doc) return;

    // Track previously selected element path before innerHTML replacement
    const getDomPath = (el: HTMLElement, root: HTMLElement): number[] => {
      const path: number[] = [];
      let curr: HTMLElement | null = el;
      while (curr && curr !== root) {
        const parent = curr.parentElement;
        if (!parent) break;
        const index = Array.from(parent.children).indexOf(curr);
        path.unshift(index);
        curr = parent;
      }
      return path;
    };

    const getFromDomPath = (path: number[], root: HTMLElement): HTMLElement | null => {
      let curr: HTMLElement = root;
      for (const idx of path) {
        if (!curr.children || !curr.children[idx]) return null;
        curr = curr.children[idx] as HTMLElement;
      }
      return curr;
    };

    let selectedPath: number[] | null = null;
    if (selectedDomElementRef.current && doc.body && doc.body.contains(selectedDomElementRef.current)) {
      selectedPath = getDomPath(selectedDomElementRef.current, doc.body);
    }

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

    preparedHtml = sanitizeHtmlForEditor(preparedHtml);

    // Write sanitized email HTML into the sandboxed iframe
    iframeCleanupRef.current?.();
    iframeCleanupRef.current = null;
    doc.open();
    doc.write(preparedHtml);
    doc.close();
    sanitizeDocumentForEditor(doc);
    ensureProductionUtilityStyle(doc);

    // Inject temporary editor-only hover/selection styles separately from retained production utilities.
    doc.querySelectorAll(`[${EDITOR_STYLE_ATTR}], [${LEGACY_EDITOR_STYLE_ATTR}]`).forEach((el) => el.remove());
    const editorStyle = doc.createElement("style");
    editorStyle.setAttribute(EDITOR_STYLE_ATTR, "true");
    editorStyle.textContent = `
      html, body {
        overflow-x: hidden !important;
        overflow-y: hidden !important;
        height: auto !important;
      }
      *:hover {
        outline: 1.5px dashed #93c5fd !important;
        outline-offset: 1px !important;
      }
      [contenteditable="true"], p, h1, h2, h3, h4, h5, h6, span, a, td, li {
        cursor: text !important;
      }
      img, button, .email-section-wrapper {
        cursor: pointer !important;
      }
      .editor-active-selected {
        outline: 2.5px solid #2563eb !important;
        outline-offset: 2px !important;
        box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.25) !important;
        border-radius: 2px !important;
      }
      img.editor-active-selected {
        cursor: default !important;
      }
    `;
    doc.head?.appendChild(editorStyle);

    // Auto-adjust iframe height to email content so no inner scrollbar appears
    recalcIframeHeight();
    const heightTimer = window.setTimeout(recalcIframeHeight, 150);

    // ResizeObserver watches content changes and updates iframe height dynamically.
    let resizeObserver: ResizeObserver | null = null;
    try {
      resizeObserver = new ResizeObserver(() => {
        recalcIframeHeight();
      });
      if (doc.body) resizeObserver.observe(doc.body);
      if (doc.documentElement) resizeObserver.observe(doc.documentElement);
    } catch {
      resizeObserver = null;
    }

    setIframeDomRoot(doc.body);

    // Enable inline contentEditable on text leaf elements & disable phantom image drag
    const editableTags = ["h1", "h2", "h3", "h4", "h5", "h6", "p", "span", "a", "td", "li", "button", "b", "strong", "em", "div"];
    doc.querySelectorAll("*").forEach((node) => {
      const el = node as HTMLElement;
      if (el.tagName.toLowerCase() === "img") {
        el.setAttribute("draggable", "false");
        el.addEventListener("load", recalcIframeHeight);
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

    // Re-synchronize selected element and Style Inspector with undone/redone state
    if (selectedPath && doc.body) {
      const reselectedEl = getFromDomPath(selectedPath, doc.body);
      if (reselectedEl) {
        reselectedEl.classList.add("editor-active-selected");
        selectedDomElementRef.current = reselectedEl;
        setSelectedDomElement(reselectedEl);
        setSelectedTagName(reselectedEl.tagName.toLowerCase());
        setInlineStyles(extractElementStyles(reselectedEl));
      } else {
        selectedDomElementRef.current = null;
        setSelectedDomElement(null);
        setInlineStyles({});
      }
    } else {
      selectedDomElementRef.current = null;
      setSelectedDomElement(null);
      setInlineStyles({});
    }

    // Attach all interactive & keyboard listeners to the freshly rendered iframe document
    attachIframeListeners(doc, iframe.contentWindow);

    return () => {
      window.clearTimeout(heightTimer);
      resizeObserver?.disconnect();
    };
  }, [historyIndex, startHtml, pkgPrefix, attachIframeListeners, sanitizeHtmlForEditor, sanitizeDocumentForEditor, ensureProductionUtilityStyle, EDITOR_STYLE_ATTR, LEGACY_EDITOR_STYLE_ATTR]);

  // Style update handlers
  const normalizeCssValue = (property: string, value: string) => {
    let cleanVal = value.trim();
    const dimensionProps = new Set([
      "font-size", "width", "height", "max-width", "min-width", "max-height", "min-height",
      "padding", "padding-top", "padding-right", "padding-bottom", "padding-left",
      "margin", "margin-top", "margin-right", "margin-bottom", "margin-left",
      "border-width", "border-radius", "top", "left", "right", "bottom", "letter-spacing"
    ]);
    if (dimensionProps.has(property.toLowerCase()) && /^[+-]?\d+(?:\.\d+)?$/.test(cleanVal)) {
      cleanVal = `${cleanVal}px`;
    }
    return cleanVal;
  };

  const isCssDeclarationValid = (property: string, value: string) => {
    if (!property.trim()) return false;
    const doc = emailIframeRef.current?.contentDocument || document;
    const probe = doc.createElement("div");
    probe.style.setProperty(property, value);
    return probe.style.length > 0;
  };

  const syncEmailAttributesForStyle = (el: HTMLElement, property: string, value: string, remove = false) => {
    const propLower = property.toLowerCase();
    if (remove) {
      if (propLower === "width") el.removeAttribute("width");
      if (propLower === "height") el.removeAttribute("height");
      if (propLower === "background-color" || propLower === "background") el.removeAttribute("bgcolor");
      if (propLower === "text-align") el.removeAttribute("align");
      return;
    }

    if (propLower === "width" && /^-?\d+(?:\.\d+)?px$/.test(value)) {
      el.setAttribute("width", value.replace(/px$/i, ""));
    } else if (propLower === "height" && /^-?\d+(?:\.\d+)?px$/.test(value)) {
      el.setAttribute("height", value.replace(/px$/i, ""));
    } else if (propLower === "background-color" || propLower === "background") {
      el.setAttribute("bgcolor", value);
    } else if (propLower === "text-align" && /^(left|center|right|justify)$/i.test(value)) {
      el.setAttribute("align", value);
    }
  };

  const handleUpdateStyle = (property: string, value: string) => {
    const prop = property.trim();
    const cleanVal = normalizeCssValue(prop, value);
    if (!isCssDeclarationValid(prop, cleanVal)) return;

    const updated = { ...inlineStyles, [prop]: cleanVal };
    setInlineStyles(updated);

    const el = selectedDomElementRef.current || selectedDomElement;
    if (el) {
      el.style.setProperty(prop, cleanVal);
      syncEmailAttributesForStyle(el, prop, cleanVal);

      setIsSaved(false);
      isInternalUpdateRef.current = true;
      pushHistory(exportPristineHtml());
    }
  };

  const handleRenameStyle = (oldProperty: string, newProperty: string, value: string) => {
    const nextProp = newProperty.trim();
    if (!nextProp) return;
    const cleanVal = normalizeCssValue(nextProp, value);
    if (!isCssDeclarationValid(nextProp, cleanVal)) return;

    const updated: Record<string, string> = {};
    Object.keys(inlineStyles).forEach((k) => {
      if (k === oldProperty) {
        updated[nextProp] = cleanVal;
      } else {
        updated[k] = inlineStyles[k];
      }
    });
    setInlineStyles(updated);

    const el = selectedDomElementRef.current || selectedDomElement;
    if (el) {
      el.style.removeProperty(oldProperty);
      el.style.setProperty(nextProp, cleanVal);
      syncEmailAttributesForStyle(el, oldProperty, "", true);
      syncEmailAttributesForStyle(el, nextProp, cleanVal);
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
      syncEmailAttributesForStyle(el, property, "", true);
      setIsSaved(false);
      isInternalUpdateRef.current = true;
      pushHistory(exportPristineHtml());
    }
  };

  const handleReplaceImage = async (imgElement: HTMLElement) => {
    if (!imgElement || imgElement.tagName.toLowerCase() !== "img") return;
    try {
      const res = await nativeIPC.chooseImage();
      if (res && res.success && res.path) {
        let finalSrc = res.path;
        if (fileFolder) {
          const assetsDir = `${fileFolder}/assets`;
          const copyRes = await nativeIPC.copyAsset(res.path, assetsDir);
          if (!copyRes.success || !copyRes.new_relative_path) {
            throw new Error(copyRes.error || "Failed to copy image into assets");
          }
          finalSrc = pkgPrefix ? `${pkgPrefix}${copyRes.new_relative_path}` : copyRes.new_relative_path;
        }
        imgElement.setAttribute("src", finalSrc);
        setIsSaved(false);
        isInternalUpdateRef.current = true;
        pushHistory(exportPristineHtml());
      }
    } catch (err) {
      console.error("Error replacing image:", err);
      setSaveError("Image replacement failed.");
    }
  };

  const handleApplyImageUrl = () => {
    const cleanUrl = imageUrlInput.trim();
    if (!cleanUrl) {
      setShowImageUrlPopover(false);
      return;
    }
    const el = selectedDomElementRef.current || selectedDomElement;
    if (!el) {
      setShowImageUrlPopover(false);
      return;
    }
    const imgEl = el.tagName.toLowerCase() === "img" ? el : el.querySelector("img");
    if (imgEl) {
      imgEl.setAttribute("src", cleanUrl);
      (imgEl as HTMLImageElement).src = cleanUrl;
      setIsSaved(false);
      isInternalUpdateRef.current = true;
      pushHistory(exportPristineHtml());
    }
    setShowImageUrlPopover(false);
  };

  const handleUpdateAttribute = (el: HTMLElement, attr: string, value: string) => {
    if (!el) return;
    const cleanAttr = attr.trim();
    if (!cleanAttr || cleanAttr.toLowerCase().startsWith("on") || cleanAttr.toLowerCase() === "srcdoc") return;
    if (["href", "src", "xlink:href", "background"].includes(cleanAttr.toLowerCase()) && !isPermittedUrlValue(value)) {
      setSaveError("Blocked an unsafe URL attribute.");
      return;
    }
    el.setAttribute(cleanAttr, value);
    setIsSaved(false);
    isInternalUpdateRef.current = true;
    pushHistory(exportPristineHtml());
  };

  // Restore selection range when user clicks toolbar buttons
  const restoreRange = useCallback((): boolean => {
    const iframe = emailIframeRef.current;
    const doc = iframe?.contentDocument;
    const win = iframe?.contentWindow;
    if (!doc || !win || !savedRange) return false;
    try {
      if (!doc.body.contains(savedRange.commonAncestorContainer)) return false;
      const selection = win.getSelection();
      if (!selection) return false;
      selection.removeAllRanges();
      selection.addRange(savedRange);
      return true;
    } catch {
      return false;
    }
  }, [savedRange]);

  // Execute standard text formatting commands and pipe cleanly into undo/redo history
  const handleFormatText = (command: "bold" | "italic" | "underline" | "superscript" | "subscript") => {
    if (!restoreRange()) return;
    const doc = emailIframeRef.current?.contentDocument;
    doc?.execCommand(command, false);
    setIsSaved(false);
    isInternalUpdateRef.current = true;
    pushHistory(exportPristineHtml());
  };

  // Apply text color and pipe into history
  const handleApplyTextColor = (color: string) => {
    if (!/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(color)) return;
    setSelectedTextColor(color);
    if (!restoreRange()) return;
    const doc = emailIframeRef.current?.contentDocument;
    doc?.execCommand("foreColor", false, color);
    setShowColorPopover(false);
    setIsSaved(false);
    isInternalUpdateRef.current = true;
    pushHistory(exportPristineHtml());
  };

  const normalizeLinkUrl = useCallback((rawValue: string): string | null => {
    const raw = rawValue.trim();
    if (!raw) return null;
    if (/^(https?:|mailto:|tel:|#|\/|\.\/|\.\.\/)/i.test(raw)) return raw;
    if (/^[^\s:@]+@[^\s:@]+\.[^\s:@]+$/.test(raw)) return `mailto:${raw}`;
    if (/^[A-Za-z0-9.-]+\.[A-Za-z]{2,}(?:[/?#].*)?$/.test(raw)) return `https://${raw}`;
    return isPermittedUrlValue(raw) ? raw : null;
  }, [isPermittedUrlValue]);

  // Apply or update link with href and target, pipe into history
  const handleApplyLink = () => {
    const normalizedUrl = normalizeLinkUrl(linkHref);
    if (!normalizedUrl) {
      setShowLinkPopover(false);
      return;
    }

    const isImage = selectedDomElement?.tagName.toLowerCase() === "img";
    const doc = emailIframeRef.current?.contentDocument;
    const win = emailIframeRef.current?.contentWindow;

    if (isImage && selectedDomElement && doc) {
      if (activeLinkNode && doc.body.contains(activeLinkNode)) {
        activeLinkNode.setAttribute("href", normalizedUrl);
        if (linkTargetBlank) {
          activeLinkNode.setAttribute("target", "_blank");
          activeLinkNode.setAttribute("rel", "noopener noreferrer");
        } else {
          activeLinkNode.removeAttribute("target");
          activeLinkNode.removeAttribute("rel");
        }
      } else {
        const a = doc.createElement("a");
        a.setAttribute("href", normalizedUrl);
        if (linkTargetBlank) {
          a.setAttribute("target", "_blank");
          a.setAttribute("rel", "noopener noreferrer");
        }
        a.style.display = "inline-block";
        a.style.textDecoration = "none";
        const parent = selectedDomElement.parentElement;
        if (parent) {
          parent.insertBefore(a, selectedDomElement);
          a.appendChild(selectedDomElement);
          setActiveLinkNode(a);
        }
      }
    } else if (activeLinkNode && doc?.body.contains(activeLinkNode)) {
      activeLinkNode.setAttribute("href", normalizedUrl);
      if (linkTargetBlank) {
        activeLinkNode.setAttribute("target", "_blank");
        activeLinkNode.setAttribute("rel", "noopener noreferrer");
      } else {
        activeLinkNode.removeAttribute("target");
        activeLinkNode.removeAttribute("rel");
      }
    } else if (doc && win && restoreRange()) {
      doc.execCommand("createLink", false, normalizedUrl);
      const selection = win.getSelection();
      if (selection?.anchorNode) {
        let parentEl = selection.anchorNode.nodeType === Node.TEXT_NODE ? selection.anchorNode.parentElement : (selection.anchorNode as HTMLElement);
        while (parentEl && parentEl.tagName.toLowerCase() !== "a" && parentEl !== doc.body) {
          parentEl = parentEl.parentElement;
        }
        if (parentEl?.tagName.toLowerCase() === "a") {
          if (linkTargetBlank) {
            parentEl.setAttribute("target", "_blank");
            parentEl.setAttribute("rel", "noopener noreferrer");
          }
        }
      }
    }

    setShowLinkPopover(false);
    setSavedRange(null);
    setIsSaved(false);
    isInternalUpdateRef.current = true;
    pushHistory(exportPristineHtml());
  };

  // Remove link and pipe into history
  const handleRemoveLink = () => {
    const doc = emailIframeRef.current?.contentDocument;
    if (activeLinkNode && doc?.body.contains(activeLinkNode)) {
      const parent = activeLinkNode.parentNode;
      while (activeLinkNode.firstChild) {
        parent?.insertBefore(activeLinkNode.firstChild, activeLinkNode);
      }
      parent?.removeChild(activeLinkNode);
    } else if (doc && restoreRange()) {
      doc.execCommand("unlink", false);
    }
    setActiveLinkNode(null);
    setShowLinkPopover(false);
    setSavedRange(null);
    setIsSaved(false);
    isInternalUpdateRef.current = true;
    pushHistory(exportPristineHtml());
  };

  const handleOpenCodeView = () => {
    setRawCodeText(exportPristineHtml());
    setShowCodeModal(true);
  };

  const handleApplyCodeModal = () => {
    const sanitized = sanitizeHtmlForEditor(rawCodeText);
    if (sanitized.trim()) {
      setSavedRange(null);
      setShowLinkPopover(false);
      setShowColorPopover(false);
      pushHistory(sanitized);
      setShowCodeModal(false);
    }
  };

  const handleToggleBrowserMenu = async () => {
    if (!showBrowserMenu) {
      setLoadingBrowsers(true);
      setShowBrowserMenu(true);
      try {
        const browsers = await nativeIPC.getInstalledBrowsers();
        setDetectedBrowsers(browsers);
      } catch (err) {
        console.error("Failed to detect browsers:", err);
      } finally {
        setLoadingBrowsers(false);
      }
    } else {
      setShowBrowserMenu(false);
    }
  };

  const handleLaunchBrowser = async (browser: BrowserInfo | null) => {
    setShowBrowserMenu(false);
    const pristine = exportPristineHtml();

    const previewTarget = rawFolder
      ? `${rawFolder}${initialFilePath?.includes("/") ? "/" : "\\"}__nocodemail_preview.html`
      : "__nocodemail_preview.html";

    try {
      const saved = await nativeIPC.saveFile(previewTarget, pristine);
      if (!saved) {
        setSaveError("Could not create a browser preview file.");
        return;
      }
      const opened = await nativeIPC.openInBrowser({
        path: previewTarget,
        browser_path: browser ? browser.path : undefined,
      });
      if (!opened) {
        setSaveError("Could not open the browser preview.");
      }
    } catch (err) {
      console.error("Failed to open browser:", err);
      setSaveError("Could not open the browser preview.");
    }
  };

  return (
    <div className="screen3-container">
      {/* Top Navbar */}
      <header
        className="editor-top-nav"
        style={{
          height: "52px",
          minHeight: "52px",
          padding: "0 18px",
          background: "#ffffff",
          borderBottom: "1px solid #e2e8f0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
          position: "relative",
          zIndex: 100,
        }}
      >
        {/* Left Section: Back Button + Brand Logo & File Name */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
          {/* Back Navigation Button */}
          <button
            type="button"
            onClick={onBackToProcess || onBackToHome}
            title={onBackToProcess ? "Back to Extraction Process (Screen 2)" : "Back to Home"}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              padding: "5px 10px",
              borderRadius: "7px",
              background: "#ffffff",
              border: "1px solid #cbd5e1",
              color: "#334155",
              fontSize: "11.5px",
              fontWeight: "600",
              cursor: "pointer",
              height: "31px",
              boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
              transition: "all 0.12s ease",
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#f8fafc";
              e.currentTarget.style.borderColor = "#94a3b8";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#ffffff";
              e.currentTarget.style.borderColor = "#cbd5e1";
            }}
          >
            <ArrowLeft size={13} color="#475569" />
            <span>{onBackToProcess ? "Back" : "Home"}</span>
          </button>

          <div style={{ width: "1px", height: "18px", background: "#e2e8f0", flexShrink: 0 }}></div>

          <div
            className="brand-logo small"
            onClick={onBackToHome}
            title="Go to Welcome Screen"
            style={{
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              flexShrink: 0,
            }}
          >
            <div
              className="logo-badge"
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "7px",
                background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
                color: "#ffffff",
                fontWeight: "800",
                fontSize: "14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              N
            </div>
            <span style={{ fontSize: "15px", fontWeight: "700", color: "#0f172a", letterSpacing: "-0.01em" }}>
              NoCodeMail
            </span>
          </div>

          <div style={{ width: "1px", height: "18px", background: "#e2e8f0", flexShrink: 0 }}></div>

          <div style={{ minWidth: 0 }}>
            {isEditingName ? (
              <input
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                onBlur={() => setIsEditingName(false)}
                onKeyDown={(e) => e.key === "Enter" && setIsEditingName(false)}
                autoFocus
                style={{
                  padding: "4px 8px",
                  borderRadius: "6px",
                  border: "1.5px solid #4f46e5",
                  fontSize: "12px",
                  fontWeight: "600",
                  color: "#0f172a",
                  outline: "none",
                  background: "#ffffff",
                  width: "180px",
                }}
              />
            ) : (
              <div
                onClick={() => setIsEditingName(true)}
                title={`Click to rename: ${fileName}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "4px 8px",
                  borderRadius: "6px",
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  cursor: "pointer",
                  maxWidth: "200px",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#f1f5f9")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "#f8fafc")}
              >
                <span style={{ fontSize: "12px", fontWeight: "600", color: "#334155", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {fileName}
                </span>
                <Pencil size={11} color="#94a3b8" style={{ flexShrink: 0 }} />
              </div>
            )}
          </div>
        </div>

        {/* Center Controls: Viewport Mode, Width, Undo/Redo (Hidden in Preview Mode) */}
        {editorMode === "edit" ? (
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
            {/* Segmented Viewport Switcher */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                background: "#f1f5f9",
                padding: "2px",
                borderRadius: "7px",
                border: "1px solid #e2e8f0",
                gap: "2px",
              }}
            >
              <button
                type="button"
                onClick={() => handleSwitchViewMode("desktop")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  padding: "4px 9px",
                  borderRadius: "5px",
                  fontSize: "11.5px",
                  fontWeight: viewMode === "desktop" ? "700" : "600",
                  background: viewMode === "desktop" ? "#ffffff" : "transparent",
                  color: viewMode === "desktop" ? "#4f46e5" : "#64748b",
                  border: "none",
                  cursor: "pointer",
                  boxShadow: viewMode === "desktop" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                  transition: "all 0.12s ease",
                }}
              >
                <Monitor size={13} />
                <span>Desktop</span>
              </button>
              <button
                type="button"
                onClick={() => handleSwitchViewMode("mobile")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  padding: "4px 9px",
                  borderRadius: "5px",
                  fontSize: "11.5px",
                  fontWeight: viewMode === "mobile" ? "700" : "600",
                  background: viewMode === "mobile" ? "#ffffff" : "transparent",
                  color: viewMode === "mobile" ? "#4f46e5" : "#64748b",
                  border: "none",
                  cursor: "pointer",
                  boxShadow: viewMode === "mobile" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                  transition: "all 0.12s ease",
                }}
              >
                <Smartphone size={13} />
                <span>Mobile</span>
              </button>
            </div>

            {/* Width Control: Range Slider for Mobile (320px - 490px) or Static Pill for Desktop */}
            {viewMode === "mobile" ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "3px 8px",
                  borderRadius: "6px",
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                }}
              >
                <span style={{ fontSize: "11px", fontWeight: "700", color: "#4f46e5", minWidth: "40px", textAlign: "center" }}>
                  {mobileWidth}px
                </span>
                <input
                  type="range"
                  min="320"
                  max="490"
                  step="1"
                  value={mobileWidth}
                  onChange={(e) => setMobileWidth(Number(e.target.value))}
                  style={{
                    width: "80px",
                    accentColor: "#4f46e5",
                    cursor: "pointer",
                    height: "4px",
                  }}
                  title="Slide to resize mobile view (320px - 490px)"
                />
                <button
                  type="button"
                  onClick={() => setMobileWidth(375)}
                  title="Reset to 375px default (iPhone/Mobile)"
                  style={{
                    fontSize: "10px",
                    fontWeight: "700",
                    padding: "1px 5px",
                    borderRadius: "3px",
                    border: "1px solid #cbd5e1",
                    background: mobileWidth === 375 ? "#4f46e5" : "#ffffff",
                    color: mobileWidth === 375 ? "#ffffff" : "#64748b",
                    cursor: "pointer",
                  }}
                >
                  375
                </button>
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "4px 8px",
                  borderRadius: "6px",
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  fontSize: "11.5px",
                  fontWeight: "600",
                  color: "#475569",
                }}
              >
                <span>700px</span>
              </div>
            )}

            {/* Undo / Redo */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                background: "#f1f5f9",
                padding: "2px",
                borderRadius: "6px",
                border: "1px solid #e2e8f0",
                gap: "1px",
              }}
            >
              <button
                type="button"
                onClick={handleUndo}
                disabled={historyIndex === 0}
                title="Undo (Ctrl+Z)"
                style={{
                  padding: "3px 6px",
                  borderRadius: "4px",
                  border: "none",
                  background: "transparent",
                  color: historyIndex === 0 ? "#cbd5e1" : "#475569",
                  cursor: historyIndex === 0 ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <Undo2 size={13} />
              </button>
              <button
                type="button"
                onClick={handleRedo}
                disabled={historyIndex === history.length - 1}
                title="Redo (Ctrl+Y)"
                style={{
                  padding: "3px 6px",
                  borderRadius: "4px",
                  border: "none",
                  background: "transparent",
                  color: historyIndex === history.length - 1 ? "#cbd5e1" : "#475569",
                  cursor: historyIndex === history.length - 1 ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <Redo2 size={13} />
              </button>
            </div>

            {/* Save Status Indicator & Button (Placed right side of Undo/Redo) */}
            <button
              type="button"
              onClick={handleSave}
              title={isSaved ? "All changes saved" : "Click to save changes (Ctrl+S)"}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                padding: "4px 8px",
                borderRadius: "6px",
                background: isSaved ? "#f0fdf4" : "#fffbeb",
                border: isSaved ? "1px solid #bbf7d0" : "1px solid #fde68a",
                color: isSaved ? "#15803d" : "#b45309",
                fontSize: "11px",
                fontWeight: "700",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <span
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: isSaved ? "#22c55e" : "#f59e0b",
                }}
              ></span>
              <span>{isSaved ? "Saved" : "Save*"}</span>
            </button>

            {saveError && (
              <span role="status" style={{ fontSize: "10.5px", fontWeight: 700, color: "#dc2626", maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={saveError}>
                {saveError}
              </span>
            )}
          </div>
        ) : (
          <div style={{ flex: 1 }} />
        )}

        {/* Right Controls: Edit/Preview Toggle, Browser Dropdown, Code View */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
          {/* Edit / Preview Segmented Switcher */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              background: "#f1f5f9",
              padding: "2px",
              borderRadius: "7px",
              border: "1px solid #e2e8f0",
              gap: "2px",
            }}
          >
            <button
              type="button"
              onClick={() => {
                setEditorMode("edit");
                setTimeout(() => {
                  recalcIframeHeight();
                }, 50);
              }}
              title="Visual Email Editor"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                padding: "4px 9px",
                borderRadius: "5px",
                fontSize: "11.5px",
                fontWeight: editorMode === "edit" ? "700" : "600",
                background: editorMode === "edit" ? "#ffffff" : "transparent",
                color: editorMode === "edit" ? "#4f46e5" : "#64748b",
                border: "none",
                cursor: "pointer",
                boxShadow: editorMode === "edit" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                transition: "all 0.12s ease",
              }}
            >
              <Pencil size={12} />
              <span>Edit</span>
            </button>
            <button
              type="button"
              onClick={() => {
                const liveHtml = exportPristineHtml();
                setPreviewHtmlSnapshot(liveHtml || historyRef.current[historyIndexRef.current] || startHtml);
                setEditorMode("preview");
              }}
              title="Preview on Email on Acid & Mailgun Inspect Devices"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                padding: "4px 9px",
                borderRadius: "5px",
                fontSize: "11.5px",
                fontWeight: editorMode === "preview" ? "700" : "600",
                background: editorMode === "preview" ? "#ffffff" : "transparent",
                color: editorMode === "preview" ? "#4f46e5" : "#64748b",
                border: "none",
                cursor: "pointer",
                boxShadow: editorMode === "preview" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                transition: "all 0.12s ease",
              }}
            >
              <Eye size={12} />
              <span>Preview</span>
            </button>
          </div>

          <div style={{ width: "1px", height: "18px", background: "#e2e8f0" }}></div>

          {/* Open in Browser Multi-Browser Dropdown */}
          <div ref={browserMenuRef} style={{ position: "relative" }}>
            <button
              type="button"
              onClick={handleToggleBrowserMenu}
              title="Open in Installed Browser"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                padding: "5px 10px",
                borderRadius: "7px",
                background: "#ffffff",
                border: "1px solid #cbd5e1",
                cursor: "pointer",
                fontWeight: "600",
                fontSize: "11.5px",
                color: "#334155",
                whiteSpace: "nowrap",
                height: "31px",
                transition: "all 0.12s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#ffffff")}
            >
              <ExternalLink size={13} color="#4f46e5" />
              <span>Browser</span>
              <ChevronDown size={11} color="#64748b" />
            </button>

            {showBrowserMenu && (
              <div 
                style={{
                  position: "absolute",
                  top: "100%",
                  right: 0,
                  marginTop: "6px",
                  width: "230px",
                  background: "#ffffff",
                  borderRadius: "9px",
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 10px 25px -5px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)",
                  padding: "5px",
                  zIndex: 9999,
                  animation: "fadeIn 0.12s ease-out",
                }}
              >
                <div style={{
                  padding: "5px 8px",
                  fontSize: "10px",
                  fontWeight: "700",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: "#94a3b8",
                  borderBottom: "1px solid #f1f5f9",
                  marginBottom: "3px",
                }}>
                  {loadingBrowsers ? "Detecting Browsers..." : `Installed Browsers (${detectedBrowsers.length})`}
                </div>

                {detectedBrowsers.map((b) => (
                  <button
                    key={b.id || b.name}
                    type="button"
                    onClick={() => handleLaunchBrowser(b)}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: "7px",
                      padding: "7px 9px",
                      borderRadius: "5px",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      fontSize: "11.5px",
                      fontWeight: "600",
                      color: "#1e293b",
                      textAlign: "left",
                      transition: "background 0.1s ease",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#f1f5f9")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <Globe size={13} color="#4f46e5" />
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {b.name}
                    </span>
                  </button>
                ))}

                <div style={{ height: "1px", background: "#f1f5f9", margin: "3px 0" }}></div>

                <button
                  type="button"
                  onClick={() => handleLaunchBrowser(null)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: "7px",
                    padding: "7px 9px",
                    borderRadius: "5px",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "11.5px",
                    fontWeight: "600",
                    color: "#64748b",
                    textAlign: "left",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#f1f5f9")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <ExternalLink size={12} color="#64748b" />
                  <span>Default Browser</span>
                </button>
              </div>
            )}
          </div>

          {/* View Code Button */}
          <button
            type="button"
            onClick={handleOpenCodeView}
            title="View Raw HTML Code"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              padding: "5px 10px",
              borderRadius: "7px",
              background: "#ffffff",
              border: "1px solid #cbd5e1",
              cursor: "pointer",
              fontWeight: "600",
              fontSize: "11.5px",
              color: "#334155",
              height: "31px",
              transition: "all 0.12s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#ffffff")}
          >
            <Code2 size={13} color="#475569" />
            <span>Code</span>
          </button>
        </div>
      </header>

      {/* Device Preview Viewer (Mailgun Inspect / Email on Acid) */}
      <div
        style={{
          display: editorMode === "preview" ? "flex" : "none",
          flex: 1,
          minHeight: 0,
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <DevicePreviewViewer
          htmlContent={previewHtmlSnapshot || historyRef.current[historyIndexRef.current] || startHtml}
          emailSubject={fileName}
          pdfName={fileName || initialFileName}
          pkgPrefix={pkgPrefix}
        />
      </div>

      {/* Main Visual Editor Workspace — Always Preserved in DOM */}
      <div
        className="editor-workspace"
        style={{
          display: editorMode === "edit" ? "flex" : "none",
          flex: 1,
          minHeight: 0,
        }}
      >
        {/* Left / Center Canvas Area */}
        <div className="canvas-scroll-area" ref={canvasContainerRef} style={{ position: "relative" }}>
          <div className="canvas-width-indicator" style={{ width: canvasWidth, transition: isResizingMobile ? "none" : "width 0.28s cubic-bezier(0.4, 0, 0.2, 1)" }}>
            <div className="indicator-line"></div>
            <span className="indicator-text">{canvasWidth}</span>
            <div className="indicator-line"></div>
          </div>

          {/* Email Direct DOM Card */}
          <div
            className="email-iframe-wrapper"
            style={{ 
              width: canvasWidth, 
              minHeight: "200px", 
              position: "relative",
              borderRadius: "8px",
              boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
              background: "#ffffff",
              marginBottom: "32px",
              transition: isResizingMobile ? "none" : "width 0.28s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          >
            <iframe
              ref={emailIframeRef}
              title="Email Canvas"
              sandbox="allow-same-origin"
              referrerPolicy="no-referrer"
              scrolling="no"
              style={{
                width: "100%",
                minHeight: "200px",
                border: "none",
                display: "block",
                backgroundColor: "#ffffff",
                overflow: "hidden",
              }}
            />
          </div>
        </div>

        {/* Floating Contextual Formatting Toolbar */}
        {floatingToolbarPos && (() => {
          const activeAlign = (() => {
            const el = selectedDomElementRef.current || selectedDomElement;
            if (!el) return null;
            if (viewMode === "mobile") {
              if (el.classList.contains("mobile-align-left") || el.closest(".mobile-align-left")) return "left";
              if (el.classList.contains("mobile-align-center") || el.classList.contains("mobile-center-img") || el.closest(".mobile-align-center") || el.closest(".mobile-center-img")) return "center";
              if (el.classList.contains("mobile-align-right") || el.closest(".mobile-align-right")) return "right";
              return null;
            } else {
              const textAlign = inlineStyles["text-align"] || el.style?.textAlign || el.getAttribute("align");
              if (textAlign === "left" || textAlign === "center" || textAlign === "right") return textAlign;

              if (el.tagName === "IMG" || el.querySelector("img")) {
                const img = (el.tagName === "IMG" ? el : el.querySelector("img")) as HTMLElement;
                if (img) {
                  const alignAttr = img.getAttribute("align");
                  if (alignAttr === "left" || alignAttr === "center" || alignAttr === "right") return alignAttr;
                  const ml = img.style?.marginLeft || inlineStyles["margin-left"];
                  const mr = img.style?.marginRight || inlineStyles["margin-right"];
                  if (ml === "auto" && mr === "auto") return "center";
                  if (ml === "auto" && (mr === "0" || mr === "0px")) return "right";
                  if ((ml === "0" || ml === "0px") && mr === "auto") return "left";
                }
              }

              const parentBlock = el.closest("p, h1, h2, h3, h4, h5, h6, td, div, table") as HTMLElement | null;
              if (parentBlock) {
                const pAlign = parentBlock.style?.textAlign || parentBlock.getAttribute("align");
                if (pAlign === "left" || pAlign === "center" || pAlign === "right") return pAlign;
              }
              return null;
            }
          })();

          return (
            <div
              ref={floatingToolbarRef}
              className="floating-selection-toolbar"
              style={{
                position: "fixed",
                top: `${floatingToolbarPos.top}px`,
                left: `${floatingToolbarPos.left}px`,
                background: "#1e293b",
                borderRadius: "8px",
                boxShadow: "0 6px 20px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.1)",
                display: "flex",
                alignItems: "center",
                gap: "2px",
                padding: "4px 6px",
                zIndex: 9999,
                userSelect: "none",
                animation: "fadeIn 0.12s ease-out",
              }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              {/* If selected element is an Image, show Image Floating Toolbar */}
              {selectedDomElement?.tagName.toLowerCase() === "img" ? (
                <>
                  {/* 1. Image Link / Edit Link */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowColorPopover(false);
                      setShowLinkPopover(!showLinkPopover);
                    }}
                    title={activeLinkNode ? "Edit Image Link" : "Add Link to Image"}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      padding: "5px 8px",
                      borderRadius: "5px",
                      border: "none",
                      background: activeLinkNode || showLinkPopover ? "#4f46e5" : "transparent",
                      color: "#ffffff",
                      cursor: "pointer",
                      fontSize: "11px",
                      fontWeight: "600",
                      transition: "all 0.1s ease",
                    }}
                  >
                    <Link2 size={13} color="#ffffff" />
                    <span>{activeLinkNode ? "Edit Link" : "Add Link"}</span>
                  </button>

                  {activeLinkNode && (
                    <button
                      type="button"
                      onClick={handleRemoveLink}
                      title="Remove Link (Unlink Image)"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        padding: "5px 7px",
                        borderRadius: "5px",
                        border: "none",
                        background: "transparent",
                        color: "#ef4444",
                        cursor: "pointer",
                      }}
                    >
                      <Unlink size={13} />
                    </button>
                  )}

                  <div style={{ width: "1px", height: "16px", background: "#334155", margin: "0 2px" }}></div>

                  {/* 2. Replace Image from computer */}
                  <button
                    type="button"
                    onClick={() => selectedDomElement && handleReplaceImage(selectedDomElement)}
                    title="Replace Image from computer"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      padding: "5px 7px",
                      borderRadius: "5px",
                      border: "none",
                      background: "transparent",
                      color: "#f8fafc",
                      cursor: "pointer",
                      fontSize: "11px",
                      fontWeight: "600",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#334155")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <ImageIcon size={13} color="#38bdf8" />
                    <span>Replace</span>
                  </button>

                  {/* 2b. Replace with Cloud URL */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowLinkPopover(false);
                      setShowColorPopover(false);
                      if (!showImageUrlPopover && selectedDomElement) {
                        setImageUrlInput(selectedDomElement.getAttribute("src") || "");
                      }
                      setShowImageUrlPopover(!showImageUrlPopover);
                    }}
                    title="Replace Image with Cloud URL / Direct Web Link"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      padding: "5px 7px",
                      borderRadius: "5px",
                      border: "none",
                      background: showImageUrlPopover ? "#0284c7" : "transparent",
                      color: "#f8fafc",
                      cursor: "pointer",
                      fontSize: "11px",
                      fontWeight: "600",
                    }}
                    onMouseEnter={(e) => {
                      if (!showImageUrlPopover) e.currentTarget.style.background = "#334155";
                    }}
                    onMouseLeave={(e) => {
                      if (!showImageUrlPopover) e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <Cloud size={13} color="#38bdf8" />
                    <span>Cloud Link</span>
                  </button>

                  <div style={{ width: "1px", height: "16px", background: "#334155", margin: "0 2px" }}></div>

                  {/* 3. Horizontal Alignment */}
                  <button
                    type="button"
                    onClick={() => handleQuickAlign("left")}
                    title={`Align Left ${viewMode === "mobile" ? "(Mobile)" : "(Desktop)"}`}
                    style={{
                      padding: "5px 6px",
                      borderRadius: "5px",
                      border: "none",
                      background: activeAlign === "left" ? "#4f46e5" : "transparent",
                      color: "#f8fafc",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => {
                      if (activeAlign !== "left") e.currentTarget.style.background = "#334155";
                    }}
                    onMouseLeave={(e) => {
                      if (activeAlign !== "left") e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <AlignLeft size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickAlign("center")}
                    title={`Center Align ${viewMode === "mobile" ? "(Mobile)" : "(Desktop)"}`}
                    style={{
                      padding: "5px 6px",
                      borderRadius: "5px",
                      border: "none",
                      background: activeAlign === "center" ? "#4f46e5" : "transparent",
                      color: "#f8fafc",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => {
                      if (activeAlign !== "center") e.currentTarget.style.background = "#334155";
                    }}
                    onMouseLeave={(e) => {
                      if (activeAlign !== "center") e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <AlignCenter size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickAlign("right")}
                    title={`Align Right ${viewMode === "mobile" ? "(Mobile)" : "(Desktop)"}`}
                    style={{
                      padding: "5px 6px",
                      borderRadius: "5px",
                      border: "none",
                      background: activeAlign === "right" ? "#4f46e5" : "transparent",
                      color: "#f8fafc",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => {
                      if (activeAlign !== "right") e.currentTarget.style.background = "#334155";
                    }}
                    onMouseLeave={(e) => {
                      if (activeAlign !== "right") e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <AlignRight size={13} />
                  </button>

                  <div style={{ width: "1px", height: "16px", background: "#334155", margin: "0 2px" }}></div>

                  {/* 4. Vertical Alignment */}
                  <button
                    type="button"
                    onClick={() => handleVerticalAlign("top")}
                    title="Vertical Align Top"
                    style={{ padding: "5px 6px", borderRadius: "5px", border: "none", background: "transparent", color: "#f8fafc", cursor: "pointer" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#334155")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <ChevronUp size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleVerticalAlign("middle")}
                    title="Vertical Align Middle"
                    style={{ padding: "5px 6px", borderRadius: "5px", border: "none", background: "transparent", color: "#f8fafc", cursor: "pointer", fontSize: "10px" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#334155")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    ⏺️
                  </button>
                  <button
                    type="button"
                    onClick={() => handleVerticalAlign("bottom")}
                    title="Vertical Align Bottom"
                    style={{ padding: "5px 6px", borderRadius: "5px", border: "none", background: "transparent", color: "#f8fafc", cursor: "pointer" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#334155")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <ChevronDown size={13} />
                  </button>
                </>
              ) : (
                <>
                  {/* 1. Link Button (Highlighted First if active link) */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowColorPopover(false);
                      setShowLinkPopover(!showLinkPopover);
                    }}
                    title={activeLinkNode ? "Edit Hyperlink (Active Link)" : "Insert Hyperlink"}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      padding: "5px 8px",
                      borderRadius: "5px",
                      border: "none",
                      background: activeLinkNode || showLinkPopover ? "#4f46e5" : "transparent",
                      color: "#ffffff",
                      cursor: "pointer",
                      fontSize: "12px",
                      fontWeight: "600",
                      transition: "all 0.1s ease",
                    }}
                  >
                    <Link2 size={13} color="#ffffff" />
                    {activeLinkNode && <span>Edit Link</span>}
                  </button>

                  {/* Unlink button if active link */}
                  {activeLinkNode && (
                    <button
                      type="button"
                      onClick={handleRemoveLink}
                      title="Remove Link (Unlink)"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        padding: "5px 7px",
                        borderRadius: "5px",
                        border: "none",
                        background: "transparent",
                        color: "#ef4444",
                        cursor: "pointer",
                      }}
                    >
                      <Unlink size={13} />
                    </button>
                  )}

                  <div style={{ width: "1px", height: "16px", background: "#334155", margin: "0 2px" }}></div>

                  {/* 2. Superscript (<sup>) */}
                  <button
                    type="button"
                    onClick={() => handleFormatText("superscript")}
                    title="Superscript (e.g. 1,2 or TM)"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "2px",
                      padding: "5px 7px",
                      borderRadius: "5px",
                      border: "none",
                      background: "transparent",
                      color: "#f8fafc",
                      cursor: "pointer",
                      fontSize: "12px",
                      fontWeight: "700",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#334155")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <SuperIcon size={14} />
                    <span style={{ fontSize: "11px" }}>x²</span>
                  </button>

                  {/* 3. Subscript (<sub>) */}
                  <button
                    type="button"
                    onClick={() => handleFormatText("subscript")}
                    title="Subscript (e.g. H2O)"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "2px",
                      padding: "5px 7px",
                      borderRadius: "5px",
                      border: "none",
                      background: "transparent",
                      color: "#f8fafc",
                      cursor: "pointer",
                      fontSize: "12px",
                      fontWeight: "700",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#334155")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <SubIcon size={14} />
                    <span style={{ fontSize: "11px" }}>x₂</span>
                  </button>

                  <div style={{ width: "1px", height: "16px", background: "#334155", margin: "0 2px" }}></div>

                  {/* 4. Bold */}
                  <button
                    type="button"
                    onClick={() => handleFormatText("bold")}
                    title="Bold (Ctrl+B)"
                    style={{
                      padding: "5px 7px",
                      borderRadius: "5px",
                      border: "none",
                      background: "transparent",
                      color: "#f8fafc",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#334155")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <Bold size={13} />
                  </button>

                  {/* 5. Italic */}
                  <button
                    type="button"
                    onClick={() => handleFormatText("italic")}
                    title="Italic (Ctrl+I)"
                    style={{
                      padding: "5px 7px",
                      borderRadius: "5px",
                      border: "none",
                      background: "transparent",
                      color: "#f8fafc",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#334155")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <Italic size={13} />
                  </button>

                  {/* 6. Underline */}
                  <button
                    type="button"
                    onClick={() => handleFormatText("underline")}
                    title="Underline (Ctrl+U)"
                    style={{
                      padding: "5px 7px",
                      borderRadius: "5px",
                      border: "none",
                      background: "transparent",
                      color: "#f8fafc",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#334155")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <Underline size={13} />
                  </button>

                  <div style={{ width: "1px", height: "16px", background: "#334155", margin: "0 2px" }}></div>

                  {/* Text Alignment Buttons (Left, Center, Right) */}
                  <button
                    type="button"
                    onClick={() => handleQuickAlign("left")}
                    title={`Align Left ${viewMode === "mobile" ? "(Mobile)" : "(Desktop)"}`}
                    style={{
                      padding: "5px 6px",
                      borderRadius: "5px",
                      border: "none",
                      background: activeAlign === "left" ? "#4f46e5" : "transparent",
                      color: "#f8fafc",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => {
                      if (activeAlign !== "left") e.currentTarget.style.background = "#334155";
                    }}
                    onMouseLeave={(e) => {
                      if (activeAlign !== "left") e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <AlignLeft size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickAlign("center")}
                    title={`Center Align ${viewMode === "mobile" ? "(Mobile)" : "(Desktop)"}`}
                    style={{
                      padding: "5px 6px",
                      borderRadius: "5px",
                      border: "none",
                      background: activeAlign === "center" ? "#4f46e5" : "transparent",
                      color: "#f8fafc",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => {
                      if (activeAlign !== "center") e.currentTarget.style.background = "#334155";
                    }}
                    onMouseLeave={(e) => {
                      if (activeAlign !== "center") e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <AlignCenter size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickAlign("right")}
                    title={`Align Right ${viewMode === "mobile" ? "(Mobile)" : "(Desktop)"}`}
                    style={{
                      padding: "5px 6px",
                      borderRadius: "5px",
                      border: "none",
                      background: activeAlign === "right" ? "#4f46e5" : "transparent",
                      color: "#f8fafc",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => {
                      if (activeAlign !== "right") e.currentTarget.style.background = "#334155";
                    }}
                    onMouseLeave={(e) => {
                      if (activeAlign !== "right") e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <AlignRight size={13} />
                  </button>

                  <div style={{ width: "1px", height: "16px", background: "#334155", margin: "0 2px" }}></div>

                  {/* 7. Color Picker */}
                  <div style={{ position: "relative" }}>
                    <button
                      type="button"
                      onClick={() => {
                        setShowLinkPopover(false);
                        setShowColorPopover(!showColorPopover);
                      }}
                      title="Change Text Color"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        padding: "5px 7px",
                        borderRadius: "5px",
                        border: "none",
                        background: showColorPopover ? "#334155" : "transparent",
                        color: "#f8fafc",
                        cursor: "pointer",
                      }}
                    >
                      <Palette size={13} />
                      <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: selectedTextColor, border: "1px solid #ffffff" }} />
                    </button>

                    {/* Color Swatch Popover */}
                    {showColorPopover && (
                      <div
                        style={{
                          position: "absolute",
                          top: "100%",
                          left: "50%",
                          transform: "translateX(-50%)",
                          marginTop: "8px",
                          background: "#ffffff",
                          borderRadius: "8px",
                          padding: "8px",
                          boxShadow: "0 8px 20px rgba(0,0,0,0.25)",
                          border: "1px solid #e2e8f0",
                          display: "grid",
                          gridTemplateColumns: "repeat(5, 20px)",
                          gap: "6px",
                          zIndex: 10000,
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                      >
                        {[
                          "#000000", "#151515", "#475569", "#94a3b8", "#ffffff",
                          "#ef4444", "#f97316", "#eab308", "#16a34a", "#2563eb",
                          "#4f46e5", "#7c3aed", "#9333ea", "#db2777", "#9e0b0f"
                        ].map((c) => (
                          <div
                            key={c}
                            onClick={() => handleApplyTextColor(c)}
                            style={{
                              width: "20px",
                              height: "20px",
                              borderRadius: "4px",
                              background: c,
                              border: c === "#ffffff" ? "1px solid #cbd5e1" : "1px solid rgba(0,0,0,0.1)",
                              cursor: "pointer",
                              transition: "transform 0.1s ease",
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.2)")}
                            onMouseLeave={(e) => (e.currentTarget.style.transform = "none")}
                            title={c}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  <div style={{ width: "1px", height: "16px", background: "#334155", margin: "0 4px" }}></div>

                  {/* Quick Add Elements inside column below active element */}
                  <button
                    type="button"
                    onClick={() => {
                      const btnPreset = EMAIL_COMPONENT_PRESETS.find((p) => p.id === "button-cta");
                      if (btnPreset) {
                        handleInsertPreset(btnPreset.generateHtml(), "bottom", "column");
                      }
                    }}
                    title="Add Button inside this column below active text"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "3px",
                      padding: "4px 8px",
                      borderRadius: "5px",
                      border: "none",
                      background: "#4f46e5",
                      color: "#ffffff",
                      cursor: "pointer",
                      fontSize: "11px",
                      fontWeight: "700",
                    }}
                  >
                    <Plus size={12} />
                    <span>Button</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const imgPreset = EMAIL_COMPONENT_PRESETS.find((p) => p.id === "hero-image");
                      if (imgPreset) {
                        handleInsertPreset(imgPreset.generateHtml(), "bottom", "column");
                      }
                    }}
                    title="Add Image inside this column below active text"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "3px",
                      padding: "4px 8px",
                      borderRadius: "5px",
                      border: "none",
                      background: "#334155",
                      color: "#f8fafc",
                      cursor: "pointer",
                      fontSize: "11px",
                      fontWeight: "600",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#475569")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "#334155")}
                  >
                    <Plus size={12} />
                    <span>Image</span>
                  </button>
                </>
              )}

              {/* Link Edit Popover */}
              {showLinkPopover && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: "0",
                    marginTop: "8px",
                    background: "#ffffff",
                    borderRadius: "8px",
                    padding: "12px",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
                  border: "1px solid #cbd5e1",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  width: "280px",
                  zIndex: 10000,
                }}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "11px", fontWeight: "700", color: "#334155" }}>
                    {selectedDomElement?.tagName.toLowerCase() === "img" ? "Image Link URL" : (activeLinkNode ? "Edit Link" : "Insert Link")}
                  </span>
                  {activeLinkNode && (
                    <button
                      type="button"
                      onClick={handleRemoveLink}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "#ef4444",
                        fontSize: "10.5px",
                        fontWeight: "600",
                        cursor: "pointer",
                      }}
                    >
                      Remove Link
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={linkHref}
                  onChange={(e) => setLinkHref(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleApplyLink()}
                  placeholder="https://example.com"
                  autoFocus
                  style={{
                    padding: "6px 8px",
                    borderRadius: "5px",
                    border: "1px solid #cbd5e1",
                    fontSize: "12px",
                    color: "#0f172a",
                    outline: "none",
                    width: "100%",
                  }}
                />
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "11px",
                    color: "#475569",
                    cursor: "pointer",
                    userSelect: "none",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={linkTargetBlank}
                    onChange={(e) => setLinkTargetBlank(e.target.checked)}
                    style={{ accentColor: "#4f46e5", cursor: "pointer" }}
                  />
                  <span>Open link in new tab (<code>target="_blank"</code>)</span>
                </label>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "6px", marginTop: "2px" }}>
                  <button
                    type="button"
                    onClick={() => setShowLinkPopover(false)}
                    style={{
                      padding: "4px 8px",
                      borderRadius: "4px",
                      border: "1px solid #e2e8f0",
                      background: "#f8fafc",
                      fontSize: "11px",
                      fontWeight: "600",
                      color: "#64748b",
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyLink}
                    style={{
                      padding: "4px 10px",
                      borderRadius: "4px",
                      border: "none",
                      background: "#4f46e5",
                      color: "#ffffff",
                      fontSize: "11px",
                      fontWeight: "700",
                      cursor: "pointer",
                    }}
                  >
                    Apply Link
                  </button>
                </div>
              </div>
            )}

            {/* Cloud Image URL Popover */}
            {showImageUrlPopover && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  left: "0",
                  marginTop: "8px",
                  background: "#ffffff",
                  borderRadius: "8px",
                  padding: "12px",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
                  border: "1px solid #cbd5e1",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  width: "320px",
                  zIndex: 10000,
                }}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <Cloud size={14} color="#0284c7" />
                    <span style={{ fontSize: "11.5px", fontWeight: "700", color: "#1e293b" }}>
                      Replace with Cloud Image URL
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowImageUrlPopover(false)}
                    style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer", padding: "2px", display: "flex", alignItems: "center" }}
                  >
                    <X size={13} />
                  </button>
                </div>
                <p style={{ margin: 0, fontSize: "10.5px", color: "#64748b", lineHeight: "1.35" }}>
                  Enter any direct cloud or CDN image URL (e.g. AWS S3, Cloudinary, Imgur, or website link).
                </p>
                <input
                  type="url"
                  value={imageUrlInput}
                  onChange={(e) => setImageUrlInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleApplyImageUrl();
                    }
                  }}
                  placeholder="https://example.com/image.jpg"
                  autoFocus
                  style={{
                    padding: "6px 8px",
                    borderRadius: "5px",
                    border: "1px solid #cbd5e1",
                    fontSize: "12px",
                    color: "#0f172a",
                    outline: "none",
                    width: "100%",
                    boxSizing: "border-box",
                  }}
                />
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "6px", marginTop: "2px" }}>
                  <button
                    type="button"
                    onClick={() => setShowImageUrlPopover(false)}
                    style={{
                      padding: "4px 8px",
                      borderRadius: "4px",
                      border: "1px solid #e2e8f0",
                      background: "#f8fafc",
                      fontSize: "11px",
                      fontWeight: "600",
                      color: "#64748b",
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyImageUrl}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      padding: "4px 12px",
                      borderRadius: "4px",
                      border: "none",
                      background: "#0284c7",
                      color: "#ffffff",
                      fontSize: "11px",
                      fontWeight: "700",
                      cursor: "pointer",
                    }}
                  >
                    <Check size={12} />
                    <span>Apply URL</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })()}

        {/* Right Sidebar: Chrome DevTools Style Inspector & Component Library */}
        <aside className="editor-sidebar-inspector">
          <StyleInspector
            selectedElement={selectedDomElement}
            inlineStyles={inlineStyles}
            viewMode={viewMode}
            activeTab={inspectorTab}
            onTabChange={handleTabChange}
            insertScope={insertScope}
            onInsertScopeChange={handleInsertScopeChange}
            onSwapColumns={handleSwapColumns}
            onSwapVerticalOrder={handleSwapVerticalOrder}
            onQuickAlign={handleQuickAlign}
            onVerticalAlign={handleVerticalAlign}
            onToggleSectionResponsiveness={handleToggleSectionResponsiveness}
            isSectionResponsive={isSelectedSectionResponsive}
            onUpdateStyle={handleUpdateStyle}
            onRemoveStyle={handleRemoveStyle}
            onRenameStyle={handleRenameStyle}
            onSelectElement={handleSelectElement}
            onInsertPreset={handleInsertPreset}
            onReplaceImage={handleReplaceImage}
            onUpdateAttribute={handleUpdateAttribute}
            canCopySectionCode={canCopySectionCode}
            copySectionStatus={sectionCopyStatus}
            onCopySectionCode={handleCopySectionCode}
            onAiReplaceSection={handleAiReplaceSection}
            onAiInsertSection={handleAiInsertSection}
            selectedSectionHtml={selectedSectionHtml}
            domRoot={iframeDomRoot || emailIframeRef.current?.contentDocument?.body || null}
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

