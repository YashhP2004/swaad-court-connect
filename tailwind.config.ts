import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
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
					foreground: 'hsl(var(--primary-foreground))',
					glow: 'hsl(var(--primary-glow))'
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
					foreground: 'hsl(var(--accent-foreground))',
					teal: 'hsl(var(--accent-teal))',
					gold: 'hsl(var(--accent-gold))',
					purple: 'hsl(var(--accent-purple))',
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				success: {
					DEFAULT: 'hsl(var(--success))',
					foreground: 'hsl(var(--success-foreground))'
				},
				warning: {
					DEFAULT: 'hsl(var(--warning))',
					foreground: 'hsl(var(--warning-foreground))'
				},
				navy: {
					50: 'hsl(var(--navy-50))',
					100: 'hsl(var(--navy-100))',
					200: 'hsl(var(--navy-200))',
					300: 'hsl(var(--navy-300))',
					400: 'hsl(var(--navy-400))',
					500: 'hsl(var(--navy-500))',
					600: 'hsl(var(--navy-600))',
					700: 'hsl(var(--navy-700))',
					800: 'hsl(var(--navy-800))',
					900: 'hsl(var(--navy-900))',
					950: 'hsl(var(--navy-950))',
				},
				peach: {
					50: 'hsl(var(--peach-50))',
					100: 'hsl(var(--peach-100))',
					200: 'hsl(var(--peach-200))',
					300: 'hsl(var(--peach-300))',
					400: 'hsl(var(--peach-400))',
					500: 'hsl(var(--peach-500))',
					600: 'hsl(var(--peach-600))',
					700: 'hsl(var(--peach-700))',
					800: 'hsl(var(--peach-800))',
					900: 'hsl(var(--peach-900))',
					950: 'hsl(var(--peach-950))',
				},
				veg: 'hsl(var(--veg))',
				'non-veg': 'hsl(var(--non-veg))',
				spicy: 'hsl(var(--spicy))',
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				}
			},
			backgroundImage: {
				'gradient-primary': 'var(--gradient-primary)',
				'gradient-warm': 'var(--gradient-warm)',
				'gradient-food': 'var(--gradient-food)'
			},
			boxShadow: {
				'warm': 'var(--shadow-warm)',
				'glow': 'var(--shadow-glow)',
				'food': 'var(--shadow-food)'
			},
			fontFamily: {
				sans: ['var(--font-body)', 'Inter', 'system-ui', 'sans-serif'],
				heading: ['var(--font-heading)', 'Poppins', 'Inter', 'system-ui', 'sans-serif']
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'accordion-down': {
					from: { height: '0' },
					to: { height: 'var(--radix-accordion-content-height)' }
				},
				'accordion-up': {
					from: { height: 'var(--radix-accordion-content-height)' },
					to: { height: '0' }
				},
				'food-pulse': {
					'0%, 100%': { opacity: '1', transform: 'scale(1)' },
					'50%': { opacity: '0.8', transform: 'scale(1.05)' }
				},
				'food-bounce': {
					'0%, 20%, 53%, 80%, 100%': { transform: 'translate3d(0, 0, 0)' },
					'40%, 43%': { transform: 'translate3d(0, -8px, 0)' },
					'70%': { transform: 'translate3d(0, -4px, 0)' },
					'90%': { transform: 'translate3d(0, -2px, 0)' }
				},
				'steam-rise': {
					'0%': { opacity: '0.8', transform: 'translateY(0) scale(1)' },
					'50%': { opacity: '0.4', transform: 'translateY(-20px) scale(1.1)' },
					'100%': { opacity: '0', transform: 'translateY(-40px) scale(1.2)' }
				},
				'cart-bounce': {
					'0%': { transform: 'scale(1)' },
					'50%': { transform: 'scale(1.2)' },
					'100%': { transform: 'scale(1)' }
				},
				'shimmer': {
					'0%': { backgroundPosition: '-200% 0' },
					'100%': { backgroundPosition: '200% 0' }
				},
				'cooking-loader': {
					'0%': { transform: 'rotate(0deg)' },
					'25%': { transform: 'rotate(90deg) scale(1.1)' },
					'50%': { transform: 'rotate(180deg)' },
					'75%': { transform: 'rotate(270deg) scale(1.1)' },
					'100%': { transform: 'rotate(360deg)' }
				},
				'page-enter': {
					'0%': { opacity: '0', transform: 'translateY(20px) scale(0.95)' },
					'100%': { opacity: '1', transform: 'translateY(0) scale(1)' }
				},
				'gradient-move': {
					'0%': { backgroundPosition: '0% 50%' },
					'50%': { backgroundPosition: '100% 50%' },
					'100%': { backgroundPosition: '0% 50%' }
				},
				'float': {
					'0%, 100%': { transform: 'translateY(0) rotate(0deg)' },
					'33%': { transform: 'translateY(-10px) rotate(1deg)' },
					'66%': { transform: 'translateY(-5px) rotate(-1deg)' }
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'food-pulse': 'food-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
				'food-bounce': 'food-bounce 1s infinite',
				'steam-rise': 'steam-rise 3s ease-in-out infinite',
				'cart-bounce': 'cart-bounce 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
				'shimmer': 'shimmer 2s infinite',
				'cooking': 'cooking-loader 2s linear infinite',
				'page-enter': 'page-enter 0.6s cubic-bezier(0.23, 1, 0.32, 1)',
				'gradient-move': 'gradient-move 8s ease infinite',
				'float': 'float 6s ease-in-out infinite'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
