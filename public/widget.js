/**
 * BotPanel Widget – widget.js
 * Se pune pe orice site al clientului: <script src="https://DOMENIU_TU/widget.js" data-bot-id="CLIENT_ID"></script>
 * Fișierul acesta trebuie pus în /public/widget.js
 */
(function () {
  const script = document.currentScript || document.querySelector('script[data-bot-id]')
  const BOT_ID = script?.getAttribute('data-bot-id')
  const BASE_URL = script?.src?.replace('/widget.js', '') || ''

  if (!BOT_ID) { console.warn('BotPanel: data-bot-id missing'); return }

  // ---- State ----
  let config = null
  let state = { step: 'start', name: '', phone: '', service: '', date: '', time: '' }
  let myBookings = []
  let calMonth = new Date()
  calMonth.setDate(1)
  let widgetOpen = false

  const DE_MONTHS = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember']
  const DE_DAYS_SHORT = ['Mo','Di','Mi','Do','Fr','Sa','So']
  const DE_DAYS = ['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag']
  const TODAY = new Date(); TODAY.setHours(0,0,0,0)

  function fmt(d) { return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0') }
  function addDays(d,n) { const r=new Date(d); r.setDate(r.getDate()+n); return r }
  function parseDate(s) { const[y,m,d]=s.split('-').map(Number); return new Date(y,m-1,d) }
  function friendlyDate(s) {
    const d = parseDate(s)
    return `${DE_DAYS[d.getDay()]}, ${d.getDate()}. ${DE_MONTHS[d.getMonth()]}`
  }

  async function fetchConfig(date) {
    const url = `${BASE_URL}/api/widget-config?botId=${BOT_ID}${date ? '&date='+date : ''}`
    const res = await fetch(url)
    if (!res.ok) throw new Error('Bot nicht verfügbar')
    return res.json()
  }

  async function getBusySlots(date) {
    const data = await fetchConfig(date)
    return data.busySlots || []
  }

  function generateSlots(from, to, interval, busy) {
    const slots = []
    const [fh,fm] = from.split(':').map(Number)
    const [th,tm] = to.split(':').map(Number)
    let min = fh*60+fm
    const end = th*60+tm
    while (min + interval <= end) {
      const h = String(Math.floor(min/60)).padStart(2,'0')
      const m = String(min%60).padStart(2,'0')
      const t = `${h}:${m}`
      slots.push({ time: t, busy: busy.includes(t) })
      min += interval
    }
    return slots
  }

  function isDayOpen(dateStr) {
    if (!config) return false
    const d = parseDate(dateStr)
    const dayIndex = (d.getDay() + 6) % 7 // 0=Mo...6=So
    const hour = config.hours.find(h => h.dayIndex === dayIndex)
    return hour?.isOpen && hour.from && hour.to
  }

  async function findAlternatives(fromDate, count) {
    const alts = []
    let d = parseDate(fromDate)
    for (let i = 0; i < 60 && alts.length < count; i++) {
      d = addDays(d, 1)
      if (d < TODAY) continue
      const ds = fmt(d)
      if (!isDayOpen(ds)) continue
      const busy = await getBusySlots(ds)
      const hour = config.hours.find(h => h.dayIndex === (d.getDay()+6)%7)
      const slots = generateSlots(hour.from, hour.to, config.client.slotDuration, busy)
      if (slots.some(s => !s.busy)) alts.push(ds)
    }
    return alts
  }

  // ---- UI ----
  const style = document.createElement('style')
  style.textContent = `
    #bp-widget * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    #bp-widget { position: fixed; bottom: 20px; right: 20px; z-index: 999999; }
    #bp-bubble { width: 54px; height: 54px; border-radius: 50%; background: VAR_COLOR; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 4px 16px rgba(0,0,0,0.18); transition: transform 0.2s; border: none; }
    #bp-bubble:hover { transform: scale(1.08); }
    #bp-bubble svg { width: 26px; height: 26px; fill: white; }
    #bp-window { position: absolute; bottom: 66px; right: 0; width: 320px; background: white; border: 0.5px solid #E5E4E0; border-radius: 12px; overflow: hidden; display: none; flex-direction: column; max-height: 540px; box-shadow: 0 8px 32px rgba(0,0,0,0.14); }
    #bp-window.open { display: flex; }
    #bp-header { background: VAR_COLOR; padding: 12px 14px; display: flex; align-items: center; gap: 10px; }
    .bp-hav { width: 32px; height: 32px; border-radius: 50%; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; }
    .bp-hav svg { width: 18px; height: 18px; fill: white; }
    .bp-hname { font-size: 13px; font-weight: 500; color: white; }
    .bp-hstatus { font-size: 11px; color: rgba(255,255,255,0.75); }
    .bp-hclose { margin-left: auto; cursor: pointer; color: rgba(255,255,255,0.7); font-size: 20px; line-height: 1; background: none; border: none; color: white; opacity: 0.7; }
    #bp-msgs { flex: 1; overflow-y: auto; padding: 12px; display: flex; flex-direction: column; gap: 8px; min-height: 160px; }
    .bp-msg { max-width: 88%; font-size: 12px; line-height: 1.55; padding: 8px 11px; border-radius: 10px; }
    .bp-bot { background: #F1EFE8; color: #1A1917; align-self: flex-start; border-bottom-left-radius: 3px; }
    .bp-user { background: VAR_COLOR; color: white; align-self: flex-end; border-bottom-right-radius: 3px; }
    .bp-confirm { background: #EAF3DE; color: #27500A; align-self: flex-start; border-bottom-left-radius: 3px; border: 0.5px solid #C0DD97; }
    .bp-warn { background: #FAEEDA; color: #633806; align-self: flex-start; border-bottom-left-radius: 3px; border: 0.5px solid #FAC775; }
    #bp-extra { }
    .bp-choices { display: flex; flex-wrap: wrap; gap: 6px; padding: 0 12px 8px; }
    .bp-choice { font-size: 11px; padding: 5px 11px; border-radius: 20px; border: 0.5px solid VAR_COLOR; color: VAR_COLOR; background: transparent; cursor: pointer; transition: background 0.15s; }
    .bp-choice:hover { background: VAR_COLOR_LIGHT; }
    #bp-input-row { display: flex; gap: 6px; padding: 10px 12px; border-top: 0.5px solid #E5E4E0; }
    #bp-input { flex: 1; font-size: 12px; padding: 7px 10px; border: 0.5px solid #E5E4E0; border-radius: 6px; outline: none; }
    #bp-send { padding: 7px 10px; background: VAR_COLOR; border: none; border-radius: 6px; cursor: pointer; color: white; font-size: 16px; }
    .bp-cal { background: #F8F7F4; border-radius: 8px; padding: 10px; font-size: 12px; margin: 0 12px 8px; }
    .bp-cal-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
    .bp-cal-head span { font-weight: 500; font-size: 12px; }
    .bp-cal-nav { background: none; border: none; cursor: pointer; color: #9E9D99; font-size: 16px; padding: 2px 5px; border-radius: 4px; }
    .bp-cal-grid { display: grid; grid-template-columns: repeat(7,1fr); gap: 2px; text-align: center; }
    .bp-dn { font-size: 10px; color: #9E9D99; padding: 2px 0; font-weight: 500; }
    .bp-day { width: 100%; aspect-ratio: 1; display: flex; align-items: center; justify-content: center; border-radius: 50%; cursor: pointer; font-size: 11px; border: none; background: none; transition: background 0.15s; }
    .bp-day:hover:not(.bp-busy):not(.bp-past):not(.bp-empty) { background: VAR_COLOR_LIGHT; color: VAR_COLOR; }
    .bp-busy { background: #FCEBEB; color: #A32D2D; cursor: pointer; }
    .bp-past { color: #D0CFC9; cursor: default; }
    .bp-empty { cursor: default; }
    .bp-sel { background: VAR_COLOR !important; color: white !important; }
    .bp-slots { display: grid; grid-template-columns: repeat(3,1fr); gap: 5px; padding: 0 12px 8px; }
    .bp-slot { font-size: 11px; padding: 6px 4px; border-radius: 6px; border: 0.5px solid #E5E4E0; background: white; cursor: pointer; text-align: center; transition: background 0.15s; }
    .bp-slot:hover:not(.bp-slot-busy) { background: VAR_COLOR_LIGHT; border-color: VAR_COLOR; color: VAR_COLOR; }
    .bp-slot-busy { background: #FCEBEB; color: #A32D2D; border-color: #F09595; cursor: not-allowed; text-decoration: line-through; }
    .bp-mybooking { background: #F8F7F4; border-radius: 8px; padding: 10px 12px; margin: 0 12px 6px; border-left: 3px solid VAR_COLOR; }
    .bp-mybooking-title { font-size: 12px; font-weight: 500; }
    .bp-mybooking-dt { font-size: 11px; color: #5F5E5A; margin-top: 3px; }
    .bp-mybooking-badge { display: inline-block; margin-top: 5px; font-size: 10px; padding: 2px 8px; border-radius: 20px; background: #EAF3DE; color: #27500A; }
    .bp-dsgvo { font-size: 10px; color: #9E9D99; padding: 6px 12px; text-align: center; border-top: 0.5px solid #E5E4E0; }
  `
  // Replace color variables
  const color = script?.getAttribute('data-color') || '#185FA5'
  const colorLight = color + '18'
  style.textContent = style.textContent
    .replaceAll('VAR_COLOR_LIGHT', colorLight)
    .replaceAll('VAR_COLOR', color)
  document.head.appendChild(style)

  // Widget HTML
  const wrap = document.createElement('div')
  wrap.id = 'bp-widget'
  wrap.innerHTML = `
    <div id="bp-window">
      <div id="bp-header">
        <div class="bp-hav"><svg viewBox="0 0 24 24"><path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7H3a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2zM7 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm10 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM12 22c-4.42 0-8-1.79-8-4h16c0 2.21-3.58 4-8 4z"/></svg></div>
        <div><div class="bp-hname" id="bp-hname">Assistent</div><div class="bp-hstatus">● Online</div></div>
        <button class="bp-hclose" onclick="document.getElementById('bp-window').classList.remove('open');document.getElementById('bp-bubble').style.display='flex'">✕</button>
      </div>
      <div id="bp-msgs"></div>
      <div id="bp-extra"></div>
      <div id="bp-input-row">
        <input id="bp-input" placeholder="Nachricht schreiben..." />
        <button id="bp-send">➤</button>
      </div>
    </div>
    <button id="bp-bubble" aria-label="Chat öffnen">
      <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
    </button>
  `
  document.body.appendChild(wrap)

  // Events
  document.getElementById('bp-bubble').addEventListener('click', () => {
    document.getElementById('bp-window').classList.toggle('open')
    if (!config) initChat()
  })
  document.getElementById('bp-send').addEventListener('click', handleInput)
  document.getElementById('bp-input').addEventListener('keydown', e => { if (e.key === 'Enter') handleInput() })

  // ---- Chat logic ----
  async function initChat() {
    try {
      const data = await fetchConfig()
      config = data
      document.getElementById('bp-hname').textContent = config.client.botName
      addMsg(config.client.greeting)
      showMainMenu()
    } catch (e) {
      addMsg('Der Bot ist momentan nicht verfügbar. Bitte versuchen Sie es später erneut.')
    }
  }

  function addMsg(text, type = 'bot') {
    const msgs = document.getElementById('bp-msgs')
    const d = document.createElement('div')
    d.className = `bp-msg bp-${type}`
    d.innerHTML = text
    msgs.appendChild(d)
    msgs.scrollTop = msgs.scrollHeight

    // DSGVO notice on first bot message
    if (type === 'bot' && config?.client?.dsgvo && !document.getElementById('bp-dsgvo')) {
      const dsgvo = document.createElement('div')
      dsgvo.id = 'bp-dsgvo'
      dsgvo.className = 'bp-dsgvo'
      dsgvo.textContent = 'Ihre Daten werden gemäß unserer Datenschutzerklärung verarbeitet.'
      document.getElementById('bp-input-row').before(dsgvo)
    }
  }

  function clearExtra() { document.getElementById('bp-extra').innerHTML = '' }

  function showChoices(opts, cb) {
    clearExtra()
    const wrap = document.createElement('div')
    wrap.className = 'bp-choices'
    opts.forEach(o => {
      const b = document.createElement('button')
      b.className = 'bp-choice'; b.textContent = o
      b.addEventListener('click', () => cb(o))
      wrap.appendChild(b)
    })
    document.getElementById('bp-extra').appendChild(wrap)
  }

  function showMainMenu() {
    showChoices(['Termin vereinbaren', 'Meine Termine', 'Öffnungszeiten', 'Kontakt'], opt => {
      clearExtra(); addMsg(opt, 'user')
      if (opt === 'Termin vereinbaren') startBooking()
      else if (opt === 'Meine Termine') showMyBookings()
      else if (opt === 'Öffnungszeiten') {
        const openDays = config.hours.filter(h => h.isOpen)
        const text = openDays.length ? openDays.map(h => `${['Mo','Di','Mi','Do','Fr','Sa','So'][h.dayIndex]}: ${h.from}–${h.to} Uhr`).join('<br>') : 'Keine Öffnungszeiten konfiguriert.'
        addMsg(text); showChoices(['Zurück'], () => { clearExtra(); showMainMenu() })
      } else {
        const c = config.client
        addMsg(`${c.phone ? '📞 ' + c.phone + '<br>' : ''}${c.email ? '✉️ ' + c.email + '<br>' : ''}${c.address ? '📍 ' + c.address : ''}`)
        showChoices(['Zurück'], () => { clearExtra(); showMainMenu() })
      }
    })
  }

  function startBooking() {
    state = { step: 'name', name: '', phone: '', service: '', date: '', time: '' }
    addMsg('Gerne! Darf ich zunächst Ihren vollständigen Namen erfahren?')
  }

  function showMyBookings() {
    clearExtra()
    if (myBookings.length === 0) {
      addMsg('Sie haben in dieser Sitzung noch keine Termine gebucht.')
      showChoices(['Termin vereinbaren', 'Zurück'], opt => {
        clearExtra(); addMsg(opt, 'user')
        opt === 'Termin vereinbaren' ? startBooking() : showMainMenu()
      })
      return
    }
    addMsg('Ihre Termine:')
    myBookings.forEach(b => {
      const d = document.createElement('div')
      d.className = 'bp-mybooking'
      d.innerHTML = `<div class="bp-mybooking-title">📋 ${b.serviceName}</div>
        <div class="bp-mybooking-dt">📅 ${friendlyDate(b.date)} um ${b.time} Uhr</div>
        <div class="bp-mybooking-dt">👤 ${b.name} · 📞 ${b.phone}</div>
        <span class="bp-mybooking-badge">✓ Bestätigt</span>`
      document.getElementById('bp-extra').appendChild(d)
    })
    showChoices(['Weiteren Termin', 'Zurück'], opt => {
      clearExtra(); addMsg(opt, 'user')
      opt === 'Weiteren Termin' ? startBooking() : showMainMenu()
    })
  }

  function handleInput() {
    const inp = document.getElementById('bp-input')
    const val = inp.value.trim(); if (!val) return; inp.value = ''
    addMsg(val, 'user')

    if (state.step === 'name') {
      if (val.split(' ').length < 2) { addMsg('Bitte geben Sie Vor- und Nachnamen an.'); return }
      state.name = val; state.step = 'phone'
      addMsg(`Danke, ${val.split(' ')[0]}! Wie lautet Ihre Telefonnummer?`)
    } else if (state.step === 'phone') {
      if (val.replace(/[\s\-\+\(\)]/g, '').length < 8) { addMsg('Die Nummer scheint nicht korrekt. Bitte erneut eingeben.'); return }
      state.phone = val; state.step = 'service'
      addMsg('Welche Leistung wünschen Sie?')
      showChoices(config.services.map(s => s.name), svc => {
        clearExtra(); addMsg(svc, 'user')
        state.service = svc; state.step = 'date'
        addMsg('Bitte wählen Sie ein Datum:')
        showCalendar()
      })
    } else {
      addMsg('Bitte nutzen Sie die Schaltflächen.')
    }
  }

  function showCalendar() {
    clearExtra()
    const year = calMonth.getFullYear(), month = calMonth.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const offset = (firstDay + 6) % 7
    const daysInMonth = new Date(year, month + 1, 0).getDate()

    const cal = document.createElement('div'); cal.className = 'bp-cal'
    let grid = '<div class="bp-cal-grid">'
    DE_DAYS_SHORT.forEach(d => grid += `<div class="bp-dn">${d}</div>`)
    for (let i = 0; i < offset; i++) grid += '<div class="bp-day bp-empty"></div>'
    for (let d = 1; d <= daysInMonth; d++) {
      const ds = fmt(new Date(year, month, d))
      const dateObj = new Date(year, month, d)
      const isPast = dateObj < TODAY
      const isOpen = isDayOpen(ds)
      let cls = 'bp-day'
      if (isPast || !isOpen) cls += ' bp-past'
      if (ds === state.date) cls += ' bp-sel'
      grid += `<button class="${cls}" data-date="${ds}" ${isPast || !isOpen ? 'disabled' : ''}>${d}</button>`
    }
    grid += '</div>'
    cal.innerHTML = `<div class="bp-cal-head">
      <button class="bp-cal-nav" id="bp-prev">‹</button>
      <span>${DE_MONTHS[month]} ${year}</span>
      <button class="bp-cal-nav" id="bp-next">›</button>
    </div>${grid}`
    document.getElementById('bp-extra').appendChild(cal)

    cal.querySelector('#bp-prev').addEventListener('click', () => { calMonth = new Date(year, month - 1, 1); showCalendar() })
    cal.querySelector('#bp-next').addEventListener('click', () => { calMonth = new Date(year, month + 1, 1); showCalendar() })
    cal.querySelectorAll('.bp-day:not(.bp-past):not(.bp-empty)').forEach(btn => {
      btn.addEventListener('click', () => pickDate(btn.dataset.date))
    })
  }

  async function pickDate(ds) {
    clearExtra()
    const busy = await getBusySlots(ds)
    const dayIndex = (parseDate(ds).getDay() + 6) % 7
    const hour = config.hours.find(h => h.dayIndex === dayIndex)
    const slots = generateSlots(hour.from, hour.to, config.client.slotDuration, busy)
    const allBusy = slots.every(s => s.busy)

    if (allBusy) {
      addMsg(`⚠️ Der <strong>${friendlyDate(ds)}</strong> ist leider vollständig ausgebucht.`, 'warn')
      addMsg('Suche nach Alternativen...')
      const alts = await findAlternatives(ds, 3)
      if (!alts.length) { addMsg('Leider keine freien Termine in nächster Zeit. Bitte rufen Sie uns an.'); return }
      addMsg('Ich empfehle folgende Termine:')
      showChoices(alts.map(friendlyDate), opt => {
        const altDs = alts.find(d => friendlyDate(d) === opt)
        clearExtra(); addMsg(opt, 'user'); state.date = altDs
        addMsg('Bitte wählen Sie eine Uhrzeit:')
        pickDate(altDs)
      })
      return
    }

    state.date = ds
    addMsg('📅 ' + friendlyDate(ds), 'user')
    addMsg('Bitte wählen Sie eine Uhrzeit:')
    const slotWrap = document.createElement('div'); slotWrap.className = 'bp-slots'
    slots.forEach(s => {
      const btn = document.createElement('button')
      btn.className = 'bp-slot' + (s.busy ? ' bp-slot-busy' : '')
      btn.textContent = s.time + (s.busy ? ' ✕' : ' Uhr')
      btn.disabled = s.busy
      btn.addEventListener('click', () => pickTime(s.time))
      slotWrap.appendChild(btn)
    })
    document.getElementById('bp-extra').appendChild(slotWrap)
  }

  function pickTime(t) {
    clearExtra(); state.time = t; addMsg(t + ' Uhr', 'user')
    addMsg(`Bitte bestätigen Sie Ihren Termin:<br><br>👤 <strong>${state.name}</strong><br>📞 ${state.phone}<br>📋 ${state.service}<br>📅 ${friendlyDate(state.date)} um <strong>${t} Uhr</strong>`, 'confirm')
    showChoices(['Ja, bestätigen', 'Ändern'], confirmBooking)
  }

  async function confirmBooking(opt) {
    clearExtra(); addMsg(opt, 'user')
    if (opt === 'Ja, bestätigen') {
      try {
        const res = await fetch(`${BASE_URL}/api/bookings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: BOT_ID,
            customerName: state.name,
            customerPhone: state.phone,
            serviceName: state.service,
            bookingDate: state.date,
            bookingTime: state.time,
          })
        })
        if (res.status === 409) {
          addMsg('⚠️ Dieser Slot wurde gerade von jemand anderem gebucht. Bitte wählen Sie eine andere Zeit.', 'warn')
          showCalendar(); return
        }
        if (!res.ok) throw new Error()
        myBookings.push({ name: state.name, phone: state.phone, serviceName: state.service, date: state.date, time: state.time })
        addMsg(`🎉 Ihr Termin wurde erfolgreich gebucht!<br><br>Wir melden uns unter <strong>${state.phone}</strong>.<br>Bis ${friendlyDate(state.date)} um ${state.time} Uhr!`, 'confirm')
        showChoices(['Meine Termine', 'Zurück zum Menü'], opt2 => {
          clearExtra(); addMsg(opt2, 'user')
          opt2 === 'Meine Termine' ? showMyBookings() : showMainMenu()
        })
      } catch {
        addMsg('Buchung fehlgeschlagen. Bitte versuchen Sie es erneut oder rufen Sie uns an.')
      }
    } else {
      addMsg('Was möchten Sie ändern?')
      showChoices(['Leistung', 'Datum & Uhrzeit', 'Von vorne'], opt2 => {
        clearExtra(); addMsg(opt2, 'user')
        if (opt2 === 'Leistung') { state.step = 'service'; addMsg('Welche Leistung?'); showChoices(config.services.map(s => s.name), svc => { clearExtra(); addMsg(svc,'user'); state.service=svc; addMsg('Bitte wählen Sie ein Datum:'); showCalendar() }) }
        else if (opt2 === 'Datum & Uhrzeit') { addMsg('Bitte wählen Sie ein neues Datum:'); showCalendar() }
        else { showMainMenu() }
      })
    }
  }
})()
