import { PDFDocument } from "pdf-lib";

/**
 * Merges multiple PDF files into a single PDF document.
 * 
 * @param files - Array of File objects from browser input
 * @returns Promise<Uint8Array> - The merged PDF as a byte array
 */
export async function mergePDFs(files: File[]): Promise<Uint8Array> {
  // Create a new PDF document
  const mergedPdf = await PDFDocument.create();

  // Process each file
  for (const file of files) {
    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Load the PDF document
    const pdf = await PDFDocument.load(arrayBuffer);
    
    // Get all page indices from the source document
    const pageIndices = pdf.getPageIndices();
    
    // Copy all pages from the source document to the merged document
    const copiedPages = await mergedPdf.copyPages(pdf, pageIndices);
    
    // Add each copied page to the merged document
    for (const page of copiedPages) {
      mergedPdf.addPage(page);
    }
  }

  // Save the merged PDF as Uint8Array
  const pdfBytes: Uint8Array = await mergedPdf.save();
  
  return pdfBytes;
}

/**
 * Alternative version that returns a Blob (easier for direct download)
 */
export async function mergePDFsAsBlob(files: File[]): Promise<Blob> {
  const pdfBytes = await mergePDFs(files);
  return new Blob([pdfBytes], { type: "application/pdf" });
}

/**
 * Generates a filename for the merged PDF
 */
export function generateMergedFileName(files: File[]): string {
  if (files.length === 0) return "merged.pdf";
  
  // Use the first file name as base
  const baseName = files[0].name.replace(/\.pdf$/i, "");
  return `${baseName}_merged.pdf`;
}
