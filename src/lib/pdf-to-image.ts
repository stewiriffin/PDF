import * as pdfjs from "pdfjs-dist";
import JSZip from "jszip";

// Set the worker source
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

export interface PDFPageInfo {
  pageNumber: number;
  width: number;
  height: number;
}

export async function getPDFPageCount(file: File): Promise<number> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  return pdf.numPages;
}

export async function renderPageToImage(
  file: File,
  pageNumber: number,
  scale: number = 2
): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  
  if (pageNumber < 1 || pageNumber > pdf.numPages) {
    throw new Error("Invalid page number");
  }
  
  const page = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale });
  
  // Create canvas
  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Could not get canvas context");
  }
  
  await page.render({
    canvasContext: context,
    viewport: viewport,
  }).promise;
  
  // Convert to JPEG
  return canvas.toDataURL("image/jpeg", 0.95);
}

export async function convertPDFToImages(
  file: File,
  onProgress?: (current: number, total: number) => void
): Promise<string[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  const numPages = pdf.numPages;
  const images: string[] = [];
  
  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2 }); // High resolution
    
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Could not get canvas context");
    }
    
    await page.render({
      canvasContext: context,
      viewport: viewport,
    }).promise;
    
    images.push(canvas.toDataURL("image/jpeg", 0.95));
    
    if (onProgress) {
      onProgress(i, numPages);
    }
  }
  
  return images;
}

export async function createImagesZip(
  file: File,
  baseName: string,
  onProgress?: (current: number, total: number) => void
): Promise<Blob> {
  const images = await convertPDFToImages(file, onProgress);
  const zip = new JSZip();
  
  images.forEach((imageData, index) => {
    // Remove the data URL prefix
    const base64Data = imageData.split(",")[1];
    zip.file(`${baseName}_page_${index + 1}.jpg`, base64Data, { base64: true });
  });
  
  return zip.generateAsync({ type: "blob" });
}
