# BotPanel 🤖
### Sistem de chatbot pentru programări – 100% gratuit, fără card

---

## ✅ Pași de instalare (15 minute total)

### PASUL 1 – Creează baza de date Supabase (gratuit)

1. Mergi la **https://supabase.com** → "Start your project" → cont cu GitHub (gratuit)
2. Click "New project" → alege un nume → setează o parolă → "Create new project"
3. Așteaptă ~2 minute să se creeze
4. Mergi la **SQL Editor** (meniu stânga) → "New query"
5. Copiază tot conținutul din `supabase-schema.sql` → paste → click **Run**
6. Mergi la **Project Settings** → **API** și copiază:
   - `Project URL` → asta e `SUPABASE_URL`
   - `anon public` key → asta e `SUPABASE_ANON_KEY`

---

### PASUL 2 – Configurează aplicația

1. Copiază fișierul `.env.example` și redenumește-l `.env.local`
2. Completează cu valorile din Supabase:
```
NEXT_PUBLIC_SUPABASE_URL=https://xyzxyz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
ADMIN_PASSWORD=parola_ta_secreta
```

---

### PASUL 3 – Deploy pe Vercel (gratuit, fără card)

1. Mergi la **https://github.com** → creează un cont (dacă nu ai)
2. Creează un repository nou, încarcă toate fișierele din acest folder
3. Mergi la **https://vercel.com** → cont cu GitHub → "Import Project"
4. Selectează repository-ul tău
5. La "Environment Variables" adaugă cele 3 variabile din `.env.local`
6. Click **Deploy** → în 2 minute ai link-ul aplicației live!

---

### PASUL 4 – Adaugă botul pe site-ul clientului

După deploy, vei primi un URL de forma `https://botpanel-tau.vercel.app`.

Pune acest cod pe site-ul clientului, înainte de `</body>`:

```html
<script
  src="https://botpanel-tau.vercel.app/widget.js"
  data-bot-id="ID_CLIENTULUI"
  data-color="#185FA5"
></script>
```

`ID_CLIENTULUI` îl găsești în admin panel → client → tab Embed.

---

## 🗂 Structura proiectului

```
botpanel/
├── app/
│   ├── admin/                  ← Panel de administrare
│   │   ├── page.tsx            ← Dashboard principal
│   │   ├── bookings/           ← Lista programărilor
│   │   └── clients/[id]/       ← Configurare per client
│   └── api/
│       ├── widget-config/      ← API pentru widget
│       └── bookings/           ← API pentru programări
├── lib/
│   └── supabase.ts             ← Conexiune baza de date
├── public/
│   └── widget.js               ← Scriptul embeddabil
├── supabase-schema.sql         ← Schema baza de date
└── .env.example                ← Template variabile de mediu
```

---

## 🚀 Funcționalități

### Admin Panel (`/admin`)
- Dashboard cu statistici globale
- Lista tuturor programărilor cu filtre
- Configurare per client:
  - **Allgemein** – date firmă, descriere
  - **Leistungen** – servicii cu durată, preț, culoare
  - **Öffnungszeiten** – orar săptămânal cu preview slot-uri
  - **Bot** – nume bot, mesaj bun venit, culoare widget, DSGVO
  - **Embed** – cod de integrare, webhook

### Widget Chat
- Flow complet de programare în germană
- Calendar cu zile disponibile/ocupate
- Detectare automată zi plină → sugestii alternative
- Confirmare programare cu rezumat
- "Meine Termine" – clientul vede programările sesiunii
- DSGVO-Hinweis configurable

---

## 🛠 Rulare locală (pentru testare)

```bash
npm install
npm run dev
```

Deschide http://localhost:3000

---

## 📧 Support

Dacă ai întrebări, deschide o conversație cu Claude la claude.ai.
