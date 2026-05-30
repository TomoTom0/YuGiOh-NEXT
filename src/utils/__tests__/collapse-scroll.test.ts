import { describe, it, expect, vi, beforeEach } from 'vitest'
import { collapseWithScroll } from '../collapse-scroll'

function makeElement(overrides: Partial<Element & { scrollHeight: number }> = {}): Element {
  const scrollToSpy = vi.fn()
  const el = {
    scrollHeight: 200,
    getBoundingClientRect: () => ({ top: 100 }),
    closest: (_selector: string) => null,
    scrollTo: scrollToSpy,
    scrollTop: 0,
    clientHeight: 500,
    ...overrides,
  } as unknown as Element
  return el
}

describe('collapseWithScroll', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  it('calls setCollapsed immediately', () => {
    const setCollapsed = vi.fn()
    const el = makeElement()
    collapseWithScroll(el, setCollapsed, 300)
    expect(setCollapsed).toHaveBeenCalledOnce()
  })

  it('scrolls container up by height difference after timeout', () => {
    const scrollTo = vi.fn()
    let scrollHeight = 300

    const container = {
      getBoundingClientRect: () => ({ top: 0 }),
      clientHeight: 600,
      scrollTop: 500,
      scrollTo,
    }

    const el = {
      get scrollHeight() { return scrollHeight },
      getBoundingClientRect: () => ({ top: 100 }),
      closest: () => container,
    } as unknown as Element

    collapseWithScroll(el, () => { scrollHeight = 100 }, 100)
    vi.advanceTimersByTime(100)

    expect(scrollTo).toHaveBeenCalledWith({
      top: 300,
      behavior: 'smooth',
    })
  })

  it('does not scroll when height did not change', () => {
    const scrollTo = vi.fn()
    const container = {
      getBoundingClientRect: () => ({ top: 0 }),
      clientHeight: 600,
      scrollTop: 200,
      scrollTo,
    }
    const el = {
      scrollHeight: 200,
      getBoundingClientRect: () => ({ top: 100 }),
      closest: () => container,
    } as unknown as Element

    collapseWithScroll(el, vi.fn(), 100)
    vi.advanceTimersByTime(100)

    expect(scrollTo).not.toHaveBeenCalled()
  })

  it('does not scroll when container is not found', () => {
    const el = {
      scrollHeight: 300,
      getBoundingClientRect: () => ({ top: 100 }),
      closest: () => null,
    } as unknown as Element

    let collapsed = false
    collapseWithScroll(el, () => { collapsed = true }, 100)
    vi.advanceTimersByTime(100)

    expect(collapsed).toBe(true)
  })

  it('does not scroll when item is below the visible area', () => {
    const scrollTo = vi.fn()
    let scrollHeight = 300

    const container = {
      getBoundingClientRect: () => ({ top: 0 }),
      clientHeight: 200,
      scrollTop: 0,
      scrollTo,
    }

    const el = {
      get scrollHeight() { return scrollHeight },
      // item top is beyond container bottom (0 + 200)
      getBoundingClientRect: () => ({ top: 300 }),
      closest: () => container,
    } as unknown as Element

    collapseWithScroll(el, () => { scrollHeight = 100 }, 100)
    vi.advanceTimersByTime(100)

    expect(scrollTo).not.toHaveBeenCalled()
  })

  it('clamps scroll to minimum of 0', () => {
    const scrollTo = vi.fn()
    let scrollHeight = 300

    const container = {
      getBoundingClientRect: () => ({ top: 0 }),
      clientHeight: 600,
      scrollTop: 10,
      scrollTo,
    }

    const el = {
      get scrollHeight() { return scrollHeight },
      getBoundingClientRect: () => ({ top: 100 }),
      closest: () => container,
    } as unknown as Element

    collapseWithScroll(el, () => { scrollHeight = 100 }, 100)
    vi.advanceTimersByTime(100)

    // diff=200, scrollTop=10 → max(0, 10-200) = 0
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' })
  })
})
