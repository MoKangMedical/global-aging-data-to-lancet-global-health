import { useState, useRef, DragEvent } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, FileText, X } from "lucide-react";
import { toast } from "sonner";

interface FileUploaderProps {
  projectId: number;
  onUploadSuccess?: () => void;
}

export default function FileUploader({ projectId, onUploadSuccess }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      validateAndSetFile(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      validateAndSetFile(file);
    }
  };

  const validateAndSetFile = (file: File) => {
    // Check file type
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (!allowedTypes.includes(file.type)) {
      toast.error("仅支持 PDF 和 Word 文档格式");
      return;
    }

    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("文件大小不能超过 10MB");
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error("请先选择文件");
      return;
    }

    setUploading(true);

    try {
      // Create FormData
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("projectId", projectId.toString());

      // Upload to server
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
        credentials: "include", // Important: include cookies for authentication
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || `上传失败: ${response.status}`);
      }

      const result = await response.json();

      toast.success("文件上传成功，正在进行PICO分析...");
      setSelectedFile(null);
      
      if (onUploadSuccess) {
        onUploadSuccess();
      }
    } catch (error) {
      console.error("Upload error:", error);
      const errorMessage = error instanceof Error ? error.message : "上传失败，请重试";
      
      // Check if it's an authentication error
      if (errorMessage.includes("Unauthorized") || errorMessage.includes("401")) {
        toast.error("请先登录后再上传文件");
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-4">
      <div
        className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
          isDragging
            ? "border-primary bg-red-50"
            : "border-gray-300 hover:border-gray-400"
        }`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600 mb-4">拖拽文件到此处或点击上传</p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx"
          onChange={handleFileSelect}
          className="hidden"
          id="file-upload"
        />
        <Button asChild variant="outline">
          <label htmlFor="file-upload" className="cursor-pointer">
            选择文件
          </label>
        </Button>
        <p className="text-sm text-gray-500 mt-2">支持 PDF 和 Word 文档，最大 10MB</p>
      </div>

      {selectedFile && (
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-gray-400" />
            <div>
              <div className="font-medium">{selectedFile.name}</div>
              <div className="text-sm text-gray-500">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleUpload}
              disabled={uploading}
              size="sm"
            >
              {uploading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {uploading ? "上传中..." : "上传"}
            </Button>
            <Button
              onClick={handleRemoveFile}
              disabled={uploading}
              variant="ghost"
              size="sm"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
