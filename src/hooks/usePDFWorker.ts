"use client";

import { useState, useRef, useCallback, useEffect } from "react";

export interface PDFWorkerProgress {
  current: number;
  total: number;
  message: string;
}

export interface UsePDFWorkerOptions {
  onProgress?: (progress: PDFWorkerProgress) => void;
  onSuccess?: (data: Uint8Array, fileName: string) => void;
  onError?: (error: string) => void;
  onComplete?: () => void;
}

export function usePDFWorker(options: UsePDFWorkerOptions = {}) {
  const { onProgress, onSuccess, onError, onComplete } = options;
  const workerRef = useRef<Worker | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Initialize worker
  const initWorker = useCallback(() => {
    if (workerRef.current) {
      return workerRef.current;
    }

    // Create worker from the worker file
    const worker = new Worker(
      new URL("../lib/pdf.worker.ts", import.meta.url),
      { type: "module" }
    );

    worker.onmessage = (event) => {
      const { type, current, total, message, data, fileName } = event.data;

      if (type === "progress") {
        onProgress?.({ current, total, message });
      } else if (type === "success") {
        onSuccess?.(data, fileName);
      } else if (type === "error") {
        onError?.(message);
      }
    };

    worker.onerror = (error) => {
      console.error("Worker error:", error);
      onError?.("An unexpected error occurred. Please try again.");
    };

    workerRef.current = worker;
    return worker;
  }, [onProgress, onSuccess, onError]);

  // Merge PDFs using worker
  const mergePDFs = useCallback(async (files: File[]) => {
    if (files.length < 2) {
      onError?.("Please select at least 2 files to merge");
      return;
    }

    setIsProcessing(true);
    const worker = initWorker();

    try {
      // Convert files to ArrayBuffers
      const fileData: ArrayBuffer[] = [];
      const fileNames: string[] = [];

      for (let i = 0; i < files.length; i++) {
        onProgress?.({
          current: i + 1,
          total: files.length + 1,
          message: `Reading file ${i + 1} of ${files.length}: ${files[i].name}`,
        });
        fileData.push(await files[i].arrayBuffer());
        fileNames.push(files[i].name);
      }

      // Send to worker
      worker.postMessage({
        type: "merge",
        files: fileData,
        fileNames,
      });
    } catch (err) {
      const error = err as Error;
      onError?.(error.message || "Failed to process files");
      setIsProcessing(false);
    }
  }, [initWorker, onProgress, onError]);

  // Split PDF using worker
  const splitPDF = useCallback(async (
    file: File,
    pageRanges: { start: number; end: number }[]
  ) => {
    setIsProcessing(true);
    const worker = initWorker();

    try {
      const fileData = await file.arrayBuffer();

      onProgress?.({
        current: 1,
        total: pageRanges.length + 1,
        message: "Preparing to split PDF...",
      });

      worker.postMessage({
        type: "split",
        files: [fileData],
        fileNames: [file.name],
        options: { pageRanges },
      });
    } catch (err) {
      const error = err as Error;
      onError?.(error.message || "Failed to process file");
      setIsProcessing(false);
    }
  }, [initWorker, onProgress, onError]);

  // Handle worker completion
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === "success" || event.data.type === "error") {
        setIsProcessing(false);
        onComplete?.();
      }
    };

    if (workerRef.current) {
      workerRef.current.addEventListener("message", handleMessage);
    }

    return () => {
      if (workerRef.current) {
        workerRef.current.removeEventListener("message", handleMessage);
      }
    };
  }, [onComplete]);

  // Cleanup worker
  const terminate = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      terminate();
    };
  }, [terminate]);

  return {
    mergePDFs,
    splitPDF,
    isProcessing,
    terminate,
  };
}
