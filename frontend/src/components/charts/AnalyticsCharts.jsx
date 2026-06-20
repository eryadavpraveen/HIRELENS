import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/common/Card'
import { EmptyState } from '@/components/common/LoadingSpinner'
import { BarChart3, PieChart as PieIcon, TrendingUp } from 'lucide-react'
import { CATEGORY_LIST, SEVERITY_STYLES } from '@/utils/violations'

const tooltipStyle = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '0.5rem',
  color: 'hsl(var(--foreground))',
  fontSize: '12px',
}

const axisProps = {
  stroke: 'hsl(var(--muted-foreground))',
  fontSize: 11,
  tickLine: false,
}

/** Integrity score trend over recent interviews (area chart). */
export function IntegrityTrendChart({ data = [], title = 'Integrity Score Trend' }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">{title}</CardTitle>
        <TrendingUp className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <EmptyState icon={TrendingUp} title="No trend data" />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="integrityGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563EB" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="interview" {...axisProps} />
              <YAxis domain={[0, 100]} {...axisProps} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: 'hsl(var(--border))' }} />
              <Area
                type="monotone"
                dataKey="score"
                stroke="#2563EB"
                strokeWidth={2.5}
                fill="url(#integrityGradient)"
                dot={{ r: 3, fill: '#2563EB' }}
                activeDot={{ r: 5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}

/** Violation distribution by category (donut chart). */
export function ViolationDistributionChart({ counts = {}, title = 'Violation Distribution' }) {
  const data = CATEGORY_LIST
    .map((c) => ({ name: c.label.replace(' Violations', ''), value: counts[c.key] || 0, color: SEVERITY_STYLES[c.severity].hex }))
    .filter((d) => d.value > 0)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">{title}</CardTitle>
        <PieIcon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <EmptyState icon={PieIcon} title="No violations" description="Nothing to distribute — a clean session." />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={2}
                stroke="hsl(var(--card))"
              >
                {data.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend
                wrapperStyle={{ fontSize: '11px' }}
                iconType="circle"
                layout="horizontal"
                align="center"
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}

/** Candidate integrity comparison (bar chart). */
export function CandidateComparisonChart({ data = [], title = 'Candidate Comparison' }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">{title}</CardTitle>
        <BarChart3 className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <EmptyState icon={BarChart3} title="No candidate data" />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="name" {...axisProps} />
              <YAxis domain={[0, 100]} {...axisProps} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'hsl(var(--muted) / 0.4)' }} />
              <Bar dataKey="score" radius={[6, 6, 0, 0]} maxBarSize={48}>
                {data.map((entry, i) => {
                  const color = entry.score >= 85 ? '#22C55E' : entry.score >= 70 ? '#10B981' : entry.score >= 50 ? '#F97316' : '#EF4444'
                  return <Cell key={i} fill={color} />
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
