'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// Junta los campos repetidos del formulario (parkinglot_0, restaurant_0, facade_photo_0, ...)
function collectIndexed(formData: FormData, prefix: string): string[] {
  const items: string[] = []
  for (const [key, value] of formData.entries()) {
    if (key.startsWith(prefix) && typeof value === 'string' && value.trim() !== '') {
      items.push(value.trim())
    }
  }
  return items
}

export async function createTheater(formData: FormData) {
  const supabase = await createClient()

  const data = {
    name: formData.get('name') as string,
    city: formData.get('city') as string,
    country: (formData.get('country') as string) || 'Argentina',
    address: formData.get('address') as string,
    province: formData.get('province') as string,
    maps_url: formData.get('maps_url') as string,

    // Estacionamiento
    parking_at_door: formData.get('parking_at_door') === 'on',
    parking_reserved: formData.get('parking_reserved') === 'on',
    nearby_parkings: collectIndexed(formData, 'parkinglot_'),

    // Capacidad
    capacity_platea: formData.get('capacity_platea') ? Number(formData.get('capacity_platea')) : null,
    has_pullman: formData.get('has_pullman') === 'on',
    capacity_pullman: formData.get('capacity_pullman') ? Number(formData.get('capacity_pullman')) : null,

    // Boletería
    has_boleteria: formData.get('has_boleteria') === 'on',
    boleteria_hours: formData.get('boleteria_hours') as string,
    boleteria_days: formData.get('boleteria_days') as string,
    needs_physical_tickets: formData.get('needs_physical_tickets') === 'on',
    own_ticketera_allowed: formData.get('own_ticketera_allowed') === 'on',
    ticketera_name: formData.get('ticketera_name') as string,
    ticketera_iibb: formData.get('ticketera_iibb') === 'on',
    ticketera_credit_card_pct: formData.get('ticketera_credit_card_pct') ? Number(formData.get('ticketera_credit_card_pct')) : null,
    ticketera_debit_card_pct: formData.get('ticketera_debit_card_pct') ? Number(formData.get('ticketera_debit_card_pct')) : null,
    ticketera_banking_costs: formData.get('ticketera_banking_costs') as string,
    ticketera_aadet: formData.get('ticketera_aadet') === 'on',
    ticketera_ticketing_cost: formData.get('ticketera_ticketing_cost') as string,
    other_retentions: formData.get('other_retentions') as string,

    // Técnica
    has_own_sound: formData.get('has_own_sound') === 'on',
    has_own_lights: formData.get('has_own_lights') === 'on',
    has_projector: formData.get('has_projector') === 'on',
    has_screen: formData.get('has_screen') === 'on',
    has_banqueta: formData.get('has_banqueta') === 'on',
    has_ac: formData.get('has_ac') === 'on',
    rider_url: formData.get('rider_url') as string,
    has_operator: formData.get('has_operator') === 'on',
    operator_included: formData.get('operator_included') === 'on',
    operator_cost: formData.get('operator_cost') ? Number(formData.get('operator_cost')) : null,

    // Camarines
    dressing_rooms_count: formData.get('dressing_rooms_count') ? Number(formData.get('dressing_rooms_count')) : 0,
    dressing_room_has_bathroom: formData.get('dressing_room_has_bathroom') === 'on',

    // Fotos
    facade_photo_urls: collectIndexed(formData, 'facade_photo_'),
    hall_photo_urls: collectIndexed(formData, 'hall_photo_'),
    dressing_room_photo_urls: collectIndexed(formData, 'dressing_photo_'),

    // Contactos
    programmer_name: formData.get('programmer_name') as string,
    programmer_contact: formData.get('programmer_contact') as string,
    technician_names: formData.get('technician_names') as string,
    technician_contacts: formData.get('technician_contacts') as string,
    press_contacts: formData.get('press_contacts') as string,

    // Cartelería
    allows_door_poster: formData.get('allows_door_poster') === 'on',
    poster_dimensions: formData.get('poster_dimensions') as string,
    allows_street_posters: formData.get('allows_street_posters') === 'on',
    street_poster_contact: formData.get('street_poster_contact') as string,
    requires_theater_logo: formData.get('requires_theater_logo') === 'on',
    theater_logo_url: formData.get('theater_logo_url') as string,

    // Acuerdo económico
    deal_type: formData.get('deal_type') as string,
    deal_fixed_amount: formData.get('deal_fixed_amount') ? Number(formData.get('deal_fixed_amount')) : null,
    deal_percentage: formData.get('deal_percentage') ? Number(formData.get('deal_percentage')) : null,
    deal_includes: formData.get('deal_includes') as string,
    has_coproducer: formData.get('has_coproducer') === 'on',
    coproducer_deal: formData.get('coproducer_deal') as string,
    requires_art_insurance: formData.get('requires_art_insurance') === 'on',
    passes_argentores: formData.get('passes_argentores') === 'on',
    municipal_taxes: formData.get('municipal_taxes') as string,
    bdx_hotel: formData.get('bdx_hotel') === 'on',
    bdx_transport: formData.get('bdx_transport') === 'on',
    bdx_other: formData.get('bdx_other') as string,

    // Emergencia
    nearest_police_station: formData.get('nearest_police_station') as string,
    nearest_hospital: formData.get('nearest_hospital') as string,
    nearest_consulate: formData.get('nearest_consulate') as string,
    nearby_restaurants: JSON.stringify(collectIndexed(formData, 'restaurant_')),

    // Notas
    notes: formData.get('notes') as string,

    is_active: formData.get('is_active') === 'on',
  }

  const { data: theater, error } = await supabase
    .from('theaters')
    .insert(data)
    .select('id')
    .single()

  if (error) {
    redirect(`/theaters/new?error=${encodeURIComponent(error.message)}`)
  }

  revalidatePath('/theaters')
  redirect(`/theaters/${theater.id}`)
}

