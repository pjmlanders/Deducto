import React from 'react';
import { Menu, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUIStore } from '@/stores/uiStore';

const CLERK_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

const ClerkUserButton = CLERK_KEY
  ? React.lazy(async () => {
      const { UserButton } = await import('@clerk/clerk-react');
      return {
        default: () => (
          <UserButton
            afterSignOutUrl="/"
            appearance={{
              elements: {
                avatarBox: 'h-8 w-8',
              },
            }}
          />
        ),
      };
    })
  : null;

export function Header() {
  const { toggleSidebar } = useUIStore();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border/50 bg-background/80 backdrop-blur-sm px-4 lg:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={toggleSidebar}
      >
        <Menu className="h-5 w-5" />
      </Button>

      <div className="flex-1" />

      {ClerkUserButton ? (
        <React.Suspense fallback={<div className="h-8 w-8 rounded-full bg-muted" />}>
          <ClerkUserButton />
        </React.Suspense>
      ) : (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
          <User className="h-4 w-4" />
        </div>
      )}
    </header>
  );
}
