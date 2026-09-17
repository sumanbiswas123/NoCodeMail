import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
  Smartphone,
  Monitor,
  Globe,
  Sun,
  Moon,
  Maximize2,
  X,
  Search,
  Sparkles,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  Play,
  RotateCcw,
  History,
  Copy,
  Check,
  Trash2,
  ArrowRight,
  ArrowLeft,
  Clock,
  Inbox,
  Square,
  ChevronLeft,
  ChevronRight,
  Download,
  Info,
  FileText
} from "lucide-react";
import {
  EMAIL_CLIENT_CATALOG,
  DeviceClientProfile,
  InspectTestRun,
  getApiCredentials,
  runMailgunInspectTest,
  pollInspectResults,
  getStoredTestRun,
  saveStoredTestRun,
  saveTestToHistory,
  getTestHistory,
  deleteTestFromHistory,
  clearTestHistory,
  normalizePdfKey,
} from "../services/emailOnAcid";

interface DevicePreviewViewerProps {
  htmlContent: string;
  emailSubject?: string;
  pdfName?: string;
  pkgPrefix?: string;
}

interface CardScreenshotPreviewProps {
  client: any;
  screenshotUrl?: string;
  isTestActive: boolean;
  isDarkMode: boolean;
  onDeviceLoaded?: (clientId: string) => void;
}

const CardScreenshotPreview: React.FC<CardScreenshotPreviewProps> = ({
  client,
  screenshotUrl,
  isTestActive,
  isDarkMode,
  onDeviceLoaded,
}) => {
  const [imgLoaded, setImgLoaded] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<boolean>(false);
  const [retryCount, setRetryCount] = useState<number>(0);
  const [cacheBust, setCacheBust] = useState<number>(() => Date.now());
  const timerRef = useRef<any>(null);

  // Reset state when screenshot URL changes
  useEffect(() => {
    setImgLoaded(false);
    setLoadError(false);
    setRetryCount(0);
    setCacheBust(Date.now());
  }, [screenshotUrl]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  // Compute test source URL with cache busting
  const currentSrc = useMemo(() => {
    if (!screenshotUrl) return "";
    const sep = screenshotUrl.includes("?") ? "&" : "?";
    return retryCount === 0 ? screenshotUrl : `${screenshotUrl}${sep}ncm_t=${cacheBust}`;
  }, [screenshotUrl, retryCount, cacheBust]);

  const handleImageSuccess = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setImgLoaded(true);
    setLoadError(false);
    if (onDeviceLoaded) {
      onDeviceLoaded(client.id);
    }
  };

  const handleImageError = () => {
    setImgLoaded(false);
    setLoadError(true);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    // Schedule next retry probe after 3.2 seconds
    if (retryCount < 50) {
      timerRef.current = setTimeout(() => {
        setCacheBust(Date.now());
        setRetryCount((prev) => prev + 1);
        setLoadError(false);
      }, 3200);
    }
  };

  // 1. NO TEST REQUEST MADE YET (Clean Device Spec Placeholder - NO fake loader)
  if (!screenshotUrl && !isTestActive) {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          padding: "24px 20px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          background: isDarkMode
            ? "linear-gradient(180deg, #1e293b 0%, #0f172a 100%)"
            : "linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)",
          gap: "10px",
        }}
      >
        <div
          style={{
            width: "52px",
            height: "52px",
            borderRadius: "12px",
            background: isDarkMode ? "#334155" : "#e0e7ff",
            color: isDarkMode ? "#cbd5e1" : "#4f46e5",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.06)",
          }}
        >
          {client.category === "mobile" ? (
            <Smartphone size={26} />
          ) : client.category === "desktop" ? (
            <Monitor size={26} />
          ) : (
            <Globe size={26} />
          )}
        </div>

        <div>
          <div style={{ fontSize: "13.5px", fontWeight: "700", color: isDarkMode ? "#f8fafc" : "#0f172a", marginBottom: "3px" }}>
            {client.name}
          </div>
          <div style={{ fontSize: "11px", color: isDarkMode ? "#94a3b8" : "#64748b", fontWeight: "500" }}>
            {client.os || client.version} • {client.width} × {client.height} px
          </div>
        </div>

        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            padding: "3px 9px",
            borderRadius: "20px",
            background: isDarkMode ? "#1e1b4b" : "#eef2ff",
            border: isDarkMode ? "1px solid #3730a3" : "1px solid #c7d2fe",
            color: isDarkMode ? "#c7d2fe" : "#4338ca",
            fontSize: "10.5px",
            fontWeight: "600",
            marginTop: "2px",
          }}
        >
          <span>⚡ Ready to Test</span>
        </div>

        <span style={{ fontSize: "10.5px", color: isDarkMode ? "#64748b" : "#94a3b8", maxWidth: "240px", lineHeight: "1.35" }}>
          Click "Run Cloud Test" above to generate actual screenshot render
        </span>
      </div>
    );
  }

  // 2. TIMED OUT AFTER 50 ATTEMPTS
  if (retryCount >= 50 && !imgLoaded) {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          padding: "20px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          gap: "8px",
          background: isDarkMode ? "#1e293b" : "#f8fafc",
        }}
      >
        <span style={{ fontSize: "22px" }}>⏱️</span>
        <div style={{ fontSize: "12px", fontWeight: "700", color: isDarkMode ? "#f8fafc" : "#1e293b" }}>
          Generating in Cloud
        </div>
        <div style={{ fontSize: "10.5px", color: isDarkMode ? "#94a3b8" : "#64748b" }}>
          Device VM is taking longer than usual.
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setRetryCount(0);
            setCacheBust(Date.now());
            setLoadError(false);
          }}
          style={{
            padding: "4px 10px",
            borderRadius: "5px",
            border: "1px solid #cbd5e1",
            background: "#ffffff",
            color: "#334155",
            fontSize: "10.5px",
            fontWeight: "600",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "4px",
            marginTop: "2px",
          }}
        >
          <RotateCcw size={10} />
          <span>Retry Image</span>
        </button>
      </div>
    );
  }

  // 3. TEST RUNNING / PROBING IMAGE
  return (
    <div style={{ width: "100%", height: "100%", position: "relative", overflow: "hidden", background: isDarkMode ? "#0f172a" : "#f8fafc" }}>
      {/* Actual image element - strictly hidden until loaded to prevent broken image icon */}
      {currentSrc && (
        <img
          key={currentSrc}
          src={currentSrc}
          alt={client.name}
          onLoad={handleImageSuccess}
          onError={handleImageError}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "top",
            display: imgLoaded ? "block" : "none",
            animation: "fadeIn 0.25s ease-in-out",
          }}
        />
      )}

      {/* Animated Spinner Skeleton - visible while !imgLoaded */}
      {!imgLoaded && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            padding: "20px",
            textAlign: "center",
            width: "100%",
            height: "100%",
            position: "absolute",
            top: 0,
            left: 0,
          }}
        >
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              border: `3px solid ${isDarkMode ? "#334155" : "#e2e8f0"}`,
              borderTopColor: "#4f46e5",
              animation: "spin 1s linear infinite",
            }}
          />
          <div style={{ fontSize: "12px", fontWeight: "700", color: isDarkMode ? "#f8fafc" : "#1e293b" }}>
            ⚡ Cloud Rendering... {retryCount > 0 ? `(Attempt ${retryCount})` : ""}
          </div>
          <div style={{ fontSize: "10.5px", color: isDarkMode ? "#94a3b8" : "#64748b" }}>
            {client.name} • {isDarkMode ? "Dark Mode" : "Light Mode"}
          </div>
        </div>
      )}
    </div>
  );
};

