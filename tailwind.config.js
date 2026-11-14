/** @type {import('tailwindcss').Config} */
export default {
  // Yalnızca yeni uygulama taranır; 3D harita kendi CSS'iyle bağımsız kalır.
  content: ['./index.html', './src/app/**/*.{ts,tsx}', './src/games/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: '#F04448', 50: '#FEF2F2', 100: '#FDE3E4', 600: '#DC2F33', 700: '#B9252A' },
        ink: { DEFAULT: '#0F172A', muted: '#64748B' },
        line: '#E2E8F0',
        canvas: '#F8FAFC',
      },
      fontFamily: { sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'] },
      boxShadow: { card: '0 1px 2px rgba(15,23,42,.04), 0 4px 16px rgba(15,23,42,.05)' },
      borderRadius: { xl: '12px', '2xl': '16px' },
    },
  },
  plugins: [],
};
