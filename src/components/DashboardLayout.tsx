import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { UIIntensityToggle } from '@/components/UIIntensityToggle';
import { AutosaveBadge } from '@/components/AutosaveBadge';
import { LayoutDashboard, BookOpen, Brain, User, LogOut, Shield, Plus, History, Sparkles, Bookmark, Layers } from 'lucide-react';
import { PdfQuotaBadge } from '@/components/PdfQuotaBadge';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/tests', icon: BookOpen, label: 'Tests' },
  { to: '/test-series', icon: Layers, label: 'Series' },
  { to: '/history', icon: History, label: 'History' },
  { to: '/generate-test', icon: Brain, label: 'AI Test' },
  { to: '/custom-test', icon: Plus, label: 'Custom' },
  { to: '/short-notes', icon: Sparkles, label: 'Notes' },
  { to: '/saved-notes', icon: Bookmark, label: 'Saved' },
  { to: '/profile', icon: User, label: 'Profile' },
];

export const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const { profile, isAdmin, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Floating pill header */}
      <header className="fixed top-0 inset-x-0 z-50 px-2 sm:px-4 pt-2 sm:pt-3">
        <div className="mx-auto max-w-7xl pill-shell px-2.5 sm:px-4 py-2 flex items-center justify-between gap-2">
          <Link to="/dashboard" className="flex items-center gap-2 min-w-0">
            <img src="/logo.jpg?v=cbt-nexus" alt="CBT Nexus" className="h-8 w-8 rounded-full ring-1 ring-border" />
            <span className="hidden sm:block text-sm font-display font-extrabold tracking-tight">CBT NEXUS</span>
          </Link>

          <div className="flex items-center gap-1 sm:gap-1.5">
            <AutosaveBadge compact />
            <UIIntensityToggle />
            <ThemeToggle />
            {isAdmin && (
              <Link to="/admin" className="hidden sm:inline-flex">
                <Button variant="ghost" size="sm" className="text-primary rounded-full">
                  <Shield className="h-4 w-4 sm:mr-1" /> <span className="hidden md:inline">Admin</span>
                </Button>
              </Link>
            )}
            <span className="text-xs text-muted-foreground hidden lg:block">{profile?.username}</span>
            <Button variant="ghost" size="icon" className="rounded-full" onClick={async () => { await signOut(); navigate('/'); }}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex pt-[4.5rem] sm:pt-20">
        <aside className="hidden md:flex flex-col w-56 fixed left-3 top-24 bottom-4 ink-card p-3 gap-1 overflow-y-auto">
          {navItems.map(item => (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-full transition-all ${
                location.pathname === item.to
                  ? 'gradient-primary text-primary-foreground shadow-[var(--shadow-elegant)]'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              }`}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          ))}
          <div className="mt-auto pt-3">
            <PdfQuotaBadge variant="sidebar" />
          </div>
        </aside>

        <main className="flex-1 md:ml-[15.5rem] px-3 sm:px-5 md:px-8 py-4 md:py-8 pb-32 md:pb-10 max-w-full overflow-x-hidden">
          {children}
        </main>
      </div>

      {/* Mobile bottom pill dock */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 px-2 pb-2">
        <div className="px-2 pb-1">
          <PdfQuotaBadge variant="inline" />
        </div>
        <div className="pill-shell flex gap-1 overflow-x-auto px-2 py-1.5 no-scrollbar">
          {navItems.map(item => (
            <Link
              key={item.to}
              to={item.to}
              className={`min-w-[58px] shrink-0 flex flex-col items-center gap-0.5 py-1.5 px-2 rounded-full ${
                location.pathname === item.to ? 'gradient-primary text-primary-foreground' : 'text-muted-foreground'
              }`}
            >
              <item.icon className="h-4 w-4" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          ))}
          {isAdmin && (
            <Link
              to="/admin"
              className={`min-w-[58px] shrink-0 flex flex-col items-center gap-0.5 py-1.5 px-2 rounded-full ${
                location.pathname === '/admin' ? 'gradient-primary text-primary-foreground' : 'text-primary/80'
              }`}
            >
              <Shield className="h-4 w-4" />
              <span className="text-[10px] font-medium">Admin</span>
            </Link>
          )}
        </div>
      </nav>
    </div>
  );
};
