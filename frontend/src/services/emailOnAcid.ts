/**
 * Email on Acid & Mailgun Inspect API Integration Service
 * 
 * Supports:
 * 1. Modern Mailgun Inspect API (v1/inspect/previews)
 * 2. Legacy Email on Acid API (v5/email/tests)
 * 3. Instant interactive client & device simulation engine with Light/Dark mode
 */

export interface DeviceClientProfile {
  id: string;
  name: string;
  category: "mobile" | "desktop" | "webmail";
  os: "ios" | "android" | "windows" | "macos" | "web";
  version: string;
  width: number;
  height: number;
  supportsDarkMode: boolean;
  isDarkMode?: boolean;
  iconName: string;
  badge: string;
  description: string;
}

export interface InspectPreviewResult {
  id: string;
  clientId: string;
  clientName: string;
  category: "mobile" | "desktop" | "webmail";
  os?: string;
  status: "queued" | "processing" | "completed" | "failed";
  thumbnailUrl?: string;
  fullScreenshotUrl?: string;
  renderTimeSec?: number;
  isDarkMode?: boolean;
}

export interface InspectTestRun {
  testId: string;
  subject: string;
  pdfName?: string;
  createdAt: string;
  status: "running" | "completed" | "failed";
  totalClients: number;
  completedClients: number;
  results: InspectPreviewResult[];
}

