import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';

export const ProcessingDialog = ({ open, title = 'Processing your PDF', description }: { open: boolean; title?: string; description?: string }) => {
  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            {title}
          </DialogTitle>
          <DialogDescription>
            {description || 'AI is reading every page and extracting questions. This can take 30 seconds to 2 minutes depending on the PDF size. Please keep this window open.'}
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-3 rounded-xl bg-secondary/40 p-4 text-sm">
          <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          <span className="text-muted-foreground">Do not close or refresh this page…</span>
        </div>
      </DialogContent>
    </Dialog>
  );
};
