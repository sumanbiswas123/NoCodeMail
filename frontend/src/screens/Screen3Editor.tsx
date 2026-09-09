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
  Square
} from "lucide-react";
import { StyleInspector } from "../components/StyleInspector";
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

  // Floating text formatting toolbar state
  const [floatingToolbarPos, setFloatingToolbarPos] = useState<{ top: number; left: number } | null>(null);
  const [savedRange, setSavedRange] = useState<Range | null>(null);
  const [activeLinkNode, setActiveLinkNode] = useState<HTMLAnchorElement | null>(null);
  const [showLinkPopover, setShowLinkPopover] = useState(false);
  const [linkHref, setLinkHref] = useState("");
  const [linkTargetBlank, setLinkTargetBlank] = useState(true);
  const [showColorPopover, setShowColorPopover] = useState(false);
  const [selectedTextColor, setSelectedTextColor] = useState("#151515");
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

    // Double-click on <img> to trigger image replacement and copy to assets folder
    const handleContainerDblClick = async (e: MouseEvent) => {
      let target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.tagName.toLowerCase() === "img" || target.querySelector("img")) {
        const imgEl = target.tagName.toLowerCase() === "img" ? (target as HTMLImageElement) : (target.querySelector("img") as HTMLImageElement);
        if (!imgEl) return;

        try {
          const res = await nativeIPC.chooseImage();
          if (res.success && res.path) {
            const chosenPath = res.path;
            const pkgDir = normalizedFolder || localStorage.getItem("nocodemail_last_pkg_dir") || "";
            const assetsDir = pkgDir ? `${pkgDir}\\assets` : "assets";

            // If selected from outside, copy to assets directory to keep original intact
            const copyRes = await nativeIPC.copyAsset(chosenPath, assetsDir);
            let finalRelPath = copyRes.new_relative_path || `assets/${chosenPath.split(/[/\\]/).pop()}`;
            let liveSrc = pkgPrefix ? `${pkgPrefix}${finalRelPath}` : `/${finalRelPath}`;

            imgEl.src = liveSrc;
            imgEl.setAttribute("src", liveSrc);

            setIsSaved(false);
            isInternalUpdateRef.current = true;
            pushHistory(exportPristineHtml());
          }
        } catch (err) {
          console.error("Image replace error:", err);
        }
      }
    };

    const handleContainerInput = () => {
      setIsSaved(false);
    };

    const handleDragStart = (e: DragEvent) => {
      e.preventDefault();
    };

    // Track text selection inside editable email canvas
    const handleDocumentSelectionChange = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
        // If clicking inside floating popover, don't dismiss
        if (floatingToolbarRef.current && floatingToolbarRef.current.contains(document.activeElement)) {
          return;
        }
        setFloatingToolbarPos(null);
        setShowLinkPopover(false);
        setShowColorPopover(false);
        setActiveLinkNode(null);
        return;
      }

      const range = selection.getRangeAt(0);
      const commonAncestor = range.commonAncestorContainer;
      const anchorNode = commonAncestor.nodeType === Node.TEXT_NODE ? commonAncestor.parentElement : (commonAncestor as HTMLElement);

      // Verify selection is within email container
      if (!anchorNode || !container.contains(anchorNode)) {
        setFloatingToolbarPos(null);
        return;
      }

      const rect = range.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) {
        setFloatingToolbarPos(null);
        return;
      }

      // Check if selected range is inside an <a> tag
      let currentLink: HTMLAnchorElement | null = null;
      let checkNode: HTMLElement | null = anchorNode;
      while (checkNode && checkNode !== container) {
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

      // Position toolbar 10px directly above selected text
      const topPos = Math.max(10, rect.top - 52);
      const leftPos = Math.max(10, Math.min(window.innerWidth - 360, rect.left + rect.width / 2 - 170));
      setFloatingToolbarPos({ top: topPos, left: leftPos });
    };

    container.addEventListener("pointerdown", handleContainerPointerDown, true);
    container.addEventListener("click", handleContainerPointerDown, true);
    container.addEventListener("dblclick", handleContainerDblClick, true);
    container.addEventListener("dragstart", handleDragStart);
    container.addEventListener("input", handleContainerInput);
    document.addEventListener("selectionchange", handleDocumentSelectionChange);

    return () => {
      container.removeEventListener("pointerdown", handleContainerPointerDown, true);
      container.removeEventListener("click", handleContainerPointerDown, true);
      container.removeEventListener("dblclick", handleContainerDblClick, true);
      container.removeEventListener("dragstart", handleDragStart);
      container.removeEventListener("input", handleContainerInput);
      document.removeEventListener("selectionchange", handleDocumentSelectionChange);
    };
  }, [handleSelectElement, normalizedFolder, pkgPrefix, exportPristineHtml, pushHistory]);

  // 2. Mount document into direct DOM container on load or Undo/Redo
  useEffect(() => {
    if (isInternalUpdateRef.current) {
      isInternalUpdateRef.current = false;
      return;
    }

    const container = emailContainerRef.current;
    if (!container) return;

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
    if (selectedDomElementRef.current && container.contains(selectedDomElementRef.current)) {
      selectedPath = getDomPath(selectedDomElementRef.current, container);
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

    // Re-synchronize selected element and Style Inspector with undone/redone state
    if (selectedPath) {
      const reselectedEl = getFromDomPath(selectedPath, container);
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

  const handleRenameStyle = (oldProperty: string, newProperty: string, value: string) => {
    let cleanVal = value.trim();

    const dimensionProps = [
      "font-size", "width", "height", "max-width", "min-width", "max-height", "min-height",
      "padding", "padding-top", "padding-right", "padding-bottom", "padding-left",
      "margin", "margin-top", "margin-right", "margin-bottom", "margin-left",
      "border-width", "border-radius", "top", "left", "right", "bottom", "letter-spacing"
    ];
    if (dimensionProps.includes(newProperty.toLowerCase()) && /^[+-]?\d+(\.\d+)?$/.test(cleanVal)) {
      cleanVal = `${cleanVal}px`;
    }

    // Preserve exact in-place key order
    const updated: Record<string, string> = {};
    Object.keys(inlineStyles).forEach((k) => {
      if (k === oldProperty) {
        if (newProperty.trim()) {
          updated[newProperty.trim()] = cleanVal;
        }
      } else {
        updated[k] = inlineStyles[k];
      }
    });
    setInlineStyles(updated);

    const el = selectedDomElementRef.current || selectedDomElement;
    if (el) {
      el.style.removeProperty(oldProperty);
      if (newProperty.trim()) {
        el.style.setProperty(newProperty.trim(), cleanVal, "important");
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

  // Restore selection range when user clicks toolbar buttons
  const restoreRange = useCallback(() => {
    if (savedRange) {
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(savedRange);
      }
    }
  }, [savedRange]);

  // Execute standard text formatting commands and pipe cleanly into undo/redo history
  const handleFormatText = (command: "bold" | "italic" | "underline" | "superscript" | "subscript") => {
    restoreRange();
    document.execCommand(command, false);
    setIsSaved(false);
    isInternalUpdateRef.current = true;
    pushHistory(exportPristineHtml());
  };

  // Apply text color and pipe into history
  const handleApplyTextColor = (color: string) => {
    setSelectedTextColor(color);
    restoreRange();
    document.execCommand("foreColor", false, color);
    setShowColorPopover(false);
    setIsSaved(false);
    isInternalUpdateRef.current = true;
    pushHistory(exportPristineHtml());
  };

  // Apply or update link with href and target, pipe into history
  const handleApplyLink = () => {
    restoreRange();
    let url = linkHref.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url) && !url.startsWith("mailto:") && !url.startsWith("#")) {
      url = `https://${url}`;
    }

    if (activeLinkNode) {
      activeLinkNode.setAttribute("href", url);
      if (linkTargetBlank) {
        activeLinkNode.setAttribute("target", "_blank");
        activeLinkNode.setAttribute("rel", "noopener noreferrer");
      } else {
        activeLinkNode.removeAttribute("target");
        activeLinkNode.removeAttribute("rel");
      }
    } else {
      document.execCommand("createLink", false, url);
      const selection = window.getSelection();
      if (selection && selection.anchorNode) {
        let parentEl = selection.anchorNode.nodeType === Node.TEXT_NODE ? selection.anchorNode.parentElement : (selection.anchorNode as HTMLElement);
        while (parentEl && parentEl.tagName.toLowerCase() !== "a" && parentEl !== emailContainerRef.current) {
          parentEl = parentEl.parentElement;
        }
        if (parentEl && parentEl.tagName.toLowerCase() === "a") {
          if (linkTargetBlank) {
            parentEl.setAttribute("target", "_blank");
            parentEl.setAttribute("rel", "noopener noreferrer");
          }
        }
      }
    }

    setShowLinkPopover(false);
    setFloatingToolbarPos(null);
    setIsSaved(false);
    isInternalUpdateRef.current = true;
    pushHistory(exportPristineHtml());
  };

  // Remove link and pipe into history
  const handleRemoveLink = () => {
    restoreRange();
    if (activeLinkNode) {
      const parent = activeLinkNode.parentNode;
      while (activeLinkNode.firstChild) {
        parent?.insertBefore(activeLinkNode.firstChild, activeLinkNode);
      }
      parent?.removeChild(activeLinkNode);
    } else {
      document.execCommand("unlink", false);
    }
    setActiveLinkNode(null);
    setShowLinkPopover(false);
    setFloatingToolbarPos(null);
    setIsSaved(false);
    isInternalUpdateRef.current = true;
    pushHistory(exportPristineHtml());
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

    let saveTarget = initialFilePath;
    if (!saveTarget) {
      const pkgDir = localStorage.getItem("nocodemail_last_pkg_dir");
      saveTarget = pkgDir ? `${pkgDir}\\preview_browser.html` : "preview_browser.html";
    }
    try {
      await nativeIPC.saveFile(saveTarget, pristine);
      await nativeIPC.openInBrowser({
        path: saveTarget,
        browser_path: browser ? browser.path : undefined,
      });
    } catch (err) {
      console.error("Failed to open browser:", err);
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

        {/* Center Controls: Viewport Mode, Width, Undo/Redo */}
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
              onClick={() => setViewMode("desktop")}
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
              onClick={() => setViewMode("mobile")}
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
        </div>

        {/* Right Controls: Save Status, Browser Dropdown, Code View & Export */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
          {/* Save Status Indicator */}
          <button
            type="button"
            onClick={handleSave}
            title={isSaved ? "All changes saved" : "Click to save changes"}
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

          {/* Export HTML Primary Button (Hidden per user request) */}
          <button
            type="button"
            onClick={handleSave}
            title="Export Clean HTML"
            style={{
              display: "none",
              alignItems: "center",
              gap: "5px",
              padding: "5px 12px",
              borderRadius: "7px",
              background: "linear-gradient(135deg, #4f46e5, #6366f1)",
              border: "none",
              color: "#ffffff",
              cursor: "pointer",
              fontWeight: "700",
              fontSize: "11.5px",
              height: "31px",
              boxShadow: "0 2px 6px rgba(79, 70, 229, 0.25)",
              transition: "all 0.12s ease",
            }}
          >
            <FileDown size={13} color="#ffffff" />
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
              transition: isResizingMobile ? "none" : "width 0.15s ease",
            }}
          >
            {/* Mobile Viewport Left & Right Interactive Drag Handles */}
            {viewMode === "mobile" && (
              <>
                <div
                  onPointerDown={(e) => handleResizePointerDown(e, "left")}
                  title={`Drag to resize width (${mobileWidth}px)`}
                  style={{
                    position: "absolute",
                    left: "-9px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: "16px",
                    height: "52px",
                    borderRadius: "8px",
                    background: "#ffffff",
                    border: "1.5px solid #cbd5e1",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
                    cursor: "ew-resize",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 20,
                    userSelect: "none",
                    touchAction: "none",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#4f46e5")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#cbd5e1")}
                >
                  <div style={{ width: "2px", height: "18px", background: "#94a3b8", borderRadius: "1px" }} />
                </div>

                <div
                  onPointerDown={(e) => handleResizePointerDown(e, "right")}
                  title={`Drag to resize width (${mobileWidth}px)`}
                  style={{
                    position: "absolute",
                    right: "-9px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: "16px",
                    height: "52px",
                    borderRadius: "8px",
                    background: "#ffffff",
                    border: "1.5px solid #cbd5e1",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
                    cursor: "ew-resize",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 20,
                    userSelect: "none",
                    touchAction: "none",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#4f46e5")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#cbd5e1")}
                >
                  <div style={{ width: "2px", height: "18px", background: "#94a3b8", borderRadius: "1px" }} />
                </div>
              </>
            )}

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

        {/* Floating Contextual Formatting Toolbar */}
        {floatingToolbarPos && (
          <div
            ref={floatingToolbarRef}
            className="editor-floating-toolbar"
            style={{
              position: "fixed",
              top: `${floatingToolbarPos.top}px`,
              left: `${floatingToolbarPos.left}px`,
              background: "#1e293b",
              borderRadius: "8px",
              boxShadow: "0 8px 24px rgba(0, 0, 0, 0.28), 0 2px 6px rgba(0, 0, 0, 0.15)",
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
                  padding: "10px 12px",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
                  border: "1px solid #e2e8f0",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  minWidth: "280px",
                  zIndex: 10000,
                }}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <Globe size={13} color="#64748b" />
                  <span style={{ fontSize: "11px", fontWeight: "700", color: "#334155" }}>
                    {activeLinkNode ? "Edit Destination URL" : "Set Destination URL"}
                  </span>
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
          </div>
        )}

        {/* Right Sidebar: Chrome DevTools Style Inspector */}
        <aside className="editor-sidebar-inspector">
          <StyleInspector
            selectedElement={selectedDomElement}
            inlineStyles={inlineStyles}
            onUpdateStyle={handleUpdateStyle}
            onRemoveStyle={handleRemoveStyle}
            onRenameStyle={handleRenameStyle}
            onSelectElement={handleSelectElement}
            domRoot={emailContainerRef.current}
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

