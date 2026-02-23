"use client";

import { useState, useCallback, useEffect } from "react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { FileUploadZone } from "@/components/file-upload-zone";
import { Button } from "@/components/ui/button";
import { 
  loadPDFPages, 
  reconstructPDF, 
  generateOrganizedFileName,
  PDFPage 
} from "@/lib/pdf-organizer";
import { ProcessedFile }
import { UploadedFile } from "@/types/pdf";
import { 
  LayoutGrid, 
  Download, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  Loader2,
  RotateCw,
  Trash2,
  ZoomIn,
  Save,
  Undo,
  Redo,
  FileArchive
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export default function OrganizePDFPage() {
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState<PDFPage[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "processing" | "success" | "error">("idle");
  const [processedFile, setProcessedFile] = useState<ProcessedFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [zoomPage, setZoomPage] = useState<number | null>(null);
  
  // Undo/Redo state
  const [history, setHistory] = useState<PDFPage[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Load pages when file is selected
  useEffect(() => {
    const loadPages = async () => {
      if (!file) {
        setPages([]);
        setStatus("idle");
        return;
      }

      setStatus("loading");
      try {
        const loadedPages = await loadPDFPages(file);
        setPages(loadedPages);
        setHistory([loadedPages]);
        setHistoryIndex(0);
        setStatus("ready");
      } catch (err) {
        console.error("Error loading PDF:", err);
        setError("Failed to load PDF. Please try another file.");
        setStatus("error");
      }
    };

    loadPages();
  }, [file]);

  // Handle file selection
  const handleFileSelect = useCallback((uploadedFiles: UploadedFile[]) => {
    if (files.length > 0) {
      setFile(uploadedFiles[0].file);
      setProcessedFile(null);
      setError(null);
      setHistory([]);
      setHistoryIndex(-1);
    }
  }, []);

  // Handle file removal
  const handleFileRemove = useCallback(() => {
    setFile(null);
    setPages([]);
    setProcessedFile(null);
    setStatus("idle");
    setError(null);
    setHistory([]);
    setHistoryIndex(-1);
  }, []);

  // Rotate a single page
  const rotatePage = useCallback((index: number) => {
    setPages(prev => {
      const newPages = prev.map((page, i) => {
        if (i === index) {
          return {
            ...page,
            rotation: (page.rotation + 90) % 360,
          };
        }
        return page;
      });
      
      // Add to history
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(newPages);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
      
      return newPages;
    });
  }, [history, historyIndex]);

  // Delete a single page
  const deletePage = useCallback((index: number) => {
    setPages(prev => {
      const newPages = prev.map((page, i) => {
        if (i === index) {
          return { ...page, deleted: !page.deleted };
        }
        return page;
      });
      
      // Add to history
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(newPages);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
      
      return newPages;
    });
  }, [pages, history, historyIndex]);

  // Undo action
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setPages(history[newIndex]);
      setHistoryIndex(newIndex);
    }
  }, [history, historyIndex]);

  // Redo action
  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setPages(history[newIndex]);
      setHistoryIndex(newIndex);
    }
  }, [history, historyIndex]);

  // Save/reconstruct PDF
  const handleSave = useCallback(async () => {
    if (!file || pages.length === 0) return;

    setStatus("processing");
    setError(null);

    try {
      const blob = await reconstructPDF(file, pages);
      const url = URL.createObjectURL(blob);
      const filename = generateOrganizedFileName(file.name);

      setProcessedFile({
        name: filename,
        blob,
        url,
      });
      setStatus("success");

      const deletedCount = pages.filter(p => p.deleted).length;
      toast.success("PDF saved successfully!", {
        description: `${deletedCount > 0 ? `${deletedCount} page(s) removed, ` : ''}rotations applied`,
        icon: <CheckCircle2 className="h-4 w-4 text-green-500" />,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      setStatus("error");

      toast.error("Save failed", {
        description: errorMessage,
        icon: <AlertCircle className="h-4 w-4 text-red-500" />,
      });
    }
  }, [file, pages]);

  // Handle download
  const handleDownload = useCallback(() => {
    if (!processedFile) return;
    
    const link = document.createElement("a");
    link.href = processedFile.url;
    link.download = processedFile.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [processedFile]);

  // Handle reset
  const handleReset = useCallback(() => {
    handleFileRemove();
  }, [handleFileRemove]);

  // Count active (non-deleted) pages
  const activePagesCount = pages.filter(p => !p.deleted).length;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-cyan-600/10 mb-4">
            <LayoutGrid className="w-8 h-8 text-cyan-600" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Organize PDF Pages</h1>
          <p className="text-muted-foreground">Rotate, delete, and reorder individual pages</p>
        </div>

        {!file && status !== "ready" && (
          <div className="mb-6">
            <FileUploadZone
              onFilesAdded={handleFileSelect}
              accept={{ "application/pdf": [".pdf"] }}
              maxFiles={1}
              disabled={status === "loading"}
            />
          </div>
        )}

        {file && (
          <div className="mb-4 p-3 bg-muted/50 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileArchive className="w-6 h-6 text-cyan-600" />
              <div>
                <p className="font-medium text-sm">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {pages.length} pages • {activePagesCount} after organizing
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={handleFileRemove} disabled={status === "processing"}>
              Change File
            </Button>
          </div>
        )}

        {status === "loading" && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-600 mb-4" />
            <p className="text-muted-foreground">Loading PDF pages...</p>
          </div>
        )}

        {status === "ready" && pages.length > 0 && (
          <>
            <div className="flex items-center justify-between mb-4 p-2 bg-card rounded-lg border">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={undo} disabled={historyIndex <= 0}>
                  <Undo className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={redo} disabled={historyIndex >= history.length - 1}>
                  <Redo className="w-4 h-4" />
                </Button>
                <span className="text-sm text-muted-foreground ml-2">
                  {historyIndex + 1} / {history.length}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{activePagesCount} pages</span>
                <Button onClick={handleSave} disabled={status === "processing"} size="sm">
                  {status === "processing" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Save PDF
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              <AnimatePresence>
                {pages.map((page, index) => (
                  <motion.div
                    key={page.index}
                    layout
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: page.deleted ? 0.3 : 1, scale: 1, rotate: page.rotation }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.3 }}
                    className={`relative group rounded-lg overflow-hidden border-2 ${page.deleted ? "border-red-300" : "border-transparent"} ${zoomPage === index ? "ring-2 ring-primary" : ""}`}
                    onMouseEnter={() => setZoomPage(index)}
                    onMouseLeave={() => setZoomPage(null)}
                  >
                    <div className={`aspect-[3/4] bg-muted flex items-center justify-center transition-transform duration-300`} style={{ transform: `rotate(${page.rotation}deg)` }}>
                      <FileText className="w-12 h-12 text-muted-foreground" />
                    </div>

                    <div className="absolute top-2 left-2 bg-background/80 px-2 py-0.5 rounded text-xs font-medium">
                      {page.pageNumber}
                    </div>

                    {page.deleted && (
                      <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center">
                        <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium">Deleted</span>
                      </div>
                    )}

                    <div className={`absolute bottom-2 left-2 right-2 flex justify-center gap-2 transition-opacity duration-200 ${zoomPage === index || page.deleted ? "opacity-100" : "opacity-0"}`}>
                      {!page.deleted && (
                        <button onClick={() => rotatePage(index)} className="p-2 bg-background/90 rounded-full hover:bg-primary hover:text-white transition-colors" title="Rotate 90°">
                          <RotateCw className="w-4 h-4" />
                        </button>
                      )}
                      <button onClick={() => deletePage(index)} className={`p-2 rounded-full transition-colors ${page.deleted ? "bg-green-500 hover:bg-green-600 text-white" : "bg-red-500 hover:bg-red-600 text-white"}`} title={page.deleted ? "Restore" : "Delete"}>
                        {page.deleted ? <Undo className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
                      </button>
                    </div>

                    {zoomPage === index && !page.deleted && (
                      <div className="absolute top-2 right-2 p-1 bg-background/80 rounded">
                        <ZoomIn className="w-3 h-3 text-muted-foreground" />
                      </div>
                    )}

                    {page.rotation !== 0 && !page.deleted && (
                      <div className="absolute top-2 right-2 bg-primary text-white text-xs px-2 py-0.5 rounded-full">
                        {page.rotation}°
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </>
        )}

        {error && status === "error" && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}

        {processedFile && status === "success" && (
          <div className="mb-6 p-6 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
                <div>
                  <h3 className="font-medium text-green-800">PDF Saved!</h3>
                  <p className="text-sm text-green-600">{processedFile.name}</p>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <Button onClick={handleDownload} className="flex-1">
                <Download className="w-4 h-4 mr-2" />
                Download Organized PDF
              </Button>
              <Button variant="outline" onClick={handleReset}>Organize Another</Button>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
