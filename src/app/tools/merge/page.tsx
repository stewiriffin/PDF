"use client";

import { useState, useCallback, useEffect } from "react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { FileUploadZone } from "@/components/file-upload-zone";
import { FilePreviewGallery, PDFFile, generatePDFThumbnail } from "@/components/file-preview-gallery";
import { Button } from "@/components/ui/button";
import { usePDFWorker, PDFWorkerProgress } from "@/hooks/usePDFWorker";
import { generateMergedFileName } from "@/lib/pdf-merge";
import { ProcessedFile } from "@/types/pdf";
import { Combine, Download, RotateCcw, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function MergePDFPage() {
  const [files, setFiles] = useState<PDFFile[]>([]);
  const [status, setStatus] = useState<"idle" | "processing" | "success" | "error">("idle");
  const [processedFile, setProcessedFile] = useState<ProcessedFile | null>(null);
  const [progress, setProgress] = useState<PDFWorkerProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingThumbnails, setIsLoadingThumbnails] = useState(false);

  // Use the PDF worker hook
  const { mergePDFs, isProcessing, terminate } = usePDFWorker({
    onProgress: (prog) => {
      setProgress(prog);
    },
    onSuccess: (data, fileName) => {
      const blob = new Blob([data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      
      setProcessedFile({
        name: fileName,
        blob,
        url,
      });
      setStatus("success");
      
      toast.success("PDFs merged successfully!", {
        description: `${files.length} files combined`,
        icon: <CheckCircle2 className="h-4 w-4 text-green-500" />,
      });
      
      // Clean up worker after success
      terminate();
    },
    onError: (err) => {
      setError(err);
      setStatus("error");
      terminate();
    },
  });

  // Generate thumbnails for new files
  useEffect(() => {
    const generateThumbnails = async () => {
      const filesWithoutThumbnails = files.filter((f) => !f.thumbnail);
      
      if (filesWithoutThumbnails.length === 0) return;
      
      setIsLoadingThumbnails(true);
      
      for (const file of filesWithoutThumbnails) {
        try {
          const { thumbnail, pageCount } = await generatePDFThumbnail(file.file);
          setFiles((prev) =>
            prev.map((f) =>
              f.id === file.id
                ? { ...f, thumbnail, pageCount }
                : f
            )
          );
        } catch (err) {
          console.error("Error generating thumbnail:", err);
        }
      }
      
      setIsLoadingThumbnails(false);
    };

    generateThumbnails();
  }, [files.length]);

  const handleFilesAdded = useCallback(async (newFiles: { id: string; file: File }[]) => {
    const pdfFiles: PDFFile[] = newFiles.map((f) => ({
      id: f.id,
      file: f.file,
    }));
    
    setFiles((prev) => [...prev, ...pdfFiles]);
    setError(null);
  }, []);

  const handleFilesChange = useCallback((newFiles: PDFFile[]) => {
    setFiles(newFiles);
  }, []);

  const handleRemoveFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const handleProcess = async () => {
    if (files.length < 2) {
      setError("Please select at least 2 PDF files to merge");
      return;
    }

    setStatus("processing");
    setProgress({ current: 0, total: files.length + 1, message: "Starting merge..." });
    setError(null);

    try {
      // Use the worker to merge PDFs
      mergePDFs(files.map((f) => f.file));
    } catch (err) {
      console.error("Error merging PDFs:", err);
      setError("Failed to merge PDFs. Please try again.");
      setStatus("error");
    }
  };

  const handleDownload = () => {
    if (!processedFile) return;
    
    const link = document.createElement("a");
    link.href = processedFile.url;
    link.download = processedFile.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleReset = () => {
    if (processedFile?.url) {
      URL.revokeObjectURL(processedFile.url);
    }
    setFiles([]);
    setProcessedFile(null);
    setProgress(null);
    setStatus("idle");
    setError(null);
  };

  const handleAddMore = () => {
    if (processedFile?.url) {
      URL.revokeObjectURL(processedFile.url);
    }
    setProcessedFile(null);
    setProgress(null);
    setStatus("idle");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 py-8 md:py-12">
        <div className="container mx-auto px-4 max-w-5xl">
          {/* Page Header */}
          <div className="text-center mb-8">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 mb-4">
              <Combine className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Merge PDF</h1>
            <p className="text-muted-foreground">
              Combine multiple PDF files into a single document
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              {error}
            </div>
          )}

          {/* Upload Zone (only show when not success) */}
          {status !== "success" && (
            <div className="mb-8">
              <FileUploadZone
                onFilesAdded={handleFilesAdded}
                maxFiles={20}
                maxSize={100 * 1024 * 1024}
                multiple={true}
              />
            </div>
          )}

          {/* File Preview Gallery */}
          {files.length > 0 && status !== "success" && (
            <div className="space-y-6">
              <FilePreviewGallery
                files={files}
                onFilesChange={handleFilesChange}
                onFileRemove={handleRemoveFile}
                emptyMessage="Drop PDF files here to start merging"
              />

              {/* Loading Thumbnails Indicator */}
              {isLoadingThumbnails && (
                <p className="text-center text-sm text-muted-foreground">
                  Loading thumbnails...
                </p>
              )}

              {/* Progress Bar */}
              {isProcessing && progress && (
                <div className="animate-fade-in">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">{progress.message}</span>
                    <span className="text-sm font-medium">
                      {Math.round((progress.current / progress.total) * 100)}%
                    </span>
                  </div>
                  <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${(progress.current / progress.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Merge Button */}
              {files.length >= 2 && !isProcessing && (
                <div className="flex justify-center">
                  <Button
                    size="lg"
                    onClick={handleProcess}
                    disabled={isLoadingThumbnails}
                  >
                    <Combine className="mr-2 h-4 w-4" />
                    Merge {files.length} PDFs
                  </Button>
                </div>
              )}

              {/* Processing State */}
              {isProcessing && (
                <div className="flex justify-center">
                  <Button size="lg" disabled>
                    <Combine className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </Button>
                </div>
              )}

              {/* Hint */}
              {files.length > 0 && files.length < 2 && !isProcessing && (
                <p className="mt-4 text-center text-sm text-muted-foreground">
                  Add at least 1 more PDF file to merge
                </p>
              )}
            </div>
          )}

          {/* Success State */}
          {status === "success" && processedFile && (
            <div className="mt-6 animate-scale-in">
              <div className="rounded-xl border border-border bg-card p-8 text-center">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
                  <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                <h2 className="text-xl font-semibold mb-2">PDFs Merged Successfully!</h2>
                <p className="text-muted-foreground mb-6">
                  Your merged PDF is ready to download
                </p>
                
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button size="lg" onClick={handleDownload}>
                    <Download className="mr-2 h-4 w-4" />
                    Download Merged PDF
                  </Button>
                  <Button variant="outline" size="lg" onClick={handleAddMore}>
                    <Combine className="mr-2 h-4 w-4" />
                    Merge More Files
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
