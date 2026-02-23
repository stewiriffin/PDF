import { NextRequest, NextResponse } from "next/server";
import { 
  compressPDFStream, 
  checkGhostscriptInstalled,
  CompressionQuality 
} from "@/lib/pdf-compress";

/**
 * API Route: POST /api/compress/stream
 * 
 * Compresses a PDF file using Ghostscript and streams the result back.
 * This is ideal for large files as it doesn't hold the entire result in memory.
 * 
 * Request body: multipart/form-data
 * - file: PDF file
 * - quality: "extreme" | "recommended" | "low"
 * 
 * Response: application/pdf stream
 */
export async function POST(request: NextRequest) {
  try {
    // Check if Ghostscript is installed
    const isInstalled = await checkGhostscriptInstalled();
    if (!isInstalled) {
      return NextResponse.json(
        {
          error: "Ghostscript is not installed on the server",
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
        { error: "Invalid quality level" },
        { status: 400 }
      );
    }

    // Generate output filename
    const baseName = file.name.replace(/\.pdf$/i, "");
    const qualitySuffix = quality === "recommended" ? "" : `_${quality}`;
    const outputFilename = `${baseName}_compressed${qualitySuffix}.pdf`;

    // Create a PassThrough stream to handle the response
    const { PassThrough } = await import("stream");
    const passThrough = new PassThrough();

    // Set up the response with streaming
    const response = new NextResponse(passThrough, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${outputFilename}"`,
        "X-Quality-Level": quality,
      },
    });

    // Start the compression in the background and pipe to response
    compressPDFStream(file, quality, passThrough).catch((error) => {
      console.error("Compression error:", error);
      passThrough.destroy();
    });

    return response;
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
    available: isInstalled,
    message: isInstalled 
      ? "PDF compression service is available" 
      : "Ghostscript is not installed",
  });
}
