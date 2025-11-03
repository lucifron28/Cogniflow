/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  plugins: [require('daisyui')],
  daisyui: {
    themes: [
      {
        'cyber-glow': {
          'primary': '#00f2fe',           // Cyber accent cyan
          'secondary': '#183DE4',         // Cyber neon blue
          'accent': '#00d4ff',            // Electric cyan
          'neutral': '#1a2525',           // Cyber gray
          'base-100': '#000000',          // Cyber black
          'base-200': '#000957',          // Cyber dark blue
          'base-300': '#001a33',          // Dark blue gradient stop
          'info': '#00f2fe',              // Cyan
          'success': '#22c55e',           // Green
          'warning': '#f97316',           // Orange
          'error': '#ef4444',             // Red
          '--rounded-box': '0.5rem',
          '--rounded-btn': '0.375rem',
          '--rounded-badge': '1.9rem',
          '--animation-btn': '0.25s',
          '--animation-input': '0.2s',
          '--btn-focus-scale': '0.95',
          '--border-btn': '1px',
          '--tab-border': '1px',
        },
        'electric-sky': {
          'primary': '#00d4ff',           // Electric cyan
          'secondary': '#c2e9fb',         // Electric soft blue
          'accent': '#00f2fe',            // Electric neon
          'neutral': '#6b7280',           // Gray
          'base-100': '#fdfbfb',          // Electric white
          'base-200': '#e5e7eb',          // Electric light gray
          'base-300': '#d1d5db',          // Lighter gray
          'info': '#3b82f6',              // Blue
          'success': '#22c55e',           // Green
          'warning': '#f59e0b',           // Amber
          'error': '#ef4444',             // Red
          '--rounded-box': '0.5rem',
          '--rounded-btn': '0.375rem',
          '--rounded-badge': '1.9rem',
          '--animation-btn': '0.25s',
          '--animation-input': '0.2s',
          '--btn-focus-scale': '0.95',
          '--border-btn': '1px',
          '--tab-border': '1px',
        },
      },
    ],
    darkTheme: 'cyber-glow',
    base: true,
    styled: true,
    utils: true,
    prefix: '',
    logs: true,
    themeRoot: ':root',
  },
};
