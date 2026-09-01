import React, { useState, useEffect } from "react";
import mjml2html from "mjml-browser";
import { 
  ArrowLeft, 
  Check, 
  Copy, 
  FileText, 
  Image as ImageIcon, 
  Link2, 
  Table, 
  Palette, 
  Eye, 
  ExternalLink,
  Sparkles,
  RotateCw,
  Crop
} from "lucide-react";
import { nativeIPC, PDFExtractionData, MarkedRegion } from "../services/ipc";

interface Screen2Props {
  pdfPath: string;
  targetPage?: number;
  emailWidth?: number;
  markedRegions?: MarkedRegion[];
  onBackToHome: () => void;
  onOpenEditor: (htmlContent: string, fileName: string) => void;
}

export const Screen2Process: React.FC<Screen2Props> = ({ 
  pdfPath, 
  targetPage, 
  emailWidth = 700, 
  markedRegions = [], 
  onBackToHome, 
  onOpenEditor 
}) => {
  const [extracting, setExtracting] = useState(true);
  const [extractProgress, setExtractProgress] = useState(75);
  const [extractData, setExtractData] = useState<PDFExtractionData | null>(null);

  // MJML state: Starts empty waiting for AI / user pasted MJML
  const [mjmlText, setMjmlText] = useState("");
  const [generatedHtml, setGeneratedHtml] = useState("");
  const [charCount, setCharCount] = useState(0);
  // Modals state
  const [showJsonModal, setShowJsonModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [showAssetsModal, setShowAssetsModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const fileName = typeof pdfPath === "string" ? pdfPath.split(/[/\\]/).pop() || "email-design.pdf" : "email-design.pdf";
  const baseName = fileName.replace(/\.[^/.]+$/, "");

  // Auto-run native extraction on mount
  useEffect(() => {
    const runExtraction = async () => {
      try {
        setExtractProgress(75);
        const data = await nativeIPC.extractPdf(pdfPath, emailWidth, targetPage, markedRegions);
        setExtractData(data);
        setExtractProgress(100);
        setExtracting(false);
      } catch (e) {
        console.error("PDF Extraction error:", e);
        setExtracting(false);
      }
    };
    runExtraction();
  }, [pdfPath, targetPage, emailWidth, markedRegions]);

  const handleConvertMjml = async (codeToCompile?: string) => {
    const text = codeToCompile !== undefined ? codeToCompile : mjmlText;
    if (!text.trim()) {
      setGeneratedHtml("");
      setCharCount(0);
      return;
    }
    try {
      // 1. Compile using official MJML engine
      const result = await mjml2html(text, {
        keepComments: false,
        minify: false,
        validationLevel: "soft",
      });

      const compiledHtml = result.html || "";
      if (compiledHtml) {
        setGeneratedHtml(compiledHtml);
        setCharCount(compiledHtml.length);

        // 2. Save production HTML to disk in the AI package folder
        if (extractData?.package_dir) {
          const savePath = `${extractData.package_dir}\\${baseName}.html`;
          await nativeIPC.saveFile(savePath, compiledHtml);
        }
      }
    } catch (e) {
      console.error("MJML compile error:", e);
    }
  };

  const handleOpenInEditor = () => {
    const fullHtmlPath = extractData?.package_dir
      ? `${extractData.package_dir}\\${baseName}.html`
      : `${baseName}.html`;
    if (extractData?.package_dir) {
      localStorage.setItem("nocodemail_last_pkg_dir", extractData.package_dir);
    }
    onOpenEditor(generatedHtml, fullHtmlPath);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="screen2-container">
      {/* Top Header */}
      <header className="screen2-header">
        <div className="header-left">
          <div className="brand-logo">
            <div className="logo-badge">N</div>
            <span className="logo-text">NoCodeMail</span>
          </div>
          <div className="header-breadcrumb-divider"></div>
          <div className="header-breadcrumb">
            <span className="breadcrumb-title">PDF Import & Processing</span>
            <span className="breadcrumb-pill">{fileName}</span>
          </div>
        </div>
        <button className="back-home-btn" onClick={onBackToHome}>
          <ArrowLeft size={15} />
          <span>Back to Home</span>
        </button>
      </header>

      {/* Main Content Area */}
      <main className="screen2-main-content">
        {/* Step Progress Top Banner */}
        <section className="progress-top-banner">
          <div className="banner-text-row">
            <div className="banner-title-col">
              <h2>Processing your PDF</h2>
              <p>We are analyzing your email design and preparing everything for AI conversion.</p>
            </div>
            <div className="overall-progress-box">
              <div className="progress-label-row">
                <span>Overall Progress</span>
                <span className="progress-percentage">{extracting ? "75%" : "100%"}</span>
              </div>
              <div className="progress-bar-bg">
                <div className="progress-bar-fill" style={{ width: extracting ? "75%" : "100%" }}></div>
              </div>
            </div>
          </div>

          <div className="steps-tracker-grid">
            {/* Step 1 */}
            <div className="step-card completed">
              <div className="step-card-status-col">
                <div className="step-circle-badge success">
                  <Check size={14} strokeWidth={3} />
                </div>
              </div>
              <div className="step-card-info">
                <h4>1. PDF Imported</h4>
                <p>{fileName}</p>
                <span className="status-badge success">
                  <span className="badge-dot"></span>
                  Completed
                </span>
              </div>
            </div>

            <div className="step-arrow-divider">
              <svg width="24" height="12" viewBox="0 0 24 12" fill="none">
                <path d="M0 6H20M20 6L15 1M20 6L15 11" stroke="#6366f1" strokeWidth="1.5" strokeDasharray="3 3" />
              </svg>
            </div>

            {/* Step 2 */}
            <div className={`step-card ${extracting ? "in-progress" : "completed"}`}>
              <div className="step-card-status-col">
                {extracting ? (
                  <div className="step-circle-badge in-progress-spinner">
                    <div className="spinner-dots-ring"></div>
                  </div>
                ) : (
                  <div className="step-circle-badge success">
                    <Check size={14} strokeWidth={3} />
                  </div>
                )}
              </div>
              <div className="step-card-info">
                <h4>2. Process & Extract</h4>
                <p>{extracting ? "Extracting structure, text, styles and assets..." : "Extracted structure, text, styles and visual assets."}</p>
                {extracting ? (
                  <div className="sub-progress-wrapper">
                    <span className="sub-progress-text">{extractProgress}%</span>
                    <div className="sub-progress-bar">
                      <div className="sub-progress-fill" style={{ width: `${extractProgress}%` }}></div>
                    </div>
                  </div>
                ) : (
                  <span className="status-badge success">
                    <span className="badge-dot"></span>
                    Completed
                  </span>
                )}
              </div>
            </div>

            <div className="step-arrow-divider">
              <svg width="24" height="12" viewBox="0 0 24 12" fill="none">
                <path d="M0 6H20M20 6L15 1M20 6L15 11" stroke="#a5b4fc" strokeWidth="1.5" strokeDasharray="3 3" />
              </svg>
            </div>

            {/* Step 3 */}
            <div className={`step-card ${extracting ? "pending" : "completed"}`}>
              <div className="step-card-status-col">
                {extracting ? (
                  <div className="step-circle-badge pending-dots">
                    <div className="dots-ring"></div>
                  </div>
                ) : (
                  <div className="step-circle-badge success">
                    <Check size={14} strokeWidth={3} />
                  </div>
                )}
              </div>
              <div className="step-card-info">
                <h4>3. Generate JSON & Assets</h4>
                <p>{extracting ? "Creating JSON file and organizing assets..." : `Created design JSON and extracted ${extractData?.total_images || 0} visual assets.`}</p>
                <span className={`status-badge ${extracting ? "pending" : "success"}`}>
                  <span className="badge-dot"></span>
                  {extracting ? "Pending" : "Completed"}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Dashboard 5-Card Grid */}
        <section className="dashboard-grid">
          {/* 1. PDF Document Preview (Original PDF Document View) */}
          <div className="dash-card">
            <div className="dash-card-header">
              <h3>PDF Preview</h3>
              <span style={{ fontSize: "10px", color: "#64748b", fontWeight: "600" }}>Original Doc</span>
            </div>
            <div className="dash-card-body preview-body" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden", padding: "6px", background: "#f8fafc" }}>
              {extractData?.preview_image_path ? (
                <div 
                  style={{ width: "100%", height: "140px", borderRadius: "6px", overflow: "hidden", border: "1px solid #e2e8f0", background: "#ffffff", display: "flex", alignItems: "flex-start", justifyContent: "center", cursor: "pointer" }} 
                  onClick={() => setShowPdfModal(true)}
                  title="Click to view original PDF page"
                >
                  <img 
                    src={`/pkg/${encodeURIComponent(extractData.preview_image_path)}`} 
                    alt="Original PDF Document" 
                    style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center" }}
                  />
                </div>
              ) : (
                <div style={{ width: "100%", height: "140px", borderRadius: "6px", border: "1px dashed #cbd5e1", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", fontSize: "12px" }}>
                  Loading PDF page...
                </div>
              )}
              <div className="page-counter-pill" onClick={() => setShowPdfModal(true)} style={{ cursor: "pointer" }}>
                {targetPage ? `Page ${targetPage} of ${extractData?.total_pages || 1}` : `Page 1 of ${extractData?.total_pages || 1}`}
              </div>
            </div>
          </div>

          {/* 2. Extracted Information */}
          <div className="dash-card">
            <div className="dash-card-header">
              <h3>Extracted Information</h3>
            </div>
            <div className="dash-card-body stats-body">
              <div className="stat-row">
                <div className="stat-name">
                  <span className="stat-icon-wrap blue"><FileText size={14} /></span>
                  <span>Text Blocks</span>
                </div>
                <div className="stat-val">{extractData?.total_text_blocks !== undefined ? extractData.total_text_blocks : (extracting ? "..." : 0)}</div>
              </div>
              <div className="stat-row">
                <div className="stat-name">
                  <span className="stat-icon-wrap blue"><ImageIcon size={14} /></span>
                  <span>Images</span>
                </div>
                <div className="stat-val">{extractData?.total_images !== undefined ? extractData.total_images : (extracting ? "..." : 0)}</div>
              </div>
              <div className="stat-row">
                <div className="stat-name">
                  <span className="stat-icon-wrap blue"><Link2 size={14} /></span>
                  <span>Links</span>
                </div>
                <div className="stat-val">{extractData?.total_links !== undefined ? extractData.total_links : (extracting ? "..." : 0)}</div>
              </div>
              <div className="stat-row">
                <div className="stat-name">
                  <span className="stat-icon-wrap blue"><Table size={14} /></span>
                  <span>Tables</span>
                </div>
                <div className="stat-val">{extractData?.total_tables !== undefined ? extractData.total_tables : (extracting ? "..." : 0)}</div>
              </div>
              <div className="stat-row">
                <div className="stat-name">
                  <span className="stat-icon-wrap blue"><Palette size={14} /></span>
                  <span>Styles</span>
                </div>
                <div className="stat-val">{extractData?.total_styles !== undefined ? extractData.total_styles : (extracting ? "..." : 0)}</div>
              </div>
            </div>
          </div>

          {/* 3. Assets Grid */}
          <div className="dash-card">
            <div className="dash-card-header">
              <h3>Assets ({extractData?.total_images !== undefined ? extractData.total_images : (extracting ? "..." : 0)})</h3>
              <button className="view-all-link" onClick={() => setShowAssetsModal(true)}>View all</button>
            </div>
            <div className="dash-card-body assets-body">
              <div className="assets-grid-thumb">
                {extractData?.package_dir && extractData.total_images > 0 ? (
                  Array.from({ length: Math.min(extractData.total_images, 5) }).map((_, i) => (
                    <div 
                      key={i} 
                      className="asset-photo-box" 
                      style={{ overflow: "hidden", background: "#f8fafc", border: "1px solid #e2e8f0", cursor: "pointer", padding: "2px" }}
                      onClick={() => setShowAssetsModal(true)}
                      title={`View Asset ${i + 1}`}
                    >
                      <img 
                        src={`/pkg/${encodeURIComponent(`${extractData.package_dir}\\assets\\asset_p${targetPage || 1}_${i + 1}.png`)}`} 
                        alt={`Asset ${i + 1}`}
                        style={{ width: "100%", height: "100%", objectFit: "contain" }}
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = "none";
                        }}
                      />
                    </div>
                  ))
                ) : (
                  <>
                    <div className="asset-photo-box dress-mock"><div className="photo-dress-art"></div></div>
                    <div className="asset-photo-box bag-mock"><div className="photo-bag-art"></div></div>
                    <div className="asset-photo-box plant-mock"><div className="photo-plant-art"></div></div>
                    <div className="asset-photo-box shoes-mock"><div className="photo-shoes-art"></div></div>
                    <div className="asset-photo-box purse-mock"><div className="photo-purse-art"></div></div>
                  </>
                )}
                <div className="asset-photo-box more-badge-box" onClick={() => setShowAssetsModal(true)} style={{ cursor: "pointer" }}>
                  <span>+{Math.max(0, (extractData?.total_images || 0) - 5)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 4. JSON Output */}
          <div className="dash-card">
            <div className="dash-card-header">
              <h3>JSON Output</h3>
            </div>
            <div className="dash-card-body json-body">
              <pre className="json-code-snippet">
                {extractData?.design_json ? (
                  extractData.design_json.slice(0, 320) + "\n..."
                ) : (
`{
  "document_name": "${fileName}",
  "total_pages": 1,
  "status": "extracted"
}`
                )}
              </pre>
              <button className="preview-json-btn" onClick={() => setShowJsonModal(true)}>
                <Eye size={13} />
                <span>Preview JSON</span>
              </button>
            </div>
          </div>

          {/* 5. Screenshot (Preview) */}
          <div className="dash-card">
            <div className="dash-card-header">
              <h3>Screenshot (Preview)</h3>
            </div>
            <div className="dash-card-body screenshot-body" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "6px 10px 8px", background: "#f8fafc" }}>
              {extractData?.preview_image_path ? (
                <div 
                  style={{ width: "100%", height: "105px", borderRadius: "6px", overflow: "hidden", border: "1px solid #e2e8f0", background: "#ffffff", display: "flex", alignItems: "flex-start", justifyContent: "center", cursor: "pointer" }} 
                  onClick={() => setShowPreviewModal(true)}
                  title="Click to view full size"
                >
                  <img 
                    src={`/pkg/${encodeURIComponent(extractData.preview_image_path)}`} 
                    alt="Page Snapshot" 
                    style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center" }}
                  />
                </div>
              ) : (
                <div style={{ width: "100%", height: "105px", borderRadius: "6px", border: "1px dashed #cbd5e1", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", fontSize: "12px" }}>
                  Snapshot ready
                </div>
              )}
              <button className="view-fullsize-btn" onClick={() => setShowPreviewModal(true)} style={{ marginTop: "6px", width: "100%", justifyContent: "center" }}>
                <span>View Full Size</span>
                <ExternalLink size={13} />
              </button>
            </div>
          </div>
        </section>

        {/* Central Down Arrow Circle */}
        <div className="section-down-arrow-container">
          <div className="purple-down-circle">↓</div>
        </div>

        {/* Bottom MJML -> HTML Section (1:1 with Screen2.png) */}
        <section className="mjml-html-section">
          <div className="mjml-section-header">
            <div>
              <h3>MJML → HTML Conversion</h3>
              <p>Paste the MJML generated by AI to convert it into clean, responsive HTML.</p>
            </div>
            <button className="open-in-editor-btn-main" onClick={handleOpenInEditor} disabled={!generatedHtml}>
              <Sparkles size={16} />
              <span>Open in Editor</span>
              <ExternalLink size={14} />
            </button>
          </div>

          <div className="mjml-split-grid">
            {/* Left: Paste MJML */}
            <div className="code-pane">
              <div className="pane-top-bar">
                <div className="pane-title">
                  <span className="pane-step-circle">1.</span>
                  <strong>Paste MJML</strong>
                </div>
                <div className="pane-actions">
                  <button className="pane-btn" onClick={() => {}}>
                    <span>⊞ Format</span>
                  </button>
                  <button className="pane-btn" onClick={() => setMjmlText("")}>
                    <span>✦ Clear</span>
                  </button>
                </div>
              </div>
              <div className="code-editor-area">
                <div className="line-numbers">
                  {Array.from({ length: 22 }, (_, i) => (
                    <div key={i}>{i + 1}</div>
                  ))}
                </div>
                <textarea
                  className="code-textarea"
                  value={mjmlText}
                  placeholder="Paste your AI-generated MJML markup here..."
                  onChange={(e) => {
                    const val = e.target.value;
                    setMjmlText(val);
                    handleConvertMjml(val);
                  }}
                  spellCheck={false}
                />
              </div>
              <div className="pane-bottom-bar">
                <span className="valid-pill">
                  <Check size={12} strokeWidth={3} />
                  <span>MJML is valid</span>
                </span>
              </div>
            </div>

            {/* Center Convert Arrow */}
            <div className="center-convert-col">
              <button className="convert-arrow-circle" onClick={() => handleConvertMjml()} title="Convert MJML to HTML">
                →
              </button>
            </div>

            {/* Right: Generated HTML */}
            <div className="code-pane">
              <div className="pane-top-bar">
                <div className="pane-title">
                  <span className="pane-step-circle">2.</span>
                  <strong>Generated HTML</strong>
                </div>
                <div className="pane-actions">
                  <button className="pane-btn" onClick={() => copyToClipboard(generatedHtml)}>
                    <Copy size={12} />
                    <span>{copied ? "Copied!" : "Copy"}</span>
                  </button>
                </div>
              </div>
              <div className="code-editor-area">
                <div className="line-numbers">
                  {Array.from({ length: 26 }, (_, i) => (
                    <div key={i}>{i + 1}</div>
                  ))}
                </div>
                <pre className="html-preview-code">
                  <code>{generatedHtml}</code>
                </pre>
              </div>
              <div className="pane-bottom-bar space-between">
                <span className="valid-pill">
                  <Check size={12} strokeWidth={3} />
                  <span>HTML generated successfully</span>
                </span>
                <span className="char-count">Characters: {charCount.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Assets Gallery Modal */}
      {showAssetsModal && (
        <div className="modal-backdrop" onClick={() => setShowAssetsModal(false)}>
          <div className="modal-window" style={{ width: "860px", maxWidth: "92vw", maxHeight: "88vh" }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Extracted Visual Assets ({extractData?.total_images || 0}) — {fileName}</h3>
              <button className="close-btn" onClick={() => setShowAssetsModal(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ padding: "24px", background: "#f8fafc", overflowY: "auto", maxHeight: "calc(88vh - 70px)" }}>
              {extractData?.package_dir && extractData.total_images > 0 ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "16px" }}>
                  {Array.from({ length: extractData.total_images }).map((_, i) => {
                    const imgUrl = `/pkg/${encodeURIComponent(`${extractData.package_dir}\\assets\\asset_p${targetPage || 1}_${i + 1}.png`)}`;
                    return (
                      <div 
                        key={i} 
                        style={{ 
                          background: "#ffffff", 
                          border: "1px solid #e2e8f0", 
                          borderRadius: "12px", 
                          padding: "10px", 
                          display: "flex", 
                          flexDirection: "column", 
                          alignItems: "center", 
                          gap: "8px",
                          boxShadow: "0 2px 6px rgba(0,0,0,0.04)" 
                        }}
                      >
                        <div style={{ width: "100%", height: "120px", display: "flex", alignItems: "center", justifyContent: "center", background: "#f1f5f9", borderRadius: "8px", overflow: "hidden" }}>
                          <img 
                            src={imgUrl} 
                            alt={`Asset ${i + 1}`} 
                            style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                            onError={(e) => {
                              (e.target as HTMLElement).style.opacity = "0.3";
                            }}
                          />
                        </div>
                        <div style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px", color: "#64748b" }}>
                          <span style={{ fontWeight: "700", color: "#0f172a" }}>asset_p{targetPage || 1}_{i + 1}.png</span>
                          <a 
                            href={imgUrl} 
                            target="_blank" 
                            rel="noreferrer" 
                            style={{ color: "#4f46e5", fontWeight: "600", textDecoration: "none", display: "flex", alignItems: "center", gap: "2px" }}
                          >
                            Open ↗
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
                  No individual visual assets found in this page.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* JSON Output Modal */}
      {showJsonModal && (
        <div className="modal-backdrop" onClick={() => setShowJsonModal(false)}>
          <div className="modal-window" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Extracted Design JSON</h3>
              <button className="close-btn" onClick={() => setShowJsonModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <pre className="full-json-pre">{typeof extractData?.design_json === 'string' ? extractData.design_json : JSON.stringify(extractData?.design_json, null, 2)}</pre>
            </div>
          </div>
        </div>
      )}

      {/* Original PDF Document Viewer Modal */}
      {showPdfModal && (
        <div className="modal-backdrop" onClick={() => setShowPdfModal(false)}>
          <div 
            className="modal-window" 
            style={{ 
              width: "880px", 
              maxWidth: "94vw", 
              height: "88vh", 
              display: "flex", 
              flexDirection: "column",
              overflow: "hidden" 
            }} 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <h3>Original PDF Document</h3>
                <span style={{ fontSize: "12px", background: "rgba(16, 185, 129, 0.1)", color: "#059669", padding: "2px 8px", borderRadius: "6px", fontWeight: "700" }}>
                  {fileName}
                </span>
                <span style={{ fontSize: "11.5px", background: "#f1f5f9", color: "#475569", padding: "2px 8px", borderRadius: "6px", fontWeight: "600" }}>
                  Page {targetPage || 1} of {extractData?.total_pages || 1}
                </span>
              </div>
              <button className="close-btn" onClick={() => setShowPdfModal(false)}>✕</button>
            </div>
            <div 
              className="modal-body" 
              style={{ 
                flex: "1 1 auto", 
                minHeight: 0,
                maxHeight: "calc(88vh - 65px)",
                overflowY: "scroll", 
                overflowX: "hidden", 
                background: "#475569", 
                padding: "24px", 
                display: "flex", 
                justifyContent: "center",
                alignItems: "flex-start"
              }}
            >
              {extractData?.preview_image_path ? (
                <div style={{ width: "100%", maxWidth: "700px", background: "#ffffff", borderRadius: "8px", overflow: "hidden", boxShadow: "0 20px 50px rgba(0,0,0,0.3)" }}>
                  <img 
                    src={`/pkg/${encodeURIComponent(extractData.preview_image_path)}`} 
                    alt="Original PDF Document" 
                    style={{ width: "100%", height: "auto", display: "block" }}
                  />
                </div>
              ) : (
                <div style={{ color: "#ffffff", textAlign: "center", padding: "40px" }}>
                  Loading document page...
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Screenshot Full Size Modal */}
      {showPreviewModal && (
        <div className="modal-backdrop" onClick={() => setShowPreviewModal(false)}>
          <div 
            className="modal-window" 
            style={{ 
              width: "880px", 
              maxWidth: "94vw", 
              height: "88vh", 
              display: "flex", 
              flexDirection: "column",
              overflow: "hidden" 
            }} 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <h3>Email Snapshot Preview</h3>
                <span style={{ fontSize: "12px", background: "rgba(99, 102, 241, 0.1)", color: "#4f46e5", padding: "2px 8px", borderRadius: "6px", fontWeight: "700" }}>
                  {fileName}
                </span>
                <span style={{ fontSize: "11.5px", background: "#f1f5f9", color: "#475569", padding: "2px 8px", borderRadius: "6px", fontWeight: "600" }}>
                  Page {targetPage || 1} • {emailWidth || 700}px
                </span>
              </div>
              <button className="close-btn" onClick={() => setShowPreviewModal(false)}>✕</button>
            </div>
            <div 
              className="modal-body" 
              style={{ 
                flex: "1 1 auto", 
                minHeight: 0,
                maxHeight: "calc(88vh - 65px)",
                overflowY: "scroll", 
                overflowX: "hidden", 
                background: "#1e293b", 
                padding: "24px", 
                display: "flex", 
                justifyContent: "center",
                alignItems: "flex-start"
              }}
            >
              {extractData?.preview_image_path ? (
                <div style={{ width: "100%", maxWidth: "700px", background: "#ffffff", borderRadius: "12px", overflow: "hidden", boxShadow: "0 25px 60px -12px rgba(0,0,0,0.5)" }}>
                  <img 
                    src={`/pkg/${encodeURIComponent(extractData.preview_image_path)}`} 
                    alt="High-Res Email Snapshot" 
                    style={{ width: "100%", height: "auto", display: "block" }}
                  />
                </div>
              ) : (
                <div style={{ color: "#94a3b8", textAlign: "center", padding: "40px" }}>
                  Generating snapshot preview...
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
