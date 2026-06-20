import {
  LayoutDashboard,
  Video,
  History,
  FileText,
  User,
  PlusCircle,
  Radio,
  Users,
  LogOut,
  Eye,
} from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { cn } from '@/utils/helpers'
import { NAV_ITEMS } from '@/utils/constants'
import { logoutUser } from '@/features/auth/authSlice'
import { Button } from '@/components/common/Button'
import { Separator } from '@/components/common/Separator'
import { ThemeToggle } from '@/components/common/ThemeToggle'
import { useAuth } from '@/hooks/useAuth'

const ICON_MAP = {
  LayoutDashboard,
  Video,
  History,
  FileText,
  User,
  PlusCircle,
  Radio,
  Users,
}

export function Sidebar({ role }) {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { user } = useAuth()
  const items = NAV_ITEMS[role] || []

  const handleLogout = async () => {
    await dispatch(logoutUser())
    navigate('/login')
  }

  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 flex-col border-r border-border bg-card/60 backdrop-blur-xl md:flex">
      <div className="flex items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/20">
            <Eye className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">HIRELENS</h1>
            <p className="text-xs text-muted-foreground capitalize">{role} Portal</p>
          </div>
        </div>
        <ThemeToggle />
      </div>

      <Separator />

      <nav className="flex-1 space-y-1 px-3 py-4">
        {items.map((item) => {
          const Icon = ICON_MAP[item.icon]
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn('sidebar-link', isActive && 'sidebar-link-active')
              }
            >
              {Icon && <Icon className="h-4 w-4" />}
              {item.label}
            </NavLink>
          )
        })}
      </nav>

      <div className="space-y-3 border-t border-border p-4">
        <div className="flex items-center gap-3 rounded-lg bg-muted/50 px-3 py-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
            {(user?.name || 'U').charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{user?.name || 'User'}</p>
            <p className="truncate text-xs text-muted-foreground">{user?.email || ''}</p>
          </div>
        </div>
        <Button variant="ghost" className="w-full justify-start text-muted-foreground" onClick={handleLogout}>
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </div>
    </aside>
  )
}
