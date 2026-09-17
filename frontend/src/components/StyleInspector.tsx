import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { 
  Plus, 
  SlidersHorizontal, 
  ChevronUp, 
  ChevronDown, 
  ChevronRight, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  Rows, 
  Columns, 
  LayoutGrid, 
  Layers, 
  Search,
  Sparkles,
  ArrowDownCircle,
  ArrowUpCircle,
  ArrowLeftCircle,
  ArrowRightCircle,
  ArrowUpDown,
  ArrowLeftRight,
  Image as ImageIcon,
  FolderOpen,
  Upload,
  Copy,
  Smartphone,
  Columns2,
  Check,
  Code2,
  Bot,
  RefreshCw,
  Trash2,
  CornerDownRight,
  HelpCircle,
  Wand2,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { BoxModel } from "./BoxModel";
import { EMAIL_COMPONENT_PRESETS, ComponentPreset } from "./ComponentPresets";

interface MatchedRule {
  selector: string;
  source: string;
  styleDeclaration: CSSStyleDeclaration;
  properties: Record<string, string>;
}

interface StyleInspectorProps {
  selectedElement: HTMLElement | null;
  inlineStyles: Record<string, string>;
  viewMode?: "desktop" | "mobile";
  activeTab?: "components" | "ai" | "styles";
  onTabChange?: (tab: "components" | "ai" | "styles") => void;
  onUpdateStyle: (property: string, value: string) => void;
  onRemoveStyle: (property: string) => void;
  onRenameStyle?: (oldProperty: string, newProperty: string, value: string) => void;
  onSelectElement?: (el: HTMLElement) => void;
  onInsertPreset?: (presetHtml: string, targetPosition?: "bottom" | "top" | "left" | "right", targetScope?: "section" | "column") => void;
  insertScope?: "column" | "section";
  onInsertScopeChange?: (scope: "column" | "section") => void;
  onSwapColumns?: () => void;
  onSwapVerticalOrder?: () => void;
  onQuickAlign?: (align: "left" | "center" | "right") => void;
  onVerticalAlign?: (valign: "top" | "middle" | "bottom") => void;
  onToggleSectionResponsiveness?: (isResponsive: boolean) => void;
  isSectionResponsive?: boolean;
  onReplaceImage?: (el: HTMLElement) => void;
  onUpdateAttribute?: (el: HTMLElement, attr: string, value: string) => void;
  domRoot?: HTMLElement | null;
  canCopySectionCode?: boolean;
  copySectionStatus?: "idle" | "copied" | "error";
  onCopySectionCode?: () => Promise<boolean> | boolean;
  onAiReplaceSection?: (aiHtml: string) => boolean | void;
  onAiInsertSection?: (aiHtml: string, position: "below" | "above") => boolean | void;
  selectedSectionHtml?: string;
}

interface DomTreeNodeProps {
  element: HTMLElement;
  selectedElement: HTMLElement | null;
  onSelectElement: (el: HTMLElement) => void;
  depth?: number;
}

const DomTreeNode: React.FC<DomTreeNodeProps> = ({
  element,
  selectedElement,
  onSelectElement,
  depth = 0,
}) => {
  const isSelected = element === selectedElement;
  const isParentOfSelected = useMemo(() => {
    if (!selectedElement) return false;
    return element.contains(selectedElement) && element !== selectedElement;
  }, [element, selectedElement]);

  const [expanded, setExpanded] = useState<boolean>(true);

  useEffect(() => {
    if (isParentOfSelected) {
      setExpanded(true);
    }
  }, [isParentOfSelected]);

  const children = useMemo(() => {
    return Array.from(element.children || []).filter(
      (c) => c && c.nodeType === 1 && !c.classList?.contains("editor-selection-overlay")
    ) as HTMLElement[];
  }, [element]);

  const hasChildren = children.length > 0;
  const tag = element.tagName.toLowerCase();

  const attrs = useMemo(() => {
    const list: { name: string; value: string }[] = [];
    if (element.className) {
      const cls = Array.from(element.classList)
        .filter((c) => !c.startsWith("editor-"))
        .join(" ");
      if (cls) list.push({ name: "class", value: cls });
    }
    if (element.getAttribute("style")) {
      list.push({ name: "style", value: element.getAttribute("style")! });
    }
    if (element.getAttribute("width")) {
      list.push({ name: "width", value: element.getAttribute("width")! });
    }
    if (element.getAttribute("align")) {
      list.push({ name: "align", value: element.getAttribute("align")! });
    }
    if (element.getAttribute("src")) {
      list.push({ name: "src", value: element.getAttribute("src")! });
    }
    if (element.getAttribute("href")) {
      list.push({ name: "href", value: element.getAttribute("href")! });
    }
    return list;
  }, [element, element.className]);

  const rowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isSelected && rowRef.current) {
      rowRef.current.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [isSelected]);

  return (
    <div style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace", fontSize: "11px", lineHeight: "18px" }}>
      <div
        ref={rowRef}
        onClick={(e) => {
          e.stopPropagation();
          onSelectElement(element);
        }}
        style={{
          display: "flex",
          alignItems: "center",
          padding: "1px 4px 1px 0",
          paddingLeft: `${depth * 10 + 4}px`,
          background: isSelected ? "#e0e7ff" : "transparent",
          color: isSelected ? "#312e81" : "#334155",
          cursor: "pointer",
          borderRadius: "3px",
          whiteSpace: "nowrap",
          userSelect: "none",
        }}
        onMouseEnter={(e) => {
          if (!isSelected) e.currentTarget.style.background = "#f1f5f9";
        }}
        onMouseLeave={(e) => {
          if (!isSelected) e.currentTarget.style.background = "transparent";
        }}
      >
        {hasChildren ? (
          <span
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "12px",
              height: "12px",
              marginRight: "2px",
              cursor: "pointer",
              color: "#64748b",
            }}
          >
            {expanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
          </span>
        ) : (
          <span style={{ width: "12px", display: "inline-block", marginRight: "2px" }} />
        )}

        <span style={{ color: "#7c3aed", fontWeight: "700" }}>&lt;{tag}</span>

        {attrs.map((attr, idx) => (
          <span key={idx} style={{ marginLeft: "4px" }}>
            <span style={{ color: "#2563eb" }}>{attr.name}</span>=
            <span style={{ color: "#b45309" }}>"{attr.value.length > 25 ? attr.value.slice(0, 25) + "…" : attr.value}"</span>
          </span>
        ))}

        <span style={{ color: "#7c3aed", fontWeight: "700" }}>&gt;</span>

        {!expanded && hasChildren && (
          <span style={{ color: "#94a3b8", marginLeft: "2px" }}>…&lt;/{tag}&gt;</span>
        )}

        {!hasChildren && element.innerText && (
          <span style={{ color: "#64748b", marginLeft: "2px", maxWidth: "100px", overflow: "hidden", textOverflow: "ellipsis", display: "inline-block" }}>
            {element.innerText.slice(0, 16)}
          </span>
        )}

        {!hasChildren && (
          <span style={{ color: "#7c3aed", fontWeight: "700" }}>&lt;/{tag}&gt;</span>
        )}
      </div>

      {hasChildren && expanded && (
        <div>
          {children.map((child, idx) => (
            <DomTreeNode
              key={idx}
              element={child}
              selectedElement={selectedElement}
              onSelectElement={onSelectElement}
              depth={depth + 1}
            />
          ))}
          <div
            style={{
              paddingLeft: `${depth * 10 + 16}px`,
              color: "#7c3aed",
              fontWeight: "700",
              lineHeight: "18px",
            }}
          >
            &lt;/{tag}&gt;
          </div>
        </div>
      )}
    </div>
  );
};

const CSS_PROPERTY_SUGGESTIONS = [
  "color", "background-color", "font-size", "font-weight", "font-family", 
  "line-height", "text-align", "padding", "padding-top", "padding-right", 
  "padding-bottom", "padding-left", "margin", "margin-top", "margin-right", 
  "margin-bottom", "margin-left", "border", "border-radius", "border-color", 
  "border-width", "border-style", "width", "height", "max-width", "min-width", 
  "display", "position", "top", "left", "right", "bottom", "z-index",
  "vertical-align", "text-decoration", "letter-spacing", "opacity", "overflow", "cursor"
];

const CSS_VALUE_SUGGESTIONS: Record<string, string[]> = {
  "position": ["relative", "absolute", "static", "fixed", "sticky"],
  "display": ["block", "inline-block", "inline", "flex", "table", "table-cell", "none"],
  "font-weight": ["normal", "bold", "300", "400", "500", "600", "700", "800", "900"],
  "text-align": ["left", "center", "right", "justify"],
  "vertical-align": ["top", "middle", "bottom", "baseline"],
  "text-decoration": ["none", "underline", "line-through"],
  "border-style": ["solid", "dashed", "dotted", "none", "double"],
  "cursor": ["pointer", "default", "text", "move", "not-allowed"],
  "overflow": ["visible", "hidden", "scroll", "auto"],
  "font-family": [
    "Arial, Helvetica, sans-serif",
    "Helvetica, Arial, sans-serif",
    "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    "Georgia, serif",
    "'Times New Roman', Times, serif",
    "'Courier New', Courier, monospace",
    "Inter, system-ui, sans-serif"
  ],
};

