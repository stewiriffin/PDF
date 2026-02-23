"use client";

import { useState, useCallback, useEffect } from "react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { FileUploadZone, UploadedFile } from "@/components/file-upload-zone";
import { Button } from "@/components/ui/button";
import { 
  compressPDFAction, 
  checkGhostscriptAction,
  calculateCompressionRatio,
  formatFileSize,
  CompressionQuality,
  CompressionResult 
} from "@/lib/actions/compress-pdf";
import { ProcessedFile } from "@/types/pdf";
import { 
  Shrink,
  Download, 
  CheckCircle2, 
  AlertCircle,
  Zap,
  Scale,
  FileArchive,
  Loader2
} from "lucide-react";
import { toast } from "sonner";

interface CompressPDFPageProps {
  // No props needed for this client component
}

type QualityOption = {
  value: CompressionQuality;
  label: string;
  description: string;
  icon: React.ReactNode;
  dpi: number;
};

const qualityOptions: QualityOption[] = [
  {
    value: "extreme",
    label: "Extreme",
    icon: <Zap className="w-5 h-5" />,
    description: "Smallest file size, 72 DPI - best for screen viewing",
    dpi: 72,
  },
  {
    value: "recommended",
    label: "Recommended",
    icon: <Shrink className="w-5 h-5" />,
    description: "Balanced quality and file size",
    dpi: 150,
  },
  {
    value: "low",
    label: "Low",
    icon: <Scale className="w-5 h-5" />,
    description: "Highest quality, best for printing",
    dpi: 300,
  },
];

export default function CompressPDFPage() {
  const [file, setFile] = useState<File | null>(null);
  const [quality, setQuality] = useState<CompressionQuality>("recommended");
  const [status, setStatus] = useState<"idle" | "processing" | "success" | "error">("idle");
  const [processedFile, setProcessedFile] = useState<ProcessedFile | null>(null);
  const [originalSize, setOriginalSize] = useState<number>(0);
  const [compressedSize, setCompressedSize] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [ghostscriptAvailable, setGhostscriptAvailable] = useState<boolean | null>(null);

  // Check if Ghostscript is available on mount
  useEffect(() => {
    const checkGhostscript = async () => {
      try {
        const result = await checkGhostscriptAction();
        setGhostscriptAvailable(result.installed);
      } catch {
        setGhostscriptAvailable(false);
      }
    };
    checkGhostscript();
  }, []);

  // Handle file selection
  const handleFileSelect = useCallback((uploadedFiles: UploadedFile[]) => {
    if (uploadedFiles.length > 0) {
      setFile(uploadedFiles[0].file);
      setOriginalSize(uploadedFiles[0].file.size);
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
    setOriginalSize(0);
    setCompressedSize(0);
    setError(null);
  }, []);

  // Handle compression
  const handleCompress = useCallback(async () => {
    if (!file || ghostscriptAvailable === false) return;

    setStatus("processing");
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("quality", quality);

      const result: CompressionResult = await compressPDFAction(formData);

      if (result.success && result.blob) {
        setCompressedSize(result.compressedSize || 0);
        setStatus("success");

        const ratio = calculateCompressionRatio(
          result.originalSize || 0,
          result.compressedSize || 0
        );

        const processed: ProcessedFile = {
          name: file.name.replace(/\.pdf$/i, "") + "_compressed.pdf",
          blob: result.blob,
          url: URL.createObjectURL(result.blob),
        };

        setProcessedFile(processed);

        toast.success("PDF compressed successfully", {
          description: `Size reduced by ${ratio}%`,
        });
      } else {
        throw new Error(result.error || "Compression failed");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      setStatus("error");
      setError(errorMessage);

      toast.error("Compression failed", {
        description: errorMessage,
      });
    }
  }, [file, quality, ghostscriptAvailable]);

  // Handle reset
  const handleReset = useCallback(() => {
    if (processedFile?.url) {
      URL.revokeObjectURL(processedFile.url);
    }
    handleFileRemove();
  }, [processedFile, handleFileRemove]);

  const compressionRatio = originalSize > 0 && compressedSize > 0
    ? calculateCompressionRatio(originalSize, compressedSize)
    : 0;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Shrink className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Compress PDF</h1>
          <p className="text-muted-foreground">
            Reduce PDF file size while maintaining quality
          </p>
        </div>

        {/* Ghostscript availability warning */}
        {ghostscriptAvailable === false && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-yellow-800">Ghostscript not available</h3>
                <p className="text-sm text-yellow-700 mt-1">
                  PDF compression requires Ghostscript to be installed on the server.
                  Please contact the site administrator.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* File upload */}
        <div className="mb-6">
          <FileUploadZone
            onFilesAdded={handleFileSelect}
            accept={{ "application/pdf": [".pdf"] }}
            maxFiles={1}
            disabled={status === "processing" || ghostscriptAvailable === false}
          />
        </div>

        {/* Selected file info */}
        {file && (
          <div className="bg-muted rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileArchive className="w-8 h-8 text-primary" />
                <div>
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatFileSize(originalSize)}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleFileRemove}
                disabled={status === "processing"}
              >
                <AlertCircle className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Quality selection */}
        {file && !processedFile && ghostscriptAvailable !== false && (
          <div className="mb-6">
            <label className="block text-sm font-medium mb-3">
              Compression Level
            </label>
            <div className="grid gap-3">
              {qualityOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setQuality(option.value)}
                  disabled={status === "processing"}
                  className={`flex items-center gap-4 p-4 rounded-lg border-2 transition-colors text-left ${
                    quality === option.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className={`p-2 rounded-lg ${
                    quality === option.value ? "bg-primary text-primary-foreground" : "bg-muted"
                  }`}>
                    {option.icon}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{option.label}</p>
                    <p className="text-sm text-muted-foreground">{option.description}</p>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {option.dpi} DPI
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Compress button */}
        {file && !processedFile && ghostscriptAvailable !== false && (
          <div className="flex justify-center mb-6">
            <Button
              onClick={handleCompress}
              disabled={status === "processing"}
              size="lg"
            >
              {status === "processing" ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Compressing...
                </>
              ) : (
                <>
                  <Shrink className="w-4 h-4 mr-2" />
                  Compress PDF
                </>
              )}
            </Button>
          </div>
        )}

        {/* Processing status */}
        {status === "processing" && (
          <div className="text-center py-8">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Compressing your PDF...</p>
          </div>
        )}

        {/* Error message */}
        {error && status === "error" && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-red-800">Compression failed</h3>
                <p className="text-sm text-red-600 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        {status === "success" && processedFile && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
              <div>
                <h3 className="font-medium text-green-800">Compression Complete!</h3>
                <p className="text-sm text-green-600">
                  Your PDF has been compressed successfully
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="p-3 bg-white rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Original</p>
                <p className="font-semibold">{formatFileSize(originalSize)}</p>
              </div>
              <div className="p-3 bg-white rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Compressed</p>
                <p className="font-semibold text-green-600">{formatFileSize(compressedSize)}</p>
              </div>
            </div>

            <div className="text-center mb-4">
              <p className="text-2xl font-bold text-green-600">
                {compressionRatio}% smaller
              </p>
            </div>

            <div className="flex gap-3">
              <Button className="flex-1" asChild>
                <a href={processedFile.url} download={processedFile.name}>
                  <Download className="w-4 h-4 mr-2" />
                  Download Compressed PDF
                </a>
              </Button>
              <Button variant="outline" onClick={handleReset}>
                Compress Another
              </Button>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
