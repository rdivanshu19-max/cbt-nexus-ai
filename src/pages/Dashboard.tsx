import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/DashboardLayout';
import { NexusAIChat } from '@/components/NexusAIChat';
import { TutorialPopup } from '@/components/TutorialPopup';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Flame, Target, TrendingUp, BookOpen, Award, AlertTriangle, Brain, History } from 'lucide-react';

interface DashboardStats {
  totalTests: number;
  averageScore: number;
  averageAccuracy: number;
  currentStreak: number;
  longestStreak: number;
  strongSubjects: string[];
  weakSubjects: string[];
  totalCorrect: number;
  totalWrong: number;
  totalUnattempted: number;
}

const Dashboard = () => {
  const { user, profile } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalTests: 0, averageScore: 0, averageAccuracy: 0,
    currentStreak: 0, longestStreak: 0,
    strongSubjects: [], weakSubjects: [],
    totalCorrect: 0, totalWrong: 0, totalUnattempted: 0,
  });
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    if (profile && !profile.has_seen_tutorial) {
      setShowTutorial(true);
    }
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    const fetchStats = async () => {
      const { data: attempts } = await supabase
        .from('test_attempts')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'completed');

      const { data: streak } = await supabase
        .from('study_streaks')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (attempts && attempts.length > 0) {
        const totalTests = attempts.length;
        const avgScore = attempts.reduce((s, a) => s + (a.total_score || 0), 0) / totalTests;
        const avgAccuracy = attempts.reduce((s, a) => s + (a.accuracy_percentage || 0), 0) / totalTests;
        const totalCorrect = attempts.reduce((s, a) => s + (a.correct_count || 0), 0);
        const totalWrong = attempts.reduce((s, a) => s + (a.wrong_count || 0), 0);
        const totalUnattempted = attempts.reduce((s, a) => s + (a.unattempted_count || 0), 0);

        setStats({
          totalTests,
          averageScore: Math.round(avgScore * 10) / 10,
          averageAccuracy: Math.round(avgAccuracy * 10) / 10,
          currentStreak: streak?.current_streak || 0,
          longestStreak: streak?.longest_streak || 0,
          strongSubjects: [],
          weakSubjects: [],
          totalCorrect,
          totalWrong,
          totalUnattempted,
        });
      } else if (streak) {
        setStats(prev => ({
          ...prev,
          currentStreak: streak.current_streak || 0,
          longestStreak: streak.longest_streak || 0,
        }));
      }
    };
    fetchStats();
  }, [user]);

  const closeTutorial = async () => {
    setShowTutorial(false);
    if (user) {
      await supabase.from('profiles').update({ has_seen_tutorial: true }).eq('user_id', user.id);
    }
  };

  const statCards = [
    { icon: BookOpen, label: 'Tests Taken', value: stats.totalTests, color: 'text-info' },
    { icon: Target, label: 'Avg Score', value: stats.averageScore, color: 'text-primary' },
    { icon: TrendingUp, label: 'Avg Accuracy', value: `${stats.averageAccuracy}%`, color: 'text-success' },
    { icon: Flame, label: 'Current Streak', value: `${stats.currentStreak} days`, color: 'text-warning' },
    { icon: Award, label: 'Correct Answers', value: stats.totalCorrect, color: 'text-success' },
    { icon: AlertTriangle, label: 'Wrong Answers', value: stats.totalWrong, color: 'text-destructive' },
  ];

  return (
    <DashboardLayout>
      {showTutorial && <TutorialPopup onClose={closeTutorial} />}
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Welcome back, <span className="gradient-text">{profile?.username || 'Student'}</span>!</h1>
          <p className="text-muted-foreground mt-1">Here's your preparation overview</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {statCards.map((s, i) => (
            <Card key={i} className="glass-card">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-secondary ${s.color}`}>
                    <s.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{s.value}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="glass-card border-primary/20">
            <CardContent className="p-6 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Need a full record?</p>
                <h2 className="text-xl font-semibold">See your test history</h2>
              </div>
              <Link to="/history" className="inline-flex items-center gap-2 rounded-lg px-4 py-2 gradient-primary text-primary-foreground font-medium">
                <History className="h-4 w-4" /> Open History
              </Link>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground mb-1">Nexus AI next step</p>
              <p className="font-medium">Ask Nexus AI for a plan based on your latest weak areas and score trend.</p>
            </CardContent>
          </Card>
        </div>

        {stats.totalTests === 0 && (
          <Card className="glass-card border-primary/20">
            <CardContent className="p-8 text-center">
              <Brain className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Ready to start?</h3>
              <p className="text-muted-foreground mb-4">Take your first test and see detailed analytics here.</p>
              <a href="/tests" className="inline-flex items-center gap-2 px-6 py-3 rounded-lg gradient-primary text-primary-foreground font-semibold">
                Browse Tests
              </a>
            </CardContent>
          </Card>
        )}

        {stats.totalTests > 0 && (
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="glass-card">
              <CardHeader><CardTitle className="text-lg">Performance Summary</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Total Questions Attempted</span>
                    <span className="font-semibold">{stats.totalCorrect + stats.totalWrong}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Unattempted</span>
                    <span className="font-semibold">{stats.totalUnattempted}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Longest Streak</span>
                    <span className="font-semibold">{stats.longestStreak} days</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardHeader><CardTitle className="text-lg">Today's Plan</CardTitle></CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Chat with Nexus AI to get a personalized study plan for today based on your performance.</p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
      <NexusAIChat />
    </DashboardLayout>
  );
};

export default Dashboard;
