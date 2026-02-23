"use client";

import { useState, useCallback, useEffect } from "react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { FileUploadZone, UploadedFile } from "@/components/file-upload-zone";
import { FilePreviewList } from "@/components/file-preview-list";
import { Button } from "@/components/ui/button";
import { splitPDF, getPDFPageInfo, PageInfo } from "@/lib/pdf-split";
import { Scissors, Download, RotateCcw, CheckCircle2, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function SplitPDFPage() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [pages, setPages] = useState<PageInfo[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "processing" | "success" | "error">("idle");
  const [selectedRange, setSelectedRange] = useState<{ start: number; end: number }>({ start: 1, end: 1 });
  const [splitResults, setSplitResults] = useState<{ blob: Blob; filename: string; url: string }[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Load page info when file is selected
  useEffect(() => {
    const loadPageInfo = async () => {
      if (files.length === 1 && files[0].file.type === "application/pdf") {
        setStatus("loading");
        try {
          const pageInfo = await getPDFPageInfo(files[0].file);
          setPages(pageInfo);
          setSelectedRange({ start: 1, end: pageInfo.length });
          setStatus("ready");
        } catch (err) {
          console.error("Error loading PDF:", err);
          setError("Failed to load PDF. Please try another file.");
          setStatus("error");
        }
      } else if (files.length === 0) {
        setPages([]);
        setStatus("idle");
      }
    };

    loadPageInfo();
  }, [files]);

  const handleFilesAdded = useCallback((newFiles: UploadedFile[]) => {
    // Only accept the first PDF file
    const pdfFiles = newFiles.filter(f => f.file.type === "application/pdf");
    if (pdfFiles.length > 0) {
      setFiles([pdfFiles[0]]);
      setSplitResults([]);
      setError(null);
    }
  }, []);

  const handleRemoveFile = useCallback(() => {
    setFiles([]);
    setPages([]);
    setSplitResults([]);
    setStatus("idle");
  }, []);

  const handleRangeChange = (type: "start" | "end", value: number) => {
    setSelectedRange(prev => {
      const newRange = { ...prev, [type]: value };
      // Ensure start is not greater than end
      if (type === "start" && value > prev.end) {
        newRange.end = value;
      }
      if (type === "end" && value < prev.start) {
        newRange.start = value;
      }
      return newRange;
    });
  };

  const handleSelectAll = () => {
    if (pages.length > 0) {
      setSelectedRange({ start: 1, end: pages.length });
    }
  };

  const handleProcess = async () => {
    if (files.length === 0 || pages.length === 0) return;

    setStatus("processing");
    setError(null);

    try {
      const results = await splitPDF(files[0].file, [selectedRange]);
      
      const resultsWithUrls = results.map(r => ({
        ...r,
        url: URL.createObjectURL(r.blob),
      }));
      
      setSplitResults(resultsWithUrls);
      setStatus("success");
      
      toast.success("PDF split successfully!", {
        description: `Pages ${selectedRange.start}-${selectedRange.end} extracted`,
        icon: <CheckCircle2 className="h-4 w-4 text-green-500" />,
      });
    } catch (err) {
      console.error("Error splitting PDF:", err);
      setError("Failed to split PDF. Please try again.");
      setStatus("error");
    }
  };

  const handleDownload = (result: { filename: string; url: string }) => {
    const link = document.createElement("a");
    link.href = result.url;
    link.download = result.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadAll = () => {
    splitResults.forEach(result => handleDownload(result));
  };

  const handleReset = () => {
    splitResults.forEach(r => URL.revokeObjectURL(r.url));
    setFiles([]);
    setPages([]);
    setSplitResults([]);
    setSelectedRange({ start: 1, end: 1 });
    setStatus("idle");
    setError(null);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 py-8 md:py-12">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Page Header */}
          <div className="text-center mb-8">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-orange-600 mb-4">
              <Scissors className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Split PDF</h1>
            <p className="text-muted-foreground">
              Extract pages from your PDF file
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              {error}
            </div>
          )}

          {/* Upload Zone (only show when no file) */}
          {files.length === 0 && status !== "success" && (
            <FileUploadZone
              onFilesAdded={handleFilesAdded}
              maxFiles={1}
              maxSize={100 * 1024 * 1024}
              multiple={false}
            />
          )}

          {/* File Info & Page Selection */}
          {files.length > 0 && status !== "success" && (
            <div className="space-y-6">
              {/* Selected File */}
              <FilePreviewList
                files={files}
                onRemove={handleRemoveFile}
                showReorder={false}
              />

              {/* Page Preview Grid */}
              {status === "ready" && pages.length > 0 && (
                <div className="animate-fade-in">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium flex items-center gap-2">
                      <Layers className="h-4 w-4" />
                      Page Selection ({pages.length} pages)
                    </h3>
                    <Button variant="ghost" size="sm" onClick={handleSelectAll}>
                      Select All
                    </Button>
                  </div>

                  {/* Page Grid */}
                  <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 mb-6">
                    {pages.map((page) => {
                      const isSelected = 
                        page.pageNumber >= selectedRange.start && 
                        page.pageNumber <= selectedRange.end;
                      return (
                        <button
                          key={page.pageNumber}
                          onClick={() => setSelectedRange({ start: page.pageNumber, end: page.pageNumber })}
                          className={cn(
                            "aspect-[3/4] rounded-lg border-2 flex items-center justify-center text-sm font-medium transition-all",
                            isSelected
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border hover:border-primary/50 bg-card"
                          )}
                        >
                          {page.pageNumber}
                        </button>
                      );
                    })}
                  </div>

                  {/* Range Selector */}
                  <div className="flex items-center justify-center gap-4 p-4 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium">From:</label>
                      <input
                        type="number"
                        min={1}
                        max={pages.length}
                        value={selectedRange.start}
                        onChange={(e) => handleRangeChange("start", parseInt(e.target.value) || 1)}
                        className="w-16 h-9 rounded-md border border-input bg-background px-2 text-center text-sm"
                      />
                    </div>
                    <span className="text-muted-foreground">to</span>
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium">To:</label>
                      <input
                        type="number"
                        min={1}
                        max={pages.length}
                        value={selectedRange.end}
                        onChange={(e) => handleRangeChange("end", parseInt(e.target.value) || pages.length)}
                        className="w-16 h-9 rounded-md border border-input bg-background px-2 text-center text-sm"
                      />
                    </div>
                    <span className="text-sm text-muted-foreground ml-2">
                      ({selectedRange.end - selectedRange.start + 1} pages)
                    </span>
                  </div>

                  {/* Process Button */}
                  <div className="mt-6 flex justify-center">
                    <Button
                      size="lg"
                      onClick={handleProcess}
                      isLoading={status === "processing"}
                      disabled={status === "processing" || status === "loading"}
                    >
                      <Scissors className="mr-2 h-4 w-4" />
                      {status === "loading" ? "Loading..." : "Extract Pages"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Success State */}
          {status === "success" && (
            <div className="mt-6 animate-scale-in">
              <div className="rounded-xl border border-border bg-card p-8 text-center">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
                  <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                <h2 className="text-xl font-semibold mb-2">PDF Split Successfully!</h2>
                <p className="text-muted-foreground mb-6">
                  Extracted pages {selectedRange.start}-{selectedRange.end} from your PDF
                </p>
                
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button size="lg" onClick={handleDownloadAll}>
                    <Download className="mr-2 h-4 w-4" />
                    Download Split PDF
                  </Button>
                  <Button variant="ghost" size="lg" onClick={handleReset}>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Start Over
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
