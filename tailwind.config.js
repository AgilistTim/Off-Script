/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: ['class', "class"],
  theme: {
    // Add custom breakpoints matching the design system
    screens: {
      'xs': '640px',
      'sm': '768px', 
      'md': '960px',
      'lg': '1023px',
      'xl': '1200px',
      '2xl': '1400px',
    },
    extend: {
      fontFamily: {
        sans: [
          'Barlow Semi Condensed',  // Fixed: removed extra quote
          'Inter',
          'system-ui',
          'sans-serif'
        ]
      },
      // Add fluid typography scale
      fontSize: {
        'h1': ['3.8rem', { lineHeight: '1.3' }],
        'button-fluid': 'clamp(20px, 3vw, 30px)',
        'promo-fluid': 'clamp(26px, 3vw, 35px)',
      },
      // Add container max-widths
      maxWidth: {
        'container': '1200px',
        'container-narrow': '768px', 
        'container-wide': '1400px',
      },
      // Add Off Script spacing scale
      spacing: {
        'section': '6rem',
        'hero-padding': '2rem',
        'hero-padding-lg': '5rem',
        'speech-padding': '6rem',
      },
      animation: {
        'bounce-slow': 'bounce 2s infinite',
        'typing-dot-bounce': 'typing-dot-bounce 1.25s ease-out infinite',
        'fade-carousel': 'fadeCarousel 2s ease',
      },
      // Enhanced color system with Off Script brand
      colors: {
        'primary-black': '#000000',
        'primary-white': '#ffffff',
        'primary-blue': '#8cc9ff',      // Main brand blue
        'primary-yellow': '#f0ff8c', 
        'primary-mint': '#d8fdf0',
        'primary-peach': '#fdc0a8',     // Main brand peach
        'primary-lavender': '#cfceff',
        'primary-green': '#81f08c',
        'text-body': '#000000',         // Main text color
        'text-secondary': '#111111',    // Secondary text
        'border-neutral': '#dbdbdb',    // Button borders
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))'
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))'
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))'
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))'
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))'
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))'
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))'
        },
        shiki: {
          light: 'var(--shiki-light)',
          'light-bg': 'var(--shiki-light-bg)',
          dark: 'var(--shiki-dark)',
          'dark-bg': 'var(--shiki-dark-bg)'
        }
      },
      borderRadius: {
        'button': '15px',                // Off Script button radius
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)'
      },
      // Add transition timing for brand consistency
      transitionDuration: {
        'brand': '300ms',
        'carousel': '2000ms',
      },
      keyframes: {
        'typing-dot-bounce': {
          '0%,40%': {
            transform: 'translateY(0)'
          },
          '20%': {
            transform: 'translateY(-0.25rem)'
          }
        },
        'fadeCarousel': {
          'from': { opacity: '0' },
          'to': { opacity: '1' }
        }
      }
    }
  },
  plugins: [require("tailwindcss-animate")],
}
