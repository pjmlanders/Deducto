import { useState } from 'react';
import { useCategories, useCreateCategory, useDeleteCategory } from '@/hooks/useCategories';
import { useTags, useCreateTag, useDeleteTag } from '@/hooks/useTags';
import { useBudgets, useCreateBudget, useUpdateBudget, useDeleteBudget } from '@/hooks/useBudgets';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useSavedLocations, useCreateSavedLocation, useDeleteSavedLocation } from '@/hooks/useSavedLocations';
import { useProjects } from '@/hooks/useProjects';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AddressAutocomplete } from '@/components/ui/address-autocomplete';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2, Tag, Target, MapPin, Pencil } from 'lucide-react';
import { DEFAULT_CATEGORY_COLORS } from '@/lib/constants';
import { formatCurrency } from '@/lib/utils';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

export function SettingsPage() {
  const { data: categories } = useCategories();
  const createCategory = useCreateCategory();
  const deleteCategory = useDeleteCategory();
  const [newCategory, setNewCategory] = useState('');
  const [newColor, setNewColor] = useState<string>(DEFAULT_CATEGORY_COLORS[0]);

  const { data: tags } = useTags();
  const createTag = useCreateTag();
  const deleteTag = useDeleteTag();
  const [newTag, setNewTag] = useState('');
  const [newTagColor, setNewTagColor] = useState<string>(DEFAULT_CATEGORY_COLORS[2]);

  const { data: budgets } = useBudgets();
  const { data: projects } = useProjects();
  const createBudget = useCreateBudget();
  const updateBudget = useUpdateBudget();
  const deleteBudget = useDeleteBudget();
  const [newBudget, setNewBudget] = useState({ projectId: '', categoryId: '', amount: '', period: 'monthly' });
  const [editBudget, setEditBudget] = useState<{ id: string; amount: string; period: string } | null>(null);

  const { data: savedLocations } = useSavedLocations();
  const createSavedLocation = useCreateSavedLocation();
  const deleteSavedLocation = useDeleteSavedLocation();
  const [newLocation, setNewLocation] = useState({ name: '', address: '' });
  const [deleteLocationId, setDeleteLocationId] = useState<string | null>(null);

  const [deleteCategoryId, setDeleteCategoryId] = useState<string | null>(null);
  const [deleteTagId, setDeleteTagId] = useState<string | null>(null);
  const [deleteBudgetId, setDeleteBudgetId] = useState<string | null>(null);

  const handleAddLocation = async () => {
    if (!newLocation.name.trim() || !newLocation.address.trim()) return;
    await createSavedLocation.mutateAsync({ name: newLocation.name.trim(), address: newLocation.address.trim() });
    setNewLocation({ name: '', address: '' });
  };

  const handleAddBudget = async () => {
    if (!newBudget.amount) return;
    await createBudget.mutateAsync({
      projectId: newBudget.projectId || undefined,
      categoryId: newBudget.categoryId || undefined,
      amount: parseFloat(newBudget.amount),
      period: newBudget.period,
    });
    setNewBudget({ projectId: '', categoryId: '', amount: '', period: 'monthly' });
  };

  const handleAddCategory = async () => {
    if (!newCategory.trim()) return;
    await createCategory.mutateAsync({ name: newCategory.trim(), color: newColor });
    setNewCategory('');
  };

  const handleAddTag = async () => {
    if (!newTag.trim()) return;
    await createTag.mutateAsync({ name: newTag.trim(), color: newTagColor });
    setNewTag('');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage categories and preferences</p>
      </div>

      {/* Categories */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Expense Categories</CardTitle>
          <CardDescription>Organize your expenses into categories</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add new */}
          <div className="flex gap-2">
            <Input
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="New category name"
              onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
            />
            <div className="flex gap-1">
              {DEFAULT_CATEGORY_COLORS.slice(0, 6).map((c) => (
                <button
                  key={c}
                  className={`h-10 w-6 rounded transition-transform ${newColor === c ? 'ring-2 ring-offset-1 ring-primary scale-110' : ''}`}
                  style={{ backgroundColor: c }}
                  onClick={() => setNewColor(c)}
                />
              ))}
            </div>
            <Button onClick={handleAddCategory} disabled={!newCategory.trim()}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* List */}
          <div className="space-y-2">
            {categories?.map((category) => (
              <div key={category.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-accent">
                <div className="flex items-center gap-3">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: category.color }} />
                  <span className="text-sm font-medium">{category.name}</span>
                  {category._count?.expenses ? (
                    <Badge variant="secondary" className="text-xs">{category._count.expenses}</Badge>
                  ) : null}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => setDeleteCategoryId(category.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {!categories?.length && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No categories yet. Add one above.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tags */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Tags
          </CardTitle>
          <CardDescription>Label expenses with tags for flexible grouping</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder="New tag name"
              onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
            />
            <div className="flex gap-1">
              {DEFAULT_CATEGORY_COLORS.slice(0, 6).map((c) => (
                <button
                  key={c}
                  className={`h-10 w-6 rounded transition-transform ${newTagColor === c ? 'ring-2 ring-offset-1 ring-primary scale-110' : ''}`}
                  style={{ backgroundColor: c }}
                  onClick={() => setNewTagColor(c)}
                />
              ))}
            </div>
            <Button onClick={handleAddTag} disabled={!newTag.trim()}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {tags?.map((tag) => (
              <Badge
                key={tag.id}
                variant="secondary"
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm"
                style={{ borderLeft: `3px solid ${tag.color}` }}
              >
                {tag.name}
                {tag._count?.expenses ? (
                  <span className="text-xs text-muted-foreground">({tag._count.expenses})</span>
                ) : null}
                <button
                  className="ml-1 text-muted-foreground hover:text-destructive"
                  onClick={() => setDeleteTagId(tag.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {!tags?.length && (
              <p className="text-sm text-muted-foreground py-2">No tags yet. Add one above.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Budgets */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="h-5 w-5" />
            Budgets
          </CardTitle>
          <CardDescription>Set spending limits per project or category</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label className="text-xs">Project (optional)</Label>
              <Select value={newBudget.projectId || 'none'} onValueChange={(v) => setNewBudget({ ...newBudget, projectId: v === 'none' ? '' : v })}>
                <SelectTrigger><SelectValue placeholder="All projects" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">All projects</SelectItem>
                  {projects?.data?.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Category (optional)</Label>
              <Select value={newBudget.categoryId || 'none'} onValueChange={(v) => setNewBudget({ ...newBudget, categoryId: v === 'none' ? '' : v })}>
                <SelectTrigger><SelectValue placeholder="All categories" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">All categories</SelectItem>
                  {categories?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Amount *</Label>
              <Input type="number" step="0.01" min="0" value={newBudget.amount} onChange={(e) => setNewBudget({ ...newBudget, amount: e.target.value })} placeholder="0.00" />
            </div>
            <div>
              <Label className="text-xs">Period *</Label>
              <Select value={newBudget.period} onValueChange={(v) => setNewBudget({ ...newBudget, period: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={handleAddBudget} disabled={!newBudget.amount} size="sm">
            <Plus className="h-4 w-4 mr-1" /> Add Budget
          </Button>

          <div className="space-y-2">
            {budgets?.map((budget) => (
              <div key={budget.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-accent">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 text-sm font-medium">
                    {budget.project && (
                      <span className="flex items-center gap-1">
                        <span
                          className="inline-block h-2 w-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: budget.project.color }}
                        />
                        {budget.project.name}
                      </span>
                    )}
                    {budget.project && (
                      <span className="text-muted-foreground">·</span>
                    )}
                    {!budget.project && !budget.category ? (
                      <span className="text-muted-foreground italic">Overall</span>
                    ) : (
                      <span className="flex items-center gap-1">
                        {budget.category ? (
                          <>
                            <span
                              className="inline-block h-2 w-2 rounded-full flex-shrink-0"
                              style={{ backgroundColor: budget.category.color }}
                            />
                            {budget.category.name}
                          </>
                        ) : (
                          <span className="text-muted-foreground italic">All categories</span>
                        )}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatCurrency(budget.amount)} / {budget.period}
                  </span>
                </div>
                <div className="flex items-center gap-1 ml-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-primary"
                    onClick={() => setEditBudget({ id: budget.id, amount: String(budget.amount), period: budget.period })}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => setDeleteBudgetId(budget.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            {!budgets?.length && (
              <p className="text-sm text-muted-foreground text-center py-2">No budgets set. Add one above.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Saved Locations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Saved Locations
          </CardTitle>
          <CardDescription>Save addresses for quick entry when logging mileage</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
            <div>
              <Label className="text-xs">Name</Label>
              <Input
                value={newLocation.name}
                onChange={(e) => setNewLocation({ ...newLocation, name: e.target.value })}
                placeholder="Home, Work, Client A…"
                onKeyDown={(e) => e.key === 'Enter' && handleAddLocation()}
              />
            </div>
            <div>
              <Label className="text-xs">Address</Label>
              <AddressAutocomplete
                value={newLocation.address}
                onChange={(v) => setNewLocation({ ...newLocation, address: v })}
                placeholder="123 Main St, City, State"
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleAddLocation}
                disabled={!newLocation.name.trim() || !newLocation.address.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            {savedLocations?.map((loc) => (
              <div key={loc.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-accent">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{loc.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{loc.address}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive flex-shrink-0"
                  onClick={() => setDeleteLocationId(loc.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {!savedLocations?.length && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No saved locations yet. Add one above.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">About</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Deducto v1.0.0
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            AI-powered receipt scanning by Claude (Anthropic)
          </p>
        </CardContent>
      </Card>
      <ConfirmDialog
        open={!!deleteCategoryId}
        onOpenChange={(open) => !open && setDeleteCategoryId(null)}
        title="Delete category?"
        description="Expenses in this category won't be deleted, but they'll lose their category assignment."
        onConfirm={() => { deleteCategory.mutate(deleteCategoryId!); setDeleteCategoryId(null); }}
        isPending={deleteCategory.isPending}
      />
      <ConfirmDialog
        open={!!deleteTagId}
        onOpenChange={(open) => !open && setDeleteTagId(null)}
        title="Delete tag?"
        description="This tag will be removed from all expenses it's currently applied to."
        onConfirm={() => { deleteTag.mutate(deleteTagId!); setDeleteTagId(null); }}
        isPending={deleteTag.isPending}
      />
      <ConfirmDialog
        open={!!deleteBudgetId}
        onOpenChange={(open) => !open && setDeleteBudgetId(null)}
        title="Delete budget?"
        description="This budget rule will be removed. Your expense history is not affected."
        onConfirm={() => { deleteBudget.mutate(deleteBudgetId!); setDeleteBudgetId(null); }}
        isPending={deleteBudget.isPending}
      />
      <ConfirmDialog
        open={!!deleteLocationId}
        onOpenChange={(open) => !open && setDeleteLocationId(null)}
        title="Delete saved location?"
        description="This location will be removed from your saved list."
        onConfirm={() => { deleteSavedLocation.mutate(deleteLocationId!); setDeleteLocationId(null); }}
        isPending={deleteSavedLocation.isPending}
      />

      {/* Edit Budget Dialog */}
      <Dialog open={!!editBudget} onOpenChange={(open) => !open && setEditBudget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Budget</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Amount</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={editBudget?.amount ?? ''}
                onChange={(e) => setEditBudget((prev) => prev ? { ...prev, amount: e.target.value } : prev)}
                placeholder="0.00"
                autoFocus
              />
            </div>
            <div>
              <Label>Period</Label>
              <Select
                value={editBudget?.period ?? 'monthly'}
                onValueChange={(v) => setEditBudget((prev) => prev ? { ...prev, period: v } : prev)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditBudget(null)}>Cancel</Button>
            <Button
              disabled={!editBudget?.amount || updateBudget.isPending}
              onClick={async () => {
                if (!editBudget) return;
                await updateBudget.mutateAsync({ id: editBudget.id, data: { amount: parseFloat(editBudget.amount), period: editBudget.period } });
                setEditBudget(null);
              }}
            >
              {updateBudget.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
