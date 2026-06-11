/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./src/renderer/index.html', './src/renderer/src/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: { '2xl': '1400px' }
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))'
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))'
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))'
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))'
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))'
        },
        arcane: {
          DEFAULT: 'hsl(0 84% 60%)',
          glow: 'hsl(0 90% 70%)'
        },
        forge: {
          DEFAULT: 'hsl(0 72% 51%)',
          glow: 'hsl(0 80% 60%)'
        },
        void: {
          DEFAULT: 'hsl(0 0% 4%)',
          fg: 'hsl(0 0% 96%)'
        },
        blood: {
          DEFAULT: 'hsl(0 84% 50%)',
          glow: 'hsl(0 90% 65%)',
          dark: 'hsl(0 70% 30%)'
        }
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)'
      },
      fontFamily: {
        display: ['Cinzel', 'serif'],
        body: ['IBM Plex Sans', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'JetBrains Mono', 'monospace']
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { opacity: '0.6', filter: 'blur(20px)' },
          '50%': { opacity: '1', filter: 'blur(28px)' }
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' }
        }
      },
      animation: {
        'pulse-glow': 'pulse-glow 4s ease-in-out infinite',
        shimmer: 'shimmer 3s linear infinite'
      }
    }
  },
  plugins: [require('tailwindcss-animate')]
}
