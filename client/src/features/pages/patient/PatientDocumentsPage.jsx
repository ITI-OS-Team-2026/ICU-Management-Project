import { useEffect, useState, useRef, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { format } from 'date-fns';
import {
  Upload,
  FileText,
  FileImage,
  File,
  Download,
  Trash2,
  Loader2,
  AlertCircle,
  FolderOpen,
  X,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import api from '@/lib/api';
import { useAuthStore } from '../../store/authStore';

/* ================================================================
   Helpers
   ================================================================ */
function formatDocDate(value) {
  if (!value) return '—';
  try { return format(new Date(value), 'MMM d, HH:mm'); } catch { return '—'; }
}

// Map documentType string → badge color + label
const DOC_TYPE_META = {
  clinical:    { label: 'Clinical',    color: '#2563eb', bg: '#2563eb18' },
  imaging:     { label: 'Imaging',     color: '#7c3aed', bg: '#7c3aed18' },
  diagnostic:  { label: 'Diagnostic',  color: '#0891b2', bg: '#0891b218' },
  consent:     { label: 'Consent',     color: '#16a34a', bg: '#16a34a18' },
  lab:         { label: 'Lab',         color: '#ea580c', bg: '#ea580c18' },
  referral:    { label: 'Referral',    color: '#db2777', bg: '#db277718' },
  discharge:   { label: 'Discharge',   color: '#64748b', bg: '#64748b18' },
  other:       { label: 'Other',       color: '#6b7280', bg: '#6b728018' },
};

function getDocTypeMeta(type) {
  if (!type) return DOC_TYPE_META.other;
  const key = type.toLowerCase().replace(/\s+/g, '_');
  return DOC_TYPE_META[key] || { label: type, color: '#6b7280', bg: '#6b728018' };
}

// Icon based on filename extension
function DocIcon({ filename }) {
  const ext = filename?.split('.').pop()?.toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
    return <FileImage size={18} />;
  }
  if (ext === 'pdf') {
    return <FileText size={18} />;
  }
  return <File size={18} />;
}

// Icon color based on type
function getDocIconColor(type) {
  return getDocTypeMeta(type).color;
}



/* ================================================================
   Document Row
   ================================================================ */
function DocumentRow({ doc, canDelete, onDelete, onDownload, isDeleting }) {
  const meta = getDocTypeMeta(doc.documentType);
  const uploaderName = [doc.uploader?.firstName, doc.uploader?.lastName].filter(Boolean).join(' ') || 'Unknown';

  return (
    <div className="flex items-center gap-4 px-4 py-3.5 border-b border-border/60 last:border-0 hover:bg-muted/30 transition-colors group">
      {/* File icon */}
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: meta.bg, color: meta.color }}
      >
        <DocIcon filename={doc.originalFilename} />
      </div>

      {/* Name + meta */}
      <div className="flex-1 min-w-0">
        <p className="font-sans text-sm font-semibold text-foreground leading-tight truncate">
          {doc.originalFilename}
        </p>
        <p className="font-sans text-[11px] text-muted-foreground mt-0.5">
          {uploaderName} · {formatDocDate(doc.createdAt)}
        </p>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Type badge */}
        <span
          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
          style={{ color: meta.color, backgroundColor: meta.bg }}
        >
          {meta.label}
        </span>

        {/* Download */}
        <Button
          variant="ghost" size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => onDownload(doc)}
          title="Download"
        >
          <Download size={15} />
        </Button>

        {/* Delete */}
        {canDelete && (
          <Button
            variant="ghost" size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => onDelete(doc.id)}
            disabled={isDeleting}
            title="Delete"
          >
            {isDeleting
              ? <Loader2 size={14} className="animate-spin" />
              : <Trash2 size={15} />}
          </Button>
        )}
      </div>
    </div>
  );
}

/* ================================================================
   Skeleton
   ================================================================ */
function DocSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="flex items-center gap-4 px-4 py-3.5 border-b border-border/60 last:border-0">
          <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-48" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-7 w-7 rounded-md" />
        </div>
      ))}
    </div>
  );
}

/* ================================================================
   Upload Dialog
   ================================================================ */
const DOCUMENT_TYPES = [
  'Clinical', 'Imaging', 'Diagnostic', 'Consent', 'Lab', 'Referral', 'Discharge', 'Other'
];

