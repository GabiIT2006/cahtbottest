import { NextRequest, NextResponse } from 'next/server'
import { getClient, getServices, getOpeningHours, getBookingsForDate } from '../../../lib/supabase'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

export async function GET(req: NextRequest) {
  const botId = req.nextUrl.searchParams.get('botId')
  const date = req.nextUrl.searchParams.get('date')

  if (!botId) return NextResponse.json({ error: 'Missing botId' }, { status: 400, headers: CORS_HEADERS })

  try {
    const [client, services, hours] = await Promise.all([
      getClient(botId),
      getServices(botId),
      getOpeningHours(botId),
    ])

    if (!client.active) return NextResponse.json({ error: 'Bot ist deaktiviert' }, { status: 403, headers: CORS_HEADERS })

    let busySlots: string[] = []
    if (date) busySlots = await getBookingsForDate(botId, date)

    return NextResponse.json({
      client: {
        id: client.id,
        name: client.name,
        botName: client.bot_name,
        greeting: client.greeting,
        color: client.color,
        phone: client.phone,
        email: client.email,
        address: client.address,
        description: client.description,
        slotDuration: client.slot_duration,
        dsgvo: client.dsgvo,
      },
      services: services.map(s => ({ id: s.id, name: s.name, duration: s.duration, price: s.price })),
      hours: hours.map(h => ({ dayIndex: h.day_index, isOpen: h.is_open, from: h.time_from, to: h.time_to })),
      busySlots,
    }, { headers: CORS_HEADERS })
  } catch (e) {
    return NextResponse.json({ error: 'Kunde nicht gefunden' }, { status: 404, headers: CORS_HEADERS })
  }
}
