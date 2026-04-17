import { Link } from 'react-router-dom';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { BookOpen, Brain, BarChart3, Zap, Shield, ArrowRight, Sparkles, FileCheck2, Trophy } from 'lucide-react';
import rankersStarLogo from '@/assets/rankers-star-logo.jpg';
import preppoLogo from '@/assets/preppro-logo.jpg';

const Index = () => {
  const features = [
    { icon: FileCheck2, title: 'Exact PDF to CBT conversion', desc: 'Upload papers, preserve the original question flow, and turn them into a real exam interface.' },
    { icon: Brain, title: 'AI test generation', desc: 'Create JEE or NEET full tests, subject papers, and chapter drills in minutes.' },
    { icon: BarChart3, title: 'Deep analysis', desc: 'Review score, accuracy, timing, weak topics, and every solved question in detail.' },
    { icon: Zap, title: 'Nexus AI support', desc: 'Chat with an assistant that understands your attempts, pace, and study gaps.' },
  ];

  const platformStats = [
    { value: '3 modes', label: 'Official, AI, and custom CBT' },
    { value: 'JEE + NEET', label: 'Built for competitive exam patterns' },
    { value: 'Full analytics', label: 'Timing, accuracy, score, mistakes' },
  ];

  return (
    <div className="min-h-screen bg-background hero-mesh">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.jpg" alt="CBT Nexus" className="h-10 w-10 rounded-lg" />
            <span className="text-xl font-bold gradient-text">CBT Nexus</span>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Link to="/auth">
              <Button variant="ghost">Log In</Button>
            </Link>
            <Link to="/auth?mode=signup">
              <Button className="gradient-primary text-primary-foreground font-semibold">Sign Up</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-16 px-6">
        <div className="container mx-auto grid gap-10 xl:grid-cols-[1.2fr_0.8fr] items-center">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm text-primary font-medium">AI-powered CBT platform for serious JEE / NEET prep</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              Real exam pressure, <span className="gradient-text">smarter preparation</span>, better decisions.
            </h1>
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl">
              CBT Nexus turns official PDFs, custom papers, and AI-generated exams into a proper CBT workflow with analysis, revision insight, and a personal study copilot.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-4 mb-10">
              <Link to="/auth?mode=signup">
                <Button size="lg" className="gradient-primary text-primary-foreground font-semibold text-lg px-8 py-6">
                  Start Preparing Free <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
              </Link>
              <Link to="/auth">
                <Button size="lg" variant="outline" className="text-lg px-8 py-6 border-border">
                  Already have an account
                </Button>
              </Link>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {platformStats.map((item) => (
                <div key={item.label} className="surface-elevated p-4">
                  <p className="text-2xl font-bold gradient-text">{item.value}</p>
                  <p className="text-sm text-muted-foreground mt-1">{item.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="surface-elevated p-5 md:p-6 animate-float">
            <div className="rounded-2xl border border-border/70 bg-background/60 p-5">
              <div className="flex items-center justify-between gap-3 mb-5">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Today inside CBT Nexus</p>
                  <h2 className="text-2xl font-semibold mt-1">Your prep cockpit</h2>
                </div>
                <img src="/logo.jpg" alt="CBT Nexus logo" className="h-12 w-12 rounded-xl" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-secondary p-4">
                  <p className="text-sm text-muted-foreground">Live exam simulation</p>
                  <p className="text-lg font-semibold mt-2">Timer, panel, review flags, and final analysis</p>
                </div>
                <div className="rounded-2xl bg-secondary p-4">
                  <p className="text-sm text-muted-foreground">Official paper pipeline</p>
                  <p className="text-lg font-semibold mt-2">Upload PDF → extract questions → launch CBT</p>
                </div>
                <div className="rounded-2xl bg-secondary p-4 sm:col-span-2">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Nexus AI suggestion</p>
                      <p className="font-semibold mt-2">Revisit Electrostatics and Organic Chemistry after your next attempt.</p>
                    </div>
                    <Brain className="h-10 w-10 text-primary shrink-0" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="pb-20 px-6">
        <div className="container mx-auto grid gap-4 lg:grid-cols-3">
          <div className="section-shell lg:col-span-2">
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground mb-3">What makes it useful</p>
            <h2 className="text-3xl font-bold mb-4">Built for the actual exam loop, not just practice questions.</h2>
            <p className="text-muted-foreground max-w-2xl">From official paper conversion to daily AI guidance, everything is centered on realistic testing and clear post-test decisions.</p>
          </div>
          <div className="section-shell">
            <p className="text-sm text-muted-foreground">Admin uploads official papers, students generate targeted mocks, and every attempt feeds back into better planning.</p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="pb-20 px-6">
        <div className="container mx-auto">
          <div className="flex items-end justify-between gap-4 mb-10 flex-wrap">
            <div>
              <h2 className="text-3xl font-bold mb-2">Why CBT Nexus?</h2>
              <p className="text-muted-foreground max-w-2xl">A sharper stack for aspirants who want realistic practice and useful analysis.</p>
            </div>
          </div>
          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-5">
            {features.map((f) => (
              <div key={f.title} className="section-shell group">
                <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center mb-5">
                  <f.icon className="h-6 w-6 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-3">{f.title}</h3>
                <p className="text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="pb-20 px-6">
        <div className="container mx-auto grid gap-5 lg:grid-cols-3">
          {[
            { icon: Shield, title: 'Official tests', desc: 'Admin-uploaded papers are kept separate, clean, and easy to find.' },
            { icon: BookOpen, title: 'Custom uploads', desc: 'Students can upload their own PDFs and optionally attach answer keys.' },
            { icon: Trophy, title: 'History & progress', desc: 'Every attempt becomes a trackable record with dates, scores, and review access.' },
          ].map((item) => (
            <div key={item.title} className="section-shell">
              <item.icon className="h-8 w-8 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
              <p className="text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="pb-20 px-6">
        <div className="container mx-auto section-shell text-center max-w-4xl">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to practice like the real thing?</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto mb-8">Create your account once, stay signed in, and build your full CBT routine around official papers, AI tests, and revision analysis.</p>
            <Link to="/auth?mode=signup">
            <Button size="lg" className="gradient-primary text-primary-foreground font-semibold px-8 py-6">
              Create your CBT account
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-border">
        <div className="container mx-auto space-y-8">
          <div className="surface-elevated p-6 md:p-8">
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground mb-4 text-center">A Collaboration Between</p>
            <div className="grid gap-6 md:grid-cols-2">
              <a
                href="https://rankers-stars.vercel.app"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 rounded-2xl border border-border/70 bg-background/60 p-5 hover:border-primary/40 transition-colors"
              >
                <img src={rankersStarLogo} alt="Rankers Star" className="h-16 w-16 rounded-xl object-cover" />
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Brand partner</p>
                  <p className="text-lg font-semibold">Rankers Star</p>
                  <p className="text-sm text-primary">rankers-stars.vercel.app</p>
                </div>
              </a>
              <a
                href="https://PrepProhub.lovable.app"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 rounded-2xl border border-border/70 bg-background/60 p-5 hover:border-primary/40 transition-colors"
              >
                <img src={preppoLogo} alt="PrepPro Network" className="h-16 w-16 rounded-full object-cover bg-white" />
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Brand partner</p>
                  <p className="text-lg font-semibold">PrepPro Network</p>
                  <p className="text-sm text-primary">PrepProhub.lovable.app</p>
                </div>
              </a>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img src="/logo.jpg" alt="CBT Nexus" className="h-8 w-8 rounded-lg" />
              <span className="font-bold gradient-text">CBT Nexus</span>
            </div>
            <p className="text-muted-foreground text-sm">© 2026 CBT Nexus · Built in collaboration with Rankers Star & PrepPro Network.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