export const DevicePreviewViewer: React.FC<DevicePreviewViewerProps> = ({
  htmlContent,
  emailSubject = "Email Campaign Preview",
  pdfName = "",
  pkgPrefix = "",
}) => {
  const currentPdfName = pdfName || emailSubject || "Email Campaign";

  const [selectedCategory, setSelectedCategory] = useState<"all" | "mobile" | "desktop" | "webmail">("all");
  const [themeFilter, setThemeFilter] = useState<"all" | "light" | "dark">("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeModalClient, setActiveModalClient] = useState<any | null>(null);
  const [modalZoomScale, setModalZoomScale] = useState<number>(100);

  // Cloud Inspect API test state (aligned to current PDF/campaign)
  const [activeTestRun, setActiveTestRun] = useState<InspectTestRun | null>(() => getStoredTestRun(currentPdfName));
  const [testHistory, setTestHistory] = useState<InspectTestRun[]>(() => getTestHistory());
  const [historyScopeTab, setHistoryScopeTab] = useState<"current" | "all">("current");
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [customTestIdInput, setCustomTestIdInput] = useState<string>("");
  const [copiedTestId, setCopiedTestId] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testError, setTestError] = useState<string>("");

  const stopPolling = () => {
    setIsTesting(false);
  };

  // Real-time device image completion callback (zero REST API calls required)
  const handleDeviceLoaded = useCallback((clientId: string) => {
    setActiveTestRun((prev) => {
      if (!prev) return prev;
      const alreadyCompleted = prev.results.find((r) => r.clientId === clientId)?.status === "completed";
      if (alreadyCompleted) return prev;

      const updatedResults = prev.results.map((res) => {
        if (res.clientId === clientId) {
          return { ...res, status: "completed" as const };
        }
        return res;
      });
      const completedCount = updatedResults.filter((r) => r.status === "completed").length;
      const allCompleted = completedCount >= updatedResults.length && updatedResults.length > 0;
      const newRun: InspectTestRun = {
        ...prev,
        status: allCompleted ? "completed" : "running",
        completedClients: completedCount,
        results: updatedResults,
      };
      saveStoredTestRun(newRun, currentPdfName);
      saveTestToHistory(newRun, currentPdfName);
      if (allCompleted) {
        setIsTesting(false);
      }
      return newRun;
    });
  }, [currentPdfName]);

  // Auto-sync active test run whenever user switches PDF / campaign project
  useEffect(() => {
    const stored = getStoredTestRun(currentPdfName);
    setActiveTestRun(stored);
    setTestHistory(getTestHistory());
  }, [currentPdfName]);

  const creds = useMemo(() => getApiCredentials(), []);

  // Display clients: map across catalog and include dynamic results
  const allAvailableClients = useMemo(() => {
    if (activeTestRun && activeTestRun.results && activeTestRun.results.length > 0) {
      return EMAIL_CLIENT_CATALOG.map((cat) => {
        const isDark = Boolean(cat.isDarkMode);
        const r = activeTestRun.results.find((res) => {
          if (res.clientId === cat.id) return true;
          const resIsDark = Boolean(res.isDarkMode);
          if (isDark !== resIsDark) return false;
          
          const cleanResId = res.clientId.toLowerCase().replace(/[^a-z0-9]/g, "");
          const cleanCatId = cat.id.toLowerCase().replace(/[^a-z0-9]/g, "");
          if (cleanResId === cleanCatId || cleanResId.includes(cleanCatId) || cleanCatId.includes(cleanResId)) return true;

          const resName = (res.clientName || "").toLowerCase().replace(/[^a-z0-9]/g, "");
          const catName = (cat.name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
          return resName.includes(catName) || catName.includes(resName);
        });

        const effectiveStatus = r ? (r.status as "queued" | "processing" | "completed" | "failed") : ("queued" as const);
        const rawImgUrl = r?.fullScreenshotUrl || r?.thumbnailUrl;

        return {
          ...cat,
          name: cat.name,
          category: cat.category,
          os: cat.version || cat.os,
          version: cat.version,
          isDarkMode: isDark,
          width: cat.width,
          height: cat.height,
          supportsDarkMode: true,
          iconName: cat.category === "mobile" ? "smartphone" : cat.category === "desktop" ? "monitor" : "globe",
          badge: isDark ? "Dark" : "Light",
          screenshotUrl: rawImgUrl,
          thumbnailUrl: r?.thumbnailUrl || rawImgUrl,
          status: effectiveStatus,
        };
      });
    }

    return EMAIL_CLIENT_CATALOG.map((c) => ({
      ...c,
      isDarkMode: Boolean(c.isDarkMode),
      screenshotUrl: undefined,
      thumbnailUrl: undefined,
      status: "queued" as const,
    }));
  }, [activeTestRun]);

  const filteredClients = useMemo(() => {
    return allAvailableClients.filter((c) => {
      const matchCat = selectedCategory === "all" || c.category === selectedCategory;
      const matchTheme =
        themeFilter === "all" ||
        (themeFilter === "dark" && c.isDarkMode) ||
        (themeFilter === "light" && !c.isDarkMode);
      const matchSearch =
        !searchQuery.trim() ||
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.os && c.os.toLowerCase().includes(searchQuery.toLowerCase())) ||
        c.badge.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchTheme && matchSearch;
    });
  }, [allAvailableClients, selectedCategory, themeFilter, searchQuery]);

  // Copy Test ID to clipboard
  const handleCopyTestId = (testId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(testId);
    setCopiedTestId(testId);
    setTimeout(() => setCopiedTestId(null), 2000);
  };

  const [copiedModalUrl, setCopiedModalUrl] = useState<boolean>(false);

  const currentModalIndex = useMemo(() => {
    if (!activeModalClient) return -1;
    return filteredClients.findIndex((c) => c.id === activeModalClient.id);
  }, [activeModalClient, filteredClients]);

  const handlePrevClient = () => {
    if (currentModalIndex > 0) {
      setActiveModalClient(filteredClients[currentModalIndex - 1]);
    } else if (filteredClients.length > 0) {
      setActiveModalClient(filteredClients[filteredClients.length - 1]);
    }
  };

  const handleNextClient = () => {
    if (currentModalIndex >= 0 && currentModalIndex < filteredClients.length - 1) {
      setActiveModalClient(filteredClients[currentModalIndex + 1]);
    } else if (filteredClients.length > 0) {
      setActiveModalClient(filteredClients[0]);
    }
  };

  const handleCopyModalUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedModalUrl(true);
    setTimeout(() => setCopiedModalUrl(false), 2000);
  };

  // Keyboard navigation inside modal
  useEffect(() => {
    if (!activeModalClient) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActiveModalClient(null);
      } else if (e.key === "ArrowLeft") {
        handlePrevClient();
      } else if (e.key === "ArrowRight") {
        handleNextClient();
      } else if (e.key === "+" || e.key === "=") {
        setModalZoomScale((z) => Math.min(180, z + 15));
      } else if (e.key === "-") {
        setModalZoomScale((z) => Math.max(50, z - 15));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeModalClient, currentModalIndex, filteredClients]);

  // Prepare HTML with proper image paths and dark mode styling
  const prepareClientHtml = (client: any, forceDarkMode = false) => {
    if (!htmlContent) return "";

    let prepared = htmlContent;

    // Resolve local asset URLs to the local backend server if pkgPrefix is available
    if (pkgPrefix) {
      prepared = prepared.replace(/src=["'](?:[a-zA-Z]:[/\\][^"']*[/\\]assets[/\\])([^"']+)["']/gi, (_m, fname) => `src="${pkgPrefix}assets/${fname}"`);
      prepared = prepared.replace(/src=["'](?:\.\/)?assets\/([^"']+)["']/gi, (_m, fname) => `src="${pkgPrefix}assets/${fname}"`);
      prepared = prepared.replace(/src=["'](?:\.\/)?(asset_[^"']+)["']/gi, (_m, fname) => `src="${pkgPrefix}assets/${fname}"`);
      prepared = prepared.replace(/url\(['"]?(?:[a-zA-Z]:[/\\][^'")]+[/\\]assets[/\\])([^'")]+)['"]?\)/gi, (_m, fname) => `url('${pkgPrefix}assets/${fname}')`);
      prepared = prepared.replace(/url\(['"]?(?:\.\/)?assets\/([^'")]+)['"]?\)/gi, (_m, fname) => `url('${pkgPrefix}assets/${fname}')`);
      prepared = prepared.replace(/url\(['"]?(?:\.\/)?(asset_[^'")]+)['"]?\)/gi, (_m, fname) => `url('${pkgPrefix}assets/${fname}')`);
    }

    // Inject base href tag if head exists so any relative resources resolve properly
    if (pkgPrefix && prepared.includes("<head>")) {
      prepared = prepared.replace("<head>", `<head><base href="${pkgPrefix}">`);
    }

    // Apply dark mode simulation if active
    if (forceDarkMode || client.isDarkMode) {
      const darkCss = `
        <style id="nocodemail-simulated-dark-theme">
          :root { color-scheme: dark; }
          body { background-color: #121212 !important; color: #e5e5e5 !important; }
        </style>
      `;
      if (prepared.includes("</head>")) {
        prepared = prepared.replace("</head>", `${darkCss}</head>`);
      } else {
        prepared = `${darkCss}${prepared}`;
      }
    }

    return prepared;
  };

  // Trigger real Email on Acid Cloud Test with Base64 image inlining
  const handleStartCloudTest = async () => {
    if (!creds.isConfigured) {
      setTestError("API key not found. Add VITE_EOA_API_KEY & VITE_EOA_PASSWORD in .env.");
      return;
    }

    setIsTesting(true);
    setTestError("");

    try {
      const test = await runMailgunInspectTest(htmlContent, emailSubject || currentPdfName, pkgPrefix, undefined, currentPdfName);
      setActiveTestRun(test);
      setTestHistory(getTestHistory());
    } catch (err: any) {
      setTestError(err.message || "Failed to start inspect test.");
      setIsTesting(false);
    }
  };

  // Manual one-click sync / refresh (single check, no infinite loop)
  const handleManualSync = async () => {
    if (!activeTestRun) return;
    setIsTesting(true);
    setTestError("");
    try {
      const updated = await pollInspectResults(activeTestRun.testId, currentPdfName);
      setActiveTestRun(updated);
      setTestHistory(getTestHistory());
    } catch (e: any) {
      setTestError(e.message || "Failed to refresh screenshots.");
    } finally {
      setIsTesting(false);
    }
  };

  // Switch to a past test run from history
  const handleSelectPastTest = (run: InspectTestRun) => {
    setActiveTestRun(run);
    saveStoredTestRun(run, currentPdfName);
    setIsHistoryOpen(false);
  };

  // Load custom Test ID directly
  const handleFetchCustomTest = async (testIdToLoad?: string) => {
    const tid = (testIdToLoad || customTestIdInput).trim();
    if (!tid) return;

    setIsTesting(true);
    setTestError("");
    try {
      const res = await pollInspectResults(tid, currentPdfName);
      setActiveTestRun(res);
      saveStoredTestRun(res, currentPdfName);
      setTestHistory(getTestHistory());
      setCustomTestIdInput("");
      setIsHistoryOpen(false);
    } catch (e: any) {
      setTestError(e.message || `Failed to load Test ID: ${tid}`);
      setIsTesting(false);
    }
  };

  // Delete test item from history
  const handleDeleteHistoryItem = (e: React.MouseEvent, testId: string) => {
    e.stopPropagation();
    const updated = deleteTestFromHistory(testId, currentPdfName);
    setTestHistory(getTestHistory());
    if (activeTestRun?.testId === testId) {
      const remaining = getTestHistory(currentPdfName);
      setActiveTestRun(remaining.length > 0 ? remaining[0] : null);
    }
  };

  // Clear all history
  const handleClearAllHistory = () => {
    if (confirm("Are you sure you want to clear all test history?")) {
      clearTestHistory();
      setTestHistory([]);
      setActiveTestRun(null);
      setIsHistoryOpen(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "mobile":
        return <Smartphone size={13} />;
      case "desktop":
        return <Monitor size={13} />;
      case "webmail":
        return <Globe size={13} />;
      default:
        return <Sparkles size={13} />;
    }
  };

  const lightCount = allAvailableClients.filter((c) => !c.isDarkMode).length;
  const darkCount = allAvailableClients.filter((c) => c.isDarkMode).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#f1f5f9", overflow: "hidden" }}>
      {/* Top Header Filter Bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 20px",
          background: "#ffffff",
          borderBottom: "1px solid #e2e8f0",
          boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
          zIndex: 10,
          flexWrap: "wrap",
          gap: "10px",
        }}
      >
        {/* Left: Category Filters & Search */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          {/* Category Tabs */}
          <div style={{ display: "flex", background: "#f1f5f9", padding: "2px", borderRadius: "8px", border: "1px solid #e2e8f0", gap: "2px" }}>
            {(["all", "mobile", "desktop", "webmail"] as const).map((cat) => {
              const count = cat === "all" ? allAvailableClients.length : allAvailableClients.filter((c) => c.category === cat).length;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                    padding: "5px 11px",
                    borderRadius: "6px",
                    border: "none",
                    fontSize: "12px",
                    fontWeight: selectedCategory === cat ? "700" : "600",
                    background: selectedCategory === cat ? "#ffffff" : "transparent",
                    color: selectedCategory === cat ? "#4f46e5" : "#64748b",
                    cursor: "pointer",
                    boxShadow: selectedCategory === cat ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                    textTransform: "capitalize",
                    transition: "all 0.12s ease",
                  }}
                >
                  {getCategoryIcon(cat)}
                  <span>{cat}</span>
                  <span style={{ fontSize: "10px", opacity: 0.75 }}>({count})</span>
                </button>
              );
            })}
          </div>

          {/* Theme Filters (All / Light / Dark) */}
          <div style={{ display: "flex", background: "#f1f5f9", padding: "2px", borderRadius: "8px", border: "1px solid #e2e8f0", gap: "2px" }}>
            <button
              type="button"
              onClick={() => setThemeFilter("all")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                padding: "5px 9px",
                borderRadius: "6px",
                border: "none",
                fontSize: "11px",
                fontWeight: themeFilter === "all" ? "700" : "600",
                background: themeFilter === "all" ? "#ffffff" : "transparent",
                color: themeFilter === "all" ? "#0f172a" : "#64748b",
                cursor: "pointer",
              }}
            >
              <span>🌓 All</span>
              <span style={{ fontSize: "9.5px", opacity: 0.75 }}>({allAvailableClients.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setThemeFilter("light")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                padding: "5px 9px",
                borderRadius: "6px",
                border: "none",
                fontSize: "11px",
                fontWeight: themeFilter === "light" ? "700" : "600",
                background: themeFilter === "light" ? "#ffffff" : "transparent",
                color: themeFilter === "light" ? "#d97706" : "#64748b",
                cursor: "pointer",
              }}
            >
              <Sun size={11} color="#d97706" />
              <span>Light</span>
              <span style={{ fontSize: "9.5px", opacity: 0.75 }}>({lightCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setThemeFilter("dark")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                padding: "5px 9px",
                borderRadius: "6px",
                border: "none",
                fontSize: "11px",
                fontWeight: themeFilter === "dark" ? "700" : "600",
                background: themeFilter === "dark" ? "#1e293b" : "transparent",
                color: themeFilter === "dark" ? "#f8fafc" : "#64748b",
                cursor: "pointer",
              }}
            >
              <Moon size={11} color={themeFilter === "dark" ? "#a5b4fc" : "#64748b"} />
              <span>Dark</span>
              <span style={{ fontSize: "9.5px", opacity: 0.75 }}>({darkCount})</span>
            </button>
          </div>

          {/* Search Input */}
          <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
            <Search size={13} color="#94a3b8" style={{ position: "absolute", left: "9px", pointerEvents: "none" }} />
            <input
              type="text"
              placeholder="Search clients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                padding: "5px 10px 5px 28px",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                fontSize: "11.5px",
                outline: "none",
                background: "#ffffff",
                width: "150px",
              }}
            />
          </div>
        </div>

        {/* Right: History & Cloud Test Button */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {/* History Button */}
          <button
            type="button"
            onClick={() => {
              setTestHistory(getTestHistory());
              setIsHistoryOpen(true);
            }}
            title="View Test History & Past Runs"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "5px 11px",
              borderRadius: "6px",
              border: "1px solid #cbd5e1",
              background: "#ffffff",
              color: "#334155",
              cursor: "pointer",
              fontSize: "11.5px",
              fontWeight: "600",
              transition: "all 0.12s ease",
            }}
          >
            <History size={13} color="#4f46e5" />
            <span>History</span>
            {testHistory.length > 0 && (
              <span
                style={{
                  background: "#e0e7ff",
                  color: "#4338ca",
                  fontSize: "10px",
                  fontWeight: "700",
                  padding: "1px 6px",
                  borderRadius: "10px",
                }}
              >
                {testHistory.length}
              </span>
            )}
          </button>

          {/* Cloud Inspect Test Trigger */}
          <button
            type="button"
            onClick={handleStartCloudTest}
            disabled={isTesting}
            title={creds.isConfigured ? "Run real render test via Email on Acid" : "Add VITE_EOA_API_KEY & VITE_EOA_PASSWORD in .env"}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 13px",
              borderRadius: "7px",
              border: "none",
              background: isTesting ? "#94a3b8" : "linear-gradient(135deg, #4f46e5, #6366f1)",
              color: "#ffffff",
              fontWeight: "700",
              fontSize: "11.5px",
              cursor: isTesting ? "not-allowed" : "pointer",
              boxShadow: "0 2px 6px rgba(79, 70, 229, 0.25)",
            }}
          >
            <Play size={12} fill="#ffffff" />
            <span>{isTesting ? "Testing..." : "Run Cloud Test"}</span>
          </button>
        </div>
      </div>

      {/* Optional Warning Banner if Test Error */}
      {testError && (
        <div style={{ padding: "8px 20px", background: "#fef2f2", borderBottom: "1px solid #fecaca", color: "#dc2626", fontSize: "11.5px", fontWeight: "600", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span>⚠️ {testError}</span>
          <button type="button" onClick={() => setTestError("")} style={{ border: "none", background: "transparent", color: "#dc2626", cursor: "pointer" }}>✕</button>
        </div>
      )}

      {/* Cloud Test Progress Banner */}
      {activeTestRun && (
        <div
          style={{
            padding: "8px 20px",
            background: activeTestRun.status === "completed" ? "#f0fdf4" : "#eff6ff",
            borderBottom: `1px solid ${activeTestRun.status === "completed" ? "#bbf7d0" : "#bfdbfe"}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "12px", fontWeight: "700", color: activeTestRun.status === "completed" ? "#15803d" : "#1d4ed8" }}>
              {activeTestRun.status === "completed" ? `✓ Email on Acid Test Ready (${activeTestRun.completedClients}/${activeTestRun.totalClients})` : `⚡ Email on Acid Test in Progress (${activeTestRun.completedClients}/${activeTestRun.totalClients} ready)`}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "#ffffff", padding: "2px 8px", borderRadius: "5px", border: "1px solid #cbd5e1" }}>
              <span style={{ fontSize: "11px", color: "#475569", fontFamily: "monospace" }}>ID: {activeTestRun.testId}</span>
              <button
                type="button"
                onClick={() => handleCopyTestId(activeTestRun.testId)}
                title="Copy Test ID"
                style={{ border: "none", background: "transparent", cursor: "pointer", color: "#64748b", display: "flex", alignItems: "center", padding: "2px" }}
              >
                {copiedTestId === activeTestRun.testId ? <Check size={11} color="#16a34a" /> : <Copy size={11} />}
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                setTestHistory(getTestHistory());
                setIsHistoryOpen(true);
              }}
              style={{
                border: "none",
                background: "transparent",
                color: "#4f46e5",
                fontSize: "11px",
                fontWeight: "600",
                cursor: "pointer",
                textDecoration: "underline",
                padding: "0 4px",
              }}
            >
              Switch Test ({testHistory.length})
            </button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              type="button"
              onClick={handleManualSync}
              disabled={isTesting}
              title="Sync Latest Screenshots from Cloud"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                padding: "4px 9px",
                borderRadius: "5px",
                background: "#ffffff",
                color: "#334155",
                fontSize: "11px",
                fontWeight: "600",
                cursor: isTesting ? "not-allowed" : "pointer",
              }}
            >
              <RotateCcw size={11} className={isTesting ? "animate-spin" : ""} />
              <span>{isTesting ? "Syncing..." : "Sync Renders"}</span>
            </button>
            {isTesting && (
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "11.5px", fontWeight: "600", color: "#2563eb", display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", background: "#2563eb", animation: "pulse 1.5s infinite" }}></span>
                  Checking...
                </span>
                <button
                  type="button"
                  onClick={stopPolling}
                  title="Stop automatic polling"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "3px",
                    padding: "3px 7px",
                    borderRadius: "4px",
                    border: "1px solid #fca5a5",
                    background: "#fef2f2",
                    color: "#dc2626",
                    fontSize: "10.5px",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  <Square size={9} fill="#dc2626" />
                  <span>Stop</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Full Page Card Grid View */}
      <div style={{ flex: 1, padding: "24px 20px", overflowY: "auto" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
            gap: "20px",
            maxWidth: "1600px",
            margin: "0 auto",
          }}
        >
          {filteredClients.map((client) => {
            const clientHtml = prepareClientHtml(client);
            const screenshotUrl = client.screenshotUrl || client.thumbnailUrl;

            return (
              <div
                key={client.id}
                onClick={() => setActiveModalClient(client)}
                style={{
                  background: client.isDarkMode ? "#1e293b" : "#ffffff",
                  borderRadius: "10px",
                  border: client.isDarkMode ? "1px solid #334155" : "1px solid #e2e8f0",
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)",
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                  cursor: "pointer",
                  transition: "transform 0.15s ease, box-shadow 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 8px 20px rgba(0, 0, 0, 0.1)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.05)";
                }}
              >
                {/* Card Header */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 14px",
                    background: client.isDarkMode ? "#0f172a" : "#f8fafc",
                    borderBottom: client.isDarkMode ? "1px solid #334155" : "1px solid #e2e8f0",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div
                      style={{
                        width: "24px",
                        height: "24px",
                        borderRadius: "5px",
                        background: "#4f46e5",
                        color: "#ffffff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {getCategoryIcon(client.category)}
                    </div>
                    <div>
                      <div style={{ fontSize: "12px", fontWeight: "700", color: client.isDarkMode ? "#f8fafc" : "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "180px" }}>
                        {client.name}
                      </div>
                      <div style={{ fontSize: "10px", color: client.isDarkMode ? "#94a3b8" : "#64748b" }}>
                        {client.os || client.version}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    {/* Theme Badge */}
                    <span
                      style={{
                        fontSize: "9.5px",
                        fontWeight: "700",
                        padding: "2px 6px",
                        borderRadius: "4px",
                        background: client.isDarkMode ? "#312e81" : "#fef3c7",
                        color: client.isDarkMode ? "#c7d2fe" : "#b45309",
                        border: client.isDarkMode ? "1px solid #4338ca" : "1px solid #fde68a",
                        display: "flex",
                        alignItems: "center",
                        gap: "3px",
                      }}
                    >
                      {client.isDarkMode ? <Moon size={9} /> : <Sun size={9} />}
                      {client.isDarkMode ? "Dark" : "Light"}
                    </span>

                    {screenshotUrl && (
                      <span style={{ fontSize: "9px", fontWeight: "700", padding: "2px 5px", borderRadius: "4px", background: "#dcfce7", color: "#15803d" }}>
                        ☁️ EoA
                      </span>
                    )}

                    <Maximize2 size={13} color={client.isDarkMode ? "#94a3b8" : "#64748b"} />
                  </div>
                </div>

                <div
                  style={{
                    height: "360px",
                    overflow: "hidden",
                    position: "relative",
                    background: client.isDarkMode ? "#0f172a" : "#f8fafc",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <CardScreenshotPreview
                    client={client}
                    screenshotUrl={screenshotUrl}
                    isTestActive={Boolean(activeTestRun || isTesting)}
                    isDarkMode={client.isDarkMode}
                    onDeviceLoaded={handleDeviceLoaded}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Full-Screen Detailed Render Modal on Card Click */}
      {activeModalClient && (() => {
        const modalHtml = prepareClientHtml(activeModalClient);
        const isDarkClient = Boolean(activeModalClient.isDarkMode);
        const modalResult = activeTestRun?.results.find(
          (r) => r.clientId === activeModalClient.id || r.clientName.toLowerCase().includes(activeModalClient.name.toLowerCase())
        );
        const isClientComplete = activeModalClient.status === "completed" || modalResult?.status === "completed";
        const modalScreenshot = isClientComplete
          ? (activeModalClient.screenshotUrl || modalResult?.fullScreenshotUrl || modalResult?.thumbnailUrl)
          : undefined;

        const isMobileDevice = activeModalClient.category === "mobile";
        const containerWidth = isMobileDevice
          ? Math.min(Math.max(activeModalClient.width || 390, 375), 440)
          : Math.min(Math.max(activeModalClient.width || 700, 680), 920);

        return (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(15, 23, 42, 0.55)",
              backdropFilter: "blur(8px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 9999,
              padding: "16px",
              animation: "fadeIn 0.15s ease-out",
            }}
            onClick={() => setActiveModalClient(null)}
          >
            {/* Side Navigation Arrow: Previous */}
            {filteredClients.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrevClient();
                }}
                title="Previous Device (Left Arrow)"
                style={{
                  position: "absolute",
                  left: "20px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: "44px",
                  height: "44px",
                  borderRadius: "50%",
                  backgroundColor: "#ffffff",
                  border: "1px solid #e2e8f0",
                  color: "#334155",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  boxShadow: "0 8px 24px rgba(0, 0, 0, 0.12)",
                  zIndex: 10001,
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#4f46e5";
                  e.currentTarget.style.color = "#ffffff";
                  e.currentTarget.style.borderColor = "#4f46e5";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#ffffff";
                  e.currentTarget.style.color = "#334155";
                  e.currentTarget.style.borderColor = "#e2e8f0";
                }}
              >
                <ChevronLeft size={24} />
              </button>
            )}

            {/* Side Navigation Arrow: Next */}
            {filteredClients.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleNextClient();
                }}
                title="Next Device (Right Arrow)"
                style={{
                  position: "absolute",
                  right: "20px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: "44px",
                  height: "44px",
                  borderRadius: "50%",
                  backgroundColor: "#ffffff",
                  border: "1px solid #e2e8f0",
                  color: "#334155",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  boxShadow: "0 8px 24px rgba(0, 0, 0, 0.12)",
                  zIndex: 10001,
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#4f46e5";
                  e.currentTarget.style.color = "#ffffff";
                  e.currentTarget.style.borderColor = "#4f46e5";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#ffffff";
                  e.currentTarget.style.color = "#334155";
                  e.currentTarget.style.borderColor = "#e2e8f0";
                }}
              >
                <ChevronRight size={24} />
              </button>
            )}

            {/* Modal Dialog Card */}
            <div
              style={{
                width: "94vw",
                maxWidth: "1180px",
                height: "92vh",
                backgroundColor: "#ffffff",
                borderRadius: "16px",
                boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                position: "relative",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Top Header Bar */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "14px 20px",
                  backgroundColor: "#ffffff",
                  borderBottom: "1px solid #e2e8f0",
                  gap: "12px",
                  flexWrap: "wrap",
                }}
              >
                {/* Device Title & Badges */}
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div
                    style={{
                      width: "38px",
                      height: "38px",
                      borderRadius: "10px",
                      background: isMobileDevice
                        ? "linear-gradient(135deg, #4f46e5, #7c3aed)"
                        : "linear-gradient(135deg, #0284c7, #2563eb)",
                      color: "#ffffff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 4px 12px rgba(79, 70, 229, 0.25)",
                    }}
                  >
                    {getCategoryIcon(activeModalClient.category)}
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "700", color: "#0f172a" }}>
                        {activeModalClient.name}
                      </h3>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: "700",
                          padding: "2px 8px",
                          borderRadius: "12px",
                          backgroundColor: isDarkClient ? "rgba(99, 102, 241, 0.1)" : "rgba(245, 158, 11, 0.15)",
                          color: isDarkClient ? "#4f46e5" : "#d97706",
                          border: isDarkClient ? "1px solid rgba(99, 102, 241, 0.25)" : "1px solid rgba(245, 158, 11, 0.3)",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        {isDarkClient ? <Moon size={11} /> : <Sun size={11} />}
                        {isDarkClient ? "Dark Mode" : "Light Mode"}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "2px" }}>
                      <span style={{ fontSize: "12px", color: "#64748b" }}>
                        {activeModalClient.version || activeModalClient.os} • {activeModalClient.width}px standard width
                      </span>
                      {modalScreenshot && (
                        <span
                          style={{
                            fontSize: "10.5px",
                            fontWeight: "600",
                            color: "#059669",
                            backgroundColor: "#ecfdf5",
                            border: "1px solid #a7f3d0",
                            padding: "1px 6px",
                            borderRadius: "4px",
                          }}
                        >
                          ✓ Full Render
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Center Device Carousel Switcher */}
                {filteredClients.length > 1 && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      backgroundColor: "#f8fafc",
                      borderRadius: "8px",
                      border: "1px solid #e2e8f0",
                      padding: "2px",
                    }}
                  >
                    <button
                      type="button"
                      onClick={handlePrevClient}
                      title="Previous (Left Arrow)"
                      style={{
                        padding: "5px 10px",
                        border: "none",
                        backgroundColor: "transparent",
                        color: "#475569",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        fontSize: "12px",
                        fontWeight: "600",
                        borderRadius: "6px",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#ffffff";
                        e.currentTarget.style.color = "#0f172a";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                        e.currentTarget.style.color = "#475569";
                      }}
                    >
                      <ChevronLeft size={14} />
                      <span>Prev</span>
                    </button>
                    <span
                      style={{
                        fontSize: "12px",
                        fontWeight: "700",
                        color: "#0f172a",
                        padding: "0 10px",
                        borderLeft: "1px solid #e2e8f0",
                        borderRight: "1px solid #e2e8f0",
                      }}
                    >
                      {currentModalIndex + 1} / {filteredClients.length}
                    </span>
                    <button
                      type="button"
                      onClick={handleNextClient}
                      title="Next (Right Arrow)"
                      style={{
                        padding: "5px 10px",
                        border: "none",
                        backgroundColor: "transparent",
                        color: "#475569",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        fontSize: "12px",
                        fontWeight: "600",
                        borderRadius: "6px",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#ffffff";
                        e.currentTarget.style.color = "#0f172a";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                        e.currentTarget.style.color = "#475569";
                      }}
                    >
                      <span>Next</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                )}

                {/* Right Action Tools & Zoom */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  {/* Zoom Controller */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      backgroundColor: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                      overflow: "hidden",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setModalZoomScale((z) => Math.max(50, z - 15))}
                      style={{ padding: "6px 9px", border: "none", backgroundColor: "transparent", cursor: "pointer", color: "#64748b" }}
                      title="Zoom Out (-)"
                    >
                      <ZoomOut size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setModalZoomScale(100)}
                      title="Reset Zoom to 100%"
                      style={{
                        fontSize: "11.5px",
                        fontWeight: "700",
                        color: "#0f172a",
                        padding: "0 6px",
                        minWidth: "46px",
                        textAlign: "center",
                        border: "none",
                        backgroundColor: "transparent",
                        cursor: "pointer",
                      }}
                    >
                      {modalZoomScale}%
                    </button>
                    <button
                      type="button"
                      onClick={() => setModalZoomScale((z) => Math.min(180, z + 15))}
                      style={{ padding: "6px 9px", border: "none", backgroundColor: "transparent", cursor: "pointer", color: "#64748b" }}
                      title="Zoom In (+)"
                    >
                      <ZoomIn size={14} />
                    </button>
                  </div>

                  {/* Copy Image URL */}
                  {modalScreenshot && (
                    <button
                      type="button"
                      onClick={() => handleCopyModalUrl(modalScreenshot)}
                      title="Copy Screenshot Image URL"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "5px",
                        padding: "6px 12px",
                        borderRadius: "8px",
                        backgroundColor: copiedModalUrl ? "#ecfdf5" : "#f1f5f9",
                        color: copiedModalUrl ? "#059669" : "#334155",
                        border: copiedModalUrl ? "1px solid #a7f3d0" : "1px solid #e2e8f0",
                        fontSize: "12px",
                        fontWeight: "600",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      {copiedModalUrl ? <Check size={13} /> : <Copy size={13} />}
                      <span>{copiedModalUrl ? "Copied!" : "Copy URL"}</span>
                    </button>
                  )}

                  {/* Open Hi-Res Original */}
                  {modalScreenshot && (
                    <a
                      href={modalScreenshot}
                      target="_blank"
                      rel="noreferrer"
                      title="Open Full Image in New Tab"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "5px",
                        padding: "6px 12px",
                        borderRadius: "8px",
                        backgroundColor: "#4f46e5",
                        color: "#ffffff",
                        textDecoration: "none",
                        fontSize: "12px",
                        fontWeight: "600",
                        boxShadow: "0 2px 6px rgba(79, 70, 229, 0.25)",
                      }}
                    >
                      <ExternalLink size={13} />
                      <span>Original</span>
                    </a>
                  )}

                  {/* Close Modal Button */}
                  <button
                    type="button"
                    onClick={() => setActiveModalClient(null)}
                    title="Close Preview (Esc)"
                    style={{
                      border: "none",
                      backgroundColor: "#f1f5f9",
                      color: "#475569",
                      borderRadius: "8px",
                      width: "34px",
                      height: "34px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                      marginLeft: "4px",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#fee2e2";
                      e.currentTarget.style.color = "#ef4444";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "#f1f5f9";
                      e.currentTarget.style.color = "#475569";
                    }}
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Modal Body Canvas: High-Resolution Device Simulation Mockup */}
              <div
                style={{
                  flex: 1,
                  padding: "32px 24px",
                  overflowY: "auto",
                  overflowX: "auto",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "flex-start",
                  backgroundColor: "#f8fafc",
                  backgroundImage: "radial-gradient(#e2e8f0 1.2px, transparent 1.2px)",
                  backgroundSize: "20px 20px",
                }}
              >
                <div
                  style={{
                    transform: `scale(${modalZoomScale / 100})`,
                    transformOrigin: "top center",
                    transition: "transform 0.15s cubic-bezier(0.4, 0, 0.2, 1)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    marginBottom: "60px",
                  }}
                >
                  {/* REALISTIC DEVICE FRAME */}
                  {isMobileDevice ? (
                    // SMARTPHONE DEVICE FRAME
                    <div
                      style={{
                        width: `${containerWidth}px`,
                        backgroundColor: "#1e293b",
                        borderRadius: "44px",
                        padding: "12px",
                        boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.3), 0 0 0 2px rgba(255, 255, 255, 0.8)",
                        position: "relative",
                      }}
                    >
                      {/* Top Dynamic Island / Camera Notch */}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "center",
                          alignItems: "center",
                          height: "22px",
                          marginBottom: "8px",
                        }}
                      >
                        <div
                          style={{
                            width: "110px",
                            height: "18px",
                            backgroundColor: "#020617",
                            borderRadius: "12px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "0 10px",
                          }}
                        >
                          <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#334155" }} />
                          <div style={{ width: "36px", height: "4px", borderRadius: "2px", backgroundColor: "#334155" }} />
                          <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#1e293b" }} />
                        </div>
                      </div>

                      {/* Screen Content Wrapper */}
                      <div
                        style={{
                          borderRadius: "32px",
                          overflow: "hidden",
                          backgroundColor: isDarkClient ? "#121212" : "#ffffff",
                          boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.08)",
                        }}
                      >
                        {modalScreenshot ? (
                          <img
                            src={modalScreenshot}
                            alt={activeModalClient.name}
                            style={{
                              width: "100%",
                              display: "block",
                              height: "auto",
                              imageRendering: "-webkit-optimize-contrast",
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              padding: "48px 24px",
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              justifyContent: "center",
                              textAlign: "center",
                              gap: "14px",
                              background: isDarkClient ? "#0f172a" : "#f8fafc",
                              color: isDarkClient ? "#f8fafc" : "#0f172a",
                            }}
                          >
                            <div
                              style={{
                                width: "60px",
                                height: "60px",
                                borderRadius: "16px",
                                background: isDarkClient ? "#1e293b" : "#e0e7ff",
                                color: isDarkClient ? "#cbd5e1" : "#4f46e5",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <Smartphone size={30} />
                            </div>
                            <div>
                              <h3 style={{ margin: "0 0 4px", fontSize: "16px", fontWeight: "700" }}>{activeModalClient.name}</h3>
                              <p style={{ margin: 0, fontSize: "11.5px", color: isDarkClient ? "#94a3b8" : "#64748b" }}>
                                {activeModalClient.os || activeModalClient.version} • {activeModalClient.width} × {activeModalClient.height} px
                              </p>
                            </div>
                            <span style={{ fontSize: "11px", color: isDarkClient ? "#94a3b8" : "#64748b", maxWidth: "260px", lineHeight: "1.4" }}>
                              No cloud render captured yet for <strong>{currentPdfName}</strong>.
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setActiveModalClient(null);
                                handleStartCloudTest();
                              }}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                                padding: "8px 16px",
                                borderRadius: "7px",
                                border: "none",
                                background: "#4f46e5",
                                color: "#ffffff",
                                fontWeight: "700",
                                fontSize: "11.5px",
                                cursor: "pointer",
                                boxShadow: "0 2px 6px rgba(79, 70, 229, 0.25)",
                              }}
                            >
                              <Play size={11} fill="#ffffff" />
                              <span>Run Cloud Test</span>
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Bottom Home Indicator Bar */}
                      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "18px", marginTop: "8px" }}>
                        <div style={{ width: "120px", height: "4px", backgroundColor: "#64748b", borderRadius: "2px" }} />
                      </div>
                    </div>
                  ) : (
                    // DESKTOP & WEBMAIL BROWSER WINDOW FRAME
                    <div
                      style={{
                        width: `${containerWidth}px`,
                        backgroundColor: "#ffffff",
                        borderRadius: "12px",
                        overflow: "hidden",
                        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.18), 0 0 0 1px rgba(0, 0, 0, 0.08)",
                        border: "1px solid #cbd5e1",
                      }}
                    >
                      {/* Browser Window Chrome Top Bar */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "10px 16px",
                          backgroundColor: "#f1f5f9",
                          borderBottom: "1px solid #e2e8f0",
                        }}
                      >
                        {/* Traffic Light Dots */}
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <div style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "#ef4444" }} />
                          <div style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "#f59e0b" }} />
                          <div style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "#10b981" }} />
                        </div>

                        {/* Browser Fake URL Bar */}
                        <div
                          style={{
                            backgroundColor: "#ffffff",
                            borderRadius: "6px",
                            padding: "3px 16px",
                            fontSize: "11px",
                            color: "#64748b",
                            border: "1px solid #cbd5e1",
                            minWidth: "260px",
                            textAlign: "center",
                            fontFamily: "monospace",
                          }}
                        >
                          https://mail.{activeModalClient.category === "webmail" ? "google" : "preview"}.com/inbox/preview
                        </div>

                        <div style={{ width: "42px" }} />
                      </div>

                      {/* Desktop Screenshot Content */}
                      <div
                        style={{
                          backgroundColor: isDarkClient ? "#121212" : "#ffffff",
                          width: "100%",
                        }}
                      >
                        {modalScreenshot ? (
                          <img
                            src={modalScreenshot}
                            alt={activeModalClient.name}
                            style={{
                              width: "100%",
                              display: "block",
                              height: "auto",
                              imageRendering: "-webkit-optimize-contrast",
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              padding: "60px 24px",
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              justifyContent: "center",
                              textAlign: "center",
                              gap: "14px",
                              background: isDarkClient ? "#0f172a" : "#f8fafc",
                              color: isDarkClient ? "#f8fafc" : "#0f172a",
                            }}
                          >
                            <div
                              style={{
                                width: "60px",
                                height: "60px",
                                borderRadius: "16px",
                                background: isDarkClient ? "#1e293b" : "#e0e7ff",
                                color: isDarkClient ? "#cbd5e1" : "#4f46e5",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              {activeModalClient.category === "desktop" ? <Monitor size={30} /> : <Globe size={30} />}
                            </div>
                            <div>
                              <h3 style={{ margin: "0 0 4px", fontSize: "16px", fontWeight: "700" }}>{activeModalClient.name}</h3>
                              <p style={{ margin: 0, fontSize: "11.5px", color: isDarkClient ? "#94a3b8" : "#64748b" }}>
                                {activeModalClient.os || activeModalClient.version} • {activeModalClient.width} × {activeModalClient.height} px
                              </p>
                            </div>
                            <span style={{ fontSize: "11px", color: isDarkClient ? "#94a3b8" : "#64748b", maxWidth: "300px", lineHeight: "1.4" }}>
                              No cloud render captured yet for <strong>{currentPdfName}</strong>.
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setActiveModalClient(null);
                                handleStartCloudTest();
                              }}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                                padding: "8px 16px",
                                borderRadius: "7px",
                                border: "none",
                                background: "#4f46e5",
                                color: "#ffffff",
                                fontWeight: "700",
                                fontSize: "11.5px",
                                cursor: "pointer",
                                boxShadow: "0 2px 6px rgba(79, 70, 229, 0.25)",
                              }}
                            >
                              <Play size={11} fill="#ffffff" />
                              <span>Run Cloud Test</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Bottom Keyboard Shortcuts & Info Bar */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 20px",
                  backgroundColor: "#ffffff",
                  borderTop: "1px solid #e2e8f0",
                  fontSize: "11.5px",
                  color: "#64748b",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                  <span>
                    Keyboard: <strong style={{ color: "#0f172a" }}>← / →</strong> Switch Device •{" "}
                    <strong style={{ color: "#0f172a" }}>+ / -</strong> Zoom • <strong style={{ color: "#0f172a" }}>Esc</strong> Close
                  </span>
                </div>
                <div>
                  <span>
                    Engine:{" "}
                    <strong style={{ color: "#0f172a" }}>
                      {activeModalClient.category === "mobile"
                        ? "WebKit / Blink Mobile"
                        : activeModalClient.name.includes("Outlook") && !activeModalClient.name.includes("Mac")
                        ? "Microsoft Word (MSO)"
                        : "Desktop WebKit / Blink"}
                    </strong>
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Test History Modal */}
      {isHistoryOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(4px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={() => setIsHistoryOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: "700px",
              maxHeight: "85vh",
              background: "#ffffff",
              borderRadius: "14px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              border: "1px solid #e2e8f0",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "16px 22px",
                borderBottom: "1px solid #e2e8f0",
                background: "#f8fafc",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ background: "#e0e7ff", padding: "8px", borderRadius: "8px", color: "#4f46e5" }}>
                  <History size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "#0f172a" }}>Cloud Test History & Runs</h3>
                  <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#64748b" }}>
                    Switch between past render test runs or load any Email on Acid / Mailgun Test ID
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsHistoryOpen(false)}
                style={{
                  border: "none",
                  background: "#e2e8f0",
                  color: "#475569",
                  borderRadius: "6px",
                  width: "30px",
                  height: "30px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ padding: "20px 22px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "18px" }}>
              {/* Load by Test ID Form */}
              <div
                style={{
                  background: "#f1f5f9",
                  padding: "14px 16px",
                  borderRadius: "10px",
                  border: "1px solid #e2e8f0",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                }}
              >
                <label style={{ fontSize: "12px", fontWeight: "700", color: "#334155" }}>
                  Load Any Existing Test ID:
                </label>
                <div style={{ display: "flex", gap: "8px" }}>
                  <input
                    type="text"
                    placeholder="Paste Test ID (e.g. ChnIzsPLQyltTPzEOQtj7QiRYysNiSYauYN3gLTqGMJpV)"
                    value={customTestIdInput}
                    onChange={(e) => setCustomTestIdInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleFetchCustomTest();
                    }}
                    style={{
                      flex: 1,
                      padding: "8px 12px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      fontSize: "12px",
                      fontFamily: "monospace",
                      outline: "none",
                      background: "#ffffff",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => handleFetchCustomTest()}
                    disabled={isTesting || !customTestIdInput.trim()}
                    style={{
                      padding: "8px 14px",
                      borderRadius: "6px",
                      border: "none",
                      background: isTesting || !customTestIdInput.trim() ? "#94a3b8" : "#4f46e5",
                      color: "#ffffff",
                      fontSize: "12px",
                      fontWeight: "600",
                      cursor: isTesting || !customTestIdInput.trim() ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {isTesting ? <RotateCcw size={12} className="animate-spin" /> : <ArrowRight size={12} />}
                    <span>{isTesting ? "Fetching..." : "Fetch & Load"}</span>
                  </button>
                </div>
              </div>

              {/* Past Test Runs List */}
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
                  <div style={{ display: "flex", background: "#f1f5f9", padding: "3px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                    <button
                      type="button"
                      onClick={() => setHistoryScopeTab("current")}
                      style={{
                        padding: "4px 10px",
                        borderRadius: "6px",
                        border: "none",
                        background: historyScopeTab === "current" ? "#ffffff" : "transparent",
                        color: historyScopeTab === "current" ? "#4f46e5" : "#64748b",
                        fontSize: "11.5px",
                        fontWeight: "700",
                        cursor: "pointer",
                        boxShadow: historyScopeTab === "current" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                        display: "flex",
                        alignItems: "center",
                        gap: "5px",
                      }}
                    >
                      <FileText size={12} />
                      <span>This PDF ({testHistory.filter((r) => normalizePdfKey(r.pdfName) === normalizePdfKey(currentPdfName) || normalizePdfKey(r.subject) === normalizePdfKey(currentPdfName)).length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setHistoryScopeTab("all")}
                      style={{
                        padding: "4px 10px",
                        borderRadius: "6px",
                        border: "none",
                        background: historyScopeTab === "all" ? "#ffffff" : "transparent",
                        color: historyScopeTab === "all" ? "#4f46e5" : "#64748b",
                        fontSize: "11.5px",
                        fontWeight: "700",
                        cursor: "pointer",
                        boxShadow: historyScopeTab === "all" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                        display: "flex",
                        alignItems: "center",
                        gap: "5px",
                      }}
                    >
                      <Globe size={12} />
                      <span>All Runs ({testHistory.length})</span>
                    </button>
                  </div>

                  {testHistory.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearAllHistory}
                      style={{
                        border: "none",
                        background: "transparent",
                        color: "#ef4444",
                        fontSize: "11.5px",
                        fontWeight: "600",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <Trash2 size={12} />
                      <span>Clear All</span>
                    </button>
                  )}
                </div>

                {(() => {
                  const runsToShow = historyScopeTab === "current"
                    ? testHistory.filter((r) => normalizePdfKey(r.pdfName) === normalizePdfKey(currentPdfName) || normalizePdfKey(r.subject) === normalizePdfKey(currentPdfName))
                    : testHistory;

                  if (runsToShow.length === 0) {
                    return (
                      <div
                        style={{
                          padding: "36px 20px",
                          textAlign: "center",
                          background: "#f8fafc",
                          borderRadius: "10px",
                          border: "1px dashed #cbd5e1",
                        }}
                      >
                        <Inbox size={32} color="#94a3b8" style={{ margin: "0 auto 8px" }} />
                        <p style={{ margin: 0, fontSize: "13px", fontWeight: "600", color: "#475569" }}>
                          {historyScopeTab === "current" ? `No saved test runs for ${currentPdfName}` : "No test runs saved yet"}
                        </p>
                        <p style={{ margin: "4px 0 0", fontSize: "11.5px", color: "#94a3b8" }}>
                          Click "Run Cloud Test" to test this email across real email clients.
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      {runsToShow.map((run) => {
                        const isActive = activeTestRun?.testId === run.testId;
                        const isThisPdf = normalizePdfKey(run.pdfName) === normalizePdfKey(currentPdfName) || normalizePdfKey(run.subject) === normalizePdfKey(currentPdfName);
                        const readyCount = run.completedClients ?? run.results.filter((r) => r.status === "completed" || Boolean(r.fullScreenshotUrl || r.thumbnailUrl)).length;
                        const isComplete = run.status === "completed" || readyCount >= 12;

                        return (
                          <div
                            key={run.testId}
                            onClick={() => handleSelectPastTest(run)}
                            style={{
                              padding: "12px 16px",
                              borderRadius: "10px",
                              border: isActive ? "2px solid #4f46e5" : "1px solid #e2e8f0",
                              background: isActive ? "#f5f3ff" : "#ffffff",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              cursor: "pointer",
                              transition: "all 0.12s ease",
                              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                            }}
                          >
                            <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                              {/* PDF / Campaign Badge */}
                              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                                <span
                                  style={{
                                    fontSize: "11.5px",
                                    fontWeight: "700",
                                    background: isThisPdf ? "#e0f2fe" : "#f1f5f9",
                                    color: isThisPdf ? "#0369a1" : "#475569",
                                    padding: "2px 8px",
                                    borderRadius: "5px",
                                    border: isThisPdf ? "1px solid #bae6fd" : "1px solid #e2e8f0",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "5px",
                                  }}
                                >
                                  <FileText size={11} color={isThisPdf ? "#0284c7" : "#64748b"} />
                                  <span>{run.pdfName || run.subject || "Email Campaign"}</span>
                                </span>
                                {isThisPdf && (
                                  <span
                                    style={{
                                      fontSize: "9.5px",
                                      fontWeight: "700",
                                      background: "#dcfce7",
                                      color: "#15803d",
                                      padding: "1px 6px",
                                      borderRadius: "4px",
                                      border: "1px solid #bbf7d0",
                                    }}
                                  >
                                    CURRENT PDF
                                  </span>
                                )}
                                {isActive && (
                                  <span
                                    style={{
                                      fontSize: "9.5px",
                                      fontWeight: "700",
                                      background: "#4f46e5",
                                      color: "#ffffff",
                                      padding: "1px 6px",
                                      borderRadius: "4px",
                                    }}
                                  >
                                    VIEWING
                                  </span>
                                )}
                              </div>

                              <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "4px", background: "#f1f5f9", padding: "2px 6px", borderRadius: "4px" }}>
                                  <span style={{ fontSize: "11px", color: "#475569", fontFamily: "monospace" }}>
                                    {run.testId.length > 24 ? `${run.testId.substring(0, 24)}...` : run.testId}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => handleCopyTestId(run.testId, e)}
                                    title="Copy Test ID"
                                    style={{ border: "none", background: "transparent", cursor: "pointer", color: "#64748b", display: "flex", alignItems: "center", padding: "1px" }}
                                  >
                                    {copiedTestId === run.testId ? <Check size={11} color="#16a34a" /> : <Copy size={11} />}
                                  </button>
                                </div>
                                <span style={{ fontSize: "11px", color: "#94a3b8", display: "flex", alignItems: "center", gap: "3px" }}>
                                  <Clock size={11} />
                                  {run.createdAt ? new Date(run.createdAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "Recent"}
                                </span>
                              </div>
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              <span
                                style={{
                                  fontSize: "11px",
                                  fontWeight: "700",
                                  padding: "3px 8px",
                                  borderRadius: "6px",
                                  background: isComplete ? "#dcfce7" : "#dbeafe",
                                  color: isComplete ? "#15803d" : "#1d4ed8",
                                }}
                              >
                                {readyCount}/{EMAIL_CLIENT_CATALOG.length} Ready
                              </span>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelectPastTest(run);
                                }}
                                style={{
                                  padding: "6px 12px",
                                  borderRadius: "6px",
                                  border: "none",
                                  background: isActive ? "#4f46e5" : "#e2e8f0",
                                  color: isActive ? "#ffffff" : "#334155",
                                  fontSize: "11.5px",
                                  fontWeight: "600",
                                  cursor: "pointer",
                                }}
                              >
                                {isActive ? "Viewing" : "Load Run"}
                              </button>

                              <button
                                type="button"
                                onClick={(e) => handleDeleteHistoryItem(e, run.testId)}
                                title="Delete this test from history"
                                style={{
                                  border: "none",
                                  background: "transparent",
                                  color: "#94a3b8",
                                  cursor: "pointer",
                                  padding: "6px",
                                  borderRadius: "4px",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.color = "#ef4444")}
                                onMouseLeave={(e) => (e.currentTarget.style.color = "#94a3b8")}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                padding: "12px 22px",
                borderTop: "1px solid #e2e8f0",
                background: "#f8fafc",
              }}
            >
              <button
                type="button"
                onClick={() => setIsHistoryOpen(false)}
                style={{
                  padding: "6px 14px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  background: "#ffffff",
                  color: "#334155",
                  fontSize: "12px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
