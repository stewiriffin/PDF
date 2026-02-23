import { PDFDocument } from "pdf-lib";

/**
 * PDF Metadata information
 */
export interface PDFMetadata {
  title: string;
  author: string;
  subject: string;
  keywords: string;
  creator: string;
  producer: string;
  creationDate: Date | null;
  modificationDate: Date | null;
}

/**
 * Loads PDF metadata
 * @param file - The PDF file
 * @returns Promise<PDFMetadata>
 */
export async function loadPDFMetadata(file: File): Promise<PDFMetadata> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);

  const creationDate = pdfDoc.getCreationDate();
  const modDate = pdfDoc.getModificationDate();

  return {
    title: pdfDoc.getTitle() || "",
    author: pdfDoc.getAuthor() || "",
    subject: pdfDoc.getSubject() || "",
    keywords: pdfDoc.getKeywords() || "",
    creator: pdfDoc.getCreator() || "",
    producer: pdfDoc.getProducer() || "",
    creationDate: creationDate || null,
    modificationDate: modDate || null,
  };
}

/**
 * Updates PDF metadata
 * @param file - The PDF file
 * @param metadata - New metadata values
 * @returns Promise<Blob>
 */
export async function updatePDFMetadata(
  file: File,
  metadata: Partial<PDFMetadata>
): Promise<Blob> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);

  // Update metadata fields
  if (metadata.title !== undefined) {
    pdfDoc.setTitle(metadata.title);
  }
  if (metadata.author !== undefined) {
    pdfDoc.setAuthor(metadata.author);
  }
  if (metadata.subject !== undefined) {
    pdfDoc.setSubject(metadata.subject);
  }
  if (metadata.keywords !== undefined) {
    pdfDoc.setKeywords(metadata.keywords.split(",").map(k => k.trim()));
  }
  if (metadata.creator !== undefined) {
    pdfDoc.setCreator(metadata.creator);
  }

  // Save the PDF
  const pdfBytes = await pdfDoc.save();

  return new Blob([pdfBytes], { type: "application/pdf" });
}

/**
 * Generates a filename for the metadata-updated PDF
 */
export function generateMetadataFileName(originalFileName: string): string {
  const baseName = originalFileName.replace(/\.pdf$/i, "");
  return `${baseName}_metadata.pdf`;
}
