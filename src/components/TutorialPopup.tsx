import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

const steps = [
  {
    title: '🎯 Welcome to CBT Nexus!',
    content: 'This is your AI-powered CBT (Computer-Based Test) platform for JEE & NEET preparation. Let\'s show you how it works!',
  },
  {
    title: '🖥️ CBT Interface',
    content: 'Tests are displayed just like real JEE/NEET exams with a timer, question panel, and navigation. You can jump between questions freely.',
  },
  {
    title: '🎨 Question Status Colors',
    content: '🟢 Green = Attempted\n🔴 Red = Not Attempted\n🟠 Orange = Marked for Review\n\nUse "Mark for Review" to flag questions you want to revisit.',
  },
  {
    title: '🧮 Marking Scheme',
    content: '✅ Correct: +4 marks\n❌ Wrong: −1 mark\n⬜ Unattempted: 0 marks\n\nMarked for review questions are scored normally if answered.',
  },
  {
    title: '📊 Deep Analysis',
    content: 'After submission, you\'ll see detailed analysis: score breakdown, accuracy, time per question, weak topics, and explanations for every question.',
  },
  {
    title: '🤖 Nexus AI',
    content: 'Use the floating AI chat button to ask doubts, get study plans, and receive personalized recommendations based on your performance!',
  },
];

export const TutorialPopup = ({ onClose }: { onClose: () => void }) => {
  const [step, setStep] = useState(0);

  const handleClose = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="glass-card max-w-lg w-full p-8 relative">
        <button type="button" onClick={handleClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
          <X className="h-5 w-5" />
        </button>
        <div className="mb-6">
          <div className="flex gap-1 mb-6">
            {steps.map((_, i) => (
              <div key={i} className={`h-1 flex-1 rounded-full ${i <= step ? 'bg-primary' : 'bg-secondary'}`} />
            ))}
          </div>
          <h2 className="text-2xl font-bold mb-4">{steps[step].title}</h2>
          <p className="text-muted-foreground whitespace-pre-line leading-relaxed">{steps[step].content}</p>
        </div>
        <div className="flex justify-between">
          <Button type="button" variant="ghost" onClick={() => (step > 0 ? setStep(step - 1) : handleClose())} className="text-muted-foreground">
            {step === 0 ? 'Skip' : 'Back'}
          </Button>
          <Button type="button" onClick={() => (step < steps.length - 1 ? setStep(step + 1) : handleClose())} className="gradient-primary text-primary-foreground">
            {step === steps.length - 1 ? 'Get Started!' : 'Next'}
          </Button>
        </div>
      </div>
    </div>
  );
};
