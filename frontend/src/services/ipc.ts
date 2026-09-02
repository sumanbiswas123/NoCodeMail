// Type-safe IPC bridge to Zig host (supports both native webview & browser fallback)
export interface PDFComponent {
  id: string;
  type: "text" | "image" | "path";
  bbox: [number, number, number, number]; // [left, top, right, bottom] in top-down PDF points
  text_content?: string;
  font_size?: number;
  bold?: boolean;
  color?: string;
  fill_color?: string | null;
  image_width?: number;
  image_height?: number;
}

export interface PDFPageComponentsData {
  success: boolean;
  page: number;
  total_pages: number;
  canvas_width_pt: number;
  canvas_height_pt: number;
  preview_image_path: string;
  components: PDFComponent[];
  error?: string;
}

export interface MarkedRegion {
  id: string;
  page: number;
  left: number;
  top: number;
  right: number;
  bottom: number;
  preview_url?: string;
}

export interface PDFExtractionData {
  package_dir: string;
  json_path: string;
  preview_image_path: string;
  preview_image_filename: string;
  total_pages: number;
  total_text_blocks: number;
  total_images: number;
  total_links: number;
  total_tables: number;
  total_styles: number;
  design_json: string;
}

export interface BrowserInfo {
  id: string;
  name: string;
  path: string;
}

export interface FooterPreset {
  country: string;
  code: string;
}

declare global {
  interface Window {
    choosePdf?: () => Promise<{ success: boolean; path?: string; canceled?: boolean }>;
    chooseImage?: () => Promise<{ success: boolean; path?: string; canceled?: boolean }>;
    getPdfInfo?: (args: { path: string }) => Promise<{ success: boolean; total_pages?: number; error?: string }>;
    getPdfComponents?: (args: { path: string; target_page?: number }) => Promise<PDFPageComponentsData>;
    renderRegionPreview?: (args: { path: string; bounds: [number, number, number, number]; target_page?: number; transparent?: boolean; email_width?: number }) => Promise<{ success: boolean; preview_path?: string; width?: number; height?: number; error?: string }>;
    chooseHtml?: () => Promise<{ success: boolean; path?: string; content?: string; canceled?: boolean }>;
    extractPdf?: (args: { path: string; email_width?: number; target_page?: number; marked_regions?: MarkedRegion[] }) => Promise<{ success: boolean; error?: string } & Partial<PDFExtractionData>>;
    compileMjml?: (args: { mjml: string; save_path?: string }) => Promise<{ success: boolean; html?: string; characters?: number; error?: string }>;
    saveFile?: (args: { path: string; content: string }) => Promise<{ success: boolean; error?: string }>;
    readFile?: (args: { path: string }) => Promise<{ success: boolean; content?: string; error?: string }>;
    getInstalledBrowsers?: () => Promise<{ success: boolean; browsers?: BrowserInfo[] }>;
    openInBrowser?: (args: { url?: string; path?: string; browser_path?: string }) => Promise<{ success: boolean; error?: string }>;
  }
}

