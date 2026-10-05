import React, { useRef, useState } from 'react';
import { UploadCloud, FileText, X, AlertCircle, CheckCircle2 } from 'lucide-react';

interface FileUploadZoneProps {
  file: File | null;
  onFileSelect: (file: File | null) => void;
  label?: string;
  required?: boolean;
  helperText?: string;
  accept?: string;
  maxSizeMb?: number;
  error?: string | null;
}

export const FileUploadZone: React.FC<FileUploadZoneProps> = ({
  file,
  onFileSelect,
  label = 'Supporting Document / Attachment',
  required = true,
  helperText = 'Required by Internal Control: Supplier Invoice, Official Receipt, or Billing Statement',
  accept = '.pdf,.jpg,.jpeg,.png',
  maxSizeMb = 5,
  error = null,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateAndSet = (selectedFile: File) => {
    setLocalError(null);

    const maxBytes = maxSizeMb * 1024 * 1024;
    if (selectedFile.size > maxBytes) {
      setLocalError(`File size exceeds ${maxSizeMb}MB limit (${(selectedFile.size / 1024 / 1024).toFixed(1)}MB).`);
      return;
    }

    const acceptedTypes = accept.split(',').map((t) => t.trim().toLowerCase());
    const extension = '.' + selectedFile.name.split('.').pop()?.toLowerCase();
    const isMimeAccepted = acceptedTypes.some((type) => {
      if (type.startsWith('.')) return extension === type;
      return selectedFile.type.match(new RegExp(type.replace('*', '.*')));
    });

    if (!isMimeAccepted) {
      setLocalError(`Unsupported file type. Please upload a ${accept} file.`);
      return;
    }

    onFileSelect(selectedFile);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSet(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSet(e.target.files[0]);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const displayError = error || localError;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <label className="font-semibold text-slate-300 flex items-center gap-1.5">
          {label}
          {required && (
            <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-mono text-[10px] tracking-wide border border-rose-500/30">
              MANDATORY
            </span>
          )}
        </label>
        <span className="text-slate-400 text-[11px]">PDF, PNG, JPG (max {maxSizeMb}MB)</span>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleInputChange}
        className="hidden"
      />

      {!file ? (
        <div
          onClick={() => inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`cursor-pointer rounded-xl border-2 border-dashed p-4 text-center transition-all duration-200 flex flex-col items-center justify-center gap-2 ${
            isDragging
              ? 'border-indigo-500 bg-indigo-500/10'
              : displayError
              ? 'border-rose-500/50 bg-rose-500/5 hover:border-rose-400'
              : 'border-slate-700 bg-slate-800/40 hover:border-slate-500 hover:bg-slate-800/70'
          }`}
        >
          <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 group-hover:scale-110 transition-transform shadow-inner">
            <UploadCloud className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-200">
              <span className="text-indigo-400 underline decoration-indigo-400/50 underline-offset-2">
                Click to browse
              </span>{' '}
              or drag & drop supporting document
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">{helperText}</p>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/80 border border-emerald-500/40 shadow-sm">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-200 truncate">{file.name}</p>
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <span>{formatFileSize(file.size)}</span>
                <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3 h-3" /> Attached
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              onFileSelect(null);
              if (inputRef.current) inputRef.current.value = '';
            }}
            className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors ml-2"
            title="Remove attachment"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {displayError && (
        <div className="flex items-center gap-1.5 text-xs text-rose-400 pt-0.5">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{displayError}</span>
        </div>
      )}
    </div>
  );
};
