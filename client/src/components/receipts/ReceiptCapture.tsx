import { useState, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useUploadReceipt, useCaptureReceipt, useProcessReceipt, useAcceptReceipt } from '@/hooks/useReceipts';
import { useProjects } from '@/hooks/useProjects';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Camera, Upload, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { receiptsApi } from '@/services/api';
import { formatDateInput } from '@/lib/utils';
import type { Receipt } from '@/types';

interface BatchResult {
  fileName: string;
  status: 'uploading' | 'analyzing' | 'creating' | 'done' | 'error';
  error?: string;
}

// Poll until receipt processing finishes (max 60s)
async function pollReceiptStatus(receiptId: string): Promise<Receipt> {
  for (let i = 0; i < 30; i++) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const receipt = await receiptsApi.getStatus(receiptId);
    if (receipt.processingStatus !== 'processing' && receipt.processingStatus !== 'pending') {
      return receipt;
    }
  }
  throw new Error('Processing timed out');
}

function buildExpenseData(receipt: Receipt, projectId: string) {
  let description = '';
  if (receipt.extractedItems) {
    try {
      const items = JSON.parse(receipt.extractedItems);
      description = items.map((i: { description?: string }) => i.description).filter(Boolean).join(', ');
    } catch {
      description = receipt.extractedItems;
    }
  }
  return {
    projectId,
    vendor: receipt.extractedVendor || 'Unknown Vendor',
    description: description || receipt.extractedVendor || 'Receipt scan',
    amount: receipt.extractedAmount ? Number(receipt.extractedAmount) : 0,
    date: receipt.extractedDate
      ? formatDateInput(receipt.extractedDate)
      : formatDateInput(new Date()),
  };
}

