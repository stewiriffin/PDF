import { NextRequest, NextResponse } from "next/server";
import { 
  compressPDF, 
  checkGhostscriptInstalled,
  CompressionQuality 
} from "@/lib/pdf-compress";

/**
 * API Route: POST /api/compress
 * 
 * Compresses a PDF file using Ghostscript.
 * Returns the compressed file as a downloadable response.
 * 
 * Request body: multipart/form-data
 * - file: PDF file
 * - quality: "extreme" | "recommended" | "low"
 * 
 * Response: application/pdf (on success) or JSON (on error)
 */
export async function POST(request: NextRequest) {
  try {
    // Check if Ghostscript is installed
    const isInstalled = await checkGhostscriptInstalled();
    if (!isInstalled) {
      return NextResponse.json(
        {
          error: "Ghostscript is not installed on the server",
          hint: "Install Ghostscript: sudo apt-get install ghostscript (Linux) or brew install ghostscript (macOS)",
        },
        { status: 503 }
      );
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const quality = formData.get("quality") as CompressionQuality | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    if (!quality || !["extreme", "recommended", "low"].includes(quality)) {
      return NextResponse.json(
        { 
          error: "Invalid quality level",
          validLevels: ["extreme", "recommended", "low"],
        },
        { status: 400 }
      );
    }

    // Perform compression
    const result = await compressPDF(file, quality);

    if (!result.success || !result.blob) {
      return NextResponse.json(
        { error: result.error || "Compression failed" },
        { status: 500 }
      );
    }

    // Generate output filename
    const baseName = file.name.replace(/\.pdf$/i, "");
    const qualitySuffix = quality === "recommended" ? "" : `_${quality}`;
    const outputFilename = `${baseName}_compressed${qualitySuffix}.pdf`;

    // Convert Blob to ArrayBuffer
    const arrayBuffer = await result.blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Return the compressed PDF
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${outputFilename}"`,
        "X-Original-Size": String(result.originalSize || 0),
        "X-Compressed-Size": String(result.compressedSize || 0),
        "X-Compression-Ratio": String(
          result.originalSize && result.compressedSize
            ? Math.round(((result.originalSize - result.compressedSize) / result.originalSize) * 100)
            : 0
        ),
      },
    });
  } catch (error) {
    console.error("API route error:", error);
    return NextResponse.json(
      { error: `Compression failed: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}

/**
 * GET handler to check if the compression service is available
 */
export async function GET() {
  const isInstalled = await checkGhostscriptInstalled();
  
  return NextResponse.json({
    service: "pdf-compress",
    available: isInstalled,
    qualityLevels: {
      extreme: { description: "72 DPI - smallest size", preset: "/screen" },
      recommended: { description: "150 DPI - balanced", preset: "/ebook" },
      low: { description: "300 DPI - high quality", preset: "/printer" },
    },
    message: isInstalled 
      ? "PDF compression service is available" 
      : "Ghostscript is not installed on this server",
  });
}
