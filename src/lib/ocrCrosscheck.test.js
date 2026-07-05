import { describe, it, expect } from 'vitest'
import {
  normalizeTime,
  normalizeHours,
  buildTokenSet,
  crosscheckRecord,
  withTimeout,
} from './ocrCrosscheck.js'

describe('withTimeout — OCR không bao giờ treo luồng', () => {
  it('trả giá trị thật khi promise xong TRƯỚC hạn', async () => {
    const res = await withTimeout(Promise.resolve('hello'), 1000)
    expect(res).toBe('hello')
  })
  it('promise TREO mãi → resolve sentinel timeout, KHÔNG treo', async () => {
    const never = new Promise(() => {}) // không bao giờ resolve
    const res = await withTimeout(never, 20)
    expect(res).toEqual({ __ocrTimeout: true })
  })
  it('promise reject → resolve sentinel error, KHÔNG throw', async () => {
    const res = await withTimeout(Promise.reject(new Error('boom')), 1000)
    expect(res).toEqual({ __ocrError: true })
  })
})

describe('normalizeTime', () => {
  it('coi "06:00" và "6:00" là cùng một giờ', () => {
    expect(normalizeTime('06:00')).toBe('6:00')
    expect(normalizeTime('6:00')).toBe('6:00')
  })
  it('nhận dạng liền "0600" và "6h30"', () => {
    expect(normalizeTime('0600')).toBe('6:00')
    expect(normalizeTime('6h30')).toBe('6:30')
    expect(normalizeTime('6h')).toBe('6:00')
  })
  it('trả null cho chuỗi không phải giờ / giờ vô lý', () => {
    expect(normalizeTime('abc')).toBeNull()
    expect(normalizeTime('25:00')).toBeNull()
    expect(normalizeTime('6:99')).toBeNull()
    expect(normalizeTime('')).toBeNull()
  })
})

describe('normalizeHours', () => {
  it('bỏ số 0 thừa và đồng nhất dấu phẩy/chấm', () => {
    expect(normalizeHours('8.0')).toBe('8')
    expect(normalizeHours('8')).toBe('8')
    expect(normalizeHours('7,55')).toBe('7.55')
    expect(normalizeHours('7.50')).toBe('7.5')
  })
  it('trả null khi ngoài 0–24 hoặc không phải số giờ', () => {
    expect(normalizeHours('25')).toBeNull()
    expect(normalizeHours('2026')).toBeNull()
    expect(normalizeHours('x')).toBeNull()
  })
})

describe('buildTokenSet', () => {
  it('rút giờ và số giờ từ text OCR lộn xộn', () => {
    const tok = buildTokenSet('T2 06:00 - 14:00  tong 7.55\nT3 X nghi')
    expect(tok.times.has('6:00')).toBe(true)
    expect(tok.times.has('14:00')).toBe(true)
    expect(tok.hours.has('7.55')).toBe(true)
    expect(tok.empty).toBe(false)
  })
  it('đánh dấu empty khi text rỗng', () => {
    expect(buildTokenSet('').empty).toBe(true)
    expect(buildTokenSet(null).empty).toBe(true)
  })
})

describe('crosscheckRecord — an toàn dữ liệu lương', () => {
  const tokens = buildTokenSet('06:00 14:00 7.55')

  it('KHỚP khi giá trị Gemini có trong ảnh', () => {
    const r = crosscheckRecord({ start: '06:00', end: '14:00', raw: '' }, tokens)
    expect(r.start).toBe('match')
    expect(r.end).toBe('match')
    expect(r.overall).toBe('ok')
  })

  it('CẢNH BÁO (warn) khi Gemini đọc giờ KHÔNG có trong ảnh — bắt bịa số', () => {
    const r = crosscheckRecord({ start: '06:00', end: '18:30', raw: '' }, tokens)
    expect(r.start).toBe('match')
    expect(r.end).toBe('mismatch') // 18:30 không có trong OCR
    expect(r.overall).toBe('warn')
  })

  it('ngày nghỉ → na, không đối chiếu', () => {
    const r = crosscheckRecord({ off: true, start: '', end: '', raw: '' }, tokens)
    expect(r.overall).toBe('na')
  })

  it('OCR rỗng → unchecked, KHÔNG chặn (không kết luận lệch)', () => {
    const empty = buildTokenSet('')
    const r = crosscheckRecord({ start: '06:00', end: '14:00', raw: '' }, empty)
    expect(r.overall).toBe('unchecked')
  })

  it('đối chiếu theo TỔNG GIỜ (raw) khi ảnh chỉ in tổng', () => {
    const r = crosscheckRecord({ start: '', end: '', raw: '7.55' }, tokens)
    expect(r.raw).toBe('match')
    expect(r.overall).toBe('ok')
  })
})
