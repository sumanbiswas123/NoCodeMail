import React, { useState, useEffect, useMemo } from "react";
import { 
  ArrowLeft, 
  ArrowRight,
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
  Crop,
  FolderOpen
} from "lucide-react";
import { nativeIPC, PDFExtractionData, MarkedRegion, FooterPreset } from "../services/ipc";
import { BrowserSelectModal } from "../components/BrowserSelectModal";

// Lazy-loader for heavy 1.2MB MJML browser bundle (keeps initial boot under 60KB)
let mjmlCompilerPromise: Promise<any> | null = null;
const getMjmlCompiler = () => {
  if (!mjmlCompilerPromise) {
    mjmlCompilerPromise = import("mjml-browser").then((m) => m.default || m);
  }
  return mjmlCompilerPromise;
};

interface Screen2Props {
  pdfPath: string;
  targetPage?: number;
  emailWidth?: number;
  markedRegions?: MarkedRegion[];
  selectedFooter?: FooterPreset | null;
  initialExtractData?: PDFExtractionData | null;
  initialMjmlText?: string;
  initialGeneratedHtml?: string;
  onSaveProcessState?: (data: PDFExtractionData | null, mjml: string, html: string) => void;
  onBackToHome: () => void;
  onOpenEditor: (htmlContent: string, fileName: string) => void;
}

