import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useReceiptStatus, useAcceptReceipt, useProcessReceipt } from '@/hooks/useReceipts';
import { useProjects } from '@/hooks/useProjects';
import { useCategories } from '@/hooks/useCategories';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Check, AlertTriangle, ArrowLeft } from 'lucide-react';
import { receiptsApi } from '@/services/api';
import { formatDateInput } from '@/lib/utils';

export function ReceiptProcessing() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get('projectId');
  const { data: receipt, isLoading, refetch } = useReceiptStatus(id || null);
  const { data: projects } = useProjects();
  const { data: categories } = useCategories();
  const acceptReceipt = useAcceptReceipt();
  const processReceipt = useProcessReceipt();

  const [form, setForm] = useState({
    projectId: projectId || '',
    vendor: '',
    description: '',
    amount: '',
    date: formatDateInput(new Date()),
    categoryId: '',
    isReimbursable: false,
    isDeductible: false,
  });

  // Populate form when AI results arrive
  useEffect(() => {
    if (receipt?.processingStatus === 'completed') {
      setForm((prev) => ({
        ...prev,
        vendor: receipt.extractedVendor || prev.vendor,
        amount: receipt.extractedAmount ? String(receipt.extractedAmount) : prev.amount,
        date: receipt.extractedDate ? formatDateInput(receipt.extractedDate) : prev.date,
        description: receipt.extractedItems
          ? (() => {
              try {
                const items = JSON.parse(receipt.extractedItems);
                return items.map((i: any) => i.description).join(', ');
              } catch {
                return receipt.extractedItems || '';
              }
            })()
          : prev.description,
      }));

      // Match extracted category to user's categories
      if (receipt.extractedCategory && categories) {
        const match = categories.find(
          (c) => c.name.toLowerCase() === receipt.extractedCategory!.toLowerCase()
        );
        if (match) {
          setForm((prev) => ({ ...prev, categoryId: match.id }));
        }
      }
    }
  }, [receipt?.processingStatus, receipt?.extractedVendor, categories]);

  const handleAccept = async () => {
    if (!id) return;

    await acceptReceipt.mutateAsync({
      receiptId: id,
      projectId: form.projectId,
      vendor: form.vendor,
      description: form.description,
      amount: parseFloat(form.amount),
      date: form.date,
      categoryId: form.categoryId || undefined,
      isReimbursable: form.isReimbursable,
      isDeductible: form.isDeductible,
    });

    navigate(projectId ? `/projects/${projectId}` : '/expenses');
  };

  const isValid = form.projectId && form.vendor && form.description && form.amount && form.date;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p>Loading receipt...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">Review Receipt</h1>
      </div>

      {/* Receipt Image/PDF Preview */}
      {id && (
        <Card>
          <CardContent className="p-2">
            {receipt?.mimeType === 'application/pdf' ? (
              <iframe
                src={`${receiptsApi.getFileUrl(id)}#toolbar=0&navpanes=0&view=FitH`}
                className="w-full rounded border-0"
                style={{ height: '500px' }}
                title="Receipt PDF"
              />
            ) : (
              <img
                src={receiptsApi.getPreviewUrl(id)}
                alt="Receipt"
                className="w-full rounded max-h-64 object-contain bg-gray-50"
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* Processing Status */}
      {receipt?.processingStatus === 'pending' && (
        <Card>
          <CardContent className="flex items-center justify-center py-8 gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <div>
              <p className="font-medium">Queued for processing</p>
              <p className="text-sm text-muted-foreground">AI analysis will begin shortly</p>
            </div>
          </CardContent>
        </Card>
      )}

      {receipt?.processingStatus === 'processing' && (
        <Card>
          <CardContent className="flex items-center justify-center py-8 gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <div>
              <p className="font-medium">AI is analyzing your receipt...</p>
              <p className="text-sm text-muted-foreground">This usually takes a few seconds</p>
            </div>
          </CardContent>
        </Card>
      )}

      {receipt?.processingStatus === 'failed' && (
        <Card className="border-destructive">
          <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 py-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
              <div>
                <p className="font-medium">AI processing failed</p>
                <p className="text-sm text-muted-foreground">You can retry or enter the details manually below.</p>
              </div>
            </div>
            {id && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => processReceipt.mutate(id, { onSuccess: () => refetch() })}
                disabled={processReceipt.isPending}
              >
                {processReceipt.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Retrying...</>
                ) : (
                  'Retry AI processing'
                )}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {receipt?.processingStatus === 'completed' && (
        <Card className="border-green-300">
          <CardContent className="flex items-center gap-3 py-4">
            <Check className="h-5 w-5 text-green-600" />
            <div>
              <p className="font-medium text-green-700">AI extracted receipt data</p>
              <p className="text-sm text-muted-foreground">
                Confidence: {receipt.aiConfidence ? `${(receipt.aiConfidence * 100).toFixed(0)}%` : 'N/A'}
                {receipt.isDuplicate && (
                  <Badge variant="destructive" className="ml-2">Possible duplicate</Badge>
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Editable Form (always shown once we have status) */}
      {(receipt?.processingStatus === 'completed' || receipt?.processingStatus === 'failed') && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Confirm Expense Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Project *</Label>
              <Select value={form.projectId} onValueChange={(v) => setForm({ ...form, projectId: v })}>
                <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                <SelectContent>
                  {projects?.data?.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Vendor *</Label>
                <Input value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} />
              </div>
              <div>
                <Label>Amount *</Label>
                <Input type="number" step="0.01" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
              </div>
            </div>

            <div>
              <Label>Description *</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Date *</Label>
                <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
              <div>
                <Label>Category</Label>
                <Select value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v === 'none' ? '' : v })}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No category</SelectItem>
                    {categories?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-6">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isReimbursable}
                  onChange={(e) => setForm({ ...form, isReimbursable: e.target.checked })}
                />
                Reimbursable
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isDeductible}
                  onChange={(e) => setForm({ ...form, isDeductible: e.target.checked })}
                />
                Tax Deductible
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => navigate(projectId ? `/projects/${projectId}` : '/expenses')}>
                Skip
              </Button>
              <Button onClick={handleAccept} disabled={!isValid || acceptReceipt.isPending}>
                {acceptReceipt.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
                ) : (
                  <><Check className="h-4 w-4 mr-2" /> Save Expense</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
