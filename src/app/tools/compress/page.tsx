"use client";

import { useState, useCallback, useEffect } from "react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { FileUploadZone } from "@/components/file-upload-zone";
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
import { UploadedFile } from "@/components/file-upload-zone";
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
  icon: React.ReactNode;
  description: string;
  dpi: number;
};

const qualityOptions: QualityOption[] = [
  {
    value: "extreme",
    label: "Extreme",
    icon: <Zap className="w-5 h-5" />,
    description: "Smallest file size, best for screen viewing",
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
    const checkGS = async () => {
      try {
        const result = await checkGhostscriptAction();
        setGhostscriptAvailable(result.installed);
        if (!result.installed) {
          setError(result.message);
          toast.error("Ghostscript not available", {
            description: result.message,
            icon: <AlertCircle className="h-4 w-4 text-red-500" />,
          });
        }
      } catch (err) {
        setGhostscriptAvailable(false);
        setError("Failed to check Ghostscript availability");
      }
    };
    
    checkGS();
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
        const url = URL.createObjectURL(result.blob);
        
        setProcessedFile({
          name: result.filename || "compressed.pdf",
          blob: result.blob,
          url,
        });
        
        setCompressedSize(result.compressedSize || 0);
        setStatus("success");

        const ratio = calculateCompressionRatio(
          result.originalSize || 0,
          result.compressedSize || 0
        );

        toast.success("PDF compressed successfully!", {
          description: `${formatFileSize(result.originalSize || 0)} → ${formatFileSize(result.compressedSize || 0)} (${ratio}% smaller)`,
          icon: <CheckCircle2 className="h-4 w-4 text-green-500" />,
        });
      } else {
        throw new Error(result.error || "Compression failed");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      setStatus("error");
      
      toast.error("Compression failed", {
        description: errorMessage,
        icon: <AlertCircle className="h-4 w-4 text-red-500" />,
      });
    }
  }, [file, quality, ghostscriptAvailable]);

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
            Reduce PDF file size while maintaining quality using Ghostscript
          </p>
        </div>

        {/* Ghostscript availability warning */}
        {ghostscriptAvailable === false && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
              <div>
                <h3 className="font-medium text-red-700">Ghostscript Not Available</h3>
                <p className="text-sm text-red-600 mt-1">
                  {error || "Please install Ghostscript on your server to use this feature."}
                </p>
                <p className="text-sm text-red-600 mt-2">
                  <code className="bg-red-100 px-2 py-1 rounded">sudo apt-get install ghostscript</code> (Linux)
                  <br />
                  <code className="bg-red-100 px-2 py-1 rounded">brew install ghostscript</code> (macOS)
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Quality selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-3">
            Compression Level
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {qualityOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setQuality(option.value)}
                disabled={status === "processing" || ghostscriptAvailable === false}
                className={`
                  p-4 rounded-lg border-2 transition-all text-left
                  ${quality === option.value
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                  }
                  ${status === "processing" || ghostscriptAvailable === false ? "opacity-50 cursor-not-allowed" : ""}
                `}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className={quality === option.value ? "text-primary" : "text-muted-foreground"}>
                    {option.icon}
                  </span>
                  <span className="font-medium">{option.label}</span>
                </div>
                <p className="text-xs text-muted-foreground">{option.description}</p>
                <p className="text-xs text-muted-foreground mt-1">{option.dpi} DPI</p>
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
              disabled={status === "processing" || ghostscriptAvailable === false}
            />
          </div>
        )}

        {/* Selected file */}
        {file && !processedFile && (
          <div className="mb-6 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileArchive className="w-8 h-8 text-primary" />
                <div>
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatFileSize(file.size)}
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

        {/* Compress button */}
        {file && !processedFile && ghostscriptAvailable !== false && (
          <div className="flex justify-center mb-6">
            <Button
              onClick={handleCompress}
              disabled={status === "processing"}
              size="lg"
              className="min-w-[200px]"
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
                  <h3 className="font-medium text-green-800">Compression Complete!</h3>
                  <p className="text-sm text-green-600">
                    {processedFile.name}
                  </p>
                </div>
              </div>
            </div>

            {/* Size comparison */}
            <div className="grid grid-cols-3 gap-4 mb-4 text-center">
              <div className="p-3 bg-white rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Original</p>
                <p className="font-semibold">{formatFileSize(originalSize)}</p>
              </div>
              <div className="p-3 bg-white rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Compressed</p>
                <p className="font-semibold text-green-600">{formatFileSize(compressedSize)}</p>
              </div>
              <div className="p-3 bg-white rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Reduced</p>
                <p className="font-semibold text-green-600">{compressionRatio}%</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button onClick={handleDownload} className="flex-1">
                <Download className="w-4 h-4 mr-2" />
                Download Compressed PDF
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
