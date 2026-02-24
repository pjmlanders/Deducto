import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '@/services/api';
import { useProjects, useCreateProject } from '@/hooks/useProjects';
import { useBudgetStatus } from '@/hooks/useBudgets';
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
import { formatCurrency } from '@/lib/utils';
import { DollarSign, TrendingDown, TrendingUp, Receipt, FolderOpen, ArrowUpDown, Target, Plus } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Link, useNavigate } from 'react-router-dom';
import { PROJECT_COLORS } from '@/lib/constants';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line,
} from 'recharts';

const CHART_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#6366f1',
];

const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface ChartTooltipPayload {
  name?: string;
  value: number;
  color?: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: ChartTooltipPayload[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-background p-2 shadow-sm">
      <p className="text-sm font-medium">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-sm" style={{ color: entry.color }}>
          {formatCurrency(entry.value)}
        </p>
      ))}
    </div>
  );
}

export function Dashboard() {
  const navigate = useNavigate();
  const currentDate = new Date();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newColor, setNewColor] = useState('#3b82f6');
  const createProject = useCreateProject();

  const handleCreateProject = async () => {
    if (!newName.trim()) return;
    await createProject.mutateAsync({ name: newName, description: newDescription, color: newColor });
    setNewName('');
    setNewDescription('');
    setNewColor('#3b82f6');
    setShowCreate(false);
  };
  const { data: monthly, isLoading } = useQuery({
    queryKey: ['reports', 'monthly', currentDate.getFullYear(), currentDate.getMonth() + 1],
    queryFn: () => reportsApi.monthly({
      year: currentDate.getFullYear(),
      month: currentDate.getMonth() + 1,
    }),
  });

  const { data: projects } = useProjects();

  const { data: budgetStatus } = useBudgetStatus(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
  );

  const { data: trend } = useQuery({
    queryKey: ['reports', 'trend', 12],
    queryFn: () => reportsApi.trend({ months: 12 }),
  });

  // Guard against unexpected API responses (e.g. when backend URL is missing in production)
  const projectList = Array.isArray(projects?.data) ? projects.data : [];
  const trendData = Array.isArray(trend) ? trend : [];
  const budgetStatusList = Array.isArray(budgetStatus) ? budgetStatus : [];
  const categoryBreakdown = Array.isArray(monthly?.categoryBreakdown) ? monthly.categoryBreakdown : [];
  const dailySpending = Array.isArray(monthly?.dailySpending) ? monthly.dailySpending : [];
  const topVendors = Array.isArray(monthly?.topVendors) ? monthly.topVendors : [];

  return (
    <div className="space-y-6 min-w-0">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })} Overview
        </p>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/expenses/new">Add Expense</Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/scan">Scan Receipt</Link>
          </Button>
        </div>
      </div>

      {/* Project Tiles */}
      {projectList.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Projects</h2>
            <Button asChild variant="ghost" size="sm">
              <Link to="/projects">View all</Link>
            </Button>
          </div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {projectList.slice(0, 6).map((project) => (
              <Card
                key={project.id}
                className="cursor-pointer hover:shadow-md transition-shadow border-l-4"
                style={{ borderLeftColor: project.color }}
                onClick={() => navigate(`/projects/${project.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <p className="font-semibold text-sm truncate flex-1 pr-2">{project.name}</p>
                    {project._count && (
                      <span className="text-xs bg-muted px-1.5 py-0.5 rounded-full flex-shrink-0">
                        {project._count.expenses + project._count.deposits} items
                      </span>
                    )}
                  </div>
                  {project.summary ? (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Expenses</span>
                        <span className="text-red-600 font-medium">{formatCurrency(project.summary.totalExpenses)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Deposits</span>
                        <span className="text-green-600 font-medium">{formatCurrency(project.summary.totalDeposits)}</span>
                      </div>
                      <div className="flex justify-between text-xs border-t pt-1 mt-1">
                        <span className="text-muted-foreground">Net</span>
                        <span className={`font-semibold ${project.summary.netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(project.summary.netBalance)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">No activity yet</p>
                  )}
                </CardContent>
              </Card>
            ))}
            <Card
              className="cursor-pointer hover:shadow-md transition-shadow border-dashed"
              onClick={() => setShowCreate(true)}
            >
              <CardContent className="p-4 flex flex-col items-center justify-center h-full min-h-[100px] text-muted-foreground">
                <Plus className="h-6 w-6 mb-1" />
                <span className="text-sm">New Project</span>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4 min-w-0">
        <Link to="/expenses" className="block">
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-muted-foreground">Total Expenses</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 dark:bg-red-950/50">
                  <TrendingDown className="h-4 w-4 text-red-500" />
                </div>
              </div>
              <div className="text-3xl font-bold tracking-tight text-red-600 mt-1">
                {isLoading ? <Skeleton className="h-9 w-28" /> : formatCurrency(monthly?.expenses?.total || 0)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {isLoading ? <Skeleton className="h-3 w-20" /> : `${monthly?.expenses?.count || 0} transactions`}
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/deposits" className="block">
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-muted-foreground">Total Deposits</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-50 dark:bg-green-950/50">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                </div>
              </div>
              <div className="text-3xl font-bold tracking-tight text-green-600 mt-1">
                {isLoading ? <Skeleton className="h-9 w-28" /> : formatCurrency(monthly?.deposits?.total || 0)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {isLoading ? <Skeleton className="h-3 w-16" /> : `${monthly?.deposits?.count || 0} deposits`}
              </div>
            </CardContent>
          </Card>
        </Link>

        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-muted-foreground">Net Balance</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            <div className={`text-3xl font-bold tracking-tight mt-1 ${(monthly?.net || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {isLoading ? <Skeleton className="h-9 w-28" /> : formatCurrency(monthly?.net || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">This month</p>
          </CardContent>
        </Card>

        <Link to="/projects" className="block">
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-muted-foreground">Active Projects</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <FolderOpen className="h-4 w-4 text-primary" />
                </div>
              </div>
              <div className="text-3xl font-bold tracking-tight">
                {projectList.length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">View all</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Charts Row: Category Pie + Daily Spending Bar */}
      {categoryBreakdown.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2 min-w-0 overflow-hidden">
          {/* Category Pie Chart */}
          <Card className="min-w-0 overflow-hidden">
            <CardHeader>
              <CardTitle className="text-lg">Spending by Category</CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const pieData = categoryBreakdown.map((item: any, i: number) => ({
                  name: item.category?.name || 'Uncategorized',
                  value: Number(item.total) || 0,
                  color: item.category?.color || CHART_COLORS[i % CHART_COLORS.length],
                }));
                return (
                  <div className="flex flex-col items-center">
                    <ResponsiveContainer width="100%" height={240}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={90}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {pieData.map((entry: any, idx: number) => (
                            <Cell key={idx} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2">
                      {pieData.map((entry: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-1.5 text-xs">
                          <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                          <span>{entry.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          {/* Daily Spending Bar Chart */}
          {dailySpending.length > 0 && (
            <Card className="min-w-0 overflow-hidden">
              <CardHeader>
                <CardTitle className="text-lg">Daily Spending</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={dailySpending.map((d: any) => ({
                    day: new Date(d.day).getDate(),
                    total: Number(d.total) || 0,
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="total" fill="#10b981" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Spending Trend (Last 12 Months) */}
      {trendData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Spending Trend (12 Months)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={trendData.map((t: any) => ({
                label: `${monthNames[Number(t.month) - 1]} ${String(t.year).slice(2)}`,
                total: Number(t.total) || 0,
              }))}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#10b981' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Budget Progress */}
      {budgetStatusList.length > 0 && (
        <Link to="/settings" className="block">
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="h-5 w-5" />
                Budget Progress
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {budgetStatusList.map((b) => {
                const barColor = b.status === 'over' ? '#ef4444' : b.status === 'warning' ? '#f59e0b' : '#10b981';
                return (
                  <div key={b.id}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">
                        {b.project?.name || b.category?.name || 'Overall'}
                        <span className="text-xs text-muted-foreground ml-1">({b.period})</span>
                      </span>
                      <span className="text-sm">
                        {formatCurrency(b.actual)} / {formatCurrency(b.amount)}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-secondary overflow-hidden">
                      <div
                        className="h-2 rounded-full transition-all duration-500 ease-out"
                        style={{
                          width: `${Math.min(b.percentage, 100)}%`,
                          backgroundColor: barColor,
                        }}
                      />
                    </div>
                    {b.status === 'over' && (
                      <p className="text-xs text-red-500 mt-0.5">
                        Over budget by {formatCurrency(Math.abs(b.remaining))}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
          </Card>
        </Link>
      )}

      {/* Top Vendors */}
      {topVendors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top Vendors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {topVendors.slice(0, 5).map((vendor: any, i: number) => (
                <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{vendor.vendor}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-medium">{formatCurrency(vendor.total)}</span>
                    <span className="text-xs text-muted-foreground ml-2">({vendor.count}x)</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Project Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Project</DialogTitle>
            <DialogDescription>Create a new project to organize your expenses.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="dash-proj-name">Project Name</Label>
              <Input
                id="dash-proj-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g., Rental Property, Business Expenses"
                autoFocus
              />
            </div>
            <div>
              <Label htmlFor="dash-proj-desc">Description (optional)</Label>
              <Textarea
                id="dash-proj-desc"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
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
                      newColor === c ? 'ring-2 ring-offset-2 ring-primary scale-110' : ''
                    }`}
                    style={{ backgroundColor: c }}
                    onClick={() => setNewColor(c)}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreateProject} disabled={!newName.trim() || createProject.isPending}>
              {createProject.isPending ? 'Creating...' : 'Create Project'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick Actions for empty state */}
      {!isLoading && (!monthly?.expenses?.count) && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <DollarSign className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No expenses yet this month</h3>
            <p className="text-muted-foreground text-center mb-4">
              Start tracking your expenses by scanning a receipt or adding one manually.
            </p>
            <div className="flex gap-2">
              <Button asChild variant="outline">
                <Link to="/expenses/new">Add Manually</Link>
              </Button>
              <Button asChild>
                <Link to="/scan">Scan Receipt</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
