import { Outlet } from 'react-router-dom';
import { Toaster } from 'sonner';
import { Header } from './Header';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ApiStatusBanner } from '@/components/ApiStatusBanner';
import { AppFooter } from '@/components/layout/AppFooter';

export function Layout() {
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <ApiStatusBanner />
      <Header />
      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="container mx-auto w-full max-w-4xl min-w-0 px-4 py-4 sm:p-6 lg:p-8 flex flex-col min-h-full">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
          <AppFooter />
        </div>
      </main>
      <Toaster position="bottom-right" richColors closeButton duration={5000} />
    </div>
  );
}
