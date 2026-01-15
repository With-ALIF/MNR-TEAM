import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Eye, Download, FileText, Image, FileArchive, FileVideo, File } from "lucide-react";

interface FilePreviewProps {
  url: string;
  fileName?: string;
  linkType?: string;
}

export function FilePreview({ url, fileName, linkType }: FilePreviewProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Determine file type from URL or linkType
  const getFileType = (): "pdf" | "image" | "video" | "document" | "other" => {
    const lowerUrl = url.toLowerCase();
    
    if (lowerUrl.includes(".pdf")) return "pdf";
    if (lowerUrl.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?|$)/i)) return "image";
    if (lowerUrl.match(/\.(mp4|mov|avi|webm|mkv)(\?|$)/i)) return "video";
    if (lowerUrl.match(/\.(doc|docx|ppt|pptx|xls|xlsx)(\?|$)/i)) return "document";
    
    return "other";
  };

  const fileType = getFileType();

  const getFileIcon = () => {
    switch (fileType) {
      case "pdf":
        return <FileText className="h-5 w-5" />;
      case "image":
        return <Image className="h-5 w-5" />;
      case "video":
        return <FileVideo className="h-5 w-5" />;
      case "document":
        return <FileArchive className="h-5 w-5" />;
      default:
        return <File className="h-5 w-5" />;
    }
  };

  const renderPreview = () => {
    switch (fileType) {
      case "pdf":
        return (
          <iframe
            src={`${url}#toolbar=0`}
            className="w-full h-[70vh] rounded-lg border"
            title="PDF Preview"
          />
        );
      case "image":
        return (
          <div className="flex items-center justify-center bg-muted/30 rounded-lg p-4">
            <img
              src={url}
              alt={fileName || "Preview"}
              className="max-w-full max-h-[70vh] object-contain rounded-lg"
            />
          </div>
        );
      case "video":
        return (
          <video
            src={url}
            controls
            className="w-full max-h-[70vh] rounded-lg"
          >
            Your browser does not support video playback.
          </video>
        );
      case "document":
        return (
          <div className="flex flex-col items-center justify-center h-64 text-center space-y-4">
            <FileArchive className="h-16 w-16 text-muted-foreground" />
            <div>
              <p className="font-medium">Document Preview Not Available</p>
              <p className="text-sm text-muted-foreground">
                Download the file to view its contents
              </p>
            </div>
            <a href={url} download target="_blank" rel="noopener noreferrer">
              <Button>
                <Download className="mr-2 h-4 w-4" />
                Download File
              </Button>
            </a>
          </div>
        );
      default:
        return (
          <div className="flex flex-col items-center justify-center h-64 text-center space-y-4">
            <File className="h-16 w-16 text-muted-foreground" />
            <div>
              <p className="font-medium">Preview Not Available</p>
              <p className="text-sm text-muted-foreground">
                This file type cannot be previewed
              </p>
            </div>
            <a href={url} download target="_blank" rel="noopener noreferrer">
              <Button>
                <Download className="mr-2 h-4 w-4" />
                Download File
              </Button>
            </a>
          </div>
        );
    }
  };

  // If it's an external link (not a file upload), just show external link
  if (linkType && linkType !== "file_upload") {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer">
        <Button variant="ghost" size="sm">
          {getFileIcon()}
        </Button>
      </a>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1">
          <Eye className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getFileIcon()}
            <span className="truncate">{fileName || "File Preview"}</span>
          </DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          {renderPreview()}
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <a href={url} download target="_blank" rel="noopener noreferrer">
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
          </a>
          <a href={url} target="_blank" rel="noopener noreferrer">
            <Button>
              Open in New Tab
            </Button>
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
}
