import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { ToolCard } from "@/components/tool-card";
import {
  Combine,
  Scissors,
  FileText,
  Image,
  FileSpreadsheet,
  RotateCw,
  Unlock,
  FileType,
  Shrink,
  Shield,
  Type,
  LayoutGrid,
  Info,
} from "lucide-react";

const tools = [
  {
    title: "Merge PDF",
    description: "Combine multiple PDF files into a single document",
    icon: Combine,
    href: "/tools/merge",
    color: "bg-blue-600",
  },
  {
    title: "Split PDF",
    description: "Separate one PDF into multiple files",
    icon: Scissors,
    href: "/tools/split",
    color: "bg-orange-600",
  },
  {
    title: "Organize PDF",
    description: "Rotate, delete, and reorder individual pages",
    icon: LayoutGrid,
    href: "/tools/organize",
    color: "bg-cyan-600",
  },
  {
    title: "PDF Metadata",
    description: "View and edit PDF document properties",
    icon: Info,
    href: "/tools/metadata",
    color: "bg-slate-600",
  },
  {
    title: "Compress PDF",
    description: "Reduce PDF file size while maintaining quality",
    icon: Shrink,
    href: "/tools/compress",
    color: "bg-red-600",
  },
  {
    title: "Protect PDF",
    description: "Add password protection and restrict permissions",
    icon: Shield,
    href: "/tools/protect",
    color: "bg-purple-600",
  },
  {
    title: "Watermark PDF",
    description: "Add text watermark to your PDF",
    icon: Type,
    href: "/tools/watermark",
    color: "bg-amber-600",
  },
  {
    title: "PDF to Word",
    description: "Convert PDF documents to editable Word files",
    icon: FileType,
    href: "/tools/pdf-to-word",
    color: "bg-sky-600",
  },
  {
    title: "Word to PDF",
    description: "Convert Word documents to PDF format",
    icon: FileText,
    href: "/tools/word-to-pdf",
    color: "bg-indigo-600",
  },
  {
    title: "PDF to Image",
    description: "Extract images from PDF or convert pages to images",
    icon: Image,
    href: "/tools/pdf-to-image",
    color: "bg-pink-600",
  },
  {
    title: "Image to PDF",
    description: "Convert images to PDF documents",
    icon: FileSpreadsheet,
    href: "/tools/image-to-pdf",
    color: "bg-violet-600",
  },
  {
    title: "Rotate PDF",
    description: "Rotate PDF pages to any angle",
    icon: RotateCw,
    href: "/tools/rotate",
    color: "bg-teal-600",
  },
  {
    title: "Unlock PDF",
    description: "Remove password protection from PDF files",
    icon: Unlock,
    href: "/tools/unlock",
    color: "bg-emerald-600",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden py-20 md:py-32">
          {/* Background Pattern */}
          <div className="absolute inset-0 -z-10">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-background to-background" />
            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.03]" />
          </div>
          
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-3xl text-center">
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
                Every tool you need to{" "}
                <span className="text-primary">work with PDFs</span>
              </h1>
              <p className="mt-6 text-lg text-muted-foreground">
                Merge, split, convert, rotate, unlock, and watermark PDFs with just a few clicks.
                Fast, secure, and completely free.
              </p>
            </div>
          </div>
        </section>

        {/* Tools Grid Section */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <h2 className="mb-8 text-2xl font-semibold text-center">
              Popular PDF Tools
            </h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {tools.map((tool, index) => (
                <div
                  key={tool.href}
                  className="animate-fade-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <ToolCard {...tool} />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="grid gap-8 md:grid-cols-3">
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <svg
                    className="h-6 w-6 text-primary"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </div>
                <h3 className="mb-2 text-lg font-semibold">Fast Processing</h3>
                <p className="text-sm text-muted-foreground">
                  Process your PDFs in seconds with our high-performance engine
                </p>
              </div>
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <svg
                    className="h-6 w-6 text-primary"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                </div>
                <h3 className="mb-2 text-lg font-semibold">Secure & Private</h3>
                <p className="text-sm text-muted-foreground">
                  Your files are automatically deleted after processing
                </p>
              </div>
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <svg
                    className="h-6 w-6 text-primary"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                </div>
                <h3 className="mb-2 text-lg font-semibold">Easy to Use</h3>
                <p className="text-sm text-muted-foreground">
                  Simple and intuitive interface for seamless experience
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
