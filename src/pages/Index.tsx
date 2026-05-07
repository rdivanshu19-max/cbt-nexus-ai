import { Link } from 'react-router-dom';
import { ThemeToggle } from '@/components/ThemeToggle';
import { UIIntensityToggle } from '@/components/UIIntensityToggle';
import { Button } from '@/components/ui/button';
import { Hero3D } from '@/components/Hero3D';
import { BookOpen, Brain, BarChart3, Zap, Shield, Users, ArrowRight, Sparkles, FileCheck2, Trophy, Heart, ExternalLink, Code2, Rocket, Briefcase, Mail, Globe, Cpu, Palette, Target } from 'lucide-react';
import rankersStarsLogo from '@/assets/rankers-stars-logo.jpg';

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
          <div className="flex items-center gap-2 sm:gap-4">
            <UIIntensityToggle />
            <ThemeToggle />
            <Link to="/auth" className="hidden sm:inline-flex">
              <Button variant="ghost">Log In</Button>
            </Link>
            <Link to="/auth?mode=signup">
              <Button size="sm" className="gradient-primary text-primary-foreground font-semibold">Sign Up</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-28 sm:pt-32 pb-12 sm:pb-16 px-4 sm:px-6 overflow-hidden min-h-[88vh] flex items-center">
        {/* 3D background */}
        <div className="absolute inset-0">
          <Hero3D />
        </div>

        <div className="container mx-auto grid gap-10 xl:grid-cols-[1.2fr_0.8fr] items-center relative">
          <div className="max-w-3xl animate-fade-in-up">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 mb-6 sm:mb-8 backdrop-blur-md soft-glow">
              <Sparkles className="h-4 w-4 text-primary shrink-0" />
              <span className="text-xs sm:text-sm text-primary font-medium">AI-powered CBT for JEE / NEET prep</span>
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold mb-6 leading-tight">
              Real exam pressure, <span className="gradient-text-aurora animate-aurora">smarter preparation</span>, better decisions.
            </h1>
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl">
              CBT Nexus turns official PDFs, custom papers, and AI-generated exams into a proper CBT workflow with analysis, revision insight, and a personal study copilot.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-4 mb-10">
              <Link to="/auth?mode=signup">
                <Button size="lg" className="gradient-primary text-primary-foreground font-semibold text-lg px-8 py-6 soft-glow hover:scale-[1.03] transition-transform">
                  Start Preparing Free <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
              </Link>
              <Link to="/auth">
                <Button size="lg" variant="outline" className="text-lg px-8 py-6 border-border">
                  Already have an account
                </Button>
              </Link>
            </div>

            {/* Partner callout (right under CTAs) */}
            <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background p-6 md:p-8 mb-10">
              <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
              <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-accent/20 blur-3xl pointer-events-none" />
              <div className="relative flex flex-col gap-6">
                <div className="flex items-center gap-2">
                  <Heart className="h-4 w-4 text-primary" />
                  <span className="text-xs uppercase tracking-[0.24em] text-primary font-semibold">Powered by free education</span>
                </div>
                <h3 className="text-2xl md:text-3xl font-bold leading-tight">
                  CBT Nexus is built by <span className="gradient-text">Rankers Stars</span>
                </h3>
                <p className="text-muted-foreground max-w-2xl">
                  A student-first platform giving every aspirant <strong>free lectures, free tests, and free resources</strong> for JEE, NEET and other competitive exams — because every child deserves a fair shot at their dream rank.
                </p>
                <a href="https://rankers-stars.vercel.app/" target="_blank" rel="noopener noreferrer" className="group surface-elevated p-5 flex items-center gap-4 hover:border-primary/40 transition-all max-w-md">
                  <img src={rankersStarsLogo} alt="Rankers Stars" className="h-14 w-14 rounded-xl object-cover ring-2 ring-primary/20" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold flex items-center gap-2">Rankers Stars <ExternalLink className="h-3.5 w-3.5 opacity-60 group-hover:opacity-100" /></p>
                    <p className="text-xs text-muted-foreground mt-1">Free lectures, notes & mock tests for serious aspirants.</p>
                  </div>
                </a>
              </div>
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

          <div className="surface-elevated p-5 md:p-6 animate-float card-3d backdrop-blur-md bg-card/70">
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
              <div key={f.title} className="section-shell group card-3d">
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

      {/* About the Developer */}
      <section id="about-developer" className="pb-24 px-4 sm:px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background p-6 sm:p-10 md:p-14">
            <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-accent/20 blur-3xl pointer-events-none" />

            <div className="relative grid gap-10 lg:grid-cols-[1.1fr_1fr] items-start">
              <div>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
                  <Rocket className="h-4 w-4 text-primary" />
                  <span className="text-xs sm:text-sm text-primary font-semibold uppercase tracking-[0.2em]">About the developer</span>
                </div>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight mb-5">
                  Hi, I'm <span className="gradient-text">GCD</span> — I build practical, high-impact digital products.
                </h2>
                <p className="text-base sm:text-lg text-muted-foreground mb-5">
                  Not just websites that look good — ones that actually solve problems. I'm currently building <strong>Rankers Stars</strong>, an AI-powered platform for JEE aspirants focused on smarter preparation, better resources, and real usability.
                </p>
                <p className="text-base sm:text-lg text-muted-foreground mb-8">
                  Alongside that, I work as a freelance developer helping clients turn ideas into real products — from simple landing pages to full platforms.
                </p>

                <div className="flex flex-wrap gap-3">
                  <a href="mailto:studyspacerankers@gmail.com">
                    <Button size="lg" className="gradient-primary text-primary-foreground font-semibold">
                      <Mail className="h-4 w-4 mr-2" /> Work with me
                    </Button>
                  </a>
                  <a href="https://divyanshuportfolio-beta.vercel.app/" target="_blank" rel="noopener noreferrer">
                    <Button size="lg" variant="outline">
                      <Globe className="h-4 w-4 mr-2" /> View portfolio
                    </Button>
                  </a>
                </div>

                <p className="text-xs text-muted-foreground mt-5 break-all">
                  📩 studyspacerankers@gmail.com
                </p>
              </div>

              <div className="grid gap-4">
                <div className="surface-elevated p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center">
                      <Briefcase className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold">Freelance work</h3>
                  </div>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• Coaching institute websites</li>
                    <li>• Restaurant websites with modern UI</li>
                    <li>• Full coaching platforms & apps</li>
                    <li>• High-end 3D animated websites with smooth interactions</li>
                  </ul>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {[
                    { icon: Code2, label: 'Full-stack web' },
                    { icon: Cpu, label: 'AI & automation' },
                    { icon: Palette, label: '3D & animation' },
                    { icon: BookOpen, label: 'EdTech platforms' },
                  ].map((s) => (
                    <div key={s.label} className="surface-elevated p-4 flex items-center gap-3">
                      <s.icon className="h-5 w-5 text-primary shrink-0" />
                      <span className="text-sm font-medium">{s.label}</span>
                    </div>
                  ))}
                </div>

                <div className="surface-elevated p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center">
                      <Target className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold">My approach</h3>
                  </div>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• Clean UI that actually converts</li>
                    <li>• Fast performance — no laggy nonsense</li>
                    <li>• Practical features users will actually use</li>
                    <li>• If it doesn't add value, I don't build it</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-border">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="/logo.jpg" alt="CBT Nexus" className="h-8 w-8 rounded-lg" />
            <span className="font-bold gradient-text">CBT Nexus</span>
          </div>
          <p className="text-muted-foreground text-sm">© 2026 CBT Nexus. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
