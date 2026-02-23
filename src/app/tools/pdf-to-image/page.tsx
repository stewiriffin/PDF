"use client";

import { useState, useCallback, useEffect } from "react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { FileUploadZone, UploadedFile } from "@/components/file-upload-zone";
import { FilePreviewList } from "@/components/file-preview-list";
import { Button } from "@/components/ui/button";
import { getPDFPageCount, createImagesZip } from "@/lib/pdf-to-image";
import { Image, Download, RotateCcw, CheckCircle2, FileImage } from "lucide-react";
import { toast } from "sonner";

export default function PDFToImagePage() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [pageCount, setPageCount] = useState<number>(0);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "processing" | "success" | "error">("idle");
  const [progress, setProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load page count when file is selected
  useEffect(() => {
    const loadPageCount = async () => {
      if (files.length === 1 && files[0].file.type === "application/pdf") {
        setStatus("loading");
        try {
          const count = await getPDFPageCount(files[0].file);
          setPageCount(count);
          setStatus("ready");
        } catch (err) {
          console.error("Error loading PDF:", err);
          setError("Failed to load PDF. Please try another file.");
          setStatus("error");
        }
      } else if (files.length === 0) {
        setPageCount(0);
        setStatus("idle");
      }
    };

    loadPageCount();
  }, [files]);

  const handleFilesAdded = useCallback((newFiles: UploadedFile[]) => {
    const pdfFiles = newFiles.filter(f => f.file.type === "application/pdf");
    if (pdfFiles.length > 0) {
      setFiles([pdfFiles[0]]);
      setResultBlob(null);
      setError(null);
    }
  }, []);

  const handleRemoveFile = useCallback(() => {
    setFiles([]);
    setPageCount(0);
    setResultBlob(null);
    setStatus("idle");
  }, []);

  const handleProcess = async () => {
    if (files.length === 0 || pageCount === 0) return;

    setStatus("processing");
    setProgress({ current: 0, total: pageCount });
    setError(null);

    try {
      const baseName = files[0].file.name.replace(/\.pdf$/i, "");
      
      const blob = await createImagesZip(
        files[0].file,
        baseName,
        (current, total) => {
          setProgress({ current, total });
        }
      );
      
      setResultBlob(blob);
      setStatus("success");
      
      toast.success("PDF converted to images!", {
        description: `${pageCount} JPEG images ready for download`,
        icon: <CheckCircle2 className="h-4 w-4 text-green-500" />,
      });
    } catch (err) {
      console.error("Error converting PDF to images:", err);
      setError("Failed to convert PDF. Please try again.");
      setStatus("error");
    }
  };

  const handleDownload = () => {
    if (!resultBlob) return;
    
    const baseName = files[0].file.name.replace(/\.pdf$/i, "");
    const url = URL.createObjectURL(resultBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${baseName}_images.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setFiles([]);
    setPageCount(0);
    setResultBlob(null);
    setProgress({ current: 0, total: 0 });
    setStatus("idle");
    setError(null);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 py-8 md:py-12">
        <div className="container mx-auto px-4 max-w-3xl">
          {/* Page Header */}
          <div className="text-center mb-8">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-pink-600 mb-4">
              <Image className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold mb-2">PDF to JPG</h1>
            <p className="text-muted-foreground">
              Convert PDF pages to high-resolution JPEG images
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
              maxSize={50 * 1024 * 1024}
              multiple={false}
            />
          )}

          {/* File Info & Conversion Options */}
          {files.length > 0 && status !== "success" && (
            <div className="space-y-6">
              {/* Selected File */}
              <FilePreviewList
                files={files}
                onRemove={handleRemoveFile}
                showReorder={false}
              />

              {/* Page Info */}
              {status === "ready" && pageCount > 0 && (
                <div className="animate-fade-in">
                  <div className="rounded-lg border border-border bg-card p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                          <FileImage className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{files[0].file.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {pageCount} {pageCount === 1 ? "page" : "pages"} will be converted
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Output Format Info */}
                    <div className="text-sm text-muted-foreground mb-4">
                      <p>Output: JPEG images (high quality, 300 DPI equivalent)</p>
                      <p>Package: ZIP file containing all images</p>
                    </div>

                    {/* Process Button */}
                    <div className="flex justify-center">
                      <Button
                        size="lg"
                        onClick={handleProcess}
                        isLoading={status === "processing"}
                        disabled={status === "processing" || status === "loading"}
                      >
                        <Image className="mr-2 h-4 w-4" />
                        {status === "loading" 
                          ? "Loading..." 
                          : status === "processing"
                          ? `Converting ${progress.current}/${progress.total}...`
                          : "Convert to Images"}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Success State */}
          {status === "success" && resultBlob && (
            <div className="mt-6 animate-scale-in">
              <div className="rounded-xl border border-border bg-card p-8 text-center">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
                  <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                <h2 className="text-xl font-semibold mb-2">Conversion Complete!</h2>
                <p className="text-muted-foreground mb-6">
                  Your PDF has been converted to {pageCount} JPEG images
                </p>
                
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button size="lg" onClick={handleDownload}>
                    <Download className="mr-2 h-4 w-4" />
                    Download ZIP
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
