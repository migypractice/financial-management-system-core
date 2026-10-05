import React from 'react';
import { X, ExternalLink, FileText, Download } from 'lucide-react';

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  fileUrl: string | null;
  fileName?: string;
  mimeType?: string;
  documentType?: string;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  isOpen,
  onClose,
  title = 'Supporting Document Preview',
  fileUrl,
  fileName,
  mimeType,
  documentType,
}) => {
  if (!isOpen || !fileUrl) return null;

  const isPdf = mimeType?.includes('pdf') || fileUrl.toLowerCase().endsWith('.pdf');
  const isImage =
    mimeType?.startsWith('image/') ||
    fileUrl.toLowerCase().match(/\.(jpg|jpeg|png|webp|gif)$/i);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-100 text-sm">{title}</h3>
                {documentType && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium tracking-wide bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    {documentType}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 truncate max-w-md">{fileName || 'Attachment'}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors border border-slate-700"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open New Tab
            </a>
            <a
              href={fileUrl}
              download={fileName || 'document'}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors border border-slate-700"
            >
              <Download className="w-3.5 h-3.5" />
              Download
            </a>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Close Preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body Preview */}
        <div className="flex-1 bg-slate-950 p-4 flex items-center justify-center overflow-auto">
          {isPdf ? (
            <iframe
              src={fileUrl}
              title={fileName || 'Document Preview'}
              className="w-full h-full rounded-lg border border-slate-800 bg-white"
            />
          ) : isImage ? (
            <img
              src={fileUrl}
              alt={fileName || 'Preview'}
              className="max-w-full max-h-full object-contain rounded-lg shadow-xl border border-slate-800"
            />
          ) : (
            <div className="text-center p-8">
              <FileText className="w-16 h-16 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-300 font-medium text-sm">Preview not directly available in viewer</p>
              <p className="text-slate-500 text-xs mt-1 mb-4">You can download or view this file in an external tab.</p>
              <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-500 transition-colors"
              >
                <ExternalLink className="w-4 h-4" /> Open Attachment
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
