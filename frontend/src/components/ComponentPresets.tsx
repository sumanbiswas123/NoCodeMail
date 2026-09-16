import React from "react";
import { 
  Type, 
  Image as ImageIcon, 
  Square, 
  Columns2, 
  Columns3, 
  Columns4, 
  SplitSquareVertical, 
  LayoutTemplate,
  Minus
} from "lucide-react";

export interface ComponentPreset {
  id: string;
  name: string;
  category: "basic" | "2-col" | "3-col" | "4-col";
  description: string;
  icon: React.ReactNode;
  preview: React.ReactNode;
  generateHtml: (assetsPrefix?: string) => string;
}

/**
 * Generate self-contained, offline-safe SVG placeholder data URIs
 */
export const createSvgPlaceholder = (
  width = 400,
  height = 240,
  label = "Image Placeholder",
  bgColor = "#e2e8f0",
  textColor = "#64748b"
): string => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="${bgColor}" rx="6"/>
  <g fill="${textColor}" opacity="0.7">
    <circle cx="${width / 2 - 14}" cy="${height / 2 - 10}" r="6" />
    <path d="M${width / 2 - 24} ${height / 2 + 12}l14-16 10 12 8-8 16 12h-48z" />
  </g>
  <text x="50%" y="${height / 2 + 28}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="600" fill="${textColor}" text-anchor="middle">${label}</text>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

