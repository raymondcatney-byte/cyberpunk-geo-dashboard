/** @type {import('tailwindcss').Config} */
module.exports = {
	darkMode: ['class'],
	content: [
		'./pages/**/*.{ts,tsx}',
		'./components/**/*.{ts,tsx}',
		'./app/**/*.{ts,tsx}',
		'./src/**/*.{ts,tsx}',
	],
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px',
			},
		},
		extend: {
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				
				// NERV Multi-Tone Warm Palette
				'nerv-orange': {
					DEFAULT: '#FF9800',
					dim: '#B86B1F',
					faint: 'rgba(255, 152, 0, 0.15)',
				},
				'nerv-amber': {
					DEFAULT: '#E8A03C',
					bright: '#F5C67C',
					dim: '#B88850',
					faint: 'rgba(232, 160, 60, 0.15)',
				},
				'nerv-rust': {
					DEFAULT: '#8B5A2B',
					dim: '#6B4520',
					faint: 'rgba(139, 90, 43, 0.15)',
				},
				'nerv-brown': {
					DEFAULT: '#5C3A1E',
					dim: '#3D2614',
					faint: 'rgba(92, 58, 30, 0.3)',
				},
				
				'nerv-void': {
					DEFAULT: '#050505',
					panel: '#0A0A0A',
					elevated: '#111111',
				},
				
				'nerv-alert': {
					DEFAULT: '#C9302C',
					dim: '#8B2220',
					faint: 'rgba(201, 48, 44, 0.15)',
				},
				
				// Minimal steel for disabled/muted states
				'steel': {
					DEFAULT: '#808070',
					dim: '#505048',
					dark: '#303028',
					line: 'rgba(139, 90, 43, 0.3)',
				},
				
				primary: {
					DEFAULT: '#E8A03C',
					foreground: '#050505',
				},
				secondary: {
					DEFAULT: '#8B5A2B',
					foreground: '#F5C67C',
				},
				accent: {
					DEFAULT: '#F5C67C',
					foreground: '#050505',
				},
				destructive: {
					DEFAULT: '#C9302C',
					foreground: '#F5C67C',
				},
				muted: {
					DEFAULT: 'rgba(232, 160, 60, 0.08)',
					foreground: '#8B5A2B',
				},
				popover: {
					DEFAULT: '#0A0A0A',
					foreground: '#E8A03C',
				},
				card: {
					DEFAULT: '#0A0A0A',
					foreground: '#E8A03C',
				},
			},
			fontFamily: {
				mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
				'header': ['Space Grotesk', 'sans-serif'],
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)',
			},
			boxShadow: {
				'amber': '0 0 20px rgba(232, 160, 60, 0.2)',
				'amber-lg': '0 0 30px rgba(232, 160, 60, 0.3)',
			},
			keyframes: {
				'accordion-down': {
					from: { height: 0 },
					to: { height: 'var(--radix-accordion-content-height)' },
				},
				'accordion-up': {
					from: { height: 'var(--radix-accordion-content-height)' },
					to: { height: 0 },
				},
				'pulse-amber': {
					'0%, 100%': { opacity: 1 },
					'50%': { opacity: 0.7 },
				},
				'flicker': {
					'0%, 100%': { opacity: 1 },
					'92%': { opacity: 1 },
					'93%': { opacity: 0.95 },
					'94%': { opacity: 1 },
					'97%': { opacity: 0.98 },
				},
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'pulse-amber': 'pulse-amber 2s ease-in-out infinite',
				'flicker': 'flicker 4s ease-in-out infinite',
			},
		},
	},
	plugins: [require('tailwindcss-animate')],
}
