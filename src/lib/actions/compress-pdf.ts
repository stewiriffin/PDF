"use server";

import { 
  compressPDF, 
  compressPDFStream,
  checkGhostscriptInstalled,
  getGhostscriptVersion,
  calculateCompressionRatio,
  formatFileSize,
  CompressionQuality,
  CompressionResult
} from "../pdf-compress";

/**
 * Server Action: Compress a PDF file using Ghostscript
 * 
 * This function is called from the client to compress a PDF file
 * with the specified quality level.
 * 
 * @param formData - FormData containing the PDF file and quality level
 * @returns CompressionResult with the compressed file or error
 */
export async function compressPDFAction(
  formData: FormData
): Promise<CompressionResult> {
  try {
    const file = formData.get("file") as File | null;
    const quality = formData.get("quality") as CompressionQuality | null;

    if (!file) {
      return {
        success: false,
        error: "No file provided",
      };
    }

    if (!quality || !["extreme", "recommended", "low"].includes(quality)) {
      return {
        success: false,
        error: "Invalid quality level. Must be 'extreme', 'recommended', or 'low'.",
      };
    }

    const result = await compressPDF(file, quality);

    return result;
  } catch (error) {
    return {
      success: false,
      error: `Compression failed: ${(error as Error).message}`,
    };
  }
}

/**
 * Server Action: Check if Ghostscript is available on the server
 * 
 * @returns Object with availability status and version if installed
 */
export async function checkGhostscriptAction(): Promise<{
  installed: boolean;
  version: string | null;
  message: string;
}> {
  const isInstalled = await checkGhostscriptInstalled();
  const version = await getGhostscriptVersion();

  if (isInstalled && version) {
    return {
      installed: true,
      version,
      message: `Ghostscript ${version} is available`,
    };
  }

  return {
    installed: false,
    version: null,
    message: "Ghostscript is not installed. Please install Ghostscript to use PDF compression.",
  };
}

/**
 * Server Action: Get compression info without actually compressing
 * 
 * This can be used to check if compression is possible before
 * uploading a large file.
 * 
 * @returns Object with server capabilities
 */
export async function getCompressionCapabilities(): Promise<{
  available: boolean;
  features: {
    extreme: { description: string; dpi: number };
    recommended: { description: string; dpi: number };
    low: { description: string; dpi: number };
  };
}> {
  const isInstalled = await checkGhostscriptInstalled();

  return {
    available: isInstalled,
    features: {
      extreme: {
        description: "Smallest file size, 72 DPI - best for screen viewing",
        dpi: 72,
      },
      recommended: {
        description: "Balanced quality, 150 DPI - recommended for most use cases",
        dpi: 150,
      },
      low: {
        description: "Highest quality, 300 DPI - best for printing",
        dpi: 300,
      },
    },
  };
}

// Re-export utility functions for convenience
export {
  calculateCompressionRatio,
  formatFileSize,
  type CompressionQuality,
  type CompressionResult,
};
