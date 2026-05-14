'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getClients, updateClient } from '../../../lib/supabase'
import type { Client } from '../../../lib/supabase'
import styles from './clients.module.css'

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getClients().then(setClients).catch(console.error).finally(() => setLoading(false))
  }, [])

  async function toggleActive(client: Client) {
    await updateClient(client.id, { active: !client.active })
    setClients(prev => prev.map(c => c.id === client.id ? { ...c, active: !c.active } : c))
  }

  if (loading) return <div className={styles.loading}>Wird geladen...</div>

  return (
    <div className={styles.page}>
      <div className={styles.topbar}>
        <h1 className={styles.title}>Kunden</h1>
        <Link href="/admin/clients/new" className="btn btn-primary">+ Neuer Kunde</Link>
      </div>
      <div className={styles.content}>
        {clients.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>🏢</div>
            <div className={styles.emptyTitle}>Noch keine Kunden</div>
            <div className={styles.emptySub}>Fügen Sie Ihren ersten Kunden hinzu</div>
            <Link href="/admin/clients/new" className="btn btn-primary" style={{ marginTop: 16 }}>+ Neuer Kunde</Link>
          </div>
        ) : (
          <div className="card">
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Firma</th>
                  <th>Domain</th>
                  <th>Bot-Name</th>
                  <th>Status</th>
                  <th>Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {clients.map(c => (
                  <tr key={c.id}>
                    <td>
                      <div className={styles.nameCell}>
                        <div className={styles.avatar} style={{ background: c.color + '22', color: c.color }}>
                          {c.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className={styles.name}>{c.name}</div>
                          <div className={styles.sub}>{c.email || '—'}</div>
                        </div>
                      </div>
                    </td>
                    <td><code className={styles.domain}>{c.domain}</code></td>
                    <td>{c.bot_name}</td>
                    <td>
                      <span className={`badge ${c.active ? 'badge-active' : 'badge-inactive'}`}>
                        {c.active ? 'Aktiv' : 'Inaktiv'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <Link href={`/admin/clients/${c.id}`} className="btn" style={{ fontSize: 12, padding: '4px 10px' }}>⚙️ Konfigurieren</Link>
                        <button
                          className={`btn ${c.active ? 'btn-danger' : ''}`}
                          style={{ fontSize: 12, padding: '4px 10px' }}
                          onClick={() => toggleActive(c)}
                        >
                          {c.active ? '⏸ Deaktivieren' : '▶ Aktivieren'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
