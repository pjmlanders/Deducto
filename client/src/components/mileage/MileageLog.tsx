import { useState } from 'react';
import { useMileage, useMileageSummary, useCreateMileage, useDeleteMileage } from '@/hooks/useMileage';
import { useSavedLocations } from '@/hooks/useSavedLocations';
import { useProjects } from '@/hooks/useProjects';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Car, Plus, Trash2, MapPin, X, Route, Loader2, Bookmark } from 'lucide-react';
import { formatCurrency, formatDate, formatDateInput } from '@/lib/utils';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

const IRS_RATE = 0.70;

async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`;
  const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.length) return null;
  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
}

async function calculateRoute(start: { lat: number; lng: number }, end: { lat: number; lng: number }): Promise<number | null> {
  const url = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=false`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  if (data.code !== 'Ok' || !data.routes?.length) return null;
  return Math.round(data.routes[0].distance * 0.000621371 * 10) / 10;
}

export function MileageLog() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [showForm, setShowForm] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [distanceMode, setDistanceMode] = useState<'enter' | 'calculate'>('enter');
  const [routeCalculating, setRouteCalculating] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);

  const { data: entries, isLoading } = useMileage(year);
  const { data: summary } = useMileageSummary(year);
  const { data: savedLocations } = useSavedLocations();
  const { data: projectsData } = useProjects();
  const createMileage = useCreateMileage();
  const deleteMileage = useDeleteMileage();

  const projects = projectsData?.data ?? [];

  const [form, setForm] = useState({
    date: formatDateInput(new Date()),
    projectId: '',
    startLocation: '',
    endLocation: '',
    distance: '',
    purpose: '',
    roundTrip: false,
    notes: '',
  });

  const handleCalculateRoute = async () => {
    if (!form.startLocation || !form.endLocation) return;
    setRouteCalculating(true);
    setRouteError(null);
    try {
      const [startCoords, endCoords] = await Promise.all([
        geocodeAddress(form.startLocation),
        geocodeAddress(form.endLocation),
      ]);
      if (!startCoords) {
        setRouteError('Could not find start address. Try a more specific address.');
        return;
      }
      if (!endCoords) {
        setRouteError('Could not find end address. Try a more specific address.');
        return;
      }
      const miles = await calculateRoute(startCoords, endCoords);
      if (miles === null) {
        setRouteError('Route calculation failed. Please enter distance manually.');
        return;
      }
      setForm((f) => ({ ...f, distance: String(miles) }));
    } catch {
      setRouteError('Route calculation failed. Please enter distance manually.');
    } finally {
      setRouteCalculating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createMileage.mutateAsync({
      date: form.date,
      projectId: form.projectId,
      startLocation: form.startLocation,
      endLocation: form.endLocation,
      distance: parseFloat(form.distance),
      purpose: form.purpose,
      roundTrip: form.roundTrip,
      notes: form.notes || undefined,
    });
    setForm({
      date: formatDateInput(new Date()),
      projectId: '',
      startLocation: '',
      endLocation: '',
      distance: '',
      purpose: '',
      roundTrip: false,
      notes: '',
    });
    setRouteError(null);
    setShowForm(false);
  };

  const isValid = form.date && form.projectId && form.startLocation && form.endLocation && form.distance && form.purpose;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Mileage Tracking</h1>
          <p className="text-sm text-muted-foreground">Track business mileage for tax deductions</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? <><X className="h-4 w-4 mr-2" /> Cancel</> : <><Plus className="h-4 w-4 mr-2" /> Log Trip</>}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Miles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Number(summary?.totalMiles || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{summary?.tripCount || 0} trips in {year}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Tax Deduction</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(summary?.totalDeduction || 0)}</div>
            <p className="text-xs text-muted-foreground">at ${IRS_RATE}/mile (2025 IRS rate)</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Year</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              {[currentYear - 1, currentYear].map((y) => (
                <Button
                  key={y}
                  variant={year === y ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setYear(y)}
                >
                  {y}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Trip Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Log New Trip</CardTitle>
              {/* Distance mode toggle */}
              <div className="flex rounded-lg border overflow-hidden text-sm">
                <button
                  type="button"
                  className={`px-3 py-1.5 transition-colors ${distanceMode === 'enter' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                  onClick={() => { setDistanceMode('enter'); setRouteError(null); }}
                >
                  Enter Distance
                </button>
                <button
                  type="button"
                  className={`px-3 py-1.5 transition-colors flex items-center gap-1.5 ${distanceMode === 'calculate' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                  onClick={() => { setDistanceMode('calculate'); setRouteError(null); }}
                >
                  <Route className="h-3.5 w-3.5" /> Calculate Route
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Date *</Label>
                  <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                </div>
                <div>
                  <Label>Project *</Label>
                  <Select value={form.projectId} onValueChange={(v) => setForm({ ...form, projectId: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((p) => (
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
              </div>

              {/* Saved locations quick-fill */}
              {savedLocations && savedLocations.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
                    <Bookmark className="h-3 w-3" /> Saved locations — click to fill start or end:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {savedLocations.map((loc) => (
                      <div key={loc.id} className="flex rounded-md border overflow-hidden text-xs">
                        <button
                          type="button"
                          className="px-2 py-1 hover:bg-muted transition-colors font-medium"
                          title={loc.address}
                          onClick={() => setForm((f) => ({ ...f, startLocation: loc.address }))}
                        >
                          {loc.name} →Start
                        </button>
                        <div className="w-px bg-border" />
                        <button
                          type="button"
                          className="px-2 py-1 hover:bg-muted transition-colors"
                          onClick={() => setForm((f) => ({ ...f, endLocation: loc.address }))}
                        >
                          End
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start {distanceMode === 'calculate' ? 'Address' : 'Location'} *</Label>
                  <Input
                    value={form.startLocation}
                    onChange={(e) => setForm({ ...form, startLocation: e.target.value })}
                    placeholder={distanceMode === 'calculate' ? 'e.g., 123 Main St, City, State' : 'e.g., Home'}
                  />
                </div>
                <div>
                  <Label>End {distanceMode === 'calculate' ? 'Address' : 'Location'} *</Label>
                  <Input
                    value={form.endLocation}
                    onChange={(e) => setForm({ ...form, endLocation: e.target.value })}
                    placeholder={distanceMode === 'calculate' ? 'e.g., 456 Oak Ave, City, State' : 'e.g., Client Office'}
                  />
                </div>
              </div>

              {/* Calculate button (only in calculate mode) */}
              {distanceMode === 'calculate' && (
                <div className="space-y-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCalculateRoute}
                    disabled={!form.startLocation || !form.endLocation || routeCalculating}
                  >
                    {routeCalculating ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Calculating...</>
                    ) : (
                      <><Route className="h-4 w-4 mr-2" /> Calculate Distance</>
                    )}
                  </Button>
                  {routeError && (
                    <p className="text-sm text-destructive">{routeError}</p>
                  )}
                  {form.distance && !routeError && (
                    <p className="text-sm text-green-600">
                      Route: {form.distance} miles one-way — you can edit the distance above if needed.
                    </p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Distance (miles, one way) *</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    value={form.distance}
                    onChange={(e) => setForm({ ...form, distance: e.target.value })}
                    placeholder="0.0"
                  />
                </div>
                <div>
                  <Label>Purpose *</Label>
                  <Input value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} placeholder="Business meeting, site visit…" />
                </div>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.roundTrip} onChange={(e) => setForm({ ...form, roundTrip: e.target.checked })} />
                  Round trip (double the distance)
                </label>
                {form.distance && (
                  <span className="text-sm text-muted-foreground">
                    = {(parseFloat(form.distance) * (form.roundTrip ? 2 : 1)).toFixed(1)} miles
                    ({formatCurrency(parseFloat(form.distance) * (form.roundTrip ? 2 : 1) * IRS_RATE)} deduction)
                  </span>
                )}
              </div>
              <div>
                <Label>Notes</Label>
                <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes" />
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={!isValid || createMileage.isPending}>
                  <Car className="h-4 w-4 mr-2" /> Log Trip
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Trip List */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4"><div className="h-5 bg-muted rounded w-1/3" /></CardContent>
            </Card>
          ))}
        </div>
      ) : entries?.data?.length ? (
        <div className="space-y-2">
          {entries.data.map((entry) => (
            <Card key={entry.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm">
                          {entry.startLocation} → {entry.endLocation}
                          {entry.roundTrip && <Badge variant="outline" className="ml-2 text-xs">Round trip</Badge>}
                        </p>
                        {entry.project && (
                          <Badge
                            variant="outline"
                            className="text-xs"
                            style={{ borderColor: entry.project.color, color: entry.project.color }}
                          >
                            {entry.project.name}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{entry.purpose}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{formatDate(entry.date)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right">
                      <p className="font-semibold text-sm">{Number(entry.distance).toFixed(1)} mi</p>
                      <p className="text-xs text-green-600">{formatCurrency(entry.deduction)}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => setDeleteId(entry.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Car className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No mileage entries</h3>
            <p className="text-muted-foreground text-center mb-4">
              Start logging your business trips to track tax deductions.
            </p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" /> Log First Trip
            </Button>
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete mileage entry?"
        description="This will permanently delete this trip record. This action cannot be undone."
        onConfirm={() => { deleteMileage.mutate(deleteId!); setDeleteId(null); }}
        isPending={deleteMileage.isPending}
      />
    </div>
  );
}
