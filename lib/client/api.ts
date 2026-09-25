import type {
  AircraftRow,
  FlightRequestRow,
  FlightRequestState,
  OperatorRow,
  PilotCurrencyStatus,
  PilotRating,
  PilotRow,
  WeightBand,
  ZoneRow,
} from '@/lib/types'

export type PilotWithCurrency = PilotRow & { currency_status: PilotCurrencyStatus }
export type AircraftWithBand = AircraftRow & { weight_band: WeightBand }

export interface GatePassResult {
  ok: true
}
export interface GateFailResult {
  ok: false
  failing_gate: 'PILOT' | 'AIRCRAFT' | 'ZONE' | 'TIME_WINDOW'
  rule_reference: string
  message: string
}
export type GateResult = GatePassResult | GateFailResult

export interface ApiErrorBody {
  error?: string
  failing_gate?: string
  rule_reference?: string
  message?: string
}

export type ApiResult<T> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number; error: ApiErrorBody }

async function apiFetch<T>(path: string, init?: RequestInit): Promise<ApiResult<T>> {
  let res: Response
  try {
    res = await fetch(path, {
      ...init,
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    })
  } catch {
    return { ok: false, status: 0, error: { error: 'Network error — could not reach the server.' } }
  }

  let body: unknown = null
  try {
    body = await res.json()
  } catch {
    body = null
  }

  if (res.ok) return { ok: true, status: res.status, data: body as T }
  return { ok: false, status: res.status, error: (body as ApiErrorBody) ?? {} }
}

export function apiErrorMessage(error: ApiErrorBody): string {
  return error.message ?? error.error ?? 'Something went wrong.'
}

function reviewerHeaders(reviewerId?: string): Record<string, string> {
  return reviewerId ? { 'X-Reviewer-Id': reviewerId } : {}
}

export interface RegisterOperatorInput {
  email: string
  password: string
  legal_name: string
  national_id: string
  phone?: string
  address_line?: string
  city?: string
  postal_code?: string
}

export interface CreatePilotInput {
  full_name: string
  national_id: string
  rating: PilotRating
  certified_on: string
}

export interface CreateAircraftInput {
  manufacturer: string
  model: string
  serial_number: string
  mtom_grams: number
}

export interface CreateFlightRequestInput {
  pilot_id: string
  aircraft_id: string
  zone_code: string
  window_start: string
  window_end: string
  requested_altitude_metres: number
  flight_purpose?: string
}

export interface ListFlightRequestsParams {
  state?: FlightRequestState
  operator_id?: string
  zone_code?: string
  from?: string
  to?: string
}

function toQueryString(params: object): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params as Record<string, string | undefined>)) {
    if (value) search.set(key, value)
  }
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}

export const api = {
  // Auth — see docs/03-api-contract.md's "Authentication & authorisation"
  // section. register() is POST /operators, which now doubles as sign-up.
  register: (input: RegisterOperatorInput) =>
    apiFetch<OperatorRow>('/api/v1/operators', { method: 'POST', body: JSON.stringify(input) }),
  login: (email: string, password: string) =>
    apiFetch<OperatorRow>('/api/v1/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  logout: () => apiFetch<{ ok: true }>('/api/v1/auth/logout', { method: 'POST' }),
  me: () => apiFetch<OperatorRow>('/api/v1/auth/me'),

  getOperator: (id: string, reviewerId?: string) =>
    apiFetch<OperatorRow>(`/api/v1/operators/${id}`, { headers: reviewerHeaders(reviewerId) }),

  // operator_id is derived server-side from the session on all of these —
  // see the corresponding route handlers.
  listPilots: () => apiFetch<PilotWithCurrency[]>('/api/v1/pilots'),
  createPilot: (input: CreatePilotInput) =>
    apiFetch<PilotRow>('/api/v1/pilots', { method: 'POST', body: JSON.stringify(input) }),
  getPilot: (id: string, reviewerId?: string) =>
    apiFetch<PilotWithCurrency>(`/api/v1/pilots/${id}`, { headers: reviewerHeaders(reviewerId) }),

  listAircraft: () => apiFetch<AircraftWithBand[]>('/api/v1/aircraft'),
  createAircraft: (input: CreateAircraftInput) =>
    apiFetch<AircraftRow>('/api/v1/aircraft', { method: 'POST', body: JSON.stringify(input) }),
  getAircraft: (id: string, reviewerId?: string) =>
    apiFetch<AircraftWithBand>(`/api/v1/aircraft/${id}`, { headers: reviewerHeaders(reviewerId) }),

  listZones: () => apiFetch<ZoneRow[]>('/api/v1/zones'),
  getZone: (code: string) => apiFetch<ZoneRow>(`/api/v1/zones/${code}`),

  // reviewerId, when passed, is what lets a reviewer see across every
  // operator; omitted, these are scoped to the logged-in operator's own
  // requests.
  listFlightRequests: (params: ListFlightRequestsParams, reviewerId?: string) =>
    apiFetch<FlightRequestRow[]>(`/api/v1/flight-requests${toQueryString(params)}`, {
      headers: reviewerHeaders(reviewerId),
    }),
  createFlightRequest: (input: CreateFlightRequestInput) =>
    apiFetch<FlightRequestRow>('/api/v1/flight-requests', { method: 'POST', body: JSON.stringify(input) }),
  getFlightRequest: (id: string, reviewerId?: string) =>
    apiFetch<FlightRequestRow>(`/api/v1/flight-requests/${id}`, { headers: reviewerHeaders(reviewerId) }),
  validateFlightRequest: (id: string, reviewerId?: string) =>
    apiFetch<GateResult>(`/api/v1/flight-requests/${id}/validate`, {
      method: 'POST',
      headers: reviewerHeaders(reviewerId),
    }),
  submitFlightRequest: (id: string) =>
    apiFetch<FlightRequestRow>(`/api/v1/flight-requests/${id}/submit`, { method: 'POST' }),
  cancelFlightRequest: (id: string) =>
    apiFetch<FlightRequestRow>(`/api/v1/flight-requests/${id}/cancel`, { method: 'POST' }),
  approveFlightRequest: (id: string, reviewerId: string, note?: string) =>
    apiFetch<FlightRequestRow>(`/api/v1/flight-requests/${id}/approve`, {
      method: 'POST',
      headers: { 'X-Reviewer-Id': reviewerId },
      body: JSON.stringify(note ? { note } : {}),
    }),
  rejectFlightRequest: (id: string, reviewerId: string, note: string) =>
    apiFetch<FlightRequestRow>(`/api/v1/flight-requests/${id}/reject`, {
      method: 'POST',
      headers: { 'X-Reviewer-Id': reviewerId },
      body: JSON.stringify({ note }),
    }),
}
