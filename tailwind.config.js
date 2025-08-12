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
  			'accordion-up': 'accordion-up 0.2s ease-out'
  		},
  		colors: {
  			'primary-black': '#000000',
  			'primary-white': '#ffffff',
  			'primary-blue': '#8cc9ff',
  			'primary-peach': '#fdc0a8',
  			'electric-blue': '#00ffff',
  			'neon-pink': '#ff006e',
  			'acid-green': '#8ac926',
  			'sunset-orange': '#ff7900',
			'alert-orange': '#ff6b35',
			'cyber-purple': '#9d4edd',
  			'deep-purple': '#7209b7',
  			'hot-magenta': '#f72585',
  			'cyber-yellow': '#ffbe0b',
  			'gradient-start': '#7209b7',
  			'gradient-middle': '#f72585',
  			'gradient-end': '#ff006e',
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
  			glow: '0 0 20px rgba(114, 9, 183, 0.3)',
  			'glow-pink': '0 0 20px rgba(255, 0, 110, 0.3)',
  			'glow-blue': '0 0 20px rgba(0, 255, 255, 0.3)',
  			'glow-yellow': '0 0 20px rgba(255, 190, 11, 0.3)',
  			'glow-green': '0 0 20px rgba(138, 201, 38, 0.3)',
  			street: '0 8px 32px rgba(0, 0, 0, 0.3)',
  			brutal: '8px 8px 0px rgba(0, 0, 0, 1)'
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
  			}
  		},
  		backgroundImage: {
  			'gradient-street': 'linear-gradient(135deg, #7209b7 0%, #f72585 50%, #ff006e 100%)',
  			'gradient-cyber': 'linear-gradient(135deg, #00ffff 0%, #7209b7 100%)',
  			'gradient-sunset': 'linear-gradient(135deg, #ff7900 0%, #f72585 100%)',
  			'gradient-neon': 'linear-gradient(135deg, #8ac926 0%, #00ffff 100%)',
  			'gradient-brutal': 'linear-gradient(45deg, #000000 25%, transparent 25%), linear-gradient(-45deg, #000000 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #000000 75%), linear-gradient(-45deg, transparent 75%, #000000 75%)'
  		},
  		backgroundSize: {
  			brutal: '20px 20px'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
}