export const Screen2Process: React.FC<Screen2Props> = ({ 
  pdfPath, 
  targetPage, 
  emailWidth = 700, 
  markedRegions = [], 
  selectedFooter = null,
  initialExtractData = null,
  initialMjmlText = "",
  initialGeneratedHtml = "",
  onSaveProcessState,
  onBackToHome, 
  onOpenEditor 
}) => {
  const [extracting, setExtracting] = useState(!initialExtractData);
  const [extractProgress, setExtractProgress] = useState(initialExtractData ? 100 : 75);
  const [extractData, setExtractData] = useState<PDFExtractionData | null>(initialExtractData || null);

  // MJML state: Preserves previous user / AI pasted MJML & compiled HTML
  const [mjmlText, setMjmlText] = useState(initialMjmlText || "");
  const [generatedHtml, setGeneratedHtml] = useState(initialGeneratedHtml || "");
  const [charCount, setCharCount] = useState(initialGeneratedHtml ? initialGeneratedHtml.length : 0);
  // Modals state
  const [showJsonModal, setShowJsonModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [showAssetsModal, setShowAssetsModal] = useState(false);
  const [showBrowserModal, setShowBrowserModal] = useState(false);
  const [showCompileConfirmModal, setShowCompileConfirmModal] = useState(false);
  const [existingHtmlOnDisk, setExistingHtmlOnDisk] = useState<string | null>(null);
  const [hasExistingHtml, setHasExistingHtml] = useState<boolean>(false);
  const [copied, setCopied] = useState(false);

  const fileName = typeof pdfPath === "string" ? pdfPath.split(/[/\\]/).pop() || "email-design.pdf" : "email-design.pdf";
  const baseName = fileName.replace(/\.[^/.]+$/, "");

  // Detect if an existing HTML file is already present on disk in this project
  useEffect(() => {
    const checkHtmlOnDisk = async () => {
      if (!extractData?.package_dir) return;
      const htmlFile = `${extractData.package_dir}\\${baseName}.html`;
      const res = await nativeIPC.readFile(htmlFile);
      if (res.success && res.content && res.content.trim().length > 0) {
        setExistingHtmlOnDisk(res.content);
        setHasExistingHtml(true);
        // If generatedHtml is currently empty, load the saved HTML into preview
        if (!generatedHtml) {
          setGeneratedHtml(res.content);
          setCharCount(res.content.length);
        }
      } else {
        setExistingHtmlOnDisk(null);
        setHasExistingHtml(false);
      }
    };
    checkHtmlOnDisk();
  }, [extractData?.package_dir, baseName]);

  const handleOpenMjmlAgent = () => {
    const savedBrowser = localStorage.getItem("nocodemail_agent_browser");
    if (!savedBrowser) {
      setShowBrowserModal(true);
    } else {
      const url = import.meta.env.VITE_MJML_AGENT_URL || "";
      if (url) {
        nativeIPC.openInBrowser({ url, browser_path: savedBrowser });
      }
    }
  };

  const handleMjmlAgentContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowBrowserModal(true);
  };

  const handleSelectAgentBrowser = (browserPath: string) => {
    localStorage.setItem("nocodemail_agent_browser", browserPath);
    setShowBrowserModal(false);
    const url = import.meta.env.VITE_MJML_AGENT_URL || "";
    if (url) {
      nativeIPC.openInBrowser({ url, browser_path: browserPath });
    }
  };

  const handleOpenFileSource = async () => {
    if (extractData?.package_dir) {
      await nativeIPC.openFolder(extractData.package_dir);
    }
  };

  // Notify parent of state changes to keep cache warm
  useEffect(() => {
    if (onSaveProcessState) {
      onSaveProcessState(extractData, mjmlText, generatedHtml);
    }
  }, [extractData, mjmlText, generatedHtml, onSaveProcessState]);

  // Auto-run native extraction on mount only if not already cached
  useEffect(() => {
    if (initialExtractData) {
      setExtractData(initialExtractData);
      setExtracting(false);
      setExtractProgress(100);
      return;
    }

    const runExtraction = async () => {
      try {
        setExtractProgress(75);
        setExtracting(true);
        const data = await nativeIPC.extractPdf(pdfPath, emailWidth, targetPage, markedRegions);
        setExtractData(data);
        if (data?.package_dir) {
          // 1. Save metadata file to disk inside the project package
          try {
            const projectMeta = {
              name: fileName,
              pdf_path: pdfPath,
              target_page: targetPage || 1,
              email_width: emailWidth || 700,
              total_pages: data.total_pages || 1,
              package_dir: data.package_dir,
              timestamp: Date.now(),
              updated_at: new Date().toISOString()
            };
            await nativeIPC.saveFile(`${data.package_dir}\\project_meta.json`, JSON.stringify(projectMeta, null, 2));
          } catch (metaErr) {
            console.warn("Failed to save project_meta.json:", metaErr);
          }

          if (selectedFooter?.code) {
            const footerSavePathTxt = `${data.package_dir}\\footer_preset.html.txt`;
            await nativeIPC.saveFile(footerSavePathTxt, selectedFooter.code);
          }

          // 2. Persist in project history (localStorage)
          try {
            const raw = localStorage.getItem("nocodemail_recent_projects");
            if (raw) {
              const list = JSON.parse(raw);
              if (Array.isArray(list)) {
                let found = false;
                for (const item of list) {
                  if (item.path === pdfPath) {
                    item.package_dir = data.package_dir;
                    item.target_page = targetPage || 1;
                    item.email_width = emailWidth || 700;
                    found = true;
                  }
                }
                if (!found) {
                  list.unshift({
                    id: `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                    name: fileName,
                    path: pdfPath,
                    type: "pdf",
                    timestamp: Date.now(),
                    package_dir: data.package_dir,
                    target_page: targetPage || 1,
                    email_width: emailWidth || 700,
                  });
                }
                localStorage.setItem("nocodemail_recent_projects", JSON.stringify(list));
              }
            }
          } catch {}
        }
        setExtractProgress(100);
        setExtracting(false);
      } catch (e) {
        console.error("PDF Extraction error:", e);
        setExtracting(false);
      }
    };
    runExtraction();
  }, [pdfPath, targetPage, emailWidth, markedRegions, selectedFooter, initialExtractData]);

  // Dynamically resolve list of all extracted assets from design_json (supports marked regions asset_pX_mark_Y.png and standard assets)
  const extractedAssetList = useMemo<{ name: string; fullPath: string; url: string }[]>(() => {
    if (!extractData?.package_dir) return [];
    const list: { name: string; fullPath: string; url: string }[] = [];
    const seenNames = new Set<string>();

    if (extractData.design_json) {
      try {
        const parsed = typeof extractData.design_json === "string" 
          ? JSON.parse(extractData.design_json) 
          : extractData.design_json;
        if (parsed && Array.isArray(parsed.pages)) {
          for (const page of parsed.pages) {
            if (Array.isArray(page.elements)) {
              for (const el of page.elements) {
                if (el.type === "image" && el.asset_path) {
                  const rawPath = String(el.asset_path);
                  const cleanName = rawPath.replace(/^[\\/]?assets[\\/]/, "").split(/[/\\]/).pop() || rawPath;
                  if (cleanName && !seenNames.has(cleanName)) {
                    seenNames.add(cleanName);
                    const fullPath = `${extractData.package_dir}\\assets\\${cleanName}`;
                    list.push({
                      name: cleanName,
                      fullPath,
                      url: `/pkg/${encodeURIComponent(fullPath)}`,
                    });
                  }
                }
              }
            }
          }
        }
      } catch (e) {
        console.warn("Could not parse design_json for asset list:", e);
      }
    }

    // Fallback if no assets found from design_json but total_images > 0
    if (list.length === 0 && extractData.total_images > 0) {
      for (let i = 1; i <= extractData.total_images; i++) {
        const name = `asset_p${targetPage || 1}_${i}.png`;
        const fullPath = `${extractData.package_dir}\\assets\\${name}`;
        list.push({
          name,
          fullPath,
          url: `/pkg/${encodeURIComponent(fullPath)}`,
        });
      }
    }

    return list;
  }, [extractData?.package_dir, extractData?.design_json, extractData?.total_images, targetPage]);


  const handleConvertMjml = async (codeToCompile?: string) => {
    const text = codeToCompile !== undefined ? codeToCompile : mjmlText;
    if (!text.trim()) {
      setGeneratedHtml("");
      setCharCount(0);
      return;
    }
    try {
      // 1. Compile using dynamically imported official MJML engine
      const mjml2html = await getMjmlCompiler();
      const result = await mjml2html(text, {
        keepComments: false,
        minify: false,
        validationLevel: "soft",
      });

      const compiledHtml = result.html || "";
      if (compiledHtml) {
        setGeneratedHtml(compiledHtml);
        setCharCount(compiledHtml.length);

        // 2. Save MJML source so it's persisted; only auto-write HTML if no previous HTML existed
        if (extractData?.package_dir) {
          const savePathMjml = `${extractData.package_dir}\\${baseName}.mjml`;
          await nativeIPC.saveFile(savePathMjml, text);

          if (!hasExistingHtml) {
            const savePathHtml = `${extractData.package_dir}\\${baseName}.html`;
            await nativeIPC.saveFile(savePathHtml, compiledHtml);
          }
        }
      }
    } catch (e) {
      console.error("MJML compile error:", e);
    }
  };

  // 1. User clicks "Update previous HTML" -> directly opens saved HTML in editor without confirmation
  const handleOpenPreviousHtml = () => {
    const contentToOpen = existingHtmlOnDisk || generatedHtml;
    const fullHtmlPath = extractData?.package_dir
      ? `${extractData.package_dir}\\${baseName}.html`
      : `${baseName}.html`;
    if (extractData?.package_dir) {
      localStorage.setItem("nocodemail_last_pkg_dir", extractData.package_dir);
    }
    onOpenEditor(contentToOpen, fullHtmlPath);
  };

  // 2. User confirms compiling latest MJML into fresh HTML and updating disk file
  const handleConfirmCompileNewHtml = async () => {
    setShowCompileConfirmModal(false);
    let htmlToSave = generatedHtml;
    if (!htmlToSave && mjmlText.trim()) {
      try {
        const mjml2html = await getMjmlCompiler();
        const result = await mjml2html(mjmlText, {
          keepComments: false,
          minify: false,
          validationLevel: "soft",
        });
        htmlToSave = result.html || "";
        setGeneratedHtml(htmlToSave);
      } catch (e) {
        console.error("Compile error on update:", e);
      }
    }

    if (extractData?.package_dir && htmlToSave) {
      const savePathHtml = `${extractData.package_dir}\\${baseName}.html`;
      const savePathMjml = `${extractData.package_dir}\\${baseName}.mjml`;
      const savePathMeta = `${extractData.package_dir}\\project_meta.json`;
      await nativeIPC.saveFile(savePathHtml, htmlToSave);
      await nativeIPC.saveFile(savePathMjml, mjmlText);
      try {
        const metaObj = {
          name: fileName,
          pdf_path: pdfPath,
          target_page: targetPage || 1,
          email_width: emailWidth || 700,
          package_dir: extractData.package_dir,
          timestamp: Date.now(),
          updated_at: new Date().toISOString()
        };
        await nativeIPC.saveFile(savePathMeta, JSON.stringify(metaObj, null, 2));
      } catch {}
      setExistingHtmlOnDisk(htmlToSave);
    }

    const fullHtmlPath = extractData?.package_dir
      ? `${extractData.package_dir}\\${baseName}.html`
      : `${baseName}.html`;
    if (extractData?.package_dir) {
      localStorage.setItem("nocodemail_last_pkg_dir", extractData.package_dir);
    }
    onOpenEditor(htmlToSave, fullHtmlPath);
  };

  // 3. Brand new project without existing HTML -> compile and open directly
  const handleDirectOpenInEditor = async () => {
    let htmlToOpen = generatedHtml;
    if (!htmlToOpen && mjmlText.trim()) {
      try {
        const mjml2html = await getMjmlCompiler();
        const result = await mjml2html(mjmlText, {
          keepComments: false,
          minify: false,
          validationLevel: "soft",
        });
        htmlToOpen = result.html || "";
        setGeneratedHtml(htmlToOpen);
      } catch (e) {
        console.error("Compile error:", e);
      }
    }

    if (extractData?.package_dir && htmlToOpen) {
      const savePathHtml = `${extractData.package_dir}\\${baseName}.html`;
      const savePathMjml = `${extractData.package_dir}\\${baseName}.mjml`;
      const savePathMeta = `${extractData.package_dir}\\project_meta.json`;
      await nativeIPC.saveFile(savePathHtml, htmlToOpen);
      await nativeIPC.saveFile(savePathMjml, mjmlText);
      try {
        const metaObj = {
          name: fileName,
          pdf_path: pdfPath,
          target_page: targetPage || 1,
          email_width: emailWidth || 700,
          package_dir: extractData.package_dir,
          timestamp: Date.now(),
          updated_at: new Date().toISOString()
        };
        await nativeIPC.saveFile(savePathMeta, JSON.stringify(metaObj, null, 2));
      } catch {}
      setExistingHtmlOnDisk(htmlToOpen);
      setHasExistingHtml(true);
    }

    const fullHtmlPath = extractData?.package_dir
      ? `${extractData.package_dir}\\${baseName}.html`
      : `${baseName}.html`;
    if (extractData?.package_dir) {
      localStorage.setItem("nocodemail_last_pkg_dir", extractData.package_dir);
    }
    onOpenEditor(htmlToOpen, fullHtmlPath);
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
              <h3>Assets ({extractedAssetList.length || (extractData?.total_images !== undefined ? extractData.total_images : (extracting ? "..." : 0))})</h3>
              <button className="view-all-link" onClick={() => setShowAssetsModal(true)}>View all</button>
            </div>
            <div className="dash-card-body assets-body">
              <div className="assets-grid-thumb">
                {extractData?.package_dir && extractedAssetList.length > 0 ? (
                  extractedAssetList.slice(0, 5).map((asset, i) => (
                    <div 
                      key={asset.name || i} 
                      className="asset-photo-box" 
                      style={{ overflow: "hidden", background: "#f8fafc", border: "1px solid #e2e8f0", cursor: "pointer", padding: "2px" }}
                      onClick={() => setShowAssetsModal(true)}
                      title={`View ${asset.name}`}
                    >
                      <img 
                        src={asset.url} 
                        alt={asset.name}
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
                  <span>+{Math.max(0, (extractedAssetList.length || extractData?.total_images || 0) - 5)}</span>
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

        {/* Central Action Launchers: File Source (Orange) + MJML Agent */}
        <div className="section-down-arrow-container" style={{ display: "flex", justifyContent: "center", alignItems: "center", margin: "16px 0", gap: "12px" }}>
          {/* File Source Folder Button (Orange) */}
          <button
            type="button"
            onClick={handleOpenFileSource}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              background: "linear-gradient(135deg, #ea580c, #f59e0b)",
              color: "#ffffff",
              border: "none",
              borderRadius: "24px",
              padding: "10px 22px",
              fontSize: "13.5px",
              fontWeight: "700",
              cursor: "pointer",
              boxShadow: "0 4px 16px rgba(234, 88, 12, 0.35)",
              transition: "all 0.18s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px) scale(1.03)";
              e.currentTarget.style.boxShadow = "0 6px 22px rgba(234, 88, 12, 0.45)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "none";
              e.currentTarget.style.boxShadow = "0 4px 16px rgba(234, 88, 12, 0.35)";
            }}
            title={extractData?.package_dir ? `Open ${extractData.package_dir} in File Explorer` : "Open Project Package Directory"}
          >
            <FolderOpen size={16} />
            <span>File Source</span>
          </button>

          {/* MJML Agent Launcher */}
          <button
            type="button"
            onClick={handleOpenMjmlAgent}
            onContextMenu={handleMjmlAgentContextMenu}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
              color: "#ffffff",
              border: "none",
              borderRadius: "24px",
              padding: "10px 24px",
              fontSize: "13.5px",
              fontWeight: "700",
              cursor: "pointer",
              boxShadow: "0 4px 16px rgba(79, 70, 229, 0.35)",
              transition: "all 0.18s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px) scale(1.03)";
              e.currentTarget.style.boxShadow = "0 6px 22px rgba(79, 70, 229, 0.45)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "none";
              e.currentTarget.style.boxShadow = "0 4px 16px rgba(79, 70, 229, 0.35)";
            }}
            title="Left-click: Open MJML AI Agent | Right-click: Change Default Browser"
          >
            <Sparkles size={16} />
            <span>MJML Agent</span>
            <ArrowRight size={16} />
          </button>
        </div>

        {/* Bottom MJML -> HTML Section (1:1 with Screen2.png) */}
        <section className="mjml-html-section">
          <div className="mjml-section-header">
            <div>
              <h3>MJML → HTML Conversion</h3>
              <p>Paste the MJML generated by AI to convert it into clean, responsive HTML.</p>
            </div>
            
            {hasExistingHtml ? (
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                {/* 1. Compile new HTML Button (Opens confirmation modal to recompile MJML and overwrite) */}
                <button
                  type="button"
                  onClick={() => setShowCompileConfirmModal(true)}
                  disabled={!mjmlText.trim() && !generatedHtml}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "7px",
                    background: "linear-gradient(135deg, #7c3aed, #9333ea)",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "8px",
                    padding: "8px 16px",
                    fontSize: "12px",
                    fontWeight: "700",
                    cursor: (!mjmlText.trim() && !generatedHtml) ? "not-allowed" : "pointer",
                    opacity: (!mjmlText.trim() && !generatedHtml) ? 0.5 : 1,
                    boxShadow: "0 2px 8px rgba(124, 58, 237, 0.25)",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (mjmlText.trim() || generatedHtml) {
                      e.currentTarget.style.transform = "translateY(-1px)";
                      e.currentTarget.style.boxShadow = "0 4px 12px rgba(124, 58, 237, 0.35)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "none";
                    e.currentTarget.style.boxShadow = "0 2px 8px rgba(124, 58, 237, 0.25)";
                  }}
                  title="Recompile MJML and overwrite HTML file"
                >
                  <Sparkles size={15} />
                  <span>Compile new HTML</span>
                  <ExternalLink size={13} />
                </button>

                {/* 2. Update previous HTML Button (Directly opens previously saved HTML in editor without modal) */}
                <button
                  type="button"
                  onClick={handleOpenPreviousHtml}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "7px",
                    background: "linear-gradient(135deg, #2563eb, #3b82f6)",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "8px",
                    padding: "8px 16px",
                    fontSize: "12px",
                    fontWeight: "700",
                    cursor: "pointer",
                    boxShadow: "0 2px 8px rgba(37, 99, 235, 0.25)",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-1px)";
                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(37, 99, 235, 0.35)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "none";
                    e.currentTarget.style.boxShadow = "0 2px 8px rgba(37, 99, 235, 0.25)";
                  }}
                  title="Open previously edited HTML file in editor (preserves your manual edits)"
                >
                  <FileText size={15} />
                  <span>Update previous HTML</span>
                  <ExternalLink size={13} />
                </button>
              </div>
            ) : (
              <button
                className="open-in-editor-btn-main"
                onClick={handleDirectOpenInEditor}
                disabled={!generatedHtml && !mjmlText.trim()}
              >
                <Sparkles size={16} />
                <span>Open in Editor</span>
                <ExternalLink size={14} />
              </button>
            )}
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
              <h3>Extracted Visual Assets ({extractedAssetList.length || extractData?.total_images || 0}) — {fileName}</h3>
              <button className="close-btn" onClick={() => setShowAssetsModal(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ padding: "24px", background: "#f8fafc", overflowY: "auto", maxHeight: "calc(88vh - 70px)" }}>
              {extractData?.package_dir && extractedAssetList.length > 0 ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "16px" }}>
                  {extractedAssetList.map((asset, i) => {
                    return (
                      <div 
                        key={asset.name || i} 
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
                            src={asset.url} 
                            alt={asset.name} 
                            style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                            onError={(e) => {
                              (e.target as HTMLElement).style.opacity = "0.3";
                            }}
                          />
                        </div>
                        <div style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px", color: "#64748b" }}>
                          <span style={{ fontWeight: "700", color: "#0f172a", maxWidth: "105px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={asset.name}>
                            {asset.name}
                          </span>
                          <a 
                            href={asset.url} 
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
              <h3>Extracted Design JSON ({baseName}_design.json.txt)</h3>
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

      {/* Compile New HTML Confirmation Modal */}
      {showCompileConfirmModal && (
        <div className="modal-backdrop" onClick={() => setShowCompileConfirmModal(false)}>
          <div 
            className="modal-window" 
            style={{ 
              width: "500px", 
              maxWidth: "92vw", 
              padding: "0",
              overflow: "hidden",
              borderRadius: "14px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.35)",
              border: "1px solid #e2e8f0"
            }} 
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "rgba(124, 58, 237, 0.12)", color: "#7c3aed", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Sparkles size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "#0f172a" }}>Compile New HTML?</h3>
                  <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>Recompiles MJML & overwrites existing file</p>
                </div>
              </div>
              <button 
                className="close-btn" 
                onClick={() => setShowCompileConfirmModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: "18px", color: "#94a3b8" }}
              >
                ✕
              </button>
            </div>
            
            <div style={{ padding: "20px 24px", color: "#334155", fontSize: "13.5px", lineHeight: "1.6" }}>
              <p style={{ margin: "0 0 12px" }}>
                An existing HTML file <strong>{baseName}.html</strong> was found in this project.
              </p>
              <div style={{ background: "#fffbeb", border: "1px solid #fef3c7", borderRadius: "8px", padding: "12px 14px", fontSize: "12.5px", color: "#b45309" }}>
                ⚠️ <strong>Note:</strong> Compiling new HTML will recompile the latest MJML and <strong>overwrite</strong> <code>{baseName}.html</code> on disk. Any previous custom edits made directly to the HTML will be replaced.
              </div>
            </div>

            <div style={{ padding: "16px 24px", background: "#f8fafc", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button 
                onClick={() => setShowCompileConfirmModal(false)}
                style={{ 
                  padding: "8px 16px", 
                  borderRadius: "8px", 
                  border: "1px solid #cbd5e1", 
                  background: "#ffffff", 
                  color: "#475569", 
                  fontWeight: "600", 
                  fontSize: "13px", 
                  cursor: "pointer" 
                }}
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirmCompileNewHtml}
                style={{ 
                  padding: "8px 18px", 
                  borderRadius: "8px", 
                  border: "none", 
                  background: "linear-gradient(135deg, #7c3aed, #9333ea)", 
                  color: "#ffffff", 
                  fontWeight: "600", 
                  fontSize: "13px", 
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  boxShadow: "0 4px 12px rgba(124, 58, 237, 0.25)"
                }}
              >
                <span>Yes, Compile & Open</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Default Browser Selection Modal for MJML Agent */}
      <BrowserSelectModal
        isOpen={showBrowserModal}
        onClose={() => setShowBrowserModal(false)}
        onSelectBrowser={handleSelectAgentBrowser}
        currentBrowserPath={localStorage.getItem("nocodemail_agent_browser") || ""}
      />
    </div>
  );
};