// Top 20 Industry-Standard Email Clients & Devices with Exact Real Email on Acid Slugs
export const EMAIL_CLIENT_CATALOG: DeviceClientProfile[] = [
  // Mobile Clients (7)
  {
    id: "android15_gmailapp_pixel9_lm",
    name: "Gmail App Pixel 9",
    category: "mobile",
    os: "android",
    version: "Android 15",
    width: 412,
    height: 740,
    supportsDarkMode: true,
    isDarkMode: false,
    iconName: "smartphone",
    badge: "Android",
    description: "Gmail mobile app on Google Pixel 9 running Android 15",
  },
  {
    id: "android16_gmailapp_pixel10_lm",
    name: "Gmail App Pixel 10",
    category: "mobile",
    os: "android",
    version: "Android 16",
    width: 412,
    height: 740,
    supportsDarkMode: true,
    isDarkMode: false,
    iconName: "smartphone",
    badge: "Android",
    description: "Gmail mobile app on Google Pixel 10 running Android 16",
  },
  {
    id: "android16_gmailapp_pixel10_dm",
    name: "Gmail App Pixel 10 (Dark Mode)",
    category: "mobile",
    os: "android",
    version: "Android 16 (Dark Mode)",
    width: 412,
    height: 740,
    supportsDarkMode: true,
    isDarkMode: true,
    iconName: "smartphone",
    badge: "Dark",
    description: "Gmail mobile app on Google Pixel 10 with Android Dark Mode",
  },
  {
    id: "iphone17_26",
    name: "iPhone 17",
    category: "mobile",
    os: "ios",
    version: "iOS 26",
    width: 393,
    height: 720,
    supportsDarkMode: true,
    isDarkMode: false,
    iconName: "smartphone",
    badge: "iOS",
    description: "Apple Mail on iPhone 17 running iOS 26",
  },
  {
    id: "iphone17_26_dm",
    name: "iPhone 17 (Dark Mode)",
    category: "mobile",
    os: "ios",
    version: "iOS 26 (Dark Mode)",
    width: 430,
    height: 800,
    supportsDarkMode: true,
    isDarkMode: true,
    iconName: "smartphone",
    badge: "Dark",
    description: "Apple Mail on iPhone 17 with iOS Dark Mode",
  },
  {
    id: "iphone17pro_26",
    name: "iPhone 17 Pro",
    category: "mobile",
    os: "ios",
    version: "iOS 26 Pro",
    width: 393,
    height: 720,
    supportsDarkMode: true,
    isDarkMode: false,
    iconName: "smartphone",
    badge: "iOS",
    description: "Apple Mail on iPhone 17 Pro running iOS 26",
  },
  {
    id: "iphone13ol_15",
    name: "Outlook App iPhone 13",
    category: "mobile",
    os: "ios",
    version: "iOS 15",
    width: 390,
    height: 720,
    supportsDarkMode: true,
    isDarkMode: false,
    iconName: "smartphone",
    badge: "Outlook",
    description: "Microsoft Outlook App on iPhone 13 running iOS 15",
  },

  // Desktop Clients (7)
  {
    id: "applemail16",
    name: "Apple Mail 16",
    category: "desktop",
    os: "macos",
    version: "macOS 13",
    width: 700,
    height: 680,
    supportsDarkMode: true,
    isDarkMode: false,
    iconName: "monitor",
    badge: "macOS",
    description: "Apple Mail 16 desktop app on macOS 13 (Ventura)",
  },
  {
    id: "applemail16_dm",
    name: "Apple Mail 16 (Dark Mode)",
    category: "desktop",
    os: "macos",
    version: "macOS 13 (Dark Mode)",
    width: 700,
    height: 680,
    supportsDarkMode: true,
    isDarkMode: true,
    iconName: "monitor",
    badge: "Dark",
    description: "Apple Mail 16 desktop app on macOS 13 in Dark Mode",
  },
  {
    id: "m365_mac13_lm_dt",
    name: "Outlook Microsoft 365 macOS 13",
    category: "desktop",
    os: "macos",
    version: "macOS 13",
    width: 700,
    height: 680,
    supportsDarkMode: true,
    isDarkMode: false,
    iconName: "monitor",
    badge: "macOS",
    description: "Microsoft 365 Outlook desktop app on macOS 13",
  },
  {
    id: "m365_w11_lm_dt",
    name: "Outlook Microsoft 365 Windows 11",
    category: "desktop",
    os: "windows",
    version: "Windows 11",
    width: 700,
    height: 680,
    supportsDarkMode: true,
    isDarkMode: false,
    iconName: "monitor",
    badge: "Windows",
    description: "Microsoft 365 Outlook on Windows 11 in Light Mode",
  },
  {
    id: "m365_w11_dm_dt",
    name: "Outlook Microsoft 365 Windows 11 (Dark Mode)",
    category: "desktop",
    os: "windows",
    version: "Windows 11 (Dark Mode)",
    width: 700,
    height: 680,
    supportsDarkMode: true,
    isDarkMode: true,
    iconName: "monitor",
    badge: "Dark",
    description: "Microsoft 365 Outlook on Windows 11 in Dark Mode",
  },
  {
    id: "outlook2021_win11_lm_dt",
    name: "Outlook 2021 Windows 11",
    category: "desktop",
    os: "windows",
    version: "Windows 11",
    width: 700,
    height: 680,
    supportsDarkMode: true,
    isDarkMode: false,
    iconName: "monitor",
    badge: "Windows",
    description: "Standalone Outlook 2021 desktop on Windows 11",
  },
  {
    id: "outlook2021_win11_dm_dt",
    name: "Outlook 2021 Windows 11 (Dark Mode)",
    category: "desktop",
    os: "windows",
    version: "Windows 11 (Dark Mode)",
    width: 700,
    height: 680,
    supportsDarkMode: true,
    isDarkMode: true,
    iconName: "monitor",
    badge: "Dark",
    description: "Standalone Outlook 2021 desktop on Windows 11 in Dark Mode",
  },

  // Webmail Clients (6)
  {
    id: "gmailcom-lm_chrcurrent_win10",
    name: "Gmail.com Chrome Windows 10",
    category: "webmail",
    os: "web",
    version: "Chrome / Win 10",
    width: 700,
    height: 680,
    supportsDarkMode: true,
    isDarkMode: false,
    iconName: "globe",
    badge: "Webmail",
    description: "Gmail web client in Google Chrome on Windows 10",
  },
  {
    id: "gmailcom-lm_edgecurrent_win10",
    name: "Gmail.com Edge Windows 10",
    category: "webmail",
    os: "web",
    version: "Edge / Win 10",
    width: 700,
    height: 680,
    supportsDarkMode: true,
    isDarkMode: false,
    iconName: "globe",
    badge: "Webmail",
    description: "Gmail web client in Microsoft Edge on Windows 10",
  },
  {
    id: "gmailcom-lm_ffcurrent_win10",
    name: "Gmail.com Firefox Windows 10",
    category: "webmail",
    os: "web",
    version: "Firefox / Win 10",
    width: 700,
    height: 680,
    supportsDarkMode: true,
    isDarkMode: false,
    iconName: "globe",
    badge: "Webmail",
    description: "Gmail web client in Mozilla Firefox on Windows 10",
  },
  {
    id: "yahoocom-lm_chrcurrent_win10",
    name: "Yahoo.com Chrome Windows 10",
    category: "webmail",
    os: "web",
    version: "Chrome / Win 10",
    width: 700,
    height: 680,
    supportsDarkMode: true,
    isDarkMode: false,
    iconName: "globe",
    badge: "Webmail",
    description: "Yahoo! Mail in Google Chrome on Windows 10",
  },
  {
    id: "yahoocom-lm_edgecurrent_win10",
    name: "Yahoo.com Edge Windows 10",
    category: "webmail",
    os: "web",
    version: "Edge / Win 10",
    width: 700,
    height: 680,
    supportsDarkMode: true,
    isDarkMode: false,
    iconName: "globe",
    badge: "Webmail",
    description: "Yahoo! Mail in Microsoft Edge on Windows 10",
  },
  {
    id: "yahoocom-lm_ffcurrent_win10",
    name: "Yahoo.com Firefox Windows 10",
    category: "webmail",
    os: "web",
    version: "Firefox / Win 10",
    width: 700,
    height: 680,
    supportsDarkMode: true,
    isDarkMode: false,
    iconName: "globe",
    badge: "Webmail",
    description: "Yahoo! Mail in Mozilla Firefox on Windows 10",
  },
];

