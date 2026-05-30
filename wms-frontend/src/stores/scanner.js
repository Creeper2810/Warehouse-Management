// stores/scanner.js
import { defineStore } from 'pinia';

export const useScannerStore = defineStore('scanner', {
  state: () => ({
    scannedCode: '',
  }),
  actions: {
    scan(code) {
      this.scannedCode = code;
    },
    clear() {
      this.scannedCode = '';
    },
  },
});
