import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useProject, useUpdateProject } from '@/hooks/useProjects';
import { useExpenses } from '@/hooks/useExpenses';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { formatCurrency, formatDate } from '@/lib/utils';
import { ArrowLeft, FileSearch, TrendingDown, TrendingUp, DollarSign, Camera, Receipt, Car, Pencil } from 'lucide-react';
import { PROJECT_COLORS } from '@/lib/constants';

export function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: project, isLoading } = useProject(id);
  const { data: expenses } = useExpenses({ projectId: id, limit: 10 });
  const updateProject = useUpdateProject();
  const [showEdit, setShowEdit] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editColor, setEditColor] = useState('#3b82f6');

  const openEdit = () => {
    if (!project) return;
    setEditName(project.name);
    setEditDescription(project.description || '');
    setEditColor(project.color);
    setShowEdit(true);
  };

  const handleEdit = async () => {
    if (!project || !editName.trim()) return;
    await updateProject.mutateAsync({ id: project.id, name: editName, description: editDescription, color: editColor });
    setShowEdit(false);
  };

  if (isLoading) {
    return <div className="animate-pulse space-y-4">
      <div className="h-8 bg-muted rounded w-1/4" />
      <div className="h-32 bg-muted rounded" />
    </div>;
  }

  if (!project) {
    return <div className="text-center py-12">
      <p className="text-muted-foreground">Project not found</p>
      <Button asChild variant="link"><Link to="/projects">Back to projects</Link></Button>
    </div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link to="/projects"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <div className="flex items-center gap-3 flex-1">
          <div className="h-4 w-4 rounded-full" style={{ backgroundColor: project.color }} />
          <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
        </div>
        <Button variant="ghost" size="icon" onClick={openEdit}>
          <Pencil className="h-4 w-4" />
        </Button>
      </div>

      {/* Entry Type Cards */}
      <div className="grid grid-cols-3 gap-3">
        <Link
          to={`/scan?projectId=${project.id}`}
          className="group flex flex-col items-center justify-center gap-2 p-5 rounded-xl border bg-card hover:bg-accent transition-colors text-center"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
            <Camera className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-sm">Scan Receipt</p>
            <p className="text-xs text-muted-foreground">Upload or photograph</p>
          </div>
        </Link>
        <Link
          to={`/expenses/new?projectId=${project.id}`}
          className="group flex flex-col items-center justify-center gap-2 p-5 rounded-xl border bg-card hover:bg-accent transition-colors text-center"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
            <Receipt className="h-5 w-5 text-blue-500" />
          </div>
          <div>
            <p className="font-semibold text-sm">Add Expense</p>
            <p className="text-xs text-muted-foreground">Manual entry</p>
          </div>
        </Link>
        <Link
          to={`/mileage?projectId=${project.id}`}
          className="group flex flex-col items-center justify-center gap-2 p-5 rounded-xl border bg-card hover:bg-accent transition-colors text-center"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10 group-hover:bg-green-500/20 transition-colors">
            <Car className="h-5 w-5 text-green-500" />
          </div>
          <div>
            <p className="font-semibold text-sm">Log Mileage</p>
            <p className="text-xs text-muted-foreground">Track trips</p>
          </div>
        </Link>
      </div>

      {project.description && (
        <p className="text-muted-foreground">{project.description}</p>
      )}

      {/* Summary Cards */}
      {project.summary && (
        <div className="grid gap-4 md:grid-cols-3">
          <Link to={`/expenses?projectId=${project.id}`} className="block">
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                <TrendingDown className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(project.summary.totalExpenses)}
                </div>
                <p className="text-xs text-muted-foreground">{project.summary.expenseCount} transactions</p>
              </CardContent>
            </Card>
          </Link>

          <Link to={`/deposits?projectId=${project.id}`} className="block">
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Deposits</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(project.summary.totalDeposits)}
                </div>
                <p className="text-xs text-muted-foreground">{project.summary.depositCount} deposits</p>
              </CardContent>
            </Card>
          </Link>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Balance</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${project.summary.netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(project.summary.netBalance)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Pending Receipts Link */}
      <Card>
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <FileSearch className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Pending Receipts</p>
              <p className="text-xs text-muted-foreground">Review scanned receipts for this project</p>
            </div>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link to={`/receipts?projectId=${project.id}`}>View</Link>
          </Button>
        </CardContent>
      </Card>

      {/* Recent Expenses */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Recent Expenses</CardTitle>
          <Button asChild variant="link" className="text-sm">
            <Link to={`/expenses?projectId=${project.id}`}>View all</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {expenses?.data?.length ? (
            <div className="space-y-2">
              {expenses.data.map((expense) => (
                <Link
                  key={expense.id}
                  to={`/expenses/${expense.id}`}
                  className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-accent transition-colors"
                >
                  <div>
                    <p className="font-medium text-sm">{expense.vendor}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(expense.date)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-sm">{formatCurrency(expense.amount)}</p>
                    {expense.category && (
                      <Badge variant="secondary" className="text-xs">
                        {expense.category.name}
                      </Badge>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-4">No expenses yet</p>
          )}
        </CardContent>
      </Card>

      {/* Edit Project Dialog */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
            <DialogDescription>Update the project name, description, or color.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="detail-edit-name">Project Name</Label>
              <Input
                id="detail-edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                autoFocus
              />
            </div>
            <div>
              <Label htmlFor="detail-edit-desc">Description (optional)</Label>
              <Textarea
                id="detail-edit-desc"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Brief description of this project"
              />
            </div>
            <div>
              <Label>Color</Label>
              <div className="flex gap-2 mt-2">
                {PROJECT_COLORS.map((c) => (
                  <button
                    key={c}
                    className={`h-8 w-8 rounded-full transition-transform ${
                      editColor === c ? 'ring-2 ring-offset-2 ring-primary scale-110' : ''
                    }`}
                    style={{ backgroundColor: c }}
                    onClick={() => setEditColor(c)}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEdit(false)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={!editName.trim() || updateProject.isPending}>
              {updateProject.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
