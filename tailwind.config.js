/** @type {import('tailwindcss').Config} */
module.exports = {
	darkMode: ['class'],
	content: [
		'./pages/**/*.{ts,tsx}',
		'./components/**/*.{ts,tsx}',
		'./app/**/*.{ts,tsx}',
		'./srs/**/*.{ts,tsx}',
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
					DEFAULT: '#FF9900',
					dim: '#CC7A00',
					faint: 'rgba(255, 153, 0, 0.08)',
				},
				'nerv-amber': {
					DEFAULT: '#FFB366',
					bright: '#FFEE00',
					dim: '#CC7A00',
					faint: 'rgba(255, 179, 102, 0.15)',
				},
				'nerv-rust': {
					DEFAULT: '#804C00',
					dim: '#5C3600',
					faint: 'rgba(128, 76, 0, 0.15)',
				},
				'nerv-brown': {
					DEFAULT: '#3A240F',
					dim: '#2A190A',
					faint: 'rgba(58, 36, 15, 0.3)',
				},
				
				'nerv-void': {
					DEFAULT: '#050505',
					panel: '#0A0A0A',
					elevated: '#111111',
				},
				
				'nerv-alert': {
					DEFAULT: '#990000',
					dim: '#660000',
					faint: 'rgba(153, 0, 0, 0.15)',
				},
				
				// Minimal steel for disabled/muted states
				'steel': {
					DEFAULT: '#CCCCCC',
					dim: '#999999',
					dark: '#666666',
					line: 'rgba(204, 204, 204, 0.3)',
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
				'header': ['Segoe UI', 'Roboto Condensed', 'Helvetica Neue', 'Arial Narrow', 'sans-serif'],
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
