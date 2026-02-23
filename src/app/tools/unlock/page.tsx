"use client";

import { useState, useCallback } from "react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { FileUploadZone } from "@/components/file-upload-zone";
import { Button } from "@/components/ui/button";
import { PDFDocument } from "pdf-lib";
import { ProcessedFile }
import { UploadedFile } from "@/types/pdf";
import { 
  Unlock, 
  Download, 
  CheckCircle2, 
  AlertCircle,
  FileLock,
  Loader2,
  Eye,
  EyeOff
} from "lucide-react";
import { toast } from "sonner";

export default function UnlockPDFPage() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "processing" | "success" | "error">("idle");
  const [processedFile, setProcessedFile] = useState<ProcessedFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Handle file selection
  const handleFileSelect = useCallback((uploadedFiles: UploadedFile[]) => {
    if (files.length > 0) {
      setFile(uploadedFiles[0].file);
      setProcessedFile(null);
      setStatus("idle");
      setError(null);
      setPassword("");
    }
  }, []);

  // Handle file removal
  const handleFileRemove = useCallback(() => {
    setFile(null);
    setProcessedFile(null);
    setStatus("idle");
    setError(null);
    setPassword("");
  }, []);

  // Handle unlock
  const handleUnlock = useCallback(async () => {
    if (!file) return;

    setStatus("processing");
    setError(null);

    try {
      // Read the PDF
      const arrayBuffer = await file.arrayBuffer();
      
      // Try to load without password first
      let pdfDoc: PDFDocument;
      
      try {
        pdfDoc = await PDFDocument.load(arrayBuffer, {
          ignoreEncryption: false,
        });
        
        // Check if it's encrypted
        if (!pdfDoc.isEncrypted) {
          // Not encrypted, just return as is
          const blob = new Blob([arrayBuffer], { type: "application/pdf" });
          const url = URL.createObjectURL(blob);

          const baseName = file.name.replace(/\.pdf$/i, "");
          const outputFilename = `${baseName}_unlocked.pdf`;

          setProcessedFile({
            name: outputFilename,
            blob,
            url,
          });
          setStatus("success");

          toast.success("PDF is already unlocked!", {
            description: "This PDF doesn't have password protection",
            icon: <CheckCircle2 className="h-4 w-4 text-green-500" />,
          });
          return;
        }
      } catch (loadError) {
        // PDF is encrypted and requires password
        if (!password) {
          throw new Error("This PDF is password protected. Please enter the password.");
        }
        
        // Try to load with the provided password
        pdfDoc = await PDFDocument.load(arrayBuffer, {
          userPassword: password,
        });
      }

      // If we got here, we have access - now create an unlocked version
      // We need to copy to a new document to remove encryption
      const newPdfDoc = await PDFDocument.create();
      const pages = await newPdfDoc.copyPages(pdfDoc, pdfDoc.getPageIndices());
      
      for (const page of pages) {
        newPdfDoc.addPage(page);
      }

      // Save without encryption
      const pdfBytes = await newPdfDoc.save();
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);

      const baseName = file.name.replace(/\.pdf$/i, "");
      const outputFilename = `${baseName}_unlocked.pdf`;

      setProcessedFile({
        name: outputFilename,
        blob,
        url,
      });
      setStatus("success");

      toast.success("PDF unlocked successfully!", {
        description: "Password protection has been removed",
        icon: <CheckCircle2 className="h-4 w-4 text-green-500" />,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      setStatus("error");

      toast.error("Unlock failed", {
        description: errorMessage,
        icon: <AlertCircle className="h-4 w-4 text-red-500" />,
      });
    }
  }, [file, password]);

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
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-600/10 mb-4">
            <Unlock className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Unlock PDF</h1>
          <p className="text-muted-foreground">
            Remove password protection from PDF files
          </p>
        </div>

        {/* Info box */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-700">Note</h3>
              <p className="text-sm text-blue-600 mt-1">
                If the PDF has a user password, you'll need to enter it to unlock the file.
                Owner password is not supported for removal.
              </p>
            </div>
          </div>
        </div>

        {/* File upload */}
        {!processedFile && (
          <div className="mb-6">
            <FileUploadZone
              onFilesAdded={handleFileSelect}
              accept={{ "application/pdf": [".pdf"] }}
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
                <FileLock className="w-8 h-8 text-emerald-600" />
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

        {/* Password input */}
        {file && !processedFile && (
          <div className="mb-6 p-6 bg-card rounded-lg border">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Unlock className="w-4 h-4" />
              PDF Password (if protected)
            </h3>
            
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password if PDF is protected"
                disabled={status === "processing"}
                className="w-full px-3 py-2 pr-10 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={status === "processing"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Leave blank if the PDF is not password protected
            </p>
          </div>
        )}

        {/* Unlock button */}
        {file && !processedFile && (
          <div className="flex justify-center mb-6">
            <Button
              onClick={handleUnlock}
              disabled={status === "processing"}
              size="lg"
              className="min-w-[200px]"
            >
              {status === "processing" ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Unlocking...
                </>
              ) : (
                <>
                  <Unlock className="w-4 h-4 mr-2" />
                  Unlock PDF
                </>
              )}
            </Button>
          </div>
        )}

        {/* Error message */}
        {error && status === "error" && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <p className="text-red-700">{error}</p>
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
                  <h3 className="font-medium text-green-800">PDF Unlocked!</h3>
                  <p className="text-sm text-green-600">
                    {processedFile.name}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button onClick={handleDownload} className="flex-1">
                <Download className="w-4 h-4 mr-2" />
                Download Unlocked PDF
              </Button>
              <Button variant="outline" onClick={handleReset}>
                Unlock Another
              </Button>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