export const EMAIL_COMPONENT_PRESETS: ComponentPreset[] = [
  // --- 1. BASIC / SINGLE ELEMENTS ---
  {
    id: "basic-text",
    name: "Simple Text Section",
    category: "basic",
    description: "Clean paragraph typography with customizable font, color, and spacing",
    icon: <Type size={16} color="#4f46e5" />,
    preview: (
      <div style={{ width: "100%", height: "42px", background: "#f8fafc", borderRadius: "4px", padding: "6px 10px", display: "flex", flexDirection: "column", justifyContent: "center", gap: "4px", border: "1px dashed #cbd5e1" }}>
        <div style={{ width: "40%", height: "6px", background: "#94a3b8", borderRadius: "2px" }} />
        <div style={{ width: "90%", height: "4px", background: "#cbd5e1", borderRadius: "2px" }} />
        <div style={{ width: "70%", height: "4px", background: "#e2e8f0", borderRadius: "2px" }} />
      </div>
    ),
    generateHtml: () => `
<div class="email-section-wrapper" style="background-color:#ffffff;margin:0px auto;max-width:700px;">
  <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;background-color:#ffffff;">
    <tbody>
      <tr>
        <td style="direction:ltr;font-size:0px;padding:16px 20px;text-align:left;">
          <div class="mj-column-per-100 mj-outlook-group-fix" style="font-size:0px;text-align:left;direction:ltr;display:inline-block;vertical-align:top;width:100%;">
            <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="vertical-align:top;" width="100%">
              <tbody>
                <tr>
                  <td align="left" style="font-size:0px;padding:0;word-break:break-word;">
                    <div style="font-family:Arial, sans-serif;font-size:15px;line-height:22px;text-align:left;color:#334155;">
                      Click here to start editing this text section. You can customize font size, colors, alignment, or replace this with any content.
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </td>
      </tr>
    </tbody>
  </table>
</div>`,
  },
  {
    id: "hero-image",
    name: "Hero Banner Image",
    category: "basic",
    description: "Full width 660px hero banner with crisp placeholder image",
    icon: <ImageIcon size={16} color="#059669" />,
    preview: (
      <div style={{ width: "100%", height: "42px", background: "#e0e7ff", borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #c7d2fe", gap: "6px" }}>
        <ImageIcon size={15} color="#4f46e5" />
        <span style={{ fontSize: "10.5px", fontWeight: "700", color: "#4338ca" }}>660px Hero Banner</span>
      </div>
    ),
    generateHtml: () => `
<div class="email-section-wrapper" style="background-color:#ffffff;margin:0px auto;max-width:700px;">
  <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;background-color:#ffffff;">
    <tbody>
      <tr>
        <td style="direction:ltr;font-size:0px;padding:12px 20px;text-align:center;">
          <div class="mj-column-per-100 mj-outlook-group-fix" style="font-size:0px;text-align:left;direction:ltr;display:inline-block;vertical-align:top;width:100%;">
            <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="vertical-align:top;" width="100%">
              <tbody>
                <tr>
                  <td align="center" style="font-size:0px;padding:0;word-break:break-word;">
                    <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse;border-spacing:0px;">
                      <tbody>
                        <tr>
                          <td style="width:660px;">
                            <img alt="Hero Banner" src="${createSvgPlaceholder(660, 260, "Hero Banner (Click to Replace)", "#e0e7ff", "#4338ca")}" style="border:0;border-radius:8px;display:block;outline:none;text-decoration:none;height:auto;width:100%;font-size:13px;" width="660" height="auto" />
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </td>
      </tr>
    </tbody>
  </table>
</div>`,
  },
  {
    id: "button-cta",
    name: "Call to Action Button",
    category: "basic",
    description: "Prominent centered or left-aligned action button",
    icon: <Square size={16} color="#d97706" />,
    preview: (
      <div style={{ width: "100%", height: "42px", background: "#f8fafc", borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center", border: "1px dashed #cbd5e1" }}>
        <div style={{ background: "#4f46e5", color: "#ffffff", fontSize: "10px", fontWeight: "700", padding: "4px 14px", borderRadius: "4px" }}>
          Get Started &rarr;
        </div>
      </div>
    ),
    generateHtml: () => `
<div class="email-section-wrapper" style="background-color:#ffffff;margin:0px auto;max-width:700px;">
  <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;background-color:#ffffff;">
    <tbody>
      <tr>
        <td style="direction:ltr;font-size:0px;padding:16px 20px;text-align:center;">
          <div class="mj-column-per-100 mj-outlook-group-fix" style="font-size:0px;text-align:center;direction:ltr;display:inline-block;vertical-align:top;width:100%;">
            <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="vertical-align:top;" width="100%">
              <tbody>
                <tr>
                  <td align="center" style="font-size:0px;padding:0;word-break:break-word;">
                    <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:separate;line-height:100%;">
                      <tbody>
                        <tr>
                          <td align="center" bgcolor="#4f46e5" role="presentation" style="border:none;border-radius:6px;cursor:auto;padding:12px 28px;background:#4f46e5;" valign="middle">
                            <a href="#" style="display:inline-block;background:#4f46e5;color:#ffffff;font-family:Arial, sans-serif;font-size:14px;font-weight:700;line-height:120%;margin:0;text-decoration:none;text-transform:none;border-radius:6px;" target="_blank">
                              Learn More &rarr;
                            </a>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </td>
      </tr>
    </tbody>
  </table>
</div>`,
  },
  {
    id: "divider-line",
    name: "Divider Line",
    category: "basic",
    description: "Subtle horizontal separator rule",
    icon: <Minus size={16} color="#94a3b8" />,
    preview: (
      <div style={{ width: "100%", height: "42px", background: "#f8fafc", borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 12px", border: "1px dashed #cbd5e1" }}>
        <div style={{ width: "100%", height: "1.5px", background: "#cbd5e1" }} />
      </div>
    ),
    generateHtml: () => `
<div class="email-section-wrapper" style="background-color:#ffffff;margin:0px auto;max-width:700px;">
  <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;background-color:#ffffff;">
    <tbody>
      <tr>
        <td style="direction:ltr;font-size:0px;padding:12px 20px;text-align:center;">
          <p style="border-top:solid 1px #e2e8f0;font-size:1px;margin:0px auto;width:100%;"></p>
        </td>
      </tr>
    </tbody>
  </table>
</div>`,
  },

  // --- 2. TWO COLUMN COMBINATIONS ---
  {
    id: "media-card-action",
    name: "Media + Content & Button Card",
    category: "2-col",
    description: "Image on one side with Title, Description, and CTA Button on the other side (1-click swappable)",
    icon: <LayoutTemplate size={16} color="#4f46e5" />,
    preview: (
      <div style={{ width: "100%", height: "54px", background: "#f8fafc", borderRadius: "4px", padding: "6px 8px", display: "flex", alignItems: "center", gap: "10px", border: "1px dashed #cbd5e1" }}>
        <div style={{ width: "42px", height: "42px", background: "#e0e7ff", borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <ImageIcon size={16} color="#4f46e5" />
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "3px" }}>
          <div style={{ width: "70%", height: "5px", background: "#0f172a", borderRadius: "2px" }} />
          <div style={{ width: "95%", height: "4px", background: "#94a3b8", borderRadius: "2px" }} />
          <div style={{ width: "45%", height: "10px", background: "#4f46e5", borderRadius: "2px", marginTop: "2px" }} />
        </div>
      </div>
    ),
    generateHtml: () => `
<div class="email-section-wrapper" style="background-color:#ffffff;margin:0px auto;max-width:700px;">
  <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;background-color:#ffffff;">
    <tbody>
      <tr>
        <td style="direction:ltr;font-size:0px;padding:20px 20px;text-align:center;vertical-align:middle;">
          <!-- Left Column: Image (40%) -->
          <div class="mj-column-per-40 mj-outlook-group-fix" style="font-size:0px;text-align:center;direction:ltr;display:inline-block;vertical-align:middle;width:40%;">
            <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="vertical-align:middle;" width="100%">
              <tbody>
                <tr>
                  <td align="center" style="font-size:0px;padding:0 12px;word-break:break-word;">
                    <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse;border-spacing:0px;">
                      <tbody>
                        <tr>
                          <td style="width:230px;">
                            <img alt="Media" src="${createSvgPlaceholder(260, 260, "Image", "#e0e7ff", "#4338ca")}" style="border:0;border-radius:8px;display:block;outline:none;text-decoration:none;height:auto;width:100%;max-width:230px;font-size:13px;" width="230" height="auto" />
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <!-- Right Column: Content + Button (60%) -->
          <div class="mj-column-per-60 mj-outlook-group-fix" style="font-size:0px;text-align:left;direction:ltr;display:inline-block;vertical-align:middle;width:60%;">
            <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="vertical-align:middle;" width="100%">
              <tbody>
                <tr>
                  <td align="left" style="font-size:0px;padding:0 12px;word-break:break-word;">
                    <div style="font-family:Arial, sans-serif;font-size:18px;font-weight:700;line-height:24px;text-align:left;color:#0f172a;margin-bottom:8px;">
                      Transformative Care Headline
                    </div>
                    <div style="font-family:Arial, sans-serif;font-size:14px;line-height:22px;text-align:left;color:#475569;margin-bottom:16px;">
                      Highlight key benefits, clinical insights, or product details here. This layout adapts seamlessly to mobile screens.
                    </div>
                    <table border="0" cellpadding="0" cellspacing="0" role="presentation" align="left" style="border-collapse:separate;line-height:100%;">
                      <tbody>
                        <tr>
                          <td align="center" bgcolor="#4f46e5" role="presentation" style="border:none;border-radius:6px;cursor:auto;padding:10px 24px;background:#4f46e5;" valign="middle">
                            <a href="#" style="display:inline-block;background:#4f46e5;color:#ffffff;font-family:Arial, sans-serif;font-size:13.5px;font-weight:700;line-height:120%;margin:0;text-decoration:none;text-transform:none;border-radius:6px;" target="_blank">
                              Learn More &rarr;
                            </a>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </td>
      </tr>
    </tbody>
  </table>
</div>`,
  },
  {
    id: "2col-img-left-text-right",
    name: "Image Left + Text Right",
    category: "2-col",
    description: "Side-by-side layout (30% image, 70% text) that stacks on mobile",
    icon: <Columns2 size={16} color="#4f46e5" />,
    preview: (
      <div style={{ width: "100%", height: "46px", background: "#f8fafc", borderRadius: "4px", padding: "5px 8px", display: "flex", alignItems: "center", gap: "8px", border: "1px dashed #cbd5e1" }}>
        <div style={{ width: "36px", height: "36px", background: "#c7d2fe", borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <ImageIcon size={14} color="#4f46e5" />
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "3px" }}>
          <div style={{ width: "60%", height: "5px", background: "#94a3b8", borderRadius: "2px" }} />
          <div style={{ width: "100%", height: "4px", background: "#cbd5e1", borderRadius: "2px" }} />
          <div style={{ width: "80%", height: "4px", background: "#e2e8f0", borderRadius: "2px" }} />
        </div>
      </div>
    ),
    generateHtml: () => `
<div class="email-section-wrapper" style="background-color:#ffffff;margin:0px auto;max-width:700px;">
  <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;background-color:#ffffff;">
    <tbody>
      <tr>
        <td style="direction:ltr;font-size:0px;padding:16px 20px;text-align:center;">
          <div class="mj-column-per-30 mj-outlook-group-fix mobile-center-img" style="font-size:0px;text-align:left;direction:ltr;display:inline-block;vertical-align:top;width:30%;">
            <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="vertical-align:top;" width="100%">
              <tbody>
                <tr>
                  <td align="left" style="font-size:0px;padding:0 12px 0 0;word-break:break-word;">
                    <img alt="Thumbnail" src="${createSvgPlaceholder(200, 200, "Image", "#e0e7ff", "#4338ca")}" style="border:0;border-radius:6px;display:block;outline:none;text-decoration:none;height:auto;width:100%;max-width:140px;font-size:13px;" width="140" height="auto" />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="mj-column-per-70 mj-outlook-group-fix body-copy" style="font-size:0px;text-align:left;direction:ltr;display:inline-block;vertical-align:top;width:70%;">
            <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="vertical-align:top;" width="100%">
              <tbody>
                <tr>
                  <td align="left" style="font-size:0px;padding:0;word-break:break-word;">
                    <div style="font-family:Arial, sans-serif;font-size:17px;font-weight:700;line-height:22px;text-align:left;color:#0f172a;margin-bottom:6px;">
                      Feature Headline Here
                    </div>
                    <div style="font-family:Arial, sans-serif;font-size:14px;line-height:21px;text-align:left;color:#475569;">
                      Add your description text here. On desktop this sits next to the image, and on mobile it stacks beneath.
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </td>
      </tr>
    </tbody>
  </table>
</div>`,
  },
  {
    id: "2col-text-left-img-right",
    name: "Text Left + Image Right",
    category: "2-col",
    description: "Side-by-side layout (70% text, 30% image)",
    icon: <Columns2 size={16} color="#4f46e5" />,
    preview: (
      <div style={{ width: "100%", height: "46px", background: "#f8fafc", borderRadius: "4px", padding: "5px 8px", display: "flex", alignItems: "center", gap: "8px", border: "1px dashed #cbd5e1" }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "3px" }}>
          <div style={{ width: "60%", height: "5px", background: "#94a3b8", borderRadius: "2px" }} />
          <div style={{ width: "100%", height: "4px", background: "#cbd5e1", borderRadius: "2px" }} />
          <div style={{ width: "80%", height: "4px", background: "#e2e8f0", borderRadius: "2px" }} />
        </div>
        <div style={{ width: "36px", height: "36px", background: "#c7d2fe", borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <ImageIcon size={14} color="#4f46e5" />
        </div>
      </div>
    ),
    generateHtml: () => `
<div class="email-section-wrapper" style="background-color:#ffffff;margin:0px auto;max-width:700px;">
  <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;background-color:#ffffff;">
    <tbody>
      <tr>
        <td style="direction:ltr;font-size:0px;padding:16px 20px;text-align:center;">
          <div class="mj-column-per-70 mj-outlook-group-fix body-copy" style="font-size:0px;text-align:left;direction:ltr;display:inline-block;vertical-align:top;width:70%;">
            <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="vertical-align:top;" width="100%">
              <tbody>
                <tr>
                  <td align="left" style="font-size:0px;padding:0 12px 0 0;word-break:break-word;">
                    <div style="font-family:Arial, sans-serif;font-size:17px;font-weight:700;line-height:22px;text-align:left;color:#0f172a;margin-bottom:6px;">
                      Headline on Left Side
                    </div>
                    <div style="font-family:Arial, sans-serif;font-size:14px;line-height:21px;text-align:left;color:#475569;">
                      Provide comprehensive details here alongside a supporting visual asset or diagram on the right.
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="mj-column-per-30 mj-outlook-group-fix mobile-center-img" style="font-size:0px;text-align:left;direction:ltr;display:inline-block;vertical-align:top;width:30%;">
            <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="vertical-align:top;" width="100%">
              <tbody>
                <tr>
                  <td align="right" style="font-size:0px;padding:0;word-break:break-word;">
                    <img alt="Thumbnail" src="${createSvgPlaceholder(200, 200, "Image", "#e0e7ff", "#4338ca")}" style="border:0;border-radius:6px;display:block;outline:none;text-decoration:none;height:auto;width:100%;max-width:140px;font-size:13px;" width="140" height="auto" />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </td>
      </tr>
    </tbody>
  </table>
</div>`,
  },
  {
    id: "2col-img-img",
    name: "2 Images (50 / 50 Grid)",
    category: "2-col",
    description: "Two equal image cards side by side",
    icon: <SplitSquareVertical size={16} color="#059669" />,
    preview: (
      <div style={{ width: "100%", height: "46px", background: "#f8fafc", borderRadius: "4px", padding: "4px 8px", display: "flex", alignItems: "center", gap: "8px", border: "1px dashed #cbd5e1" }}>
        <div style={{ flex: 1, height: "36px", background: "#c7d2fe", borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <ImageIcon size={14} color="#4f46e5" />
        </div>
        <div style={{ flex: 1, height: "36px", background: "#a7f3d0", borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <ImageIcon size={14} color="#059669" />
        </div>
      </div>
    ),
    generateHtml: () => `
<div class="email-section-wrapper" style="background-color:#ffffff;margin:0px auto;max-width:700px;">
  <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;background-color:#ffffff;">
    <tbody>
      <tr>
        <td style="direction:ltr;font-size:0px;padding:16px 20px;text-align:center;">
          <div class="mj-column-per-50 mj-outlook-group-fix mobile-center-img" style="font-size:0px;text-align:left;direction:ltr;display:inline-block;vertical-align:top;width:50%;">
            <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="vertical-align:top;" width="100%">
              <tbody>
                <tr>
                  <td align="center" style="font-size:0px;padding:0 8px 0 0;word-break:break-word;">
                    <img alt="Left Image" src="${createSvgPlaceholder(320, 220, "Image 1", "#e0e7ff", "#4338ca")}" style="border:0;border-radius:8px;display:block;outline:none;text-decoration:none;height:auto;width:100%;font-size:13px;" width="310" height="auto" />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="mj-column-per-50 mj-outlook-group-fix mobile-center-img" style="font-size:0px;text-align:left;direction:ltr;display:inline-block;vertical-align:top;width:50%;">
            <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="vertical-align:top;" width="100%">
              <tbody>
                <tr>
                  <td align="center" style="font-size:0px;padding:0 0 0 8px;word-break:break-word;">
                    <img alt="Right Image" src="${createSvgPlaceholder(320, 220, "Image 2", "#dcfce7", "#15803d")}" style="border:0;border-radius:8px;display:block;outline:none;text-decoration:none;height:auto;width:100%;font-size:13px;" width="310" height="auto" />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </td>
      </tr>
    </tbody>
  </table>
</div>`,
  },
  {
    id: "2col-cards",
    name: "2 Feature Cards",
    category: "2-col",
    description: "Two shaded cards with title and text",
    icon: <LayoutTemplate size={16} color="#6366f1" />,
    preview: (
      <div style={{ width: "100%", height: "46px", background: "#f8fafc", borderRadius: "4px", padding: "4px 6px", display: "flex", alignItems: "center", gap: "6px", border: "1px dashed #cbd5e1" }}>
        <div style={{ flex: 1, height: "36px", background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "4px", padding: "4px", display: "flex", flexDirection: "column", gap: "3px" }}>
          <div style={{ width: "70%", height: "4px", background: "#6366f1", borderRadius: "2px" }} />
          <div style={{ width: "100%", height: "3px", background: "#cbd5e1", borderRadius: "2px" }} />
        </div>
        <div style={{ flex: 1, height: "36px", background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "4px", padding: "4px", display: "flex", flexDirection: "column", gap: "3px" }}>
          <div style={{ width: "70%", height: "4px", background: "#6366f1", borderRadius: "2px" }} />
          <div style={{ width: "100%", height: "3px", background: "#cbd5e1", borderRadius: "2px" }} />
        </div>
      </div>
    ),
    generateHtml: () => `
<div class="email-section-wrapper" style="background-color:#ffffff;margin:0px auto;max-width:700px;">
  <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;background-color:#ffffff;">
    <tbody>
      <tr>
        <td style="direction:ltr;font-size:0px;padding:16px 20px;text-align:center;">
          <div class="mj-column-per-50 mj-outlook-group-fix" style="font-size:0px;text-align:left;direction:ltr;display:inline-block;vertical-align:top;width:50%;">
            <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="vertical-align:top;" width="100%">
              <tbody>
                <tr>
                  <td align="left" style="font-size:0px;padding:0 6px 0 0;word-break:break-word;">
                    <div style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;">
                      <h4 style="margin:0 0 8px 0;font-size:16px;font-weight:700;color:#0f172a;">Card 1 Title</h4>
                      <p style="margin:0;font-size:13px;line-height:20px;color:#64748b;">Key benefits or notes here for the first column.</p>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="mj-column-per-50 mj-outlook-group-fix" style="font-size:0px;text-align:left;direction:ltr;display:inline-block;vertical-align:top;width:50%;">
            <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="vertical-align:top;" width="100%">
              <tbody>
                <tr>
                  <td align="left" style="font-size:0px;padding:0 0 0 6px;word-break:break-word;">
                    <div style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;">
                      <h4 style="margin:0 0 8px 0;font-size:16px;font-weight:700;color:#0f172a;">Card 2 Title</h4>
                      <p style="margin:0;font-size:13px;line-height:20px;color:#64748b;">Key benefits or notes here for the second column.</p>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </td>
      </tr>
    </tbody>
  </table>
</div>`,
  },
  {
    id: "2col-buttons",
    name: "2 Buttons (Side-by-Side)",
    category: "2-col",
    description: "Two action buttons aligned side by side",
    icon: <Square size={16} color="#4f46e5" />,
    preview: (
      <div style={{ width: "100%", height: "46px", background: "#f8fafc", borderRadius: "4px", padding: "4px 8px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", border: "1px dashed #cbd5e1" }}>
        <div style={{ background: "#4f46e5", color: "#ffffff", fontSize: "9.5px", fontWeight: "700", padding: "4px 10px", borderRadius: "4px" }}>
          Primary &rarr;
        </div>
        <div style={{ background: "#ffffff", border: "1px solid #cbd5e1", color: "#334155", fontSize: "9.5px", fontWeight: "700", padding: "3px 10px", borderRadius: "4px" }}>
          Secondary
        </div>
      </div>
    ),
    generateHtml: () => `
<div class="email-section-wrapper" style="background-color:#ffffff;margin:0px auto;max-width:700px;">
  <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;background-color:#ffffff;">
    <tbody>
      <tr>
        <td style="direction:ltr;font-size:0px;padding:16px 20px;text-align:center;">
          <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 auto;display:inline-table;">
            <tbody>
              <tr>
                <td align="center" style="padding:0 8px 0 0;" valign="middle">
                  <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:separate;line-height:100%;">
                    <tbody>
                      <tr>
                        <td align="center" bgcolor="#4f46e5" role="presentation" style="border:none;border-radius:6px;cursor:auto;padding:12px 24px;background:#4f46e5;" valign="middle">
                          <a href="#" style="display:inline-block;background:#4f46e5;color:#ffffff;font-family:Arial, sans-serif;font-size:14px;font-weight:700;line-height:120%;margin:0;text-decoration:none;text-transform:none;border-radius:6px;" target="_blank">
                            Primary Button &rarr;
                          </a>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
                <td align="center" style="padding:0 0 0 8px;" valign="middle">
                  <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:separate;line-height:100%;">
                    <tbody>
                      <tr>
                        <td align="center" bgcolor="#f1f5f9" role="presentation" style="border:1px solid #cbd5e1;border-radius:6px;cursor:auto;padding:11px 24px;background:#f1f5f9;" valign="middle">
                          <a href="#" style="display:inline-block;background:#f1f5f9;color:#334155;font-family:Arial, sans-serif;font-size:14px;font-weight:700;line-height:120%;margin:0;text-decoration:none;text-transform:none;border-radius:6px;" target="_blank">
                            Secondary Button
                          </a>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
            </tbody>
          </table>
        </td>
      </tr>
    </tbody>
  </table>
</div>`,
  },

  // --- 3. THREE COLUMN COMBINATIONS ---
  {
    id: "3col-icons",
    name: "3 Icons / Feature Grid",
    category: "3-col",
    description: "Three equal 33.3% columns with icons and labels",
    icon: <Columns3 size={16} color="#7c3aed" />,
    preview: (
      <div style={{ width: "100%", height: "46px", background: "#f8fafc", borderRadius: "4px", padding: "4px 6px", display: "flex", alignItems: "center", gap: "6px", border: "1px dashed #cbd5e1" }}>
        {[1, 2, 3].map((i) => (
          <div key={i} style={{ flex: 1, height: "36px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "3px" }}>
            <div style={{ width: "18px", height: "18px", borderRadius: "50%", background: "#ede9fe", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "9px", fontWeight: "700", color: "#7c3aed" }}>{i}</div>
            <div style={{ width: "24px", height: "3px", background: "#cbd5e1", borderRadius: "2px" }} />
          </div>
        ))}
      </div>
    ),
    generateHtml: () => `
<div class="email-section-wrapper" style="background-color:#ffffff;margin:0px auto;max-width:700px;">
  <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;background-color:#ffffff;">
    <tbody>
      <tr>
        <td style="direction:ltr;font-size:0px;padding:16px 20px;text-align:center;">
          ${[1, 2, 3].map((num) => `
          <div class="mj-column-per-33-333333 mj-outlook-group-fix mobile-center-img" style="font-size:0px;text-align:center;direction:ltr;display:inline-block;vertical-align:top;width:33.333333%;">
            <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="vertical-align:top;" width="100%">
              <tbody>
                <tr>
                  <td align="center" style="font-size:0px;padding:8px;word-break:break-word;">
                    <div style="width:48px;height:48px;border-radius:50%;background:#e0e7ff;display:flex;align-items:center;justify-content:center;margin:0 auto 10px;font-size:18px;font-weight:bold;color:#4f46e5;line-height:48px;">
                      ${num}
                    </div>
                    <div style="font-family:Arial, sans-serif;font-size:14px;font-weight:700;color:#0f172a;margin-bottom:4px;">Feature ${num}</div>
                    <div style="font-family:Arial, sans-serif;font-size:12px;color:#64748b;line-height:17px;">Short summary description.</div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>`).join("")}
        </td>
      </tr>
    </tbody>
  </table>
</div>`,
  },
  {
    id: "3col-alt-img-text-img",
    name: "Alternating: Image | Text | Image",
    category: "3-col",
    description: "3 columns: Image in 1 & 3, Text in 2",
    icon: <Columns3 size={16} color="#0891b2" />,
    preview: (
      <div style={{ width: "100%", height: "46px", background: "#f8fafc", borderRadius: "4px", padding: "4px 6px", display: "flex", alignItems: "center", gap: "6px", border: "1px dashed #cbd5e1" }}>
        <div style={{ flex: 1, height: "36px", background: "#c7d2fe", borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <ImageIcon size={12} color="#4f46e5" />
        </div>
        <div style={{ flex: 1, height: "36px", display: "flex", flexDirection: "column", justifyContent: "center", gap: "3px" }}>
          <div style={{ width: "80%", height: "4px", background: "#0891b2", borderRadius: "2px" }} />
          <div style={{ width: "100%", height: "3px", background: "#cbd5e1", borderRadius: "2px" }} />
        </div>
        <div style={{ flex: 1, height: "36px", background: "#a7f3d0", borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <ImageIcon size={12} color="#059669" />
        </div>
      </div>
    ),
    generateHtml: () => `
<div class="email-section-wrapper" style="background-color:#ffffff;margin:0px auto;max-width:700px;">
  <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;background-color:#ffffff;">
    <tbody>
      <tr>
        <td style="direction:ltr;font-size:0px;padding:16px 20px;text-align:center;">
          <div class="mj-column-per-33-333333 mj-outlook-group-fix mobile-center-img" style="font-size:0px;text-align:center;direction:ltr;display:inline-block;vertical-align:middle;width:33.333333%;">
            <img alt="Thumbnail 1" src="${createSvgPlaceholder(220, 220, "Img 1", "#e0e7ff", "#4338ca")}" style="border:0;border-radius:6px;width:100%;max-width:180px;height:auto;" width="180" />
          </div>
          <div class="mj-column-per-33-333333 mj-outlook-group-fix body-copy" style="font-size:0px;text-align:center;direction:ltr;display:inline-block;vertical-align:middle;width:33.333333%;">
            <div style="font-family:Arial, sans-serif;font-size:15px;font-weight:700;color:#0f172a;margin-bottom:6px;">Center Text</div>
            <div style="font-family:Arial, sans-serif;font-size:12px;line-height:18px;color:#475569;">Description positioned between two visuals.</div>
          </div>
          <div class="mj-column-per-33-333333 mj-outlook-group-fix mobile-center-img" style="font-size:0px;text-align:center;direction:ltr;display:inline-block;vertical-align:middle;width:33.333333%;">
            <img alt="Thumbnail 2" src="${createSvgPlaceholder(220, 220, "Img 2", "#dcfce7", "#15803d")}" style="border:0;border-radius:6px;width:100%;max-width:180px;height:auto;" width="180" />
          </div>
        </td>
      </tr>
    </tbody>
  </table>
</div>`,
  },

  // --- 4. FOUR COLUMN COMBINATIONS ---
  {
    id: "4col-logos",
    name: "4 Columns (25% Logos / Badges)",
    category: "4-col",
    description: "4 equal 25% columns for partner logos or icons",
    icon: <Columns4 size={16} color="#ec4899" />,
    preview: (
      <div style={{ width: "100%", height: "44px", background: "#f8fafc", borderRadius: "4px", padding: "4px 4px", display: "flex", alignItems: "center", gap: "4px", border: "1px dashed #cbd5e1" }}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} style={{ flex: 1, height: "32px", background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "3px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "9px", fontWeight: "700", color: "#ec4899" }}>
            L{i}
          </div>
        ))}
      </div>
    ),
    generateHtml: () => `
<div class="email-section-wrapper" style="background-color:#ffffff;margin:0px auto;max-width:700px;">
  <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;background-color:#ffffff;">
    <tbody>
      <tr>
        <td style="direction:ltr;font-size:0px;padding:16px 20px;text-align:center;">
          ${[1, 2, 3, 4].map((num) => `
          <div class="mj-column-per-25 mj-outlook-group-fix mobile-center-img" style="font-size:0px;text-align:center;direction:ltr;display:inline-block;vertical-align:middle;width:25%;">
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:12px 6px;margin:0 4px;font-size:12px;font-weight:bold;color:#475569;">
              Logo ${num}
            </div>
          </div>`).join("")}
        </td>
      </tr>
    </tbody>
  </table>
</div>`,
  },
  {
    id: "4col-alt-img-text-img-text",
    name: "Alternating: Img | Text | Img | Text",
    category: "4-col",
    description: "4 columns: 1st Image, 2nd Text, 3rd Image, 4th Text",
    icon: <Columns4 size={16} color="#059669" />,
    preview: (
      <div style={{ width: "100%", height: "44px", background: "#f8fafc", borderRadius: "4px", padding: "4px 4px", display: "flex", alignItems: "center", gap: "4px", border: "1px dashed #cbd5e1" }}>
        <div style={{ flex: 1, height: "32px", background: "#c7d2fe", borderRadius: "3px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <ImageIcon size={11} color="#4f46e5" />
        </div>
        <div style={{ flex: 1, height: "32px", background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "3px", display: "flex", flexDirection: "column", justifyContent: "center", padding: "2px", gap: "2px" }}>
          <div style={{ width: "80%", height: "3px", background: "#475569" }} />
          <div style={{ width: "100%", height: "2px", background: "#cbd5e1" }} />
        </div>
        <div style={{ flex: 1, height: "32px", background: "#a7f3d0", borderRadius: "3px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <ImageIcon size={11} color="#059669" />
        </div>
        <div style={{ flex: 1, height: "32px", background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "3px", display: "flex", flexDirection: "column", justifyContent: "center", padding: "2px", gap: "2px" }}>
          <div style={{ width: "80%", height: "3px", background: "#475569" }} />
          <div style={{ width: "100%", height: "2px", background: "#cbd5e1" }} />
        </div>
      </div>
    ),
    generateHtml: () => `
<div class="email-section-wrapper" style="background-color:#ffffff;margin:0px auto;max-width:700px;">
  <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;background-color:#ffffff;">
    <tbody>
      <tr>
        <td style="direction:ltr;font-size:0px;padding:16px 20px;text-align:center;">
          <div class="mj-column-per-25 mj-outlook-group-fix mobile-center-img" style="font-size:0px;text-align:center;direction:ltr;display:inline-block;vertical-align:middle;width:25%;">
            <img alt="Visual 1" src="${createSvgPlaceholder(150, 150, "Img 1", "#e0e7ff", "#4338ca")}" style="border:0;border-radius:4px;width:100%;max-width:120px;height:auto;" width="120" />
          </div>
          <div class="mj-column-per-25 mj-outlook-group-fix body-copy" style="font-size:0px;text-align:left;direction:ltr;display:inline-block;vertical-align:middle;width:25%;">
            <div style="font-family:Arial,sans-serif;font-size:12px;font-weight:bold;color:#0f172a;padding:0 6px;">Step 1</div>
            <div style="font-family:Arial,sans-serif;font-size:11px;color:#64748b;line-height:16px;padding:0 6px;">Initial review</div>
          </div>
          <div class="mj-column-per-25 mj-outlook-group-fix mobile-center-img" style="font-size:0px;text-align:center;direction:ltr;display:inline-block;vertical-align:middle;width:25%;">
            <img alt="Visual 2" src="${createSvgPlaceholder(150, 150, "Img 2", "#dcfce7", "#15803d")}" style="border:0;border-radius:4px;width:100%;max-width:120px;height:auto;" width="120" />
          </div>
          <div class="mj-column-per-25 mj-outlook-group-fix body-copy" style="font-size:0px;text-align:left;direction:ltr;display:inline-block;vertical-align:middle;width:25%;">
            <div style="font-family:Arial,sans-serif;font-size:12px;font-weight:bold;color:#0f172a;padding:0 6px;">Step 2</div>
            <div style="font-family:Arial,sans-serif;font-size:11px;color:#64748b;line-height:16px;padding:0 6px;">Final outcome</div>
          </div>
        </td>
      </tr>
    </tbody>
  </table>
</div>`,
  },
  {
    id: "4col-alt-text-img-text-img",
    name: "Alternating: Text | Img | Text | Img",
    category: "4-col",
    description: "4 columns: 1st Text, 2nd Image, 3rd Text, 4th Image",
    icon: <Columns4 size={16} color="#d97706" />,
    preview: (
      <div style={{ width: "100%", height: "44px", background: "#f8fafc", borderRadius: "4px", padding: "4px 4px", display: "flex", alignItems: "center", gap: "4px", border: "1px dashed #cbd5e1" }}>
        <div style={{ flex: 1, height: "32px", background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "3px", display: "flex", flexDirection: "column", justifyContent: "center", padding: "2px", gap: "2px" }}>
          <div style={{ width: "80%", height: "3px", background: "#d97706" }} />
          <div style={{ width: "100%", height: "2px", background: "#cbd5e1" }} />
        </div>
        <div style={{ flex: 1, height: "32px", background: "#fef3c7", borderRadius: "3px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <ImageIcon size={11} color="#d97706" />
        </div>
        <div style={{ flex: 1, height: "32px", background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "3px", display: "flex", flexDirection: "column", justifyContent: "center", padding: "2px", gap: "2px" }}>
          <div style={{ width: "80%", height: "3px", background: "#d97706" }} />
          <div style={{ width: "100%", height: "2px", background: "#cbd5e1" }} />
        </div>
        <div style={{ flex: 1, height: "32px", background: "#fef3c7", borderRadius: "3px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <ImageIcon size={11} color="#d97706" />
        </div>
      </div>
    ),
    generateHtml: () => `
<div class="email-section-wrapper" style="background-color:#ffffff;margin:0px auto;max-width:700px;">
  <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;background-color:#ffffff;">
    <tbody>
      <tr>
        <td style="direction:ltr;font-size:0px;padding:16px 20px;text-align:center;">
          <div class="mj-column-per-25 mj-outlook-group-fix body-copy" style="font-size:0px;text-align:left;direction:ltr;display:inline-block;vertical-align:middle;width:25%;">
            <div style="font-family:Arial,sans-serif;font-size:12px;font-weight:bold;color:#0f172a;padding:0 6px;">Phase A</div>
            <div style="font-family:Arial,sans-serif;font-size:11px;color:#64748b;line-height:16px;padding:0 6px;">Discovery</div>
          </div>
          <div class="mj-column-per-25 mj-outlook-group-fix mobile-center-img" style="font-size:0px;text-align:center;direction:ltr;display:inline-block;vertical-align:middle;width:25%;">
            <img alt="Visual A" src="${createSvgPlaceholder(150, 150, "Img A", "#fef3c7", "#d97706")}" style="border:0;border-radius:4px;width:100%;max-width:120px;height:auto;" width="120" />
          </div>
          <div class="mj-column-per-25 mj-outlook-group-fix body-copy" style="font-size:0px;text-align:left;direction:ltr;display:inline-block;vertical-align:middle;width:25%;">
            <div style="font-family:Arial,sans-serif;font-size:12px;font-weight:bold;color:#0f172a;padding:0 6px;">Phase B</div>
            <div style="font-family:Arial,sans-serif;font-size:11px;color:#64748b;line-height:16px;padding:0 6px;">Execution</div>
          </div>
          <div class="mj-column-per-25 mj-outlook-group-fix mobile-center-img" style="font-size:0px;text-align:center;direction:ltr;display:inline-block;vertical-align:middle;width:25%;">
            <img alt="Visual B" src="${createSvgPlaceholder(150, 150, "Img B", "#fef3c7", "#d97706")}" style="border:0;border-radius:4px;width:100%;max-width:120px;height:auto;" width="120" />
          </div>
        </td>
      </tr>
    </tbody>
  </table>
</div>`,
  }
];
