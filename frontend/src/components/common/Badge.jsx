import { cva } from 'class-variance-authority'
import { cn } from '@/utils/helpers'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'border-primary/30 bg-primary/15 text-primary',
        secondary: 'border-white/10 bg-white/5 text-muted-foreground',
        success: 'border-success/30 bg-success/15 text-success',
        warning: 'border-warning/30 bg-warning/15 text-warning',
        danger: 'border-danger/30 bg-danger/15 text-danger',
        accent: 'border-accent/30 bg-accent/15 text-accent',
        outline: 'border-white/20 text-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

function Badge({ className, variant, ...props }) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
