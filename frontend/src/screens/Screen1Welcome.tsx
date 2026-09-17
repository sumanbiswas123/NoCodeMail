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
  Crop,
  Bot,
  FolderKanban,
  AlertTriangle
} from "lucide-react";
import { nativeIPC, MarkedRegion, FooterPreset, PDFExtractionData } from "../services/ipc";
import { PdfMarkingModal } from "../components/PdfMarkingModal";
import { BrowserSelectModal } from "../components/BrowserSelectModal";

interface Screen1Props {
  onPdfSelected: (path: string, targetPage?: number, emailWidth?: number, markedRegions?: MarkedRegion[], selectedFooter?: FooterPreset | null) => void;
  onHtmlLoaded: (path: string, content: string) => void;
  onResumeProcess?: (params: {
    pdfPath: string;
    targetPage?: number;
    emailWidth?: number;
    extractData: PDFExtractionData;
    mjmlText?: string;
    generatedHtml?: string;
  }) => void;
}

export interface RecentProject {
  id: string;
  name: string;
  path: string;
  type: "pdf" | "html";
  timestamp: number;
  package_dir?: string;
  target_page?: number;
  email_width?: number;
}

const getRecentProjectsFromStorage = (): RecentProject[] => {
  try {
    const raw = localStorage.getItem("nocodemail_recent_projects");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
};

const saveRecentProjectToStorage = (item: {
  name: string;
  path: string;
  type: "pdf" | "html";
  package_dir?: string;
  target_page?: number;
  email_width?: number;
}) => {
  try {
    const current = getRecentProjectsFromStorage().filter((p) => p.path !== item.path);
    const updated: RecentProject[] = [
      {
        id: `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name: item.name,
        path: item.path,
        type: item.type,
        timestamp: Date.now(),
        package_dir: item.package_dir,
        target_page: item.target_page,
        email_width: item.email_width,
      },
      ...current,
    ];
    localStorage.setItem("nocodemail_recent_projects", JSON.stringify(updated.slice(0, 15)));
  } catch {}
};

export const Screen1Welcome: React.FC<Screen1Props> = ({ onPdfSelected, onHtmlLoaded, onResumeProcess }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [loadingHtml, setLoadingHtml] = useState(false);
  const [loadingProject, setLoadingProject] = useState(false);
  const [invalidProjectModal, setInvalidProjectModal] = useState<{
    open: boolean;
    dir?: string;
    error?: string;
    filesFound?: string[];
  } | null>(null);

  // iOS Glass Modal State
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [showMarkingModal, setShowMarkingModal] = useState(false);
  const [showRecentModal, setShowRecentModal] = useState(false);
  const [showBrowserModal, setShowBrowserModal] = useState(false);
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);
  const [modalPdfPath, setModalPdfPath] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [extractSinglePage, setExtractSinglePage] = useState<boolean>(true); // Enabled by default for all PDFs
  const [selectedPage, setSelectedPage] = useState<number>(1);
  const [selectedEmailWidth, setSelectedEmailWidth] = useState<number>(700);
  const [modalDragging, setModalDragging] = useState(false);

  // Load recents on mount and when opening modal
  const refreshRecentProjects = () => {
    setRecentProjects(getRecentProjectsFromStorage());
  };

  const handleOpenPdfModal = () => {
    setShowPdfModal(true);
    setModalPdfPath(null);
    setTotalPages(1);
    setExtractSinglePage(true);
    setSelectedPage(1);
    setSelectedEmailWidth(700);
  };

  const handleSelectProject = async () => {
    try {
      setLoadingProject(true);
      const res = await nativeIPC.chooseProject();
      if (res.success && res.path) {
        // Inspect the chosen path / directory
        const inspectRes = await nativeIPC.inspectProject(res.path);
        if (inspectRes.success) {
          const targetDir = inspectRes.package_dir || res.path;
          const projectName = inspectRes.project_name || targetDir.split(/[/\\]/).pop() || "Imported Project";

          if (inspectRes.design_json) {
            // Full AI package with design JSON
            let totalPages = 1;
            let totalImages = 0;
            let totalLinks = 0;
            let totalTables = 0;
            let totalStyles = 0;
            let totalTextBlocks = 0;

            try {
              const parsed = JSON.parse(inspectRes.design_json);
              totalPages = parsed.total_pages || 1;
              if (Array.isArray(parsed.pages)) {
                for (const p of parsed.pages) {
                  if (Array.isArray(p.elements)) {
                    for (const el of p.elements) {
                      if (el.type === "image") totalImages++;
                      else if (el.type === "text_block") totalTextBlocks++;
                    }
                  }
                }
              }
            } catch {}

            let detectedTargetPage = 1;
            let detectedEmailWidth = 700;
            let detectedPdfPath = targetDir;
            let cleanProjectName = projectName.replace(/_ai_package$/i, "");

            try {
              const metaRes = await nativeIPC.readFile(`${targetDir}\\project_meta.json`);
              if (metaRes.success && metaRes.content) {
                const metaParsed = JSON.parse(metaRes.content);
                if (metaParsed.target_page) detectedTargetPage = Number(metaParsed.target_page);
                if (metaParsed.email_width) detectedEmailWidth = Number(metaParsed.email_width);
                if (metaParsed.pdf_path) detectedPdfPath = metaParsed.pdf_path;
                if (metaParsed.name) cleanProjectName = metaParsed.name.replace(/_ai_package$/i, "");
              }
            } catch {}

            const extractData: PDFExtractionData = {
              package_dir: targetDir,
              json_path: inspectRes.design_json_path || `${targetDir}\\${cleanProjectName}_design.json`,
              preview_image_path: inspectRes.preview_image_path || `${targetDir}\\page_${detectedTargetPage}_preview.png`,
              preview_image_filename: inspectRes.preview_image_path ? (inspectRes.preview_image_path.split(/[/\\]/).pop() || `page_${detectedTargetPage}_preview.png`) : `page_${detectedTargetPage}_preview.png`,
              total_pages: totalPages,
              total_text_blocks: totalTextBlocks,
              total_images: totalImages,
              total_links: totalLinks,
              total_tables: totalTables,
              total_styles: totalStyles,
              design_json: inspectRes.design_json,
            };

            const htmlFileToStore = inspectRes.html_path || `${targetDir}\\${cleanProjectName}.html`;

            saveRecentProjectToStorage({
              name: cleanProjectName,
              path: detectedPdfPath || htmlFileToStore,
              type: "pdf",
              package_dir: targetDir,
              target_page: detectedTargetPage,
              email_width: detectedEmailWidth,
            });
            refreshRecentProjects();

            let pdfPathToPass = `${cleanProjectName}.pdf`;
            if (detectedPdfPath && detectedPdfPath !== targetDir && !detectedPdfPath.endsWith("_ai_package")) {
              pdfPathToPass = detectedPdfPath;
            }

            if (onResumeProcess) {
              onResumeProcess({
                pdfPath: pdfPathToPass,
                targetPage: detectedTargetPage,
                emailWidth: detectedEmailWidth,
                extractData,
                mjmlText: inspectRes.mjml_content || "",
                generatedHtml: inspectRes.html_content || "",
              });
              return;
            }
          }

          // If it has HTML content
          if (inspectRes.html_content && inspectRes.html_path) {
            saveRecentProjectToStorage({
              name: projectName,
              path: inspectRes.html_path,
              type: "html",
              package_dir: targetDir,
            });
            refreshRecentProjects();
            onHtmlLoaded(inspectRes.html_path, inspectRes.html_content);
            return;
          }

          // Fallback if raw HTML file was chosen
          if (res.path.endsWith(".html") || res.path.endsWith(".htm")) {
            const htmlRes = await nativeIPC.readFile(res.path);
            if (htmlRes.success && htmlRes.content) {
              saveRecentProjectToStorage({
                name: projectName,
                path: res.path,
                type: "html",
              });
              refreshRecentProjects();
              onHtmlLoaded(res.path, htmlRes.content);
              return;
            }
          }
        }

        // Invalid project structure
        setInvalidProjectModal({
          open: true,
          dir: inspectRes.checked_dir || res.path,
          error: inspectRes.error || "The selected folder is missing required email project files (.html, .mjml, or _design.json).",
          filesFound: inspectRes.files_found || [],
        });
      }
    } catch (e) {
      console.error("Select project error:", e);
    } finally {
      setLoadingProject(false);
    }
  };

  const handleChoosePdfFromDisk = async () => {
    try {
      setLoadingPdf(true);
      const res = await nativeIPC.choosePdf();
      if (res.success && res.path) {
        setModalPdfPath(res.path);
        const name = res.path.split(/[/\\]/).pop() || "email-design.pdf";
        
        // Find if this PDF was previously opened to pre-select its page
        let defaultPage = 1;
        const recent = getRecentProjectsFromStorage().find((p) => p.path === res.path);
        if (recent?.target_page) {
          defaultPage = recent.target_page;
        } else {
          const normPath = res.path.replace(/\//g, "\\");
          const lastSlash = normPath.lastIndexOf("\\");
          const parentDir = lastSlash === -1 ? "." : normPath.substring(0, lastSlash);
          const filename = lastSlash === -1 ? normPath : normPath.substring(lastSlash + 1);
          const baseName = filename.replace(/\.[^/.]+$/, "");
          const metaPath = `${parentDir}\\${baseName}_ai_package\\project_meta.json`;
          try {
            const metaRes = await nativeIPC.readFile(metaPath);
            if (metaRes.success && metaRes.content) {
              const metaObj = JSON.parse(metaRes.content);
              if (metaObj.target_page) defaultPage = Number(metaObj.target_page);
            }
          } catch {}
        }

        saveRecentProjectToStorage({ name, path: res.path, type: "pdf", target_page: defaultPage });
        refreshRecentProjects();

        // Query total pages
        const info = await nativeIPC.getPdfInfo(res.path);
        setTotalPages(info.total_pages || 1);
        setSelectedPage(defaultPage);
        setExtractSinglePage(true); // Always enabled by default
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingPdf(false);
    }
  };

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

  const handleConfirmExtraction = () => {
    if (!modalPdfPath) return;
    setShowPdfModal(false);
    // Open PDF Marking & Component Review Modal
    setShowMarkingModal(true);
  };

  const handleMarkingModalConfirm = (markedRegions: MarkedRegion[], selectedFooter: FooterPreset | null) => {
    if (!modalPdfPath) return;
    const targetP = extractSinglePage ? selectedPage : 1;
    const name = modalPdfPath.split(/[/\\]/).pop() || "email-design.pdf";
    saveRecentProjectToStorage({ name, path: modalPdfPath, type: "pdf", target_page: targetP, email_width: selectedEmailWidth });
    setShowMarkingModal(false);
    onPdfSelected(modalPdfPath, targetP, selectedEmailWidth, markedRegions, selectedFooter);
  };

  const handleChooseHtml = async () => {
    try {
      setLoadingHtml(true);
      const res = await nativeIPC.chooseHtml();
      if (res.success && res.path && res.content) {
        const name = res.path.split(/[/\\]/).pop() || "campaign.html";
        saveRecentProjectToStorage({ name, path: res.path, type: "html" });
        refreshRecentProjects();
        onHtmlLoaded(res.path, res.content);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingHtml(false);
    }
  };

  const handleResumeRecent = async (proj: RecentProject) => {
    setShowRecentModal(false);

    // Compute package directory dynamically if not explicitly stored
    const normPath = proj.path.replace(/\//g, "\\");
    const lastSlash = normPath.lastIndexOf("\\");
    const parentDir = lastSlash === -1 ? "." : normPath.substring(0, lastSlash);
    const filename = lastSlash === -1 ? normPath : normPath.substring(lastSlash + 1);
    const baseName = filename.replace(/\.[^/.]+$/, "");
    const cleanBase = baseName.replace(/_ai_package$/i, "");
    const packageDir = proj.package_dir || `${parentDir}\\${cleanBase}_ai_package`;
    let targetPage = proj.target_page || 1;
    let emailWidth = proj.email_width || 700;
    let effectivePdfPath = proj.path;

    const metaPath = `${packageDir}\\project_meta.json`;
    try {
      const resMeta = await nativeIPC.readFile(metaPath);
      if (resMeta.success && resMeta.content) {
        try {
          const metaObj = JSON.parse(resMeta.content);
          if (metaObj.target_page) targetPage = Number(metaObj.target_page);
          if (metaObj.email_width) emailWidth = Number(metaObj.email_width);
          if (metaObj.pdf_path) effectivePdfPath = metaObj.pdf_path;
        } catch {}
      }
    } catch {}

    const jsonCandidates = [
      `${packageDir}\\${cleanBase}_design.json`,
      `${packageDir}\\${baseName}_design.json`,
      `${packageDir}\\design.json`,
    ];
    const mjmlCandidates = [
      `${packageDir}\\${cleanBase}.mjml`,
      `${packageDir}\\${baseName}.mjml`,
      `${packageDir}\\template.mjml`,
    ];
    const htmlCandidates = [
      `${packageDir}\\${cleanBase}.html`,
      `${packageDir}\\${baseName}.html`,
      `${packageDir}\\index.html`,
    ];

    try {
      setLoadingPdf(true);
      let resJsonContent = "";
      let effectiveJsonPath = jsonCandidates[0];
      for (const jp of jsonCandidates) {
        const r = await nativeIPC.readFile(jp);
        if (r.success && r.content) {
          resJsonContent = r.content;
          effectiveJsonPath = jp;
          break;
        }
      }

      let resMjmlContent = "";
      for (const mp of mjmlCandidates) {
        const r = await nativeIPC.readFile(mp);
        if (r.success && r.content) {
          resMjmlContent = r.content;
          break;
        }
      }

      let resHtmlContent = "";
      for (const hp of htmlCandidates) {
        const r = await nativeIPC.readFile(hp);
        if (r.success && r.content) {
          resHtmlContent = r.content;
          break;
        }
      }

      if (resJsonContent) {
        let totalPages = 1;
        let totalImages = 0;
        let totalLinks = 0;
        let totalTables = 0;
        let totalStyles = 0;
        let totalTextBlocks = 0;

        try {
          const parsed = JSON.parse(resJsonContent);
          totalPages = parsed.total_pages || 1;
          if (Array.isArray(parsed.pages)) {
            for (const p of parsed.pages) {
              if (Array.isArray(p.elements)) {
                for (const el of p.elements) {
                  if (el.type === "image") totalImages++;
                  else if (el.type === "text_block") totalTextBlocks++;
                }
              }
            }
          }
        } catch {}

        const extractData: PDFExtractionData = {
          package_dir: packageDir,
          json_path: effectiveJsonPath,
          preview_image_path: `${packageDir}\\page_${targetPage}_preview.png`,
          preview_image_filename: `page_${targetPage}_preview.png`,
          total_pages: totalPages,
          total_text_blocks: totalTextBlocks,
          total_images: totalImages,
          total_links: totalLinks,
          total_tables: totalTables,
          total_styles: totalStyles,
          design_json: resJsonContent,
        };

        if (onResumeProcess) {
          onResumeProcess({
            pdfPath: effectivePdfPath,
            targetPage,
            emailWidth,
            extractData,
            mjmlText: resMjmlContent || "",
            generatedHtml: resHtmlContent || "",
          });
          return;
        }
      }
    } catch (e) {
      console.error("Resume error:", e);
    } finally {
      setLoadingPdf(false);
    }

    // Direct transition to Screen 2 Studio if package files were moved
    onPdfSelected(proj.path, targetPage, emailWidth, [], null);
  };

  const handleOpenRemark = async (proj: RecentProject) => {
    setShowRecentModal(false);
    setModalPdfPath(proj.path);
    setShowPdfModal(true);
    try {
      const info = await nativeIPC.getPdfInfo(proj.path);
      setTotalPages(info.total_pages || 1);
      setSelectedPage(proj.target_page || 1);
      if ((info.total_pages || 1) > 1) {
        setExtractSinglePage(true);
      }
    } catch {
      setTotalPages(1);
    }
  };

  const handleSelectRecent = async (proj: RecentProject) => {
    if (proj.type === "pdf") {
      if (proj.package_dir) {
        handleResumeRecent(proj);
      } else {
        handleOpenRemark(proj);
      }
    } else if (proj.type === "html") {
      setShowRecentModal(false);
      try {
        setLoadingHtml(true);
        const res = await nativeIPC.readFile(proj.path);
        if (res.success && res.content) {
          onHtmlLoaded(proj.path, res.content);
        } else {
          handleChooseHtml();
        }
      } catch (e) {
        console.error("Failed to load recent HTML:", e);
      } finally {
        setLoadingHtml(false);
      }
    }
  };

  const handleDeleteRecent = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const updated = recentProjects.filter((p) => p.id !== id);
      localStorage.setItem("nocodemail_recent_projects", JSON.stringify(updated));
      setRecentProjects(updated);
    } catch {}
  };

  const handleClearAllRecents = () => {
    try {
      localStorage.removeItem("nocodemail_recent_projects");
      setRecentProjects([]);
    } catch {}
  };

  const handleDropOnModal = async (e: React.DragEvent) => {
    e.preventDefault();
    setModalDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.name.endsWith(".pdf")) {
        setModalPdfPath(file.name);
        const recent = getRecentProjectsFromStorage().find((p) => p.path === file.name);
        const defaultPage = recent?.target_page || 1;
        try {
          const info = await nativeIPC.getPdfInfo(file.name);
          setTotalPages(info.total_pages || 1);
          setSelectedPage(defaultPage);
          setExtractSinglePage(true);
        } catch {
          setTotalPages(1);
          setSelectedPage(defaultPage);
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
        const recent = getRecentProjectsFromStorage().find((p) => p.path === file.name);
        const defaultPage = recent?.target_page || 1;
        nativeIPC.getPdfInfo(file.name).then(info => {
          setTotalPages(info.total_pages || 1);
          setSelectedPage(defaultPage);
          setExtractSinglePage(true);
        }).catch(() => {
          setTotalPages(1);
          setSelectedPage(defaultPage);
        });
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
      {/* Top Header Logo & Actions */}
      <header className="brand-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="brand-logo">
          <div className="logo-badge">N</div>
          <span className="logo-text">NoCodeMail</span>
        </div>

        {/* Select Project Header Button */}
        <button
          type="button"
          onClick={handleSelectProject}
          disabled={loadingProject}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "7px",
            background: "linear-gradient(135deg, #0284c7, #2563eb)",
            color: "#ffffff",
            border: "none",
            borderRadius: "8px",
            padding: "7px 15px",
            fontSize: "12.5px",
            fontWeight: "700",
            cursor: loadingProject ? "wait" : "pointer",
            boxShadow: "0 2px 10px rgba(37, 99, 235, 0.35)",
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-1px)";
            e.currentTarget.style.boxShadow = "0 4px 14px rgba(37, 99, 235, 0.45)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "none";
            e.currentTarget.style.boxShadow = "0 2px 10px rgba(37, 99, 235, 0.35)";
          }}
          title="Select an already available project folder or email files from your file system"
        >
          <FolderKanban size={15} />
          <span>{loadingProject ? "Inspecting..." : "Select Project"}</span>
          <ArrowRight size={13} />
        </button>
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
        <button 
          type="button"
          className="footer-recent-btn" 
          onClick={() => {
            refreshRecentProjects();
            setShowRecentModal(true);
          }}
        >
          <Clock size={15} />
          <span>View Recent Projects</span>
        </button>
      </footer>

      {/* Recent Projects Modal */}
      {showRecentModal && (
        <div className="ios-modal-overlay" onClick={() => setShowRecentModal(false)}>
          <div 
            className="ios-glass-modal" 
            style={{ width: "620px", maxWidth: "92vw", maxHeight: "82vh", display: "flex", flexDirection: "column", animation: "modalSlideUp 0.2s cubic-bezier(0.16, 1, 0.3, 1)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="ios-modal-header" style={{ padding: "16px 20px", borderBottom: "1px solid #e2e8f0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "#e0e7ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Clock size={17} color="#4f46e5" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "#0f172a" }}>Recent Projects</h3>
                  <p style={{ margin: 0, fontSize: "11.5px", color: "#64748b" }}>Quickly resume editing previous PDFs or exported emails</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setShowRecentModal(false)}
                style={{ background: "transparent", border: "none", cursor: "pointer", color: "#64748b", padding: "4px" }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: "16px 20px", overflowY: "auto", flex: "1 1 auto", minHeight: "150px" }}>
              {recentProjects.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {recentProjects.map((proj) => {
                    const isPdf = proj.type === "pdf";
                    const dateStr = new Date(proj.timestamp).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    });

                    return (
                      <div
                        key={proj.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "12px 16px",
                          borderRadius: "10px",
                          background: "#ffffff",
                          border: "1px solid #e2e8f0",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                          gap: "12px",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0, flex: "1 1 auto" }}>
                          <span
                            style={{
                              padding: "4px 8px",
                              borderRadius: "6px",
                              fontSize: "10.5px",
                              fontWeight: "800",
                              letterSpacing: "0.5px",
                              background: isPdf ? "#f3e8ff" : "#e0f2fe",
                              color: isPdf ? "#7c3aed" : "#0284c7",
                              flexShrink: 0,
                            }}
                          >
                            {isPdf ? "PDF" : "HTML"}
                          </span>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: "13px", fontWeight: "700", color: "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={proj.name}>
                              {proj.name}
                            </div>
                            <div style={{ fontSize: "11px", color: "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={proj.path}>
                              {proj.path} • {dateStr}
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                          {isPdf ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleResumeRecent(proj)}
                                style={{
                                  padding: "6px 12px",
                                  borderRadius: "6px",
                                  fontSize: "11.5px",
                                  fontWeight: "700",
                                  background: "#4f46e5",
                                  color: "#ffffff",
                                  border: "none",
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "5px",
                                  boxShadow: "0 2px 4px rgba(79, 70, 229, 0.25)",
                                  transition: "background 0.15s ease",
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = "#4338ca")}
                                onMouseLeave={(e) => (e.currentTarget.style.background = "#4f46e5")}
                                title="Resume Screen 2 directly with existing extracted assets, MJML & HTML"
                              >
                                <Sparkles size={13} />
                                <span>Resume Studio</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenRemark(proj)}
                                style={{
                                  padding: "6px 10px",
                                  borderRadius: "6px",
                                  fontSize: "11.5px",
                                  fontWeight: "600",
                                  background: "#f8fafc",
                                  color: "#475569",
                                  border: "1px solid #cbd5e1",
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  transition: "background 0.15s ease",
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = "#f1f5f9")}
                                onMouseLeave={(e) => (e.currentTarget.style.background = "#f8fafc")}
                                title="Choose pages and draw marked areas again"
                              >
                                <Crop size={13} />
                                <span>Re-mark</span>
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleSelectRecent(proj)}
                              style={{
                                padding: "6px 12px",
                                borderRadius: "6px",
                                fontSize: "11.5px",
                                fontWeight: "700",
                                background: "#0284c7",
                                color: "#ffffff",
                                border: "none",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: "4px",
                                boxShadow: "0 2px 4px rgba(2, 132, 199, 0.25)",
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = "#0369a1")}
                              onMouseLeave={(e) => (e.currentTarget.style.background = "#0284c7")}
                            >
                              <span>Open Editor</span>
                              <ChevronRight size={13} />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={(e) => handleDeleteRecent(proj.id, e)}
                            title="Remove from recents"
                            style={{
                              background: "transparent",
                              border: "none",
                              cursor: "pointer",
                              color: "#cbd5e1",
                              padding: "4px",
                              borderRadius: "4px",
                              marginLeft: "4px",
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = "#ef4444")}
                            onMouseLeave={(e) => (e.currentTarget.style.color = "#cbd5e1")}
                          >
                            <X size={15} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "40px 20px", color: "#64748b" }}>
                  <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                    <Clock size={22} color="#94a3b8" />
                  </div>
                  <div style={{ fontSize: "14px", fontWeight: "700", color: "#334155", marginBottom: "4px" }}>No recent projects yet</div>
                  <p style={{ fontSize: "12px", color: "#94a3b8", margin: 0 }}>
                    Choose a PDF file or open an HTML email to get started.
                  </p>
                </div>
              )}
            </div>

            {recentProjects.length > 0 && (
              <div style={{ padding: "12px 20px", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "11px", color: "#94a3b8" }}>{recentProjects.length} recent item{recentProjects.length > 1 ? "s" : ""}</span>
                <button
                  type="button"
                  onClick={handleClearAllRecents}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#ef4444",
                    fontSize: "11.5px",
                    fontWeight: "600",
                    cursor: "pointer",
                    padding: "4px 8px",
                  }}
                >
                  Clear History
                </button>
              </div>
            )}
          </div>
        </div>
      )}

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

              {/* Configuration options - only shown once a PDF is selected */}
              {modalPdfPath && (
                <>
                  {/* Target Email Container Width Selection (700px, 650px, 600px) */}
                  <div className="ios-settings-card" style={{ animation: "fadeIn 0.2s ease-out" }}>
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
                  <div className="ios-settings-card" style={{ animation: "fadeIn 0.2s ease-out" }}>
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
                </>
              )}
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

      {/* Default Browser Selection Modal for MJML Agent */}
      <BrowserSelectModal
        isOpen={showBrowserModal}
        onClose={() => setShowBrowserModal(false)}
        onSelectBrowser={handleSelectAgentBrowser}
        currentBrowserPath={localStorage.getItem("nocodemail_agent_browser") || ""}
      />

      {/* Invalid Project Structure Error Modal */}
      {invalidProjectModal && invalidProjectModal.open && (
        <div 
          className="ios-modal-overlay" 
          onClick={() => setInvalidProjectModal(null)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.72)",
            backdropFilter: "blur(12px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            animation: "fadeIn 0.2s ease-out"
          }}
        >
          <div 
            className="ios-modal-card" 
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "520px",
              maxWidth: "92vw",
              background: "#ffffff",
              borderRadius: "18px",
              boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(239, 68, 68, 0.2)",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Modal Header */}
            <div style={{
              padding: "20px 24px 16px",
              borderBottom: "1px solid #f1f5f9",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "linear-gradient(180deg, #fef2f2 0%, #ffffff 100%)"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "12px",
                  background: "#fee2e2",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#ef4444",
                  boxShadow: "0 2px 8px rgba(239, 68, 68, 0.2)"
                }}>
                  <AlertTriangle size={22} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "#0f172a" }}>
                    Invalid Project Folder
                  </h3>
                  <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#64748b" }}>
                    Required campaign files not detected
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setInvalidProjectModal(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#94a3b8",
                  cursor: "pointer",
                  padding: "6px",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Path Display */}
              {invalidProjectModal.dir && (
                <div style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "10px",
                  padding: "10px 14px",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}>
                  <FolderOpen size={16} color="#64748b" style={{ flexShrink: 0 }} />
                  <span style={{
                    fontFamily: "monospace",
                    fontSize: "12px",
                    color: "#334155",
                    wordBreak: "break-all",
                    lineHeight: "1.4"
                  }}>
                    {invalidProjectModal.dir}
                  </span>
                </div>
              )}

              {/* Error Explanation */}
              <div style={{ fontSize: "13px", color: "#475569", lineHeight: "1.5" }}>
                {invalidProjectModal.error}
              </div>

              {/* Requirement Checklist */}
              <div style={{
                background: "#fdf2f2",
                border: "1px solid #fecaca",
                borderRadius: "10px",
                padding: "12px 16px",
                display: "flex",
                flexDirection: "column",
                gap: "8px"
              }}>
                <div style={{ fontSize: "12px", fontWeight: "700", color: "#991b1b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  A valid project requires at least one of:
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12.5px", color: "#7f1d1d" }}>
                  <span style={{ color: "#ef4444", fontWeight: "bold" }}>•</span>
                  <span><strong>HTML Email Template</strong> (<code>index.html</code> or <code>*.html</code>)</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12.5px", color: "#7f1d1d" }}>
                  <span style={{ color: "#ef4444", fontWeight: "bold" }}>•</span>
                  <span><strong>Design Extraction JSON</strong> (<code>*_design.json</code> or <code>design.json</code>)</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12.5px", color: "#7f1d1d" }}>
                  <span style={{ color: "#ef4444", fontWeight: "bold" }}>•</span>
                  <span><strong>MJML Template</strong> (<code>*.mjml</code>)</span>
                </div>
              </div>

              {/* Files Found Summary (if any) */}
              {invalidProjectModal.filesFound && invalidProjectModal.filesFound.length > 0 && (
                <div style={{ fontSize: "12px", color: "#64748b" }}>
                  <strong>Files detected in folder:</strong>{" "}
                  <span style={{ color: "#475569" }}>
                    {invalidProjectModal.filesFound.slice(0, 6).join(", ")}
                    {invalidProjectModal.filesFound.length > 6 ? ` (+${invalidProjectModal.filesFound.length - 6} more)` : ""}
                  </span>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: "16px 24px",
              background: "#f8fafc",
              borderTop: "1px solid #f1f5f9",
              display: "flex",
              justifyContent: "flex-end",
              gap: "10px"
            }}>
              <button
                type="button"
                onClick={() => setInvalidProjectModal(null)}
                style={{
                  padding: "9px 18px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  background: "#ffffff",
                  color: "#475569",
                  fontSize: "13px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setInvalidProjectModal(null);
                  setTimeout(() => handleSelectProject(), 100);
                }}
                style={{
                  padding: "9px 20px",
                  borderRadius: "8px",
                  border: "none",
                  background: "linear-gradient(135deg, #0284c7, #2563eb)",
                  color: "#ffffff",
                  fontSize: "13px",
                  fontWeight: "700",
                  cursor: "pointer",
                  boxShadow: "0 2px 8px rgba(37, 99, 235, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px"
                }}
              >
                <FolderOpen size={15} />
                <span>Choose Another Folder</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
