import React, { useRef } from 'react';
import { Upload } from 'lucide-react';

interface FileUploadProps {
  currentPath: string;
  onUpload: (path: string, file: File) => Promise<void>;
}

export const FileUpload: React.FC<FileUploadProps> = ({ 
  currentPath, 
  onUpload
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    for (const file of Array.from(files)) {
      const filePath = currentPath === '/' 
        ? `/${file.name}` 
        : `${currentPath}/${file.name}`;
      
      try {
        await onUpload(filePath, file);
      } catch (error) {
        console.error('Upload failed:', error);
        alert(`Failed to upload ${file.name}`);
      }
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex gap-2 mb-6">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />
      
      <button 
        onClick={() => fileInputRef.current?.click()}
        className="btn btn-primary"
      >
        <Upload size={16} />
        Upload Files
      </button>
    </div>
  );
};
