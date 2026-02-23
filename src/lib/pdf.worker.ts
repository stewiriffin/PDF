// PDF Processing Web Worker
// This runs in a separate thread to avoid blocking the UI

import { PDFDocument } from "pdf-lib";

export interface WorkerMessage {
  type: "merge" | "split";
  files: ArrayBuffer[];
  fileNames: string[];
  options?: {
    pageRanges?: { start: number; end: number }[];
  };
}

export interface WorkerProgress {
  type: "progress";
  current: number;
  total: number;
  message: string;
}

export interface WorkerSuccess {
  type: "success";
  data: Uint8Array;
  fileName: string;
}

export interface WorkerError {
  type: "error";
  message: string;
  code?: string;
}

export type WorkerResponse = WorkerProgress | WorkerSuccess | WorkerError;

// PDF Merge function that runs in the worker
async function mergePDFsInWorker(
  files: ArrayBuffer[],
  fileNames: string[],
  sendProgress: (progress: WorkerProgress) => void
): Promise<Uint8Array> {
  const mergedPdf = await PDFDocument.create();
  const total = files.length;

  for (let i = 0; i < files.length; i++) {
    try {
      sendProgress({
        type: "progress",
        current: i + 1,
        total,
        message: `Processing file ${i + 1} of ${total}: ${fileNames[i]}`,
      });

      const pdf = await PDFDocument.load(files[i]);
      const pageIndices = pdf.getPageIndices();
      const copiedPages = await mergedPdf.copyPages(pdf, pageIndices);

      for (const page of copiedPages) {
        mergedPdf.addPage(page);
      }
    } catch (err) {
      const error = err as Error;
      if (error.message.includes("password")) {
        throw new Error(`"${fileNames[i]}" is password-protected. Please remove the password and try again.`);
      }
      throw new Error(`Failed to process "${fileNames[i]}". The file may be corrupted or invalid.`);
    }
  }

  sendProgress({
    type: "progress",
    current: total,
    total,
    message: "Finalizing merged PDF...",
  });

  return mergedPdf.save();
}

// PDF Split function that runs in the worker
async function splitPDFInWorker(
  files: ArrayBuffer[],
  fileNames: string[],
  options: { pageRanges?: { start: number; end: number }[] },
  sendProgress: (progress: WorkerProgress) => void
): Promise<{ data: Uint8Array; fileName: string }[]> {
  if (files.length !== 1) {
    throw new Error("Split operation requires exactly 1 file");
  }

  const sourceBuffer = files[0];
  const sourcePdf = await PDFDocument.load(sourceBuffer);
  const pageCount = sourcePdf.getPageCount();
  const ranges = options.pageRanges || [{ start: 1, end: pageCount }];
  const total = ranges.length;

  const results: { data: Uint8Array; fileName: string }[] = [];
  const baseName = fileNames[0].replace(/\.pdf$/i, "");

  for (let i = 0; i < ranges.length; i++) {
    const range = ranges[i];
    sendProgress({
      type: "progress",
      current: i + 1,
      total,
      message: `Extracting pages ${range.start}-${range.end}...`,
    });

    const newPdf = await PDFDocument.create();
    const startIndex = Math.max(0, range.start - 1);
    const endIndex = Math.min(pageCount - 1, range.end - 1);
    const pageIndices: number[] = [];

    for (let j = startIndex; j <= endIndex; j++) {
      pageIndices.push(j);
    }

    const copiedPages = await newPdf.copyPages(sourcePdf, pageIndices);
    for (const page of copiedPages) {
      newPdf.addPage(page);
    }

    const pdfBytes = await newPdf.save();
    const fileName = `${baseName}_pages_${range.start}-${range.end}.pdf`;

    results.push({ data: pdfBytes, fileName });
  }

  return results;
}

// Message handler
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const { type, files, fileNames, options } = event.data;

  try {
    let result: Uint8Array | { data: Uint8Array; fileName: string }[];

    if (type === "merge") {
      result = await mergePDFsInWorker(files, fileNames, (progress) => {
        self.postMessage(progress as WorkerResponse);
      });
      
      const mergedFileName = fileNames.length > 0 
        ? `${fileNames[0].replace(/\.pdf$/i, "")}_merged.pdf`
        : "merged.pdf";

      self.postMessage({
        type: "success",
        data: result as Uint8Array,
        fileName: mergedFileName,
      } as WorkerSuccess);
    } else if (type === "split") {
      result = await splitPDFInWorker(files, fileNames, options || {}, (progress) => {
        self.postMessage(progress as WorkerResponse);
      });

      // For split, we need to handle multiple files
      // Send each as a separate message
      for (const r of result) {
        self.postMessage({
          type: "success",
          data: r.data,
          fileName: r.fileName,
        } as WorkerSuccess);
      }
    }
  } catch (err) {
    const error = err as Error;
    self.postMessage({
      type: "error",
      message: error.message || "An unknown error occurred",
    } as WorkerError);
  }
};

export {};
