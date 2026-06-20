import { NavLink } from 'react-router-dom'
import * as Icons from 'lucide-react'
import { cn } from '@/utils/helpers'
import { NAV_ITEMS } from '@/utils/constants'

export function MobileNav({ role }) {
  const items = (NAV_ITEMS[role] || []).slice(0, 4)

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex border-t border-white/10 bg-secondary/95 backdrop-blur-xl md:hidden">
      {items.map((item) => {
        const Icon = Icons[item.icon]
        return (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                'flex flex-1 flex-col items-center gap-1 py-3 text-[10px] text-muted-foreground',
                isActive && 'text-primary'
              )
            }
          >
            {Icon && <Icon className="h-5 w-5" />}
            <span>{item.label.split(' ')[0]}</span>
          </NavLink>
        )
      })}
    </nav>
  )
}