export const nativeIPC = {
  async chooseImage(): Promise<{ success: boolean; path?: string }> {
    if (window.chooseImage) {
      return await window.chooseImage();
    }
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          resolve({ success: true, path: file.name });
        } else {
          resolve({ success: false });
        }
      };
      input.click();
    });
  },

  async choosePdf(): Promise<{ success: boolean; path?: string }> {
    if (window.choosePdf) {
      return await window.choosePdf();
    }
    // Web fallback for browser testing
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".pdf";
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          resolve({ success: true, path: file.name });
        } else {
          resolve({ success: false });
        }
      };
      input.click();
    });
  },

  async getPdfInfo(path: string): Promise<{ success: boolean; total_pages: number }> {
    if (window.getPdfInfo) {
      const res = await window.getPdfInfo({ path });
      if (res.success && res.total_pages) {
        return { success: true, total_pages: res.total_pages };
      }
    }
    return { success: true, total_pages: 1 };
  },

  async getPdfComponents(path: string, page = 1): Promise<PDFPageComponentsData> {
    if (window.getPdfComponents) {
      return await window.getPdfComponents({ path, target_page: page });
    }
    // Mock for development
    return {
      success: true,
      page,
      total_pages: 1,
      canvas_width_pt: 600,
      canvas_height_pt: 800,
      preview_image_path: "",
      components: [
        { id: "text_1", type: "text", bbox: [50, 40, 550, 80], text_content: "Exclusive Launch Offer", font_size: 24, bold: true, color: "#1e293b" },
        { id: "img_1", type: "image", bbox: [50, 100, 550, 320], image_width: 500, image_height: 220 },
        { id: "text_2", type: "text", bbox: [50, 340, 550, 400], text_content: "Transform your design into responsive email code with zero fuss.", font_size: 14, color: "#475569" },
        { id: "path_1", type: "path", bbox: [200, 420, 400, 470], fill_color: "#6366f1" },
        { id: "text_3", type: "text", bbox: [230, 435, 370, 455], text_content: "Get Started Now", font_size: 14, bold: true, color: "#ffffff" },
      ],
    };
  },

  async renderRegionPreview(path: string, bounds: [number, number, number, number], page = 1, transparent = true, emailWidth = 700): Promise<{ success: boolean; preview_path?: string; width?: number; height?: number }> {
    if (window.renderRegionPreview) {
      return await window.renderRegionPreview({ path, bounds, target_page: page, transparent, email_width: emailWidth });
    }
    return { success: true };
  },

  async chooseHtml(): Promise<{ success: boolean; path?: string; content?: string }> {
    if (window.chooseHtml) {
      return await window.chooseHtml();
    }
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".html,.htm";
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = () => {
            resolve({ success: true, path: file.name, content: reader.result as string });
          };
          reader.readAsText(file);
        } else {
          resolve({ success: false });
        }
      };
      input.click();
    });
  },

  async extractPdf(path: string, emailWidth = 700, targetPage?: number, markedRegions?: MarkedRegion[]): Promise<PDFExtractionData> {
    if (window.extractPdf) {
      const res = await window.extractPdf({ path, email_width: emailWidth, target_page: targetPage, marked_regions: markedRegions });
      if (!res.success) throw new Error(res.error || "Failed to extract PDF");
      return res as PDFExtractionData;
    }
    // Browser mock for instant UI rendering during development
    await new Promise((r) => setTimeout(r, 600));
    return {
      package_dir: "C:\\Users\\SumanBiswas\\Downloads\\sample_email_ai_package",
      json_path: "C:\\Users\\SumanBiswas\\Downloads\\sample_email_ai_package\\email_design.json",
      preview_image_path: "",
      preview_image_filename: "page_1_preview.png",
      total_pages: 1,
      total_text_blocks: 42,
      total_images: 18,
      total_links: 7,
      total_tables: 2,
      total_styles: 56,
      design_json: JSON.stringify({
        metadata: { title: "email-design", pages: 1, extractedAt: new Date().toISOString() },
        structure: { type: "email", sections: [{ type: "hero", elements: [] }] }
      }, null, 2),
    };
  },

  async compileMjml(mjml: string, savePath?: string): Promise<{ html: string; characters: number }> {
    if (window.compileMjml) {
      const res = await window.compileMjml({ mjml, save_path: savePath });
      if (!res.success || !res.html) throw new Error(res.error || "Failed to compile MJML");
      return { html: res.html, characters: res.characters || res.html.length };
    }
    // Fallback compiler
    await new Promise((r) => setTimeout(r, 300));
    const sampleHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Compiled Email</title>
  <style>
    body { margin: 0; padding: 0; background-color: #eef1f4; font-family: Arial, sans-serif; }
    .container { max-width: 700px; margin: 0 auto; background: #ffffff; padding: 24px 20px; border-radius: 6px; }
    h1 { font-family: Arial, Helvetica, sans-serif; font-size: 36px; font-weight: 700; line-height: 1.25; color: #0f172a; margin: 0 0 16px 0; }
    p { font-family: Arial, Helvetica, sans-serif; font-size: 14px; line-height: 1.5; color: #475569; margin: 0 0 16px 0; }
    .btn { display: inline-block; background-color: #2563eb; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; }
  </style>
</head>
<body>
  <div style="background-color: #eef1f4; padding: 25px 0;">
    <div class="container" style="max-width: 700px; margin: 0 auto; background: #ffffff; padding: 24px 20px;">
      <h1 style="font-family: Arial, Helvetica, sans-serif; font-size: 36px; font-weight: 700; line-height: 1.25; color: #0f172a; margin: 0 0 16px 0;">Designed for creators, built for growth</h1>
      <p style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; line-height: 1.5; color: #475569; margin: 0 0 16px 0;">Flowro helps you build beautiful email campaigns that engage your audience and drive results.</p>
      <a href="#" class="btn" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">Explore Features</a>
    </div>
  </div>
</body>
</html>`;
    return { html: sampleHtml, characters: sampleHtml.length };
  },

  async saveFile(path: string, content: string): Promise<boolean> {
    if (window.saveFile) {
      const res = await window.saveFile({ path, content });
      return res.success;
    }
    return true;
  },

  async readFile(path: string): Promise<{ success: boolean; content?: string; error?: string }> {
    if (window.readFile) {
      return await window.readFile({ path });
    }
    return { success: false, error: "Not supported in browser mock" };
  },

  async getInstalledBrowsers(): Promise<BrowserInfo[]> {
    if (window.getInstalledBrowsers) {
      const res = await window.getInstalledBrowsers();
      if (res.success && res.browsers) return res.browsers;
    }
    return [
      { id: "default", name: "System Default Browser", path: "" }
    ];
  },

  async openInBrowser(options: { url?: string; path?: string; browser_path?: string }): Promise<boolean> {
    if (window.openInBrowser) {
      const res = await window.openInBrowser(options);
      return res.success;
    }
    if (options.url) {
      window.open(options.url, "_blank");
      return true;
    }
    return false;
  },

  async fetchFooterPresets(endpointUrl = "http://10.215.56.196:9000/footer"): Promise<FooterPreset[]> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(endpointUrl, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.footers)) {
          // Cache in localStorage for offline resilience
          try {
            localStorage.setItem("nocodemail_cached_footers", JSON.stringify(data.footers));
          } catch {}
          return data.footers;
        }
      }
    } catch (e) {
      console.warn("Could not fetch remote footers, trying cache:", e);
    }

    // Fallback to local cache
    try {
      const cached = localStorage.getItem("nocodemail_cached_footers");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}

    return [];
  }
};