// Helper to retrieve API credentials from Vite env or localStorage override
export function getApiCredentials(): {
  eoaApiKey: string;
  eoaPassword: string;
  isConfigured: boolean;
} {
  const envEoaKey = import.meta.env.VITE_EOA_API_KEY || "";
  const envEoaPassword = import.meta.env.VITE_EOA_PASSWORD || "";

  // Check optional local storage overrides
  const storedEoaKey = typeof window !== "undefined" ? localStorage.getItem("ncm_eoa_api_key") || "" : "";
  const storedEoaPassword = typeof window !== "undefined" ? localStorage.getItem("ncm_eoa_password") || "" : "";

  const eoaApiKey = (storedEoaKey || envEoaKey).trim();
  const eoaPassword = (storedEoaPassword || envEoaPassword).trim();

  const isConfigured = Boolean(eoaApiKey && eoaPassword);

  return {
    eoaApiKey,
    eoaPassword,
    isConfigured,
  };
}

export function saveLocalApiKeyOverride(keys: { eoaApiKey?: string; eoaPassword?: string }) {
  if (typeof window === "undefined") return;
  if (keys.eoaApiKey !== undefined) localStorage.setItem("ncm_eoa_api_key", keys.eoaApiKey);
  if (keys.eoaPassword !== undefined) localStorage.setItem("ncm_eoa_password", keys.eoaPassword);
}

let cachedClientList: any[] | null = null;

async function getEoaClientsCached(authHeader: string): Promise<any[]> {
  if (cachedClientList && cachedClientList.length > 0) {
    return cachedClientList;
  }
  try {
    const rawStored = typeof window !== "undefined" ? localStorage.getItem("ncm_eoa_client_cache") : null;
    if (rawStored) {
      cachedClientList = JSON.parse(rawStored);
      if (cachedClientList && cachedClientList.length > 0) return cachedClientList;
    }
  } catch {}

  const clientsRes = await fetch("https://api.emailonacid.com/v5/email/clients", {
    headers: { "Authorization": authHeader },
  });
  if (clientsRes.ok) {
    const cData = await clientsRes.json();
    const rawList: any[] = [];
    if (Array.isArray(cData)) rawList.push(...cData);
    else if (cData && typeof cData === "object") {
      Object.entries(cData).forEach(([k, v]) => {
        if (v && typeof v === "object") rawList.push({ ...(v as any), _key: k });
      });
    }
    cachedClientList = rawList;
    try {
      localStorage.setItem("ncm_eoa_client_cache", JSON.stringify(rawList));
    } catch {}
    return rawList;
  }
  return [];
}

