import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Receipt, Upload, BarChart3, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores/uiStore';

const mobileNavItems = [
  { to: '/', icon: LayoutDashboard, label: 'Home' },
  { to: '/expenses', icon: Receipt, label: 'Expenses' },
  { to: '/scan', icon: Upload, label: 'Upload', isCenter: true },
  { to: '/reports', icon: BarChart3, label: 'Reports' },
];

export function MobileNav() {
  const { toggleSidebar } = useUIStore();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background lg:hidden">
      <div className="flex items-center justify-around">
        {mobileNavItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-1 px-3 py-2 text-xs font-medium transition-colors',
                item.isCenter && 'relative -top-3',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground'
              )
            }
            end={item.to === '/'}
          >
            {item.isCenter ? (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
                <item.icon className="h-6 w-6" />
              </div>
            ) : (
              <item.icon className="h-5 w-5" />
            )}
            <span>{item.label}</span>
          </NavLink>
        ))}
        <button
          onClick={toggleSidebar}
          className="flex flex-col items-center gap-1 px-3 py-2 text-xs font-medium text-muted-foreground"
        >
          <Menu className="h-5 w-5" />
          <span>More</span>
        </button>
      </div>
    </nav>
  );
}
