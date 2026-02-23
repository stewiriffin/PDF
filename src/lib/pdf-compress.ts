import { spawn } from "child_process";
import { createReadStream, createWriteStream, unlink, statSync } from "fs";
import { join, extname, dirname } from "path";
import { randomBytes } from "crypto";
import { tmpdir } from "os";

/**
 * Compression quality levels for Ghostscript
 */
export type CompressionQuality = "extreme" | "recommended" | "low";

/**
 * Ghostscript PDFSETTINGS presets
 */
const GHOSTSCRIPT_PRESETS: Record<CompressionQuality, string> = {
  /** /screen - 72 dpi, smallest size, suitable for screen viewing */
  extreme: "/screen",
  /** /ebook - 150 dpi, balanced quality and size */
  recommended: "/ebook",
  /** /printer - 300 dpi, high quality, suitable for printing */
  low: "/printer",
};

/**
 * Error class for Ghostscript-related errors
 */
export class GhostscriptError extends Error {
  constructor(
    message: string,
    public readonly code: "NOT_INSTALLED" | "COMPRESSION_FAILED" | "INVALID_FILE"
  ) {
    super(message);
    this.name = "GhostscriptError";
  }
}

/**
 * Result type for compression operation
 */
export interface CompressionResult {
  success: boolean;
  blob?: Blob;
  originalSize?: number;
  compressedSize?: number;
  filename?: string;
  error?: string;
}

/**
 * Checks if Ghostscript is installed on the server
 * @returns Promise<boolean> - True if Ghostscript is available
 */
export async function checkGhostscriptInstalled(): Promise<boolean> {
  return new Promise((resolve) => {
    const gsProcess = spawn("gs", ["--version"], {
      shell: true,
      stdio: "ignore",
    });

    gsProcess.on("error", () => {
      resolve(false);
    });

    gsProcess.on("close", (code) => {
      resolve(code === 0);
    });
  });
}

/**
 * Gets the Ghostscript version if installed
 * @returns Promise<string | null> - Version string or null if not installed
 */
export async function getGhostscriptVersion(): Promise<string | null> {
  return new Promise((resolve) => {
    const gsProcess = spawn("gs", ["--version"], {
      shell: true,
      stdio: "pipe",
    });

    let version = "";

    gsProcess.stdout?.on("data", (data) => {
      version += data.toString();
    });

    gsProcess.on("error", () => {
      resolve(null);
    });

    gsProcess.on("close", (code) => {
      if (code === 0 && version.trim()) {
        resolve(version.trim());
      } else {
        resolve(null);
      }
    });
  });
}

/**
 * Creates a temporary file path with the given extension
 * @param extension - File extension (with or without leading dot)
 * @returns Full path to the temporary file
 */
function createTempFilePath(extension: string): string {
  const ext = extension.startsWith(".") ? extension : `.${extension}`;
  const tempDir = tmpdir();
  const randomName = randomBytes(16).toString("hex");
  return join(tempDir, `pdf_compress_${randomName}${ext}`);
}

/**
 * Deletes a file if it exists
 * @param filePath - Path to the file to delete
 */
function cleanupFile(filePath: string): void {
  try {
    unlink(filePath, () => {
      // Ignore errors during cleanup
    });
  } catch {
    // Ignore cleanup errors
  }
}

/**
 * Compresses a PDF file using Ghostscript
 * 
 * @param file - The PDF file to compress (File object from browser)
 * @param quality - Compression quality level: "extreme" (72dpi), "recommended" (150dpi), or "low" (300dpi)
 * @returns Promise<CompressionResult> - The compressed PDF as a Blob or error information
 * 
 * @example
 * ```typescript
 * const file = new File([pdfData], "document.pdf", { type: "application/pdf" });
 * const result = await compressPDF(file, "recommended");
 * 
 * if (result.success && result.blob) {
 *   // Download the compressed file
 *   const url = URL.createObjectURL(result.blob);
 *   const a = document.createElement("a");
 *   a.href = url;
 *   a.download = "compressed.pdf";
 *   a.click();
 * }
 * ```
 */
