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
			// New Organic Color Palette - Dice.fm + Calm.com Hybrid
			'primary-yellow': '#f0ff8c',       // Bright yellow-green (energy)
			'primary-peach': '#fdc0a8',        // Warm peach (existing, now primary)
			'primary-green': '#81f08c',        // Fresh green (growth/discovery)
			'primary-lavender': '#cfceff',     // Soft purple (gentleness)
			'primary-mint': '#d8fdf0',         // Pale mint (calm/serene)
			'primary-white': '#ffffff',        // Pure white
			'primary-black': '#000000',        // Pure black

			// Functional Color Mappings
			'energy': '#f0ff8c',               // Yellow for high-energy interactions
			'calm': '#d8fdf0',                 // Mint for serene content areas
			'warm': '#fdc0a8',                 // Peach for warmth/connection
			'soft': '#cfceff',                 // Lavender for gentle touches
			'fresh': '#81f08c',                // Green for growth/action

			// Legacy Colors - Preserved for Gradual Migration
			'primary-blue': '#8cc9ff',         // Keep existing blue
			'electric-blue': '#00ffff',        // Keep for transition period
			'neon-pink': '#ff006e',            // Keep for transition period
			'acid-green': '#8ac926',           // Keep for transition period
			'sunset-orange': '#ff7900',        // Keep for transition period
			'alert-orange': '#ff6b35',         // Keep for alerts
			'cyber-purple': '#9d4edd',         // Keep for transition period
			'deep-purple': '#7209b7',          // Keep for transition period
			'hot-magenta': '#f72585',          // Keep for transition period
			'cyber-yellow': '#ffbe0b',         // Keep for transition period
			'gradient-start': '#7209b7',       // Keep for existing gradients
			'gradient-middle': '#f72585',      // Keep for existing gradients
			'gradient-end': '#ff006e',         // Keep for existing gradients

			// Utility Colors
			'text-body': '#000000',
			'text-secondary': '#111111',
			'text-muted': '#666666',
			'text-inverse': '#ffffff',
			'border-neutral': '#dbdbdb',
			'bg-glass': 'rgba(255, 255, 255, 0.1)',
			'bg-dark-glass': 'rgba(0, 0, 0, 0.2)',
			border: '#e5e7eb',
			input: '#f3f4f6',
			ring: '#374151',
			background: '#ffffff',
			foreground: '#111827',

			// shadcn/ui Color System - Preserved
			primary: {
				DEFAULT: '#111827',
				foreground: '#ffffff'
			},
			secondary: {
				DEFAULT: '#f9fafb',
				foreground: '#111827'
			},
			destructive: {
				DEFAULT: '#ef4444',
				foreground: '#ffffff'
			},
			muted: {
				DEFAULT: '#f9fafb',
				foreground: '#6b7280'
			},
			accent: {
				DEFAULT: '#f9fafb',
				foreground: '#111827'
			},
			popover: {
				DEFAULT: '#ffffff',
				foreground: '#111827'
			},
			card: {
				DEFAULT: '#ffffff',
				foreground: '#111827'
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
  		backdropBlur: {
  			xs: '2px',
  			'4xl': '72px'
  		},
  				boxShadow: {
			// Legacy Shadows - Preserved
			glow: '0 0 20px rgba(114, 9, 183, 0.3)',
			'glow-pink': '0 0 20px rgba(255, 0, 110, 0.3)',
			'glow-blue': '0 0 20px rgba(0, 255, 255, 0.3)',
			'glow-yellow': '0 0 20px rgba(255, 190, 11, 0.3)',
			'glow-green': '0 0 20px rgba(138, 201, 38, 0.3)',
			street: '0 8px 32px rgba(0, 0, 0, 0.3)',
			brutal: '8px 8px 0px rgba(0, 0, 0, 1)',

			// New Hybrid Shadows - Dice.fm + Calm.com
			'glow-energy': '0 0 20px rgba(240, 255, 140, 0.4)',      // Yellow glow
			'glow-calm': '0 0 20px rgba(216, 253, 240, 0.6)',        // Mint glow
			'glow-warm': '0 0 20px rgba(253, 192, 168, 0.4)',        // Peach glow
			'glow-soft': '0 0 20px rgba(207, 206, 255, 0.5)',        // Lavender glow
			'glow-fresh': '0 0 20px rgba(129, 240, 140, 0.4)',       // Green glow
			'brutal-punk': '6px 6px 0px rgba(0, 0, 0, 1)',           // Smaller brutal shadow
			'brutal-heavy': '12px 12px 0px rgba(0, 0, 0, 1)',        // Larger brutal shadow
			'soft-calm': '0 4px 20px rgba(216, 253, 240, 0.2)',      // Soft calm shadow
			'soft-warm': '0 4px 20px rgba(253, 192, 168, 0.2)',      // Soft warm shadow
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
			// Legacy Gradients - Preserved for Migration
			'gradient-street': 'linear-gradient(135deg, #7209b7 0%, #f72585 50%, #ff006e 100%)',
			'gradient-cyber': 'linear-gradient(135deg, #00ffff 0%, #7209b7 100%)',
			'gradient-sunset': 'linear-gradient(135deg, #ff7900 0%, #f72585 100%)',
			'gradient-neon': 'linear-gradient(135deg, #8ac926 0%, #00ffff 100%)',
			'gradient-brutal': 'linear-gradient(45deg, #000000 25%, transparent 25%), linear-gradient(-45deg, #000000 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #000000 75%), linear-gradient(-45deg, transparent 75%, #000000 75%)',

			// New Hybrid Gradients - Dice.fm + Calm.com
			'gradient-energetic': 'linear-gradient(135deg, #f0ff8c 0%, #81f08c 100%)',         // Yellow to green
			'gradient-calm': 'linear-gradient(135deg, #d8fdf0 0%, #cfceff 100%)',             // Mint to lavender
			'gradient-warm': 'linear-gradient(135deg, #fdc0a8 0%, #f0ff8c 100%)',             // Peach to yellow
			'gradient-fresh': 'linear-gradient(135deg, #81f08c 0%, #d8fdf0 100%)',            // Green to mint
			'gradient-hybrid': 'linear-gradient(135deg, #fdc0a8 0%, #f0ff8c 50%, #81f08c 100%)', // Peach-yellow-green
			'gradient-organic': 'linear-gradient(135deg, #d8fdf0 0%, #cfceff 50%, #fdc0a8 100%)', // Mint-lavender-peach
		},
  		backgroundSize: {
  			brutal: '20px 20px'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
}
