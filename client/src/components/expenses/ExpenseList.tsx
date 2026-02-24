import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useExpenses, useDeleteExpense, useBulkDeleteExpenses, useBulkCategorize } from '@/hooks/useExpenses';
import { useProjects } from '@/hooks/useProjects';
import { useCategories } from '@/hooks/useCategories';
import { Card, CardContent } from '@/components/ui/card';
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
import { useTags } from '@/hooks/useTags';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Plus, Search, Receipt, Trash2, ChevronLeft, ChevronRight, Filter, CheckSquare, Square, X, AlertTriangle } from 'lucide-react';
import { REIMBURSEMENT_STATUSES } from '@/lib/constants';
import type { ExpenseFilters } from '@/types';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

export function ExpenseList() {
  const [searchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<ExpenseFilters>({
    projectId: searchParams.get('projectId') || undefined,
  });

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkCategoryId, setBulkCategoryId] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showBulkDelete, setShowBulkDelete] = useState(false);

  const { data: projects } = useProjects();
  const { data: categories } = useCategories();
  const { data: tags } = useTags();
  const deleteExpense = useDeleteExpense();
  const bulkDelete = useBulkDeleteExpenses();
  const bulkCategorize = useBulkCategorize();

  const projectList = Array.isArray(projects?.data) ? projects.data : [];
  const categoryList = Array.isArray(categories) ? categories : [];
  const tagList = Array.isArray(tags) ? tags : [];

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (!expenseList.length) return;
    if (selectedIds.size === expenseList.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(expenseList.map((e) => e.id)));
    }
  };

  const handleBulkDelete = async () => {
    await bulkDelete.mutateAsync([...selectedIds]);
    setSelectedIds(new Set());
    setShowBulkDelete(false);
  };

  const handleBulkCategorize = async () => {
    if (!bulkCategoryId) return;
    await bulkCategorize.mutateAsync({ ids: [...selectedIds], categoryId: bulkCategoryId });
    setSelectedIds(new Set());
    setBulkCategoryId('');
  };

  const activeFilters: ExpenseFilters = {
    ...filters,
    search: search || undefined,
    page,
    limit: 20,
    sort: 'date',
    order: 'desc',
  };

  const { data: expenses, isLoading } = useExpenses(activeFilters);
  const expenseList = Array.isArray(expenses?.data) ? expenses.data : [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between min-w-0">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight truncate">Expenses</h1>
          <p className="text-sm text-muted-foreground">
            {expenses?.pagination?.total || 0} total expenses
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link to="/scan">Scan</Link>
          </Button>
          <Button asChild>
            <Link to="/expenses/new">
              <Plus className="h-4 w-4 mr-2" />
              Add Expense
            </Link>
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search vendor, description, notes..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-10"
          />
        </div>
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className={showFilters ? 'bg-accent' : ''}
        >
          <Filter className="h-4 w-4 mr-2" />
          Filters
        </Button>
      </div>

      {/* Filter Bar */}
      {showFilters && (
        <Card>
          <CardContent className="p-4">
            <div className="grid gap-3 md:grid-cols-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Project</label>
                <Select
                  value={filters.projectId || 'all'}
                  onValueChange={(v) => { setFilters({ ...filters, projectId: v === 'all' ? undefined : v }); setPage(1); }}
                >
                  <SelectTrigger><SelectValue placeholder="All projects" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All projects</SelectItem>
                    {projectList.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Category</label>
                <Select
                  value={filters.categoryId || 'all'}
                  onValueChange={(v) => { setFilters({ ...filters, categoryId: v === 'all' ? undefined : v }); setPage(1); }}
                >
                  <SelectTrigger><SelectValue placeholder="All categories" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    {categoryList.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">From Date</label>
                <Input
                  type="date"
                  value={filters.dateFrom || ''}
                  onChange={(e) => { setFilters({ ...filters, dateFrom: e.target.value || undefined }); setPage(1); }}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">To Date</label>
                <Input
                  type="date"
                  value={filters.dateTo || ''}
                  onChange={(e) => { setFilters({ ...filters, dateTo: e.target.value || undefined }); setPage(1); }}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Reimbursement</label>
                <Select
                  value={filters.reimbursementStatus || 'all'}
                  onValueChange={(v) => { setFilters({ ...filters, reimbursementStatus: v === 'all' ? undefined : v }); setPage(1); }}
                >
                  <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="reimbursable">Reimbursable only</SelectItem>
                    {REIMBURSEMENT_STATUSES.filter((s) => s.value !== 'none').map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {tagList.length > 0 && (
              <div className="mt-3">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Tags</label>
                <div className="flex flex-wrap gap-1.5">
                  {tagList.map((tag) => {
                    const currentTagIds = filters.tagIds?.split(',').filter(Boolean) || [];
                    const isSelected = currentTagIds.includes(tag.id);
                    return (
                      <Badge
                        key={tag.id}
                        variant={isSelected ? 'default' : 'outline'}
                        className="cursor-pointer select-none text-xs"
                        style={isSelected ? { backgroundColor: tag.color, borderColor: tag.color } : { borderColor: tag.color, color: tag.color }}
                        onClick={() => {
                          const newTagIds = isSelected
                            ? currentTagIds.filter((id) => id !== tag.id)
                            : [...currentTagIds, tag.id];
                          setFilters({ ...filters, tagIds: newTagIds.length > 0 ? newTagIds.join(',') : undefined });
                          setPage(1);
                        }}
                      >
                        {tag.name}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}
            {Object.values(filters).some(Boolean) && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={() => { setFilters({}); setPage(1); }}
              >
                Clear all filters
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Bulk Actions Toolbar */}
      {selectedIds.size > 0 && (
        <Card>
          <CardContent className="p-3 flex items-center gap-3 flex-wrap">
            <span className="text-sm font-medium">{selectedIds.size} selected</span>
            <Button variant="outline" size="sm" onClick={() => setSelectedIds(new Set())}>
              <X className="h-3 w-3 mr-1" /> Clear
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setShowBulkDelete(true)} disabled={bulkDelete.isPending}>
              <Trash2 className="h-3 w-3 mr-1" /> Delete
            </Button>
            <div className="flex items-center gap-2">
              <Select value={bulkCategoryId} onValueChange={setBulkCategoryId}>
                <SelectTrigger className="w-40 h-8 text-xs"><SelectValue placeholder="Set category..." /></SelectTrigger>
                <SelectContent>
                  {categoryList.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkCategorize}
                disabled={!bulkCategoryId || bulkCategorize.isPending}
              >
                Apply
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Expense List */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-5 bg-muted rounded w-1/3 mb-2" />
                <div className="h-4 bg-muted rounded w-1/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : expenseList.length > 0 ? (
        <div className="space-y-2">
          {/* Select All */}
          <div className="flex items-center gap-2 px-2 text-sm text-muted-foreground">
            <button onClick={toggleSelectAll} className="p-1 hover:text-foreground">
              {selectedIds.size === expenseList.length && expenseList.length > 0
                ? <CheckSquare className="h-4 w-4" />
                : <Square className="h-4 w-4" />
              }
            </button>
            <span>Select all</span>
          </div>
          {expenseList.map((expense) => (
            <div key={expense.id} className="flex items-center gap-2">
              <button
                onClick={(e) => { e.preventDefault(); toggleSelect(expense.id); }}
                className="p-1 text-muted-foreground hover:text-foreground flex-shrink-0"
              >
                {selectedIds.has(expense.id)
                  ? <CheckSquare className="h-4 w-4 text-primary" />
                  : <Square className="h-4 w-4" />
                }
              </button>
              <Link to={`/expenses/${expense.id}`} className="flex-1 min-w-0">
              <Card className={`hover:shadow-sm transition-shadow ${selectedIds.has(expense.id) ? 'ring-1 ring-primary' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {expense.receipt && (
                        <Receipt className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-medium text-sm truncate">{expense.vendor}</p>
                          {expense.source === 'receipt_scan' && (Number(expense.amount) === 0 || expense.vendor === 'Unknown Vendor') && (
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{expense.description}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">{formatDate(expense.date)}</span>
                          <div
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: expense.project.color }}
                          />
                          <span className="text-xs text-muted-foreground">{expense.project.name}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 justify-end">
                      <div className="text-right">
                        <p className="font-semibold text-sm">{formatCurrency(expense.amount)}</p>
                        <div className="flex flex-wrap gap-1 justify-end mt-1">
                          {expense.category && (
                            <Badge variant="secondary" className="text-xs">
                              {expense.category.name}
                            </Badge>
                          )}
                          {expense.isReimbursable && (
                            <Badge variant="outline" className="text-xs">
                              {expense.reimbursementStatus === 'paid' ? 'Reimbursed' : 'Reimbursable'}
                            </Badge>
                          )}
                          {expense.isDeductible && (
                            <Badge variant="outline" className="text-xs text-green-600 border-green-300">
                              Deductible
                            </Badge>
                          )}
                          {expense.tags?.map((t) => (
                            <Badge key={t.tag.id} variant="secondary" className="text-xs" style={{ borderLeft: `2px solid ${t.tag.color}` }}>
                              {t.tag.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={(e) => {
                          e.preventDefault();
                          setDeleteId(expense.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
              </Link>
            </div>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Receipt className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No expenses found</h3>
            <p className="text-muted-foreground text-center mb-4">
              {search || Object.values(filters).some(Boolean)
                ? 'Try adjusting your search or filters.'
                : 'Add your first expense to get started.'}
            </p>
            <Button asChild>
              <Link to="/expenses/new"><Plus className="h-4 w-4 mr-2" />Add Expense</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {expenses?.pagination && expenses.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {expenses.pagination.page} of {expenses.pagination.totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= expenses.pagination.totalPages}
              onClick={() => setPage(page + 1)}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete expense?"
        description="This will permanently delete this expense. This action cannot be undone."
        onConfirm={() => { deleteExpense.mutate(deleteId!); setDeleteId(null); }}
        isPending={deleteExpense.isPending}
      />
      <ConfirmDialog
        open={showBulkDelete}
        onOpenChange={setShowBulkDelete}
        title={`Delete ${selectedIds.size} expense${selectedIds.size !== 1 ? 's' : ''}?`}
        description="This will permanently delete the selected expenses. This action cannot be undone."
        onConfirm={handleBulkDelete}
        isPending={bulkDelete.isPending}
      />
    </div>
  );
}
