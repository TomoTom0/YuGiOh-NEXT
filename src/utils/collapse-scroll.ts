/**
 * Collapses an item and compensates scroll position so content below
 * the fold doesn't jump.
 *
 * Measures the item's scrollHeight before and after the collapse
 * (after `timeout` ms), then scrolls the nearest `.card-tab-content`
 * ancestor up by the difference so items above the viewport stay put.
 */
export function collapseWithScroll(
  itemEl: Element,
  setCollapsed: () => void,
  timeout: number,
  containerSelector = '.card-tab-content'
): void {
  const beforeHeight = itemEl.scrollHeight
  setCollapsed()
  setTimeout(() => {
    const heightDiff = beforeHeight - itemEl.scrollHeight
    if (heightDiff <= 0) return
    const container = itemEl.closest(containerSelector)
    if (!container) return
    const itemTop = itemEl.getBoundingClientRect().top
    const containerTop = container.getBoundingClientRect().top
    if (itemTop < containerTop + container.clientHeight) {
      container.scrollTo({
        top: Math.max(0, container.scrollTop - heightDiff),
        behavior: 'smooth',
      })
    }
  }, timeout)
}
