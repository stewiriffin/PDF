"use client";

import { useState, useCallback } from "react";
import { mergePDFs, generateMergedFileName } from "@/lib/pdf-merge";
import { Upload, File, X, Download, Combine, Loader2 } from "lucide-react";
import { cn, formatFileSize } from "@/lib/utils";

interface UploadedFile {
  id: string;
  file: File;
}

export function MergePDF() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isMerging, setIsMerging] = useState(false);
  const [mergedBlob, setMergedBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Handle file selection
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const newFiles: UploadedFile[] = selectedFiles.map((file) => ({
      id: Math.random().toString(36).substring(2, 9),
      file,
    }));
    setFiles((prev) => [...prev, ...newFiles]);
    setMergedBlob(null);
    setError(null);
  }, []);

  // Handle file removal
  const handleRemoveFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  // Handle file reorder (move up)
  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    setFiles((prev) => {
      const newFiles = [...prev];
      [newFiles[index - 1], newFiles[index]] = [newFiles[index], newFiles[index - 1]];
      return newFiles;
    });
  };

  // Handle file reorder (move down)
  const handleMoveDown = (index: number) => {
    if (index === files.length - 1) return;
    setFiles((prev) => {
      const newFiles = [...prev];
      [newFiles[index], newFiles[index + 1]] = [newFiles[index + 1], newFiles[index]];
      return newFiles;
    });
  };

  // Merge PDFs
  const handleMerge = async () => {
    if (files.length < 2) {
      setError("Please select at least 2 PDF files to merge");
      return;
    }

    setIsMerging(true);
    setError(null);

    try {
      const fileObjects = files.map((f) => f.file);
      const pdfBytes = await mergePDFs(fileObjects);
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      setMergedBlob(blob);
    } catch (err) {
      console.error("Error merging PDFs:", err);
      setError("Failed to merge PDFs. Please try again.");
    } finally {
      setIsMerging(false);
    }
  };

  // Download merged PDF
  const handleDownload = () => {
    if (!mergedBlob) return;
    
    const fileName = generateMergedFileName(files.map((f) => f.file));
    const url = URL.createObjectURL(mergedBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Reset
  const handleReset = () => {
    setFiles([]);
    setMergedBlob(null);
    setError(null);
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">Merge PDF</h1>
        <p className="text-muted-foreground">Combine multiple PDF files into one</p>
      </div>

      {/* File Upload */}
      <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 transition-colors">
        <input
          type="file"
          accept=".pdf,application/pdf"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          id="file-input"
        />
        <label htmlFor="file-input" className="cursor-pointer">
          <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="font-medium">Click to upload PDF files</p>
          <p className="text-sm text-muted-foreground mt-1">or drag and drop</p>
        </label>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">Selected Files ({files.length})</h3>
            <span className="text-sm text-muted-foreground">Drag to reorder</span>
          </div>
          
          {files.map((file, index) => (
            <div
              key={file.id}
              className="flex items-center gap-3 p-3 rounded-lg border bg-card"
            >
              {/* Reorder Buttons */}
              <div className="flex flex-col">
                <button
                  onClick={() => handleMoveUp(index)}
                  disabled={index === 0}
                  className="p-1 hover:bg-accent disabled:opacity-30 rounded"
                >
                  <span className="text-xs">▲</span>
                </button>
                <button
                  onClick={() => handleMoveDown(index)}
                  disabled={index === files.length - 1}
                  className="p-1 hover:bg-accent disabled:opacity-30 rounded"
                >
                  <span className="text-xs">▼</span>
                </button>
              </div>

              {/* File Icon */}
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <File className="h-5 w-5 text-primary" />
              </div>

              {/* File Info */}
              <div className="flex-1 min-w-0">
                <p className="truncate font-medium">{file.file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(file.file.size)}
                </p>
              </div>

              {/* Remove Button */}
              <button
                onClick={() => handleRemoveFile(file.id)}
                className="p-2 hover:bg-destructive/10 rounded-full text-muted-foreground hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Merge Button */}
      {files.length >= 2 && !mergedBlob && (
        <button
          onClick={handleMerge}
          disabled={isMerging}
          className={cn(
            "w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2",
            "bg-primary text-primary-foreground hover:bg-primary/90",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          {isMerging ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Merging...
            </>
          ) : (
            <>
              <Combine className="h-4 w-4" />
              Merge PDFs
            </>
          )}
        </button>
      )}

      {/* Success / Download */}
      {mergedBlob && (
        <div className="rounded-lg border bg-card p-6 text-center space-y-4">
          <div className="h-16 w-16 mx-auto rounded-full bg-green-100 flex items-center justify-center">
            <span className="text-2xl">✓</span>
          </div>
          <div>
            <h3 className="font-semibold">PDFs Merged Successfully!</h3>
            <p className="text-sm text-muted-foreground">
              Your merged PDF is ready to download
            </p>
          </div>
          <div className="flex gap-3 justify-center">
            <button
              onClick={handleDownload}
              className="px-4 py-2 rounded-lg font-medium flex items-center gap-2 bg-primary text-primary-foreground"
            >
              <Download className="h-4 w-4" />
              Download
            </button>
            <button
              onClick={handleReset}
              className="px-4 py-2 rounded-lg font-medium border hover:bg-accent"
            >
              Start Over
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
