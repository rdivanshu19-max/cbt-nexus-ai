import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { UIIntensityToggle } from '@/components/UIIntensityToggle';
import { AutosaveBadge } from '@/components/AutosaveBadge';
import { LayoutDashboard, BookOpen, Brain, User, LogOut, Shield, Plus, History, Sparkles, Bookmark } from 'lucide-react';
import { PdfQuotaBadge } from '@/components/PdfQuotaBadge';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/tests', icon: BookOpen, label: 'Tests' },
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
      {/* Top Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-background/85 backdrop-blur-xl border-b border-border">
        <div className="container mx-auto px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2">
          <Link to="/dashboard" className="flex items-center gap-2 sm:gap-3 min-w-0">
            <img src="/logo.jpg?v=cbt-nexus" alt="CBT Nexus" className="h-9 w-9 rounded-lg ring-1 ring-border" />
            <div className="hidden sm:block leading-tight">
              <p className="text-[10px] font-mono-hud uppercase tracking-[0.32em] text-muted-foreground">// nexus</p>
              <span className="text-base font-display font-bold">CBT NEXUS</span>
            </div>
          </Link>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <AutosaveBadge compact />
            <UIIntensityToggle />
            <ThemeToggle />
            {isAdmin && (
              <Link to="/admin">
                <Button variant="ghost" size="sm" className="text-primary hidden sm:inline-flex">
                  <Shield className="h-4 w-4 mr-1" /> Admin
                </Button>
              </Link>
            )}
            <span className="text-xs text-muted-foreground hidden md:block font-mono-hud">{profile?.username}</span>
            <Button variant="ghost" size="icon" onClick={async () => { await signOut(); navigate('/'); }}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </nav>

      <div className="flex pt-14 sm:pt-16">
        <aside className="hidden md:flex flex-col w-56 fixed left-0 top-16 bottom-0 bg-sidebar border-r border-sidebar-border p-4 gap-1">
          {navItems.map(item => (
            <Link key={item.to} to={item.to} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${location.pathname === item.to ? 'bg-primary/10 text-primary border border-primary/20' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}>
              <item.icon className="h-4 w-4" />
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          ))}
          <div className="mt-auto">
            <PdfQuotaBadge variant="sidebar" />
          </div>
        </aside>

        <main className="flex-1 md:ml-56 p-3 sm:p-5 md:p-8 pb-28 md:pb-8">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 w-full bg-card/95 backdrop-blur-xl border-t border-border z-50">
        <div className="px-2 pt-1.5 pb-1 border-b border-border/50">
          <PdfQuotaBadge variant="inline" />
        </div>
        <div className="flex gap-1 overflow-x-auto px-2 py-1.5">
          {navItems.map(item => (
            <Link key={item.to} to={item.to} className={`min-w-[60px] flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg ${location.pathname === item.to ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}>
              <item.icon className="h-4 w-4" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          ))}
          {isAdmin && (
            <Link to="/admin" className={`min-w-[60px] flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg ${location.pathname === '/admin' ? 'bg-primary/10 text-primary' : 'text-primary/80'}`}>
              <Shield className="h-4 w-4" />
              <span className="text-[10px] font-medium">Admin</span>
            </Link>
          )}
        </div>
      </nav>
    </div>
  );
};
