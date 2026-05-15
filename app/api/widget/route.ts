import { NextRequest, NextResponse } from 'next/server'
 
const WIDGET_CODE = `
(function () {
  const script = document.currentScript || document.querySelector('script[data-bot-id]')
  const BOT_ID = script?.getAttribute('data-bot-id')
  const BASE_URL = 'https://cahtbottest.vercel.app'
  const COLOR = script?.getAttribute('data-color') || '#185FA5'
 
  if (!BOT_ID) { console.warn('BotPanel: data-bot-id missing'); return }
 
  let config = null
  let state = { step: 'start', name: '', phone: '', service: '', date: '', time: '' }
  let myBookings = []
  let calMonth = new Date(); calMonth.setDate(1)
 
  const DE_MONTHS = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember']
  const DE_DAYS_SHORT = ['Mo','Di','Mi','Do','Fr','Sa','So']
  const DE_DAYS = ['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag']
  const TODAY = new Date(); TODAY.setHours(0,0,0,0)
 
  function fmt(d) { return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0') }
  function addDays(d,n) { const r=new Date(d); r.setDate(r.getDate()+n); return r }
  function parseDate(s) { const[y,m,d]=s.split('-').map(Number); return new Date(y,m-1,d) }
  function friendlyDate(s) {
    const d = parseDate(s)
    return DE_DAYS[d.getDay()]+', '+d.getDate()+'. '+DE_MONTHS[d.getMonth()]
  }
 
  async function fetchConfig(date) {
    const url = BASE_URL+'/api/widget-config?botId='+BOT_ID+(date?'&date='+date:'')
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
      const t = h+':'+m
      slots.push({ time: t, busy: busy.includes(t) })
      min += interval
    }
    return slots
  }
 
  function isDayOpen(dateStr) {
    if (!config) return false
    const d = parseDate(dateStr)
    const dayIndex = (d.getDay() + 6) % 7
    const hour = config.hours.find(function(h){ return h.dayIndex === dayIndex })
    return hour && hour.isOpen && hour.from && hour.to
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
      const dayIndex = (d.getDay()+6)%7
      const hour = config.hours.find(function(h){ return h.dayIndex === dayIndex })
      const slots = generateSlots(hour.from, hour.to, config.client.slotDuration, busy)
      if (slots.some(function(s){ return !s.busy })) alts.push(ds)
    }
    return alts
  }
 
  const colorLight = COLOR + '18'
  const style = document.createElement('style')
  style.textContent = [
    '#bp-widget * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif; }',
    '#bp-widget { position: fixed; bottom: 24px; right: 24px; z-index: 999999; }',
    '#bp-bubble { width: 58px; height: 58px; border-radius: 50%; background: '+COLOR+'; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 6px 24px rgba(0,0,0,0.22); border: none; transition: transform 0.2s, box-shadow 0.2s; }',
    '#bp-bubble:hover { transform: scale(1.1); box-shadow: 0 8px 28px rgba(0,0,0,0.28); }',
    '#bp-bubble svg { width: 28px; height: 28px; fill: white; }',
    '#bp-window { position: absolute; bottom: 72px; right: 0; width: 370px; background: white; border: none; border-radius: 18px; overflow: hidden; display: none; flex-direction: column; max-height: 600px; box-shadow: 0 12px 48px rgba(0,0,0,0.18); }',
    '#bp-window.open { display: flex; }',
    '#bp-header { background: '+COLOR+'; padding: 14px 16px; display: flex; align-items: center; gap: 12px; }',
    '.bp-hav { width: 36px; height: 36px; border-radius: 50%; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }',
    '.bp-hav svg { width: 20px; height: 20px; fill: white; }',
    '.bp-hname { font-size: 14px; font-weight: 600; color: white; }',
    '.bp-hstatus { font-size: 11px; color: rgba(255,255,255,0.8); margin-top: 1px; }',
    '.bp-hclose { margin-left: auto; cursor: pointer; background: rgba(255,255,255,0.15); border: none; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; transition: background 0.2s, transform 0.2s; flex-shrink: 0; line-height: 1; }',
    '.bp-hclose:hover { background: rgba(255,255,255,0.3); transform: rotate(90deg); }',
    '#bp-msgs { flex: 1; overflow-y: auto; padding: 14px; display: flex; flex-direction: column; gap: 10px; min-height: 200px; }',
    '.bp-msg { max-width: 88%; font-size: 13px; line-height: 1.55; padding: 10px 13px; border-radius: 12px; }',
    '.bp-bot { background: #F1EFE8; color: #1A1917; align-self: flex-start; border-bottom-left-radius: 3px; }',
    '.bp-user { background: '+COLOR+'; color: white; align-self: flex-end; border-bottom-right-radius: 3px; }',
    '.bp-confirm { background: #EAF3DE; color: #27500A; align-self: flex-start; border-bottom-left-radius: 3px; border: 0.5px solid #C0DD97; }',
    '.bp-warn { background: #FAEEDA; color: #633806; align-self: flex-start; border-bottom-left-radius: 3px; border: 0.5px solid #FAC775; }',
    '.bp-choices { display: flex; flex-wrap: wrap; gap: 8px; padding: 4px 14px 12px; }',
    '.bp-choice { font-size: 13px; padding: 8px 16px; border-radius: 24px; border: 1.5px solid '+COLOR+'; color: '+COLOR+'; background: transparent; cursor: pointer; font-weight: 500; transition: background 0.15s, transform 0.1s, box-shadow 0.15s; }',
    '.bp-choice:hover { background: '+colorLight+'; transform: translateY(-1px); box-shadow: 0 3px 10px rgba(0,0,0,0.1); }',
    '#bp-input-row { display: flex; gap: 8px; padding: 12px 14px; border-top: 1px solid #F0EEE8; }',
    '#bp-input { flex: 1; font-size: 13px; padding: 9px 12px; border: 1.5px solid #E5E4E0; border-radius: 10px; outline: none; transition: border-color 0.2s; }',
    '#bp-input:focus { border-color: '+COLOR+'; }',
    '#bp-send { padding: 9px 13px; background: '+COLOR+'; border: none; border-radius: 10px; cursor: pointer; color: white; font-size: 17px; transition: opacity 0.15s; }',
    '#bp-send:hover { opacity: 0.85; }',
    '.bp-cal { background: #F8F7F4; border-radius: 10px; padding: 12px; font-size: 13px; margin: 0 14px 10px; }',
    '.bp-cal-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }',
    '.bp-cal-head span { font-weight: 600; font-size: 13px; }',
    '.bp-cal-nav { background: white; border: 1px solid #E5E4E0; cursor: pointer; color: #5F5E5A; font-size: 16px; padding: 3px 8px; border-radius: 6px; transition: background 0.15s; }',
    '.bp-cal-nav:hover { background: #EEEDEA; }',
    '.bp-cal-grid { display: grid; grid-template-columns: repeat(7,1fr); gap: 3px; text-align: center; }',
    '.bp-dn { font-size: 10px; color: #9E9D99; padding: 3px 0; font-weight: 600; }',
    '.bp-day { width: 100%; aspect-ratio: 1; display: flex; align-items: center; justify-content: center; border-radius: 50%; cursor: pointer; font-size: 12px; border: none; background: none; transition: background 0.15s; }',
    '.bp-day:hover:not(.bp-busy):not(.bp-past):not(.bp-empty) { background: '+colorLight+'; color: '+COLOR+'; }',
    '.bp-busy { background: #FCEBEB; color: #A32D2D; cursor: pointer; }',
    '.bp-past { color: #D0CFC9; cursor: default; }',
    '.bp-empty { cursor: default; }',
    '.bp-sel { background: '+COLOR+' !important; color: white !important; }',
    '.bp-slots { display: grid; grid-template-columns: repeat(3,1fr); gap: 6px; padding: 0 14px 10px; }',
    '.bp-slot { font-size: 12px; padding: 8px 4px; border-radius: 8px; border: 1.5px solid #E5E4E0; background: white; cursor: pointer; text-align: center; font-weight: 500; transition: background 0.15s, border-color 0.15s; }',
    '.bp-slot:hover:not(.bp-slot-busy) { background: '+colorLight+'; border-color: '+COLOR+'; color: '+COLOR+'; }',
    '.bp-slot-busy { background: #FCEBEB; color: #A32D2D; border-color: #F09595; cursor: not-allowed; text-decoration: line-through; }',
    '.bp-mybooking { background: #F8F7F4; border-radius: 10px; padding: 12px 14px; margin: 0 14px 8px; border-left: 3px solid '+COLOR+'; }',
    '.bp-mybooking-title { font-size: 13px; font-weight: 600; }',
    '.bp-mybooking-dt { font-size: 12px; color: #5F5E5A; margin-top: 4px; }',
    '.bp-mybooking-badge { display: inline-block; margin-top: 6px; font-size: 11px; padding: 3px 10px; border-radius: 20px; background: #EAF3DE; color: #27500A; }',
    '.bp-dsgvo { font-size: 10px; color: #9E9D99; padding: 6px 14px; text-align: center; border-top: 1px solid #F0EEE8; }'
  ].join(' ')
  document.head.appendChild(style)
 
  const wrap = document.createElement('div')
  wrap.id = 'bp-widget'
  wrap.innerHTML = '<div id="bp-window"><div id="bp-header"><div class="bp-hav"><svg viewBox="0 0 24 24"><path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7H3a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2zM7 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm10 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM12 22c-4.42 0-8-1.79-8-4h16c0 2.21-3.58 4-8 4z"/></svg></div><div><div class="bp-hname" id="bp-hname">Assistent</div><div class="bp-hstatus">&#9679; Online</div></div><button class="bp-hclose" id="bp-close">&#x2715;</button></div><div id="bp-msgs"></div><div id="bp-extra"></div><div id="bp-input-row"><input id="bp-input" placeholder="Nachricht schreiben..." /><button id="bp-send">&#10148;</button></div></div><button id="bp-bubble" aria-label="Chat öffnen"><svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg></button>'
  document.body.appendChild(wrap)
 
  document.getElementById('bp-bubble').addEventListener('click', function() {
    document.getElementById('bp-window').classList.toggle('open')
    if (!config) initChat()
  })
  document.getElementById('bp-close').addEventListener('click', function() {
    document.getElementById('bp-window').classList.remove('open')
  })
  document.getElementById('bp-send').addEventListener('click', handleInput)
  document.getElementById('bp-input').addEventListener('keydown', function(e) { if (e.key === 'Enter') handleInput() })
 
  async function initChat() {
    try {
      const data = await fetchConfig()
      config = data
      document.getElementById('bp-hname').textContent = config.client.botName
      addMsg(config.client.greeting)
      if (config.client.dsgvo) {
        const dsgvo = document.createElement('div')
        dsgvo.className = 'bp-dsgvo'
        dsgvo.textContent = 'Ihre Daten werden gemäß unserer Datenschutzerklärung verarbeitet.'
        document.getElementById('bp-input-row').before(dsgvo)
      }
      showMainMenu()
    } catch(e) {
      addMsg('Der Bot ist momentan nicht verfügbar.')
    }
  }
 
  function addMsg(text, type) {
    type = type || 'bot'
    const msgs = document.getElementById('bp-msgs')
    const d = document.createElement('div')
    d.className = 'bp-msg bp-'+type
    d.innerHTML = text
    msgs.appendChild(d)
    msgs.scrollTop = msgs.scrollHeight
  }
 
  function clearExtra() { document.getElementById('bp-extra').innerHTML = '' }
 
  function showChoices(opts, cb) {
    clearExtra()
    const wrap = document.createElement('div')
    wrap.className = 'bp-choices'
    opts.forEach(function(o) {
      const b = document.createElement('button')
      b.className = 'bp-choice'; b.textContent = o
      b.addEventListener('click', function() { cb(o) })
      wrap.appendChild(b)
    })
    document.getElementById('bp-extra').appendChild(wrap)
  }
 
  function showMainMenu() {
    showChoices(['Termin vereinbaren','Meine Termine','Öffnungszeiten','Kontakt'], function(opt) {
      clearExtra(); addMsg(opt, 'user')
      if (opt === 'Termin vereinbaren') startBooking()
      else if (opt === 'Meine Termine') showMyBookings()
      else if (opt === 'Öffnungszeiten') {
        const openDays = config.hours.filter(function(h){ return h.isOpen })
        const dn = ['Mo','Di','Mi','Do','Fr','Sa','So']
        const text = openDays.length ? openDays.map(function(h){ return dn[h.dayIndex]+': '+h.from+'\u2013'+h.to+' Uhr' }).join('<br>') : 'Keine Öffnungszeiten konfiguriert.'
        addMsg(text); showChoices(['Zurück'], function(){ clearExtra(); showMainMenu() })
      } else {
        const c = config.client
        addMsg((c.phone?'📞 '+c.phone+'<br>':'')+(c.email?'✉️ '+c.email+'<br>':'')+(c.address?'📍 '+c.address:''))
        showChoices(['Zurück'], function(){ clearExtra(); showMainMenu() })
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
      addMsg('Sie haben noch keine Termine gebucht.')
      showChoices(['Termin vereinbaren','Zurück'], function(opt){ clearExtra(); addMsg(opt,'user'); opt==='Termin vereinbaren'?startBooking():showMainMenu() })
      return
    }
    addMsg('Ihre Termine:')
    myBookings.forEach(function(b) {
      const d = document.createElement('div')
      d.className = 'bp-mybooking'
      d.innerHTML = '<div class="bp-mybooking-title">📋 '+b.serviceName+'</div><div class="bp-mybooking-dt">📅 '+friendlyDate(b.date)+' um '+b.time+' Uhr</div><div class="bp-mybooking-dt">👤 '+b.name+' · 📞 '+b.phone+'</div><span class="bp-mybooking-badge">✓ Bestätigt</span>'
      document.getElementById('bp-extra').appendChild(d)
    })
    showChoices(['Weiteren Termin','Zurück'], function(opt){ clearExtra(); addMsg(opt,'user'); opt==='Weiteren Termin'?startBooking():showMainMenu() })
  }
 
  function handleInput() {
    const inp = document.getElementById('bp-input')
    const val = inp.value.trim(); if (!val) return; inp.value = ''
    addMsg(val, 'user')
    if (state.step === 'name') {
      if (val.split(' ').length < 2) { addMsg('Bitte Vor- und Nachname angeben.'); return }
      state.name = val; state.step = 'phone'
      addMsg('Danke, '+val.split(' ')[0]+'! Ihre Telefonnummer bitte?')
    } else if (state.step === 'phone') {
      if (val.replace(/[\s\-\+\(\)]/g,'').length < 8) { addMsg('Bitte gültige Nummer eingeben.'); return }
      state.phone = val; state.step = 'service'
      addMsg('Welche Leistung wünschen Sie?')
      showChoices(config.services.map(function(s){ return s.name }), function(svc){
        clearExtra(); addMsg(svc,'user'); state.service=svc; state.step='date'
        addMsg('Bitte wählen Sie ein Datum:'); showCalendar()
      })
    } else {
      addMsg('Bitte nutzen Sie die Schaltflächen.')
    }
  }
 
  function showCalendar() {
    clearExtra()
    const year = calMonth.getFullYear(), month = calMonth.getMonth()
    const firstDay = new Date(year,month,1).getDay()
    const offset = (firstDay+6)%7
    const daysInMonth = new Date(year,month+1,0).getDate()
    const cal = document.createElement('div'); cal.className = 'bp-cal'
    let grid = '<div class="bp-cal-grid">'
    DE_DAYS_SHORT.forEach(function(d){ grid += '<div class="bp-dn">'+d+'</div>' })
    for (let i=0;i<offset;i++) grid += '<div class="bp-day bp-empty"></div>'
    for (let d=1;d<=daysInMonth;d++) {
      const ds = fmt(new Date(year,month,d))
      const dateObj = new Date(year,month,d)
      const isPast = dateObj < TODAY
      const isOpen = isDayOpen(ds)
      let cls = 'bp-day'
      if (isPast||!isOpen) cls += ' bp-past'
      if (ds===state.date) cls += ' bp-sel'
      grid += '<button class="'+cls+'" data-date="'+ds+'" '+(isPast||!isOpen?'disabled':'')+'>'+d+'</button>'
    }
    grid += '</div>'
    cal.innerHTML = '<div class="bp-cal-head"><button class="bp-cal-nav" id="bp-prev">&#8249;</button><span>'+DE_MONTHS[month]+' '+year+'</span><button class="bp-cal-nav" id="bp-next">&#8250;</button></div>'+grid
    document.getElementById('bp-extra').appendChild(cal)
    cal.querySelector('#bp-prev').addEventListener('click', function(){ calMonth=new Date(year,month-1,1); showCalendar() })
    cal.querySelector('#bp-next').addEventListener('click', function(){ calMonth=new Date(year,month+1,1); showCalendar() })
    cal.querySelectorAll('.bp-day:not(.bp-past):not(.bp-empty)').forEach(function(btn){
      btn.addEventListener('click', function(){ pickDate(btn.dataset.date) })
    })
  }
 
  async function pickDate(ds) {
    clearExtra()
    const busy = await getBusySlots(ds)
    const dayIndex = (parseDate(ds).getDay()+6)%7
    const hour = config.hours.find(function(h){ return h.dayIndex===dayIndex })
    const slots = generateSlots(hour.from, hour.to, config.client.slotDuration, busy)
    const allBusy = slots.every(function(s){ return s.busy })
    if (allBusy) {
      addMsg('⚠️ Der <strong>'+friendlyDate(ds)+'</strong> ist leider vollständig ausgebucht.','warn')
      const alts = await findAlternatives(ds, 3)
      if (!alts.length) { addMsg('Leider keine freien Termine. Bitte rufen Sie uns an.'); return }
      addMsg('Ich empfehle folgende Termine:')
      showChoices(alts.map(friendlyDate), function(opt){
        const altDs = alts.find(function(d){ return friendlyDate(d)===opt })
        clearExtra(); addMsg(opt,'user'); state.date=altDs
        pickDate(altDs)
      })
      return
    }
    state.date = ds; addMsg('📅 '+friendlyDate(ds),'user'); addMsg('Bitte wählen Sie eine Uhrzeit:')
    const slotWrap = document.createElement('div'); slotWrap.className = 'bp-slots'
    slots.forEach(function(s){
      const btn = document.createElement('button')
      btn.className = 'bp-slot'+(s.busy?' bp-slot-busy':'')
      btn.textContent = s.time+(s.busy?' ✕':' Uhr'); btn.disabled = s.busy
      btn.addEventListener('click', function(){ pickTime(s.time) })
      slotWrap.appendChild(btn)
    })
    document.getElementById('bp-extra').appendChild(slotWrap)
  }
 
  function pickTime(t) {
    clearExtra(); state.time=t; addMsg(t+' Uhr','user')
    addMsg('Bitte bestätigen Sie:<br><br>👤 <strong>'+state.name+'</strong><br>📞 '+state.phone+'<br>📋 '+state.service+'<br>📅 '+friendlyDate(state.date)+' um <strong>'+t+' Uhr</strong>','confirm')
    showChoices(['Ja, bestätigen','Ändern'], confirmBooking)
  }
 
  async function confirmBooking(opt) {
    clearExtra(); addMsg(opt,'user')
    if (opt==='Ja, bestätigen') {
      try {
        const res = await fetch(BASE_URL+'/api/bookings', {
          method: 'POST',
          headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ clientId:BOT_ID, customerName:state.name, customerPhone:state.phone, serviceName:state.service, bookingDate:state.date, bookingTime:state.time })
        })
        if (res.status===409) { addMsg('⚠️ Dieser Slot wurde gerade gebucht. Bitte andere Zeit wählen.','warn'); showCalendar(); return }
        if (!res.ok) throw new Error()
        myBookings.push({name:state.name,phone:state.phone,serviceName:state.service,date:state.date,time:state.time})
        addMsg('🎉 Termin erfolgreich gebucht!<br><br>Wir melden uns unter <strong>'+state.phone+'</strong>.<br>Bis '+friendlyDate(state.date)+' um '+state.time+' Uhr!','confirm')
        showChoices(['Meine Termine','Zurück zum Menü'], function(opt2){ clearExtra(); addMsg(opt2,'user'); opt2==='Meine Termine'?showMyBookings():showMainMenu() })
      } catch(e) {
        addMsg('Buchung fehlgeschlagen. Bitte rufen Sie uns an.')
      }
    } else {
      showChoices(['Leistung','Datum & Uhrzeit','Von vorne'], function(opt2){
        clearExtra(); addMsg(opt2,'user')
        if (opt2==='Leistung') { showChoices(config.services.map(function(s){return s.name}), function(svc){ clearExtra(); addMsg(svc,'user'); state.service=svc; addMsg('Datum wählen:'); showCalendar() }) }
        else if (opt2==='Datum & Uhrzeit') { addMsg('Neues Datum wählen:'); showCalendar() }
        else showMainMenu()
      })
    }
  }
})()
`
 
export async function GET(req: NextRequest) {
  return new NextResponse(WIDGET_CODE, {
    headers: {
      'Content-Type': 'application/javascript',
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*',
    }
  })
}
