import { PDFDocument } from "pdf-lib";

export interface PageInfo {
  pageNumber: number;
  width: number;
  height: number;
}

export async function getPDFPageInfo(file: File): Promise<PageInfo[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  
  const pages: PageInfo[] = [];
  const pageCount = pdfDoc.getPageCount();
  
  for (let i = 0; i < pageCount; i++) {
    const page = pdfDoc.getPage(i);
    const { width, height } = page.getSize();
    pages.push({
      pageNumber: i + 1,
      width,
      height,
    });
  }
  
  return pages;
}

export async function splitPDF(
  file: File,
  pageRanges: { start: number; end: number }[]
): Promise<{ blob: Blob; filename: string }[]> {
  const arrayBuffer = await file.arrayBuffer();
  const sourcePdf = await PDFDocument.load(arrayBuffer);
  const results: { blob: Blob; filename: string }[] = [];
  
  const baseName = file.name.replace(/\.pdf$/i, "");
  
  for (const range of pageRanges) {
    // Create new PDF document for this range
    const newPdf = await PDFDocument.create();
    
    // Convert to 0-based indices
    const startIndex = range.start - 1;
    const endIndex = range.end - 1;
    const pageIndices: number[] = [];
    
    for (let i = startIndex; i <= endIndex && i < sourcePdf.getPageCount(); i++) {
      pageIndices.push(i);
    }
    
    if (pageIndices.length > 0) {
      const copiedPages = await newPdf.copyPages(sourcePdf, pageIndices);
      
      for (const page of copiedPages) {
        newPdf.addPage(page);
      }
      
      const pdfBytes = await newPdf.save();
      const filename = `${baseName}_pages_${range.start}-${range.end}.pdf`;
      
      results.push({
        blob: new Blob([pdfBytes], { type: "application/pdf" }),
        filename,
      });
    }
  }
  
  return results;
}

export async function extractPageAsImage(
  file: File,
  pageNumber: number
): Promise<string> {
  // For now, we'll return a placeholder - full PDF to image conversion
  // would require canvas or a server-side solution
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  
  if (pageNumber < 1 || pageNumber > pdfDoc.getPageCount()) {
    throw new Error("Invalid page number");
  }
  
  // Return page info for rendering
  const page = pdfDoc.getPage(pageNumber - 1);
  const { width, height } = page.getSize();
  
  // Return a data URL with placeholder (actual rendering would need canvas)
  return `data:image/svg+xml,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <rect width="100%" height="100%" fill="#f5f5f5"/>
      <text x="50%" y="50%" font-family="Arial" font-size="14" fill="#666" 
            text-anchor="middle" dominant-baseline="middle">
        Page ${pageNumber}
      </text>
    </svg>
  `)}`;
}
