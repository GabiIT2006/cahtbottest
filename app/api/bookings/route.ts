import { NextRequest, NextResponse } from 'next/server'
import { createBooking, getBookingsForDate } from '../../../lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { clientId, customerName, customerPhone, serviceName, bookingDate, bookingTime } = body

    if (!clientId || !customerName || !customerPhone || !serviceName || !bookingDate || !bookingTime) {
      return NextResponse.json({ error: 'Fehlende Felder' }, { status: 400 })
    }

    // Check if slot is still available
    const busy = await getBookingsForDate(clientId, bookingDate)
    if (busy.includes(bookingTime)) {
      return NextResponse.json({ error: 'Dieser Termin ist bereits vergeben' }, { status: 409 })
    }

    const booking = await createBooking({
      client_id: clientId,
      customer_name: customerName,
      customer_phone: customerPhone,
      service_name: serviceName,
      booking_date: bookingDate,
      booking_time: bookingTime,
      status: 'new',
    })

    // Trigger webhook if configured
    // (webhook URL would need to be fetched from client config)

    return NextResponse.json({ success: true, bookingId: booking.id })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Buchung fehlgeschlagen' }, { status: 500 })
  }
}
