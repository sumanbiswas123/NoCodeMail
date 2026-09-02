import React, { useState, useEffect } from "react";
import { Globe, Check, X, ExternalLink, Compass } from "lucide-react";
import { nativeIPC, BrowserInfo } from "../services/ipc";

interface BrowserSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectBrowser: (browserPath: string) => void;
  currentBrowserPath?: string;
  title?: string;
  subtitle?: string;
}

export const BrowserSelectModal: React.FC<BrowserSelectModalProps> = ({
  isOpen,
  onClose,
  onSelectBrowser,
  currentBrowserPath = "",
  title = "Select Default Browser for MJML Agent",
  subtitle = "Choose which browser to use when opening the MJML AI Agent.",
}) => {
  const [browsers, setBrowsers] = useState<BrowserInfo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      nativeIPC.getInstalledBrowsers().then((list) => {
        setBrowsers(list || []);
        setLoading(false);
      }).catch(() => {
        setLoading(false);
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="ios-modal-overlay" onClick={onClose} style={{ zIndex: 10000 }}>
      <div 
        className="ios-glass-modal" 
        style={{ width: "520px", maxWidth: "92vw", display: "flex", flexDirection: "column", animation: "modalSlideUp 0.2s cubic-bezier(0.16, 1, 0.3, 1)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="ios-modal-header" style={{ padding: "16px 20px", borderBottom: "1px solid #e2e8f0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "34px", height: "34px", borderRadius: "8px", background: "linear-gradient(135deg, #4f46e5, #7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", color: "#ffffff" }}>
              <Compass size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "700", color: "#0f172a" }}>{title}</h3>
              <p style={{ margin: 0, fontSize: "11.5px", color: "#64748b" }}>{subtitle}</p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            style={{ background: "transparent", border: "none", cursor: "pointer", color: "#64748b", padding: "4px" }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Browser List */}
        <div style={{ padding: "16px 20px", maxHeight: "60vh", overflowY: "auto" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "30px", color: "#64748b", fontSize: "13px" }}>
              Scanning installed browsers...
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {browsers.map((b) => {
                const isSelected = currentBrowserPath === b.path;
                return (
                  <div
                    key={b.id || b.name}
                    onClick={() => onSelectBrowser(b.path)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "12px 14px",
                      borderRadius: "10px",
                      background: isSelected ? "#eef2ff" : "#ffffff",
                      border: isSelected ? "1.5px solid #6366f1" : "1px solid #e2e8f0",
                      cursor: "pointer",
                      boxShadow: isSelected ? "0 2px 6px rgba(99, 102, 241, 0.15)" : "0 1px 2px rgba(0,0,0,0.02)",
                      transition: "all 0.15s ease",
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = "#a5b4fc";
                        e.currentTarget.style.background = "#f8fafc";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = "#e2e8f0";
                        e.currentTarget.style.background = "#ffffff";
                      }
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
                      <div style={{ width: "30px", height: "30px", borderRadius: "6px", background: isSelected ? "#4f46e5" : "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", color: isSelected ? "#ffffff" : "#64748b", flexShrink: 0 }}>
                        <Globe size={16} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: "13px", fontWeight: "700", color: "#1e293b", display: "flex", alignItems: "center", gap: "6px" }}>
                          <span>{b.name}</span>
                          {isSelected && (
                            <span style={{ fontSize: "10px", background: "#4f46e5", color: "#ffffff", padding: "1px 6px", borderRadius: "4px", fontWeight: "700" }}>
                              Default
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: "11px", color: "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "340px" }}>
                          {b.path || "System Default Protocol Handler"}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
                      {isSelected ? (
                        <div style={{ width: "22px", height: "22px", borderRadius: "50%", background: "#4f46e5", display: "flex", alignItems: "center", justifyContent: "center", color: "#ffffff" }}>
                          <Check size={13} strokeWidth={3} />
                        </div>
                      ) : (
                        <span style={{ fontSize: "11.5px", fontWeight: "600", color: "#6366f1" }}>Select →</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer info note */}
        <div style={{ padding: "12px 20px", borderTop: "1px solid #f1f5f9", background: "#f8fafc", borderRadius: "0 0 16px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: "11px", color: "#64748b" }}>
            💡 <strong>Tip:</strong> Right-click the MJML Agent button anytime to change this.
          </span>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "#ffffff",
              border: "1px solid #cbd5e1",
              borderRadius: "6px",
              padding: "4px 10px",
              fontSize: "11.5px",
              fontWeight: "600",
              color: "#475569",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};