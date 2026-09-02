import React, { useState, useMemo, useRef, useEffect } from "react";
import { Plus, SlidersHorizontal, ChevronUp, ChevronDown, ChevronRight } from "lucide-react";
import { BoxModel } from "./BoxModel";

interface MatchedRule {
  selector: string;
  source: string;
  styleDeclaration: CSSStyleDeclaration;
  properties: Record<string, string>;
}

interface StyleInspectorProps {
  selectedElement: HTMLElement | null;
  inlineStyles: Record<string, string>;
  onUpdateStyle: (property: string, value: string) => void;
  onRemoveStyle: (property: string) => void;
  onRenameStyle?: (oldProperty: string, newProperty: string, value: string) => void;
  onSelectElement?: (el: HTMLElement) => void;
  domRoot?: HTMLElement | null;
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
    return Array.from(element.children).filter(
      (c) => c instanceof HTMLElement && !c.classList.contains("editor-selection-overlay")
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
  onUpdateStyle,
  onRemoveStyle,
  onRenameStyle,
  onSelectElement,
  domRoot,
}) => {
  const [showDomTree, setShowDomTree] = useState(false);
  const [filterText, setFilterText] = useState("");
  const [newProp, setNewProp] = useState("");
  const [newVal, setNewVal] = useState("");
  const [disabledProps, setDisabledProps] = useState<Set<string>>(new Set());
  const [focusedField, setFocusedField] = useState<{ id: string; type: "prop" | "val"; propName?: string } | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(0);

  const newPropInputRef = useRef<HTMLInputElement>(null);
  const newValInputRef = useRef<HTMLInputElement>(null);

  const blurTimerRef = useRef<number | null>(null);

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
            if (rule instanceof CSSStyleRule) {
              try {
                if (selectedElement.matches(rule.selectorText)) {
                  const props: Record<string, string> = {};
                  for (let i = 0; i < rule.style.length; i++) {
                    const p = rule.style[i];
                    props[p] = rule.style.getPropertyValue(p);
                  }
                  rules.push({
                    selector: rule.selectorText,
                    source: `style_${sheetIdx + 1}.css`,
                    styleDeclaration: rule.style,
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
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      const match = val.match(/^([+-]?[\d.]+)(.*)$/);
      if (match) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : (e.altKey ? 0.1 : 1);
        const num = parseFloat(match[1]);
        const unit = match[2] || "px";
        const newNum = e.key === "ArrowUp" ? num + step : num - step;
        const rounded = Math.round(newNum * 100) / 100;
        onUpdateStyle(prop, `${rounded}${unit}`);
      }
    }
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
    const entries = Object.entries(inlineStyles);
    if (!filterText.trim()) return entries;
    const q = filterText.toLowerCase();
    return entries.filter(([p, v]) => p.toLowerCase().includes(q) || v.toLowerCase().includes(q));
  }, [inlineStyles, filterText]);

  return (
    <div className="style-inspector-container">
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

      {/* Chrome DevTools Filter & Action Bar */}
      <div className="devtools-filter-bar">
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
                        setDisabledProps((prev) => {
                          const next = new Set(prev);
                          next.delete(prop);
                          return next;
                        });
                        onUpdateStyle(prop, val);
                      } else {
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
                            rule.styleDeclaration.setProperty(prop, e.target.value);
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
                        rule.styleDeclaration.setProperty(prop, e.target.value);
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
  );
};