export function ReceiptCapture() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlProjectId = searchParams.get('projectId');
  const { data: projects } = useProjects();
  const projectName = urlProjectId
    ? projects?.data?.find((p) => p.id === urlProjectId)?.name
    : null;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [mode, setMode] = useState<'select' | 'camera' | 'preview' | 'batch' | 'working'>('select');
  const [workingStep, setWorkingStep] = useState('');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [batchResults, setBatchResults] = useState<BatchResult[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState(urlProjectId || '');

  const uploadReceipt = useUploadReceipt();
  const captureReceipt = useCaptureReceipt();
  const processReceipt = useProcessReceipt();
  const acceptReceipt = useAcceptReceipt();

  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 2560 } },
      });
      setStream(mediaStream);
      setMode('camera');
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.play();
        }
      }, 100);
    } catch {
      toast.error('Unable to access camera. Please use the file upload option.');
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  }, [stream]);

  const takePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      setCapturedImage(canvas.toDataURL('image/jpeg', 0.85));
      setMode('preview');
      stopCamera();
    }
  }, [stopCamera]);

  const doSingleFile = async (file: File) => {
    if (!selectedProjectId) {
      toast.error('Please select a project first');
      return;
    }
    setMode('working');
    try {
      setWorkingStep('Uploading receipt...');
      const receipt = await uploadReceipt.mutateAsync(file);

      setWorkingStep('Starting AI analysis...');
      await processReceipt.mutateAsync(receipt.id);

      setWorkingStep('Analyzing receipt with AI...');
      const processed = await pollReceiptStatus(receipt.id);

      setWorkingStep('Creating expense...');
      await acceptReceipt.mutateAsync({
        receiptId: processed.id,
        ...buildExpenseData(processed, selectedProjectId),
      });

      navigate(urlProjectId ? `/projects/${urlProjectId}` : '/expenses');
    } catch {
      toast.error('Failed to process receipt. Please try again.');
      setMode('select');
    }
  };

  const handleCapturedSubmit = async () => {
    if (!capturedImage || !selectedProjectId) return;
    setMode('working');
    try {
      setWorkingStep('Uploading photo...');
      const receipt = await captureReceipt.mutateAsync({ image: capturedImage });

      setWorkingStep('Starting AI analysis...');
      await processReceipt.mutateAsync(receipt.id);

      setWorkingStep('Analyzing receipt with AI...');
      const processed = await pollReceiptStatus(receipt.id);

      setWorkingStep('Creating expense...');
      await acceptReceipt.mutateAsync({
        receiptId: processed.id,
        ...buildExpenseData(processed, selectedProjectId),
      });

      navigate(urlProjectId ? `/projects/${urlProjectId}` : '/expenses');
    } catch {
      toast.error('Failed to process receipt. Please try again.');
      setCapturedImage(null);
      setMode('select');
    }
  };

  const handleBatchUpload = async (files: File[]) => {
    if (!selectedProjectId) {
      toast.error('Please select a project first');
      return;
    }
    const validFiles = files.filter((f) =>
      ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'].includes(f.type)
    );
    if (validFiles.length === 0) {
      toast.error('No valid receipt files found. Accepted: JPEG, PNG, WebP, HEIC, PDF');
      return;
    }
    if (validFiles.length === 1) {
      await doSingleFile(validFiles[0]);
      return;
    }

    setMode('batch');
    const results: BatchResult[] = validFiles.map((f) => ({ fileName: f.name, status: 'uploading' }));
    setBatchResults([...results]);

    for (let i = 0; i < validFiles.length; i++) {
      try {
        results[i].status = 'uploading';
        setBatchResults([...results]);
        const receipt = await uploadReceipt.mutateAsync(validFiles[i]);

        results[i].status = 'analyzing';
        setBatchResults([...results]);
        await processReceipt.mutateAsync(receipt.id);
        const processed = await pollReceiptStatus(receipt.id);

        results[i].status = 'creating';
        setBatchResults([...results]);
        await acceptReceipt.mutateAsync({
          receiptId: processed.id,
          ...buildExpenseData(processed, selectedProjectId),
        });

        results[i].status = 'done';
        setBatchResults([...results]);
      } catch {
        results[i].status = 'error';
        results[i].error = 'Failed';
        setBatchResults([...results]);
      }
    }

    const successCount = results.filter((r) => r.status === 'done').length;
    toast.success(`Created ${successCount} expense${successCount !== 1 ? 's' : ''} from receipts`);
    navigate(urlProjectId ? `/projects/${urlProjectId}` : '/expenses');
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragOver(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setDragOver(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) handleBatchUpload(files);
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight text-center">Upload Receipts</h1>
      {projectName && (
        <p className="text-sm text-muted-foreground text-center">
          For project: <span className="font-medium text-foreground">{projectName}</span>
        </p>
      )}

      {/* Project selector — shown when not coming from a project */}
      {!urlProjectId && (mode === 'select' || mode === 'preview') && (
        <div>
          <Label>Project *</Label>
          <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a project" />
            </SelectTrigger>
            <SelectContent>
              {projects?.data?.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Select mode */}
      {mode === 'select' && (
        <div className="space-y-4">
          <Card
            className={`border-2 border-dashed transition-colors ${
              !selectedProjectId
                ? 'opacity-50 cursor-not-allowed'
                : dragOver
                ? 'border-primary bg-primary/5 cursor-pointer'
                : 'border-muted-foreground/25 hover:border-primary/50 cursor-pointer'
            }`}
            onDragOver={selectedProjectId ? handleDragOver : undefined}
            onDragLeave={selectedProjectId ? handleDragLeave : undefined}
            onDrop={selectedProjectId ? handleDrop : undefined}
            onClick={() => selectedProjectId && fileInputRef.current?.click()}
          >
            <CardContent className="flex flex-col items-center py-10">
              <Upload className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">Drop files here or click to browse</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {selectedProjectId
                  ? 'Upload one or multiple receipts (JPEG, PNG, PDF)'
                  : 'Select a project above first'}
              </p>
            </CardContent>
          </Card>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            multiple
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files || []);
              if (files.length > 0) handleBatchUpload(files);
              e.target.value = '';
            }}
          />

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">or</span>
            </div>
          </div>

          <Card
            className={`transition-shadow ${selectedProjectId ? 'cursor-pointer hover:shadow-md' : 'opacity-50 cursor-not-allowed'}`}
            onClick={() => selectedProjectId && startCamera()}
          >
            <CardContent className="flex items-center gap-4 py-4">
              <Camera className="h-8 w-8 text-primary" />
              <div>
                <h3 className="text-sm font-semibold">Take Photo</h3>
                <p className="text-xs text-muted-foreground">Use your camera to scan a receipt</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Working — single file progress */}
      {mode === 'working' && (
        <Card>
          <CardContent className="flex flex-col items-center py-16 gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm font-medium">{workingStep}</p>
          </CardContent>
        </Card>
      )}

      {/* Batch progress */}
      {mode === 'batch' && (
        <Card>
          <CardContent className="py-4 space-y-3">
            {batchResults.map((r, i) => (
              <div key={i} className="flex items-center gap-3">
                {r.status === 'done' ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                ) : r.status === 'error' ? (
                  <span className="h-5 w-5 text-red-500 shrink-0 text-center font-bold leading-5">!</span>
                ) : (
                  <Loader2 className="h-5 w-5 animate-spin text-primary shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{r.fileName}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.status === 'uploading' && 'Uploading...'}
                    {r.status === 'analyzing' && 'Analyzing with AI...'}
                    {r.status === 'creating' && 'Creating expense...'}
                    {r.status === 'done' && 'Expense created'}
                    {r.status === 'error' && (r.error || 'Failed')}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Camera */}
      {mode === 'camera' && (
        <div className="space-y-4">
          <div className="relative rounded-lg overflow-hidden bg-black aspect-[3/4]">
            <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline />
            <div className="absolute inset-0 border-2 border-white/30 m-8 rounded-lg" />
          </div>
          <canvas ref={canvasRef} className="hidden" />
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => { stopCamera(); setMode('select'); }}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={takePhoto}>
              <Camera className="h-4 w-4 mr-2" /> Capture
            </Button>
          </div>
        </div>
      )}

      {/* Preview captured photo */}
      {mode === 'preview' && capturedImage && (
        <div className="space-y-4">
          <div className="rounded-lg overflow-hidden">
            <img src={capturedImage} alt="Captured receipt" className="w-full" />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => { setCapturedImage(null); setMode('select'); }}>
              Retake
            </Button>
            <Button className="flex-1" onClick={handleCapturedSubmit} disabled={!selectedProjectId}>
              <Upload className="h-4 w-4 mr-2" /> Process Receipt
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
