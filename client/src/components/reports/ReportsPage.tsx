import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '@/services/api';
import { useProjects } from '@/hooks/useProjects';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatCurrency } from '@/lib/utils';
import { BarChart3, Download, FileText, TrendingDown, TrendingUp } from 'lucide-react';
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

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-background p-2 shadow-sm">
      <p className="text-sm font-medium">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="text-sm" style={{ color: entry.color }}>
          {formatCurrency(entry.value)}
        </p>
      ))}
    </div>
  );
}

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function ReportsPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [projectId, setProjectId] = useState<string>('all');
  const [view, setView] = useState<'monthly' | 'yearly' | 'tax'>('monthly');

  const { data: projects } = useProjects();

  const { data: monthly } = useQuery({
    queryKey: ['reports', 'monthly', year, month, projectId],
    queryFn: () => reportsApi.monthly({ year, month, projectId: projectId === 'all' ? undefined : projectId }),
    enabled: view === 'monthly',
  });

  const { data: yearly } = useQuery({
    queryKey: ['reports', 'yearly', year, projectId],
    queryFn: () => reportsApi.yearly({ year, projectId: projectId === 'all' ? undefined : projectId }),
    enabled: view === 'yearly',
  });

  const { data: tax } = useQuery({
    queryKey: ['reports', 'tax', year],
    queryFn: () => reportsApi.tax({ year }),
    enabled: view === 'tax',
  });

  const { data: trend } = useQuery({
    queryKey: ['reports', 'trend', 12, projectId],
    queryFn: () => reportsApi.trend({ months: 12, projectId: projectId === 'all' ? undefined : projectId }),
    enabled: view === 'yearly',
  });

  return (
    <div className="space-y-6 min-w-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between min-w-0">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight truncate">Reports</h1>
          <p className="text-sm text-muted-foreground">Financial summaries and tax reports</p>
        </div>
        <div className="flex gap-2 flex-shrink-0 flex-wrap">
          <Button
            variant="outline"
            onClick={() => reportsApi.exportCsv({
              year,
              month: view === 'monthly' ? month : undefined,
              projectId: projectId === 'all' ? undefined : projectId,
            })}
          >
            <Download className="h-4 w-4 mr-2" />
            CSV
          </Button>
          <Button
            variant="outline"
            onClick={() => reportsApi.exportPdf({
              year,
              month: view === 'monthly' ? month : undefined,
              projectId: projectId === 'all' ? undefined : projectId,
            })}
          >
            <FileText className="h-4 w-4 mr-2" />
            PDF
          </Button>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3">
        <div className="flex rounded-lg border">
          {(['monthly', 'yearly', 'tax'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${
                view === v ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
              } ${v === 'monthly' ? 'rounded-l-lg' : ''} ${v === 'tax' ? 'rounded-r-lg' : ''}`}
            >
              {v}
            </button>
          ))}
        </div>

        <Select value={String(year)} onValueChange={(v) => setYear(parseInt(v))}>
          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
          <SelectContent>
            {[2024, 2025, 2026].map((y) => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {view === 'monthly' && (
          <Select value={String(month)} onValueChange={(v) => setMonth(parseInt(v))}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              {months.map((m, i) => (
                <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {view !== 'tax' && (
          <Select value={projectId} onValueChange={setProjectId}>
            <SelectTrigger className="w-40"><SelectValue placeholder="All projects" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All projects</SelectItem>
              {projects?.data?.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Monthly View */}
      {view === 'monthly' && monthly && (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Expenses</CardTitle></CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{formatCurrency(monthly.expenses.total)}</div>
                <p className="text-xs text-muted-foreground">{monthly.expenses.count} transactions</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Deposits</CardTitle></CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{formatCurrency(monthly.deposits.total)}</div>
                <p className="text-xs text-muted-foreground">{monthly.deposits.count} deposits</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Net</CardTitle></CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${monthly.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(monthly.net)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid gap-4 lg:grid-cols-2">
            {monthly.categoryBreakdown?.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-lg">Category Breakdown</CardTitle></CardHeader>
                <CardContent>
                  {(() => {
                    const pieData = monthly.categoryBreakdown.map((item: any, i: number) => ({
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
                              <span>{entry.name} ({formatCurrency(entry.value)})</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            )}

            {monthly.dailySpending?.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-lg">Daily Spending</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={monthly.dailySpending.map((d: any) => ({
                      day: new Date(d.day).getDate(),
                      total: Number(d.total) || 0,
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
                      <Tooltip content={<ChartTooltip />} />
                      <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Yearly View */}
      {view === 'yearly' && yearly && (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Expenses</CardTitle></CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{formatCurrency(yearly.expenses.total)}</div>
                <p className="text-xs text-muted-foreground">{yearly.expenses.count} transactions</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Deposits</CardTitle></CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{formatCurrency(yearly.deposits.total)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Net</CardTitle></CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${yearly.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(yearly.net)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid gap-4 lg:grid-cols-2">
            {yearly.categoryBreakdown?.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-lg">Category Breakdown ({year})</CardTitle></CardHeader>
                <CardContent>
                  {(() => {
                    const pieData = yearly.categoryBreakdown.map((item: any, i: number) => ({
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
                              <span>{entry.name} ({formatCurrency(entry.value)})</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            )}

            {/* Monthly Spending Trend */}
            {trend && trend.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-lg">Monthly Spending Trend</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={trend.map((t: any) => ({
                      label: monthNames[Number(t.month) - 1],
                      total: Number(t.total) || 0,
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
                      <Tooltip content={<ChartTooltip />} />
                      <Line
                        type="monotone"
                        dataKey="total"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Monthly Spending Bar (from yearly data) */}
            {yearly.monthlySpending?.length > 0 && (
              <Card className="lg:col-span-2">
                <CardHeader><CardTitle className="text-lg">Spending by Month ({year})</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={yearly.monthlySpending.map((m: any) => ({
                      month: monthNames[Number(m.month) - 1],
                      total: Number(m.total) || 0,
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
                      <Tooltip content={<ChartTooltip />} />
                      <Bar dataKey="total" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Tax View */}
      {view === 'tax' && tax && (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Deductible Expenses</CardTitle></CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(tax.totalDeductibleExpenses)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Income</CardTitle></CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{formatCurrency(tax.totalIncome)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Mileage Deduction</CardTitle></CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(tax.mileage.totalDeduction)}</div>
                <p className="text-xs text-muted-foreground">{Number(tax.mileage.totalMiles).toLocaleString()} miles</p>
              </CardContent>
            </Card>
          </div>

          {Object.entries(tax.bySchedule as Record<string, any[]>).map(([schedule, expenses]) => (
            <Card key={schedule}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{schedule}</CardTitle>
                  <span className="text-sm font-medium">{formatCurrency(tax.scheduleTotals[schedule])}</span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {expenses.map((exp: any) => (
                    <div key={exp.id} className="flex items-center justify-between py-1 text-sm">
                      <div>
                        <span className="font-medium">{exp.vendor}</span>
                        <span className="text-muted-foreground ml-2">- {exp.description}</span>
                        {exp.taxLine && <span className="text-xs text-muted-foreground ml-2">({exp.taxLine})</span>}
                      </div>
                      <span>{formatCurrency(exp.amount)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
