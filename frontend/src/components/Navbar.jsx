import { NavLink } from 'react-router-dom'
import { Filter, LayoutDashboard, Send, Sparkles, Users } from 'lucide-react'

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/customers', label: 'Customers', icon: Users },
  { to: '/segments', label: 'Segments', icon: Filter },
  { to: '/campaigns', label: 'Campaigns', icon: Send },
]

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 shadow-sm">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-semibold text-slate-900">Xeno CRM</span>
        </div>

        <nav className="flex items-center gap-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                [
                  'relative flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-gradient-to-r from-indigo-50 to-violet-50 text-indigo-600 shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                ].join(' ')
              }
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  )
}
