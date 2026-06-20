import { Outlet } from 'react-router-dom'
import { Eye } from 'lucide-react'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { MobileNav } from '@/components/dashboard/MobileNav'
import { ThemeToggle } from '@/components/common/ThemeToggle'
import { useAuth } from '@/hooks/useAuth'

export function DashboardLayout() {
  const { role } = useAuth()

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Sidebar role={role} />
      <MobileNav role={role} />
      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-card/70 px-4 py-3 backdrop-blur-xl md:hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20">
            <Eye className="h-4 w-4 text-primary" />
          </div>
          <span className="font-bold tracking-tight">HIRELENS</span>
        </div>
        <ThemeToggle />
      </header>
      <main className="min-h-screen p-4 md:ml-64 md:p-6 lg:p-8">
        <Outlet />
      </main>
    </div>
  )
}

export function InterviewRoomLayout() {
  return (
    <div className="min-h-screen bg-background p-4 lg:p-6">
      <Outlet />
    </div>
  )
}
