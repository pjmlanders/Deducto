import { Outlet } from 'react-router-dom';
import { Toaster } from 'sonner';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { Header } from './Header';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ApiStatusBanner } from '@/components/ApiStatusBanner';

export function Layout() {
  return (
    <div className="flex h-screen flex-col">
      <ApiStatusBanner />
      <div className="flex flex-1 overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto pb-20 lg:pb-0">
          <div className="container mx-auto max-w-7xl p-4 md:p-6 lg:p-8">
            <ErrorBoundary>
              <Outlet />
            </ErrorBoundary>
          </div>
        </main>
        <MobileNav />
      </div>
      </div>
      <Toaster position="bottom-right" richColors closeButton />
    </div>
  );
}
