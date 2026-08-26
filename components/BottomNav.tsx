'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  {
    label: 'Accueil',
    href: '/dashboard/accueil',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#f08816' : '#9ca3af'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
  },
  {
    label: 'Récompenses',
    href: '/dashboard/rewards',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#f08816' : '#9ca3af'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 12 20 22 4 22 4 12"/>
        <rect x="2" y="7" width="20" height="5"/>
        <line x1="12" y1="22" x2="12" y2="7"/>
        <path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z"/>
        <path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/>
      </svg>
    ),
  },
  {
    label: 'Mes bons',
    href: '/dashboard/vouchers',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#f08816' : '#9ca3af'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="6" width="20" height="12" rx="2"/>
        <circle cx="7" cy="12" r="1" fill={active ? '#f08816' : '#9ca3af'} stroke="none"/>
        <circle cx="17" cy="12" r="1" fill={active ? '#f08816' : '#9ca3af'} stroke="none"/>
        <line x1="12" y1="6" x2="12" y2="18" strokeDasharray="2 2"/>
      </svg>
    ),
  },
  {
    label: 'Historique',
    href: '/dashboard/history',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#f08816' : '#9ca3af'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12 6 12 12 16 14"/>
      </svg>
    ),
  },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 flex items-center"
      style={{
        background: 'linear-gradient(160deg, #1c1917 0%, #292524 100%)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {navItems.map(({ label, href, icon }) => {
        const active = pathname === href
        return (
          <Link
            key={href}
            href={href}
            className="flex-1 flex flex-col items-center justify-center py-2.5 gap-1"
          >
            {icon(active)}
            <span
              className="text-[10px] font-medium tracking-wide"
              style={{ color: active ? '#f08816' : '#6b7280' }}
            >
              {label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
