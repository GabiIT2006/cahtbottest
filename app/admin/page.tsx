'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getClients, getBookings } from '../../lib/supabase'
import type { Client, Booking } from '../../lib/supabase'
import styles from './dashboard.module.css'

export default function AdminPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [allBookings, setAllBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const cls = await getClients()
        setClients(cls)
        const bookingArrays = await Promise.all(cls.map(c => getBookings(c.id)))
        setAllBookings(bookingArrays.flat())
      } catch (e) { console.error(e) }
      finally { setLoading(false) }
    }
    load()
  }, [])

  const today = new Date().toISOString().split('T')[0]
  const todayBookings = allBookings.filter(b => b.booking_date === today)
  const newBookings = allBookings.filter(b => b.status === 'new')

  const DE_DAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']
  const DE_MONTHS = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']
  function friendlyDate(s: string) {
    const d = new Date(s + 'T00:00:00')
    return `${DE_DAYS[d.getDay()]}, ${d.getDate()}. ${DE_MONTHS[d.getMonth()]}`
  }

  if (loading) return <div className={styles.loading}>Wird geladen...</div>

  return (
    <div className={styles.page}>
      <div className={styles.topbar}>
        <h1 className={styles.title}>Übersicht</h1>
      </div>

      <div className={styles.content}>
        <div className={styles.statsGrid}>
          <div className={styles.stat}>
            <div className={styles.statLabel}>Kunden gesamt</div>
            <div className={styles.statVal}>{clients.length}</div>
            <div className={styles.statSub}>{clients.filter(c => c.active).length} aktiv</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statLabel}>Termine heute</div>
            <div className={styles.statVal}>{todayBookings.length}</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statLabel}>Ausstehend</div>
            <div className={styles.statVal}>{newBookings.length}</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statLabel}>Termine gesamt</div>
            <div className={styles.statVal}>{allBookings.length}</div>
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTitle}>Neueste Termine</span>
            <Link href="/admin/bookings" className="btn">Alle anzeigen</Link>
          </div>
          <div className="card">
            {newBookings.slice(0, 8).length === 0 ? (
              <div className={styles.empty}>Keine ausstehenden Termine</div>
            ) : newBookings.slice(0, 8).map(b => {
              const client = clients.find(c => c.id === b.client_id)
              return (
                <div key={b.id} className={styles.bookingRow}>
                  <div className={styles.bookingAvatar} style={{ background: (client?.color || '#185FA5') + '22', color: client?.color || '#185FA5' }}>
                    {b.customer_name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                  </div>
                  <div className={styles.bookingInfo}>
                    <div className={styles.bookingName}>{b.customer_name}</div>
                    <div className={styles.bookingMeta}>{b.service_name} · {client?.name}</div>
                  </div>
                  <div className={styles.bookingTime}>
                    <div>{friendlyDate(b.booking_date)}, {b.booking_time} Uhr</div>
                    <span className="badge badge-new">Neu</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTitle}>Kunden</span>
            <Link href="/admin/clients" className="btn">Alle verwalten</Link>
          </div>
          <div className={styles.clientGrid}>
            {clients.map(c => (
              <Link key={c.id} href={`/admin/clients/${c.id}`} className={styles.clientCard}>
                <div className={styles.clientCardHeader}>
                  <div className={styles.clientBigAvatar} style={{ background: c.color + '22', color: c.color }}>
                    {c.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <span className={`badge ${c.active ? 'badge-active' : 'badge-inactive'}`}>
                    {c.active ? 'Aktiv' : 'Inaktiv'}
                  </span>
                </div>
                <div className={styles.clientCardName}>{c.name}</div>
                <div className={styles.clientCardDomain}>{c.domain}</div>
                <div className={styles.clientCardBookings}>
                  {allBookings.filter(b => b.client_id === c.id && b.status === 'new').length} neue Termine
                </div>
              </Link>
            ))}
            <Link href="/admin/clients/new" className={styles.addCard}>
              <span className={styles.addIcon}>+</span>
              <span>Neuer Kunde</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
