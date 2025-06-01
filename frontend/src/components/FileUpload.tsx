import React, { useState, useRef } from 'react';
import { DocumentIcon, PhotoIcon, XMarkIcon, CloudArrowUpIcon } from '@heroicons/react/24/outline';

interface FileUploadProps {
  onFilesChange: (files: UploadedFile[]) => void;
  maxFiles?: number;
  acceptedTypes?: string[];
  maxSize?: number; // in MB
  files: UploadedFile[];
}

export interface UploadedFile {
  fileName: string;
  fileUrl: string;
  fileType: 'pdf' | 'image';
  publicId: string;
  uploadedAt: Date;
  size: number; // File size in bytes
  file?: File; // For new uploads
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onFilesChange,
  maxFiles = 5,
  acceptedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'],
  maxSize = 10, // 10MB
  files
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFiles(droppedFiles);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      handleFiles(selectedFiles);
    }
  };

  const handleFiles = async (newFiles: File[]) => {
    // Validate file count
    if (files.length + newFiles.length > maxFiles) {
      alert(`Maximum ${maxFiles} files allowed`);
      return;
    }

    // Validate file types and sizes
    const validFiles = newFiles.filter(file => {
      if (!acceptedTypes.includes(file.type)) {
        alert(`${file.name}: Invalid file type. Only images and PDF files are allowed.`);
        return false;
      }
      if (file.size > maxSize * 1024 * 1024) {
        alert(`${file.name}: File too large. Maximum size is ${maxSize}MB.`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    setUploading(true);

    try {
      // Upload files to backend
      const uploadPromises = validFiles.map(uploadFile);
      const uploadedFiles = await Promise.all(uploadPromises);

      // Add uploaded files to the list
      onFilesChange([...files, ...uploadedFiles]);
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload some files. Please try again.');
    } finally {
      setUploading(false);
    }
  };
  const uploadFile = async (file: File): Promise<UploadedFile> => {
    const formData = new FormData();
    formData.append('attachment', file);

    const response = await fetch(`${process.env.REACT_APP_API_URL}/uploads/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Failed to upload ${file.name}`);
    }

    const result = await response.json();
    return result.data.attachment;
  };

  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    onFilesChange(newFiles);
  };

  const getFileIcon = (fileType: string) => {
    return fileType === 'pdf' ? (
      <DocumentIcon className="h-8 w-8 text-red-500" />
    ) : (
      <PhotoIcon className="h-8 w-8 text-blue-500" />
    );
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          isDragging
            ? 'border-primary-500 bg-primary-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <p className="text-sm text-gray-600 mb-2">
          Drag and drop files here, or{' '}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-primary-600 hover:text-primary-500 font-medium"
          >
            browse
          </button>
        </p>
        <p className="text-xs text-gray-500">
          Support: PDF, JPEG, PNG, GIF, WebP (Max {maxSize}MB each, up to {maxFiles} files)
        </p>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Upload Progress */}
      {uploading && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-3"></div>
            <span className="text-sm text-blue-600">Uploading files...</span>
          </div>
        </div>
      )}

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Uploaded Files ({files.length}/{maxFiles})</h4>
          {files.map((file, index) => (
            <div
              key={`${file.publicId}-${index}`}
              className="flex items-center justify-between bg-gray-50 rounded-lg p-3"
            >
              <div className="flex items-center space-x-3">
                {getFileIcon(file.fileType)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {file.fileName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {file.fileType.toUpperCase()} • Uploaded {new Date(file.uploadedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {file.fileUrl && (
                  <button
                    type="button"
                    onClick={() => window.open(file.fileUrl, '_blank')}
                    className="text-xs text-primary-600 hover:text-primary-500"
                  >
                    View
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="text-red-500 hover:text-red-700"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
