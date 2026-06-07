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

export default function Sidebar({ userName, navItems, bottomItems }: Props) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-gray-100">
        <span className="text-xl font-bold text-gray-900">Moya</span>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              pathname === item.href
                ? 'bg-black text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-4 border-t border-gray-100 flex flex-col gap-1">
        <div className="px-4 py-2 text-sm text-gray-500 font-medium truncate">
          👤 {userName}
        </div>
        {bottomItems.map((item, i) =>
          item.href ? (
            <Link
              key={i}
              href={item.href}
              onClick={() => setOpen(false)}
              className="px-4 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <button
              key={i}
              onClick={() => { setOpen(false); item.onClick?.() }}
              className="text-left px-4 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
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
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-56 lg:fixed lg:inset-y-0 bg-white border-r border-gray-200">
        {sidebarContent}
      </aside>

      {/* Mobile header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200 flex items-center justify-between px-4 h-14">
        <span className="text-lg font-bold text-gray-900">Moya</span>
        <button
          onClick={() => setOpen(true)}
          className="p-2 rounded-lg text-gray-600 hover:bg-gray-100"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </header>

      {/* Mobile drawer */}
      {open && (
        <>
          <div
            className="lg:hidden fixed inset-0 z-40 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <aside className="lg:hidden fixed inset-y-0 left-0 z-50 w-56 bg-white">
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  )
}
