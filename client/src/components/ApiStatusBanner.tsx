import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { API_BASE } from '@/services/api';
import { useState } from 'react';

/**
 * Pings the backend health endpoint. If it fails, shows a banner explaining
 * that VITE_API_URL may be wrong or the backend is down, and that env vars
 * require a redeploy to take effect.
 */
export function ApiStatusBanner() {
  const [dismissed, setDismissed] = useState(false);

  const { isError, isSuccess, isLoading } = useQuery({
    queryKey: ['api-health'],
    queryFn: async () => {
      const url = `${API_BASE.replace(/\/$/, '')}/health`;
      const res = await fetch(url, { method: 'GET' });
      if (!res.ok) throw new Error(`Health check failed: ${res.status}`);
      return res.json();
    },
    retry: 1,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });

  if (isLoading || isSuccess || dismissed) return null;
  if (!isError) return null;

  const apiUrl = import.meta.env.VITE_API_URL;
  const hasApiUrl = typeof apiUrl === 'string' && apiUrl.length > 0;

  return (
    <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2.5 flex items-center justify-between gap-4 flex-wrap">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
        <p className="text-sm text-amber-800 dark:text-amber-200">
          Cannot reach the server.
          {hasApiUrl
            ? ' Backend may be down or CORS may be blocking requests. If you just added or changed VITE_API_URL, trigger a new deploy so the new value is used.'
            : ' Set VITE_API_URL to your backend URL (e.g. https://your-app.railway.app) in Vercel Environment Variables, then redeploy.'}
        </p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="flex-shrink-0 h-8 w-8 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
