import React, { useRef, useState, useCallback } from 'react';
import { Upload, Plus, FileText, X, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { type UploadProgress } from '../hooks/useHengdang';

interface FileUploadProps {
  currentPath: string;
  onUpload: (path: string, file: File) => Promise<void>;
  uploadProgress: UploadProgress[];
  onClearProgress: (fileName: string) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ 
  currentPath, 
  onUpload,
  uploadProgress,
  onClearProgress
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files) return;

    const uploadPromises = Array.from(files).map(async (file) => {
      const filePath = currentPath === '/' 
        ? `/${file.name}` 
        : `${currentPath}/${file.name}`;
      
      try {
        await onUpload(filePath, file);
      } catch (error) {
        console.error('Upload failed:', error);
        // Error handling is done in the hook
      }
    });

    await Promise.allSettled(uploadPromises);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [currentPath, onUpload]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    await handleFiles(event.target.files);
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === "dragenter") {
      setDragActive(true);
      setIsDragOver(true);
    } else if (e.type === "dragleave") {
      // Check if we're leaving the drop zone entirely
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX;
      const y = e.clientY;
      
      if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
        setDragActive(false);
        setIsDragOver(false);
      }
    } else if (e.type === "dragover") {
      setDragActive(true);
      setIsDragOver(true);
    }
  }, []);

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    setIsDragOver(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await handleFiles(e.dataTransfer.files);
    }
  };

  const getProgressIcon = (status: UploadProgress['status']) => {
    switch (status) {
      case 'uploading':
        return <Loader size={16} className="animate-spin text-blue-500" />;
      case 'completed':
        return <CheckCircle size={16} className="text-green-500" />;
      case 'error':
        return <AlertCircle size={16} className="text-red-500" />;
    }
  };

  const getProgressColor = (status: UploadProgress['status']) => {
    switch (status) {
      case 'uploading':
        return 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20';
      case 'completed':
        return 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20';
      case 'error':
        return 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20';
    }
  };

  return (
    <div className="mb-8 space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileSelect}
        className="hidden"
        accept="*/*"
      />
      
      {/* Upload Area */}
      <div 
        className={`relative border-2 border-dashed rounded-2xl p-8 transition-all duration-300 cursor-pointer ${
          isDragOver 
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 scale-[1.02] shadow-lg' 
            : dragActive
            ? 'border-blue-400 bg-blue-25 dark:bg-blue-900/10'
            : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-gray-50 dark:hover:bg-gray-800/50'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="text-center">
          <div className={`mx-auto w-20 h-20 rounded-2xl flex items-center justify-center mb-6 transition-all duration-300 ${
            isDragOver 
              ? 'bg-blue-100 dark:bg-blue-900/40 scale-110 shadow-lg' 
              : 'bg-gray-100 dark:bg-gray-700 group-hover:bg-gray-200 dark:group-hover:bg-gray-600'
          }`}>
            <Upload size={32} className={`transition-colors duration-300 ${
              isDragOver ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'
            }`} />
          </div>
          
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">
            {isDragOver ? 'Drop files here' : 'Upload files'}
          </h3>
          
          <p className="text-gray-600 dark:text-gray-400 mb-6 text-lg">
            {isDragOver 
              ? 'Release to upload your files' 
              : 'Drag and drop files here or click to browse'
            }
          </p>
          
          <div className="flex items-center justify-center gap-4">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105"
            >
              <Plus size={20} />
              <span>Choose Files</span>
            </button>
          </div>
          
          <div className="mt-6 flex items-center justify-center gap-6 text-sm text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <FileText size={16} />
              <span>Max file size: 100MB</span>
            </div>
            <div className="w-px h-4 bg-gray-300 dark:bg-gray-600"></div>
            <div className="flex items-center gap-2">
              <Upload size={16} />
              <span>Multiple files supported</span>
            </div>
          </div>
        </div>

        {/* Drag Overlay */}
        {isDragOver && (
          <div className="absolute inset-0 bg-blue-500/10 rounded-2xl border-2 border-blue-500 border-dashed flex items-center justify-center">
            <div className="bg-blue-500 text-white px-6 py-3 rounded-xl shadow-lg font-semibold">
              Drop files to upload
            </div>
          </div>
        )}
      </div>

      {/* Upload Progress */}
      {uploadProgress.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <Upload size={16} />
            Upload Progress ({uploadProgress.length})
          </h4>
          
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {uploadProgress.map((upload, index) => (
              <div 
                key={`${upload.fileName}-${index}`}
                className={`flex items-center gap-3 p-4 rounded-xl border transition-all duration-200 ${getProgressColor(upload.status)}`}
              >
                {/* Status Icon */}
                <div className="flex-shrink-0">
                  {getProgressIcon(upload.status)}
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
                      {upload.fileName}
                    </span>
                    <span className={`text-sm font-medium ${
                      upload.status === 'uploading' ? 'text-blue-600 dark:text-blue-400' :
                      upload.status === 'completed' ? 'text-green-600 dark:text-green-400' :
                      'text-red-600 dark:text-red-400'
                    }`}>
                      {upload.status === 'uploading' ? 'Uploading...' :
                       upload.status === 'completed' ? 'Completed' :
                       'Failed'}
                    </span>
                  </div>
                  
                  {upload.error && (
                    <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                      {upload.error}
                    </p>
                  )}
                </div>

                {/* Close Button */}
                {(upload.status === 'completed' || upload.status === 'error') && (
                  <button
                    onClick={() => onClearProgress(upload.fileName)}
                    className="flex-shrink-0 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    title="Dismiss"
                  >
                    <X size={14} className="text-gray-500 dark:text-gray-400" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
