import React, { useState, useEffect } from 'react';
import { 
  X, 
  Download, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Maximize2, 
  Copy,
  Eye,
  FileText,
  Image as ImageIcon,
  Video,
  FileCode,
  Loader
} from 'lucide-react';

interface FilePreviewProps {
  filePath: string;
  fileName: string;
  isOpen: boolean;
  onClose: () => void;
  onDownload: (path: string) => void;
  getFileContent: (path: string) => Promise<{ content: string | ArrayBuffer; contentType: string } | null>;
}

export const FilePreview: React.FC<FilePreviewProps> = ({
  filePath,
  fileName,
  isOpen,
  onClose,
  onDownload,
  getFileContent
}) => {
  const [content, setContent] = useState<{ content: string | ArrayBuffer; contentType: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const fileExtension = fileName.split('.').pop()?.toLowerCase();

  useEffect(() => {
    if (isOpen && filePath) {
      loadContent();
    }
    return () => {
      setContent(null);
      setError(null);
      setZoom(100);
      setRotation(0);
      setIsFullscreen(false);
    };
  }, [isOpen, filePath]);

  const loadContent = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getFileContent(filePath);
      if (result) {
        setContent(result);
      } else {
        setError('This file type cannot be previewed');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load file content');
    } finally {
      setLoading(false);
    }
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 25, 300));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 25, 25));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);
  const handleResetView = () => {
    setZoom(100);
    setRotation(0);
  };

  const copyToClipboard = async () => {
    if (content && typeof content.content === 'string') {
      try {
        await navigator.clipboard.writeText(content.content);
        // You could add a toast notification here
      } catch (err) {
        console.error('Failed to copy to clipboard:', err);
      }
    }
  };

  const getPreviewIcon = () => {
    if (content?.contentType.startsWith('image/')) return <ImageIcon size={20} />;
    if (content?.contentType.startsWith('video/')) return <Video size={20} />;
    if (content?.contentType.startsWith('text/') || fileExtension === 'md') return <FileText size={20} />;
    if (['js', 'ts', 'jsx', 'tsx', 'html', 'css', 'json'].includes(fileExtension || '')) return <FileCode size={20} />;
    return <Eye size={20} />;
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader size={40} className="animate-spin text-blue-500 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Loading preview...</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-4 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center">
              <FileText size={32} className="text-red-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Preview not available
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
            <button
              onClick={() => onDownload(filePath)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors mx-auto"
            >
              <Download size={16} />
              Download file
            </button>
          </div>
        </div>
      );
    }

    if (!content) return null;

    // Image Preview
    if (content.contentType.startsWith('image/')) {
      const imageUrl = URL.createObjectURL(new Blob([content.content as ArrayBuffer], { type: content.contentType }));
      
      return (
        <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
          <img
            src={imageUrl}
            alt={fileName}
            className="max-w-full max-h-full object-contain transition-all duration-300 shadow-lg rounded-lg"
            style={{
              transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
              transformOrigin: 'center'
            }}
            onLoad={() => URL.revokeObjectURL(imageUrl)}
          />
        </div>
      );
    }

    // Video Preview
    if (content.contentType.startsWith('video/')) {
      const videoUrl = URL.createObjectURL(new Blob([content.content as ArrayBuffer], { type: content.contentType }));
      
      return (
        <div className="flex-1 flex items-center justify-center p-4">
          <video
            src={videoUrl}
            controls
            className="max-w-full max-h-full rounded-lg shadow-lg"
            style={{
              transform: `scale(${zoom / 100})`,
              transformOrigin: 'center'
            }}
          />
        </div>
      );
    }

    // PDF Preview
    if (content.contentType === 'application/pdf') {
      const pdfUrl = URL.createObjectURL(new Blob([content.content as ArrayBuffer], { type: content.contentType }));
      
      return (
        <div className="flex-1 p-4">
          <iframe
            src={pdfUrl}
            className="w-full h-full rounded-lg border border-gray-200 dark:border-gray-700"
            title={fileName}
          />
        </div>
      );
    }

    // Text/Code Preview
    if (typeof content.content === 'string') {
      const isCode = ['js', 'ts', 'jsx', 'tsx', 'html', 'css', 'json', 'py', 'java', 'cpp'].includes(fileExtension || '');
      const isMarkdown = fileExtension === 'md';
      
      return (
        <div className="flex-1 p-6 overflow-auto">
          <div className="max-w-4xl mx-auto">
            <pre className={`whitespace-pre-wrap font-mono text-sm leading-relaxed p-6 rounded-xl ${
              isCode 
                ? 'bg-gray-900 text-gray-100 border border-gray-700' 
                : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700'
            }`}>
              <code className={isCode ? `language-${fileExtension}` : ''}>
                {content.content}
              </code>
            </pre>
          </div>
        </div>
      );
    }

    return null;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm">
      <div className={`bg-white dark:bg-gray-900 rounded-2xl shadow-2xl transition-all duration-300 ${
        isFullscreen 
          ? 'w-full h-full m-0 rounded-none' 
          : 'w-[95vw] h-[90vh] max-w-7xl m-4'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
              {getPreviewIcon()}
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-gray-100 truncate max-w-md">
                {fileName}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {content?.contentType || 'Unknown type'}
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            {/* Image Controls */}
            {content?.contentType.startsWith('image/') && (
              <>
                <button
                  onClick={handleZoomOut}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  title="Zoom out"
                >
                  <ZoomOut size={18} />
                </button>
                <span className="text-sm text-gray-600 dark:text-gray-400 min-w-[4rem] text-center">
                  {zoom}%
                </span>
                <button
                  onClick={handleZoomIn}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  title="Zoom in"
                >
                  <ZoomIn size={18} />
                </button>
                <button
                  onClick={handleRotate}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  title="Rotate"
                >
                  <RotateCw size={18} />
                </button>
                <button
                  onClick={handleResetView}
                  className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                >
                  Reset
                </button>
              </>
            )}

            {/* Text Controls */}
            {typeof content?.content === 'string' && (
              <button
                onClick={copyToClipboard}
                className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-lg transition-colors"
                title="Copy to clipboard"
              >
                <Copy size={16} />
                <span>Copy</span>
              </button>
            )}

            {/* Download */}
            <button
              onClick={() => onDownload(filePath)}
              className="flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-900/30 hover:bg-green-100 dark:hover:bg-green-900/50 text-green-700 dark:text-green-300 rounded-lg transition-colors"
              title="Download"
            >
              <Download size={16} />
              <span>Download</span>
            </button>

            {/* Fullscreen */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            >
              <Maximize2 size={18} />
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-col h-full">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};
