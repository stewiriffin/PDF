"use client";

import { useState, useCallback } from "react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { FileUploadZone } from "@/components/file-upload-zone";
import { Button } from "@/components/ui/button";
import { PDFDocument, degrees } from "pdf-lib";
import { ProcessedFile }
import { UploadedFile } from "@/types/pdf";
import { 
  RotateCw, 
  Download, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  Loader2,
  RotateCcw
} from "lucide-react";
import { toast } from "sonner";

type RotationAngle = 90 | 180 | 270;

export default function RotatePDFPage() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "processing" | "success" | "error">("idle");
  const [processedFile, setProcessedFile] = useState<ProcessedFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rotation, setRotation] = useState<RotationAngle>(90);

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

  // Handle rotation
  const handleRotate = useCallback(async () => {
    if (!file) return;

    setStatus("processing");
    setError(null);

    try {
      // Read the PDF
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);

      // Rotate all pages
      const pages = pdfDoc.getPages();
      
      for (const page of pages) {
        const currentRotation = page.getRotation().angle;
        const newRotation = (currentRotation + rotation) % 360;
        page.setRotation(degrees(newRotation));
      }

      // Save the rotated PDF
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);

      const baseName = file.name.replace(/\.pdf$/i, "");
      const outputFilename = `${baseName}_rotated.pdf`;

      setProcessedFile({
        name: outputFilename,
        blob,
        url,
      });
      setStatus("success");

      toast.success("PDF rotated successfully!", {
        description: `All pages rotated ${rotation}° clockwise`,
        icon: <CheckCircle2 className="h-4 w-4 text-green-500" />,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      setStatus("error");

      toast.error("Rotation failed", {
        description: errorMessage,
        icon: <AlertCircle className="h-4 w-4 text-red-500" />,
      });
    }
  }, [file, rotation]);

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

  const rotationOptions: { value: RotationAngle; label: string; icon: React.ReactNode }[] = [
    { value: 90, label: "90°", icon: <RotateCw className="w-5 h-5" /> },
    { value: 180, label: "180°", icon: <RotateCw className="w-5 h-5 rotate-90" /> },
    { value: 270, label: "270°", icon: <RotateCcw className="w-5 h-5" /> },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-teal-600/10 mb-4">
            <RotateCw className="w-8 h-8 text-teal-600" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Rotate PDF</h1>
          <p className="text-muted-foreground">
            Rotate PDF pages to any angle
          </p>
        </div>

        {/* Rotation selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-3">
            Rotation Angle
          </label>
          <div className="grid grid-cols-3 gap-3">
            {rotationOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setRotation(option.value)}
                disabled={status === "processing"}
                className={`
                  p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2
                  ${rotation === option.value
                    ? "border-teal-600 bg-teal-600/5"
                    : "border-border hover:border-teal-600/50"
                  }
                  ${status === "processing" ? "opacity-50 cursor-not-allowed" : ""}
                `}
              >
                <span className={rotation === option.value ? "text-teal-600" : "text-muted-foreground"}>
                  {option.icon}
                </span>
                <span className="font-medium">{option.label}</span>
              </button>
            ))}
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
                <FileText className="w-8 h-8 text-teal-600" />
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

        {/* Rotate button */}
        {file && !processedFile && (
          <div className="flex justify-center mb-6">
            <Button
              onClick={handleRotate}
              disabled={status === "processing"}
              size="lg"
              className="min-w-[200px]"
            >
              {status === "processing" ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Rotating...
                </>
              ) : (
                <>
                  <RotateCw className="w-4 h-4 mr-2" />
                  Rotate PDF
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
                  <h3 className="font-medium text-green-800">Rotation Complete!</h3>
                  <p className="text-sm text-green-600">
                    {processedFile.name}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button onClick={handleDownload} className="flex-1">
                <Download className="w-4 h-4 mr-2" />
                Download Rotated PDF
              </Button>
              <Button variant="outline" onClick={handleReset}>
                Rotate Another
              </Button>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
