import { defineStore } from 'pinia'

export const useGameStore = defineStore('game', {

	state: () => ({
	}),

	getters: {
	},

	actions: {

		async loadLocalData() {

			let decrpytedLocalData: any = null

			const rawLocalData = localStorage.getItem('factory_game_save')
			if (rawLocalData) decrpytedLocalData = decryptData(rawLocalData)

		},

		processGameTick(deltaTime: number) {
		},

		encryptData(obj: any): string {

			const jsonString = JSON.stringify(obj)

			return btoa(encodeURIComponent(jsonString).replace(/%([0-9A-F]{2})/g, (_, p1) => {
				return String.fromCharCode(parseInt(p1, 16))
			}))
		},

		decryptData(cipherText: string): any {
			try {
		
				const decodedString = decodeURIComponent(Array.prototype.map.call(atob(cipherText), (c) => {
					return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
				}).join(''))
	
				return JSON.parse(decodedString)
			}
			catch (e) {

				console.error("decrypt_failed", e)
				return null
			}
		}
	}
})