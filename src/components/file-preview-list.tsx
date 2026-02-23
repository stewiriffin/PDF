"use client";

import { useState } from "react";
import { FileText, GripVertical, X, ArrowUp, ArrowDown } from "lucide-react";
import { cn, formatFileSize } from "@/lib/utils";
import { UploadedFile } from "./file-upload-zone";

interface FilePreviewListProps {
  files: UploadedFile[];
  onRemove: (id: string) => void;
  onReorder?: (fromIndex: number, toIndex: number) => void;
  showReorder?: boolean;
}

export function FilePreviewList({
  files,
  onRemove,
  onReorder,
  showReorder = true,
}: FilePreviewListProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  if (files.length === 0) return null;

  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex !== null && dragIndex !== index && onReorder) {
      onReorder(dragIndex, index);
      setDragIndex(index);
    }
  };

  const handleDragEnd = () => {
    setDragIndex(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">
          Selected Files ({files.length})
        </h3>
        {showReorder && files.length > 1 && (
          <span className="text-xs text-muted-foreground">
            Drag to reorder
          </span>
        )}
      </div>
      <div className="space-y-2">
        {files.map((file, index) => (
          <div
            key={file.id}
            draggable={showReorder}
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            className={cn(
              "flex items-center gap-3 rounded-lg border border-border bg-card p-3 transition-all",
              dragIndex === index && "opacity-50",
              showReorder && "cursor-grab active:cursor-grabbing"
            )}
          >
            {showReorder && (
              <div className="flex flex-col gap-1 text-muted-foreground">
                <button
                  onClick={() => onReorder && index > 0 && onReorder(index, index - 1)}
                  disabled={index === 0}
                  className="p-0.5 hover:text-foreground disabled:opacity-30"
                  aria-label="Move up"
                >
                  <ArrowUp className="h-3 w-3" />
                </button>
                <button
                  onClick={() =>
                    onReorder && index < files.length - 1 && onReorder(index, index + 1)
                  }
                  disabled={index === files.length - 1}
                  className="p-0.5 hover:text-foreground disabled:opacity-30"
                  aria-label="Move down"
                >
                  <ArrowDown className="h-3 w-3" />
                </button>
              </div>
            )}
            
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium">
                {file.file.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(file.file.size)}
              </p>
            </div>
            
            <button
              onClick={() => onRemove(file.id)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
              aria-label="Remove file"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
