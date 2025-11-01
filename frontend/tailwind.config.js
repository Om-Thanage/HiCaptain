/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#3b82f6',        // Blue-500
        secondary: '#10b981',      // Green-500
        accent: '#8b5cf6',         // Purple-500 (minimal use)
        dark: {
          bg: '#0f172a',           // slate-900
          surface: '#1e293b',      // slate-800
          card: '#334155',         // slate-700
          border: '#475569',       // slate-600
          text: {
            primary: '#f1f5f9',    // slate-100
            secondary: '#94a3b8',  // slate-400
          }
        },
        success: '#22c55e',
        error: '#ef4444',
        warning: '#f59e0b',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'lg': '12px',
        'xl': '16px',
      },
      boxShadow: {
        'soft': '0 2px 8px rgba(0, 0, 0, 0.06)',
        'card': '0 4px 12px rgba(0, 0, 0, 0.08)',
      },
    },
  },
  plugins: [],
}