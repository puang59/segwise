/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: {
          DEFAULT: 'var(--surface)',
          2: 'var(--surface-2)',
          3: 'var(--surface-3)',
        },
        border: {
          DEFAULT: 'var(--border)',
          hover: 'var(--border-hover)',
        },
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          tertiary: 'var(--text-tertiary)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          dim: 'var(--accent-dim)',
        },
        agent: {
          advait: 'var(--agent-advait)',
          vihaan: 'var(--agent-vihaan)',
          kabir: 'var(--agent-kabir)',
          ishaan: 'var(--agent-ishaan)',
          aadhya: 'var(--agent-aadhya)',
          saanvi: 'var(--agent-saanvi)',
          myra: 'var(--agent-myra)',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'Inter', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      transitionTimingFunction: {
        'ease-out-custom': 'var(--ease-out)',
        'ease-in-out-custom': 'var(--ease-in-out)',
        'ease-drawer': 'var(--ease-drawer)',
      },
    },
  },
  plugins: [],
};
