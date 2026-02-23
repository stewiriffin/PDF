"use client";

import { useCallback, useState, useRef } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, File, X, CheckCircle2 } from "lucide-react";
import { cn, formatFileSize, generateId } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

export interface UploadedFile {
  id: string;
  file: File;
  preview?: string;
  progress?: number;
}

interface FileUploadZoneProps {
  onFilesAdded: (files: UploadedFile[]) => void;
  accept?: Record<string, string[]>;
  maxFiles?: number;
  maxSize?: number;
  multiple?: boolean;
  disabled?: boolean;
}

export function FileUploadZone({
  onFilesAdded,
  accept = { "application/pdf": [".pdf"] },
  maxFiles = 10,
  maxSize = 50 * 1024 * 1024, // 50MB
  multiple = true,
  disabled = false,
}: FileUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const processFiles = useCallback(async (files: File[]) => {
    setIsUploading(true);
    setUploadProgress(0);
    
    const newFiles: UploadedFile[] = [];
    const total = files.length;
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Simulate progress for each file (in real app, this would be actual upload progress)
      await new Promise(resolve => setTimeout(resolve, 200));
      
      newFiles.push({
        id: generateId(),
        file,
        preview: file.type.startsWith("image/")
          ? URL.createObjectURL(file)
          : undefined,
        progress: 100,
      });
      
      setUploadProgress(Math.round(((i + 1) / total) * 100));
    }
    
    onFilesAdded(newFiles);
    setIsUploading(false);
    setUploadProgress(null);
    
    // Show toast notification
    if (newFiles.length === 1) {
      toast.success(`${newFiles.length} file added`, {
        description: newFiles[0].file.name,
        icon: <CheckCircle2 className="h-4 w-4 text-green-500" />,
      });
    } else {
      toast.success(`${newFiles.length} files added`, {
        description: `Ready to process`,
        icon: <CheckCircle2 className="h-4 w-4 text-green-500" />,
      });
    }
  }, [onFilesAdded]);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      processFiles(acceptedFiles);
    },
    [processFiles]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxFiles,
    maxSize,
    multiple,
    onDragEnter: () => setIsDragging(true),
    onDragLeave: () => setIsDragging(false),
    disabled: isUploading || disabled,
  });

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={cn(
          "relative cursor-pointer rounded-xl border-2 border-dashed p-8 transition-all",
          isDragActive || isDragging
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50 hover:bg-muted/50",
          isUploading && "opacity-50 cursor-not-allowed",
          disabled && "opacity-50 cursor-not-allowed",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center gap-4 text-center">
          <div
            className={cn(
              "flex h-16 w-16 items-center justify-center rounded-full transition-colors",
              isDragActive || isDragging ? "bg-primary/10" : "bg-muted"
            )}
          >
            {isUploading ? (
              <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            ) : (
              <Upload
                className={cn(
                  "h-8 w-8 transition-colors",
                  isDragActive || isDragging
                    ? "text-primary"
                    : "text-muted-foreground"
                )}
              />
            )}
          </div>
          <div className="space-y-2">
            <p className="text-lg font-medium">
              {isDragActive
                ? "Drop your files here"
                : isUploading
                ? "Processing files..."
                : "Drag & drop PDF files here"}
            </p>
            <p className="text-sm text-muted-foreground">
              or click to browse your files
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Maximum {maxFiles} files, up to {formatFileSize(maxSize)} each
          </p>
        </div>
      </div>
      
      {/* Progress Bar */}
      {isUploading && uploadProgress !== null && (
        <div className="animate-fade-in">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Uploading...</span>
            <span className="text-sm font-medium">{uploadProgress}%</span>
          </div>
          <Progress value={uploadProgress} className="h-2" />
        </div>
      )}
    </div>
  );
}
