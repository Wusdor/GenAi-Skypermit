import { beforeEach, describe, expect, it, vi } from 'vitest'

// docs/06-business-rules.md §3 (OH-1 §3): an aircraft with mtom_grams >
// 30,000g is refused registration outright (422 in the docs' prose, but
// the actual implementation — see app/api/v1/aircraft/route.ts — returns
// 400 via badRequest(), consistent with every other malformed-input case
// in this API; docs/03-api-contract.md's error table treats "malformed
// request body" as 400). Enforced before any gate, at the /aircraft write.

const insertedRows: Record<string, unknown>[] = []

vi.mock('@/lib/auth', () => ({
  getSessionOperator: vi.fn(async () => ({ id: 'operator-1', status: 'ACTIVE' })),
}))

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      insert: vi.fn((row: Record<string, unknown>) => {
        insertedRows.push(row)
        return {
          select: vi.fn(() => ({
            single: vi.fn(async () => ({ data: { id: 'aircraft-new', ...row }, error: null })),
          })),
        }
      }),
    })),
  },
}))

const { POST } = await import('@/app/api/v1/aircraft/route')

function req(body: Record<string, unknown>) {
  return new Request('http://localhost/api/v1/aircraft', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

const validAircraft = { manufacturer: 'Acme', model: 'X1', serial_number: 'SN-1', mtom_grams: 500 }

beforeEach(() => {
  insertedRows.length = 0
})

describe('POST /api/v1/aircraft — 30,000g registration ceiling', () => {
  it('accepts an aircraft at exactly 30,000g', async () => {
    const res = await POST(req({ ...validAircraft, mtom_grams: 30000 }))
    expect(res.status).toBe(201)
    expect(insertedRows[0]?.mtom_grams).toBe(30000)
  })

  it('rejects an aircraft at 30,001g with 400, before ever reaching the DB', async () => {
    const res = await POST(req({ ...validAircraft, mtom_grams: 30001 }))
    expect(res.status).toBe(400)
    expect(insertedRows).toHaveLength(0)
    const body = await res.json()
    expect(body.error).toMatch(/30000/)
  })

  it('rejects a wildly over-ceiling value', async () => {
    const res = await POST(req({ ...validAircraft, mtom_grams: 1_000_000 }))
    expect(res.status).toBe(400)
  })

  it('rejects a non-positive mtom_grams before the ceiling check even applies', async () => {
    const res = await POST(req({ ...validAircraft, mtom_grams: 0 }))
    expect(res.status).toBe(400)
  })
})
