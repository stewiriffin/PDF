"use client";

import { useState, useCallback } from "react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { FileUploadZone } from "@/components/file-upload-zone";
import { Button } from "@/components/ui/button";
import { watermarkPDF, generateWatermarkedFileName, WatermarkOptions, defaultWatermarkOptions } from "@/lib/pdf-watermark";
import { ProcessedFile } from "@/types/pdf";
import { 
  Type, 
  Download, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  Loader2,
  Palette,
  RotateCw,
  Layout
} from "lucide-react";
import { toast } from "sonner";

export default function WatermarkPDFPage() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "processing" | "success" | "error">("idle");
  const [processedFile, setProcessedFile] = useState<ProcessedFile | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Watermark options
  const [text, setText] = useState("WATERMARK");
  const [fontSize, setFontSize] = useState(50);
  const [opacity, setOpacity] = useState(0.3);
  const [rotation, setRotation] = useState(-45);
  const [position, setPosition] = useState<"center" | "top-left" | "top-right" | "bottom-left" | "bottom-right">("center");
  const [applyToAll, setApplyToAll] = useState(true);

  // Handle file selection
  const handleFileSelect = useCallback((files: File[]) => {
    if (files.length > 0) {
      setFile(files[0]);
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

  // Handle watermark
  const handleWatermark = useCallback(async () => {
    if (!file || !text.trim()) return;

    setStatus("processing");
    setError(null);

    try {
      const options: WatermarkOptions = {
        text: text,
        fontSize,
        opacity,
        rotation,
        position,
        applyToAll,
      };

      const blob = await watermarkPDF(file, options);
      const url = URL.createObjectURL(blob);
      const filename = generateWatermarkedFileName(file.name);

      setProcessedFile({
        name: filename,
        blob,
        url,
      });
      setStatus("success");

      toast.success("Watermark added successfully!", {
        description: `"${text}" applied to ${applyToAll ? "all pages" : "first page"}`,
        icon: <CheckCircle2 className="h-4 w-4 text-green-500" />,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      setStatus("error");

      toast.error("Watermark failed", {
        description: errorMessage,
        icon: <AlertCircle className="h-4 w-4 text-red-500" />,
      });
    }
  }, [file, text, fontSize, opacity, rotation, position, applyToAll]);

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
    setText("WATERMARK");
    setFontSize(50);
    setOpacity(0.3);
    setRotation(-45);
    setPosition("center");
    setApplyToAll(true);
  }, [handleFileRemove]);

  const positions = [
    { value: "center", label: "Center" },
    { value: "top-left", label: "Top Left" },
    { value: "top-right", label: "Top Right" },
    { value: "bottom-left", label: "Bottom Left" },
    { value: "bottom-right", label: "Bottom Right" },
  ] as const;

  const rotations = [
    { value: -45, label: "-45°" },
    { value: -30, label: "-30°" },
    { value: -15, label: "-15°" },
    { value: 0, label: "0°" },
    { value: 15, label: "15°" },
    { value: 30, label: "30°" },
    { value: 45, label: "45°" },
  ] as const;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-600/10 mb-4">
            <Type className="w-8 h-8 text-amber-600" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Watermark PDF</h1>
          <p className="text-muted-foreground">
            Add text watermark to your PDF documents
          </p>
        </div>

        {/* File upload */}
        {!processedFile && (
          <div className="mb-6">
            <FileUploadZone
              onFileSelect={handleFileSelect}
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
                <FileText className="w-8 h-8 text-amber-600" />
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

        {/* Watermark options */}
        {file && !processedFile && (
          <div className="space-y-6">
            {/* Text input */}
            <div className="p-6 bg-card rounded-lg border">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Type className="w-4 h-4" />
                Watermark Text
              </h3>
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Enter watermark text"
                disabled={status === "processing"}
                className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            {/* Font size and opacity */}
            <div className="p-6 bg-card rounded-lg border">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Palette className="w-4 h-4" />
                Appearance
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Font Size: {fontSize}px
                  </label>
                  <input
                    type="range"
                    min="12"
                    max="120"
                    value={fontSize}
                    onChange={(e) => setFontSize(Number(e.target.value))}
                    disabled={status === "processing"}
                    className="w-full"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Opacity: {Math.round(opacity * 100)}%
                  </label>
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.1"
                    value={opacity}
                    onChange={(e) => setOpacity(Number(e.target.value))}
                    disabled={status === "processing"}
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            {/* Position and rotation */}
            <div className="p-6 bg-card rounded-lg border">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Layout className="w-4 h-4" />
                Position
              </h3>
              
              <div className="grid grid-cols-3 md:grid-cols-5 gap-2 mb-4">
                {positions.map((pos) => (
                  <button
                    key={pos.value}
                    onClick={() => setPosition(pos.value)}
                    disabled={status === "processing"}
                    className={`p-2 rounded-lg border-2 text-sm transition-all ${
                      position === pos.value
                        ? "border-amber-600 bg-amber-600/5"
                        : "border-border hover:border-amber-600/50"
                    }`}
                  >
                    {pos.label}
                  </button>
                ))}
              </div>

              <label className="block text-sm font-medium mb-2">
                Rotation: {rotation}°
              </label>
              <div className="grid grid-cols-4 md:grid-cols-7 gap-2">
                {rotations.map((rot) => (
                  <button
                    key={rot.value}
                    onClick={() => setRotation(rot.value)}
                    disabled={status === "processing"}
                    className={`p-2 rounded-lg border-2 text-sm transition-all ${
                      rotation === rot.value
                        ? "border-amber-600 bg-amber-600/5"
                        : "border-border hover:border-amber-600/50"
                    }`}
                  >
                    {rot.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Apply to all pages */}
            <div className="p-6 bg-card rounded-lg border">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={applyToAll}
                  onChange={(e) => setApplyToAll(e.target.checked)}
                  disabled={status === "processing"}
                  className="w-4 h-4 rounded border-gray-300 text-amber-600 focus:ring-amber-600"
                />
                <div>
                  <span className="font-medium text-sm">Apply to all pages</span>
                  <p className="text-xs text-muted-foreground">
                    When unchecked, watermark is applied to the first page only
                  </p>
                </div>
              </label>
            </div>

            {/* Preview */}
            <div className="p-6 bg-card rounded-lg border">
              <h3 className="font-semibold mb-4">Preview</h3>
              <div className="relative bg-gray-100 rounded-lg p-8 h-40 flex items-center justify-center overflow-hidden">
                <div 
                  className="absolute text-gray-400 select-none pointer-events-none"
                  style={{
                    fontSize: `${fontSize / 3}px`,
                    opacity,
                    transform: `rotate(${rotation}deg)`,
                  }}
                >
                  {text || "Preview"}
                </div>
                <p className="text-gray-500 text-sm">PDF Preview</p>
              </div>
            </div>
          </div>
        )}

        {/* Watermark button */}
        {file && !processedFile && text.trim() && (
          <div className="flex justify-center mt-6">
            <Button
              onClick={handleWatermark}
              disabled={status === "processing"}
              size="lg"
              className="min-w-[200px]"
            >
              {status === "processing" ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Type className="w-4 h-4 mr-2" />
                  Add Watermark
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
                  <h3 className="font-medium text-green-800">Watermark Added!</h3>
                  <p className="text-sm text-green-600">
                    {processedFile.name}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button onClick={handleDownload} className="flex-1">
                <Download className="w-4 h-4 mr-2" />
                Download Watermarked PDF
              </Button>
              <Button variant="outline" onClick={handleReset}>
                Add to Another
              </Button>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
