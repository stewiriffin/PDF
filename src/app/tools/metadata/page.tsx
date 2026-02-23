"use client";

import { useState, useCallback, useEffect } from "react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { FileUploadZone } from "@/components/file-upload-zone";
import { Button } from "@/components/ui/button";
import { 
  loadPDFMetadata, 
  updatePDFMetadata, 
  generateMetadataFileName,
  PDFMetadata 
} from "@/lib/pdf-metadata";
import { ProcessedFile } from "@/types/pdf";
import { 
  Info, 
  Download, 
  CheckCircle2, 
  AlertCircle,
  FileArchive,
  Loader2,
  Save,
  Calendar,
  User,
  Tag,
  BookOpen
} from "lucide-react";
import { toast } from "sonner";

export default function MetadataPage() {
  const [file, setFile] = useState<File | null>(null);
  const [metadata, setMetadata] = useState<PDFMetadata | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "processing" | "success" | "error">("idle");
  const [processedFile, setProcessedFile] = useState<ProcessedFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Form fields
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [subject, setSubject] = useState("");
  const [keywords, setKeywords] = useState("");
  const [creator, setCreator] = useState("");

  // Load metadata when file is selected
  useEffect(() => {
    const loadMetadata = async () => {
      if (!file) {
        setMetadata(null);
        setStatus("idle");
        return;
      }

      setStatus("loading");
      try {
        const meta = await loadPDFMetadata(file);
        setMetadata(meta);
        
        // Populate form fields
        setTitle(meta.title || "");
        setAuthor(meta.author || "");
        setSubject(meta.subject || "");
        setKeywords(meta.keywords || "");
        setCreator(meta.creator || "");
        
        setStatus("ready");
      } catch (err) {
        console.error("Error loading metadata:", err);
        setError("Failed to load PDF metadata. Please try another file.");
        setStatus("error");
      }
    };

    loadMetadata();
  }, [file]);

  // Handle file selection
  const handleFileSelect = useCallback((files: File[]) => {
    if (files.length > 0) {
      setFile(files[0]);
      setProcessedFile(null);
      setError(null);
    }
  }, []);

  // Handle file removal
  const handleFileRemove = useCallback(() => {
    setFile(null);
    setMetadata(null);
    setProcessedFile(null);
    setStatus("idle");
    setError(null);
    setTitle("");
    setAuthor("");
    setSubject("");
    setKeywords("");
    setCreator("");
  }, []);

  // Handle save
  const handleSave = useCallback(async () => {
    if (!file) return;

    setStatus("processing");
    setError(null);

    try {
      const newMetadata: Partial<PDFMetadata> = {
        title,
        author,
        subject,
        keywords,
        creator,
      };

      const blob = await updatePDFMetadata(file, newMetadata);
      const url = URL.createObjectURL(blob);
      const filename = generateMetadataFileName(file.name);

      setProcessedFile({
        name: filename,
        blob,
        url,
      });
      setStatus("success");

      toast.success("Metadata updated successfully!", {
        description: "PDF properties have been saved",
        icon: <CheckCircle2 className="h-4 w-4 text-green-500" />,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      setStatus("error");

      toast.error("Save failed", {
        description: errorMessage,
        icon: <AlertCircle className="h-4 w-4 text-red-500" />,
      });
    }
  }, [file, title, author, subject, keywords, creator]);

  // Handle download
  const handleDownload = useCallback(() => {
    if (!processedFile) return;
    
    const link = document.createElement("a");
    link.href = processedFile.url;
    link.download = processedFile.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [processedFile]);

  // Handle reset
  const handleReset = useCallback(() => {
    handleFileRemove();
  }, [handleFileRemove]);

  // Format date for display
  const formatDate = (date: Date | null) => {
    if (!date) return "Not set";
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-600/10 mb-4">
            <Info className="w-8 h-8 text-slate-600" />
          </div>
          <h1 className="text-3xl font-bold mb-2">PDF Metadata</h1>
          <p className="text-muted-foreground">
            View and edit PDF document properties
          </p>
        </div>

        {/* File upload */}
        {!file && status !== "ready" && (
          <div className="mb-6">
            <FileUploadZone
              onFileSelect={handleFileSelect}
              accept={{ "application/pdf": [".pdf"] }}
              maxFiles={1}
              disabled={status === "loading"}
            />
          </div>
        )}

        {/* Selected file info */}
        {file && (
          <div className="mb-4 p-3 bg-muted/50 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileArchive className="w-6 h-6 text-slate-600" />
              <div>
                <p className="font-medium text-sm">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleFileRemove}
              disabled={status === "processing"}
            >
              Change File
            </Button>
          </div>
        )}

        {/* Loading state */}
        {status === "loading" && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-slate-600 mb-4" />
            <p className="text-muted-foreground">Loading PDF metadata...</p>
          </div>
        )}

        {/* Metadata form */}
        {status === "ready" && metadata && (
          <div className="space-y-6">
            {/* Read-only info */}
            <div className="p-6 bg-card rounded-lg border">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                Document Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Producer</p>
                  <p className="font-medium">{metadata.producer || "Unknown"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Creation Date</p>
                  <p className="font-medium flex items-center gap-2">
                    <Calendar className="w-3 h-3" />
                    {formatDate(metadata.creationDate)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Modification Date</p>
                  <p className="font-medium flex items-center gap-2">
                    <Calendar className="w-3 h-3" />
                    {formatDate(metadata.modificationDate)}
                  </p>
                </div>
              </div>
            </div>

            {/* Editable fields */}
            <div className="p-6 bg-card rounded-lg border">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Save className="w-4 h-4" />
                Edit Properties
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Document title"
                    className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Author
                  </label>
                  <input
                    type="text"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    placeholder="Author name"
                    className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Document subject"
                    className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 flex items-center gap-2">
                    <Tag className="w-4 h-4" />
                    Keywords
                  </label>
                  <input
                    type="text"
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                    placeholder="keyword1, keyword2, keyword3"
                    className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Separate keywords with commas
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Creator Application
                  </label>
                  <input
                    type="text"
                    value={creator}
                    onChange={(e) => setCreator(e.target.value)}
                    placeholder="Application that created this PDF"
                    className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>
            </div>

            {/* Save button */}
            <div className="flex justify-center">
              <Button
                onClick={handleSave}
                disabled={status === "processing"}
                size="lg"
                className="min-w-[200px]"
              >
                {status === "processing" ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Metadata
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Error message */}
        {error && status === "error" && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Success result */}
        {processedFile && status === "success" && (
          <div className="mb-6 p-6 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
                <div>
                  <h3 className="font-medium text-green-800">Metadata Saved!</h3>
                  <p className="text-sm text-green-600">
                    {processedFile.name}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button onClick={handleDownload} className="flex-1">
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
              <Button variant="outline" onClick={handleReset}>
                Edit Another
              </Button>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
