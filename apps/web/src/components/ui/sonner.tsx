/*
 * Sonner Toast Provider
 * Version: 1.0.0
 *
 * shadcn/ui style wrapper for sonner toast notifications.
 *
 * ===================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Signed: 2026-01-13
 * Change: Fase 17.4 - UI Notifications for contradiction detection
 * ===================================================================
 */

import { Toaster as Sonner } from 'sonner';

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="system"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg',
          description: 'group-[.toast]:text-muted-foreground',
          actionButton: 'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
          cancelButton: 'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
          error:
            'group-[.toaster]:bg-error-muted group-[.toaster]:text-error group-[.toaster]:border-error/20',
          warning:
            'group-[.toaster]:bg-warning-muted group-[.toaster]:text-warning group-[.toaster]:border-warning/20',
          success:
            'group-[.toaster]:bg-success-muted group-[.toaster]:text-success group-[.toaster]:border-success/20',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
