export interface PDFToolConfig {
  title: string;
  description: string;
  icon: string;
  accept: Record<string, string[]>;
  maxFiles: number;
  maxSize: number;
  multiple: boolean;
}

export type ToolStatus = "idle" | "processing" | "success" | "error";

export interface ProcessedFile {
  name: string;
  blob: Blob;
  url: string;
}
