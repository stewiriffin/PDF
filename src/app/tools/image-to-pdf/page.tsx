"use client";

import { useState, useCallback, useEffect } from "react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { FileUploadZone } from "@/components/file-upload-zone";
import { Button } from "@/components/ui/button";
import { PDFDocument } from "pdf-lib";
import { ProcessedFile }
import { UploadedFile } from "@/types/pdf";
import { 
  FileSpreadsheet, 
  Download, 
  CheckCircle2, 
  AlertCircle,
  Image,
  Loader2
} from "lucide-react";
import { toast } from "sonner";

export default function ImageToPDFPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<"idle" | "processing" | "success" | "error">("idle");
  const [processedFile, setProcessedFile] = useState<ProcessedFile | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Handle file selection
  const handleFileSelect = useCallback((newFiles: File[]) => {
    setFiles(newFiles);
    setProcessedFile(null);
    setStatus("idle");
    setError(null);
  }, []);

  // Handle file removal
  const handleFileRemove = useCallback(() => {
    setFiles([]);
    setProcessedFile(null);
    setStatus("idle");
    setError(null);
  }, []);

  // Handle conversion
  const handleConvert = useCallback(async () => {
    if (files.length === 0) return;

    setStatus("processing");
    setError(null);

    try {
      // Create a new PDF document
      const pdfDoc = await PDFDocument.create();

      // Sort files by name to maintain order
      const sortedFiles = [...files].sort((a, b) => a.name.localeCompare(b.name));

      for (const file of sortedFiles) {
        // Read the image
        const imageBytes = await file.arrayBuffer();
        
        // Determine image type and add to PDF
        const isPNG = file.type === "image/png" || file.name.toLowerCase().endsWith(".png");
        
        let image;
        if (isPNG) {
          image = await pdfDoc.embedPng(imageBytes);
        } else {
          image = await pdfDoc.embedJpg(imageBytes);
        }

        // Add a page with the image dimensions
        const page = pdfDoc.addPage([image.width, image.height]);
        
        // Draw the image
        page.drawImage(image, {
          x: 0,
          y: 0,
          width: image.width,
          height: image.height,
        });
      }

      // Save the PDF
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);

      setProcessedFile({
        name: "images_combined.pdf",
        blob,
        url,
      });
      setStatus("success");

      toast.success("Images converted to PDF!", {
        description: `${files.length} image(s) combined into one PDF`,
        icon: <CheckCircle2 className="h-4 w-4 text-green-500" />,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      setStatus("error");

      toast.error("Conversion failed", {
        description: errorMessage,
        icon: <AlertCircle className="h-4 w-4 text-red-500" />,
      });
    }
  }, [files]);

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
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-violet-600/10 mb-4">
            <FileSpreadsheet className="w-8 h-8 text-violet-600" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Image to PDF</h1>
          <p className="text-muted-foreground">
            Convert images to PDF documents
          </p>
        </div>

        {/* File upload */}
        {!processedFile && (
          <div className="mb-6">
            <FileUploadZone
              onFilesAdded={handleFileSelect}
              accept={{ 
                "image/jpeg": [".jpg", ".jpeg"],
                "image/png": [".png"]
              }}
              maxFiles={20}
              disabled={status === "processing"}
            />
          </div>
        )}

        {/* Selected files */}
        {files.length > 0 && !processedFile && (
          <div className="mb-6 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <Image className="w-8 h-8 text-violet-600" />
                <div>
                  <p className="font-medium">{files.length} image(s) selected</p>
                  <p className="text-sm text-muted-foreground">
                    Images will be combined in alphabetical order
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleFileRemove}
                disabled={status === "processing"}
              >
                Clear All
              </Button>
            </div>

            {/* File list */}
            <div className="max-h-40 overflow-y-auto space-y-1">
              {files.sort((a, b) => a.name.localeCompare(b.name)).map((file, index) => (
                <div key={index} className="text-sm text-muted-foreground flex items-center gap-2">
                  <Image className="w-4 h-4" />
                  {file.name}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Convert button */}
        {files.length > 0 && !processedFile && (
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
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Convert to PDF
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
                Convert More Images
              </Button>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
