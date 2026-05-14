'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../../lib/supabase'
import styles from './new.module.css'

const DEFAULT_HOURS = Array(7).fill(null).map((_, i) => ({
  day_index: i,
  is_open: i < 5,
  time_from: '09:00',
  time_to: '17:00',
}))

export default function NewClientPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '',
    domain: '',
    phone: '',
    email: '',
    address: '',
    description: '',
    color: '#185FA5',
    bot_name: 'Virtueller Assistent',
    greeting: 'Guten Tag! Wie kann ich Ihnen helfen?',
    slot_duration: 30,
    dsgvo: true,
    active: true,
  })

  async function save() {
    if (!form.name || !form.domain) return alert('Bitte Name und Domain ausfüllen!')
    setSaving(true)
    try {
      // Insert client
      const { data: client, error } = await supabase
        .from('clients')
        .insert({ ...form })
        .select()
        .single()
      if (error) throw error

      // Insert default opening hours
      await supabase.from('opening_hours').insert(
        DEFAULT_HOURS.map(h => ({ ...h, client_id: client.id }))
      )

      // Insert default service
      await supabase.from('services').insert({
        client_id: client.id,
        name: 'Beratungsgespräch',
        duration: 60,
        price: 'kostenlos',
        color: form.color,
      })

      router.push(`/admin/clients/${client.id}`)
    } catch (e) {
      console.error(e)
      alert('Fehler beim Speichern. Bitte versuchen Sie es erneut.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.topbar}>
        <h1 className={styles.title}>Neuer Kunde</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn" onClick={() => router.back()}>Abbrechen</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? 'Wird gespeichert...' : '💾 Speichern & Konfigurieren'}
          </button>
        </div>
      </div>
      <div className={styles.content}>
        <div className={styles.section}>
          <div className={styles.sectionTitle}>🏢 Firmendaten</div>
          <div className={styles.grid2}>
            <div className="field">
              <label>Firmenname *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="z.B. Muster GmbH" />
            </div>
            <div className="field">
              <label>Domain *</label>
              <input value={form.domain} onChange={e => setForm(f => ({ ...f, domain: e.target.value }))} placeholder="z.B. mustergmbh.de" />
            </div>
            <div className="field">
              <label>Telefon</label>
              <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+49 30 ..." />
            </div>
            <div className="field">
              <label>E-Mail</label>
              <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="info@firma.de" />
            </div>
          </div>
          <div className="field">
            <label>Adresse</label>
            <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Musterstraße 1, 10115 Berlin" />
          </div>
          <div className="field">
            <label>Beschreibung (der Bot nutzt diese für Antworten)</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Was macht das Unternehmen?" />
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionTitle}>🤖 Bot-Einstellungen</div>
          <div className={styles.grid2}>
            <div className="field">
              <label>Bot-Name</label>
              <input value={form.bot_name} onChange={e => setForm(f => ({ ...f, bot_name: e.target.value }))} />
            </div>
            <div className="field">
              <label>Widget-Farbe</label>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                {['#185FA5','#0F6E56','#854F0B','#993556','#3B6D11','#A32D2D','#534AB7'].map(col => (
                  <div
                    key={col}
                    onClick={() => setForm(f => ({ ...f, color: col }))}
                    style={{
                      width: 28, height: 28, borderRadius: '50%', background: col, cursor: 'pointer',
                      border: form.color === col ? '3px solid #1A1917' : '2px solid transparent'
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="field">
            <label>Begrüßungsnachricht</label>
            <textarea value={form.greeting} onChange={e => setForm(f => ({ ...f, greeting: e.target.value }))} />
          </div>
        </div>
      </div>
    </div>
  )
}
