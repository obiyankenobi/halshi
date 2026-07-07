/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        ink: '#0a0c10',      // page background
        panel: '#12151c',    // cards
        inset: '#0d1016',    // inputs, wells
        line: '#242a37',     // hairline borders
        fog: '#8a93a6',      // muted text
        snow: '#edf0f5',     // primary text
        accent: {
          DEFAULT: '#c8f53f', // signal lime
          dim: '#a9d32e',
        },
        ember: '#f5b93f',    // oracle/warning
      },
      fontFamily: {
        display: ['var(--font-display)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      maxWidth: {
        shell: '1200px',
      },
    },
  },
  plugins: [],
}
