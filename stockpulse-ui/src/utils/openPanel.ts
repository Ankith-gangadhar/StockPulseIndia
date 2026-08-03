export function openStockPanel(symbol: string) {
  window.dispatchEvent(new CustomEvent('openStockPanel', { detail: symbol }));
}
