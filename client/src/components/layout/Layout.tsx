import { Outlet } from 'react-router-dom';
import { Toaster } from 'sonner';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { Header } from './Header';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ApiStatusBanner } from '@/components/ApiStatusBanner';
import { AppFooter } from '@/components/layout/AppFooter';

export function Layout() {
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <ApiStatusBanner />
      <div className="flex flex-1 min-h-0 overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto overflow-x-hidden pb-20 lg:pb-0">
          <div className="container mx-auto w-full max-w-7xl min-w-0 px-4 py-4 sm:p-6 lg:p-8 flex flex-col min-h-full">
            <ErrorBoundary>
              <Outlet />
            </ErrorBoundary>
            <AppFooter />
          </div>
        </main>
        <MobileNav />
      </div>
      </div>
      <Toaster position="bottom-right" richColors closeButton />
    </div>
  );
}
