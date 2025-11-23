'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { SessionFile } from '@/lib/types';

interface AttachmentViewerProps {
  file: SessionFile;
  isOpen: boolean;
  onClose: () => void;
}

export function AttachmentViewer({ file, isOpen, onClose }: AttachmentViewerProps) {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  const fileUrl = file.fileUrl.startsWith('http') 
    ? file.fileUrl 
    : `${apiBaseUrl}${file.fileUrl}`;

  useEffect(() => {
    if (isOpen && file.fileType.startsWith('text/')) {
      setLoading(true);
      fetch(fileUrl)
        .then(res => res.text())
        .then(text => {
          setContent(text);
          setLoading(false);
        })
        .catch(err => {
          console.error('Failed to load text file:', err);
          setError('Failed to load file content');
          setLoading(false);
        });
    }
  }, [isOpen, file, fileUrl]);

  if (!isOpen) return null;

  const isImage = file.fileType.startsWith('image/');
  const isPdf = file.fileType === 'application/pdf';
  const isText = file.fileType.startsWith('text/');

  return (
    <div 
      className="fixed inset-0 bg-slate-900/95 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200"
      onClick={onClose}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
      tabIndex={-1}
    >
      <div 
        className="relative w-full max-w-5xl h-[85vh] bg-white rounded-2xl overflow-hidden shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white">
           <div className="flex items-center gap-3">
             <div className="p-2 bg-slate-100 rounded-lg">
                {isImage && <span>🖼️</span>}
                {isPdf && <span>📄</span>}
                {isText && <span>📝</span>}
                {!isImage && !isPdf && !isText && <span>📁</span>}
             </div>
             <div>
               <h3 className="font-semibold text-slate-900">{file.filename}</h3>
               <p className="text-xs text-slate-500">{(file.fileSize / 1024).toFixed(1)} KB</p>
             </div>
           </div>
           
           <div className="flex items-center gap-2">
             <a 
               href={fileUrl} 
               download
               className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
               title="Download"
             >
               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
               </svg>
             </a>
             <button
               onClick={onClose}
               className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
             >
               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
               </svg>
             </button>
           </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto bg-slate-50 relative flex items-center justify-center">
          {isImage && (
            <div className="relative w-full h-full flex items-center justify-center p-4">
              <Image
                src={fileUrl}
                alt={file.filename}
                width={1200}
                height={800}
                className="max-w-full max-h-full object-contain drop-shadow-lg"
                unoptimized
              />
            </div>
          )}

          {isPdf && (
            <iframe 
              src={`${fileUrl}#toolbar=0`} 
              className="w-full h-full border-none" 
              title={file.filename}
            />
          )}

          {isText && (
            <div className="w-full h-full p-8 overflow-auto">
              {loading ? (
                <div className="flex items-center justify-center h-full text-slate-400">Loading text...</div>
              ) : error ? (
                <div className="flex items-center justify-center h-full text-rose-500">{error}</div>
              ) : (
                <pre className="font-mono text-sm text-slate-700 whitespace-pre-wrap max-w-3xl mx-auto bg-white p-8 rounded-xl shadow-sm border border-slate-200">
                  {content}
                </pre>
              )}
            </div>
          )}
          
          {!isImage && !isPdf && !isText && (
             <div className="text-center p-12">
               <div className="text-6xl mb-4">📦</div>
               <p className="text-slate-600 font-medium mb-2">Preview not available</p>
               <p className="text-sm text-slate-500 mb-6">This file type cannot be previewed directly.</p>
               <a 
                 href={fileUrl} 
                 download 
                 className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors inline-flex items-center gap-2"
               >
                 Download File
               </a>
             </div>
          )}
        </div>
      </div>
    </div>
  );
}

