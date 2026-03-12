import React from 'react';
import { NavLink } from 'react-router-dom';
import { BarChart3, Settings, User, ScanLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useReceiptIssueCount } from '@/hooks/useReceipts';

const CLERK_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

const ClerkUserButton = CLERK_KEY
  ? React.lazy(async () => {
      const { UserButton } = await import('@clerk/clerk-react');
      return {
        default: () => (
          <UserButton
            afterSignOutUrl="/"
            appearance={{ elements: { avatarBox: 'h-8 w-8' } }}
          />
        ),
      };
    })
  : null;

export function Header() {
  const { data: issueCount = 0 } = useReceiptIssueCount();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border/50 bg-background/80 backdrop-blur-sm px-4 lg:px-6">
      {/* Logo / home link */}
      <NavLink to="/" end className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
        <img src="/logo.svg" alt="" className="h-8 w-8 rounded-lg" />
        <span className="font-semibold text-base tracking-tight">Deducto</span>
      </NavLink>

      {/* Right side nav */}
      <div className="flex items-center gap-1">
        {issueCount > 0 && (
          <NavLink to="/receipts">
            {({ isActive }) => (
              <Button variant="ghost" size="icon" className={cn('relative', isActive && 'text-primary bg-primary/5')}>
                <ScanLine className="h-5 w-5 text-destructive" />
                <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
                  {issueCount > 9 ? '9+' : issueCount}
                </span>
                <span className="sr-only">Receipt issues ({issueCount})</span>
              </Button>
            )}
          </NavLink>
        )}
        <NavLink to="/reports">
          {({ isActive }) => (
            <Button variant="ghost" size="icon" className={cn(isActive && 'text-primary bg-primary/5')}>
              <BarChart3 className="h-5 w-5" />
              <span className="sr-only">Reports</span>
            </Button>
          )}
        </NavLink>
        <NavLink to="/settings">
          {({ isActive }) => (
            <Button variant="ghost" size="icon" className={cn(isActive && 'text-primary bg-primary/5')}>
              <Settings className="h-5 w-5" />
              <span className="sr-only">Settings</span>
            </Button>
          )}
        </NavLink>

        <div className="ml-1">
          {ClerkUserButton ? (
            <React.Suspense fallback={<div className="h-8 w-8 rounded-full bg-muted" />}>
              <ClerkUserButton />
            </React.Suspense>
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
              <User className="h-4 w-4" />
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
