import { useState } from 'react';
import { useDeposits, useCreateDeposit, useDeleteDeposit } from '@/hooks/useDeposits';
import { useProjects } from '@/hooks/useProjects';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatCurrency, formatDate, formatDateInput } from '@/lib/utils';
import { Plus, PiggyBank, Trash2 } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

export function DepositList() {
  const { data: deposits, isLoading } = useDeposits();
  const { data: projects } = useProjects();
  const createDeposit = useCreateDeposit();
  const deleteDeposit = useDeleteDeposit();
  const [showCreate, setShowCreate] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [form, setForm] = useState({
    projectId: '',
    source: '',
    amount: '',
    date: formatDateInput(new Date()),
    description: '',
    notes: '',
  });

  const handleCreate = async () => {
    if (!form.projectId || !form.source || !form.amount || !form.date) return;
    await createDeposit.mutateAsync({
      projectId: form.projectId,
      source: form.source,
      amount: parseFloat(form.amount),
      date: form.date,
      description: form.description || undefined,
      notes: form.notes || undefined,
    });
    setForm({ projectId: '', source: '', amount: '', date: formatDateInput(new Date()), description: '', notes: '' });
    setShowCreate(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Deposits</h1>
          <p className="text-sm text-muted-foreground">Track income and deposits</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-2" /> Add Deposit
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse"><CardContent className="p-4"><div className="h-5 bg-muted rounded w-1/3" /></CardContent></Card>
          ))}
        </div>
      ) : deposits?.data?.length ? (
        <div className="space-y-2">
          {deposits.data.map((deposit) => (
            <Card key={deposit.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{deposit.source}</p>
                  {deposit.description && <p className="text-xs text-muted-foreground">{deposit.description}</p>}
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">{formatDate(deposit.date)}</span>
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: deposit.project.color }} />
                    <span className="text-xs text-muted-foreground">{deposit.project.name}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-green-600">{formatCurrency(deposit.amount)}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => setDeleteId(deposit.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <PiggyBank className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No deposits yet</h3>
            <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-2" /> Add Deposit</Button>
          </CardContent>
        </Card>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Deposit</DialogTitle>
            <DialogDescription>Record income or a deposit.</DialogDescription>
          </DialogHeader>
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
                <Label>Source *</Label>
                <Input value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} placeholder="Client, employer, etc." />
              </div>
              <div>
                <Label>Amount *</Label>
                <Input type="number" step="0.01" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0.00" />
              </div>
            </div>
            <div>
              <Label>Date *</Label>
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div>
              <Label>Description</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional description" />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!form.projectId || !form.source || !form.amount || createDeposit.isPending}>
              {createDeposit.isPending ? 'Adding...' : 'Add Deposit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete deposit?"
        description="This will permanently delete this deposit record. This action cannot be undone."
        onConfirm={() => { deleteDeposit.mutate(deleteId!); setDeleteId(null); }}
        isPending={deleteDeposit.isPending}
      />
    </div>
  );
}
