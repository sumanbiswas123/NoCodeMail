import React, { useState } from "react";
import { Screen1Welcome } from "./screens/Screen1Welcome";
import { Screen2Process } from "./screens/Screen2Process";
import { Screen3Editor } from "./screens/Screen3Editor";
import { MarkedRegion, FooterPreset } from "./services/ipc";
import "./App.css";

export function App() {
  const [currentScreen, setCurrentScreen] = useState<1 | 2 | 3>(1);
  const [selectedPdfPath, setSelectedPdfPath] = useState<string>("");
  const [selectedPageNum, setSelectedPageNum] = useState<number | undefined>(undefined);
  const [selectedEmailWidth, setSelectedEmailWidth] = useState<number>(700);
  const [selectedMarkedRegions, setSelectedMarkedRegions] = useState<MarkedRegion[]>([]);
  const [selectedFooter, setSelectedFooter] = useState<FooterPreset | null>(null);
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
    setSelectedPdfPath(path);
    setSelectedPageNum(pageNum);
    setSelectedEmailWidth(emailWidth);
    setSelectedMarkedRegions(markedRegions);
    setSelectedFooter(footerPreset);
    setCurrentScreen(2); // Auto transition to Screen 2
  };

  const handleHtmlLoaded = (path: string, content: string) => {
    const cleanName = path.split(/[/\\]/).pop() || "campaign.html";
    setEditorFilePath(path);
    setEditorFileName(cleanName);
    setEditorHtml(content);
    setCurrentScreen(3); // Jump directly to Screen 3
  };

  const handleOpenEditor = (htmlContent: string, fileName: string) => {
    const cleanName = fileName.split(/[/\\]/).pop() || "campaign.html";
    setEditorFilePath(fileName);
    setEditorHtml(htmlContent);
    setEditorFileName(cleanName);
    setCurrentScreen(3);
  };

  return (
    <div className="app-container">
      {currentScreen === 1 && (
        <Screen1Welcome
          onPdfSelected={handlePdfSelected}
          onHtmlLoaded={handleHtmlLoaded}
        />
      )}

      {currentScreen === 2 && (
        <Screen2Process
          pdfPath={selectedPdfPath}
          targetPage={selectedPageNum}
          emailWidth={selectedEmailWidth}
          markedRegions={selectedMarkedRegions}
          selectedFooter={selectedFooter}
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
        />
      )}
    </div>
  );
}

export default App;

