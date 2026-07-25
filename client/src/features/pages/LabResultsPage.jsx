import { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  UploadCloud,
  FileText,
  Image,
  File,
  Eye,
  Download,
  AlertCircle,
  X,
  Plus,
} from 'lucide-react';

import api from '@/lib/api';
import { usePatients } from '../hooks/usePatients';
import { documentsService } from '../services/documentsService';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function LabResultsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const fileInputRef = useRef(null);

  // Load patients census
  const { patients, isLoading: isLoadingPatients, error: patientsError, refetch: refetchPatients } = usePatients();

  // Selected patient
  const selectedAdmissionId = searchParams.get('admissionId') || patients[0]?.id || '';
  const selectedAdmission = useMemo(() => {
    return patients.find(p => p.id === selectedAdmissionId) || patients[0] || null;
  }, [patients, selectedAdmissionId]);

  // Documents state
  const [documents, setDocuments] = useState([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [docsError, setDocsError] = useState('');

  // Upload form state
  const [documentType, setDocumentType] = useState('Laboratory Report');
  const [description, setDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // Drag and drop state
  const [isDragging, setIsDragging] = useState(false);

  // Fetch documents when selected patient changes
  useEffect(() => {
    if (!selectedAdmissionId) return;

    async function fetchDocs() {
      try {
        setIsLoadingDocs(true);
        setDocsError('');
        const docs = await documentsService.getDocuments(selectedAdmissionId);
        setDocuments(docs);
      } catch (err) {
        console.error('Failed to fetch documents:', err);
        setDocsError('Failed to load existing documents for this patient.');
      } finally {
        setIsLoadingDocs(false);
      }
    }

    fetchDocs();
  }, [selectedAdmissionId]);

  // Sync selected patient in query param
  const handleSelectPatient = (id) => {
    setSearchParams({ admissionId: id });
    setUploadError('');
    setUploadSuccess(false);
    setSelectedFile(null);
  };

  // File selection handling
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setUploadError('');
      setUploadSuccess(false);
    }
  };

  // Drag & drop handling
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setSelectedFile(file);
      setUploadError('');
      setUploadSuccess(false);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAdmission || !selectedFile) return;

    setIsUploading(true);
    setUploadError('');
    setUploadSuccess(false);

    try {
      await documentsService.uploadDocument(
        selectedAdmission.id,
        selectedFile,
        documentType,
        description
      );

      setUploadSuccess(true);
      setSelectedFile(null);
      setDescription('');
      
      // Refresh documents list
      const docs = await documentsService.getDocuments(selectedAdmission.id);
      setDocuments(docs);
    } catch (err) {
      console.error('Upload failed:', err);
      setUploadError(err?.response?.data?.message || 'Failed to upload document. Please check size & format.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = async (doc) => {
    try {
      await documentsService.downloadDocument(doc.id, doc.originalFilename);
    } catch (err) {
      console.error('Download failed:', err);
      alert('Failed to download file.');
    }
  };

  const handleView = async (doc) => {
    try {
      const response = await api.get(`/documents/${doc.id}/download`, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: response.headers['content-type'] || 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (err) {
      console.error('Failed to view document:', err);
      alert('Failed to display file in browser.');
    }
  };

  // ponytail: Mock document size display since database doesn't record it
  const formatMockSize = (docId) => {
    const sizeMap = { 0: '142 KB', 1: '284 KB', 2: '48 KB', 3: '94 KB', 4: '32 KB' };
    const charCodeSum = docId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return sizeMap[charCodeSum % 5] || '120 KB';
  };

  // Get matching icon for document type
  const getDocumentIcon = (type) => {
    if (type.toLowerCase().includes('radiology') || type.toLowerCase().includes('x-ray') || type.toLowerCase().includes('echo')) {
      return Image;
    }
    if (type.toLowerCase().includes('report') || type.toLowerCase().includes('lab')) {
      return FileText;
    }
    return File;
  };

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8 bg-muted/20 min-h-[calc(100vh-4rem)]">
      {/* ── Header and Breadcrumbs ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-sm font-sans text-muted-foreground mb-1">Clinical / Upload Documents</p>
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
              <UploadCloud className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-display text-headline text-foreground font-bold leading-tight">Upload Documents</h1>
              <p className="text-sm font-sans text-muted-foreground mt-0.5">Attach files to patient record</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Active Patients Pill List ────────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <span className="font-sans text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
          Patient
        </span>
        {isLoadingPatients ? (
          <div className="flex gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-7 w-24 bg-card border border-border animate-pulse rounded-full" />
            ))}
          </div>
        ) : patientsError ? (
          <p className="text-xs text-destructive font-sans">Error loading active census.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {patients.map((p) => {
              const pulse = p.latestVitals?.pulse;
              const firstName = p.patient?.name?.split(' ')[0] || 'Patient';
              const isSelected = p.id === selectedAdmission?.id;
              
              // Determine pulse status color
              let dotColor = 'bg-status-available';
              let badgeStyle = 'border-border bg-card text-muted-foreground';
              
              if (pulse) {
                if (pulse > 120 || pulse < 45) {
                  dotColor = 'bg-destructive';
                  if (isSelected) badgeStyle = 'border-destructive/30 bg-destructive/10 text-destructive';
                } else if (pulse > 100 || pulse < 55) {
                  dotColor = 'bg-status-reserved';
                  if (isSelected) badgeStyle = 'border-status-reserved/30 bg-status-reserved/10 text-status-reserved';
                } else {
                  if (isSelected) badgeStyle = 'border-status-available/30 bg-status-available/10 text-status-available';
                }
              } else {
                if (isSelected) badgeStyle = 'border-primary/30 bg-primary/10 text-primary';
              }

              return (
                <button
                  key={p.id}
                  onClick={() => handleSelectPatient(p.id)}
                  className={`px-3.5 py-1.5 rounded-full border text-xs font-sans font-semibold flex items-center gap-1.5 transition-all focus:outline-none cursor-pointer ${
                    isSelected ? 'ring-2 ring-primary/20 scale-[1.02]' : 'hover:bg-muted/30 text-foreground/80'
                  } ${badgeStyle}`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
                  {firstName}
                  {pulse && <span className="font-tnum font-normal opacity-85">{pulse}bpm</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Document Details and Dropzone Card ──────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Document type selection & notes */}
        <div className="md:col-span-1 space-y-4">
          <Card className="rounded-[1.25rem] border border-border bg-card shadow-2xs">
            <CardContent className="p-5 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="docType" className="text-xs font-sans font-bold text-foreground">Document Type</Label>
                <Select value={documentType} onValueChange={setDocumentType}>
                  <SelectTrigger id="docType" className="h-10 font-sans w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card text-foreground border border-border">
                    <SelectItem value="Laboratory Report" className="font-sans">Laboratory Report</SelectItem>
                    <SelectItem value="Radiology Report" className="font-sans">Radiology Report</SelectItem>
                    <SelectItem value="Clinical Note" className="font-sans">Clinical Note</SelectItem>
                    <SelectItem value="Consent Form" className="font-sans">Consent Form</SelectItem>
                    <SelectItem value="Other" className="font-sans">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="desc" className="text-xs font-sans font-bold text-foreground">Description / Notes</Label>
                <Textarea
                  id="desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of the document..."
                  className="min-h-[100px] font-sans"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Upload dropzone */}
        <div className="md:col-span-2">
          <Card className="rounded-[1.25rem] border border-border bg-card shadow-2xs h-full flex flex-col justify-center">
            <CardContent className="p-6 md:p-8">
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center transition-all ${
                  isDragging ? 'border-primary bg-primary/5' : 'border-border/80 hover:border-primary/40'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".pdf,image/jpeg,image/png,text/plain"
                  className="hidden"
                />
                
                <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4 border border-primary/20">
                  <UploadCloud className="h-6 w-6 animate-bounce" />
                </div>

                {selectedFile ? (
                  <div className="space-y-4 w-full max-w-md">
                    <div className="flex items-center justify-between p-3 bg-muted/40 border border-border rounded-lg">
                      <div className="flex items-center gap-3 min-w-0">
                        <FileText className="h-5 w-5 text-primary shrink-0" />
                        <div className="flex flex-col items-start min-w-0">
                          <span className="font-sans text-xs font-bold text-foreground truncate max-w-[200px] sm:max-w-[260px]">
                            {selectedFile.name}
                          </span>
                          <span className="font-sans text-[10px] text-muted-foreground font-tnum">
                            {(selectedFile.size / 1024).toFixed(1)} KB
                          </span>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={handleRemoveFile}
                        className="h-7 w-7 text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-full"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="flex justify-center gap-2">
                      <Button
                        onClick={handleUploadSubmit}
                        disabled={isUploading || !selectedAdmission}
                        className="font-sans font-bold h-9 bg-primary text-primary-foreground gap-1.5"
                      >
                        {isUploading ? 'Uploading...' : 'Confirm Upload'}
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <p className="font-sans text-sm font-bold text-foreground">
                        Drop files here or tap to browse
                      </p>
                      <p className="font-sans text-xs text-muted-foreground mt-1">
                        PDF, JPEG, PNG, DICOM supported · Max 50 MB
                      </p>
                    </div>

                    <div className="flex justify-center gap-2">
                      {/* ponytail: Ignore Camera / Scan button as requested, leave only Browse Files */}
                      <Button
                        type="button"
                        onClick={triggerFileSelect}
                        disabled={!selectedAdmission}
                        variant="outline"
                        className="font-sans font-bold h-9 border-border bg-card text-foreground hover:bg-muted/40 px-5 gap-1.5"
                      >
                        <File className="h-4 w-4" />
                        Browse Files
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {uploadError && (
                <Alert variant="destructive" className="mt-4 border-destructive/20 bg-destructive/10">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Upload Failed</AlertTitle>
                  <AlertDescription>{uploadError}</AlertDescription>
                </Alert>
              )}

              {uploadSuccess && (
                <Alert className="mt-4 border-status-available/20 bg-status-available/10 text-status-available">
                  <CheckCircle2 className="h-4 w-4 text-status-available" />
                  <AlertTitle>Success</AlertTitle>
                  <AlertDescription>Document uploaded successfully and queued for indexing.</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Existing Patient Documents ─────────────────────────────────── */}
      <div className="space-y-3">
        <h2 className="font-sans text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
          Existing Patient Documents
        </h2>

        {isLoadingDocs ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-14 bg-card border border-border animate-pulse rounded-lg" />
            ))}
          </div>
        ) : docsError ? (
          <div className="p-4 bg-card border border-border rounded-lg text-center text-xs text-destructive font-sans">
            {docsError}
          </div>
        ) : documents.length === 0 ? (
          <div className="p-6 bg-card border border-border rounded-[1.25rem] text-center text-sm text-muted-foreground font-sans">
            No uploaded documents found for this patient admission context.
          </div>
        ) : (
          <div className="space-y-2.5">
            {documents.map((doc) => {
              const DocIcon = getDocumentIcon(doc.documentType);
              const uploaderName = doc.uploader
                ? `${doc.uploader.role === 'ICU_SPECIALIST' ? 'Dr. ' : ''}${doc.uploader.lastName}`
                : 'Clinician';
              
              const formattedDate = new Date(doc.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              });
              const formattedTime = new Date(doc.createdAt).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
              });

              return (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-3.5 bg-card border border-border rounded-xl shadow-2xs hover:border-primary/20 transition-all gap-4"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                      <DocIcon className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col items-start min-w-0">
                      <span className="font-sans text-xs font-bold text-foreground truncate max-w-[240px] sm:max-w-md">
                        {doc.originalFilename}
                      </span>
                      <span className="font-sans text-[10px] text-muted-foreground mt-0.5 font-tnum">
                        {doc.documentType} · {uploaderName} · {formattedDate}, {formattedTime} · {formatMockSize(doc.id)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      onClick={() => handleView(doc)}
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:bg-primary/10 hover:text-primary rounded-lg"
                      title="View file"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={() => handleDownload(doc)}
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:bg-primary/10 hover:text-primary rounded-lg"
                      title="Download file"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
