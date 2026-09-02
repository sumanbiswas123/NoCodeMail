import React, { useState } from "react";
import { Screen1Welcome } from "./screens/Screen1Welcome";
import { Screen2Process } from "./screens/Screen2Process";
import { Screen3Editor } from "./screens/Screen3Editor";
import { MarkedRegion, FooterPreset, PDFExtractionData } from "./services/ipc";
import "./App.css";

export function App() {
  const [currentScreen, setCurrentScreen] = useState<1 | 2 | 3>(1);
  const [openedFromScreen, setOpenedFromScreen] = useState<1 | 2>(1);
  const [selectedPdfPath, setSelectedPdfPath] = useState<string>("");
  const [selectedPageNum, setSelectedPageNum] = useState<number | undefined>(undefined);
  const [selectedEmailWidth, setSelectedEmailWidth] = useState<number>(700);
  const [selectedMarkedRegions, setSelectedMarkedRegions] = useState<MarkedRegion[]>([]);
  const [selectedFooter, setSelectedFooter] = useState<FooterPreset | null>(null);

  // Cached Screen 2 Process State (persists across screen switches)
  const [processExtractData, setProcessExtractData] = useState<PDFExtractionData | null>(null);
  const [processMjmlText, setProcessMjmlText] = useState<string>("");
  const [processGeneratedHtml, setProcessGeneratedHtml] = useState<string>("");
  const [processExtractionKey, setProcessExtractionKey] = useState<string>("");

  const [editorFilePath, setEditorFilePath] = useState<string>("");
  const [editorHtml, setEditorHtml] = useState<string>("");
  const [editorFileName, setEditorFileName] = useState<string>("campaign_v2.html");

  const handlePdfSelected = (
    path: string,
    pageNum?: number,
    emailWidth: number = 700,
    markedRegions: MarkedRegion[] = [],
    footerPreset: FooterPreset | null = null
  ) => {
    const newKey = `${path}_${pageNum || 1}_${emailWidth}_${markedRegions.length}_${footerPreset?.country || ""}`;
    if (newKey !== processExtractionKey) {
      // New PDF or updated configuration: clear previous cached extraction
      setProcessExtractData(null);
      setProcessMjmlText("");
      setProcessGeneratedHtml("");
      setProcessExtractionKey(newKey);
    }

    setSelectedPdfPath(path);
    setSelectedPageNum(pageNum);
    setSelectedEmailWidth(emailWidth);
    setSelectedMarkedRegions(markedRegions);
    setSelectedFooter(footerPreset);
    setOpenedFromScreen(2);
    setCurrentScreen(2); // Auto transition to Screen 2
  };

  const handleResumeProcess = (params: {
    pdfPath: string;
    targetPage?: number;
    emailWidth?: number;
    extractData: PDFExtractionData;
    mjmlText?: string;
    generatedHtml?: string;
  }) => {
    setSelectedPdfPath(params.pdfPath);
    setSelectedPageNum(params.targetPage || 1);
    setSelectedEmailWidth(params.emailWidth || 700);
    setSelectedMarkedRegions([]);
    setSelectedFooter(null);
    setProcessExtractData(params.extractData);
    setProcessMjmlText(params.mjmlText || "");
    setProcessGeneratedHtml(params.generatedHtml || "");
    setProcessExtractionKey(`${params.pdfPath}_${params.targetPage || 1}_${params.emailWidth || 700}`);
    setOpenedFromScreen(2);
    setCurrentScreen(2);
  };

  const handleHtmlLoaded = (path: string, content: string) => {
    const cleanName = path.split(/[/\\]/).pop() || "campaign.html";
    setSelectedPdfPath(""); // Clear PDF context so Back button returns to Home
    setOpenedFromScreen(1);
    setEditorFilePath(path);
    setEditorFileName(cleanName);
    setEditorHtml(content);
    setCurrentScreen(3); // Jump directly to Screen 3
  };

  const handleOpenEditor = (htmlContent: string, fileName: string) => {
    const cleanName = fileName.split(/[/\\]/).pop() || "campaign.html";
    setOpenedFromScreen(2);
    setEditorFilePath(fileName);
    setEditorHtml(htmlContent);
    setEditorFileName(cleanName);
    setCurrentScreen(3);
  };

  const handleSaveProcessState = (data: PDFExtractionData | null, mjml: string, html: string) => {
    setProcessExtractData(data);
    setProcessMjmlText(mjml);
    setProcessGeneratedHtml(html);
  };

  return (
    <div className="app-container">
      {currentScreen === 1 && (
        <Screen1Welcome
          onPdfSelected={handlePdfSelected}
          onHtmlLoaded={handleHtmlLoaded}
          onResumeProcess={handleResumeProcess}
        />
      )}

      {currentScreen === 2 && (
        <Screen2Process
          pdfPath={selectedPdfPath}
          targetPage={selectedPageNum}
          emailWidth={selectedEmailWidth}
          markedRegions={selectedMarkedRegions}
          selectedFooter={selectedFooter}
          initialExtractData={processExtractData}
          initialMjmlText={processMjmlText}
          initialGeneratedHtml={processGeneratedHtml}
          onSaveProcessState={handleSaveProcessState}
          onBackToHome={() => setCurrentScreen(1)}
          onOpenEditor={handleOpenEditor}
        />
      )}

      {currentScreen === 3 && (
        <Screen3Editor
          initialHtml={editorHtml}
          initialFileName={editorFileName}
          initialFilePath={editorFilePath}
          onBackToHome={() => setCurrentScreen(1)}
          onBackToProcess={openedFromScreen === 2 && selectedPdfPath ? () => setCurrentScreen(2) : undefined}
        />
      )}
    </div>
  );
}

export default App;

