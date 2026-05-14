'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  getClient, getServices, getOpeningHours,
  updateClient, upsertServices, upsertOpeningHours,
  type Client, type Service, type OpeningHour, generateSlots
} from '../../../../lib/supabase'
import styles from './client.module.css'

const COLORS = ['#185FA5','#0F6E56','#854F0B','#993556','#3B6D11','#A32D2D','#534AB7','#5F5E5A']
const DAY_NAMES = ['Mo','Di','Mi','Do','Fr','Sa','So']
const DAY_FULL = ['Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag','Sonntag']

export default function ClientPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [tab, setTab] = useState('allgemein')
  const [client, setClient] = useState<Client | null>(null)
  const [services, setServices] = useState<Service[]>([])
  const [hours, setHours] = useState<OpeningHour[]>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  // Add service form state
  const [showAddService, setShowAddService] = useState(false)
  const [newSvc, setNewSvc] = useState({ name: '', price: 'kostenlos', duration: 30, color: COLORS[0] })

  useEffect(() => {
    if (!id || id === 'new') { setLoading(false); return }
    Promise.all([getClient(id), getServices(id), getOpeningHours(id)])
      .then(([c, s, h]) => { setClient(c); setServices(s); setHours(h) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  async function save() {
    if (!client) return
    setSaving(true)
    try {
      await updateClient(client.id, client)
      await upsertServices(client.id, services.map(({ id: _id, client_id: _cid, ...s }) => s))
      await upsertOpeningHours(client.id, hours.map(({ id: _id, client_id: _cid, ...h }) => h))
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) { console.error(e) }
    finally { setSaving(false) }
  }

  function addService() {
    if (!newSvc.name) return
    setServices(prev => [...prev, { id: 'new-' + Date.now(), client_id: client!.id, ...newSvc }])
    setNewSvc({ name: '', price: 'kostenlos', duration: 30, color: COLORS[0] })
    setShowAddService(false)
  }

  function toggleDay(i: number) {
    setHours(prev => prev.map((h, idx) => idx === i ? { ...h, is_open: !h.is_open } : h))
  }

  const previewHour = hours.find(h => h.is_open && h.time_from && h.time_to)
  const previewSlots = previewHour && client
    ? generateSlots(previewHour.time_from, previewHour.time_to, client.slot_duration, [])
    : []

  if (loading) return <div className={styles.loading}>Wird geladen...</div>
  if (!client) return <div className={styles.loading}>Kunde nicht gefunden.</div>

  const snippet = `<script\n  src="https://botpanel.de/widget.js"\n  data-bot-id="${client.id}"\n  data-color="${client.color}"\n><\/script>`

  return (
    <div className={styles.page}>
      {/* Topbar */}
      <div className={styles.topbar}>
        <div className={styles.topbarLeft}>
          <div className={styles.topbarAvatar} style={{ background: client.color + '22', color: client.color }}>
            {client.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className={styles.topbarTitle}>{client.name}</div>
            <div className={styles.topbarDomain}>{client.domain}</div>
          </div>
          <span className={`badge ${client.active ? 'badge-active' : 'badge-inactive'}`}>
            {client.active ? 'Aktiv' : 'Inaktiv'}
          </span>
        </div>
        <div className={styles.topbarActions}>
          <button
            className={`btn ${client.active ? 'btn-danger' : 'btn-primary'}`}
            onClick={() => setClient(c => c ? { ...c, active: !c.active } : c)}
          >
            {client.active ? '⏸ Deaktivieren' : '▶ Aktivieren'}
          </button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? 'Speichert...' : saved ? '✓ Gespeichert!' : '💾 Speichern'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        {['allgemein','leistungen','zeiten','bot','embed'].map(t => (
          <button key={t} className={`${styles.tab} ${tab === t ? styles.tabActive : ''}`} onClick={() => setTab(t)}>
            {{ allgemein: '🏢 Allgemein', leistungen: '📋 Leistungen', zeiten: '🕐 Öffnungszeiten', bot: '🤖 Bot', embed: '</> Embed' }[t]}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className={styles.content}>

        {/* ALLGEMEIN */}
        {tab === 'allgemein' && (
          <>
            <div className={styles.section}>
              <div className={styles.sectionTitle}>🏢 Firmendaten</div>
              <div className={styles.grid2}>
                <div className="field"><label>Firmenname</label><input value={client.name} onChange={e => setClient(c => c ? { ...c, name: e.target.value } : c)} /></div>
                <div className="field"><label>Domain</label><input value={client.domain} onChange={e => setClient(c => c ? { ...c, domain: e.target.value } : c)} /></div>
                <div className="field"><label>Telefon</label><input value={client.phone || ''} onChange={e => setClient(c => c ? { ...c, phone: e.target.value } : c)} placeholder="+49 30 ..." /></div>
                <div className="field"><label>E-Mail</label><input value={client.email || ''} onChange={e => setClient(c => c ? { ...c, email: e.target.value } : c)} placeholder="info@firma.de" /></div>
              </div>
              <div className="field"><label>Adresse</label><input value={client.address || ''} onChange={e => setClient(c => c ? { ...c, address: e.target.value } : c)} placeholder="Musterstraße 1, 10115 Berlin" /></div>
              <div className="field"><label>Beschreibung (der Bot nutzt diese für Antworten)</label><textarea value={client.description || ''} onChange={e => setClient(c => c ? { ...c, description: e.target.value } : c)} placeholder="Was macht Ihr Unternehmen?" /></div>
            </div>
          </>
        )}

        {/* LEISTUNGEN */}
        {tab === 'leistungen' && (
          <>
            <div className={styles.section}>
              <div className={styles.sectionTitle}>📋 Buchbare Leistungen</div>
              <div className={styles.serviceList}>
                {services.map((s, i) => (
                  <div key={s.id} className={styles.serviceItem}>
                    <div className={styles.serviceColor} style={{ background: s.color }} />
                    <span className={styles.serviceName}>{s.name}</span>
                    <span className={styles.serviceDur}>{s.duration} Min.</span>
                    <span className={styles.servicePrice}>{s.price}</span>
                    <button className={styles.iconBtn} onClick={() => setServices(prev => prev.filter((_, idx) => idx !== i))} title="Löschen">🗑</button>
                  </div>
                ))}
              </div>
              <button className="btn" onClick={() => setShowAddService(v => !v)} style={{ marginTop: 8 }}>+ Leistung hinzufügen</button>
              {showAddService && (
                <div className={styles.addForm}>
                  <div className={styles.grid2}>
                    <div className="field" style={{ marginBottom: 8 }}><label>Name</label><input value={newSvc.name} onChange={e => setNewSvc(v => ({ ...v, name: e.target.value }))} placeholder="z.B. Beratungsgespräch" /></div>
                    <div className="field" style={{ marginBottom: 8 }}><label>Preis</label><input value={newSvc.price} onChange={e => setNewSvc(v => ({ ...v, price: e.target.value }))} placeholder="z.B. 50 €" /></div>
                    <div className="field" style={{ marginBottom: 8 }}><label>Dauer (Min.)</label><input type="number" value={newSvc.duration} min={5} step={5} onChange={e => setNewSvc(v => ({ ...v, duration: parseInt(e.target.value) || 30 }))} /></div>
                    <div className="field" style={{ marginBottom: 8 }}><label>Farbe</label>
                      <div className={styles.colorRow}>
                        {COLORS.map(col => <div key={col} className={`${styles.colorSwatch} ${newSvc.color === col ? styles.colorSel : ''}`} style={{ background: col }} onClick={() => setNewSvc(v => ({ ...v, color: col }))} />)}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-primary" onClick={addService}>✓ Hinzufügen</button>
                    <button className="btn" onClick={() => setShowAddService(false)}>Abbrechen</button>
                  </div>
                </div>
              )}
            </div>
            <div className={styles.section}>
              <div className={styles.sectionTitle}>⏱ Terminintervall</div>
              <div className={styles.sectionSub}>In welchen Abständen werden Termine vergeben?</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {[15, 20, 30, 45, 60].map(m => (
                  <button key={m} className={`btn ${client.slot_duration === m ? 'btn-primary' : ''}`} onClick={() => setClient(c => c ? { ...c, slot_duration: m } : c)}>{m} Min.</button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ÖFFNUNGSZEITEN */}
        {tab === 'zeiten' && (
          <>
            <div className={styles.section}>
              <div className={styles.sectionTitle}>📅 Wöchentliche Öffnungszeiten</div>
              <div className={styles.hoursGrid}>
                {hours.map((h, i) => (
                  <div key={i} className={styles.dayCol}>
                    <div className={styles.dayHeader}>{DAY_NAMES[i]}</div>
                    <div className={styles.dayToggleWrap}>
                      <button
                        className={`${styles.toggle} ${h.is_open ? styles.toggleOn : styles.toggleOff}`}
                        onClick={() => toggleDay(i)}
                        title={`${DAY_FULL[i]} ${h.is_open ? 'schließen' : 'öffnen'}`}
                      />
                    </div>
                    <div className={styles.timeLabel}>Von</div>
                    <input className={styles.timeInput} type="time" value={h.time_from} disabled={!h.is_open}
                      onChange={e => setHours(prev => prev.map((hh, idx) => idx === i ? { ...hh, time_from: e.target.value } : hh))} />
                    <div className={styles.timeLabel}>Bis</div>
                    <input className={styles.timeInput} type="time" value={h.time_to} disabled={!h.is_open}
                      onChange={e => setHours(prev => prev.map((hh, idx) => idx === i ? { ...hh, time_to: e.target.value } : hh))} />
                  </div>
                ))}
              </div>
            </div>
            <div className={styles.section}>
              <div className={styles.sectionTitle}>👁 Slot-Vorschau</div>
              <div className={styles.sectionSub}>Verfügbare Slots für einen offenen Tag (Intervall: {client.slot_duration} Min.)</div>
              <div className={styles.slotPreview}>
                {previewSlots.length > 0
                  ? previewSlots.map(s => <span key={s.time} className={styles.slotChip}>{s.time} Uhr</span>)
                  : <span className={styles.noSlots}>Keine Slots – alle Tage geschlossen</span>}
              </div>
            </div>
          </>
        )}

        {/* BOT */}
        {tab === 'bot' && (
          <>
            <div className={styles.section}>
              <div className={styles.sectionTitle}>🤖 Bot-Identität</div>
              <div className="field"><label>Bot-Name</label><input value={client.bot_name} onChange={e => setClient(c => c ? { ...c, bot_name: e.target.value } : c)} /></div>
              <div className="field"><label>Begrüßungsnachricht</label><textarea value={client.greeting} onChange={e => setClient(c => c ? { ...c, greeting: e.target.value } : c)} /></div>
            </div>
            <div className={styles.section}>
              <div className={styles.sectionTitle}>🎨 Widget-Farbe</div>
              <div className={styles.colorRow} style={{ marginBottom: 14 }}>
                {COLORS.map(col => <div key={col} className={`${styles.colorSwatch} ${client.color === col ? styles.colorSel : ''}`} style={{ background: col }} onClick={() => setClient(c => c ? { ...c, color: col } : c)} />)}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 46, height: 46, borderRadius: '50%', background: client.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>💬</div>
                <span style={{ fontSize: 12, color: 'var(--text2)' }}>Vorschau Widget-Button</span>
              </div>
            </div>
            <div className={styles.section}>
              <div className={styles.sectionTitle}>🛡 DSGVO-Hinweis</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button className={`${styles.toggle} ${client.dsgvo ? styles.toggleOn : styles.toggleOff}`} onClick={() => setClient(c => c ? { ...c, dsgvo: !c.dsgvo } : c)} />
                <span style={{ fontSize: 13 }}>Datenschutzhinweis im Chat anzeigen (empfohlen für DE)</span>
              </div>
            </div>
          </>
        )}

        {/* EMBED */}
        {tab === 'embed' && (
          <>
            <div className={styles.section}>
              <div className={styles.sectionTitle}>&lt;/&gt; Einbindungscode</div>
              <div className={styles.sectionSub}>Diesen Code vor dem &lt;/body&gt;-Tag der Kundenwebsite einfügen</div>
              <pre className={styles.snippet}>{snippet}</pre>
              <button className="btn" style={{ marginTop: 10 }} onClick={() => navigator.clipboard.writeText(snippet.replace('\\n  ', ' '))}>📋 Code kopieren</button>
            </div>
            <div className={styles.section}>
              <div className={styles.sectionTitle}>🔑 Bot-ID</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <code className={styles.codeBox}>{client.id}</code>
                <button className="btn" onClick={() => navigator.clipboard.writeText(client.id)}>📋</button>
              </div>
            </div>
            <div className={styles.section}>
              <div className={styles.sectionTitle}>🔗 Webhook (optional)</div>
              <div className={styles.sectionSub}>URL die bei jeder neuen Buchung aufgerufen wird (z.B. für E-Mail-Benachrichtigungen)</div>
              <div className="field"><label>Webhook-URL</label><input value={client.webhook || ''} onChange={e => setClient(c => c ? { ...c, webhook: e.target.value } : c)} placeholder="https://..." /></div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
