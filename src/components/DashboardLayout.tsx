import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LayoutDashboard, BookOpen, Brain, User, LogOut, Shield, Plus, History } from 'lucide-react';
import { PdfQuotaBadge } from '@/components/PdfQuotaBadge';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/tests', icon: BookOpen, label: 'Tests' },
  { to: '/history', icon: History, label: 'History' },
  { to: '/generate-test', icon: Brain, label: 'AI Test' },
  { to: '/custom-test', icon: Plus, label: 'Custom Test' },
  { to: '/profile', icon: User, label: 'Profile' },
];

export const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const { profile, isAdmin, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-3">
            <img src="/logo.jpg" alt="CBT Nexus" className="h-9 w-9 rounded-lg" />
            <span className="text-lg font-bold gradient-text hidden sm:block">CBT Nexus</span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {isAdmin && (
              <Link to="/admin">
                <Button variant="ghost" size="sm" className="text-primary">
                  <Shield className="h-4 w-4 mr-1" /> Admin
                </Button>
              </Link>
            )}
            <span className="text-sm text-muted-foreground hidden sm:block">{profile?.username}</span>
            <Button variant="ghost" size="icon" onClick={async () => { await signOut(); navigate('/'); }}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </nav>

      {/* Bottom Nav (mobile) + Side Nav (desktop) */}
      <div className="flex pt-16">
        <aside className="hidden md:flex flex-col w-56 fixed left-0 top-16 bottom-0 bg-card border-r border-border p-4 gap-1">
          {navItems.map(item => (
            <Link key={item.to} to={item.to} className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${location.pathname === item.to ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}>
              <item.icon className="h-5 w-5" />
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          ))}
          <div className="mt-auto">
            <PdfQuotaBadge variant="sidebar" />
          </div>
        </aside>

        <main className="flex-1 md:ml-56 p-4 md:p-8 pb-24 md:pb-8">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 w-full bg-card border-t border-border z-50">
        <div className="px-2 pt-2 pb-1 border-b border-border/50">
          <PdfQuotaBadge variant="inline" />
        </div>
        <div className="flex gap-1 overflow-x-auto px-2 py-2">
          {navItems.map(item => (
            <Link key={item.to} to={item.to} className={`min-w-[72px] flex flex-col items-center gap-1 py-1 px-3 rounded-lg ${location.pathname === item.to ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}>
              <item.icon className="h-5 w-5" />
              <span className="text-xs">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
};
