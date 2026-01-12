/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                primary: {
                    light: 'var(--primary-light)',
                    DEFAULT: 'var(--primary-color)',
                    dark: 'var(--primary-dark)',
                },
            },
        },
    },
    plugins: [],
}
