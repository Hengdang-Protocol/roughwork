import React, { useState, useRef, useEffect } from 'react';

interface SplitProps {
  children: [React.ReactNode, React.ReactNode];
  defaultSplit?: number;
}

export const Split: React.FC<SplitProps> = ({ children, defaultSplit = 50 }) => {
  const [split, setSplit] = useState(defaultSplit);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;

      const container = containerRef.current;
      const rect = container.getBoundingClientRect();
      const percentage = ((e.clientX - rect.left) / rect.width) * 100;
      setSplit(Math.max(20, Math.min(80, percentage)));
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  return (
    <div ref={containerRef} className="flex h-full">
      <div style={{ width: `${split}%` }} className="overflow-hidden">
        {children[0]}
      </div>
      
      <div
        className="w-1 bg-gray-200 dark:bg-gray-700 cursor-col-resize hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
        onMouseDown={() => setIsDragging(true)}
      />
      
      <div style={{ width: `${100 - split}%` }} className="overflow-hidden">
        {children[1]}
      </div>
    </div>
  );
};
