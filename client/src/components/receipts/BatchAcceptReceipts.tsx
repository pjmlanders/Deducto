import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAcceptBatchReceipts, useReceiptStatus } from '@/hooks/useReceipts';
import { useProjects } from '@/hooks/useProjects';
import { useCategories } from '@/hooks/useCategories';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Loader2, Check, ArrowLeft } from 'lucide-react';
import { formatDateInput } from '@/lib/utils';

export function BatchAcceptReceipts() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const idsParam = searchParams.get('ids');
  const projectId = searchParams.get('projectId') || '';
  const receiptIds = idsParam ? idsParam.split(',').filter(Boolean) : [];
  const firstReceiptId = receiptIds[0] || null;

  const { data: firstReceipt } = useReceiptStatus(firstReceiptId);
  const { data: projects } = useProjects();
  const { data: categories } = useCategories();
  const acceptBatch = useAcceptBatchReceipts();

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

  useEffect(() => {
    if (firstReceipt?.processingStatus === 'completed') {
      setForm((prev) => ({
        ...prev,
        vendor: firstReceipt.extractedVendor || prev.vendor,
        amount: firstReceipt.extractedAmount ? String(firstReceipt.extractedAmount) : prev.amount,
        date: firstReceipt.extractedDate ? formatDateInput(firstReceipt.extractedDate) : prev.date,
        description: firstReceipt.extractedItems
          ? (() => {
              try {
                const items = JSON.parse(firstReceipt.extractedItems);
                return Array.isArray(items) ? items.map((i: { description?: string }) => i.description).filter(Boolean).join(', ') : firstReceipt.extractedItems;
              } catch {
                return firstReceipt.extractedItems || '';
              }
            })()
          : prev.description,
      }));
      if (firstReceipt.extractedCategory && categories) {
        const match = categories.find(
          (c) => c.name.toLowerCase() === firstReceipt.extractedCategory!.toLowerCase()
        );
        if (match) {
          setForm((prev) => ({ ...prev, categoryId: match.id }));
        }
      }
    }
  }, [firstReceipt?.processingStatus, firstReceipt?.extractedVendor, categories]);

  useEffect(() => {
    if (projectId && !form.projectId) {
      setForm((prev) => ({ ...prev, projectId }));
    }
  }, [projectId, form.projectId]);

  const handleSubmit = async () => {
    if (receiptIds.length === 0) return;

    const expense = await acceptBatch.mutateAsync({
      receiptIds,
      projectId: form.projectId,
      vendor: form.vendor,
      description: form.description,
      amount: parseFloat(form.amount),
      date: form.date,
      categoryId: form.categoryId || undefined,
      isReimbursable: form.isReimbursable,
      isDeductible: form.isDeductible,
    });

    navigate(expense?.id ? `/expenses/${expense.id}` : projectId ? `/projects/${projectId}` : '/expenses');
  };

  const isValid = form.projectId && form.vendor && form.description && form.amount && form.date;

  if (receiptIds.length === 0) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <p className="text-muted-foreground">No receipt IDs provided. Go back and choose &quot;One expense for all&quot; after uploading.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">
          One expense for {receiptIds.length} receipt{receiptIds.length !== 1 ? 's' : ''}
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Expense details (all receipts will be attached)</CardTitle>
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
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!isValid || acceptBatch.isPending}>
              {acceptBatch.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
              ) : (
                <><Check className="h-4 w-4 mr-2" /> Create one expense with {receiptIds.length} receipt{receiptIds.length !== 1 ? 's' : ''}</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
