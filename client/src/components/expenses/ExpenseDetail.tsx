import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useExpense, useDeleteExpense, useUpdateReimbursement } from '@/hooks/useExpenses';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatCurrency, formatDate, formatDateInput } from '@/lib/utils';
import { ArrowLeft, Edit, Trash2, Receipt, ExternalLink } from 'lucide-react';
import { REIMBURSEMENT_STATUSES } from '@/lib/constants';
import { receiptsApi } from '@/services/api';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

export function ExpenseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: expense, isLoading } = useExpense(id);
  const deleteExpense = useDeleteExpense();
  const updateReimbursement = useUpdateReimbursement();
  const [editingReimb, setEditingReimb] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  if (isLoading) {
    return <div className="animate-pulse space-y-4 max-w-2xl mx-auto">
      <div className="h-8 bg-muted rounded w-1/4" />
      <div className="h-64 bg-muted rounded" />
    </div>;
  }

  if (!expense) {
    return <div className="text-center py-12">
      <p className="text-muted-foreground">Expense not found</p>
      <Button asChild variant="link"><Link to="/expenses">Back to expenses</Link></Button>
    </div>;
  }

  const handleDelete = async () => {
    await deleteExpense.mutateAsync(expense.id);
    navigate('/expenses');
  };

  const reimbStatus = REIMBURSEMENT_STATUSES.find((s) => s.value === expense.reimbursementStatus);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">{expense.vendor}</h1>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link to={`/expenses/${expense.id}/edit`}>
              <Edit className="h-4 w-4 mr-2" /> Edit
            </Link>
          </Button>
          <Button variant="destructive" onClick={() => setShowDelete(true)}>
            <Trash2 className="h-4 w-4 mr-2" /> Delete
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl text-red-600">
              {formatCurrency(expense.amount)}
            </CardTitle>
            <div className="flex gap-2">
              {expense.category && (
                <Badge style={{ backgroundColor: expense.category.color, color: 'white' }}>
                  {expense.category.name}
                </Badge>
              )}
              {expense.isDeductible && (
                <Badge variant="outline" className="text-green-600 border-green-300">
                  Tax Deductible
                </Badge>
              )}
              {expense.isCapitalExpense && (
                <Badge variant="outline" className="text-blue-600 border-blue-300">
                  Capital Expenditure
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">Date</p>
              <p className="text-sm">{formatDate(expense.date)}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">Project</p>
              <Link to={`/projects/${expense.project.id}`} className="text-sm text-primary hover:underline flex items-center gap-1">
                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: expense.project.color }} />
                {expense.project.name}
              </Link>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">Description</p>
              <p className="text-sm">{expense.description}</p>
            </div>
            {expense.paymentMethod && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase">Payment Method</p>
                <p className="text-sm capitalize">{expense.paymentMethod.replaceAll('_', ' ')}</p>
              </div>
            )}
            {expense.purchaser && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase">Purchaser</p>
                <p className="text-sm">{expense.purchaser}</p>
              </div>
            )}
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">Source</p>
              <p className="text-sm capitalize">{expense.source.replaceAll('_', ' ')}</p>
            </div>
          </div>

          {/* Reimbursement */}
          {expense.isReimbursable && (
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-muted-foreground uppercase">Reimbursement</p>
                {!editingReimb && (
                  <Button variant="ghost" size="sm" onClick={() => setEditingReimb(true)}>
                    <Edit className="h-3 w-3 mr-1" /> Update
                  </Button>
                )}
              </div>

              {editingReimb ? (
                <div className="space-y-3 rounded-lg border p-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">Status</label>
                    <Select
                      defaultValue={expense.reimbursementStatus}
                      onValueChange={(status) => {
                        updateReimbursement.mutate(
                          {
                            id: expense.id,
                            reimbursementStatus: status,
                            reimbursedAmount: status === 'paid' ? Number(expense.amount) : undefined,
                            reimbursedDate: status === 'paid' ? formatDateInput(new Date()) : undefined,
                          },
                          { onSuccess: () => setEditingReimb(false) },
                        );
                      }}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {REIMBURSEMENT_STATUSES.filter((s) => s.value !== 'none').map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            <span className="flex items-center gap-2">
                              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                              {s.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setEditingReimb(false)}>Cancel</Button>
                </div>
              ) : (
                <>
                  <Badge style={{ backgroundColor: reimbStatus?.color, color: 'white' }}>
                    {reimbStatus?.label}
                  </Badge>
                  {expense.reimbursedAmount && (
                    <p className="text-sm mt-1">
                      Reimbursed: {formatCurrency(expense.reimbursedAmount)}
                      {expense.reimbursedDate && ` on ${formatDate(expense.reimbursedDate)}`}
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {/* Tags */}
          {expense.tags?.length > 0 && (
            <div className="border-t pt-4">
              <p className="text-xs font-medium text-muted-foreground uppercase mb-2">Tags</p>
              <div className="flex gap-1 flex-wrap">
                {expense.tags.map(({ tag }) => (
                  <Badge key={tag.id} variant="secondary" style={{ borderColor: tag.color }}>
                    {tag.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {expense.notes && (
            <div className="border-t pt-4">
              <p className="text-xs font-medium text-muted-foreground uppercase mb-2">Notes</p>
              <p className="text-sm whitespace-pre-wrap">{expense.notes}</p>
            </div>
          )}

          {/* Receipt */}
          {expense.receipt && (
            <div className="border-t pt-4">
              <p className="text-xs font-medium text-muted-foreground uppercase mb-2">Receipt</p>
              <a
                href={receiptsApi.getFileUrl(expense.receipt.id)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                <Receipt className="h-4 w-4" />
                View Receipt
                <ExternalLink className="h-3 w-3" />
              </a>
              {expense.confidence != null && (
                <p className="text-xs text-muted-foreground mt-1">
                  AI Confidence: {(expense.confidence * 100).toFixed(0)}%
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        title="Delete expense?"
        description="This will permanently delete this expense. This action cannot be undone."
        onConfirm={handleDelete}
        isPending={deleteExpense.isPending}
      />
    </div>
  );
}