export async function compressPDF(
  file: File,
  quality: CompressionQuality = "recommended"
): Promise<CompressionResult> {
  // Validate quality parameter
  if (!GHOSTSCRIPT_PRESETS[quality]) {
    return {
      success: false,
      error: `Invalid quality level: ${quality}. Must be "extreme", "recommended", or "low".`,
    };
  }

  // Check if Ghostscript is installed
  const isInstalled = await checkGhostscriptInstalled();
  if (!isInstalled) {
    return {
      success: false,
      error: "Ghostscript is not installed on the server. Please install Ghostscript to use this feature.",
    };
  }

  // Get file stats for original size
  let originalSize = 0;
  
  // Create temporary input file
  let inputPath: string;
  let outputPath: string;

  try {
    // Create temp files
    inputPath = createTempFilePath(".pdf");
    outputPath = createTempFilePath(".pdf");

    // Write the uploaded file to the input temp file
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    originalSize = buffer.length;

    // Write buffer to temp file using synchronous write
    const fs = await import("fs");
    fs.writeFileSync(inputPath, buffer);

    // Get the preset
    const preset = GHOSTSCRIPT_PRESETS[quality];

    // Build Ghostscript command arguments
    // Using spawn with argument array to prevent shell injection
    const gsArgs = [
      "-sDEVICE=pdfwrite",
      `-dPDFSETTINGS=${preset}`,
      "-dNOPAUSE",
      "-dQUIET",
      "-dBATCH",
      "-sOutputFile=" + outputPath,
      inputPath,
    ];

    // Execute Ghostscript
    const compressedData = await new Promise<Buffer>((resolve, reject) => {
      const gsProcess = spawn("gs", gsArgs, {
        stdio: ["ignore", "pipe", "pipe"],
      });

      let stdout = "";
      let stderr = "";

      gsProcess.stdout?.on("data", (data) => {
        stdout += data.toString();
      });

      gsProcess.stderr?.on("data", (data) => {
        stderr += data.toString();
      });

      gsProcess.on("error", (err) => {
        cleanupFile(inputPath);
        cleanupFile(outputPath);
        reject(new GhostscriptError(
          `Failed to start Ghostscript: ${err.message}`,
          "COMPRESSION_FAILED"
        ));
      });

      gsProcess.on("close", (code) => {
        if (code !== 0) {
          cleanupFile(inputPath);
          cleanupFile(outputPath);
          
          // Check for common error messages
          if (stderr.includes("Unable to open") || stderr.includes("Permission denied")) {
            reject(new GhostscriptError(
              "Unable to read the PDF file. The file may be corrupted or password protected.",
              "INVALID_FILE"
            ));
          } else {
            reject(new GhostscriptError(
              `Ghostscript compression failed: ${stderr || "Unknown error"}`,
              "COMPRESSION_FAILED"
            ));
          }
          return;
        }

        // Read the compressed file
        try {
          const compressedBuffer = fs.readFileSync(outputPath);
          resolve(compressedBuffer);
        } catch (readErr) {
          reject(new GhostscriptError(
            `Failed to read compressed file: ${(readErr as Error).message}`,
            "COMPRESSION_FAILED"
          ));
        }
      });
    });

    // Clean up temp files
    cleanupFile(inputPath);
    cleanupFile(outputPath);

    // Create blob from compressed data
    const compressedBlob = new Blob([compressedData], { type: "application/pdf" });
    const compressedSize = compressedData.length;

    // Generate output filename
    const baseName = file.name.replace(/\.pdf$/i, "");
    const qualitySuffix = quality === "recommended" ? "" : `_${quality}`;
    const outputFilename = `${baseName}_compressed${qualitySuffix}.pdf`;

    return {
      success: true,
      blob: compressedBlob,
      originalSize,
      compressedSize,
      filename: outputFilename,
    };
  } catch (error) {
    // Clean up on error
    cleanupFile(inputPath);
    cleanupFile(outputPath);

    if (error instanceof GhostscriptError) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: `Compression failed: ${(error as Error).message}`,
    };
  }
}

/**
 * Compresses a PDF and streams the result directly to a writable stream
 * This is useful for large files to avoid holding the entire result in memory
 * 
 * @param file - The PDF file to compress
 * @param quality - Compression quality level
 * @param outputStream - A writable stream to write the compressed PDF to
 * @returns Promise<void>
 */
export async function compressPDFStream(
  file: File,
  quality: CompressionQuality,
  outputStream: NodeJS.WritableStream
): Promise<void> {
  if (!GHOSTSCRIPT_PRESETS[quality]) {
    throw new Error(`Invalid quality level: ${quality}`);
  }

  const isInstalled = await checkGhostscriptInstalled();
  if (!isInstalled) {
    throw new GhostscriptError(
      "Ghostscript is not installed on the server",
      "NOT_INSTALLED"
    );
  }

  const inputPath = createTempFilePath(".pdf");
  const outputPath = createTempFilePath(".pdf");

  try {
    // Write input file
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fs = await import("fs");
    fs.writeFileSync(inputPath, buffer);

    const preset = GHOSTSCRIPT_PRESETS[quality];

    // Execute Ghostscript
    await new Promise<void>((resolve, reject) => {
      const gsProcess = spawn("gs", [
        "-sDEVICE=pdfwrite",
        `-dPDFSETTINGS=${preset}`,
        "-dNOPAUSE",
        "-dQUIET",
        "-dBATCH",
        "-sOutputFile=" + outputPath,
        inputPath,
      ], {
        stdio: ["ignore", "pipe", "pipe"],
      });

      let stderr = "";

      gsProcess.stderr?.on("data", (data) => {
        stderr += data.toString();
      });

      gsProcess.on("error", (err) => {
        reject(new GhostscriptError(
          `Failed to start Ghostscript: ${err.message}`,
          "COMPRESSION_FAILED"
        ));
      });

      gsProcess.on("close", (code) => {
        if (code !== 0) {
          reject(new GhostscriptError(
            `Ghostscript compression failed: ${stderr}`,
            "COMPRESSION_FAILED"
          ));
          return;
        }
        resolve();
      });
    });

    // Stream the output file to the provided stream
    const readStream = createReadStream(outputPath);
    
    await new Promise<void>((resolve, reject) => {
      readStream.pipe(outputStream, { end: true });
      
      readStream.on("error", reject);
      outputStream.on("error", reject);
      outputStream.on("finish", resolve);
    });
  } finally {
    cleanupFile(inputPath);
    cleanupFile(outputPath);
  }
}

/**
 * Calculates the compression ratio as a percentage
 * @param originalSize - Original file size in bytes
 * @param compressedSize - Compressed file size in bytes
 * @returns Compression ratio as a percentage (e.g., 50 means 50% reduction)
 */
export function calculateCompressionRatio(
  originalSize: number,
  compressedSize: number
): number {
  if (originalSize === 0) return 0;
  return Math.round(((originalSize - compressedSize) / originalSize) * 100);
}

/**
 * Formats file size in human-readable format
 * @param bytes - Size in bytes
 * @returns Formatted string (e.g., "1.5 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
