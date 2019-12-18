module.exports = {
  theme: {
    screens: {
      'xs': '480px',
      'sm': '640px',
      'md': '768px',
      'lg': '960px',
      'xl': '1024px',
      'xxl': '1440px'
    },
    fontFamily: {
      display: ['DINPro-Regular', 'sans-serif']
    },
    extend: {
      colors: {
        'brand1': '#E2001A'
      },
      textColor: {
        'primary': '#666666'
      }
    }
  },
  variants: {
    display: ['responsive', 'first'],
    visibility: ['responsive', 'hover', 'group-hover'],
    textColor: ['responsive', 'hover', 'active', 'group-hover']
  },
  plugins: [
    require('@tailwindcss/custom-forms')
  ]
}