/**
 * Normalize PDF/Campaign Key for LocalStorage
 */
export function normalizePdfKey(name?: string): string {
  if (!name) return "default";
  return name.trim().toLowerCase().replace(/[\/\\]/g, "_").replace(/\.[^/.]+$/, "");
}

/**
 * Trigger Email on Acid v5 Cloud Test
 */
export async function runEmailOnAcidTest(
  htmlContent: string,
  subject: string,
  _pkgPrefix?: string,
  selectedClientIds?: string[],
  pdfName?: string
): Promise<InspectTestRun> {
  const creds = getApiCredentials();

  if (!creds.isConfigured) {
    throw new Error("No Email on Acid API credentials configured. Please set VITE_EOA_API_KEY & VITE_EOA_PASSWORD in your .env file.");
  }

  // Send raw HTML directly without inlining images as Base64 (avoids Yahoo 100KB clipping and Outlook Base64 rejection)
  const payloadHtml = htmlContent;

  const clientsToTest = selectedClientIds && selectedClientIds.length > 0
    ? EMAIL_CLIENT_CATALOG.filter((c) => selectedClientIds.includes(c.id))
    : EMAIL_CLIENT_CATALOG;

  const authHeader = `Basic ${btoa(`${creds.eoaApiKey}:${creds.eoaPassword}`)}`;
  
  const effectivePdfName = pdfName || subject || "Email Campaign";

  // Directly pass the exact client slugs from the catalog / selection
  const postBody: any = {
    subject: subject || effectivePdfName,
    html: payloadHtml,
    clients: clientsToTest.map((c) => c.id),
  };

  const response = await fetch("https://api.emailonacid.com/v5/email/tests", {
    method: "POST",
    headers: {
      "Authorization": authHeader,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(postBody),
  });

  if (!response.ok) {
    const errText = await response.text();
    if (response.status === 429) {
      throw new Error(`Email on Acid API Rate Limit reached (429). Your account plan has a rate limit on creating new tests. You can open History to load previous tests.`);
    }
    throw new Error(`Email on Acid API error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const testId = data.id || `test_${Date.now()}`;

  // Fetch initial results mapping (1 single API call) to get the CDN image URLs for direct probing
  try {
    const initialRun = await pollInspectResults(testId, effectivePdfName);
    if (initialRun && initialRun.results && initialRun.results.length > 0) {
      saveStoredTestRun(initialRun, effectivePdfName);
      saveTestToHistory(initialRun, effectivePdfName);
      return initialRun;
    }
  } catch (e) {
    console.warn("Could not fetch initial results mapping:", e);
  }

  const newRun: InspectTestRun = {
    testId,
    subject: subject || effectivePdfName,
    pdfName: effectivePdfName,
    createdAt: new Date().toISOString(),
    status: "running",
    totalClients: clientsToTest.length,
    completedClients: 0,
    results: clientsToTest.map((c) => ({
      id: `${testId}_${c.id}`,
      clientId: c.id,
      clientName: c.name,
      category: c.category,
      isDarkMode: c.isDarkMode,
      status: "processing",
    })),
  };

  saveStoredTestRun(newRun, effectivePdfName);
  saveTestToHistory(newRun, effectivePdfName);
  return newRun;
}

// Alias for compatibility
export const runMailgunInspectTest = runEmailOnAcidTest;

// Local storage caching helpers with per-PDF key isolation
export function getStoredTestRun(pdfName?: string): InspectTestRun | null {
  if (typeof window === "undefined") return null;
  try {
    if (pdfName) {
      const key = normalizePdfKey(pdfName);
      const rawPdf = localStorage.getItem(`ncm_last_eoa_test_run_${key}`);
      if (rawPdf) return JSON.parse(rawPdf);

      // Check test history for matching PDF name
      const history = getTestHistory();
      const match = history.find(
        (h) => normalizePdfKey(h.pdfName) === key || normalizePdfKey(h.subject) === key
      );
      if (match) return match;
    }
    const raw = localStorage.getItem("ncm_last_eoa_test_run");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveStoredTestRun(run: InspectTestRun | null, pdfName?: string) {
  if (typeof window === "undefined") return;
  const targetPdf = pdfName || run?.pdfName || run?.subject;
  const key = targetPdf ? normalizePdfKey(targetPdf) : null;

  if (!run) {
    if (key) localStorage.removeItem(`ncm_last_eoa_test_run_${key}`);
    localStorage.removeItem("ncm_last_eoa_test_run");
  } else {
    if (key) localStorage.setItem(`ncm_last_eoa_test_run_${key}`, JSON.stringify(run));
    localStorage.setItem("ncm_last_eoa_test_run", JSON.stringify(run));
  }
}

export function getTestHistory(pdfName?: string): InspectTestRun[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("ncm_eoa_test_history");
    let list: InspectTestRun[] = [];
    if (raw) {
      list = JSON.parse(raw);
    } else {
      const single = getStoredTestRun();
      if (single) list = [single];
    }
    if (!Array.isArray(list)) return [];
    if (pdfName) {
      const key = normalizePdfKey(pdfName);
      return list.filter(
        (h) => normalizePdfKey(h.pdfName) === key || normalizePdfKey(h.subject) === key
      );
    }
    return list;
  } catch {
    return [];
  }
}

export function saveTestToHistory(run: InspectTestRun, pdfName?: string) {
  if (typeof window === "undefined" || !run || !run.testId) return;
  try {
    if (pdfName && !run.pdfName) {
      run.pdfName = pdfName;
    }
    const rawAll = localStorage.getItem("ncm_eoa_test_history");
    const history: InspectTestRun[] = rawAll ? JSON.parse(rawAll) : [];
    const existingIndex = history.findIndex((h) => h.testId === run.testId);
    let updated: InspectTestRun[];
    if (existingIndex >= 0) {
      updated = [...history];
      updated[existingIndex] = { ...updated[existingIndex], ...run, pdfName: run.pdfName || updated[existingIndex].pdfName };
    } else {
      updated = [run, ...history].slice(0, 50);
    }
    localStorage.setItem("ncm_eoa_test_history", JSON.stringify(updated));
  } catch (e) {
    console.warn("Failed to save test history:", e);
  }
}

export function deleteTestFromHistory(testId: string, pdfName?: string): InspectTestRun[] {
  if (typeof window === "undefined") return [];
  try {
    const rawAll = localStorage.getItem("ncm_eoa_test_history");
    const history: InspectTestRun[] = rawAll ? JSON.parse(rawAll) : [];
    const updated = history.filter((h) => h.testId !== testId);
    localStorage.setItem("ncm_eoa_test_history", JSON.stringify(updated));

    const current = getStoredTestRun(pdfName);
    if (current && current.testId === testId) {
      const nextActive = pdfName ? getTestHistory(pdfName)[0] || null : updated[0] || null;
      saveStoredTestRun(nextActive, pdfName);
    }
    return pdfName ? getTestHistory(pdfName) : updated;
  } catch {
    return [];
  }
}

export function clearTestHistory() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("ncm_eoa_test_history");
  localStorage.removeItem("ncm_last_eoa_test_run");
}

/**
 * Poll test status and screenshot results from Email on Acid v5 API
 */
export async function pollInspectResults(testId: string, pdfName?: string): Promise<InspectTestRun> {
  const creds = getApiCredentials();

  if (!creds.isConfigured) {
    throw new Error("No Email on Acid API credentials configured.");
  }

  const authHeader = `Basic ${btoa(`${creds.eoaApiKey}:${creds.eoaPassword}`)}`;
  const fetchUrl = `https://api.emailonacid.com/v5/email/tests/${encodeURIComponent(testId)}/results`;

  const response = await fetch(fetchUrl, {
    method: "GET",
    headers: {
      "Authorization": authHeader,
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
  });

  const existing = getStoredTestRun(pdfName) || getTestHistory().find((h) => h.testId === testId);
  const resolvedPdfName = existing?.pdfName || pdfName || "Email Campaign";
  const resolvedSubject = existing?.subject || pdfName || "Email Campaign Preview";

  if (response.status === 429) {
    console.warn("API rate limit reached, returning current progress.");
    if (existing && existing.testId === testId) {
      return existing;
    }
    return {
      testId,
      subject: resolvedSubject,
      pdfName: resolvedPdfName,
      createdAt: new Date().toISOString(),
      status: "running",
      totalClients: EMAIL_CLIENT_CATALOG.length,
      completedClients: 0,
      results: EMAIL_CLIENT_CATALOG.map((c) => ({
        id: `${testId}_${c.id}`,
        clientId: c.id,
        clientName: c.name,
        category: c.category,
        isDarkMode: c.isDarkMode,
        status: "processing" as const,
      })),
    };
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch test results (${response.status})`);
  }

  const rawData = await response.json();
  const rawEntries: any[] = [];
  if (Array.isArray(rawData)) {
    rawEntries.push(...rawData);
  } else if (rawData && typeof rawData === "object") {
    // If wrapped in a results property (e.g. data.results)
    const targetObj = rawData.results && typeof rawData.results === "object" && !Array.isArray(rawData.results)
      ? rawData.results
      : rawData;

    Object.entries(targetObj).forEach(([key, val]) => {
      if (val && typeof val === "object") {
        rawEntries.push({ ...(val as any), _eoaKey: key });
      }
    });
  }

  // Map all returned entries dynamically with Light and Dark mode detection
  const mappedResults: InspectPreviewResult[] = rawEntries.map((item) => {
    const cid = item.id || item._eoaKey || `client_${Math.random()}`;
    const cName = item.display_name || item.displayname || item.name || item.client || cid;
    const osStr = item.os || "";
    const catRaw = (item.category || "").toLowerCase();

    let category: "mobile" | "desktop" | "webmail" = "desktop";
    if (
      catRaw.includes("mobile") ||
      osStr.toLowerCase().includes("android") ||
      osStr.toLowerCase().includes("ios") ||
      cid.includes("iphone") ||
      cid.includes("android") ||
      cid.includes("pixel")
    ) {
      category = "mobile";
    } else if (
      catRaw.includes("web") ||
      cid.includes("com-") ||
      cid.includes("web") ||
      cid.includes("yahoo") ||
      cid.includes("gmailcom") ||
      cid.includes("outlookcom") ||
      cid.includes("aolcom")
    ) {
      category = "webmail";
    } else {
      category = "desktop";
    }

    const isDarkMode = Boolean(
      cid.includes("_dm") ||
      cid.includes("-dm") ||
      cid.includes("_dark") ||
      cid.includes("-dark") ||
      osStr.toLowerCase().includes("dark mode") ||
      cName.toLowerCase().includes("dark mode") ||
      cName.toLowerCase().includes("dark")
    );

    const full =
      item.screenshots?.default ||
      item.screenshots?.full ||
      item.screenshots?.fullpage ||
      item.fullthumbnail ||
      item.full_thumbnail ||
      item.screenshot_url ||
      item.full_url ||
      item.full ||
      item.default ||
      item.thumbnail;

    const thumb =
      item.thumbnail ||
      item.screenshots?.thumb ||
      item.screenshots?.thumbnail ||
      item.thumbnail_url ||
      item.screenshots?.default ||
      full;

    const statusStr = (item.status || "").toLowerCase();
    const isComplete = statusStr === "complete" || statusStr === "completed";

    return {
      id: `${testId}_${cid}`,
      clientId: cid,
      clientName: cName,
      category,
      os: osStr,
      isDarkMode,
      status: isComplete ? ("completed" as const) : (statusStr === "failed" || statusStr === "error") ? ("failed" as const) : ("processing" as const),
      thumbnailUrl: thumb,
      fullScreenshotUrl: full,
    };
  });

  const completedCount = mappedResults.filter((r) => r.status === "completed").length;
  const run: InspectTestRun = {
    testId,
    subject: resolvedSubject,
    pdfName: resolvedPdfName,
    createdAt: new Date().toISOString(),
    status: completedCount >= mappedResults.length && mappedResults.length > 0 ? "completed" : "running",
    totalClients: mappedResults.length,
    completedClients: completedCount,
    results: mappedResults,
  };

  saveStoredTestRun(run, resolvedPdfName);
  saveTestToHistory(run, resolvedPdfName);
  return run;
}
