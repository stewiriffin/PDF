# IanPDF - Free Online PDF Tools

A high-performance, SEO-friendly web application for PDF manipulation. Similar to ILovePDF but branded as IanPDF.

## Features

- **Merge PDF** - Combine multiple PDF files into one
- **Split PDF** - Separate PDF into multiple files
- **PDF to Word** - Convert PDFs to editable Word documents
- **Word to PDF** - Convert Word documents to PDF
- **PDF to Image** - Extract pages as images
- **Image to PDF** - Convert images to PDF
- **Rotate PDF** - Rotate pages to any angle
- **Unlock PDF** - Remove password protection

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **PDF Processing**: pdf-lib
- **File Upload**: react-dropzone
- **Theme**: next-themes (dark mode support)

## Getting Started

### Prerequisites

- Node.js 18.17 or later
- npm or yarn

### Installation

1. Clone the repository:
```bash
cd ianpdf
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
npm run build
npm start
```

## Project Structure

```
ianpdf/
├── src/
│   ├── app/                 # Next.js App Router pages
│   │   ├── page.tsx        # Landing page
│   │   ├── layout.tsx      # Root layout
│   │   ├── globals.css     # Global styles
│   │   └── tools/          # Tool pages
│   │       └── merge/      # Merge PDF tool
│   ├── components/         # React components
│   │   ├── ui/             # UI components
│   │   ├── header.tsx      # Navigation header
│   │   ├── footer.tsx      # Footer
│   │   ├── file-upload-zone.tsx
│   │   ├── file-preview-list.tsx
│   │   └── tool-card.tsx
│   ├── lib/                # Utility functions
│   │   ├── utils.ts
│   │   └── pdf-merge.ts    # PDF merge logic
│   └── types/              # TypeScript types
├── public/                 # Static assets
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── next.config.js
```

## Design

- Modern, minimalist aesthetic
- Fully responsive (mobile-friendly)
- Dark mode support
- Clean grid layout for tool selection

## License

MIT License
