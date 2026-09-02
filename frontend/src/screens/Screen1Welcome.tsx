import React, { useState } from "react";
import { 
  Upload, 
  FolderOpen, 
  Clock, 
  ArrowRight,
  Lightbulb,
  X,
  FileText,
  Layers,
  Sparkles,
  CheckCircle2,
  SlidersHorizontal,
  ChevronRight,
  Crop
} from "lucide-react";
import { nativeIPC, MarkedRegion, FooterPreset } from "../services/ipc";
import { PdfMarkingModal } from "../components/PdfMarkingModal";

interface Screen1Props {
  onPdfSelected: (path: string, targetPage?: number, emailWidth?: number, markedRegions?: MarkedRegion[], selectedFooter?: FooterPreset | null) => void;
  onHtmlLoaded: (path: string, content: string) => void;
}

export const Screen1Welcome: React.FC<Screen1Props> = ({ onPdfSelected, onHtmlLoaded }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [loadingHtml, setLoadingHtml] = useState(false);

  // iOS Glass Modal State
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [showMarkingModal, setShowMarkingModal] = useState(false);
  const [modalPdfPath, setModalPdfPath] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [extractSinglePage, setExtractSinglePage] = useState<boolean>(false);
  const [selectedPage, setSelectedPage] = useState<number>(1);
  const [selectedEmailWidth, setSelectedEmailWidth] = useState<number>(700);
  const [modalDragging, setModalDragging] = useState(false);

  const handleOpenPdfModal = () => {
    setShowPdfModal(true);
    setModalPdfPath(null);
    setTotalPages(1);
    setExtractSinglePage(false);
    setSelectedPage(1);
    setSelectedEmailWidth(700);
  };

  const handleChoosePdfFromDisk = async () => {
    try {
      setLoadingPdf(true);
      const res = await nativeIPC.choosePdf();
      if (res.success && res.path) {
        setModalPdfPath(res.path);
        // Query total pages
        const info = await nativeIPC.getPdfInfo(res.path);
        setTotalPages(info.total_pages || 1);
        setSelectedPage(1);
        if ((info.total_pages || 1) > 1) {
          setExtractSinglePage(true);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingPdf(false);
    }
  };

  const handleConfirmExtraction = () => {
    if (!modalPdfPath) return;
    setShowPdfModal(false);
    // Open PDF Marking & Component Review Modal
    setShowMarkingModal(true);
  };

  const handleMarkingModalConfirm = (markedRegions: MarkedRegion[], selectedFooter: FooterPreset | null) => {
    if (!modalPdfPath) return;
    const targetP = extractSinglePage ? selectedPage : 1;
    setShowMarkingModal(false);
    onPdfSelected(modalPdfPath, targetP, selectedEmailWidth, markedRegions, selectedFooter);
  };


  const handleChooseHtml = async () => {
    try {
      setLoadingHtml(true);
      const res = await nativeIPC.chooseHtml();
      if (res.success && res.path && res.content) {
        onHtmlLoaded(res.path, res.content);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingHtml(false);
    }
  };

  const handleDropOnModal = async (e: React.DragEvent) => {
    e.preventDefault();
    setModalDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.name.endsWith(".pdf")) {
        setModalPdfPath(file.name);
        try {
          const info = await nativeIPC.getPdfInfo(file.name);
          setTotalPages(info.total_pages || 1);
          setSelectedPage(1);
          if ((info.total_pages || 1) > 1) {
            setExtractSinglePage(true);
          }
        } catch {
          setTotalPages(1);
        }
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.name.endsWith(".pdf")) {
        setModalPdfPath(file.name);
        setShowPdfModal(true);
        nativeIPC.getPdfInfo(file.name).then(info => {
          setTotalPages(info.total_pages || 1);
          setSelectedPage(1);
          if ((info.total_pages || 1) > 1) {
            setExtractSinglePage(true);
          }
        }).catch(() => setTotalPages(1));
      } else if (file.name.endsWith(".html") || file.name.endsWith(".htm")) {
        const reader = new FileReader();
        reader.onload = () => {
          onHtmlLoaded(file.name, reader.result as string);
        };
        reader.readAsText(file);
      }
    }
  };

  return (
    <div className="screen1-container">
      {/* Top Header Logo */}
      <header className="brand-header">
        <div className="brand-logo">
          <div className="logo-badge">N</div>
          <span className="logo-text">NoCodeMail</span>
        </div>
      </header>

      {/* Screen 1 Main Content */}
      <main className="screen1-main">
        {/* Hero Section */}
        <section className="hero-section">
          <div className="hero-content">
            <h1 className="hero-title">
              From PDF to <br />
              Production-Ready <span className="highlight-text">Email</span>
            </h1>
            <p className="hero-subtitle">
              NoCodeMail turns any email design in a PDF into clean, editable HTML.
            </p>
          </div>

          {/* Hero Illustration */}
          <div className="hero-art-container">
            {/* Left Card: PDF Document */}
            <div className="hero-floating-card pdf-doc-card">
              <div className="doc-folded-corner"></div>
              <div className="pdf-solid-badge">PDF</div>
            </div>

            {/* Connecting curve left */}
            <div className="curve-connector-left">
              <svg width="60" height="40" viewBox="0 0 60 40" fill="none">
                <path d="M5 30C25 30 35 15 55 15" stroke="#a5b4fc" strokeWidth="1.5" strokeDasharray="3 3" />
                <circle cx="5" cy="30" r="2.5" fill="#a5b4fc" />
                <polygon points="55,12 60,15 55,18" fill="#a5b4fc" />
              </svg>
            </div>

            {/* Center Card: Large Email Layout */}
            <div className="hero-floating-card center-email-card">
              <div className="email-preview-header">
                <div className="email-hero-img-box">
                  <div className="img-landscape-sun"></div>
                  <div className="img-landscape-mountains"></div>
                </div>
                <div className="email-hero-text-lines">
                  <div className="mock-line bold-line"></div>
                  <div className="mock-line medium-line"></div>
                  <div className="mock-line medium-line"></div>
                </div>
              </div>
              <div className="email-preview-body-lines">
                <div className="mock-line full-line"></div>
                <div className="mock-line full-line"></div>
                <div className="mock-line half-line"></div>
              </div>
              <div className="email-preview-footer-row">
                <div className="mock-line footer-line"></div>
                <div className="mock-cta-button"></div>
              </div>
            </div>

            {/* Connecting curve right */}
            <div className="curve-connector-right">
              <svg width="60" height="40" viewBox="0 0 60 40" fill="none">
                <path d="M5 15C25 15 35 30 55 30" stroke="#a5b4fc" strokeWidth="1.5" strokeDasharray="3 3" />
                <circle cx="5" cy="15" r="2.5" fill="#a5b4fc" />
                <polygon points="55,27 60,30 55,33" fill="#a5b4fc" />
              </svg>
            </div>

            {/* Right Card: Code Window */}
            <div className="hero-floating-card right-code-card">
              <div className="code-header-dots">
                <span className="dot purple"></span>
                <span className="dot teal"></span>
                <span className="dot blue"></span>
              </div>
              <div className="code-preview-lines">
                <div className="code-line indent-0 gray"></div>
                <div className="code-line indent-1 blue"></div>
                <div className="code-line indent-2 purple"></div>
                <div className="code-line indent-2 green"></div>
                <div className="code-line indent-1 blue"></div>
                <div className="code-line indent-0 gray"></div>
              </div>
              <div className="green-check-badge">
                <span>✓</span>
              </div>
            </div>
          </div>
        </section>

        {/* 6-Card Pipeline Section */}
        <section className="pipeline-cards-row">
          {/* Card 1 */}
          <div className="pipeline-card">
            <div className="card-top-row">
              <span className="step-circle">1</span>
              <span className="card-heading">Select PDF</span>
            </div>
            <div className="card-illustration-box">
              <div className="small-pdf-icon-card">
                <div className="mini-folded-corner"></div>
                <span className="mini-pdf-badge">PDF</span>
              </div>
            </div>
            <p className="card-desc-text">Import your email design PDF.</p>
          </div>

          <div className="pipeline-card-connector">
            <span className="connector-dot"></span>
            <span className="connector-dash"></span>
            <span className="connector-arrow">›</span>
          </div>

          {/* Card 2 */}
          <div className="pipeline-card">
            <div className="card-top-row">
              <span className="step-circle">2</span>
              <span className="card-heading">Process & Extract</span>
            </div>
            <div className="card-illustration-box">
              <div className="extract-icons-trio">
                <div className="mini-icon-box">&lt;/&gt;</div>
                <div className="mini-icon-box image-icon-box">🖼</div>
                <div className="mini-icon-box font-icon-box">T</div>
              </div>
            </div>
            <p className="card-desc-text">Extract structure, text, styles and assets.</p>
          </div>

          <div className="pipeline-card-connector">
            <span className="connector-dot"></span>
            <span className="connector-dash"></span>
            <span className="connector-arrow">›</span>
          </div>

          {/* Card 3 */}
          <div className="pipeline-card">
            <div className="card-top-row">
              <span className="step-circle">3</span>
              <span className="card-heading">Generate JSON & Assets</span>
            </div>
            <div className="card-illustration-box">
              <div className="json-assets-pair">
                <div className="mini-json-doc">{"{ }"}</div>
                <span className="pair-arrow">→</span>
                <div className="mini-folder-icon">
                  <div className="folder-tab"></div>
                  <div className="folder-body">
                    <span className="mini-photo-badge">🖼</span>
                  </div>
                </div>
              </div>
            </div>
            <p className="card-desc-text">Create JSON representation, assets folder and a preview screenshot.</p>
          </div>

          <div className="pipeline-card-connector">
            <span className="connector-dot"></span>
            <span className="connector-dash"></span>
            <span className="connector-arrow">›</span>
          </div>

          {/* Card 4 */}
          <div className="pipeline-card">
            <div className="card-top-row">
              <span className="step-circle">4</span>
              <span className="card-heading">AI → MJML</span>
            </div>
            <div className="card-illustration-box">
              <div className="ai-mjml-pair">
                <div className="mini-ai-sparkle-box">✦</div>
                <span className="pair-arrow">→</span>
                <div className="mini-mjml-badge-box">MJML</div>
              </div>
            </div>
            <p className="card-desc-text">Send JSON + screenshot to AI to generate responsive MJML.</p>
          </div>

          <div className="pipeline-card-connector">
            <span className="connector-dot"></span>
            <span className="connector-dash"></span>
            <span className="connector-arrow">›</span>
          </div>

          {/* Card 5 */}
          <div className="pipeline-card">
            <div className="card-top-row">
              <span className="step-circle">5</span>
              <span className="card-heading">MJML → HTML</span>
            </div>
            <div className="card-illustration-box">
              <div className="mjml-html-pair">
                <div className="mini-mjml-badge-box pink">MJML</div>
                <span className="pair-arrow">→</span>
                <div className="mini-html-badge-box">HTML</div>
              </div>
            </div>
            <p className="card-desc-text">Convert MJML to clean, email-safe HTML.</p>
          </div>

          <div className="pipeline-card-connector">
            <span className="connector-dot"></span>
            <span className="connector-dash"></span>
            <span className="connector-arrow">›</span>
          </div>

          {/* Card 6 */}
          <div className="pipeline-card">
            <div className="card-top-row">
              <span className="step-circle">6</span>
              <span className="card-heading">Open in Editor</span>
            </div>
            <div className="card-illustration-box">
              <div className="mini-editor-window">
                <div className="mini-win-dots">
                  <span></span><span></span><span></span>
                </div>
                <div className="mini-win-body">
                  <div className="mini-win-line"></div>
                  <div className="mini-win-btn"></div>
                </div>
              </div>
            </div>
            <p className="card-desc-text">Open the HTML in NoCodeMail to refine, preview and export.</p>
          </div>
        </section>

        {/* 2 Primary Action Cards */}
        <section className="two-action-cards-container">
          {/* Card 1: Choose PDF */}
          <div
            className={`action-picker-card ${isDragging ? "dragging" : ""}`}
            onClick={handleOpenPdfModal}
            style={{ cursor: "pointer" }}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            <div className="action-doc-icon pdf-icon-card">
              <div className="doc-folded-corner sm"></div>
              <span className="pdf-solid-badge sm">PDF</span>
            </div>
            <h3 className="picker-title">Select PDF</h3>
            <p className="picker-desc">
              Import a PDF email design and let NoCodeMail handle the rest.
            </p>
            <button 
              type="button"
              className="picker-btn primary-purple" 
              onClick={(e) => {
                e.stopPropagation();
                handleOpenPdfModal();
              }} 
              disabled={loadingPdf || loadingHtml}
            >
              <Upload size={16} />
              <span>Choose PDF File</span>
            </button>
          </div>

          <div className="picker-or-circle">OR</div>

          {/* Card 2: Open HTML */}
          <div 
            className="action-picker-card"
            onClick={handleChooseHtml}
            style={{ cursor: "pointer" }}
          >
            <div className="action-doc-icon html-icon-card">
              <div className="doc-folded-corner sm"></div>
              <span className="html-code-brackets">&lt;/&gt;</span>
            </div>
            <h3 className="picker-title">Open HTML</h3>
            <p className="picker-desc">
              Open an existing HTML file to continue editing.
            </p>
            <button 
              type="button"
              className="picker-btn primary-blue" 
              onClick={(e) => {
                e.stopPropagation();
                handleChooseHtml();
              }} 
              disabled={loadingPdf || loadingHtml}
            >
              <FolderOpen size={16} />
              <span>{loadingHtml ? "Opening..." : "Open HTML File"}</span>
            </button>
          </div>
        </section>
      </main>

      {/* Bottom Footer Bar */}
      <footer className="screen1-footer">
        <div className="footer-tip">
          <Lightbulb size={16} color="#eab308" />
          <span><strong>Tip:</strong> For best results, use high-quality PDFs with clear text and images.</span>
        </div>
        <button className="footer-recent-btn" onClick={() => {}}>
          <Clock size={15} />
          <span>View Recent Projects</span>
        </button>
      </footer>

      {/* iOS Liquid Glass PDF Import Modal */}
      {showPdfModal && (
        <div className="ios-modal-overlay" onClick={() => setShowPdfModal(false)}>
          <div 
            className="ios-glass-modal" 
            onClick={(e) => e.stopPropagation()}
            onDragOver={(e) => {
              e.preventDefault();
              setModalDragging(true);
            }}
            onDragLeave={() => setModalDragging(false)}
            onDrop={handleDropOnModal}
          >
            {/* Modal Ambient Glow Background */}
            <div className="ios-modal-glow-ambient"></div>

            {/* Header with Close */}
            <div className="ios-modal-header">
              <div className="ios-modal-title-wrap">
                <div className="ios-icon-orb">
                  <FileText size={20} className="ios-orb-icon" />
                </div>
                <div>
                  <div className="ios-title-badge-row">
                    <h3 className="ios-modal-title">Import PDF Email Design</h3>
                    <span className="ios-beta-tag">High Fidelity</span>
                  </div>
                  <p className="ios-modal-subtitle">Configure extraction options, responsive width & page filtering</p>
                </div>
              </div>
              <button className="ios-modal-close-btn" onClick={() => setShowPdfModal(false)} title="Close">
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="ios-modal-body">
              {/* Drop / Select Zone */}
              <div 
                className={`ios-dropzone ${modalDragging ? "dragging" : ""} ${modalPdfPath ? "has-file" : ""}`}
                onClick={handleChoosePdfFromDisk}
              >
                {modalPdfPath ? (
                  <div className="ios-selected-file-card">
                    <div className="ios-file-badge">
                      <FileText size={24} color="#6366f1" />
                    </div>
                    <div className="ios-file-details">
                      <span className="ios-file-name">{typeof modalPdfPath === "string" ? modalPdfPath.split(/[/\\]/).pop() || "email-design.pdf" : "email-design.pdf"}</span>
                      <div className="ios-file-meta-row">
                        <span className="ios-file-meta-tag">{totalPages} {totalPages === 1 ? "Page" : "Pages"}</span>
                        <span className="ios-file-meta-ready">Ready for AI Pipeline</span>
                      </div>
                    </div>
                    <button 
                      type="button"
                      className="ios-change-file-btn" 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleChoosePdfFromDisk();
                      }}
                    >
                      Change File
                    </button>
                  </div>
                ) : (
                  <div className="ios-empty-dropzone-content">
                    <div className="ios-upload-icon-circle">
                      <Upload size={22} />
                    </div>
                    <div className="ios-dropzone-text">
                      <span className="ios-dropzone-primary">Click to select or drag & drop your PDF</span>
                      <span className="ios-dropzone-secondary">Instant structure analysis, visual asset extraction & vector text extraction</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Target Email Container Width Selection (700px, 650px, 600px) */}
              <div className="ios-settings-card">
                <div className="ios-setting-row">
                  <div className="ios-setting-info">
                    <div className="ios-setting-title-row">
                      <span className="ios-setting-label">Target Email Container Width</span>
                    </div>
                    <span className="ios-setting-sublabel">Includes standard 20px padding ({selectedEmailWidth - 40}px content width)</span>
                  </div>
                  <div className="ios-width-pill-group">
                    {[700, 650, 600].map((w) => (
                      <button
                        key={w}
                        type="button"
                        className={`ios-width-pill ${selectedEmailWidth === w ? "active" : ""}`}
                        onClick={() => setSelectedEmailWidth(w)}
                      >
                        <span className="pill-px-val">{w}px</span>
                        {w === 700 && <span className="pill-rec-dot" title="Standard"></span>}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Page Number Selection Section */}
              <div className="ios-settings-card">
                <div className="ios-setting-row">
                  <div className="ios-setting-info">
                    <div className="ios-setting-title-row">
                      <span className="ios-setting-label">Select specific page</span>
                    </div>
                    <span className="ios-setting-sublabel">Filter extraction to a single page from multi-page PDFs</span>
                  </div>
                  {/* iOS Toggle Switch */}
                  <label className="ios-switch">
                    <input 
                      type="checkbox" 
                      checked={extractSinglePage} 
                      onChange={(e) => setExtractSinglePage(e.target.checked)} 
                    />
                    <span className="ios-switch-slider"></span>
                  </label>
                </div>

                {/* Page Selector (Shown when toggle is ON) */}
                {extractSinglePage && (
                  <div className="ios-page-selector-row">
                    <div className="ios-page-selector-label">
                      <Layers size={14} />
                      <span>Choose Page to Extract</span>
                    </div>
                    <div className="ios-page-pills">
                      {Array.from({ length: Math.min(totalPages, 12) }, (_, i) => i + 1).map((pNum) => (
                        <button
                          key={pNum}
                          type="button"
                          className={`ios-page-pill ${selectedPage === pNum ? "active" : ""}`}
                          onClick={() => setSelectedPage(pNum)}
                        >
                          Page {pNum}
                        </button>
                      ))}
                      {totalPages > 12 && (
                        <div className="ios-custom-page-input-wrap">
                          <span>Page:</span>
                          <input 
                            type="number" 
                            min={1} 
                            max={totalPages} 
                            value={selectedPage} 
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              if (!isNaN(val) && val >= 1 && val <= totalPages) {
                                setSelectedPage(val);
                              }
                            }}
                            className="ios-page-number-input"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="ios-modal-footer">
              <button className="ios-cancel-btn" onClick={() => setShowPdfModal(false)}>
                Cancel
              </button>
              <button 
                className="ios-continue-btn" 
                disabled={!modalPdfPath}
                onClick={handleConfirmExtraction}
              >
                <span>Review & Mark PDF</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF Marking & Component Review Modal */}
      {showMarkingModal && modalPdfPath && (
        <PdfMarkingModal
          pdfPath={modalPdfPath}
          targetPage={extractSinglePage ? selectedPage : 1}
          emailWidth={selectedEmailWidth}
          onClose={() => setShowMarkingModal(false)}
          onConfirm={handleMarkingModalConfirm}
        />
      )}
    </div>
  );
};
