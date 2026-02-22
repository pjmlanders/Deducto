import { useState, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useUploadReceipt, useCaptureReceipt, useProcessReceipt } from '@/hooks/useReceipts';
import { useProjects } from '@/hooks/useProjects';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Camera, Upload, Loader2, FileText, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface UploadResult {
  fileName: string;
  status: 'uploading' | 'processing' | 'done' | 'error';
  receiptId?: string;
  error?: string;
}

export function ReceiptCapture() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get('projectId');
  const { data: projects } = useProjects();
  const projectName = projectId ? projects?.data?.find((p) => p.id === projectId)?.name : null;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [mode, setMode] = useState<'select' | 'camera' | 'preview' | 'batch'>('select');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [batchUploads, setBatchUploads] = useState<UploadResult[]>([]);

  const pq = projectId ? `?projectId=${projectId}` : '';

  const uploadReceipt = useUploadReceipt();
  const captureReceipt = useCaptureReceipt();
  const processReceipt = useProcessReceipt();
  const queryClient = useQueryClient();

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
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setCapturedImage(dataUrl);
      setMode('preview');
      stopCamera();
    }
  }, [stopCamera]);

  // Batch upload — process multiple files
  const handleBatchUpload = async (files: File[]) => {
    const validFiles = files.filter((f) =>
      ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'].includes(f.type)
    );

    if (validFiles.length === 0) {
      toast.error('No valid receipt files found. Accepted: JPEG, PNG, WebP, HEIC, PDF');
      return;
    }

    // For single file, go straight to review
    if (validFiles.length === 1) {
      try {
        const receipt = await uploadReceipt.mutateAsync(validFiles[0]);
        await processReceipt.mutateAsync(receipt.id);
        navigate(`/receipts/${receipt.id}/review${pq}`);
      } catch {
        toast.error('Failed to upload receipt. Please try again.');
      }
      return;
    }

    // Multiple files — show batch progress
    setMode('batch');
    const results: UploadResult[] = validFiles.map((f) => ({
      fileName: f.name,
      status: 'uploading' as const,
    }));
    setBatchUploads([...results]);

    for (let i = 0; i < validFiles.length; i++) {
      try {
        results[i].status = 'uploading';
        setBatchUploads([...results]);

        const receipt = await uploadReceipt.mutateAsync(validFiles[i]);
        results[i].receiptId = receipt.id;
        results[i].status = 'processing';
        setBatchUploads([...results]);

        await processReceipt.mutateAsync(receipt.id);
        results[i].status = 'done';
        setBatchUploads([...results]);
      } catch {
        results[i].status = 'error';
        results[i].error = 'Upload failed';
        setBatchUploads([...results]);
      }
    }

    queryClient.invalidateQueries({ queryKey: ['receipts', 'pending'] });
  };

  const handleCapturedSubmit = async () => {
    if (!capturedImage) return;

    try {
      const receipt = await captureReceipt.mutateAsync({ image: capturedImage });
      await processReceipt.mutateAsync(receipt.id);
      navigate(`/receipts/${receipt.id}/review${pq}`);
    } catch {
      toast.error('Failed to process receipt. Please try again.');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleBatchUpload(files);
    }
  };

  const isProcessing = uploadReceipt.isPending || captureReceipt.isPending || processReceipt.isPending;
  const batchDone = batchUploads.length > 0 && batchUploads.every((u) => u.status === 'done' || u.status === 'error');
  const batchSuccessCount = batchUploads.filter((u) => u.status === 'done').length;

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight text-center">Upload Receipts</h1>
      {projectName && (
        <p className="text-sm text-muted-foreground text-center">
          For project: <span className="font-medium text-foreground">{projectName}</span>
        </p>
      )}

      {mode === 'select' && (
        <div className="space-y-4">
          {/* Drag and drop zone */}
          <Card
            className={`border-2 border-dashed transition-colors cursor-pointer ${
              dragOver
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-primary/50'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <CardContent className="flex flex-col items-center py-10">
              <Upload className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">Drop files here or click to browse</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Upload one or multiple receipts (JPEG, PNG, PDF)
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
              if (files.length > 0) {
                handleBatchUpload(files);
              }
              e.target.value = '';
            }}
          />

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">or</span>
            </div>
          </div>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={startCamera}>
            <CardContent className="flex items-center gap-4 py-4">
              <Camera className="h-8 w-8 text-primary" />
              <div>
                <h3 className="text-sm font-semibold">Take Photo</h3>
                <p className="text-xs text-muted-foreground">Use your camera to scan a receipt</p>
              </div>
            </CardContent>
          </Card>

          {isProcessing && (
            <div className="flex items-center justify-center gap-2 py-4">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Processing receipt...</span>
            </div>
          )}
        </div>
      )}

      {mode === 'batch' && (
        <div className="space-y-4">
          <Card>
            <CardContent className="py-4 space-y-3">
              {batchUploads.map((upload, i) => (
                <div key={i} className="flex items-center gap-3">
                  {upload.status === 'done' ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                  ) : upload.status === 'error' ? (
                    <span className="h-5 w-5 text-red-600 shrink-0 text-center font-bold">!</span>
                  ) : (
                    <Loader2 className="h-5 w-5 animate-spin text-primary shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{upload.fileName}</p>
                    <p className="text-xs text-muted-foreground">
                      {upload.status === 'uploading' && 'Uploading...'}
                      {upload.status === 'processing' && 'AI processing...'}
                      {upload.status === 'done' && 'Ready for review'}
                      {upload.status === 'error' && (upload.error || 'Failed')}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {batchDone && (
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => { setBatchUploads([]); setMode('select'); }}>
                Upload More
              </Button>
              <Button className="flex-1" onClick={() => navigate(`/receipts${pq}`)}>
                Review {batchSuccessCount} Receipt{batchSuccessCount !== 1 ? 's' : ''}
              </Button>
            </div>
          )}
        </div>
      )}

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
              <Camera className="h-4 w-4 mr-2" />
              Capture
            </Button>
          </div>
        </div>
      )}

      {mode === 'preview' && capturedImage && (
        <div className="space-y-4">
          <div className="rounded-lg overflow-hidden">
            <img src={capturedImage} alt="Captured receipt" className="w-full" />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => { setCapturedImage(null); setMode('select'); }}>
              Retake
            </Button>
            <Button className="flex-1" onClick={handleCapturedSubmit} disabled={isProcessing}>
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Process Receipt
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