function UploadDialog({ open, onClose, onUploaded, admissionId }) {
  const [file, setFile] = useState(null);
  const [docType, setDocType] = useState('Clinical');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const handleClose = () => {
    setFile(null); setDocType('Clinical'); setError('');
    onClose();
  };

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setError('');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) { setFile(dropped); setError(''); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) { setError('Please select a file to upload.'); return; }
    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('document_type', docType.toLowerCase());
      await api.post(`/admissions/${admissionId}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onUploaded();
      handleClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md w-full">
        <DialogHeader>
          <DialogTitle className="font-display text-lg font-bold text-foreground flex items-center gap-2">
            <Upload size={18} className="text-primary" />
            Upload Document
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Drop zone */}
          <div
            className="relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/30 px-6 py-8 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
          >
            {file ? (
              <>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <FileText size={20} />
                </div>
                <p className="font-sans text-sm font-semibold text-foreground">{file.name}</p>
                <p className="font-sans text-xs text-muted-foreground">
                  {(file.size / 1024).toFixed(0)} KB
                </p>
                <Button
                  type="button" variant="ghost" size="icon"
                  className="absolute top-2 right-2 h-6 w-6 text-muted-foreground hover:text-destructive"
                  onClick={(e) => { e.stopPropagation(); setFile(null); }}
                >
                  <X size={12} />
                </Button>
              </>
            ) : (
              <>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <Upload size={20} />
                </div>
                <div>
                  <p className="font-sans text-sm font-semibold text-foreground">Click to select or drag & drop</p>
                  <p className="font-sans text-xs text-muted-foreground mt-0.5">PDF, JPEG, PNG, TXT — max 10 MB</p>
                </div>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.txt"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* Document type */}
          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Document Type
            </Label>
            <div className="flex flex-wrap gap-2">
              {DOCUMENT_TYPES.map(type => {
                const meta = getDocTypeMeta(type);
                const isSelected = docType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setDocType(type)}
                    className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border transition-all"
                    style={{
                      color: isSelected ? '#fff' : meta.color,
                      backgroundColor: isSelected ? meta.color : meta.bg,
                      borderColor: meta.color + '40',
                    }}
                  >
                    {meta.label}
                  </button>
                );
              })}
            </div>
          </div>

          {error && (
            <Alert variant="destructive" className="py-2">
              <AlertCircle size={14} />
              <AlertDescription className="text-xs">{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end gap-3 pt-1">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isUploading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isUploading || !file} className="min-w-[110px] gap-1.5">
              {isUploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              {isUploading ? 'Uploading…' : 'Upload'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ================================================================
   Main Page
   ================================================================ */
export default function PatientDocumentsPage() {
  const { admission } = useOutletContext();
  const user = useAuthStore((s) => s.user);

  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showUpload, setShowUpload] = useState(false);
  const [filter, setFilter] = useState('all');
  const [deletingId, setDeletingId] = useState(null);

  const canDelete = user?.role === 'ICU_SPECIALIST' || user?.role === 'MEDICAL_RESIDENT';

  const fetchDocuments = useCallback(async () => {
    if (!admission?.id) return;
    try {
      setIsLoading(true);
      setError(null);
      const { data } = await api.get(`/admissions/${admission.id}/documents`);
      setDocuments(data?.data || data || []);
    } catch (err) {
      console.error('Failed to fetch documents:', err);
      setError('Failed to load documents. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [admission?.id]);

  useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

  const handleDelete = async (docId) => {
    if (deletingId) return;                      // already deleting something
    if (!window.confirm('Delete this document? This action cannot be undone.')) return;
    try {
      setDeletingId(docId);
      await api.delete(`/documents/${docId}`);
      setDocuments(prev => prev.filter(d => d.id !== docId));
    } catch (err) {
      console.error('Failed to delete document:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownload = async (doc) => {
    try {
      const response = await api.get(`/documents/${doc.id}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = doc.originalFilename;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  // Unique types for filter tabs
  const allTypes = ['all', ...new Set(documents.map(d => d.documentType?.toLowerCase()))].filter(Boolean);
  const filtered = filter === 'all' ? documents : documents.filter(d => d.documentType?.toLowerCase() === filter);

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-5 pb-8">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-display text-xl font-bold text-foreground">Patient Documents</h2>
          <p className="font-sans text-sm text-muted-foreground mt-0.5">
            {documents.length > 0 ? `${documents.length} document${documents.length !== 1 ? 's' : ''}` : 'No documents uploaded yet'}
          </p>
        </div>
        <Button
          size="sm"
          className="gap-1.5 font-sans text-xs"
          onClick={() => setShowUpload(true)}
        >
          <Upload size={14} />
          Upload
        </Button>
      </div>

      {/* ── Type Filter Tabs ────────────────────────────────────────── */}
      {documents.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {allTypes.map(type => {
            const meta = type === 'all' ? { label: 'All', color: '#64748b', bg: '#64748b15' } : getDocTypeMeta(type);
            const isActive = filter === type;
            const count = type === 'all' ? documents.length : documents.filter(d => d.documentType?.toLowerCase() === type).length;
            return (
              <button
                key={type}
                onClick={() => setFilter(type)}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all"
                style={{
                  color: isActive ? '#fff' : meta.color,
                  backgroundColor: isActive ? meta.color : meta.bg,
                  borderColor: meta.color + '40',
                }}
              >
                {meta.label}
                <span
                  className="inline-flex items-center justify-center rounded-full text-[10px] font-bold min-w-[16px] h-4 px-1"
                  style={{ backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : meta.color + '25', color: isActive ? '#fff' : meta.color }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Content ─────────────────────────────────────────────────── */}
      {isLoading ? (
        <DocSkeleton />
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <AlertCircle className="h-8 w-8 text-destructive opacity-60" />
          <p className="font-sans text-sm font-medium text-foreground">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchDocuments}>Try Again</Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center rounded-xl border border-dashed border-border bg-muted/20">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-muted text-muted-foreground/50">
            <FolderOpen size={26} />
          </div>
          <div>
            <p className="font-sans text-sm font-semibold text-foreground">
              {filter === 'all' ? 'No documents uploaded yet' : `No ${getDocTypeMeta(filter).label} documents`}
            </p>
            <p className="font-sans text-xs text-muted-foreground mt-1">
              Upload clinical reports, imaging, consent forms, and more.
            </p>
          </div>
          <Button size="sm" className="gap-1.5 font-sans text-xs mt-1" onClick={() => setShowUpload(true)}>
            <Upload size={13} /> Upload Document
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
          {filtered.map(doc => (
            <DocumentRow
              key={doc.id}
              doc={doc}
              canDelete={canDelete}
              onDelete={handleDelete}
              onDownload={handleDownload}
              isDeleting={deletingId === doc.id}
            />
          ))}
        </div>
      )}

      {/* ── Upload Dialog ────────────────────────────────────────────── */}
      <UploadDialog
        open={showUpload}
        onClose={() => setShowUpload(false)}
        onUploaded={fetchDocuments}
        admissionId={admission?.id}
      />
    </div>
  );
}
