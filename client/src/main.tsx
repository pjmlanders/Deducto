import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import App from './App';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      retry: 1,
      gcTime: 5 * 60 * 1000,
    },
    mutations: {
      retry: 0,
    },
  },
});

const CLERK_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

function AppWithAuth() {
  if (!CLERK_KEY) {
    return (
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    );
  }

  return (
    <React.Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <ClerkApp />
    </React.Suspense>
  );
}

const ClerkApp = React.lazy(async () => {
  const { ClerkProvider, SignedIn, SignedOut, SignIn, useAuth } = await import('@clerk/clerk-react');
  const { setAuthTokenGetter } = await import('./services/api');

  function AuthBridge({ children }: { children: React.ReactNode }) {
    const { getToken } = useAuth();
    React.useEffect(() => {
      setAuthTokenGetter(getToken);
    }, [getToken]);
    return <>{children}</>;
  }

  function ClerkWrapper() {
    return (
      <ClerkProvider publishableKey={CLERK_KEY!}>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <SignedIn>
              <AuthBridge>
                <App />
              </AuthBridge>
            </SignedIn>
            <SignedOut>
              <div className="flex min-h-screen items-center justify-center bg-background">
                <SignIn />
              </div>
            </SignedOut>
          </BrowserRouter>
        </QueryClientProvider>
      </ClerkProvider>
    );
  }

  return { default: ClerkWrapper };
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppWithAuth />
  </React.StrictMode>
);
