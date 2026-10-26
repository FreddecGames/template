export default defineNuxtConfig({

	ssr: false,
	
    compatibilityDate: '2025-07-15',

    devtools: { enabled: false },

    modules: [ '@pinia/nuxt', '@nuxt/ui' ],

    css: ['~/assets/css/main.css'],

    app: {
        head: {
            link: [
                { rel: 'icon', type: 'image/png', href: '/favicon.png' }
            ]
        }
    }
})
