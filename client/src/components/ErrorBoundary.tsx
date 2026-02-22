import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      const err = this.state.error;
      const isDev = import.meta.env.DEV;
      const hint =
        err?.message && /fetch|network|failed|404|api/i.test(err.message)
          ? ' If this app is deployed, set VITE_API_URL to your backend URL (see client/.env.example) and redeploy.'
          : '';
      return (
        <div className="flex items-center justify-center min-h-[60vh] p-6">
          <Card className="max-w-md w-full">
            <CardContent className="flex flex-col items-center text-center py-12">
              <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <h2 className="text-lg font-semibold mb-2">Something went wrong</h2>
              <p className="text-sm text-muted-foreground mb-6">
                An unexpected error occurred. Try refreshing the page — if the problem persists, please contact support.
                {hint}
              </p>
              {err && (
                <pre className="text-left w-full text-xs bg-muted p-3 rounded-md mb-4 overflow-auto max-h-24">
                  {err.message}
                </pre>
              )}
              <Button onClick={() => window.location.reload()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Reload page
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
