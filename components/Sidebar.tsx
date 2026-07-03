'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

type NavItem = {
  label: string
  href: string
}

type BottomItem = {
  label: string
  href?: string
  onClick?: () => void
}

type Props = {
  userName: string
  navItems: NavItem[]
  bottomItems: BottomItem[]
}

// Motif japonais asanoha (feuille de chanvre) en SVG
const JP_PATTERN = `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%23ffffff' stroke-opacity='0.04' stroke-width='0.5'%3E%3Cpath d='M20 0 L20 40'/%3E%3Cpath d='M0 20 L40 20'/%3E%3Cpath d='M0 0 L40 40'/%3E%3Cpath d='M40 0 L0 40'/%3E%3Ccircle cx='20' cy='20' r='14'/%3E%3Ccircle cx='0' cy='0' r='14'/%3E%3Ccircle cx='40' cy='0' r='14'/%3E%3Ccircle cx='0' cy='40' r='14'/%3E%3Ccircle cx='40' cy='40' r='14'/%3E%3C/g%3E%3C/svg%3E")`

export default function Sidebar({ userName, navItems, bottomItems }: Props) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const sidebarContent = (
    <div
      className="flex flex-col h-full"
      style={{
        background: `${JP_PATTERN}, linear-gradient(160deg, #1c1917 0%, #292524 100%)`,
      }}
    >
      {/* Logo */}
      <div className="px-5 pt-6 pb-5">
        <p
          className="text-3xl font-black tracking-[0.08em] leading-none select-none"
          style={{
            background: 'linear-gradient(180deg, #ffffff 0%, #c0c0c0 40%, #e8e8e8 65%, #888 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            textShadow: 'none',
            filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))',
          }}
        >
          MOYA
        </p>
        <p className="text-[9px] tracking-[0.3em] mt-1 font-medium" style={{ color: 'rgba(240,136,22,0.85)' }}>
          RESTAURANT JAPONAIS
        </p>
      </div>

      {/* Séparateur */}
      <div className="mx-5 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }} />

      {/* Nav */}
      <nav className="flex-1 px-3 py-5 flex flex-col gap-0.5">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all"
              style={
                isActive
                  ? { color: '#f08816', backgroundColor: 'rgba(240,136,22,0.12)', fontWeight: 500 }
                  : { color: 'rgba(255,255,255,0.45)', fontWeight: 400 }
              }
              onMouseEnter={e => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.8)'
                  ;(e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.06)'
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.45)'
                  ;(e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'
                }
              }}
            >
              {/* Indicateur */}
              <span
                className="w-1 h-1 rounded-full shrink-0"
                style={{ backgroundColor: isActive ? '#f08816' : 'rgba(255,255,255,0.2)' }}
              />
              <span className="tracking-wide">{item.label}</span>
              {isActive && (
                <span className="ml-auto w-0.5 h-4 rounded-full" style={{ backgroundColor: '#f08816' }} />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Séparateur bas */}
      <div className="mx-5 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }} />

      {/* Bottom */}
      <div className="px-3 py-4 flex flex-col gap-0.5">
        <div className="flex items-center gap-2.5 px-3 py-2 mb-1">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
            style={{ backgroundColor: 'rgba(240,136,22,0.2)', color: '#f08816' }}
          >
            {userName.charAt(0).toUpperCase()}
          </div>
          <span className="text-sm font-medium text-white truncate">{userName}</span>
        </div>
        {bottomItems.map((item, i) =>
          item.href ? (
            <Link
              key={i}
              href={item.href}
              onClick={() => setOpen(false)}
              className="px-3 py-2.5 rounded-lg text-sm tracking-wide transition-colors"
              style={{ color: 'rgba(255,255,255,0.4)' }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.7)'
                ;(e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.06)'
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.4)'
                ;(e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'
              }}
            >
              {item.label}
            </Link>
          ) : (
            <button
              key={i}
              onClick={() => { setOpen(false); item.onClick?.() }}
              className="text-left px-3 py-2.5 rounded-lg text-sm tracking-wide transition-colors"
              style={{ color: 'rgba(255,255,255,0.25)' }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.5)'
                ;(e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.04)'
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.25)'
                ;(e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'
              }}
            >
              {item.label}
            </button>
          )
        )}
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop */}
      <aside className="hidden lg:flex lg:flex-col lg:w-56 lg:fixed lg:inset-y-0">
        {sidebarContent}
      </aside>

      {/* Mobile header */}
      <header
        className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-5 h-14"
        style={{ background: 'linear-gradient(160deg, #1c1917 0%, #292524 100%)' }}
      >
        <p
          className="text-xl font-black tracking-[0.08em] leading-none select-none"
          style={{
            background: 'linear-gradient(180deg, #ffffff 0%, #c0c0c0 40%, #e8e8e8 65%, #888 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.4))',
          }}
        >
          MOYA
        </p>
        <button
          onClick={() => setOpen(true)}
          className="p-2 rounded-lg"
          style={{ color: 'rgba(255,255,255,0.5)' }}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </header>

      {/* Mobile drawer */}
      {open && (
        <>
          <div className="lg:hidden fixed inset-0 z-40 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="lg:hidden fixed inset-y-0 left-0 z-50 w-56 shadow-2xl">
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  )
}
