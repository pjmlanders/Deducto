import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { useCreateExpense, useUpdateExpense, useExpense } from '@/hooks/useExpenses';
import { useProjects } from '@/hooks/useProjects';
import { useCategories } from '@/hooks/useCategories';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Save } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useTags } from '@/hooks/useTags';
import { PAYMENT_METHODS } from '@/lib/constants';
import { formatDateInput } from '@/lib/utils';

export function ExpenseForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id;

  const { data: existingExpense } = useExpense(id);
  const { data: projects } = useProjects();
  const { data: categories } = useCategories();
  const { data: tags } = useTags();
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();

  const [form, setForm] = useState({
    projectId: searchParams.get('projectId') || '',
    vendor: '',
    description: '',
    amount: '',
    date: formatDateInput(new Date()),
    categoryId: '',
    paymentMethod: '',
    purchaser: '',
    notes: '',
    isReimbursable: false,
    isDeductible: false,
    isCapitalExpense: false,
    tagIds: [] as string[],
  });

  useEffect(() => {
    if (existingExpense && isEditing) {
      setForm({
        projectId: existingExpense.projectId,
        vendor: existingExpense.vendor,
        description: existingExpense.description,
        amount: String(existingExpense.amount),
        date: formatDateInput(existingExpense.date),
        categoryId: existingExpense.categoryId || '',
        paymentMethod: existingExpense.paymentMethod || '',
        purchaser: existingExpense.purchaser || '',
        notes: existingExpense.notes || '',
        isReimbursable: existingExpense.isReimbursable,
        isDeductible: existingExpense.isDeductible,
        isCapitalExpense: existingExpense.isCapitalExpense,
        tagIds: existingExpense.tags?.map((t) => t.tag.id) || [],
      });
    }
  }, [existingExpense, isEditing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const data = {
      projectId: form.projectId,
      vendor: form.vendor,
      description: form.description,
      amount: parseFloat(form.amount),
      date: form.date,
      categoryId: form.categoryId || undefined,
      paymentMethod: form.paymentMethod || undefined,
      purchaser: form.purchaser || undefined,
      notes: form.notes || undefined,
      isReimbursable: form.isReimbursable,
      isDeductible: form.isDeductible,
      isCapitalExpense: form.isCapitalExpense,
      tagIds: form.tagIds.length > 0 ? form.tagIds : undefined,
    };

    if (isEditing && id) {
      await updateExpense.mutateAsync({ id, ...data });
    } else {
      await createExpense.mutateAsync(data);
    }

    const projectId = searchParams.get('projectId');
    navigate(isEditing ? `/expenses/${id}` : projectId ? `/projects/${projectId}` : '/expenses');
  };

  const isValid = form.projectId && form.vendor && form.description && form.amount && form.date;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(isEditing ? `/expenses/${id}` : (searchParams.get('projectId') ? `/projects/${searchParams.get('projectId')}` : '/expenses'))}>

          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">
          {isEditing ? 'Edit Expense' : 'Add Expense'}
        </h1>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Expense Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Project */}
            <div>
              <Label htmlFor="project">Project *</Label>
              <Select value={form.projectId} onValueChange={(v) => setForm({ ...form, projectId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  {projects?.data?.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
                        {p.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Vendor + Amount */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="vendor">Vendor *</Label>
                <Input
                  id="vendor"
                  value={form.vendor}
                  onChange={(e) => setForm({ ...form, vendor: e.target.value })}
                  placeholder="Store or business name"
                />
              </div>
              <div>
                <Label htmlFor="amount">Amount *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description">Description / Items *</Label>
              <Input
                id="description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="What was purchased"
              />
            </div>

            {/* Date */}
            <div>
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>

            {/* Category */}
            <div>
              <Label htmlFor="category">Category</Label>
              <Select value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v === 'none' ? '' : v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No category</SelectItem>
                  {categories?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />
                        {c.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Payment + Purchaser */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="paymentMethod">Payment Method</Label>
                <Select value={form.paymentMethod} onValueChange={(v) => setForm({ ...form, paymentMethod: v === 'none' ? '' : v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not specified</SelectItem>
                    {PAYMENT_METHODS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="purchaser">Purchaser</Label>
                <Input
                  id="purchaser"
                  value={form.purchaser}
                  onChange={(e) => setForm({ ...form, purchaser: e.target.value })}
                  placeholder="Who made the purchase"
                />
              </div>
            </div>

            {/* Tags */}
            {tags && tags.length > 0 && (
              <div>
                <Label>Tags</Label>
                <div className="flex flex-wrap gap-2 mt-1.5">
                  {tags.map((tag) => {
                    const isSelected = form.tagIds.includes(tag.id);
                    return (
                      <Badge
                        key={tag.id}
                        variant={isSelected ? 'default' : 'outline'}
                        className="cursor-pointer select-none px-3 py-1"
                        style={isSelected ? { backgroundColor: tag.color, borderColor: tag.color } : { borderColor: tag.color, color: tag.color }}
                        onClick={() => {
                          setForm((prev) => ({
                            ...prev,
                            tagIds: isSelected
                              ? prev.tagIds.filter((id) => id !== tag.id)
                              : [...prev.tagIds, tag.id],
                          }));
                        }}
                      >
                        {tag.name}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Additional notes (optional)"
                rows={3}
              />
            </div>

            {/* Checkboxes */}
            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isReimbursable}
                  onChange={(e) => setForm({ ...form, isReimbursable: e.target.checked })}
                  className="rounded border-input"
                />
                Reimbursable
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isDeductible}
                  onChange={(e) => setForm({ ...form, isDeductible: e.target.checked })}
                  className="rounded border-input"
                />
                Tax Deductible
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isCapitalExpense}
                  onChange={(e) => setForm({ ...form, isCapitalExpense: e.target.checked })}
                  className="rounded border-input"
                />
                Capital Expenditure
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-2 mt-4">
          <Button type="button" variant="outline" onClick={() => navigate(isEditing ? `/expenses/${id}` : (searchParams.get('projectId') ? `/projects/${searchParams.get('projectId')}` : '/expenses'))}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={!isValid || createExpense.isPending || updateExpense.isPending}
          >
            <Save className="h-4 w-4 mr-2" />
            {isEditing ? 'Save Changes' : 'Add Expense'}
          </Button>
        </div>
      </form>
    </div>
  );
}
