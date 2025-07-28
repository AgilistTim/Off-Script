/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
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
        sans: ['Barlow Semi Condensed', 'Inter', 'system-ui', 'sans-serif'],
        'street': ['Impact', 'Arial Black', 'Helvetica', 'sans-serif'],
        'bold': ['Oswald', 'Bebas Neue', 'Impact', 'sans-serif'],
        'script': ['Righteous', 'Fredoka One', 'cursive'],
      },
      fontSize: {
        'h1': ['3.8rem', { lineHeight: '1.1', fontWeight: '900' }],
        'hero-xl': ['clamp(4rem, 12vw, 8rem)', { lineHeight: '0.9', fontWeight: '900' }],
        'hero-lg': ['clamp(3rem, 8vw, 6rem)', { lineHeight: '1.0', fontWeight: '800' }],
        'street-xl': ['clamp(2.5rem, 6vw, 4rem)', { lineHeight: '1.1', fontWeight: '900' }],
        'button-fluid': 'clamp(18px, 2.5vw, 24px)',
        'promo-fluid': 'clamp(20px, 3vw, 28px)',
      },
      maxWidth: {
        'container': '1200px',
        'container-narrow': '768px', 
        'container-wide': '1400px',
        'prose': '65ch',
      },
      spacing: {
        'section': '6rem',
        'hero-padding': '2rem',
        'hero-padding-lg': '5rem',
        'speech-padding': '6rem',
        '18': '4.5rem',
        '22': '5.5rem',
        '88': '22rem',
        '100': '25rem',
        '128': '32rem',
      },
      animation: {
        'fade-carousel': 'fadeCarousel 2s ease',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'bounce-subtle': 'bounceSubtle 2s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'slide-up': 'slideUp 0.6s ease-out',
        'slide-right': 'slideRight 0.6s ease-out',
        'scale-in': 'scaleIn 0.5s ease-out',
        'rotate-slow': 'rotateSlow 8s linear infinite',
      },
      colors: {
        // Off Script Brand Colors
        'primary-black': '#000000',
        'primary-white': '#ffffff', 
        'primary-blue': '#8cc9ff',
        'primary-peach': '#fdc0a8',
        
        // Street Art Palette
        'electric-blue': '#00ffff',
        'neon-pink': '#ff006e',
        'acid-green': '#8ac926',
        'sunset-orange': '#ff7900',
        'deep-purple': '#7209b7',
        'hot-magenta': '#f72585',
        'cyber-yellow': '#ffbe0b',
        
        // Gradients & Effects
        'gradient-start': '#7209b7',
        'gradient-middle': '#f72585', 
        'gradient-end': '#ff006e',
        
        // Text Colors
        'text-body': '#000000',
        'text-secondary': '#111111',
        'text-muted': '#666666',
        'text-inverse': '#ffffff',
        
        // Borders & Backgrounds
        'border-neutral': '#dbdbdb',
        'bg-glass': 'rgba(255, 255, 255, 0.1)',
        'bg-dark-glass': 'rgba(0, 0, 0, 0.2)',
        
        // Legacy shadcn colors
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        'button': '15px',
        'card': '24px',
        'xl': '1.5rem',
        '2xl': '2rem',
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      transitionDuration: {
        'brand': '300ms',
        'carousel': '2000ms',
        '400': '400ms',
        '600': '600ms',
      },
      backdropBlur: {
        'xs': '2px',
        '4xl': '72px',
      },
      boxShadow: {
        'glow': '0 0 20px rgba(114, 9, 183, 0.3)',
        'glow-pink': '0 0 20px rgba(255, 0, 110, 0.3)',
        'glow-blue': '0 0 20px rgba(0, 255, 255, 0.3)',
        'street': '0 8px 32px rgba(0, 0, 0, 0.3)',
        'brutal': '8px 8px 0px rgba(0, 0, 0, 1)',
      },
      keyframes: {
        'fadeCarousel': {
          'from': { opacity: '0' },
          'to': { opacity: '1' }
        },
        'bounceSubtle': {
          '0%, 100%': { transform: 'translateY(-2px)' },
          '50%': { transform: 'translateY(2px)' }
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' }
        },
        'glow': {
          'from': { boxShadow: '0 0 20px rgba(114, 9, 183, 0.2)' },
          'to': { boxShadow: '0 0 30px rgba(114, 9, 183, 0.6)' }
        },
        'slideUp': {
          'from': { opacity: '0', transform: 'translateY(30px)' },
          'to': { opacity: '1', transform: 'translateY(0)' }
        },
        'slideRight': {
          'from': { opacity: '0', transform: 'translateX(-30px)' },
          'to': { opacity: '1', transform: 'translateX(0)' }
        },
        'scaleIn': {
          'from': { opacity: '0', transform: 'scale(0.9)' },
          'to': { opacity: '1', transform: 'scale(1)' }
        },
        'rotateSlow': {
          'from': { transform: 'rotate(0deg)' },
          'to': { transform: 'rotate(360deg)' }
        }
      },
      backgroundImage: {
        'gradient-street': 'linear-gradient(135deg, #7209b7 0%, #f72585 50%, #ff006e 100%)',
        'gradient-cyber': 'linear-gradient(135deg, #00ffff 0%, #7209b7 100%)',
        'gradient-sunset': 'linear-gradient(135deg, #ff7900 0%, #f72585 100%)',
        'gradient-neon': 'linear-gradient(135deg, #8ac926 0%, #00ffff 100%)',
        'gradient-brutal': 'linear-gradient(45deg, #000000 25%, transparent 25%), linear-gradient(-45deg, #000000 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #000000 75%), linear-gradient(-45deg, transparent 75%, #000000 75%)',
      },
      backgroundSize: {
        'brutal': '20px 20px',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
