import { describe, it, expect } from 'vitest'
import { nextIn } from './cycle.js'
import { LANGS } from './i18n.jsx'

describe('nextIn', () => {
  it('đi tới phần tử kế tiếp', () => {
    expect(nextIn(['a', 'b', 'c'], 'a')).toBe('b')
    expect(nextIn(['a', 'b', 'c'], 'b')).toBe('c')
  })

  it('hết danh sách thì quay lại đầu', () => {
    expect(nextIn(['a', 'b', 'c'], 'c')).toBe('a')
  })

  it('giá trị lạ (hồ sơ/localStorage cũ) → về phần tử đầu, không kẹt', () => {
    expect(nextIn(['a', 'b', 'c'], 'zz')).toBe('a')
    expect(nextIn(['a', 'b', 'c'], undefined)).toBe('a')
    expect(nextIn(['a', 'b', 'c'], null)).toBe('a')
  })

  it('danh sách 1 phần tử → luôn chính nó', () => {
    expect(nextIn(['a'], 'a')).toBe('a')
  })

  it('danh sách rỗng / không phải mảng → undefined, không ném lỗi', () => {
    expect(nextIn([], 'a')).toBeUndefined()
    expect(nextIn(null, 'a')).toBeUndefined()
    expect(nextIn(undefined, 'a')).toBeUndefined()
  })
})

// Nút LangCycle và phím tắt Alt+L dùng chung danh sách này; khoá thứ tự lại để đổi
// vòng xoay là phải sửa test có ý thức.
// (THEMES không kiểm ở đây được: theme.js chạm `document` ngay lúc import nên vỡ
//  trong môi trường test `node`. Vòng xoay theme được kiểm bằng app thật.)
describe('vòng xoay ngôn ngữ', () => {
  it('vi → en → us → au → vi', () => {
    expect(LANGS).toEqual(['vi', 'en', 'us', 'au'])
    expect(nextIn(LANGS, 'vi')).toBe('en')
    expect(nextIn(LANGS, 'en')).toBe('us')
    expect(nextIn(LANGS, 'us')).toBe('au')
    expect(nextIn(LANGS, 'au')).toBe('vi')
  })
})
