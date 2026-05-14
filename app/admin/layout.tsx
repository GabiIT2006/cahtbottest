'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { getClients } from '../../lib/supabase'
import type { Client } from '../../lib/supabase'
import styles from './admin.module.css'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [clients, setClients] = useState<Client[]>([])
  const pathname = usePathname()

  useEffect(() => {
    getClients().then(setClients).catch(console.error)
  }, [])

  const navItems = [
    { href: '/admin', label: 'Übersicht', icon: '📊' },
    { href: '/admin/clients', label: 'Kunden', icon: '🏢' },
    { href: '/admin/bookings', label: 'Termine', icon: '📅' },
  ]

  return (
    <div className={styles.app}>
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          <span className={styles.logoText}>BotPanel</span>
          <span className={styles.logoSub}>admin@botpanel.de</span>
        </div>

        <nav className={styles.nav}>
          {navItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navItem} ${pathname === item.href ? styles.navActive : ''}`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className={styles.clientSection}>
          <div className={styles.sectionLabel}>Kunden</div>
          {clients.map(c => (
            <Link
              key={c.id}
              href={`/admin/clients/${c.id}`}
              className={`${styles.clientItem} ${pathname.includes(c.id) ? styles.navActive : ''}`}
            >
              <div className={styles.clientAvatar} style={{ background: c.color + '22', color: c.color }}>
                {c.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div className={styles.clientInfo}>
                <div className={styles.clientName}>{c.name}</div>
                <div className={styles.clientDomain}>{c.domain}</div>
              </div>
              <div className={`${styles.dot} ${c.active ? styles.dotOn : styles.dotOff}`} />
            </Link>
          ))}
          <Link href="/admin/clients/new" className={styles.addClientBtn}>
            + Neuer Kunde
          </Link>
        </div>

        <div className={styles.sidebarBottom}>
          <div className={styles.planLabel}>Plan: Starter · {clients.filter(c => c.active).length} aktiv</div>
        </div>
      </aside>

      <main className={styles.main}>
        {children}
      </main>
    </div>
  )
}
