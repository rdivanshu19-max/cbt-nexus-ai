import { ReactNode } from 'react';

interface PageHeaderProps {
  chip: string;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
}

/** Chip label + display headline used across every dashboard page. */
export const PageHeader = ({ chip, title, subtitle, actions }: PageHeaderProps) => (
  <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
    <div className="min-w-0">
      <p className="section-tag text-primary mb-3">{chip}</p>
      <h1 className="font-display font-black tracking-tight text-2xl sm:text-3xl md:text-4xl leading-tight">
        {title}
      </h1>
      {subtitle && <p className="text-muted-foreground mt-2 text-sm sm:text-base">{subtitle}</p>}
    </div>
    {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
  </div>
);

interface WindowCardProps {
  title?: string;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  right?: ReactNode;
}

/** Mock-browser style surface: traffic-light dots bar + body. */
export const WindowCard = ({ title, children, className = '', bodyClassName = 'p-4 sm:p-6', right }: WindowCardProps) => (
  <div className={`window-card ${className}`}>
    <div className="window-bar">
      <div className="window-dots">
        <span className="bg-destructive/70" />
        <span className="bg-warning/70" />
        <span className="bg-success/70" />
      </div>
      {title && <span className="text-xs font-mono-hud text-muted-foreground truncate">{title}</span>}
      {right && <div className="ml-auto">{right}</div>}
    </div>
    <div className={bodyClassName}>{children}</div>
  </div>
);
