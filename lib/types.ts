export type OperatorAuthorisationLevel = 'L1' | 'L2' | 'L3'
export type OperatorStatus = 'ACTIVE' | 'SUSPENDED'
export type PilotRating = 'R_BASIC' | 'R_ADVANCED' | 'R_BVLOS'
export type PilotStatus = 'ACTIVE' | 'INACTIVE'
export type AircraftStatus = 'ACTIVE' | 'RETIRED'
export type ZoneClass = 'OPEN' | 'CONTROLLED' | 'RESTRICTED'
export type FlightRequestState =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'COMPLETED'
export type FailingGate = 'PILOT' | 'AIRCRAFT' | 'ZONE' | 'TIME_WINDOW'
export type ReviewActionType = 'APPROVE' | 'REJECT'
export type WeightBand = 'C0' | 'C1' | 'C2' | 'C3'
export type PilotCurrencyStatus = 'CURRENT' | 'LAPSED'

export interface OperatorRow {
  id: string
  legal_name: string
  national_id: string
  email: string
  phone: string | null
  address_line: string | null
  city: string | null
  postal_code: string | null
  authorisation_level: OperatorAuthorisationLevel
  registered_on: string
  status: OperatorStatus
  created_at: string
  updated_at: string
}

export interface PilotRow {
  id: string
  operator_id: string
  full_name: string
  national_id: string
  rating: PilotRating
  certified_on: string
  status: PilotStatus
  created_at: string
  updated_at: string
}

export interface AircraftRow {
  id: string
  operator_id: string
  manufacturer: string
  model: string
  serial_number: string
  mtom_grams: number
  registered_on: string
  status: AircraftStatus
  created_at: string
  updated_at: string
}

export interface ZoneRow {
  code: string
  name: string
  zone_class: ZoneClass
  ceiling_metres: number
  permitted_bands: WeightBand[]
  required_authorisation_level: OperatorAuthorisationLevel
  curfew_start: string | null
  curfew_end: string | null
  active: boolean
}

export interface FlightRequestRow {
  id: string
  operator_id: string
  pilot_id: string
  aircraft_id: string
  zone_code: string
  window_start: string
  window_end: string
  requested_altitude_metres: number
  flight_purpose: string | null
  state: FlightRequestState
  rejection_reason: string | null
  failing_gate: FailingGate | null
  rule_reference: string | null
  submitted_at: string | null
  decided_at: string | null
  decided_by: string | null
  created_at: string
  updated_at: string
}

export interface ReviewActionRow {
  id: string
  flight_request_id: string
  reviewer_id: string
  action: ReviewActionType
  note: string | null
  created_at: string
}