export async function updateTheater(id: string, formData: FormData) {
  const supabase = await createClient()

  const data = {
    name: formData.get('name') as string,
    city: formData.get('city') as string,
    country: (formData.get('country') as string) || 'Argentina',
    address: formData.get('address') as string,
    province: formData.get('province') as string,
    maps_url: formData.get('maps_url') as string,

    // Estacionamiento
    parking_at_door: formData.get('parking_at_door') === 'on',
    parking_reserved: formData.get('parking_reserved') === 'on',
    nearby_parkings: collectIndexed(formData, 'parkinglot_'),

    capacity_platea: formData.get('capacity_platea') ? Number(formData.get('capacity_platea')) : null,
    has_pullman: formData.get('has_pullman') === 'on',
    capacity_pullman: formData.get('capacity_pullman') ? Number(formData.get('capacity_pullman')) : null,

    has_boleteria: formData.get('has_boleteria') === 'on',
    boleteria_hours: formData.get('boleteria_hours') as string,
    boleteria_days: formData.get('boleteria_days') as string,
    needs_physical_tickets: formData.get('needs_physical_tickets') === 'on',
    own_ticketera_allowed: formData.get('own_ticketera_allowed') === 'on',
    ticketera_name: formData.get('ticketera_name') as string,
    ticketera_iibb: formData.get('ticketera_iibb') === 'on',
    ticketera_credit_card_pct: formData.get('ticketera_credit_card_pct') ? Number(formData.get('ticketera_credit_card_pct')) : null,
    ticketera_debit_card_pct: formData.get('ticketera_debit_card_pct') ? Number(formData.get('ticketera_debit_card_pct')) : null,
    ticketera_banking_costs: formData.get('ticketera_banking_costs') as string,
    ticketera_aadet: formData.get('ticketera_aadet') === 'on',
    ticketera_ticketing_cost: formData.get('ticketera_ticketing_cost') as string,
    other_retentions: formData.get('other_retentions') as string,

    has_own_sound: formData.get('has_own_sound') === 'on',
    has_own_lights: formData.get('has_own_lights') === 'on',
    has_projector: formData.get('has_projector') === 'on',
    has_screen: formData.get('has_screen') === 'on',
    has_banqueta: formData.get('has_banqueta') === 'on',
    has_ac: formData.get('has_ac') === 'on',
    rider_url: formData.get('rider_url') as string,
    has_operator: formData.get('has_operator') === 'on',
    operator_included: formData.get('operator_included') === 'on',
    operator_cost: formData.get('operator_cost') ? Number(formData.get('operator_cost')) : null,

    dressing_rooms_count: formData.get('dressing_rooms_count') ? Number(formData.get('dressing_rooms_count')) : 0,
    dressing_room_has_bathroom: formData.get('dressing_room_has_bathroom') === 'on',

    facade_photo_urls: collectIndexed(formData, 'facade_photo_'),
    hall_photo_urls: collectIndexed(formData, 'hall_photo_'),
    dressing_room_photo_urls: collectIndexed(formData, 'dressing_photo_'),

    programmer_name: formData.get('programmer_name') as string,
    programmer_contact: formData.get('programmer_contact') as string,
    technician_names: formData.get('technician_names') as string,
    technician_contacts: formData.get('technician_contacts') as string,
    press_contacts: formData.get('press_contacts') as string,

    allows_door_poster: formData.get('allows_door_poster') === 'on',
    poster_dimensions: formData.get('poster_dimensions') as string,
    allows_street_posters: formData.get('allows_street_posters') === 'on',
    street_poster_contact: formData.get('street_poster_contact') as string,
    requires_theater_logo: formData.get('requires_theater_logo') === 'on',
    theater_logo_url: formData.get('theater_logo_url') as string,

    deal_type: formData.get('deal_type') as string,
    deal_fixed_amount: formData.get('deal_fixed_amount') ? Number(formData.get('deal_fixed_amount')) : null,
    deal_percentage: formData.get('deal_percentage') ? Number(formData.get('deal_percentage')) : null,
    deal_includes: formData.get('deal_includes') as string,
    has_coproducer: formData.get('has_coproducer') === 'on',
    coproducer_deal: formData.get('coproducer_deal') as string,
    requires_art_insurance: formData.get('requires_art_insurance') === 'on',
    passes_argentores: formData.get('passes_argentores') === 'on',
    municipal_taxes: formData.get('municipal_taxes') as string,
    bdx_hotel: formData.get('bdx_hotel') === 'on',
    bdx_transport: formData.get('bdx_transport') === 'on',
    bdx_other: formData.get('bdx_other') as string,

    nearest_police_station: formData.get('nearest_police_station') as string,
    nearest_hospital: formData.get('nearest_hospital') as string,
    nearest_consulate: formData.get('nearest_consulate') as string,
    nearby_restaurants: JSON.stringify(collectIndexed(formData, 'restaurant_')),

    notes: formData.get('notes') as string,

    is_active: formData.get('is_active') === 'on',
  }

  const { error } = await supabase
    .from('theaters')
    .update(data)
    .eq('id', id)

  if (error) {
    redirect(`/theaters/${id}?error=${encodeURIComponent(error.message)}`)
  }

  revalidatePath('/theaters')
  revalidatePath(`/theaters/${id}`)
  redirect(`/theaters/${id}`)
}

export async function deleteTheater(id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('theaters')
    .delete()
    .eq('id', id)

  if (error) {
    redirect(`/theaters/${id}?error=${encodeURIComponent(error.message)}`)
  }

  revalidatePath('/theaters')
  redirect('/theaters')
}