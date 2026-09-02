import React, { useState, useMemo, useRef, useEffect } from "react";
import { Plus, SlidersHorizontal, HelpCircle } from "lucide-react";
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
}

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
}) => {
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
  }, [selectedElement, inlineStyles]);

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

  const filteredInlineProps = useMemo(() => {
    return Object.entries(inlineStyles).filter(([prop, val]) => {
      if (!filterText) return true;
      return prop.toLowerCase().includes(filterText.toLowerCase()) || val.toLowerCase().includes(filterText.toLowerCase());
    });
  }, [inlineStyles, filterText]);

  // Generate suggestions for active field with current value placed at top
  const activeSuggestions = useMemo(() => {
    if (!focusedField) return [];
    if (focusedField.type === "prop") {
      const q = (focusedField.id === "new" ? newProp : "").toLowerCase();
      return CSS_PROPERTY_SUGGESTIONS.filter((p) => !q || p.includes(q));
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

  return (
    <div className="style-inspector-container">
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
          <button className="tool-btn">
            <HelpCircle size={13} />
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


