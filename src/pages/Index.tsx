import { Link } from 'react-router-dom';
import { ThemeToggle } from '@/components/ThemeToggle';
import { UIIntensityToggle } from '@/components/UIIntensityToggle';
import { Button } from '@/components/ui/button';
import { Hero3D } from '@/components/Hero3D';
import {
  BookOpen, Brain, BarChart3, Zap, Shield, ArrowRight, Sparkles, FileCheck2, Trophy,
  Heart, ExternalLink, Code2, Rocket, Briefcase, Mail, Globe, Cpu, Palette, Target,
  Activity, Timer, Layers, Flag, Bookmark, Wand2,
} from 'lucide-react';
import rankersStarsLogo from '@/assets/rankers-stars-logo.jpg';

const Index = () => {
  const arsenal = [
    { icon: FileCheck2, tag: 'PDF → CBT', title: 'Paper to mission', desc: 'Drop a PDF. Real exam interface. No retyping.', color: 'text-primary' },
    { icon: Brain, tag: 'AI Tests', title: 'Generated drills', desc: 'JEE / NEET full mocks, subject papers, chapter raids.', color: 'text-accent' },
    { icon: BarChart3, tag: 'Analytics', title: 'Brutal scoreboard', desc: 'Score, accuracy, timing, leaks. Zero sugar.', color: 'text-info' },
    { icon: Zap, tag: 'Nexus AI', title: 'Always-on coach', desc: 'Ask. Plan. Recover. Trained on your attempts.', color: 'text-magenta' },
    { icon: Sparkles, tag: 'Short Notes', title: 'AI rapid notes', desc: 'Concise / descriptive notes + revision flashcards.', color: 'text-primary' },
    { icon: Bookmark, tag: 'Save & Review', title: 'Personal vault', desc: 'Bookmark chapters, reopen any time, revise smarter.', color: 'text-accent' },
    { icon: Timer, tag: 'Mission HUD', title: 'Real exam pressure', desc: 'Timer, navigator, marks, autosave. Like the real one.', color: 'text-warning' },
    { icon: Trophy, tag: 'History', title: 'Every attempt logged', desc: 'A trackable record of every exam you faced.', color: 'text-success' },
  ];

  const flow = [
    { n: '01', tag: 'Drop', title: 'Bring your paper', desc: 'Upload PDF, generate with AI, or pick official.' },
    { n: '02', tag: 'Fight', title: 'Sit the mission', desc: 'Real CBT console. Timer. Navigator. Autosave.' },
    { n: '03', tag: 'Decode', title: 'Read the report', desc: 'Score, accuracy, time-per-question, weak topics.' },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="container mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <img src="/logo.jpg" alt="CBT Nexus" className="h-9 w-9 rounded-lg ring-1 ring-border" />
            <div className="leading-tight">
              <p className="hidden sm:block text-[10px] font-mono-hud uppercase tracking-[0.32em] text-muted-foreground">// nexus</p>
              <span className="text-base sm:text-lg font-display font-bold">CBT NEXUS</span>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <UIIntensityToggle />
            <ThemeToggle />
            <Link to="/auth" className="hidden sm:inline-flex">
              <Button variant="ghost" size="sm">Log In</Button>
            </Link>
            <Link to="/auth?mode=signup">
              <Button size="sm" className="gradient-primary text-primary-foreground font-semibold shadow-md">Sign Up</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative pt-24 sm:pt-32 pb-14 sm:pb-20 overflow-hidden">
        <div className="absolute inset-0 hero-mesh" />
        <div className="absolute inset-0 grid-overlay opacity-60" />
        <div className="absolute inset-0 hidden lg:block opacity-90">
          <Hero3D />
        </div>

        <div className="container relative mx-auto px-4 sm:px-6">
          <div className="max-w-5xl">
            <p className="section-tag text-primary mb-5">CBT, REIMAGINED</p>
            <h1 className="font-display font-black leading-[0.95] tracking-tight text-[2.4rem] xs:text-5xl sm:text-6xl md:text-7xl lg:text-[5.5rem]">
              REAL EXAM
              <br />
              <span className="gradient-text-aurora animate-aurora">PRESSURE.</span>
              <br />
              SMARTER PREP.
            </h1>
            <p className="mt-6 max-w-2xl text-base sm:text-lg text-muted-foreground">
              CBT Nexus turns official PDFs, custom papers, and AI-generated exams into a real mission console — with analytics, AI short notes, and a personal study copilot.
            </p>

            <div className="mt-7 flex flex-col sm:flex-row gap-3">
              <Link to="/auth?mode=signup" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto gradient-primary text-primary-foreground font-semibold text-base px-7 py-6 soft-glow">
                  Start preparing free <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
              <Link to="/auth" className="w-full sm:w-auto">
                <Button size="lg" variant="outline" className="w-full sm:w-auto text-base px-7 py-6">
                  I already have an account
                </Button>
              </Link>
            </div>

            {/* Quick stat strip */}
            <div className="mt-9 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 max-w-3xl">
              {[
                { k: '3', l: 'Test modes' },
                { k: 'JEE+NEET', l: 'Built for' },
                { k: 'AI', l: 'Short notes' },
                { k: '∞', l: 'Mock attempts' },
              ].map((s) => (
                <div key={s.l} className="ink-card px-3 py-3">
                  <p className="font-display font-bold text-lg sm:text-2xl text-foreground">{s.k}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground font-mono-hud uppercase tracking-[0.18em] mt-1">{s.l}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* GOAL */}
      <section className="py-14 sm:py-20 px-4 sm:px-6">
        <div className="container mx-auto text-center max-w-4xl">
          <p className="section-tag text-primary mb-4 justify-center inline-flex">OUR GOAL</p>
          <h2 className="font-display font-black tracking-tight text-3xl sm:text-5xl md:text-6xl leading-[1.05] mb-6">
            Preparation, <span className="gradient-text-aurora animate-aurora">re-engineered.</span>
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto">
            Other platforms give you content, tests and scores. CBT Nexus combines AI, real exam UI and behavior analytics — turning passive studying into an adaptive mission for the world's hardest exams.
          </p>
        </div>
      </section>

      {/* ARSENAL */}
      <section className="pb-14 sm:pb-20 px-4 sm:px-6">
        <div className="container mx-auto">
          <div className="text-center mb-8 sm:mb-12">
            <p className="section-tag text-accent mb-3 justify-center inline-flex">THE ARSENAL</p>
            <h2 className="font-display font-black tracking-tight text-3xl sm:text-5xl md:text-6xl leading-[1.05]">
              8 weapons. <span className="text-foreground/70">One mission.</span>
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            {arsenal.map((f) => (
              <div key={f.title} className="ink-card p-4 sm:p-5 group hover-lift">
                <div className={`h-9 w-9 rounded-lg bg-secondary flex items-center justify-center mb-3 ${f.color}`}>
                  <f.icon className="h-4 w-4" />
                </div>
                <p className="text-[10px] font-mono-hud uppercase tracking-[0.22em] text-muted-foreground">// {f.tag}</p>
                <h3 className="text-sm sm:text-base font-display font-bold mt-1">{f.title}</h3>
                <p className="text-xs sm:text-sm text-muted-foreground mt-2 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FLOW */}
      <section className="pb-14 sm:pb-20 px-4 sm:px-6">
        <div className="container mx-auto">
          <div className="text-center mb-8 sm:mb-12">
            <p className="section-tag text-primary mb-3 justify-center inline-flex">THE LOOP</p>
            <h2 className="font-display font-black tracking-tight text-3xl sm:text-5xl md:text-6xl leading-[1.05]">
              Drop. Fight. Decode.
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-5">
            {flow.map((s) => (
              <div key={s.n} className="ink-card p-5 sm:p-6 relative overflow-hidden">
                <div className="absolute -right-3 -top-3 font-display font-black text-7xl sm:text-8xl text-primary/10 select-none">{s.n}</div>
                <p className="section-tag text-primary mb-3">{s.tag}</p>
                <h3 className="font-display font-bold text-xl sm:text-2xl mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ECOSYSTEM */}
      <section className="pb-14 sm:pb-20 px-4 sm:px-6">
        <div className="container mx-auto">
          <div className="text-center mb-8 sm:mb-12">
            <p className="section-tag text-accent mb-3 justify-center inline-flex">THE ECOSYSTEM</p>
            <h2 className="font-display font-black tracking-tight text-3xl sm:text-5xl md:text-6xl leading-[1.05]">
              Built alongside.
            </h2>
            <p className="text-muted-foreground mt-3">CBT Nexus is part of a wider system for serious aspirants.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <a href="https://rankers-stars.vercel.app/" target="_blank" rel="noopener noreferrer" className="ink-card p-5 sm:p-6 group hover-lift">
              <div className="flex items-center gap-3 mb-3">
                <img src={rankersStarsLogo} alt="Rankers Stars" className="h-12 w-12 rounded-xl object-cover ring-1 ring-border" />
                <div>
                  <p className="section-tag text-primary">PARTNER</p>
                  <h3 className="font-display font-bold text-xl sm:text-2xl">Rankers Stars</h3>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">Free lectures, 700+ JEE materials, AI tests, AI mentor — one structured ecosystem instead of 20 tabs.</p>
              <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary">Open Rankers Stars <ExternalLink className="h-3.5 w-3.5" /></div>
            </a>
            <div className="ink-card p-5 sm:p-6 hover-lift">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-12 w-12 rounded-xl gradient-primary flex items-center justify-center text-primary-foreground">
                  <Activity className="h-5 w-5" />
                </div>
                <div>
                  <p className="section-tag text-accent">ENGINE</p>
                  <h3 className="font-display font-bold text-xl sm:text-2xl">Nexus CBT</h3>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">Real exam-like interface, timed tests, performance analytics, PDF → test converter, flashcards, AI doubt support and a special revision section.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="pb-16 sm:pb-24 px-4 sm:px-6">
        <div className="container mx-auto">
          <div className="ink-card relative overflow-hidden p-6 sm:p-10 md:p-14 text-center">
            <div className="absolute inset-0 hero-mesh opacity-70" />
            <div className="relative">
              <p className="section-tag text-primary mb-4 justify-center inline-flex">READY?</p>
              <h2 className="font-display font-black tracking-tight text-3xl sm:text-5xl md:text-6xl leading-[1.05] mb-4">
                Practice like the <span className="gradient-text">real thing.</span>
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto mb-7 text-sm sm:text-base">
                Create your account once. Build a full CBT routine around official papers, AI tests and revision insight.
              </p>
              <Link to="/auth?mode=signup">
                <Button size="lg" className="gradient-primary text-primary-foreground font-semibold px-8 py-6">
                  Create your CBT account
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* About developer */}
      <section id="about-developer" className="pb-20 px-4 sm:px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="ink-card p-6 sm:p-10 md:p-14 relative overflow-hidden">
            <div className="absolute -top-24 -right-24 h-60 w-60 rounded-full bg-primary/15 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-accent/15 blur-3xl pointer-events-none" />

            <div className="relative grid gap-8 lg:grid-cols-[1.1fr_1fr] items-start">
              <div>
                <p className="section-tag text-primary mb-4">BUILT BY</p>
                <h2 className="font-display font-black tracking-tight text-3xl sm:text-4xl md:text-5xl leading-[1.05] mb-5">
                  Hi, I'm <span className="gradient-text">GCD</span>.
                </h2>
                <p className="text-base text-muted-foreground mb-4">
                  I build practical, high-impact digital products. Currently building <strong>Rankers Stars</strong>, an AI platform for JEE aspirants.
                </p>
                <p className="text-base text-muted-foreground mb-7">
                  I also freelance — turning ideas into real products from landing pages to full platforms.
                </p>
                <div className="flex flex-wrap gap-3">
                  <a href="mailto:studyspacerankers@gmail.com">
                    <Button className="gradient-primary text-primary-foreground font-semibold">
                      <Mail className="h-4 w-4 mr-2" /> Work with me
                    </Button>
                  </a>
                  <a href="https://divyanshuportfolio-beta.vercel.app/" target="_blank" rel="noopener noreferrer">
                    <Button variant="outline">
                      <Globe className="h-4 w-4 mr-2" /> Portfolio
                    </Button>
                  </a>
                </div>
                <p className="text-xs text-muted-foreground mt-4 break-all">📩 studyspacerankers@gmail.com</p>
              </div>

              <div className="grid gap-3">
                <div className="ink-card p-5">
                  <p className="section-tag text-accent mb-2">FREELANCE</p>
                  <ul className="space-y-1.5 text-sm text-muted-foreground">
                    <li>• Coaching institute websites</li>
                    <li>• Restaurant websites with modern UI</li>
                    <li>• Full coaching platforms & apps</li>
                    <li>• High-end 3D animated experiences</li>
                  </ul>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { icon: Code2, label: 'Full-stack web' },
                    { icon: Cpu, label: 'AI & automation' },
                    { icon: Palette, label: '3D & animation' },
                    { icon: BookOpen, label: 'EdTech platforms' },
                  ].map((s) => (
                    <div key={s.label} className="ink-card p-3 flex items-center gap-2.5">
                      <s.icon className="h-4 w-4 text-primary shrink-0" />
                      <span className="text-xs sm:text-sm font-medium">{s.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-4 sm:px-6 border-t border-border">
        <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img src="/logo.jpg" alt="CBT Nexus" className="h-8 w-8 rounded-lg" />
            <span className="font-display font-bold">CBT NEXUS</span>
          </div>
          <p className="text-muted-foreground text-xs font-mono-hud uppercase tracking-[0.2em]">© 2026 // CBT NEXUS</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
