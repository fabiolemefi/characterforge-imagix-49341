// Override postcss.config.js - use TypeScript config which has higher precedence
// Tailwind CSS v4 is processed by @tailwindcss/vite plugin in vite.config.ts
export default {
  plugins: {
    // Only autoprefixer - no tailwindcss here
    autoprefixer: {},
  },
}
