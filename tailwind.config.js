/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,tsx,mdx}",
    "./components/**/*.{js,ts,tsx,mdx}",
    "./lib/**/*.{js,ts,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // 主字体：Inter (等线)
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        // 数字/代码：JetBrains Mono
        mono: ['var(--font-mono)', 'monospace'],
        // 装饰性标题：Playfair
        display: ['var(--font-playfair)', 'serif'],
      },
      colors: {
        brand: {
          50: '#fff8f1',
          100: '#ffefd8',
          200: '#ffdbab',
          300: '#ffc074',
          400: '#ff9e3d',
          500: '#ff7e0f',
          600: '#f56000',
          700: '#c24100',
          800: '#9a3406',
          900: '#7c2d0b',
        }
      },
      animation: {
        'blob': 'blob 7s infinite',
        'fade-in-up': 'fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-in-right': 'slideInRight 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
      keyframes: {
        blob: {
          '0%': { transform: 'translate(0px, 0px) scale(1)' },
          '33%': { transform: 'translate(30px, -50px) scale(1.1)' },
          '66%': { transform: 'translate(-20px, 20px) scale(0.9)' },
          '100%': { transform: 'translate(0px, 0px) scale(1)' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        }
      }
    },
  },
  plugins: [require("tailwindcss-animate")],
}
