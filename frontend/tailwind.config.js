export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        canvas: 'var(--color-canvas)',
        'deep-slate': 'var(--color-deep-slate)',
        'mind-teal': 'var(--color-mind-teal)',
        'insight-yellow': 'var(--color-insight-yellow)',
        'creativity-pink': 'var(--color-creativity-pink)',
        'warm-coral': 'var(--color-warm-coral)',
      },
      boxShadow: {
        hard: '4px 4px 0px 0px var(--color-shadow)',
        'hard-hover': '6px 6px 0px 0px var(--color-shadow)',
      },
      transitionTimingFunction: {
        pop: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      },
      fontFamily: {
        heading: ['"Plus Jakarta Sans"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
