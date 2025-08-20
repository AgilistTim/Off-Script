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
  		padding: {
  			DEFAULT: '1rem',
  			sm: '1.5rem',
  			lg: '2rem',
  		},
  		screens: {
  			'2xl': '1400px'
  		}
  	},
  	screens: {
  		xs: '640px',
  		sm: '768px',
  		md: '960px',
  		lg: '1023px',
  		xl: '1200px',
  		'2xl': '1400px'
  	},
  	extend: {
  		fontFamily: {
  			sans: [
  				'Barlow Semi Condensed',
  				'Inter',
  				'system-ui',
  				'sans-serif'
  			],
  			street: [
  				'Impact',
  				'Arial Black',
  				'Helvetica',
  				'sans-serif'
  			],
  			bold: [
  				'Oswald',
  				'Bebas Neue',
  				'Impact',
  				'sans-serif'
  			],
  			script: [
  				'Righteous',
  				'Fredoka One',
  				'cursive'
  			]
  		},
  		fontSize: {
  			h1: [
  				'3.8rem',
  				{
  					lineHeight: '1.1',
  					fontWeight: '900'
  				}
  			],
  			'hero-xl': [
  				'clamp(4rem, 12vw, 8rem)',
  				{
  					lineHeight: '0.9',
  					fontWeight: '900'
  				}
  			],
  			'hero-lg': [
  				'clamp(3rem, 8vw, 6rem)',
  				{
  					lineHeight: '1.0',
  					fontWeight: '800'
  				}
  			],
  			'street-xl': [
  				'clamp(2.5rem, 6vw, 4rem)',
  				{
  					lineHeight: '1.1',
  					fontWeight: '900'
  				}
  			],
  			'button-fluid': 'clamp(18px, 2.5vw, 24px)',
  			'promo-fluid': 'clamp(20px, 3vw, 28px)'
  		},
  		maxWidth: {
  			container: '1200px',
  			'container-narrow': '768px',
  			'container-wide': '1400px',
  			prose: '65ch'
  		},
  		spacing: {
  			'18': '4.5rem',
  			'22': '5.5rem',
  			'88': '22rem',
  			'100': '25rem',
  			'128': '32rem',
  			section: '6rem',
  			'hero-padding': '2rem',
  			'hero-padding-lg': '5rem',
  			'speech-padding': '6rem'
  		},
  				animation: {
			// Existing Animations - Preserved
			'fade-carousel': 'fadeCarousel 2s ease',
			'pulse-slow': 'pulse 3s ease-in-out infinite',
			'bounce-subtle': 'bounceSubtle 2s ease-in-out infinite',
			float: 'float 3s ease-in-out infinite',
			glow: 'glow 2s ease-in-out infinite alternate',
			'glow-pulse': 'glowPulse 2s ease-in-out infinite',
			'slide-up': 'slideUp 0.6s ease-out',
			'slide-right': 'slideRight 0.6s ease-out',
			'scale-in': 'scaleIn 0.5s ease-out',
			'rotate-slow': 'rotateSlow 8s linear infinite',
			'accordion-down': 'accordion-down 0.2s ease-out',
			'accordion-up': 'accordion-up 0.2s ease-out',

			// New Hybrid Animations - Dice.fm + Calm.com
			'glitch': 'glitch 2s infinite',
			'glitch-subtle': 'glitchSubtle 3s infinite',
			'breathe': 'breathe 4s ease-in-out infinite',
			'breathe-slow': 'breatheSlow 6s ease-in-out infinite',
			'gentle-float': 'gentleFloat 6s ease-in-out infinite',
			'punk-bounce': 'punkBounce 1s ease-in-out',
			'calm-fade': 'calmFade 1s ease-in-out',
		},
  				colors: {
			// Core Black & White System
			black: '#000000',
			white: '#ffffff',
			
			// Grayscale Palette - Solid Colors Only
			gray: {
				50: '#fafafa',
				100: '#f5f5f5',
				200: '#e5e5e5',
				300: '#d4d4d4',
				400: '#a3a3a3',
				500: '#737373',
				600: '#525252',
				700: '#404040',
				800: '#262626',
				900: '#171717',
			},

			// Template Colors - ONLY for Buttons & CTAs
			'template-primary': '#22c55e',     // Green for primary actions
			'template-secondary': '#fdc0a8',   // Peach for secondary actions
			'template-accent': '#f0ff8c',      // Yellow for accent elements

			// Semantic Colors - Solid Only
			success: '#16a34a',
			warning: '#d97706',
			error: '#dc2626',
			info: '#2563eb',

			// Text Colors - Black & White System
			'text-primary': '#000000',
			'text-secondary': '#404040',
			'text-muted': '#737373',
			'text-inverse': '#ffffff',

			// Border & Background - No Transparency
			border: '#e5e5e5',
			'border-strong': '#d4d4d4',
			input: '#f5f5f5',
			ring: '#737373',
			background: '#ffffff',
			foreground: '#000000',

			// shadcn/ui Color System - Updated for B&W
			primary: {
				DEFAULT: '#000000',
				foreground: '#ffffff'
			},
			secondary: {
				DEFAULT: '#f5f5f5',
				foreground: '#000000'
			},
			destructive: {
				DEFAULT: '#dc2626',
				foreground: '#ffffff'
			},
			muted: {
				DEFAULT: '#f5f5f5',
				foreground: '#737373'
			},
			accent: {
				DEFAULT: '#fafafa',
				foreground: '#000000'
			},
			popover: {
				DEFAULT: '#ffffff',
				foreground: '#000000'
			},
			card: {
				DEFAULT: '#ffffff',
				foreground: '#000000'
			}
		},
  		borderRadius: {
  			button: '15px',
  			card: '24px',
  			xl: '1.5rem',
  			'2xl': '2rem',
  			lg: '0.5rem',
  			md: '0.375rem',
  			sm: '0.25rem'
  		},
  		transitionDuration: {
  			'400': '400ms',
  			'600': '600ms',
  			brand: '300ms',
  			carousel: '2000ms'
  		},
  		boxShadow: {
			// Clean B&W Shadow System - No Transparency
			'sm': '0 1px 2px 0 #d4d4d4',
			'md': '0 4px 6px -1px #d4d4d4',
			'lg': '0 10px 15px -3px #d4d4d4',
			'xl': '0 20px 25px -5px #d4d4d4',
			'2xl': '0 25px 50px -12px #d4d4d4',
			'inner': 'inset 0 2px 4px 0 #d4d4d4',
			'none': '0 0 #0000',
			
			// Card shadows
			'card': '0 2px 8px 0 #e5e5e5',
			'card-hover': '0 4px 12px 0 #d4d4d4',
			
			// Focus states
			'focus': '0 0 0 3px #a3a3a3',
			
			// Unified border shadows for consistency
			'border-light': '0 1px 3px 0 #e5e5e5',
			'border-medium': '0 2px 6px 0 #d4d4d4',
		},
  		keyframes: {
  			fadeCarousel: {
  				from: {
  					opacity: '0'
  				},
  				to: {
  					opacity: '1'
  				}
  			},
  			bounceSubtle: {
  				'0%, 100%': {
  					transform: 'translateY(-2px)'
  				},
  				'50%': {
  					transform: 'translateY(2px)'
  				}
  			},
  			float: {
  				'0%, 100%': {
  					transform: 'translateY(0px)'
  				},
  				'50%': {
  					transform: 'translateY(-10px)'
  				}
  			},
  			glow: {
  				from: {
  					boxShadow: '0 0 20px rgba(114, 9, 183, 0.2)'
  				},
  				to: {
  					boxShadow: '0 0 30px rgba(114, 9, 183, 0.6)'
  				}
  			},
  			glowPulse: {
  				'0%, 100%': {
  					textShadow: '0 0 5px currentColor, 0 0 10px currentColor, 0 0 15px currentColor'
  				},
  				'50%': {
  					textShadow: '0 0 10px currentColor, 0 0 20px currentColor, 0 0 30px currentColor'
  				}
  			},
  			slideUp: {
  				from: {
  					opacity: '0',
  					transform: 'translateY(30px)'
  				},
  				to: {
  					opacity: '1',
  					transform: 'translateY(0)'
  				}
  			},
  			slideRight: {
  				from: {
  					opacity: '0',
  					transform: 'translateX(-30px)'
  				},
  				to: {
  					opacity: '1',
  					transform: 'translateX(0)'
  				}
  			},
  			scaleIn: {
  				from: {
  					opacity: '0',
  					transform: 'scale(0.9)'
  				},
  				to: {
  					opacity: '1',
  					transform: 'scale(1)'
  				}
  			},
  			rotateSlow: {
  				from: {
  					transform: 'rotate(0deg)'
  				},
  				to: {
  					transform: 'rotate(360deg)'
  				}
  			},
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  						'accordion-up': {
				from: {
					height: 'var(--radix-accordion-content-height)'
				},
				to: {
					height: '0'
				}
			},

			// New Hybrid Keyframes - Dice.fm + Calm.com
			glitch: {
				'0%, 100%': { transform: 'translate(0)' },
				'20%': { transform: 'translate(-2px, 2px)' },
				'40%': { transform: 'translate(-2px, -2px)' },
				'60%': { transform: 'translate(2px, 2px)' },
				'80%': { transform: 'translate(2px, -2px)' }
			},
			glitchSubtle: {
				'0%, 100%': { transform: 'translate(0)' },
				'33%': { transform: 'translate(-1px, 1px)' },
				'66%': { transform: 'translate(1px, -1px)' }
			},
			breathe: {
				'0%, 100%': { transform: 'scale(1)' },
				'50%': { transform: 'scale(1.02)' }
			},
			breatheSlow: {
				'0%, 100%': { transform: 'scale(1)' },
				'50%': { transform: 'scale(1.01)' }
			},
			gentleFloat: {
				'0%, 100%': { transform: 'translateY(0px)' },
				'50%': { transform: 'translateY(-5px)' }
			},
			punkBounce: {
				'0%': { transform: 'scale(1) rotate(0deg)' },
				'50%': { transform: 'scale(1.05) rotate(1deg)' },
				'100%': { transform: 'scale(1) rotate(0deg)' }
			},
			calmFade: {
				'0%': { opacity: '0', transform: 'translateY(10px)' },
				'100%': { opacity: '1', transform: 'translateY(0)' }
			}
		},
  				backgroundImage: {
			// Simple B&W Gradients for Subtle Effects Only
			'gradient-light': 'linear-gradient(135deg, #ffffff 0%, #fafafa 100%)',
			'gradient-gray': 'linear-gradient(135deg, #f5f5f5 0%, #e5e5e5 100%)',
			'none': 'none',
		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
}
