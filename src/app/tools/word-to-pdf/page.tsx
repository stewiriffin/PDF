"use client";

import { useState, useCallback } from "react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { FileUploadZone } from "@/components/file-upload-zone";
import { Button } from "@/components/ui/button";
import { ProcessedFile }
import { UploadedFile } from "@/types/pdf";
import { 
  FileText, 
  Download, 
  CheckCircle2, 
  AlertCircle,
  FileType,
  Loader2
} from "lucide-react";
import { toast } from "sonner";

export default function WordToPDFPage() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "processing" | "success" | "error">("idle");
  const [processedFile, setProcessedFile] = useState<ProcessedFile | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Handle file selection
  const handleFileSelect = useCallback((uploadedFiles: UploadedFile[]) => {
    if (files.length > 0) {
      setFile(uploadedFiles[0].file);
      setProcessedFile(null);
      setStatus("idle");
      setError(null);
    }
  }, []);

  // Handle file removal
  const handleFileRemove = useCallback(() => {
    setFile(null);
    setProcessedFile(null);
    setStatus("idle");
    setError(null);
  }, []);

  // Handle conversion - Note: This requires a server-side solution for Word to PDF
  const handleConvert = useCallback(async () => {
    if (!file) return;

    setStatus("processing");
    setError(null);

    try {
      // Word to PDF requires server-side processing with libraries like libreoffice or mammoth
      toast.info("Converting Word to PDF...", {
        description: "This feature requires server-side processing.",
        icon: <Loader2 className="h-4 w-4 animate-spin" />,
      });

      await new Promise(resolve => setTimeout(resolve, 2000));

      setError("Word to PDF conversion requires server-side processing. This feature will be available soon.");
      setStatus("error");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      setStatus("error");

      toast.error("Conversion failed", {
        description: errorMessage,
        icon: <AlertCircle className="h-4 w-4 text-red-500" />,
      });
    }
  }, [file]);

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

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-600/10 mb-4">
            <FileText className="w-8 h-8 text-indigo-600" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Word to PDF</h1>
          <p className="text-muted-foreground">
            Convert Word documents to PDF format
          </p>
        </div>

        {/* File upload */}
        {!processedFile && (
          <div className="mb-6">
            <FileUploadZone
              onFilesAdded={handleFileSelect}
              accept={{ 
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
                "application/msword": [".doc"]
              }}
              maxFiles={1}
              disabled={status === "processing"}
            />
          </div>
        )}

        {/* Selected file */}
        {file && !processedFile && (
          <div className="mb-6 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileType className="w-8 h-8 text-indigo-600" />
                <div>
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleFileRemove}
                disabled={status === "processing"}
              >
                Remove
              </Button>
            </div>
          </div>
        )}

        {/* Convert button */}
        {file && !processedFile && (
          <div className="flex justify-center mb-6">
            <Button
              onClick={handleConvert}
              disabled={status === "processing"}
              size="lg"
              className="min-w-[200px]"
            >
              {status === "processing" ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Converting...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 mr-2" />
                  Convert to PDF
                </>
              )}
            </Button>
          </div>
        )}

        {/* Error message */}
        {error && status === "error" && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              <div>
                <p className="text-amber-700">{error}</p>
                <p className="text-sm text-amber-600 mt-1">
                  This feature will be available in a future update with server-side processing.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Success result */}
        {processedFile && status === "success" && (
          <div className="mb-6 p-6 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
                <div>
                  <h3 className="font-medium text-green-800">Conversion Complete!</h3>
                  <p className="text-sm text-green-600">
                    {processedFile.name}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button onClick={handleDownload} className="flex-1">
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
              <Button variant="outline" onClick={handleReset}>
                Convert Another
              </Button>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
