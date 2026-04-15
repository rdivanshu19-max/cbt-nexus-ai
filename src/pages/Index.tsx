import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { BookOpen, Brain, BarChart3, Zap, Shield, Users } from 'lucide-react';

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.jpg" alt="CBT Nexus" className="h-10 w-10 rounded-lg" />
            <span className="text-xl font-bold gradient-text">CBT Nexus</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/auth">
              <Button variant="ghost" className="text-foreground">Log In</Button>
            </Link>
            <Link to="/auth?mode=signup">
              <Button className="gradient-primary text-primary-foreground font-semibold">Sign Up</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="container mx-auto text-center max-w-4xl">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8">
            <Zap className="h-4 w-4 text-primary" />
            <span className="text-sm text-primary font-medium">AI-Powered Exam Preparation</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            Master Your <span className="gradient-text">Competitive Exams</span> with AI
          </h1>
          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            Real CBT experience for JEE & NEET. AI-generated tests, deep analytics, and personalized preparation — all in one platform.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/auth?mode=signup">
              <Button size="lg" className="gradient-primary text-primary-foreground font-semibold text-lg px-8 py-6">
                Start Preparing Free
              </Button>
            </Link>
            <Link to="/auth">
              <Button size="lg" variant="outline" className="text-lg px-8 py-6 border-border">
                Already have an account
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">Why CBT Nexus?</h2>
          <p className="text-muted-foreground text-center mb-16 max-w-2xl mx-auto">
            Everything you need to crack JEE & NEET in one intelligent platform.
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: BookOpen, title: 'Real CBT Experience', desc: 'Exam-like interface with timer, question navigation, and marking scheme identical to actual JEE/NEET exams.' },
              { icon: Brain, title: 'AI-Generated Tests', desc: 'Generate full-length or chapter-wise tests instantly. No duplicate questions, exam-level quality.' },
              { icon: BarChart3, title: 'Deep Analytics', desc: 'Score breakdown, accuracy, time analysis, weak topics, and personalized improvement suggestions.' },
              { icon: Zap, title: 'Nexus AI Assistant', desc: 'Chat with AI that knows your performance. Get doubts cleared, study plans, and daily recommendations.' },
              { icon: Shield, title: 'PDF to CBT Conversion', desc: 'Upload any test PDF and our AI converts it into a real CBT exam with auto-generated answer keys.' },
              { icon: Users, title: 'Custom Tests', desc: 'Create your own tests with custom marking schemes, or let AI generate subject/chapter-wise papers.' },
            ].map((f, i) => (
              <div key={i} className="glass-card p-8 hover:border-primary/30 transition-all group">
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

      {/* Marking Scheme */}
      <section className="py-20 px-6 bg-card/50">
        <div className="container mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold mb-8">Marking Scheme</h2>
          <div className="grid grid-cols-3 gap-6 mb-8">
            <div className="glass-card p-6">
              <div className="text-3xl font-bold text-success">+4</div>
              <div className="text-muted-foreground mt-2">Correct Answer</div>
            </div>
            <div className="glass-card p-6">
              <div className="text-3xl font-bold text-destructive">−1</div>
              <div className="text-muted-foreground mt-2">Wrong Answer</div>
            </div>
            <div className="glass-card p-6">
              <div className="text-3xl font-bold text-muted-foreground">0</div>
              <div className="text-muted-foreground mt-2">Unattempted</div>
            </div>
          </div>
          <p className="text-muted-foreground">Marked for review questions are counted normally if answered, or scored 0 if left blank.</p>
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
