import { PDFDocument, rgb, StandardFonts, degrees } from "pdf-lib";

/**
 * Watermark options for PDF
 */
export interface WatermarkOptions {
  /** Text to use as watermark */
  text: string;
  /** Font size of the watermark */
  fontSize?: number;
  /** Opacity of the watermark (0-1) */
  opacity?: number;
  /** Rotation angle in degrees */
  rotation?: number;
  /** Color - RGB values (0-1) */
  color?: { r: number; g: number; b: number };
  /** Position - 'center' or custom coordinates */
  position?: "center" | "top-left" | "top-right" | "bottom-left" | "bottom-right";
  /** Apply to all pages or specific page */
  applyToAll?: boolean;
  /** Specific page number (1-based), -1 for last page */
  pageNumber?: number;
}

/**
 * Default watermark options
 */
export const defaultWatermarkOptions: WatermarkOptions = {
  text: "WATERMARK",
  fontSize: 50,
  opacity: 0.3,
  rotation: -45,
  color: { r: 0.5, g: 0.5, b: 0.5 },
  position: "center",
  applyToAll: true,
};

/**
 * Adds a watermark to a PDF
 * 
 * @param file - The PDF file to watermark
 * @param options - Watermark options
 * @returns Promise<Blob> - The watermarked PDF as a Blob
 */
export async function watermarkPDF(
  file: File,
  options: WatermarkOptions
): Promise<Blob> {
  const opts = { ...defaultWatermarkOptions, ...options };

  // Validate inputs
  if (!opts.text || opts.text.trim() === "") {
    throw new Error("Watermark text is required");
  }

  if (opts.fontSize && opts.fontSize < 1) {
    throw new Error("Font size must be at least 1");
  }

  if (opts.opacity && (opts.opacity < 0 || opts.opacity > 1)) {
    throw new Error("Opacity must be between 0 and 1");
  }

  // Read the PDF
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);

  // Get font
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Get pages to watermark
  const pages = pdfDoc.getPages();
  const totalPages = pages.length;

  // Determine which pages to apply watermark to
  let pagesToWatermark: number[] = [];
  
  if (opts.applyToAll) {
    pagesToWatermark = Array.from({ length: totalPages }, (_, i) => i);
  } else if (opts.pageNumber !== undefined) {
    let pageIndex = opts.pageNumber - 1; // Convert to 0-based
    if (pageIndex < 0) pageIndex = totalPages + pageIndex; // Handle negative (last page = -1)
    if (pageIndex >= 0 && pageIndex < totalPages) {
      pagesToWatermark = [pageIndex];
    }
  } else {
    pagesToWatermark = [0]; // Default to first page
  }

  // Apply watermark to each page
  for (const pageIndex of pagesToWatermark) {
    const page = pages[pageIndex];
    const { width, height } = page.getSize();

    // Calculate position
    let x: number;
    let y: number;

    // Measure text
    const textWidth = helveticaFont.widthOfTextAtSize(opts.text, opts.fontSize || 50);
    const textHeight = helveticaFont.heightAtSize(opts.fontSize || 50);

    switch (opts.position) {
      case "top-left":
        x = 50;
        y = height - textHeight - 50;
        break;
      case "top-right":
        x = width - textWidth - 50;
        y = height - textHeight - 50;
        break;
      case "bottom-left":
        x = 50;
        y = 50;
        break;
      case "bottom-right":
        x = width - textWidth - 50;
        y = 50;
        break;
      case "center":
      default:
        x = (width - textWidth) / 2;
        y = (height - textHeight) / 2;
        break;
    }

    // Apply rotation around center if specified
    const rotation = opts.rotation || 0;

    // Draw the watermark
    page.drawText(opts.text, {
      x,
      y,
      size: opts.fontSize || 50,
      font: helveticaFont,
      color: rgb(
        opts.color?.r || 0.5,
        opts.color?.g || 0.5,
        opts.color?.b || 0.5
      ),
      opacity: opts.opacity || 0.3,
      rotate: degrees(rotation),
    });
  }

  // Save the watermarked PDF
  const pdfBytes = await pdfDoc.save();

  return new Blob([pdfBytes], { type: "application/pdf" });
}

/**
 * Generates a filename for the watermarked PDF
 */
export function generateWatermarkedFileName(originalFileName: string): string {
  const baseName = originalFileName.replace(/\.pdf$/i, "");
  return `${baseName}_watermarked.pdf`;
}
