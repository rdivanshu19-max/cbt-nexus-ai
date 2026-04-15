import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/DashboardLayout';
import { NexusAIChat } from '@/components/NexusAIChat';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Brain, Loader2 } from 'lucide-react';

const subjects = {
  JEE: ['Physics', 'Chemistry', 'Mathematics'],
  NEET: ['Physics', 'Chemistry', 'Biology'],
};

const chapters: Record<string, string[]> = {
  Physics: ['Mechanics', 'Thermodynamics', 'Waves & Oscillations', 'Optics', 'Electrostatics', 'Current Electricity', 'Magnetism', 'Modern Physics', 'Electromagnetic Waves'],
  Chemistry: ['Atomic Structure', 'Chemical Bonding', 'Thermochemistry', 'Equilibrium', 'Organic Chemistry', 'Electrochemistry', 'Solutions', 'Chemical Kinetics', 'Polymers'],
  Mathematics: ['Algebra', 'Trigonometry', 'Calculus', 'Coordinate Geometry', 'Vectors', 'Probability', 'Matrices', 'Complex Numbers', 'Sequences & Series'],
  Biology: ['Cell Biology', 'Genetics', 'Ecology', 'Human Physiology', 'Plant Physiology', 'Evolution', 'Biotechnology', 'Anatomy', 'Reproduction'],
};

const GenerateTest = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [examType, setExamType] = useState<'JEE' | 'NEET'>('JEE');
  const [testScope, setTestScope] = useState<'full' | 'class' | 'subject' | 'chapter'>('full');
  const [classLevel, setClassLevel] = useState<'11' | '12'>('11');
  const [subject, setSubject] = useState('');
  const [chapter, setChapter] = useState('');
  const [generating, setGenerating] = useState(false);

  const getTestConfig = () => {
    if (examType === 'JEE') {
      if (testScope === 'full') return { questions: 75, marks: 300, duration: 180, title: 'JEE Full Test' };
      if (testScope === 'subject') return { questions: 25, marks: 100, duration: 60, title: `JEE ${subject} Test` };
      if (testScope === 'chapter') return { questions: 15, marks: 60, duration: 30, title: `JEE ${subject} - ${chapter}` };
      return { questions: 75, marks: 300, duration: 180, title: `JEE Class ${classLevel} Test` };
    }
    if (testScope === 'full') return { questions: 180, marks: 720, duration: 180, title: 'NEET Full Test' };
    if (testScope === 'subject') return { questions: subject === 'Biology' ? 90 : 45, marks: subject === 'Biology' ? 360 : 180, duration: subject === 'Biology' ? 90 : 45, title: `NEET ${subject} Test` };
    if (testScope === 'chapter') return { questions: 15, marks: 60, duration: 30, title: `NEET ${subject} - ${chapter}` };
    return { questions: 180, marks: 720, duration: 180, title: `NEET Class ${classLevel} Test` };
  };

  const handleGenerate = async () => {
    if (!user) return;
    setGenerating(true);
    try {
      const config = getTestConfig();
      const FUNC_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-test`;
      const resp = await fetch(FUNC_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          examType, testScope, classLevel, subject, chapter, userId: user.id,
          ...config,
        }),
      });

      if (!resp.ok) throw new Error('Failed to generate test');
      const data = await resp.json();
      toast({ title: 'Test generated!', description: `${config.title} is ready.` });
      navigate(`/test/${data.testId}`);
    } catch (err: any) {
      toast({ title: 'Generation failed', description: err.message, variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">AI Test Generator</h1>
          <p className="text-muted-foreground mt-1">Generate exam-quality questions instantly</p>
        </div>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Brain className="h-5 w-5 text-primary" /> Configure Your Test</CardTitle>
            <CardDescription>AI will generate unique, exam-level questions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Exam Type</Label>
                <Select value={examType} onValueChange={(v: 'JEE' | 'NEET') => { setExamType(v); setSubject(''); setChapter(''); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="JEE">JEE</SelectItem>
                    <SelectItem value="NEET">NEET</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Test Scope</Label>
                <Select value={testScope} onValueChange={(v: any) => { setTestScope(v); setSubject(''); setChapter(''); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full">Full Syllabus</SelectItem>
                    <SelectItem value="class">Class-wise</SelectItem>
                    <SelectItem value="subject">Subject-wise</SelectItem>
                    <SelectItem value="chapter">Chapter-wise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {testScope === 'class' && (
              <div className="space-y-2">
                <Label>Class</Label>
                <Select value={classLevel} onValueChange={(v: '11' | '12') => setClassLevel(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="11">Class 11</SelectItem>
                    <SelectItem value="12">Class 12</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {(testScope === 'subject' || testScope === 'chapter') && (
              <div className="space-y-2">
                <Label>Subject</Label>
                <Select value={subject} onValueChange={v => { setSubject(v); setChapter(''); }}>
                  <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                  <SelectContent>
                    {subjects[examType].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {testScope === 'chapter' && subject && (
              <div className="space-y-2">
                <Label>Chapter</Label>
                <Select value={chapter} onValueChange={setChapter}>
                  <SelectTrigger><SelectValue placeholder="Select chapter" /></SelectTrigger>
                  <SelectContent>
                    {chapters[subject]?.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="p-4 rounded-xl bg-secondary text-sm space-y-1">
              <p><span className="text-muted-foreground">Questions:</span> <span className="font-semibold">{getTestConfig().questions}</span></p>
              <p><span className="text-muted-foreground">Total Marks:</span> <span className="font-semibold">{getTestConfig().marks}</span></p>
              <p><span className="text-muted-foreground">Duration:</span> <span className="font-semibold">{getTestConfig().duration} minutes</span></p>
              <p><span className="text-muted-foreground">Marking:</span> <span className="font-semibold">+4 / −1 / 0</span></p>
            </div>

            <Button onClick={handleGenerate} className="w-full gradient-primary text-primary-foreground font-semibold" disabled={generating || (testScope === 'subject' && !subject) || (testScope === 'chapter' && (!subject || !chapter))}>
              {generating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating...</> : <><Brain className="h-4 w-4 mr-2" /> Generate Test</>}
            </Button>
          </CardContent>
        </Card>
      </div>
      <NexusAIChat />
    </DashboardLayout>
  );
};

export default GenerateTest;
