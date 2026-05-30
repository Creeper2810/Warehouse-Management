/**
 * Composable for managing scanned barcode across pages
 * Stores the last scanned barcode in sessionStorage so ProductForm can pre-fill it
 */

const STORAGE_KEY = 'lastScannedBarcode'

export function useScannedBarcode() {
  /**
   * Save barcode to sessionStorage
   */
  const saveBarcode = (barcode) => {
    if (barcode) {
      sessionStorage.setItem(STORAGE_KEY, barcode)
    }
  }

  /**
   * Get barcode from sessionStorage
   */
  const getBarcode = () => {
    return sessionStorage.getItem(STORAGE_KEY) || ''
  }

  /**
   * Clear barcode from sessionStorage
   */
  const clearBarcode = () => {
    sessionStorage.removeItem(STORAGE_KEY)
  }

  /**
   * Get and clear barcode (useful for consuming it in ProductForm)
   */
  const getAndClearBarcode = () => {
    const barcode = getBarcode()
    clearBarcode()
    return barcode
  }

  return {
    saveBarcode,
    getBarcode,
    clearBarcode,
    getAndClearBarcode
  }
}
