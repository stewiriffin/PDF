import { PDFDocument, degrees } from "pdf-lib";

/**
 * Represents a single page in the organizer
 */
export interface PDFPage {
  /** Page index (0-based) */
  index: number;
  /** Original page number (1-based for display) */
  pageNumber: number;
  /** Current rotation angle (0, 90, 180, 270) */
  rotation: number;
  /** Whether the page is marked for deletion */
  deleted: boolean;
  /** Page dimensions */
  width: number;
  height: number;
}

/**
 * Page info for display
 */
export interface PageThumbnail {
  page: PDFPage;
  /** Data URL for thumbnail image */
  thumbnail: string;
}

/**
 * Loads a PDF and extracts page information
 * @param file - The PDF file
 * @returns Promise<PDFPage[]> - Array of page information
 */
export async function loadPDFPages(file: File): Promise<PDFPage[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  const pages = pdfDoc.getPages();
  
  return pages.map((page, index) => {
    const { width, height } = page.getSize();
    const rotation = page.getRotation().angle;
    
    return {
      index,
      pageNumber: index + 1,
      rotation: rotation % 360,
      deleted: false,
      width,
      height,
    };
  });
}

/**
 * Reconstructs the PDF based on page states
 * @param file - Original PDF file
 * @param pages - Array of page states (with rotation and deleted flags)
 * @returns Promise<Blob> - The modified PDF
 */
export async function reconstructPDF(
  file: File,
  pages: PDFPage[]
): Promise<Blob> {
  // Read the original PDF
  const arrayBuffer = await file.arrayBuffer();
  const sourcePdf = await PDFDocument.load(arrayBuffer);
  
  // Create a new PDF document
  const newPdf = await PDFDocument.create();
  
  // Get pages that are not deleted
  const validPages = pages.filter(p => !p.deleted);
  
  // Get indices of valid pages
  const pageIndices = validPages.map(p => p.index);
  
  // Copy the pages
  const copiedPages = await newPdf.copyPages(sourcePdf, pageIndices);
  
  // Add pages with rotation
  for (let i = 0; i < copiedPages.length; i++) {
    const page = copiedPages[i];
    const originalPage = validPages[i];
    
    // Add the page
    newPdf.addPage(page);
    
    // Apply rotation if different from original
    const newPage = newPdf.getPages()[i];
    const currentRotation = newPage.getRotation().angle;
    const targetRotation = originalPage.rotation;
    
    if (currentRotation !== targetRotation) {
      newPage.setRotation(degrees(targetRotation));
    }
  }
  
  // Save the result
  const pdfBytes = await newPdf.save();
  
  return new Blob([pdfBytes], { type: "application/pdf" });
}

/**
 * Generates a filename for the organized PDF
 */
export function generateOrganizedFileName(originalFileName: string): string {
  const baseName = originalFileName.replace(/\.pdf$/i, "");
  return `${baseName}_organized.pdf`;
}

/**
 * Reorder pages by drag and drop
 * @param pages - Array of pages
 * @param fromIndex - Source index
 * @param toIndex - Destination index
 * @returns New array with reordered pages
 */
export function reorderPages(
  pages: PDFPage[],
  fromIndex: number,
  toIndex: number
): PDFPage[] {
  const result = [...pages];
  const [removed] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, removed);
  
  // Update page numbers after reorder
  return result.map((page, index) => ({
    ...page,
    pageNumber: index + 1,
  }));
}
