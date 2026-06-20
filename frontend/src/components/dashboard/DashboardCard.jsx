import { Card, CardContent, CardHeader, CardTitle } from '@/components/common/Card'
import { cn } from '@/utils/helpers'

export function DashboardCard({ title, value, icon: Icon, trend, className, accent = 'primary' }) {
  const accentColors = {
    primary: 'text-primary bg-primary/15 border-primary/20',
    accent: 'text-accent bg-accent/15 border-accent/20',
    success: 'text-success bg-success/15 border-success/20',
    warning: 'text-warning bg-warning/15 border-warning/20',
  }

  return (
    <Card className={cn('animate-slide-up', className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {Icon && (
          <div className={cn('rounded-lg border p-2', accentColors[accent])}>
            <Icon className="h-4 w-4" />
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
        {trend && <p className="mt-1 text-xs text-muted-foreground">{trend}</p>}
      </CardContent>
    </Card>
  )
}
