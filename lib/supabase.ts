import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

// ---- Types ----
export type Client = {
  id: string
  name: string
  domain: string
  active: boolean
  color: string
  bot_name: string
  greeting: string
  phone?: string
  email?: string
  address?: string
  description?: string
  slot_duration: number
  dsgvo: boolean
  webhook?: string
  created_at?: string
}

export type Service = {
  id: string
  client_id: string
  name: string
  duration: number
  price: string
  color: string
}

export type OpeningHour = {
  id?: string
  client_id: string
  day_index: number
  is_open: boolean
  time_from: string
  time_to: string
}

export type Booking = {
  id: string
  client_id: string
  customer_name: string
  customer_phone: string
  service_name: string
  booking_date: string
  booking_time: string
  status: 'new' | 'done' | 'cancelled'
  created_at?: string
}

// ---- Helper functions ----
export async function getClients() {
  const { data, error } = await supabase.from('clients').select('*').order('created_at')
  if (error) throw error
  return data as Client[]
}

export async function getClient(id: string) {
  const { data, error } = await supabase.from('clients').select('*').eq('id', id).single()
  if (error) throw error
  return data as Client
}

export async function getServices(clientId: string) {
  const { data, error } = await supabase.from('services').select('*').eq('client_id', clientId).order('created_at')
  if (error) throw error
  return data as Service[]
}

export async function getOpeningHours(clientId: string) {
  const { data, error } = await supabase.from('opening_hours').select('*').eq('client_id', clientId).order('day_index')
  if (error) throw error
  return data as OpeningHour[]
}

export async function getBookings(clientId: string) {
  const { data, error } = await supabase.from('bookings').select('*').eq('client_id', clientId).order('booking_date').order('booking_time')
  if (error) throw error
  return data as Booking[]
}

export async function getBookingsForDate(clientId: string, date: string) {
  const { data, error } = await supabase.from('bookings').select('booking_time').eq('client_id', clientId).eq('booking_date', date).neq('status', 'cancelled')
  if (error) throw error
  return (data as { booking_time: string }[]).map(b => b.booking_time)
}

export async function createBooking(booking: Omit<Booking, 'id' | 'created_at'>) {
  const { data, error } = await supabase.from('bookings').insert(booking).select().single()
  if (error) throw error
  return data as Booking
}

export async function updateBookingStatus(id: string, status: Booking['status']) {
  const { error } = await supabase.from('bookings').update({ status }).eq('id', id)
  if (error) throw error
}

export async function updateClient(id: string, updates: Partial<Client>) {
  const { error } = await supabase.from('clients').update(updates).eq('id', id)
  if (error) throw error
}

export async function createClient_(client: Omit<Client, 'id' | 'created_at'>) {
  const { data, error } = await supabase.from('clients').insert(client).select().single()
  if (error) throw error
  return data as Client
}

export async function upsertServices(clientId: string, services: Omit<Service, 'id' | 'client_id'>[]) {
  // Șterge vechile și inserează noi
  await supabase.from('services').delete().eq('client_id', clientId)
  if (services.length === 0) return
  const { error } = await supabase.from('services').insert(services.map(s => ({ ...s, client_id: clientId })))
  if (error) throw error
}

export async function upsertOpeningHours(clientId: string, hours: Omit<OpeningHour, 'id' | 'client_id'>[]) {
  await supabase.from('opening_hours').delete().eq('client_id', clientId)
  const { error } = await supabase.from('opening_hours').insert(hours.map(h => ({ ...h, client_id: clientId })))
  if (error) throw error
}

// Generează slot-uri disponibile pentru o zi
export function generateSlots(timeFrom: string, timeTo: string, slotDuration: number, busySlots: string[]): { time: string; busy: boolean }[] {
  const slots: { time: string; busy: boolean }[] = []
  const [fh, fm] = timeFrom.split(':').map(Number)
  const [th, tm] = timeTo.split(':').map(Number)
  let minutes = fh * 60 + fm
  const endMinutes = th * 60 + tm

  while (minutes + slotDuration <= endMinutes) {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    slots.push({ time, busy: busySlots.includes(time) })
    minutes += slotDuration
  }
  return slots
}
