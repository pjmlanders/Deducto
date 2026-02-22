import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Receipt,
  FolderOpen,
  PiggyBank,
  BarChart3,
  Settings,
  Upload,
  FileSearch,
  Car,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores/uiStore';
import { Button } from '@/components/ui/button';

const mainNavItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/projects', icon: FolderOpen, label: 'Projects' },
  { to: '/expenses', icon: Receipt, label: 'Expenses' },
  { to: '/deposits', icon: PiggyBank, label: 'Deposits' },
  { to: '/mileage', icon: Car, label: 'Mileage' },
];

const toolNavItems = [
  { to: '/scan', icon: Upload, label: 'Upload Receipts' },
  { to: '/receipts', icon: FileSearch, label: 'Review Receipts' },
  { to: '/reports', icon: BarChart3, label: 'Reports' },
];

const bottomNavItems = [
  { to: '/settings', icon: Settings, label: 'Settings' },
];

function SidebarLink({ item, onClick }: { item: typeof mainNavItems[0]; onClick?: () => void }) {
  return (
    <NavLink
      to={item.to}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors relative',
          isActive
            ? "text-primary bg-primary/5 before:content-[''] before:absolute before:left-0 before:top-1 before:bottom-1 before:w-[3px] before:rounded-full before:bg-primary"
            : 'text-muted-foreground hover:bg-accent hover:text-foreground'
        )
      }
      end={item.to === '/'}
    >
      <item.icon className="h-4 w-4" />
      {item.label}
    </NavLink>
  );
}

export function Sidebar() {
  const { sidebarOpen, setSidebarOpen } = useUIStore();
  const closeSidebar = () => setSidebarOpen(false);

  return (
    <>
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      <aside
        className={cn(
          'fixed left-0 top-0 z-50 flex h-full w-64 flex-col border-r bg-background transition-transform lg:static lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-14 items-center justify-between border-b px-4">
          <NavLink to="/" end onClick={closeSidebar} className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground font-semibold text-xs">
              D
            </div>
            <span className="font-semibold text-base tracking-tight">Deducto</span>
          </NavLink>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden h-8 w-8"
            onClick={closeSidebar}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <div className="space-y-1">
            {mainNavItems.map((item) => (
              <SidebarLink key={item.to} item={item} onClick={closeSidebar} />
            ))}
          </div>

          <div className="my-4 h-px bg-border" />

          <p className="px-3 mb-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            Tools
          </p>
          <div className="space-y-1">
            {toolNavItems.map((item) => (
              <SidebarLink key={item.to} item={item} onClick={closeSidebar} />
            ))}
          </div>
        </nav>

        <div className="border-t px-3 py-3">
          {bottomNavItems.map((item) => (
            <SidebarLink key={item.to} item={item} onClick={closeSidebar} />
          ))}
        </div>
      </aside>
    </>
  );
}
