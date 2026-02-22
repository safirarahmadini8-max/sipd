
import { defineConfig } from 'vite';

/**
 * Konfigurasi Vite untuk mengoptimalkan proses build aplikasi.
 * Menangani peringatan "chunk size limit" dengan menaikkan batas limit
 * dan memisahkan library pihak ketiga (vendor) dari kode aplikasi utama.
 */
export default defineConfig({
  build: {
    // Menaikkan batas peringatan ukuran chunk menjadi 2000kb (2MB)
    // agar proses redeploy berjalan lancar tanpa terhenti oleh peringatan ukuran file.
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        // Melakukan manual chunking untuk memecah bundle besar menjadi bagian-bagian kecil.
        // Ini membantu browser memuat aplikasi lebih cepat melalui caching.
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Memisahkan semua dependencies dari node_modules ke dalam chunk bernama 'vendor'
            return 'vendor';
          }
        },
      },
    },
  },
});