export const StyleInspector: React.FC<StyleInspectorProps> = ({
  selectedElement,
  inlineStyles,
  viewMode = "desktop",
  activeTab: activeTabProp,
  onTabChange,
  onUpdateStyle,
  onRemoveStyle,
  onRenameStyle,
  onSelectElement,
  onInsertPreset,
  insertScope: insertScopeProp,
  onInsertScopeChange,
  onSwapColumns,
  onSwapVerticalOrder,
  onQuickAlign,
  onVerticalAlign,
  onToggleSectionResponsiveness,
  isSectionResponsive = true,
  onReplaceImage,
  onUpdateAttribute,
  domRoot,
  canCopySectionCode = false,
  copySectionStatus = "idle",
  onCopySectionCode,
  onAiReplaceSection,
  onAiInsertSection,
  selectedSectionHtml = "",
}) => {
  // Main Panel Tab: "components" (default), "ai", vs "styles"
  const [internalTab, setInternalTab] = useState<"components" | "ai" | "styles">("components");
  const activeTab = activeTabProp !== undefined ? activeTabProp : internalTab;

  const handleTabClick = (tab: "components" | "ai" | "styles") => {
    setInternalTab(tab);
    if (onTabChange) {
      onTabChange(tab);
    }
  };

  // AI Tab State & Actions
  const [aiCodeInput, setAiCodeInput] = useState<string>("");
  const [aiStatus, setAiStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [copiedPromptStatus, setCopiedPromptStatus] = useState<boolean>(false);

  const handleAiCodeChange = (val: string) => {
    let clean = val;
    if (clean.includes("```")) {
      clean = clean.replace(/^```(?:html)?\s*/i, "").replace(/\s*```$/i, "").trim();
    }
    setAiCodeInput(clean);
  };

  const handleCopyAiPrompt = async () => {
    const rawCode = selectedSectionHtml || "";
    const prompt = `Here is an email template section in HTML. Please modify it according to my requirements while keeping it clean, responsive, and compatible with all email clients (max-width: 700px, inline CSS):\n\n\`\`\`html\n${rawCode}\n\`\`\`\n\nRequirements:\n- `;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(prompt);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = prompt;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopiedPromptStatus(true);
      setTimeout(() => setCopiedPromptStatus(false), 2000);
    } catch {
      if (onCopySectionCode) onCopySectionCode();
    }
  };

  const handleExecuteReplace = () => {
    if (!aiCodeInput.trim()) {
      setAiStatus({ type: "error", message: "Please paste your AI-generated HTML first." });
      return;
    }
    if (!onAiReplaceSection) return;
    const res = onAiReplaceSection(aiCodeInput);
    if (res !== false) {
      setAiStatus({ type: "success", message: "Section successfully replaced in email!" });
      setTimeout(() => setAiStatus(null), 3500);
    } else {
      setAiStatus({ type: "error", message: "Failed to replace section. Please select a section first." });
    }
  };

  const handleExecuteInsertBelow = () => {
    if (!aiCodeInput.trim()) {
      setAiStatus({ type: "error", message: "Please paste your AI-generated HTML first." });
      return;
    }
    if (!onAiInsertSection) return;
    const res = onAiInsertSection(aiCodeInput, "below");
    if (res !== false) {
      setAiStatus({ type: "success", message: "New AI section inserted below!" });
      setTimeout(() => setAiStatus(null), 3500);
    } else {
      setAiStatus({ type: "error", message: "Failed to insert section." });
    }
  };

  const handleExecuteInsertAbove = () => {
    if (!aiCodeInput.trim()) {
      setAiStatus({ type: "error", message: "Please paste your AI-generated HTML first." });
      return;
    }
    if (!onAiInsertSection) return;
    const res = onAiInsertSection(aiCodeInput, "above");
    if (res !== false) {
      setAiStatus({ type: "success", message: "New AI section inserted above!" });
      setTimeout(() => setAiStatus(null), 3500);
    } else {
      setAiStatus({ type: "error", message: "Failed to insert section." });
    }
  };

  const handleCopySectionClick = useCallback(async () => {
    if (!canCopySectionCode || !onCopySectionCode) return;
    await onCopySectionCode();
  }, [canCopySectionCode, onCopySectionCode]);

  const copyButtonLabel =
    copySectionStatus === "copied"
      ? "Copied"
      : copySectionStatus === "error"
        ? "Copy failed"
        : "Copy section code";


  const [componentCategory, setComponentCategory] = useState<string>("all");
  const [componentSearch, setComponentSearch] = useState<string>("");
  const [insertDirection, setInsertDirection] = useState<"bottom" | "top" | "left" | "right">("bottom");
  const [isSmartLayoutOpen, setIsSmartLayoutOpen] = useState<boolean>(false);
  const [internalInsertScope, setInternalInsertScope] = useState<"column" | "section">("column");
  const insertScope = insertScopeProp !== undefined ? insertScopeProp : internalInsertScope;

  const handleScopeSelect = (scope: "column" | "section") => {
    setInternalInsertScope(scope);
    if (onInsertScopeChange) {
      onInsertScopeChange(scope);
    }
  };

  const [showDomTree, setShowDomTree] = useState(true);
  const [filterText, setFilterText] = useState("");
  const [newProp, setNewProp] = useState("");
  const [newVal, setNewVal] = useState("");
  const [disabledProps, setDisabledProps] = useState<Set<string>>(new Set());
  const [disabledPropValues, setDisabledPropValues] = useState<Record<string, string>>({});
  const [focusedField, setFocusedField] = useState<{ id: string; type: "prop" | "val"; propName?: string } | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(0);

  const newPropInputRef = useRef<HTMLInputElement>(null);
  const newValInputRef = useRef<HTMLInputElement>(null);

  const blurTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setDisabledProps(new Set());
    setDisabledPropValues({});
    setFocusedField(null);
  }, [selectedElement]);

  useEffect(() => {
    return () => {
      if (blurTimerRef.current) {
        window.clearTimeout(blurTimerRef.current);
        blurTimerRef.current = null;
      }
    };
  }, []);

  const handleFieldFocus = (field: { id: string; type: "prop" | "val"; propName?: string }) => {
    if (blurTimerRef.current) {
      window.clearTimeout(blurTimerRef.current);
      blurTimerRef.current = null;
    }
    setFocusedField(field);
    setHighlightedIndex(0);
  };

  const handleFieldBlur = () => {
    if (blurTimerRef.current) window.clearTimeout(blurTimerRef.current);
    blurTimerRef.current = window.setTimeout(() => {
      setFocusedField(null);
    }, 300);
  };

  // Find all matched stylesheet rules from the element's owner document
  const matchedRules = useMemo<MatchedRule[]>(() => {
    if (!selectedElement || !selectedElement.ownerDocument) return [];
    const doc = selectedElement.ownerDocument;
    const rules: MatchedRule[] = [];

    try {
      const sheets = Array.from(doc.styleSheets);
      sheets.forEach((sheet, sheetIdx) => {
        try {
          const cssRules = Array.from(sheet.cssRules || []);
          cssRules.forEach((rule) => {
            const maybeStyleRule = rule as CSSStyleRule;
            if ((rule as CSSRule).type === 1 && typeof maybeStyleRule.selectorText === "string" && maybeStyleRule.style) {
              try {
                if (selectedElement.matches(maybeStyleRule.selectorText)) {
                  const props: Record<string, string> = {};
                  for (let i = 0; i < maybeStyleRule.style.length; i++) {
                    const p = maybeStyleRule.style[i];
                    props[p] = maybeStyleRule.style.getPropertyValue(p);
                  }
                  rules.push({
                    selector: maybeStyleRule.selectorText,
                    source: `style_${sheetIdx + 1}.css`,
                    styleDeclaration: maybeStyleRule.style,
                    properties: props,
                  });
                }
              } catch {
                // Ignore pseudo-elements or selector syntax errors
              }
            }
          });
        } catch {
          // Cross-origin stylesheet guard
        }
      });
    } catch (e) {
      console.warn("Could not inspect stylesheets:", e);
    }

    return rules;
  }, [selectedElement]);

  const getElementMetrics = () => {
    if (!selectedElement) {
      return {
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
        border: { top: 0, right: 0, bottom: 0, left: 0 },
        padding: { top: 0, right: 0, bottom: 0, left: 0 },
        width: 500,
        height: 60,
      };
    }
    const win = selectedElement.ownerDocument?.defaultView || window;
    const computed = win.getComputedStyle(selectedElement);
    const rect = selectedElement.getBoundingClientRect();
    return {
      margin: {
        top: parseInt(computed.marginTop) || 0,
        right: parseInt(computed.marginRight) || 0,
        bottom: parseInt(computed.marginBottom) || 0,
        left: parseInt(computed.marginLeft) || 0,
      },
      border: {
        top: parseInt(computed.borderTopWidth) || 0,
        right: parseInt(computed.borderRightWidth) || 0,
        bottom: parseInt(computed.borderBottomWidth) || 0,
        left: parseInt(computed.borderLeftWidth) || 0,
      },
      padding: {
        top: parseInt(computed.paddingTop) || 0,
        right: parseInt(computed.paddingRight) || 0,
        bottom: parseInt(computed.paddingBottom) || 0,
        left: parseInt(computed.paddingLeft) || 0,
      },
      width: Math.round(rect.width) || 500,
      height: Math.round(rect.height) || 60,
    };
  };

  const metrics = getElementMetrics();
  const tagName = selectedElement?.tagName.toLowerCase() || "element";

  const toHexColor = (colorStr?: string) => {
    if (!colorStr) return "#0f172a";
    if (colorStr.startsWith("#")) {
      if (colorStr.length === 7) return colorStr;
      if (colorStr.length === 4) {
        return `#${colorStr[1]}${colorStr[1]}${colorStr[2]}${colorStr[2]}${colorStr[3]}${colorStr[3]}`;
      }
    }
    const match = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
    if (match) {
      const r = parseInt(match[1], 10).toString(16).padStart(2, "0");
      const g = parseInt(match[2], 10).toString(16).padStart(2, "0");
      const b = parseInt(match[3], 10).toString(16).padStart(2, "0");
      return `#${r}${g}${b}`;
    }
    return "#0f172a";
  };

  const activeSuggestions = useMemo(() => {
    if (!focusedField) return [];
    if (focusedField.type === "prop") {
      const q = (focusedField.id === "new" ? newProp : focusedField.id).toLowerCase().trim();
      if (!q) return CSS_PROPERTY_SUGGESTIONS;
      return CSS_PROPERTY_SUGGESTIONS.filter((p) => p.toLowerCase().includes(q));
    }
    if (focusedField.type === "val" && focusedField.propName) {
      const prop = focusedField.propName.toLowerCase();
      const currentVal = (inlineStyles[prop] || "").toLowerCase().trim();
      const options = CSS_VALUE_SUGGESTIONS[prop] || [];
      const q = (focusedField.id === "new" ? newVal : "").toLowerCase().trim();

      // Put the current value first if available
      let sorted = [...options];
      if (currentVal && sorted.includes(currentVal)) {
        sorted = [currentVal, ...sorted.filter((v) => v !== currentVal)];
      }

      if (!q) return sorted;
      return sorted.filter((v) => v.toLowerCase().includes(q));
    }
    return [];
  }, [focusedField, newProp, newVal, inlineStyles]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [activeSuggestions.length]);

  const handleArrowKeyStep = (e: React.KeyboardEvent<HTMLInputElement>, prop: string, val: string) => {
    if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
    const numeric = String(val).trim().match(/^([+-]?(?:\d+\.?\d*|\.\d+))([a-z%]*)$/i);
    if (!numeric) return;

    const num = Number(numeric[1]);
    if (!Number.isFinite(num)) return;

    const unitlessProps = new Set(["opacity", "font-weight", "z-index", "line-height", "flex", "order"]);
    const propLower = prop.toLowerCase();
    const unit = numeric[2] || (unitlessProps.has(propLower) ? "" : "px");
    if (!unit && !unitlessProps.has(propLower) && numeric[2] === "") return;

    e.preventDefault();
    const step = e.shiftKey ? 10 : (e.altKey ? 0.1 : 1);
    let next = e.key === "ArrowUp" ? num + step : num - step;
    if (propLower === "opacity") next = Math.max(0, Math.min(1, next));
    if (propLower === "z-index") next = Math.round(next);
    if (propLower === "font-weight") next = Math.max(1, Math.min(1000, Math.round(next / 100) * 100));
    const rounded = Math.round(next * 1000) / 1000;
    onUpdateStyle(prop, `${rounded}${unit}`);
  };

  const handleCommitNewProp = () => {
    if (newProp.trim() && newVal.trim()) {
      onUpdateStyle(newProp.trim(), newVal.trim());
      setNewProp("");
      setNewVal("");
      // Focus new empty property input immediately (DevTools style)
      setTimeout(() => {
        newPropInputRef.current?.focus();
      }, 50);
    } else if (newProp.trim() && !newVal.trim()) {
      newValInputRef.current?.focus();
    }
  };

  const domHierarchy = useMemo(() => {
    if (!selectedElement) return [];
    const list: HTMLElement[] = [];
    let curr: HTMLElement | null = selectedElement;
    while (curr && curr.getAttribute && !curr.classList?.contains("email-direct-dom-root")) {
      list.unshift(curr);
      curr = curr.parentElement;
      if (curr && (curr.tagName === "BODY" || curr.tagName === "HTML")) break;
    }
    return list;
  }, [selectedElement]);

  const filteredInlineProps = useMemo(() => {
    const merged = { ...disabledPropValues, ...inlineStyles };
    const entries = Object.entries(merged);
    if (!filterText.trim()) return entries;
    const q = filterText.toLowerCase();
    return entries.filter(([p, v]) => p.toLowerCase().includes(q) || String(v).toLowerCase().includes(q));
  }, [inlineStyles, disabledPropValues, filterText]);

  // Filter component presets
  const filteredPresets = useMemo(() => {
    return EMAIL_COMPONENT_PRESETS.filter((p) => {
      const matchCat = componentCategory === "all" || p.category === componentCategory;
      const matchQuery = !componentSearch.trim() || 
        p.name.toLowerCase().includes(componentSearch.toLowerCase()) || 
        p.description.toLowerCase().includes(componentSearch.toLowerCase());
      return matchCat && matchQuery;
    });
  }, [componentCategory, componentSearch]);

  const copyButtonBaseStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "5px",
    padding: "5px 9px",
    borderRadius: "6px",
    border: copySectionStatus === "error" ? "1px solid #fecaca" : "1px solid #cbd5e1",
    background: copySectionStatus === "copied" ? "#ecfdf5" : copySectionStatus === "error" ? "#fef2f2" : "#ffffff",
    color: copySectionStatus === "copied" ? "#047857" : copySectionStatus === "error" ? "#dc2626" : "#334155",
    fontSize: "11px",
    fontWeight: 700,
    cursor: canCopySectionCode ? "pointer" : "not-allowed",
    opacity: canCopySectionCode ? 1 : 0.45,
    whiteSpace: "nowrap",
  };

  return (
    <div className="style-inspector-container" style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Top Main Tab Switcher: Components, AI, Styles */}
      <div 
        style={{
          display: "flex",
          alignItems: "center",
          borderBottom: "1px solid #e2e8f0",
          background: "#f8fafc",
          padding: "4px 8px",
          gap: "6px",
          flexShrink: 0,
        }}
      >
        <button
          type="button"
          onClick={() => handleTabClick("components")}
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "5px",
            padding: "6px 8px",
            borderRadius: "6px",
            border: activeTab === "components" ? "1px solid #cbd5e1" : "1px solid transparent",
            background: activeTab === "components" ? "#ffffff" : "transparent",
            color: activeTab === "components" ? "#4f46e5" : "#64748b",
            fontWeight: activeTab === "components" ? "700" : "600",
            fontSize: "11.5px",
            cursor: "pointer",
            boxShadow: activeTab === "components" ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
            transition: "all 0.15s ease",
          }}
        >
          <LayoutGrid size={13} />
          <span>Components</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabClick("ai")}
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "5px",
            padding: "6px 8px",
            borderRadius: "6px",
            border: activeTab === "ai" ? "1px solid #c7d2fe" : "1px solid transparent",
            background: activeTab === "ai" ? "#ffffff" : "transparent",
            color: activeTab === "ai" ? "#4f46e5" : "#64748b",
            fontWeight: activeTab === "ai" ? "700" : "600",
            fontSize: "11.5px",
            cursor: "pointer",
            boxShadow: activeTab === "ai" ? "0 1px 3px rgba(79, 70, 229, 0.1)" : "none",
            transition: "all 0.15s ease",
          }}
        >
          <Sparkles size={13} color={activeTab === "ai" ? "#4f46e5" : "#64748b"} />
          <span>AI</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabClick("styles")}
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "5px",
            padding: "6px 8px",
            borderRadius: "6px",
            border: activeTab === "styles" ? "1px solid #cbd5e1" : "1px solid transparent",
            background: activeTab === "styles" ? "#ffffff" : "transparent",
            color: activeTab === "styles" ? "#4f46e5" : "#64748b",
            fontWeight: activeTab === "styles" ? "700" : "600",
            fontSize: "11.5px",
            cursor: "pointer",
            boxShadow: activeTab === "styles" ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
            transition: "all 0.15s ease",
          }}
        >
          <SlidersHorizontal size={13} />
          <span>Styles</span>
        </button>
      </div>

      {/* -------------------- TAB 1: COMPONENTS PRESET LIBRARY -------------------- */}
      {activeTab === "components" && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "#f8fafc" }}>
          {/* Target Insertion Scope & Direction Selector */}
          <div style={{ padding: "10px 12px", borderBottom: "1px solid #e2e8f0", background: "#ffffff", flexShrink: 0, display: "flex", flexDirection: "column", gap: "8px" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                <span style={{ fontSize: "11px", fontWeight: "700", color: "#334155" }}>Target Scope:</span>
                <span style={{ fontSize: "10px", color: insertScope === "column" ? "#4f46e5" : "#059669", fontWeight: "600" }}>
                  {insertScope === "column" ? "Inside Current Column" : "New Section Row"}
                </span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                <button
                  type="button"
                  onClick={() => handleScopeSelect("column")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "4px",
                    padding: "6px 6px",
                    borderRadius: "5px",
                    border: insertScope === "column" ? "1.5px solid #4f46e5" : "1px solid #e2e8f0",
                    background: insertScope === "column" ? "#eef2ff" : "#f8fafc",
                    color: insertScope === "column" ? "#4338ca" : "#64748b",
                    fontWeight: insertScope === "column" ? "700" : "600",
                    fontSize: "10.5px",
                    cursor: "pointer",
                    boxShadow: insertScope === "column" ? "0 1px 3px rgba(79,70,229,0.1)" : "none",
                  }}
                  title="Insert directly inside current column (under active text or button)"
                >
                  <Plus size={12} />
                  <span>Inside Column</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleScopeSelect("section")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "4px",
                    padding: "6px 6px",
                    borderRadius: "5px",
                    border: insertScope === "section" ? "1.5px solid #059669" : "1px solid #e2e8f0",
                    background: insertScope === "section" ? "#ecfdf5" : "#f8fafc",
                    color: insertScope === "section" ? "#047857" : "#64748b",
                    fontWeight: insertScope === "section" ? "700" : "600",
                    fontSize: "10.5px",
                    cursor: "pointer",
                    boxShadow: insertScope === "section" ? "0 1px 3px rgba(5,150,105,0.1)" : "none",
                  }}
                  title="Insert as a standalone 700px section row outside below"
                >
                  <Rows size={12} />
                  <span>New Section Row</span>
                </button>
              </div>
            </div>

            <button
              type="button"
              className="copy-section-code-btn"
              onClick={handleCopySectionClick}
              disabled={!canCopySectionCode}
              aria-live="polite"
              aria-label={copyButtonLabel}
              title={canCopySectionCode ? "Copy the complete enclosing email section HTML" : "Select an email section or element inside one to copy its HTML"}
              style={{ ...copyButtonBaseStyle, width: "100%" }}
            >
              <Copy size={12} />
              <span>{copyButtonLabel}</span>
            </button>

            {/* Placement Position Selector */}
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                <span style={{ fontSize: "10.5px", fontWeight: "600", color: "#64748b" }}>Placement Position:</span>
              </div>
              {insertScope === "column" ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "4px" }}>
                  <button
                    type="button"
                    onClick={() => setInsertDirection("bottom")}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "3px",
                      padding: "5px 2px",
                      borderRadius: "5px",
                      border: insertDirection === "bottom" ? "1.5px solid #4f46e5" : "1px solid #e2e8f0",
                      background: insertDirection === "bottom" ? "#e0e7ff" : "#f8fafc",
                      color: insertDirection === "bottom" ? "#4338ca" : "#64748b",
                      fontWeight: "700",
                      fontSize: "9.5px",
                      cursor: "pointer",
                    }}
                    title="Insert below the active element inside column"
                  >
                    <ArrowDownCircle size={11} />
                    <span>Below</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setInsertDirection("top")}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "3px",
                      padding: "5px 2px",
                      borderRadius: "5px",
                      border: insertDirection === "top" ? "1.5px solid #4f46e5" : "1px solid #e2e8f0",
                      background: insertDirection === "top" ? "#e0e7ff" : "#f8fafc",
                      color: insertDirection === "top" ? "#4338ca" : "#64748b",
                      fontWeight: "700",
                      fontSize: "9.5px",
                      cursor: "pointer",
                    }}
                    title="Insert above the active element inside column"
                  >
                    <ArrowUpCircle size={11} />
                    <span>Above</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setInsertDirection("left")}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "3px",
                      padding: "5px 2px",
                      borderRadius: "5px",
                      border: insertDirection === "left" ? "1.5px solid #4f46e5" : "1px solid #e2e8f0",
                      background: insertDirection === "left" ? "#e0e7ff" : "#f8fafc",
                      color: insertDirection === "left" ? "#4338ca" : "#64748b",
                      fontWeight: "700",
                      fontSize: "9.5px",
                      cursor: "pointer",
                    }}
                    title="Insert side-by-side to the Left"
                  >
                    <ArrowLeftCircle size={11} />
                    <span>+ Left</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setInsertDirection("right")}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "3px",
                      padding: "5px 2px",
                      borderRadius: "5px",
                      border: insertDirection === "right" ? "1.5px solid #4f46e5" : "1px solid #e2e8f0",
                      background: insertDirection === "right" ? "#e0e7ff" : "#f8fafc",
                      color: insertDirection === "right" ? "#4338ca" : "#64748b",
                      fontWeight: "700",
                      fontSize: "9.5px",
                      cursor: "pointer",
                    }}
                    title="Insert side-by-side to the Right"
                  >
                    <ArrowRightCircle size={11} />
                    <span>+ Right</span>
                  </button>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                  <button
                    type="button"
                    onClick={() => setInsertDirection("bottom")}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "4px",
                      padding: "5px 4px",
                      borderRadius: "5px",
                      border: insertDirection === "bottom" ? "1.5px solid #059669" : "1px solid #e2e8f0",
                      background: insertDirection === "bottom" ? "#ecfdf5" : "#f8fafc",
                      color: insertDirection === "bottom" ? "#047857" : "#64748b",
                      fontWeight: "700",
                      fontSize: "10px",
                      cursor: "pointer",
                    }}
                    title="Insert new section row below current section"
                  >
                    <ArrowDownCircle size={11} />
                    <span>Row Below</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setInsertDirection("top")}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "4px",
                      padding: "5px 4px",
                      borderRadius: "5px",
                      border: insertDirection === "top" ? "1.5px solid #059669" : "1px solid #e2e8f0",
                      background: insertDirection === "top" ? "#ecfdf5" : "#f8fafc",
                      color: insertDirection === "top" ? "#047857" : "#64748b",
                      fontWeight: "700",
                      fontSize: "10px",
                      cursor: "pointer",
                    }}
                    title="Insert new section row above current section"
                  >
                    <ArrowUpCircle size={11} />
                    <span>Row Above</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Smart Layout Switcher & Quick Align Bar (Collapsible by default) */}
          <div style={{ background: "#f1f5f9", borderBottom: "1px solid #e2e8f0", flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => setIsSmartLayoutOpen(!isSmartLayoutOpen)}
              style={{
                width: "100%",
                padding: "8px 12px",
                background: "transparent",
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                cursor: "pointer",
              }}
              title="Click to expand/collapse Smart Layout Actions"
            >
              <span style={{ fontSize: "10.5px", fontWeight: "700", color: "#334155", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Smart Layout Actions
              </span>
              {isSmartLayoutOpen ? <ChevronDown size={13} color="#64748b" /> : <ChevronRight size={13} color="#64748b" />}
            </button>

            {isSmartLayoutOpen && (
              <div style={{ padding: "0 12px 10px 12px", display: "flex", flexDirection: "column", gap: "6px" }}>
                {/* Layout Order Swaps */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                  <button
                    type="button"
                    onClick={onSwapColumns}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "4px",
                      padding: "5px 6px",
                      borderRadius: "5px",
                      border: "1px solid #cbd5e1",
                      background: "#ffffff",
                      color: "#1e293b",
                      fontSize: "10.5px",
                      fontWeight: "600",
                      cursor: "pointer",
                      boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
                    }}
                    title="Swap Left and Right Columns in place"
                  >
                    <ArrowLeftRight size={12} color="#4f46e5" />
                    <span>Swap L ↔ R</span>
                  </button>
                  <button
                    type="button"
                    onClick={onSwapVerticalOrder}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "4px",
                      padding: "5px 6px",
                      borderRadius: "5px",
                      border: "1px solid #cbd5e1",
                      background: "#ffffff",
                      color: "#1e293b",
                      fontSize: "10.5px",
                      fontWeight: "600",
                      cursor: "pointer",
                      boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
                    }}
                    title="Swap Top and Bottom Content (e.g. Text vs Button order)"
                  >
                    <ArrowUpDown size={12} color="#4f46e5" />
                    <span>Swap Top ↕ Bottom</span>
                  </button>
                </div>

                {/* Horizontal Alignment */}
                <div>
                  <div style={{ fontSize: "9.5px", fontWeight: "700", color: "#64748b", marginBottom: "3px" }}>
                    HORIZONTAL ALIGN:
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "4px" }}>
                    <button
                      type="button"
                      onClick={() => onQuickAlign && onQuickAlign("left")}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "3px",
                        padding: "4px",
                        borderRadius: "4px",
                        border: "1px solid #e2e8f0",
                        background: "#ffffff",
                        color: "#475569",
                        fontSize: "10px",
                        fontWeight: "600",
                        cursor: "pointer",
                      }}
                      title="Align all text and buttons to the Left"
                    >
                      <AlignLeft size={11} />
                      <span>Left</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onQuickAlign && onQuickAlign("center")}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "3px",
                        padding: "4px",
                        borderRadius: "4px",
                        border: "1px solid #e2e8f0",
                        background: "#ffffff",
                        color: "#475569",
                        fontSize: "10px",
                        fontWeight: "600",
                        cursor: "pointer",
                      }}
                      title="Center align all text and buttons"
                    >
                      <AlignCenter size={11} />
                      <span>Center</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onQuickAlign && onQuickAlign("right")}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "3px",
                        padding: "4px",
                        borderRadius: "4px",
                        border: "1px solid #e2e8f0",
                        background: "#ffffff",
                        color: "#475569",
                        fontSize: "10px",
                        fontWeight: "600",
                        cursor: "pointer",
                      }}
                      title="Align all text and buttons to the Right"
                    >
                      <AlignRight size={11} />
                      <span>Right</span>
                    </button>
                  </div>
                </div>

                {/* Vertical Alignment (Top / Middle / Bottom) */}
                <div>
                  <div style={{ fontSize: "9.5px", fontWeight: "700", color: "#64748b", marginBottom: "3px" }}>
                    VERTICAL ALIGN (RELATIVE TO MEDIA):
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "4px" }}>
                    <button
                      type="button"
                      onClick={() => onVerticalAlign && onVerticalAlign("top")}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "3px",
                        padding: "4px",
                        borderRadius: "4px",
                        border: "1px solid #e2e8f0",
                        background: "#ffffff",
                        color: "#475569",
                        fontSize: "10px",
                        fontWeight: "600",
                        cursor: "pointer",
                      }}
                      title="Align content to the Top"
                    >
                      <ChevronUp size={12} />
                      <span>Top</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onVerticalAlign && onVerticalAlign("middle")}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "3px",
                        padding: "4px",
                        borderRadius: "4px",
                        border: "1px solid #e2e8f0",
                        background: "#ffffff",
                        color: "#475569",
                        fontSize: "10px",
                        fontWeight: "600",
                        cursor: "pointer",
                      }}
                      title="Align content to the Middle (Center)"
                    >
                      <span style={{ fontSize: "10px" }}>⏺️</span>
                      <span>Middle</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onVerticalAlign && onVerticalAlign("bottom")}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "3px",
                        padding: "4px",
                        borderRadius: "4px",
                        border: "1px solid #e2e8f0",
                        background: "#ffffff",
                        color: "#475569",
                        fontSize: "10px",
                        fontWeight: "600",
                        cursor: "pointer",
                      }}
                      title="Align content to the Bottom"
                    >
                      <ChevronDown size={12} />
                      <span>Bottom</span>
                    </button>
                  </div>
                </div>

                {/* Section Mobile Responsiveness Toggle */}
                <div>
                  <div style={{ fontSize: "9.5px", fontWeight: "700", color: "#64748b", marginBottom: "3px" }}>
                    MOBILE LAYOUT:
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px" }}>
                    <button
                      type="button"
                      onClick={() => onToggleSectionResponsiveness && onToggleSectionResponsiveness(true)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "3px",
                        padding: "4px 6px",
                        borderRadius: "4px",
                        border: isSectionResponsive ? "1.5px solid #4f46e5" : "1px solid #e2e8f0",
                        background: isSectionResponsive ? "#eef2ff" : "#ffffff",
                        color: isSectionResponsive ? "#4338ca" : "#64748b",
                        fontSize: "9.5px",
                        fontWeight: "700",
                        cursor: "pointer",
                      }}
                      title="Multi-column sections stack vertically on mobile screens (Default)"
                    >
                      <Smartphone size={11} />
                      <span>📱 Stack (Default)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onToggleSectionResponsiveness && onToggleSectionResponsiveness(false)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "3px",
                        padding: "4px 6px",
                        borderRadius: "4px",
                        border: !isSectionResponsive ? "1.5px solid #d97706" : "1px solid #e2e8f0",
                        background: !isSectionResponsive ? "#fef3c7" : "#ffffff",
                        color: !isSectionResponsive ? "#b45309" : "#64748b",
                        fontSize: "9.5px",
                        fontWeight: "700",
                        cursor: "pointer",
                      }}
                      title="Keep columns side-by-side even on mobile screens"
                    >
                      <Columns2 size={11} />
                      <span>↔️ Fixed Row</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Preset Search & Category Filter Pills */}
          <div style={{ padding: "8px 12px", borderBottom: "1px solid #e2e8f0", background: "#ffffff", display: "flex", flexDirection: "column", gap: "6px", flexShrink: 0 }}>
            <div style={{ position: "relative" }}>
              <Search size={12} color="#94a3b8" style={{ position: "absolute", left: "8px", top: "50%", transform: "translateY(-50%)" }} />
              <input
                type="text"
                placeholder="Search presets (e.g. text, columns, cards)..."
                value={componentSearch}
                onChange={(e) => setComponentSearch(e.target.value)}
                style={{
                  width: "100%",
                  padding: "5px 8px 5px 26px",
                  borderRadius: "5px",
                  border: "1px solid #cbd5e1",
                  fontSize: "11px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ display: "flex", gap: "4px", overflowX: "auto", paddingBottom: "2px" }}>
              {[
                { id: "all", label: "All" },
                { id: "basic", label: "Single" },
                { id: "2-col", label: "2 Columns" },
                { id: "3-col", label: "3 Columns" },
                { id: "4-col", label: "4 Columns" },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setComponentCategory(cat.id)}
                  style={{
                    padding: "3px 8px",
                    borderRadius: "12px",
                    border: componentCategory === cat.id ? "1px solid #4f46e5" : "1px solid #e2e8f0",
                    background: componentCategory === cat.id ? "#4f46e5" : "#f8fafc",
                    color: componentCategory === cat.id ? "#ffffff" : "#64748b",
                    fontSize: "10.5px",
                    fontWeight: "600",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Presets Grid List */}
          <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px", display: "flex", flexDirection: "column", gap: "10px" }}>
            {filteredPresets.map((preset) => (
              <div
                key={preset.id}
                onClick={() => onInsertPreset && onInsertPreset(preset.generateHtml(), insertDirection, insertScope)}
                style={{
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  padding: "10px",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#4f46e5";
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow = "0 3px 8px rgba(79, 70, 229, 0.12)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#e2e8f0";
                  e.currentTarget.style.transform = "none";
                  e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.03)";
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ width: "24px", height: "24px", borderRadius: "5px", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {preset.icon}
                    </div>
                    <span style={{ fontWeight: "700", fontSize: "12px", color: "#0f172a" }}>{preset.name}</span>
                  </div>
                  <span style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "4px", background: "#e0e7ff", color: "#4338ca", fontWeight: "700" }}>
                    + Add
                  </span>
                </div>
                {preset.preview && (
                  <div style={{ marginTop: "2px", marginBottom: "2px" }}>
                    {preset.preview}
                  </div>
                )}
                <p style={{ margin: 0, fontSize: "11px", color: "#64748b", lineHeight: "15px" }}>
                  {preset.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* -------------------- TAB 2: AI STUDIO (REPLACE & INSERT SECTIONS) -------------------- */}
      {activeTab === "ai" && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "#f8fafc" }}>
          <div style={{ flex: 1, overflowY: "auto", padding: "12px", display: "flex", flexDirection: "column", gap: "12px" }}>
            
            {/* Target Section Selection Header Card */}
            <div
              style={{
                background: "#ffffff",
                border: canCopySectionCode ? "1px solid #c7d2fe" : "1px solid #e2e8f0",
                borderRadius: "8px",
                padding: "12px",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                  <div style={{ width: "22px", height: "22px", borderRadius: "5px", background: canCopySectionCode ? "#e0e7ff" : "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Code2 size={13} color={canCopySectionCode ? "#4f46e5" : "#64748b"} />
                  </div>
                  <span style={{ fontSize: "11.5px", fontWeight: "700", color: "#0f172a" }}>
                    {canCopySectionCode ? "Active Targeted Section" : "No Section Selected"}
                  </span>
                </div>
                {canCopySectionCode && (
                  <span style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "4px", background: "#ecfdf5", color: "#059669", fontWeight: "700" }}>
                    Ready
                  </span>
                )}
              </div>

              {canCopySectionCode ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <p style={{ margin: 0, fontSize: "11px", color: "#64748b", lineHeight: "15px" }}>
                    Copy this section's HTML to give to your AI, or replace it with the AI's generated output.
                  </p>

                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      type="button"
                      onClick={handleCopySectionClick}
                      style={{
                        flex: 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                        padding: "7px 10px",
                        borderRadius: "6px",
                        border: copySectionStatus === "error" ? "1px solid #fecaca" : "1px solid #cbd5e1",
                        background: copySectionStatus === "copied" ? "#ecfdf5" : "#ffffff",
                        color: copySectionStatus === "copied" ? "#047857" : "#1e293b",
                        fontSize: "11px",
                        fontWeight: "700",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      {copySectionStatus === "copied" ? <Check size={12} color="#047857" /> : <Copy size={12} />}
                      <span>{copySectionStatus === "copied" ? "Copied HTML!" : "Copy Section HTML"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCopyAiPrompt}
                      title="Copies formatted AI prompt with section code attached"
                      style={{
                        flex: 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                        padding: "7px 10px",
                        borderRadius: "6px",
                        border: "1px solid #c7d2fe",
                        background: copiedPromptStatus ? "#ecfdf5" : "#f5f3ff",
                        color: copiedPromptStatus ? "#047857" : "#6d28d9",
                        fontSize: "11px",
                        fontWeight: "700",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      {copiedPromptStatus ? <Check size={12} color="#047857" /> : <Bot size={12} />}
                      <span>{copiedPromptStatus ? "Prompt Copied!" : "Copy with AI Prompt"}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ background: "#f8fafc", padding: "8px 10px", borderRadius: "6px", border: "1px dashed #cbd5e1" }}>
                  <p style={{ margin: 0, fontSize: "11px", color: "#64748b", lineHeight: "16px" }}>
                    👉 <strong>Tip:</strong> Click any element or section in the email preview to target it for AI copying & injection.
                  </p>
                </div>
              )}
            </div>

            {/* AI Code Input & Injection Action Card */}
            <div
              style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                padding: "12px",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <Sparkles size={14} color="#4f46e5" />
                  <span style={{ fontSize: "12px", fontWeight: "700", color: "#0f172a" }}>
                    Paste AI-Generated HTML
                  </span>
                </div>
                {aiCodeInput.trim() && (
                  <button
                    type="button"
                    onClick={() => setAiCodeInput("")}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#94a3b8",
                      fontSize: "10.5px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "3px",
                      padding: "2px 4px",
                    }}
                  >
                    <Trash2 size={11} />
                    <span>Clear</span>
                  </button>
                )}
              </div>

              <textarea
                value={aiCodeInput}
                onChange={(e) => handleAiCodeChange(e.target.value)}
                placeholder="Paste the modified or newly generated HTML output from your AI agent here..."
                style={{
                  width: "100%",
                  minHeight: "150px",
                  maxHeight: "320px",
                  padding: "10px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  background: "#0f172a",
                  color: "#f8fafc",
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                  fontSize: "11px",
                  lineHeight: "1.5",
                  resize: "vertical",
                  outline: "none",
                  boxSizing: "border-box",
                }}
                spellCheck={false}
              />

              {/* Status Banner */}
              {aiStatus && (
                <div
                  style={{
                    padding: "7px 10px",
                    borderRadius: "6px",
                    fontSize: "11px",
                    fontWeight: "600",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    background: aiStatus.type === "success" ? "#ecfdf5" : "#fef2f2",
                    color: aiStatus.type === "success" ? "#065f46" : "#b91c1c",
                    border: aiStatus.type === "success" ? "1px solid #a7f3d0" : "1px solid #fecaca",
                  }}
                >
                  {aiStatus.type === "success" ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
                  <span>{aiStatus.message}</span>
                </div>
              )}

              {/* Injection Action Buttons */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "2px" }}>
                {/* 1. Replace Selected Section */}
                <button
                  type="button"
                  onClick={handleExecuteReplace}
                  disabled={!aiCodeInput.trim() || !canCopySectionCode}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    border: "none",
                    background: (!aiCodeInput.trim() || !canCopySectionCode) ? "#e2e8f0" : "#4f46e5",
                    color: (!aiCodeInput.trim() || !canCopySectionCode) ? "#94a3b8" : "#ffffff",
                    fontSize: "11.5px",
                    fontWeight: "700",
                    cursor: (!aiCodeInput.trim() || !canCopySectionCode) ? "not-allowed" : "pointer",
                    boxShadow: (!aiCodeInput.trim() || !canCopySectionCode) ? "none" : "0 1px 3px rgba(79, 70, 229, 0.3)",
                    transition: "all 0.15s ease",
                  }}
                >
                  <RefreshCw size={12} />
                  <span>Replace Selected Section</span>
                </button>

                {/* 2. Insert Below & Above Row */}
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    type="button"
                    onClick={handleExecuteInsertBelow}
                    disabled={!aiCodeInput.trim()}
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "5px",
                      padding: "7px 10px",
                      borderRadius: "6px",
                      border: !aiCodeInput.trim() ? "1px solid #e2e8f0" : "1px solid #cbd5e1",
                      background: !aiCodeInput.trim() ? "#f8fafc" : "#ffffff",
                      color: !aiCodeInput.trim() ? "#94a3b8" : "#334155",
                      fontSize: "11px",
                      fontWeight: "700",
                      cursor: !aiCodeInput.trim() ? "not-allowed" : "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <ArrowDownCircle size={12} color={!aiCodeInput.trim() ? "#94a3b8" : "#059669"} />
                    <span>Insert Below</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleExecuteInsertAbove}
                    disabled={!aiCodeInput.trim()}
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "5px",
                      padding: "7px 10px",
                      borderRadius: "6px",
                      border: !aiCodeInput.trim() ? "1px solid #e2e8f0" : "1px solid #cbd5e1",
                      background: !aiCodeInput.trim() ? "#f8fafc" : "#ffffff",
                      color: !aiCodeInput.trim() ? "#94a3b8" : "#334155",
                      fontSize: "11px",
                      fontWeight: "700",
                      cursor: !aiCodeInput.trim() ? "not-allowed" : "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <ArrowUpCircle size={12} color={!aiCodeInput.trim() ? "#94a3b8" : "#4f46e5"} />
                    <span>Insert Above</span>
                  </button>
                </div>
              </div>
            </div>

            {/* AI Prompting Guidelines Helper Card */}
            <div
              style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                padding: "10px 12px",
                display: "flex",
                flexDirection: "column",
                gap: "6px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <HelpCircle size={12} color="#64748b" />
                <span style={{ fontSize: "10.5px", fontWeight: "700", color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  AI Prompting Tips
                </span>
              </div>
              <ul style={{ margin: 0, paddingLeft: "16px", fontSize: "10.5px", color: "#64748b", lineHeight: "16px" }}>
                <li>Keep wrapper dimensions at <code>max-width: 700px</code> or <code>100%</code>.</li>
                <li>Inline CSS ensures 100% compatibility across Gmail, Apple Mail & Outlook.</li>
                <li>You can undo any AI injection instantly using <code>Ctrl+Z</code>.</li>
              </ul>
            </div>

          </div>
        </div>
      )}

      {/* -------------------- TAB 3: DEVTOOLS STYLE INSPECTOR & DOM TREE -------------------- */}
      {activeTab === "styles" && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Chrome DevTools Elements Tree View (Upside Collapsible Panel) */}
          {showDomTree && (
            <div
              style={{
                maxHeight: "220px",
                minHeight: "100px",
                overflow: "auto",
                padding: "8px",
                background: "#ffffff",
                borderBottom: "1px solid #e2e8f0",
                flexShrink: 0,
                boxShadow: "inset 0 1px 3px rgba(0,0,0,0.04)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px", padding: "0 4px" }}>
                <span style={{ fontSize: "10.5px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  DOM Elements Tree
                </span>
                <span style={{ fontSize: "10px", color: "#94a3b8" }}>
                  Click any element to inspect & edit styles
                </span>
              </div>

              {domRoot ? (
                <DomTreeNode
                  element={domRoot}
                  selectedElement={selectedElement}
                  onSelectElement={(el) => onSelectElement && onSelectElement(el)}
                  depth={0}
                />
              ) : selectedElement ? (
                <DomTreeNode
                  element={(selectedElement.closest(".email-direct-dom-root") as HTMLElement) || selectedElement}
                  selectedElement={selectedElement}
                  onSelectElement={(el) => onSelectElement && onSelectElement(el)}
                  depth={0}
                />
              ) : (
                <div style={{ fontSize: "11px", color: "#94a3b8", padding: "8px" }}>
                  Click an element on the canvas to view its DOM structure
                </div>
              )}
            </div>
          )}

      {/* Chrome DevTools DOM Hierarchy Breadcrumb Bar */}
      {selectedElement && (
        <div
          className="devtools-breadcrumb-bar"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            padding: "6px 10px",
            background: "#f1f5f9",
            borderBottom: "1px solid #e2e8f0",
            overflowX: "auto",
            whiteSpace: "nowrap",
            fontSize: "11px",
            flexShrink: 0,
          }}
        >
          {/* Parent Traverser */}
          {selectedElement.parentElement && !selectedElement.parentElement.classList.contains("email-direct-dom-root") && (
            <button
              type="button"
              onClick={() => onSelectElement && onSelectElement(selectedElement.parentElement!)}
              title="Select Parent Container (↑)"
              style={{
                padding: "2px 6px",
                borderRadius: "4px",
                border: "1px solid #cbd5e1",
                background: "#ffffff",
                color: "#4f46e5",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "2px",
                fontWeight: "700",
                fontSize: "10.5px",
                flexShrink: 0,
              }}
            >
              <ChevronUp size={11} />
              <span>Parent</span>
            </button>
          )}

          {/* Child Traverser */}
          {selectedElement.firstElementChild && (
            <button
              type="button"
              onClick={() => onSelectElement && onSelectElement(selectedElement.firstElementChild as HTMLElement)}
              title="Select First Child Element (↓)"
              style={{
                padding: "2px 6px",
                borderRadius: "4px",
                border: "1px solid #cbd5e1",
                background: "#ffffff",
                color: "#059669",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "2px",
                fontWeight: "700",
                fontSize: "10.5px",
                flexShrink: 0,
              }}
            >
              <ChevronDown size={11} />
              <span>Child</span>
            </button>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: "3px", overflowX: "auto", minWidth: 0 }}>
            {domHierarchy.map((el, i) => {
              const isCurrent = el === selectedElement;
              const tag = el.tagName.toLowerCase();
              const classList = Array.from(el.classList).filter(c => !c.startsWith("editor-"));
              const classStr = classList.length > 0 ? `.${classList[0]}` : "";
              const label = `${tag}${classStr}`;

              return (
                <React.Fragment key={i}>
                  {i > 0 && <span style={{ color: "#94a3b8", fontSize: "10px", flexShrink: 0 }}>›</span>}
                  <button
                    type="button"
                    onClick={() => onSelectElement && onSelectElement(el)}
                    style={{
                      padding: "2px 5px",
                      borderRadius: "4px",
                      border: isCurrent ? "1px solid #4f46e5" : "1px solid transparent",
                      background: isCurrent ? "#4f46e5" : "transparent",
                      color: isCurrent ? "#ffffff" : "#475569",
                      fontWeight: isCurrent ? "700" : "500",
                      cursor: "pointer",
                      fontSize: "10.5px",
                      fontFamily: "ui-monospace, monospace",
                      flexShrink: 0,
                      maxWidth: "150px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={`Click to target <${tag}${classList.length > 0 ? ` class="${classList.join(" ")}"` : ""}>`}
                  >
                    {label}
                  </button>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}

      {/* Image Properties & Asset Replacement Card */}
      {selectedElement && selectedElement.tagName.toLowerCase() === "img" && (
        <div style={{
          margin: "8px 10px 4px",
          padding: "8px 10px",
          background: "#eff6ff",
          border: "1px solid #bfdbfe",
          borderRadius: "6px",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          flexShrink: 0
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <ImageIcon size={13} color="#2563eb" />
              <span style={{ fontSize: "11px", fontWeight: "700", color: "#1e3a8a" }}>Image Properties</span>
            </div>
            <button
              type="button"
              onClick={() => onReplaceImage && onReplaceImage(selectedElement)}
              style={{
                padding: "3px 8px",
                background: "#2563eb",
                color: "#ffffff",
                border: "none",
                borderRadius: "4px",
                fontSize: "10.5px",
                fontWeight: "700",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                boxShadow: "0 1px 2px rgba(37,99,235,0.2)",
              }}
              title="Replace image with a file from disk and copy to package assets"
            >
              <FolderOpen size={12} />
              <span>Replace from Disk</span>
            </button>
          </div>

          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <div style={{
              width: "44px",
              height: "44px",
              borderRadius: "4px",
              border: "1px solid #cbd5e1",
              background: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              flexShrink: 0
            }}>
              <img
                src={(selectedElement as HTMLImageElement).src}
                alt="Preview"
                style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
              />
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px", minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <span style={{ fontSize: "9.5px", fontWeight: "600", color: "#64748b", width: "22px" }}>Src:</span>
                <input
                  type="text"
                  value={(selectedElement as HTMLImageElement).getAttribute("src") || ""}
                  onChange={(e) => {
                    onUpdateAttribute && onUpdateAttribute(selectedElement, "src", e.target.value);
                  }}
                  style={{
                    flex: 1,
                    padding: "2px 5px",
                    fontSize: "10px",
                    borderRadius: "3px",
                    border: "1px solid #cbd5e1",
                    background: "#ffffff",
                    color: "#0f172a",
                    outline: "none",
                    fontFamily: "monospace"
                  }}
                />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <span style={{ fontSize: "9.5px", fontWeight: "600", color: "#64748b", width: "22px" }}>Alt:</span>
                <input
                  type="text"
                  value={(selectedElement as HTMLImageElement).getAttribute("alt") || ""}
                  onChange={(e) => {
                    onUpdateAttribute && onUpdateAttribute(selectedElement, "alt", e.target.value);
                  }}
                  style={{
                    flex: 1,
                    padding: "2px 5px",
                    fontSize: "10px",
                    borderRadius: "3px",
                    border: "1px solid #cbd5e1",
                    background: "#ffffff",
                    color: "#0f172a",
                    outline: "none",
                  }}
                  placeholder="Image alt description..."
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chrome DevTools Filter & Action Bar */}
      <div className="devtools-filter-bar">
        <button
          type="button"
          className="copy-section-code-btn"
          onClick={handleCopySectionClick}
          disabled={!canCopySectionCode}
          aria-live="polite"
          aria-label={copyButtonLabel}
          title={canCopySectionCode ? "Copy the complete enclosing email section HTML" : "Select an email section or element inside one to copy its HTML"}
          style={copyButtonBaseStyle}
        >
          <Copy size={12} />
          <span>{copyButtonLabel}</span>
        </button>
        <div className="filter-input-wrapper">
          <input
            type="text"
            className="filter-input"
            placeholder="Filter"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
          />
        </div>
        <div className="devtools-tools">
          <button className="tool-btn">:hov</button>
          <button className="tool-btn">.cls</button>
          <button 
            className="tool-btn" 
            onClick={() => newPropInputRef.current?.focus()}
            title="New Style Rule (+)"
          >
            <Plus size={13} />
          </button>
          <button className="tool-btn">
            <SlidersHorizontal size={13} />
          </button>
          <button 
            className="tool-btn"
            onClick={() => setShowDomTree((prev) => !prev)}
            title={showDomTree ? "Hide DOM Elements Tree" : "Show DOM Elements Tree (↑)"}
            style={{
              background: showDomTree ? "#e0e7ff" : "transparent",
              color: showDomTree ? "#4f46e5" : "#64748b",
            }}
          >
            <ChevronUp
              size={13}
              style={{
                transform: showDomTree ? "rotate(180deg)" : "none",
                transition: "transform 0.15s ease",
              }}
            />
          </button>
        </div>
      </div>

      {/* Quick Layout & Alignment Toolbar (Smart Image/Text Alignment & Mobile Row/Stacking) */}
      {selectedElement && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "6px 10px",
            background: "#f1f5f9",
            borderBottom: "1px solid #e2e8f0",
            fontSize: "11px",
            gap: "8px",
          }}
        >
          {/* Alignment buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <span style={{ color: "#64748b", fontWeight: "600", fontSize: "10.5px" }}>
              Align {viewMode === "mobile" ? "(Mobile)" : "(Desktop)"}:
            </span>
            <div style={{ display: "flex", background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: "5px", overflow: "hidden" }}>
              {/* ALIGN LEFT */}
              <button
                type="button"
                onClick={() => {
                  if (onQuickAlign) {
                    onQuickAlign("left");
                  }
                }}
                title={viewMode === "mobile" ? "Align Left on Mobile (responsive class)" : "Align Left on Desktop"}
                style={{
                  padding: "3px 7px",
                  border: "none",
                  background: (
                    (viewMode === "mobile" && (selectedElement.closest(".mobile-align-left") || selectedElement.classList?.contains("mobile-align-left"))) ||
                    (viewMode === "desktop" && (
                      inlineStyles["text-align"] === "left" ||
                      selectedElement.style?.textAlign === "left" ||
                      selectedElement.getAttribute("align") === "left" ||
                      (selectedElement.tagName === "IMG" && (inlineStyles["margin-left"] === "0px" || inlineStyles["margin-left"] === "0"))
                    ))
                  ) ? "#e0e7ff" : "transparent",
                  color: (
                    (viewMode === "mobile" && (selectedElement.closest(".mobile-align-left") || selectedElement.classList?.contains("mobile-align-left"))) ||
                    (viewMode === "desktop" && (
                      inlineStyles["text-align"] === "left" ||
                      selectedElement.style?.textAlign === "left" ||
                      selectedElement.getAttribute("align") === "left" ||
                      (selectedElement.tagName === "IMG" && (inlineStyles["margin-left"] === "0px" || inlineStyles["margin-left"] === "0"))
                    ))
                  ) ? "#4f46e5" : "#475569",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <AlignLeft size={12} />
              </button>

              {/* ALIGN CENTER */}
              <button
                type="button"
                onClick={() => {
                  if (onQuickAlign) {
                    onQuickAlign("center");
                  }
                }}
                title={viewMode === "mobile" ? "Align Center on Mobile (responsive class)" : "Align Center on Desktop"}
                style={{
                  padding: "3px 7px",
                  border: "none",
                  background: (
                    (viewMode === "mobile" && (selectedElement.closest(".mobile-align-center") || selectedElement.closest(".mobile-center-img") || selectedElement.classList?.contains("mobile-align-center") || selectedElement.classList?.contains("mobile-center-img"))) ||
                    (viewMode === "desktop" && (
                      inlineStyles["text-align"] === "center" ||
                      selectedElement.style?.textAlign === "center" ||
                      selectedElement.getAttribute("align") === "center" ||
                      (selectedElement.tagName === "IMG" && inlineStyles["margin-left"] === "auto" && inlineStyles["margin-right"] === "auto")
                    ))
                  ) ? "#e0e7ff" : "transparent",
                  color: (
                    (viewMode === "mobile" && (selectedElement.closest(".mobile-align-center") || selectedElement.closest(".mobile-center-img") || selectedElement.classList?.contains("mobile-align-center") || selectedElement.classList?.contains("mobile-center-img"))) ||
                    (viewMode === "desktop" && (
                      inlineStyles["text-align"] === "center" ||
                      selectedElement.style?.textAlign === "center" ||
                      selectedElement.getAttribute("align") === "center" ||
                      (selectedElement.tagName === "IMG" && inlineStyles["margin-left"] === "auto" && inlineStyles["margin-right"] === "auto")
                    ))
                  ) ? "#4f46e5" : "#475569",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <AlignCenter size={12} />
              </button>

              {/* ALIGN RIGHT */}
              <button
                type="button"
                onClick={() => {
                  if (onQuickAlign) {
                    onQuickAlign("right");
                  }
                }}
                title={viewMode === "mobile" ? "Align Right on Mobile (responsive class)" : "Align Right on Desktop"}
                style={{
                  padding: "3px 7px",
                  border: "none",
                  background: (
                    (viewMode === "mobile" && (selectedElement.closest(".mobile-align-right") || selectedElement.classList?.contains("mobile-align-right"))) ||
                    (viewMode === "desktop" && (
                      inlineStyles["text-align"] === "right" ||
                      selectedElement.style?.textAlign === "right" ||
                      selectedElement.getAttribute("align") === "right" ||
                      (selectedElement.tagName === "IMG" && (inlineStyles["margin-right"] === "0px" || inlineStyles["margin-right"] === "0"))
                    ))
                  ) ? "#e0e7ff" : "transparent",
                  color: (
                    (viewMode === "mobile" && (selectedElement.closest(".mobile-align-right") || selectedElement.classList?.contains("mobile-align-right"))) ||
                    (viewMode === "desktop" && (
                      inlineStyles["text-align"] === "right" ||
                      selectedElement.style?.textAlign === "right" ||
                      selectedElement.getAttribute("align") === "right" ||
                      (selectedElement.tagName === "IMG" && (inlineStyles["margin-right"] === "0px" || inlineStyles["margin-right"] === "0"))
                    ))
                  ) ? "#4f46e5" : "#475569",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <AlignRight size={12} />
              </button>
            </div>
          </div>

          {/* Row / Stack layout toggle */}
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <span style={{ color: "#64748b", fontWeight: "600", fontSize: "10.5px" }}>Mobile:</span>
            <div style={{ display: "flex", background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: "5px", overflow: "hidden" }}>
              {/* STACK (2 Rows on Mobile: Image Top, Text Bottom) */}
              <button
                type="button"
                onClick={() => {
                  // Find the multi-column section container
                  let targetContainer: HTMLElement | null = selectedElement;
                  while (targetContainer && targetContainer !== domRoot) {
                    if (
                      targetContainer.classList?.contains("header-group") ||
                      targetContainer.classList?.contains("mobile-force-row") ||
                      targetContainer.classList?.contains("mobile-force-stack") ||
                      (targetContainer.parentElement && targetContainer.parentElement.querySelectorAll("[class*='mj-column']").length > 1)
                    ) {
                      break;
                    }
                    targetContainer = targetContainer.parentElement;
                  }

                  const rowContainer = targetContainer?.parentElement && targetContainer.parentElement.querySelectorAll("[class*='mj-column']").length > 1
                    ? targetContainer.parentElement
                    : targetContainer || selectedElement;

                  rowContainer.classList.remove("mobile-force-row");
                  rowContainer.classList.add("mobile-force-stack");

                  // Also ensure individual columns have responsive stacking class
                  const columns = rowContainer.querySelectorAll("[class*='mj-column']");
                  columns.forEach((col) => {
                    (col as HTMLElement).classList.remove("mobile-force-row");
                    (col as HTMLElement).classList.add("mobile-force-stack");
                  });

                  onUpdateStyle("text-align", inlineStyles["text-align"] || "left");
                }}
                title="Stack into separate rows on mobile (Image top, Text bottom without altering Desktop)"
                style={{
                  padding: "3px 6px",
                  border: "none",
                  background: (selectedElement.closest(".mobile-force-stack") || (!selectedElement.closest(".mobile-force-row") && !selectedElement.closest(".header-group"))) ? "#e0e7ff" : "transparent",
                  color: (selectedElement.closest(".mobile-force-stack") || (!selectedElement.closest(".mobile-force-row") && !selectedElement.closest(".header-group"))) ? "#4f46e5" : "#475569",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "3px",
                  fontSize: "10.5px",
                }}
              >
                <Rows size={11} />
                <span>Stack</span>
              </button>

              {/* 1-ROW (Side-by-Side in same row on Mobile) */}
              <button
                type="button"
                onClick={() => {
                  // Find the multi-column section container
                  let targetContainer: HTMLElement | null = selectedElement;
                  while (targetContainer && targetContainer !== domRoot) {
                    if (
                      targetContainer.classList?.contains("header-group") ||
                      targetContainer.classList?.contains("mobile-force-row") ||
                      targetContainer.classList?.contains("mobile-force-stack") ||
                      (targetContainer.parentElement && targetContainer.parentElement.querySelectorAll("[class*='mj-column']").length > 1)
                    ) {
                      break;
                    }
                    targetContainer = targetContainer.parentElement;
                  }

                  const rowContainer = targetContainer?.parentElement && targetContainer.parentElement.querySelectorAll("[class*='mj-column']").length > 1
                    ? targetContainer.parentElement
                    : targetContainer || selectedElement;

                  rowContainer.classList.remove("mobile-force-stack");
                  rowContainer.classList.add("mobile-force-row");

                  const columns = rowContainer.querySelectorAll("[class*='mj-column']");
                  columns.forEach((col) => {
                    (col as HTMLElement).classList.remove("mobile-force-stack");
                    (col as HTMLElement).classList.add("mobile-force-row");
                  });

                  onUpdateStyle("text-align", inlineStyles["text-align"] || "left");
                }}
                title="Keep image and text in the same row on mobile without altering Desktop"
                style={{
                  padding: "3px 6px",
                  border: "none",
                  background: (selectedElement.closest(".mobile-force-row") || selectedElement.closest(".header-group")) ? "#e0e7ff" : "transparent",
                  color: (selectedElement.closest(".mobile-force-row") || selectedElement.closest(".header-group")) ? "#4f46e5" : "#475569",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "3px",
                  fontSize: "10.5px",
                }}
              >
                <Columns size={11} />
                <span>1-Row</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STYLES PANE */}
      <div className="styles-scroll-pane">
        {/* element.style Rule Block */}
        <div className="css-rule-block">
          <div className="rule-header">
            <span className="selector-text">element.style</span>
            <span className="rule-source">{"{"}</span>
          </div>

          <div className="rule-properties-list">
            {filteredInlineProps.map(([prop, val], idx) => {
              const isPropDisabled = disabledProps.has(prop);
              return (
                <div key={prop} className={`css-prop-row ${isPropDisabled ? "disabled" : ""}`} style={{ position: "relative" }}>
                  <input
                    type="checkbox"
                    checked={!isPropDisabled}
                    onChange={(e) => {
                      if (e.target.checked) {
                        const restoreValue = disabledPropValues[prop] ?? val;
                        setDisabledProps((prev) => {
                          const next = new Set(prev);
                          next.delete(prop);
                          return next;
                        });
                        setDisabledPropValues((prev) => {
                          const next = { ...prev };
                          delete next[prop];
                          return next;
                        });
                        onUpdateStyle(prop, restoreValue);
                      } else {
                        setDisabledPropValues((prev) => ({ ...prev, [prop]: val }));
                        setDisabledProps((prev) => {
                          const next = new Set(prev);
                          next.add(prop);
                          return next;
                        });
                        onRemoveStyle(prop);
                      }
                    }}
                    title="Toggle Property"
                  />
                  
                  {/* Editable Property Name */}
                  <span className="prop-name" style={{ position: "relative" }}>
                    <input
                      type="text"
                      className="devtools-prop-input"
                      value={prop}
                      style={{
                        color: isPropDisabled ? "#94a3b8" : "#c026d3",
                        width: `${Math.max(prop.length, 5)}ch`,
                      }}
                      onFocus={() => handleFieldFocus({ id: prop, type: "prop" })}
                      onBlur={handleFieldBlur}
                      onChange={(e) => {
                        const newP = e.target.value;
                        if (newP !== prop) {
                          if (onRenameStyle) {
                            onRenameStyle(prop, newP, val);
                          } else {
                            onRemoveStyle(prop);
                            if (newP.trim()) onUpdateStyle(newP.trim(), val);
                          }
                        }
                      }}
                      onKeyDown={(e) => {
                        const isDropdownOpen = focusedField?.id === prop && focusedField?.type === "prop" && activeSuggestions.length > 0;
                        if (isDropdownOpen && e.key === "ArrowDown") {
                          e.preventDefault();
                          setHighlightedIndex((prev) => (prev + 1) % activeSuggestions.length);
                        } else if (isDropdownOpen && e.key === "ArrowUp") {
                          e.preventDefault();
                          setHighlightedIndex((prev) => (prev - 1 + activeSuggestions.length) % activeSuggestions.length);
                        } else if (e.key === "Enter" || e.key === ":" || e.key === "Tab") {
                          e.preventDefault();
                          if (isDropdownOpen && activeSuggestions[highlightedIndex]) {
                            const chosenProp = activeSuggestions[highlightedIndex];
                            if (onRenameStyle) {
                              onRenameStyle(prop, chosenProp, val);
                            } else {
                              onRemoveStyle(prop);
                              onUpdateStyle(chosenProp, val);
                            }
                          }
                          setFocusedField(null);
                          const nextValInput = (e.currentTarget.parentElement?.nextElementSibling?.querySelector(".devtools-val-input") as HTMLInputElement);
                          nextValInput?.focus();
                        } else if (e.key === "Escape") {
                          setFocusedField(null);
                        }
                      }}
                    />
                    :

                    {/* Compact Suggestions Popup for Existing Row Property */}
                    {focusedField?.id === prop && focusedField.type === "prop" && activeSuggestions.length > 0 && (
                      <div className="devtools-compact-dropdown" onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                        {activeSuggestions.slice(0, 8).map((sug, sIdx) => (
                          <div
                            key={sug}
                            className={`devtools-compact-item ${sIdx === highlightedIndex ? "active" : ""}`}
                            onClick={() => {
                              if (onRenameStyle) {
                                onRenameStyle(prop, sug, val);
                              } else {
                                onRemoveStyle(prop);
                                onUpdateStyle(sug, val);
                              }
                              setFocusedField(null);
                            }}
                          >
                            <span>{sug}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </span>

                  {/* Editable Value */}
                  <span className="prop-val" style={{ position: "relative" }}>
                    {(val.startsWith("#") || val.startsWith("rgb")) && (
                      <span
                        className="color-swatch"
                        style={{ backgroundColor: toHexColor(val), position: "relative", cursor: "pointer" }}
                      >
                        <input
                          type="color"
                          value={toHexColor(val)}
                          onChange={(e) => onUpdateStyle(prop, e.target.value)}
                          style={{
                            opacity: 0,
                            position: "absolute",
                            inset: 0,
                            width: "100%",
                            height: "100%",
                            cursor: "pointer",
                          }}
                        />
                      </span>
                    )}
                    <input
                      type="text"
                      className="devtools-val-input"
                      value={val}
                      style={{
                        color: isPropDisabled ? "#94a3b8" : "#2563eb",
                        width: `${Math.max(val.length + 1, 5)}ch`,
                      }}
                      onFocus={() => handleFieldFocus({ id: prop, type: "val", propName: prop })}
                      onBlur={handleFieldBlur}
                      onChange={(e) => onUpdateStyle(prop, e.target.value)}
                      onKeyDown={(e) => {
                        const isDropdownOpen = focusedField?.id === prop && focusedField?.type === "val" && activeSuggestions.length > 0;
                        if (isDropdownOpen && e.key === "ArrowDown") {
                          e.preventDefault();
                          setHighlightedIndex((prev) => (prev + 1) % activeSuggestions.length);
                        } else if (isDropdownOpen && e.key === "ArrowUp") {
                          e.preventDefault();
                          setHighlightedIndex((prev) => (prev - 1 + activeSuggestions.length) % activeSuggestions.length);
                        } else if (e.key === "Enter" || e.key === ";" || (e.key === "Tab" && !e.shiftKey)) {
                          e.preventDefault();
                          if (isDropdownOpen && activeSuggestions[highlightedIndex]) {
                            onUpdateStyle(prop, activeSuggestions[highlightedIndex]);
                          }
                          setFocusedField(null);
                          if (idx === filteredInlineProps.length - 1) {
                            newPropInputRef.current?.focus();
                          } else {
                            const nextRow = e.currentTarget.closest(".css-prop-row")?.nextElementSibling;
                            const nextInput = nextRow?.querySelector(".devtools-prop-input") as HTMLInputElement;
                            nextInput ? nextInput.focus() : newPropInputRef.current?.focus();
                          }
                        } else if (e.key === "Escape") {
                          setFocusedField(null);
                        } else if (!isDropdownOpen) {
                          handleArrowKeyStep(e, prop, val);
                        }
                      }}
                    />

                    {/* Compact Suggestions Popup for Existing Row Value */}
                    {focusedField?.id === prop && focusedField.type === "val" && activeSuggestions.length > 0 && (
                      <div className="devtools-compact-dropdown" onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                        {activeSuggestions.map((sug, sIdx) => (
                          <div
                            key={sug}
                            className={`devtools-compact-item ${sIdx === highlightedIndex ? "active" : ""}`}
                            onClick={() => {
                              onUpdateStyle(prop, sug);
                              setFocusedField(null);
                            }}
                          >
                            <span>{sug}</span>
                            {sug.toLowerCase() === val.toLowerCase() && (
                              <span className="current-badge">current</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </span>
                  <span className="prop-semi">;</span>
                </div>
              );
            })}

            {/* Permanent New Property Row (Exact Chrome DevTools bottom input) */}
            <div className="css-prop-row new-row" style={{ position: "relative" }}>
              <input type="checkbox" checked={false} disabled style={{ opacity: 0.3 }} />
              
              {/* New Property Input */}
              <span className="prop-name" style={{ position: "relative" }}>
                <input
                  ref={newPropInputRef}
                  type="text"
                  className="devtools-prop-input"
                  placeholder="property"
                  value={newProp}
                  style={{
                    color: "#c026d3",
                    width: "88px",
                  }}
                  onFocus={() => handleFieldFocus({ id: "new", type: "prop" })}
                  onBlur={handleFieldBlur}
                  onChange={(e) => setNewProp(e.target.value)}
                  onKeyDown={(e) => {
                    const isDropdownOpen = focusedField?.id === "new" && focusedField?.type === "prop" && activeSuggestions.length > 0;
                    if (isDropdownOpen && e.key === "ArrowDown") {
                      e.preventDefault();
                      setHighlightedIndex((prev) => (prev + 1) % activeSuggestions.length);
                    } else if (isDropdownOpen && e.key === "ArrowUp") {
                      e.preventDefault();
                      setHighlightedIndex((prev) => (prev - 1 + activeSuggestions.length) % activeSuggestions.length);
                    } else if (e.key === "Enter" || e.key === ":" || e.key === "Tab") {
                      e.preventDefault();
                      if (isDropdownOpen && activeSuggestions[highlightedIndex]) {
                        setNewProp(activeSuggestions[highlightedIndex]);
                      }
                      setFocusedField(null);
                      newValInputRef.current?.focus();
                    } else if (e.key === "Escape") {
                      setFocusedField(null);
                    }
                  }}
                />
                :

                {/* Compact Property Suggestions */}
                {focusedField?.id === "new" && focusedField.type === "prop" && activeSuggestions.length > 0 && (
                  <div className="devtools-compact-dropdown" onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                    {activeSuggestions.slice(0, 8).map((sug, sIdx) => (
                      <div
                        key={sug}
                        className={`devtools-compact-item ${sIdx === highlightedIndex ? "active" : ""}`}
                        onClick={() => {
                          setNewProp(sug);
                          setFocusedField(null);
                          newValInputRef.current?.focus();
                        }}
                      >
                        {sug}
                      </div>
                    ))}
                  </div>
                )}
              </span>

              {/* New Value Input */}
              <span className="prop-val" style={{ position: "relative" }}>
                <input
                  ref={newValInputRef}
                  type="text"
                  className="devtools-val-input"
                  placeholder="value"
                  value={newVal}
                  style={{
                    color: "#2563eb",
                    width: "110px",
                  }}
                  onFocus={() => handleFieldFocus({ id: "new", type: "val", propName: newProp })}
                  onBlur={handleFieldBlur}
                  onChange={(e) => setNewVal(e.target.value)}
                  onKeyDown={(e) => {
                    const isDropdownOpen = focusedField?.id === "new" && focusedField?.type === "val" && activeSuggestions.length > 0;
                    if (isDropdownOpen && e.key === "ArrowDown") {
                      e.preventDefault();
                      setHighlightedIndex((prev) => (prev + 1) % activeSuggestions.length);
                    } else if (isDropdownOpen && e.key === "ArrowUp") {
                      e.preventDefault();
                      setHighlightedIndex((prev) => (prev - 1 + activeSuggestions.length) % activeSuggestions.length);
                    } else if (e.key === "Enter" || e.key === ";" || e.key === "Tab") {
                      e.preventDefault();
                      if (isDropdownOpen && activeSuggestions[highlightedIndex] && !newVal) {
                        onUpdateStyle(newProp.trim(), activeSuggestions[highlightedIndex]);
                        setNewProp("");
                        setNewVal("");
                        setFocusedField(null);
                        setTimeout(() => newPropInputRef.current?.focus(), 50);
                      } else {
                        setFocusedField(null);
                        handleCommitNewProp();
                      }
                    } else if (e.key === "Escape") {
                      setFocusedField(null);
                    }
                  }}
                />
                ;

                {/* Compact Value Suggestions */}
                {focusedField?.id === "new" && focusedField.type === "val" && activeSuggestions.length > 0 && (
                  <div className="devtools-compact-dropdown" onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                    {activeSuggestions.map((sug, sIdx) => (
                      <div
                        key={sug}
                        className={`devtools-compact-item ${sIdx === highlightedIndex ? "active" : ""}`}
                        onClick={() => {
                          onUpdateStyle(newProp.trim(), sug);
                          setNewProp("");
                          setNewVal("");
                          setFocusedField(null);
                          setTimeout(() => newPropInputRef.current?.focus(), 50);
                        }}
                      >
                        {sug}
                      </div>
                    ))}
                  </div>
                )}
              </span>
            </div>
          </div>

          <div className="rule-footer">{"}"}</div>
        </div>

        {/* Matched Rules from Stylesheet */}
        {matchedRules.map((rule, rIdx) => (
          <div key={rIdx} className="css-rule-block">
            <div className="rule-header">
              <span className="selector-text">{rule.selector}</span>
              <span className="rule-source">{rule.source}</span>
            </div>
            <div className="rule-properties-list">
              {Object.entries(rule.properties).map(([prop, val]) => (
                <div key={prop} className="css-prop-row">
                  <span className="prop-name">{prop}:</span>
                  <span className="prop-val">
                    {(val.startsWith("#") || val.startsWith("rgb")) && (
                      <span
                        className="color-swatch"
                        style={{ backgroundColor: toHexColor(val), position: "relative", cursor: "pointer" }}
                      >
                        <input
                          type="color"
                          value={toHexColor(val)}
                          onChange={(e) => {
                            onUpdateStyle(prop, e.target.value);
                          }}
                          style={{
                            opacity: 0,
                            position: "absolute",
                            inset: 0,
                            width: "100%",
                            height: "100%",
                            cursor: "pointer",
                          }}
                        />
                      </span>
                    )}
                    <input
                      type="text"
                      value={val}
                      onChange={(e) => {
                        onUpdateStyle(prop, e.target.value);
                      }}
                      onKeyDown={(e) => handleArrowKeyStep(e, prop, val)}
                      style={{
                        border: "1px solid transparent",
                        background: "transparent",
                        color: "#2563eb",
                        fontFamily: "var(--font-mono)",
                        fontSize: "11px",
                        outline: "none",
                      }}
                    />
                  </span>
                  <span className="prop-semi">;</span>
                </div>
              ))}
            </div>
            <div className="rule-footer">{"}"}</div>
          </div>
        ))}

        {/* User Agent Stylesheet Simulation Block */}
        <div className="css-rule-block">
          <div className="rule-header">
            <span className="selector-text">{tagName}</span>
            <span className="rule-source">user agent stylesheet</span>
          </div>
          <div className="rule-properties-list user-agent">
            <div className="css-prop-row"><span className="prop-name">display:</span> <span className="prop-val">block;</span></div>
            <div className="css-prop-row"><span className="prop-name">box-sizing:</span> <span className="prop-val">border-box;</span></div>
          </div>
          <div className="rule-footer">{"}"}</div>
        </div>

        {/* Box Model Diagram */}
        <BoxModel {...metrics} />
      </div>
    </div>
  )}
</div>
  );
};


