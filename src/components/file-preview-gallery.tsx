"use client";

import { useState, useEffect, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion, AnimatePresence } from "framer-motion";
import { X, FileText, GripVertical, File, Layers } from "lucide-react";
import { cn, formatFileSize } from "@/lib/utils";

// Set the worker source for pdfjs
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

export interface PDFFile {
  id: string;
  file: File;
  thumbnail?: string;
  pageCount?: number;
}

interface FilePreviewGalleryProps {
  files: PDFFile[];
  onFilesChange: (files: PDFFile[]) => void;
  onFileRemove: (id: string) => void;
  emptyMessage?: string;
}

interface SortableFileCardProps {
  file: PDFFile;
  onRemove: (id: string) => void;
}

function SortableFileCard({ file, onRemove }: SortableFileCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: file.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative rounded-xl border bg-card overflow-hidden",
        "transition-all duration-200",
        isDragging
          ? "shadow-xl ring-2 ring-primary scale-105 z-50 opacity-90"
          : "hover:shadow-lg hover:border-primary/50"
      )}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-2 left-2 z-10 p-1.5 rounded-lg bg-background/80 backdrop-blur-sm cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>

      {/* Thumbnail */}
      <div className="aspect-[3/4] bg-muted/30 flex items-center justify-center overflow-hidden">
        {file.thumbnail ? (
          <img
            src={file.thumbnail}
            alt={file.file.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-muted-foreground">
            <FileText className="h-12 w-12 mb-2" />
            <span className="text-xs">Loading...</span>
          </div>
        )}
      </div>

      {/* Card Footer */}
      <div className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium truncate flex-1" title={file.file.name}>
            {file.file.name}
          </p>
          <button
            onClick={() => onRemove(file.id)}
            className="p-1 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{formatFileSize(file.file.size)}</span>
          {file.pageCount && (
            <span className="flex items-center gap-1">
              <Layers className="h-3 w-3" />
              {file.pageCount} {file.pageCount === 1 ? "page" : "pages"}
            </span>
          )}
        </div>
      </div>

      {/* Order Number */}
      <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
        ?
      </div>
    </div>
  );
}

function EmptyState({ message }: { message?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 px-4"
    >
      <div className="relative mb-6">
        <div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center">
          <File className="h-12 w-12 text-muted-foreground" />
        </div>
        <div className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-primary flex items-center justify-center animate-bounce">
          <span className="text-lg">+</span>
        </div>
      </div>
      <h3 className="text-lg font-semibold mb-2">
        {message || "Drop PDF files here"}
      </h3>
      <p className="text-sm text-muted-foreground text-center max-w-sm">
        Click to browse or drag and drop multiple PDF files to merge them
      </p>
    </motion.div>
  );
}

export function FilePreviewGallery({
  files,
  onFilesChange,
  onFileRemove,
  emptyMessage,
}: FilePreviewGalleryProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (over && active.id !== over.id) {
        const oldIndex = files.findIndex((f) => f.id === active.id);
        const newIndex = files.findIndex((f) => f.id === over.id);
        
        const newFiles = arrayMove(files, oldIndex, newIndex);
        onFilesChange(newFiles);
      }
    },
    [files, onFilesChange]
  );

  const handleRemove = useCallback(
    (id: string) => {
      onFileRemove(id);
      onFilesChange(files.filter((f) => f.id !== id));
    },
    [files, onFileRemove, onFilesChange]
  );

  if (files.length === 0) {
    return <EmptyState message={emptyMessage} />;
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={files.map((f) => f.id)} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          <AnimatePresence>
            {files.map((file, index) => (
              <motion.div
                key={file.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ delay: index * 0.05 }}
              >
                <SortableFileCard file={file} onRemove={handleRemove} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </SortableContext>
    </DndContext>
  );
}

// Utility function to generate thumbnails
export async function generatePDFThumbnail(
  file: File
): Promise<{ thumbnail: string; pageCount: number }> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  const pageCount = pdf.numPages;
  
  // Get first page
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 0.5 }); // Thumbnail scale
  
  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Could not get canvas context");
  }
  
  await page.render({
    canvasContext: context,
    viewport: viewport,
  }).promise;
  
  const thumbnail = canvas.toDataURL("image/jpeg", 0.8);
  
  return { thumbnail, pageCount };
}
