import { useState, useEffect } from 'react';
import { useAcceptReceipt, useProcessReceipt } from '@/hooks/useReceipts';
import { useProjects } from '@/hooks/useProjects';
import { useCategories } from '@/hooks/useCategories';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Check, ExternalLink, AlertTriangle, RefreshCw } from 'lucide-react';
import { receiptsApi } from '@/services/api';
import { formatDateInput } from '@/lib/utils';
import type { Receipt } from '@/types';

interface Props {
  receipt: Receipt;
  projectId?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReceiptAcceptModal({ receipt, projectId, open, onOpenChange }: Props) {
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

  // Re-initialize form whenever modal opens or receipt changes
  useEffect(() => {
    if (!open) return;
    setForm({
      projectId: projectId || '',
      vendor: receipt.extractedVendor || '',
      description: '',
      amount: receipt.extractedAmount ? String(receipt.extractedAmount) : '',
      date: receipt.extractedDate ? formatDateInput(receipt.extractedDate) : formatDateInput(new Date()),
      categoryId: '',
      isReimbursable: false,
      isDeductible: false,
    });
  }, [open, receipt.id]);

  // Auto-match extracted category
  useEffect(() => {
    if (receipt.extractedCategory && categories) {
      const match = categories.find(
        (c) => c.name.toLowerCase() === receipt.extractedCategory!.toLowerCase()
      );
      if (match) setForm((f) => ({ ...f, categoryId: match.id }));
    }
  }, [receipt.extractedCategory, categories]);

  const handleAccept = async () => {
    await acceptReceipt.mutateAsync({
      receiptId: receipt.id,
      projectId: form.projectId,
      vendor: form.vendor,
      description: form.description || form.vendor,
      amount: parseFloat(form.amount),
      date: form.date,
      categoryId: form.categoryId || undefined,
      isReimbursable: form.isReimbursable,
      isDeductible: form.isDeductible,
    });
    onOpenChange(false);
  };

  const isValid = form.projectId && form.vendor && form.amount && form.date;
  const isPdf = receipt.mimeType === 'application/pdf';
  const isFailed = receipt.processingStatus === 'failed';
  const isDuplicate = receipt.isDuplicate;
  const isIncomplete = receipt.processingStatus === 'completed' &&
    (!receipt.extractedVendor || !receipt.extractedAmount);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Expense</DialogTitle>
        </DialogHeader>

        {/* Attention flags */}
        {(isFailed || isDuplicate || isIncomplete) && (
          <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-3">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              {isFailed && 'AI processing failed — please fill in the details manually. '}
              {isDuplicate && 'This may be a duplicate receipt. '}
              {isIncomplete && 'Some fields could not be extracted — please fill them in.'}
            </span>
          </div>
        )}

        {/* Receipt preview */}
        <div className="rounded border overflow-hidden bg-gray-50">
          {isPdf ? (
            <a
              href={receiptsApi.getFileUrl(receipt.id)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-3 text-sm text-primary hover:underline"
            >
              <ExternalLink className="h-4 w-4" />
              View PDF receipt
            </a>
          ) : (
            <img
              src={receiptsApi.getPreviewUrl(receipt.id)}
              alt="Receipt"
              className="w-full max-h-48 object-contain"
            />
          )}
        </div>

        {/* Retry button for failed receipts */}
        {isFailed && (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => processReceipt.mutate(receipt.id)}
            disabled={processReceipt.isPending}
          >
            {processReceipt.isPending ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Retrying AI...</>
            ) : (
              <><RefreshCw className="h-4 w-4 mr-2" /> Retry AI Processing</>
            )}
          </Button>
        )}

        {/* Expense form */}
        <div className="space-y-4">
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
              <Input
                value={form.vendor}
                onChange={(e) => setForm({ ...form, vendor: e.target.value })}
                placeholder="Store or vendor name"
              />
            </div>
            <div>
              <Label>Amount *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Date *</Label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>
            <div>
              <Label>Category</Label>
              <Select
                value={form.categoryId}
                onValueChange={(v) => setForm({ ...form, categoryId: v === 'none' ? '' : v })}
              >
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
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={form.isReimbursable}
                onChange={(e) => setForm({ ...form, isReimbursable: e.target.checked })}
              />
              Reimbursable
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={form.isDeductible}
                onChange={(e) => setForm({ ...form, isDeductible: e.target.checked })}
              />
              Tax Deductible
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleAccept} disabled={!isValid || acceptReceipt.isPending}>
            {acceptReceipt.isPending ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
            ) : (
              <><Check className="h-4 w-4 mr-2" /> Save Expense</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
