import React, { useState } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";

interface DomTreeViewerProps {
  rootElement: HTMLElement | null;
  selectedElement: HTMLElement | null;
  onSelectElement: (el: HTMLElement) => void;
}

interface DomTreeNodeProps {
  element: HTMLElement;
  selectedElement: HTMLElement | null;
  onSelectElement: (el: HTMLElement) => void;
  depth: number;
}

const IGNORED_TAGS = ["script", "style", "meta", "link", "base", "title", "noscript"];

const DomTreeNode: React.FC<DomTreeNodeProps> = ({
  element,
  selectedElement,
  onSelectElement,
  depth,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  if (!element || element.nodeType !== 1) return null;
  const tagName = element.tagName.toLowerCase();
  if (IGNORED_TAGS.includes(tagName)) return null;

  const childElements = Array.from(element.children || []).filter(
    (child) => child && child.nodeType === 1 && !IGNORED_TAGS.includes(child.tagName?.toLowerCase())
  ) as HTMLElement[];

  const hasChildren = childElements.length > 0;
  const isSelected = selectedElement === element;

  const attributes = Array.from(element.attributes).filter(
    (attr) => !["contenteditable", "spellcheck", "data-editor-id"].includes(attr.name)
  );

  const textPreview = (!hasChildren && element.textContent)
    ? element.textContent.trim().slice(0, 30) + (element.textContent.trim().length > 30 ? "..." : "")
    : "";

  return (
    <div className="devtools-tree-node" style={{ paddingLeft: `${depth * 12}px` }}>
      <div
        className={`tree-line ${isSelected ? "selected" : ""}`}
        onClick={(e) => {
          e.stopPropagation();
          onSelectElement(element);
        }}
      >
        {hasChildren ? (
          <span
            className="toggle-icon"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
          >
            {isExpanded ? <ChevronDown size={11} color="#64748b" /> : <ChevronRight size={11} color="#64748b" />}
          </span>
        ) : (
          <span className="toggle-placeholder" />
        )}

        <span className="tag-bracket">&lt;</span>
        <span className="tag-name">{tagName}</span>

        {attributes.map((attr) => (
          <span key={attr.name} className="attr-group">
            <span className="attr-name"> {attr.name}</span>
            <span className="attr-equals">=</span>
            <span className="attr-value">"{attr.value.length > 35 ? attr.value.slice(0, 35) + "..." : attr.value}"</span>
          </span>
        ))}

        <span className="tag-bracket">&gt;</span>

        {!hasChildren && textPreview && (
          <span className="text-content">{textPreview}</span>
        )}

        {!hasChildren && (
          <>
            <span className="tag-bracket">&lt;/</span>
            <span className="tag-name">{tagName}</span>
            <span className="tag-bracket">&gt;</span>
          </>
        )}
      </div>

      {hasChildren && isExpanded && (
        <div className="tree-children">
          {childElements.map((child, idx) => (
            <DomTreeNode
              key={idx}
              element={child}
              selectedElement={selectedElement}
              onSelectElement={onSelectElement}
              depth={depth + 1}
            />
          ))}
          <div className="tree-line closing-tag" style={{ paddingLeft: `${depth * 12 + 12}px` }}>
            <span className="tag-bracket">&lt;/</span>
            <span className="tag-name">{tagName}</span>
            <span className="tag-bracket">&gt;</span>
          </div>
        </div>
      )}
    </div>
  );
};

export const DomTreeViewer: React.FC<DomTreeViewerProps> = ({
  rootElement,
  selectedElement,
  onSelectElement,
}) => {
  if (!rootElement) {
    return (
      <div className="devtools-empty-tree" style={{ padding: "16px", color: "#94a3b8", fontSize: "11px", fontFamily: "monospace" }}>
        Loading DOM tree...
      </div>
    );
  }

  const bodyElement = rootElement.tagName.toLowerCase() === "body" ? rootElement : rootElement.querySelector("body") || rootElement;

  return (
    <div className="devtools-dom-tree-container">
      <DomTreeNode
        element={bodyElement as HTMLElement}
        selectedElement={selectedElement}
        onSelectElement={onSelectElement}
        depth={0}
      />
    </div>
  );
};
