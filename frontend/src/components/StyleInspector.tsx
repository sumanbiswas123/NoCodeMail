import React, { useState, useMemo } from "react";
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
}

const CSS_PROPERTY_SUGGESTIONS = [
  "color", "background-color", "font-size", "font-weight", "font-family", 
  "line-height", "text-align", "padding", "padding-top", "padding-right", 
  "padding-bottom", "padding-left", "margin", "margin-top", "margin-right", 
  "margin-bottom", "margin-left", "border", "border-radius", "border-color", 
  "border-width", "border-style", "width", "height", "max-width", "min-width", 
  "display", "vertical-align", "text-decoration", "letter-spacing", "opacity"
];

const CSS_VALUE_SUGGESTIONS: Record<string, string[]> = {
  "display": ["block", "inline-block", "inline", "flex", "table", "table-cell", "none"],
  "font-weight": ["normal", "bold", "300", "400", "500", "600", "700", "800", "900"],
  "text-align": ["left", "center", "right", "justify"],
  "vertical-align": ["top", "middle", "bottom", "baseline"],
  "text-decoration": ["none", "underline", "line-through"],
  "border-style": ["solid", "dashed", "dotted", "none", "double"],
  "font-family": [
    "Arial, Helvetica, sans-serif",
    "Helvetica, Arial, sans-serif",
    "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    "Georgia, serif",
    "'Times New Roman', Times, serif",
    "'Courier New', Courier, monospace",
    "system-ui, -apple-system, sans-serif"
  ],
};

