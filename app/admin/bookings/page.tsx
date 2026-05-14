'use client'
import { useEffect, useState } from 'react'
import { getClients, getBookings, updateBookingStatus } from '../../../lib/supabase'
import type { Client, Booking } from '../../../lib/supabase'
import styles from './bookings.module.css'

const DE_DAYS = ['So','Mo','Di','Mi','Do','Fr','Sa']
const DE_MONTHS = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez']

function friendlyDate(s: string) {
  const d = new Date(s + 'T00:00:00')
  return `${DE_DAYS[d.getDay()]}, ${d.getDate()}. ${DE_MONTHS[d.getMonth()]}`
}

export default function BookingsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'new' | 'today'>('new')
  const [clientFilter, setClientFilter] = useState<string>('all')

  useEffect(() => {
    async function load() {
      try {
        const cls = await getClients()
        setClients(cls)
        const arrays = await Promise.all(cls.map(c => getBookings(c.id)))
        setBookings(arrays.flat().sort((a, b) => a.booking_date.localeCompare(b.booking_date) || a.booking_time.localeCompare(b.booking_time)))
      } catch (e) { console.error(e) }
      finally { setLoading(false) }
    }
    load()
  }, [])

  const today = new Date().toISOString().split('T')[0]

  let filtered = bookings
  if (filter === 'new') filtered = filtered.filter(b => b.status === 'new')
  if (filter === 'today') filtered = filtered.filter(b => b.booking_date === today)
  if (clientFilter !== 'all') filtered = filtered.filter(b => b.client_id === clientFilter)

  async function markDone(id: string) {
    await updateBookingStatus(id, 'done')
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'done' } : b))
  }
  async function markCancelled(id: string) {
    await updateBookingStatus(id, 'cancelled')
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'cancelled' } : b))
  }

  if (loading) return <div className={styles.loading}>Wird geladen...</div>

  return (
    <div className={styles.page}>
      <div className={styles.topbar}>
        <h1 className={styles.title}>Termine</h1>
        <div className={styles.filters}>
          <select value={clientFilter} onChange={e => setClientFilter(e.target.value)}>
            <option value="all">Alle Kunden</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <div className={styles.filterBtns}>
            {(['all','new','today'] as const).map(f => (
              <button key={f} className={`btn ${filter === f ? 'btn-primary' : ''}`} onClick={() => setFilter(f)}>
                {{ all: 'Alle', new: 'Ausstehend', today: 'Heute' }[f]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.stats}>
          <div className={styles.stat}><span className={styles.statN}>{bookings.filter(b => b.booking_date === today).length}</span> Heute</div>
          <div className={styles.stat}><span className={styles.statN}>{bookings.filter(b => b.status === 'new').length}</span> Ausstehend</div>
          <div className={styles.stat}><span className={styles.statN}>{bookings.length}</span> Gesamt</div>
        </div>

        <div className="card">
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Kunde</th>
                <th>Leistung</th>
                <th>Datum & Uhrzeit</th>
                <th>Telefon</th>
                <th>Status</th>
                <th>Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className={styles.empty}>Keine Termine gefunden</td></tr>
              ) : filtered.map(b => {
                const client = clients.find(c => c.id === b.client_id)
                return (
                  <tr key={b.id}>
                    <td>
                      <div className={styles.nameCell}>
                        <div className={styles.avatar} style={{ background: (client?.color || '#185FA5') + '22', color: client?.color || '#185FA5' }}>
                          {b.customer_name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                        </div>
                        <div>
                          <div className={styles.name}>{b.customer_name}</div>
                          <div className={styles.sub}>{client?.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className={styles.service}>{b.service_name}</td>
                    <td className={styles.dateTime}>{friendlyDate(b.booking_date)}, {b.booking_time} Uhr</td>
                    <td className={styles.phone}>{b.customer_phone}</td>
                    <td>
                      <span className={`badge badge-${b.status === 'new' ? 'new' : b.status === 'done' ? 'done' : 'cancelled'}`}>
                        {{ new: 'Neu', done: 'Erledigt', cancelled: 'Storniert' }[b.status]}
                      </span>
                    </td>
                    <td>
                      {b.status === 'new' && (
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn" style={{ fontSize: 11, padding: '3px 8px' }} onClick={() => markDone(b.id)}>✓ Erledigt</button>
                          <button className="btn btn-danger" style={{ fontSize: 11, padding: '3px 8px' }} onClick={() => markCancelled(b.id)}>✕</button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
