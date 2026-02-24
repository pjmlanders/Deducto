import { Link } from 'react-router-dom';
import { TAX_DISCLAIMER } from '@/lib/constants';

export function AppFooter() {
  return (
    <footer className="mt-auto border-t pt-4 pb-6 text-center text-xs text-muted-foreground">
      <p className="max-w-2xl mx-auto mb-2">{TAX_DISCLAIMER}</p>
      <nav className="flex flex-wrap justify-center gap-x-4 gap-y-1">
        <Link to="/privacy" className="hover:text-foreground underline-offset-2 hover:underline">
          Privacy
        </Link>
        <Link to="/terms" className="hover:text-foreground underline-offset-2 hover:underline">
          Terms of Service
        </Link>
        <Link to="/security" className="hover:text-foreground underline-offset-2 hover:underline">
          Security
        </Link>
      </nav>
    </footer>
  );
}