export const StyleInspector: React.FC<StyleInspectorProps> = ({
  selectedElement,
  inlineStyles,
  onUpdateStyle,
  onRemoveStyle,
}) => {
  const [activeTab, setActiveTab] = useState<"styles" | "computed" | "layout">("styles");
  const [filterText, setFilterText] = useState("");
  const [newProp, setNewProp] = useState("");
  const [newVal, setNewVal] = useState("");
  const [isAddingRule, setIsAddingRule] = useState(false);

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

  // Compute all live computed CSS properties
  const computedStyles = useMemo<Record<string, string>>(() => {
    if (!selectedElement) return {};
    const win = selectedElement.ownerDocument?.defaultView || window;
    const computed = win.getComputedStyle(selectedElement);
    const result: Record<string, string> = {};
    for (let i = 0; i < computed.length; i++) {
      const prop = computed[i];
      const val = computed.getPropertyValue(prop);
      if (val && !prop.startsWith("-webkit-")) {
        result[prop] = val;
      }
    }
    return result;
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

  const handleAddCustomProp = (e: React.FormEvent) => {
    e.preventDefault();
    if (newProp.trim() && newVal.trim()) {
      onUpdateStyle(newProp.trim(), newVal.trim());
      setNewProp("");
      setNewVal("");
      setIsAddingRule(false);
    }
  };

  const handleArrowKeyStep = (e: React.KeyboardEvent<HTMLInputElement>, prop: string, val: string) => {
    if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
    e.preventDefault();

    const step = e.shiftKey ? 10 : (e.altKey ? 0.1 : 1);
    const match = val.match(/^([+-]?[\d.]+)(.*)$/);
    if (!match) return;

    const num = parseFloat(match[1]);
    const unit = match[2] || "px";
    const newNum = e.key === "ArrowUp" ? num + step : num - step;
    const rounded = Math.round(newNum * 100) / 100;

    onUpdateStyle(prop, `${rounded}${unit}`);
  };

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

  const filteredComputedProps = useMemo(() => {
    return Object.entries(computedStyles).filter(([prop, val]) => {
      if (!filterText) return true;
      return prop.toLowerCase().includes(filterText.toLowerCase()) || val.toLowerCase().includes(filterText.toLowerCase());
    });
  }, [computedStyles, filterText]);

  const getDatalistId = (prop: string) => {
    return CSS_VALUE_SUGGESTIONS[prop] ? `datalist-${prop}` : undefined;
  };

  return (
    <div className="style-inspector-container">
      {/* Global CSS Native Datalists */}
      <datalist id="css-property-list">
        {CSS_PROPERTY_SUGGESTIONS.map((p) => (
          <option key={p} value={p} />
        ))}
      </datalist>
      {Object.entries(CSS_VALUE_SUGGESTIONS).map(([prop, values]) => (
        <datalist key={prop} id={`datalist-${prop}`}>
          {values.map((v) => (
            <option key={v} value={v} />
          ))}
        </datalist>
      ))}

      {/* Chrome DevTools Tab Bar */}
      <div className="devtools-tabs">
        <button
          className={`tab-item ${activeTab === "styles" ? "active" : ""}`}
          onClick={() => setActiveTab("styles")}
        >
          Styles
        </button>
        <button
          className={`tab-item ${activeTab === "computed" ? "active" : ""}`}
          onClick={() => setActiveTab("computed")}
        >
          Computed
        </button>
        <button
          className={`tab-item ${activeTab === "layout" ? "active" : ""}`}
          onClick={() => setActiveTab("layout")}
        >
          Layout
        </button>
        <button className="tab-item">Event Listeners</button>
        <button className="tab-item">DOM Breakpoints</button>
        <button className="tab-item">Properties</button>
        <span className="tab-overflow">&gt;&gt;</span>
      </div>

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
            onClick={() => setIsAddingRule(true)}
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

      {/* 1. STYLES TAB (Exact Chrome DevTools Look & Feel) */}
      {activeTab === "styles" && (
        <div className="styles-scroll-pane">
          {/* element.style Rule Block */}
          <div className="css-rule-block">
            <div className="rule-header">
              <span className="selector-text">element.style</span>
              <span className="rule-source">{"{"}</span>
            </div>
            <div className="rule-properties-list">
              {filteredInlineProps.map(([prop, val]) => (
                <div key={prop} className="css-prop-row">
                  <input
                    type="checkbox"
                    checked={true}
                    onChange={(e) => {
                      if (!e.target.checked) onRemoveStyle(prop);
                    }}
                    title="Toggle Property"
                  />
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
                      list={getDatalistId(prop)}
                      value={val}
                      onChange={(e) => onUpdateStyle(prop, e.target.value)}
                      onKeyDown={(e) => handleArrowKeyStep(e, prop, val)}
                    />
                  </span>
                  <span className="prop-semi">;</span>
                </div>
              ))}

              {isAddingRule && (
                <form className="add-rule-form" onSubmit={handleAddCustomProp} style={{ display: "flex", alignItems: "center", gap: "2px", marginTop: "2px" }}>
                  <input
                    type="text"
                    list="css-property-list"
                    placeholder="property"
                    value={newProp}
                    onChange={(e) => setNewProp(e.target.value)}
                    autoFocus
                    style={{ border: "1px solid #3b82f6", background: "#ffffff", padding: "1px 4px", fontSize: "11px", width: "100px", outline: "none" }}
                  />
                  <span>:</span>
                  <input
                    type="text"
                    list={getDatalistId(newProp)}
                    placeholder="value"
                    value={newVal}
                    onChange={(e) => setNewVal(e.target.value)}
                    style={{ border: "1px solid #3b82f6", background: "#ffffff", padding: "1px 4px", fontSize: "11px", flex: 1, outline: "none" }}
                  />
                  <span>;</span>
                  <button type="submit" style={{ display: "none" }} />
                </form>
              )}
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
                        list={getDatalistId(prop)}
                        value={val}
                        onChange={(e) => {
                          rule.styleDeclaration.setProperty(prop, e.target.value);
                          onUpdateStyle(prop, e.target.value);
                        }}
                        onKeyDown={(e) => handleArrowKeyStep(e, prop, val)}
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
      )}

      {/* 2. COMPUTED TAB */}
      {activeTab === "computed" && (
        <div className="styles-scroll-pane">
          <BoxModel {...metrics} />
          <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "2px" }}>
            {filteredComputedProps.map(([prop, val]) => (
              <div key={prop} className="css-prop-row" style={{ justifyContent: "space-between", borderBottom: "1px solid #f8fafc", padding: "3px 0" }}>
                <span className="prop-name" style={{ color: "#64748b", fontWeight: 600 }}>{prop}</span>
                <span className="prop-val" style={{ color: "#0f172a" }}>{val}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. LAYOUT TAB */}
      {activeTab === "layout" && (
        <div className="styles-scroll-pane">
          <BoxModel {...metrics} />
        </div>
      )}
    </div>
  );
};


