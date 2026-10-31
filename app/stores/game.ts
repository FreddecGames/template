// ./app/stores/game.ts

import { defineStore } from 'pinia'

const LOCAL_DATA_NAME = 'fgfactory_save'

const AVAILABLE_SCENARIOS = [
	{ id: "satisfactory", name: "scenarios.satisfactory" },
	{ id: "alchemy", name: "scenarios.alchemy" },
]

export const useGameStore = defineStore('game', {

	state: () => ({

		lastSaveDate: 0,
		saveIntervalId: null as ReturnType<typeof setInterval> | null,

		currentScenarioId: AVAILABLE_SCENARIOS[0].id as string | null,

		items: [] as any[],
		prods: [] as any[],
		manuals: [] as any[],
		machines: [] as any[],
		
		itemMap: {} as Record<string, any>,
		prodMap: {} as Record<string, any>,
	}),

	getters: {

		scenarios: () => AVAILABLE_SCENARIOS
	},

	actions: {

		// Local data

		encryptData(obj: any): string {

			const jsonString = JSON.stringify(obj)

			return btoa(encodeURIComponent(jsonString).replace(/%([0-9A-F]{2})/g, (_, p1) => {
				return String.fromCharCode(parseInt(p1, 16))
			}))
		},

		decryptData(cipherText: string): any {
			try {

				const decodedString = decodeURIComponent(Array.prototype.map.call(atob(cipherText), (c: string) => {
					return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
				}).join(''))
	
				return JSON.parse(decodedString)
			}
			catch (e) {

				console.error("decrypt_failed", e)
				return null
			}
		},

		getEncryptedData(): string {
			const localData = {

				lastSaveDate: this.lastSaveDate,
				currentScenarioId: this.currentScenarioId,

				items: this.items.map(i => ({
					id: i.id,
					count: i.count
				})),

				machines: this.machines.map(m => ({
					id: m.id,
					count: m.count
				})),

				prods: this.prods.map(p => ({
					id: p.id, 
					assignedCount: p.assignedCount || 0,
					progressSeconds: p.progressSeconds || 0,
					isProcessing: p.isProcessing || false,
					runMachineCount: p.runMachineCount || 0,
					inputs: p.inputs.map((i: any) => ({ id: i.id, bufferCount: i.bufferCount || 0 }))
				})),

				manuals: this.manuals.map(m => ({
					id: m.id, 
					progressSeconds: m.progressSeconds || 0,
					isProcessing: m.isProcessing || false,
					queueCount: m.queueCount || 0
				})),
			}

			return this.encryptData(localData)
		},

		saveLocalData() {

			if (!import.meta.client) return

			this.lastSaveDate = Date.now()

			const encryptedString = this.getEncryptedData()
			localStorage.setItem(LOCAL_DATA_NAME, encryptedString)
		},

		startAutoSave(intervalMs: number = 30000) {

			if (!import.meta.client) return

			this.stopAutoSave()

			this.saveIntervalId = setInterval(() => {
				this.saveLocalData()
			}, intervalMs)
		},

		stopAutoSave() {

			if (this.saveIntervalId) {
				clearInterval(this.saveIntervalId)
				this.saveIntervalId = null
			}
		},

		wipeLocalData() {

			if (!import.meta.client) return

			this.stopAutoSave()

			localStorage.removeItem(LOCAL_DATA_NAME)

			window.location.reload()
		},

		async importLocalData(data: string): Promise<boolean> {

			if (!data || data.trim() === '') return false
			if (!import.meta.client) return false

			this.stopAutoSave()

			localStorage.setItem(LOCAL_DATA_NAME, data)

			window.location.reload()

			return true
		},

		async loadLocalData() {

			if (!import.meta.client) return

			let decryptedLocalData: any = null
			const rawLocalData = localStorage.getItem(LOCAL_DATA_NAME)
			if (rawLocalData) decryptedLocalData = this.decryptData(rawLocalData)
			
			if (decryptedLocalData && decryptedLocalData.currentScenarioId !== undefined)
				this.currentScenarioId = decryptedLocalData.currentScenarioId

			if (!AVAILABLE_SCENARIOS.some(s => s.id === this.currentScenarioId))
				this.currentScenarioId = AVAILABLE_SCENARIOS[0].id

			const [scenarioData] = await Promise.all([
				fetch(`/scenarios/${this.currentScenarioId}/data.json`).then(response => response.json())
			])

			// Items

			this.items = []
			if (scenarioData && scenarioData.items) {
				scenarioData.items.forEach((itemData: any) => {
					this.items.push({
						id: itemData.id,
						img: `/scenarios/${this.currentScenarioId}/img/${itemData.id}.png`,
						name: 'item_' + itemData.id,
						group: itemData.group,
						max: itemData.stack || Infinity,
						count: itemData.initialCount || 0,
						links: [] 
					})
				})
			}

			// Machines

			this.machines = []
			if (scenarioData && scenarioData.machines) {
				scenarioData.machines.forEach((machineData: any) => {
					this.machines.push({
						id: machineData.id,
						img: `/scenarios/${this.currentScenarioId}/img/${machineData.id}.png`,
						name: 'machine_' + machineData.id,
						group: machineData.group,
						count: machineData.initialCount || 0,
					})
				})
			}

			// Recipes

			this.prods = []
			this.manuals = []

			if (scenarioData && scenarioData.recipes) {
				scenarioData.recipes.forEach((recipeData: any) => {
					
					const recipeInputs = [] as any[]
					if (recipeData.inputs) {
						Object.entries(recipeData.inputs).forEach(([inputId, inputRate]: [string, any]) => {
							
							const inputItem = this.items.find(i => i.id === inputId)
							const inputMax = inputItem ? inputItem.max : 100

							recipeInputs.push({ 
								id: inputId, 
								rate: inputRate, 
								bufferMax: inputMax
							})
						})
					}

					const recipeOutputs = [] as any[]
					if (recipeData.outputs) {
						Object.entries(recipeData.outputs).forEach(([outputId, outputRate]: [string, any]) => {
							recipeOutputs.push({ id: outputId, rate: outputRate })
						})
					}

					const compatibleMachineIds = recipeData.machines || []

					compatibleMachineIds.forEach((machineId: string) => {

						if (machineId !== 'manual') {

							const uniqueManualId = `${recipeData.id}_manual`

							this.manuals.push({
								id: uniqueManualId,
								recipeId: recipeData.id,
								group: recipeData.group,
								durationSeconds: recipeData.seconds,
								progressSeconds: 0,
								isProcessing: false,
								queueCount: 0,
								outputs: recipeData.outputs,
								inputs: recipeData.inputs,
							})
						}
						else {

							let machineSpeed = 1
							const machineConfig = this.machines.find(m => m.id === machineId)
							if (machineConfig && machineConfig.speed !== undefined)
								machineSpeed = machineConfig.speed

							const adjustedDuration = (recipeData.seconds || 1) / machineSpeed

							const lineInputs = recipeInputs.map(input => ({
								...input,
								bufferCount: 0
							}))

							const uniqueLineId = `${recipeData.id}_${machineId}`

							lineInputs.forEach((input: any) => {
								const inputItem = this.items.find(i => i.id === input.id)
								if (inputItem) {
									inputItem.links.push({
										targetProdId: uniqueLineId,
										targetInputId: input.id,
										rate: 0,
									})
								}
							})

							this.prods.push({

								id: uniqueLineId,                  
								recipeId: recipeData.id,            
								machineId: machineId,              
								group: recipeData.group,            
								assignedCount: 0,
								
								durationSeconds: adjustedDuration, 
								progressSeconds: 0,
								isProcessing: false,
								runMachineCount: 0,

								outputs: recipeOutputs,
								inputs: lineInputs
							})
						}
					})
				})
			}

			// Saved data

			if (decryptedLocalData) {

				if (decryptedLocalData.lastSaveDate !== undefined) this.lastSaveDate = decryptedLocalData.lastSaveDate

				if (decryptedLocalData.items) {
					decryptedLocalData.items.forEach((savedItem: any) => {
						const item = this.items.find(i => i.id === savedItem.id)
						if (item) item.count = savedItem.count ?? 0
					})
				}

				if (decryptedLocalData.machines) {
					decryptedLocalData.machines.forEach((savedMachine: any) => {
						const machine = this.machines.find(m => m.id === savedMachine.id)
						if (machine) machine.count = savedMachine.count ?? 0
					})
				}

				if (decryptedLocalData.prods) {
					decryptedLocalData.prods.forEach((savedProd: any) => {
						const prod = this.prods.find(p => p.id === savedProd.id)
						if (prod) {

							prod.assignedCount = savedProd.assignedCount ?? 0
							prod.progressSeconds = savedProd.progressSeconds ?? 0
							prod.isProcessing = savedProd.isProcessing || false
							prod.runMachineCount = savedProd.runMachineCount ?? 0

							if (savedProd.inputs) {
								savedProd.inputs.forEach((savedInput: any) => {
									const runtimeInput = prod.inputs.find((i: any) => i.id === savedInput.id)
									if (runtimeInput) runtimeInput.bufferCount = savedInput.bufferCount ?? 0
								})
							}
						}
					})
				}

				if (decryptedLocalData.manuals) {
					decryptedLocalData.manuals.forEach((savedManual: any) => {
						const manual = this.manuals.find(m => m.id === savedManual.id)
						if (manual) {

							manual.progressSeconds = savedManual.progressSeconds ?? 0
							manual.isProcessing = savedManual.isProcessing || false
							manual.queueCount = savedManual.queueCount ?? 0
						}
					})
				}
			}

			// Util maps

			this.itemMap = {}
			this.items.forEach(item => { this.itemMap[item.id] = item })

			this.prodMap = {}
			this.prods.forEach(prod => { this.prodMap[prod.id] = prod })

			// Offline gains

			if (this.lastSaveDate > 0) this.processOfflineProgress()
		},

		processOfflineProgress() {

			const now = Date.now()
			let offlineSeconds = Math.max(0, (now - this.lastSaveDate) / 1000)
			offlineSeconds = Math.min(offlineSeconds, 43200)

			if (offlineSeconds <= 0) return

			const tickSeconds = 2
			while (offlineSeconds > 0) {

				const currentTick = Math.min(offlineSeconds, tickSeconds)
				this.processGameTick(currentTick)
				offlineSeconds -= currentTick
			}
		},

		// Game tick

		processGameTick(deltaSeconds: number) {

			if (this.items.length === 0) return

			// Manual crafting

			this.manuals.filter(m => m.isProcessing).forEach(manual => {

				manual.progressSeconds += deltaSeconds
				if (manual.progressSeconds >= (manual.durationSeconds * manual.queueCount)) {

					manual.outputs.forEach((output: any) => {
						const outputItem = this.itemMap[output.id]
						if (outputItem) {
							outputItem.count += output.rate * manual.queueCount
							if (outputItem.count > outputItem.max) outputItem.count = outputItem.max
						}
					})

					manual.isProcessing = false
					manual.progressSeconds = 0
					manual.queueCount = 0
				}
			})

			// Logistic links

			this.items.forEach(item => {

				if (!item.links || item.links.length === 0 || item.count <= 0) return

				item.links.forEach((link: any) => {

					const targetProd = this.prodMap[link.targetProdId]
					if (!targetProd) return

					const targetProdInput = this.prodMap[link.targetInputId]
					if (!targetProdInput) return

					const targetProdInputSpace = targetProdInput.bufferMax - targetProdInput.bufferCount
					if (targetProdInputSpace <= 0) return

					const maxToTransfer = link.rate * deltaSeconds
					let countToTransfer = Math.min(maxToTransfer, item.count, targetProdInputSpace)

					if (countToTransfer > 0) {

						item.count -= countToTransfer
						if (item.count < 0) item.count = 0

						targetProdInput.bufferCount += countToTransfer
					}
				})
			})

			// Production lines

			if (this.prods.length === 0) return

			this.prods.forEach(prod => {
				
				// Waiting production lines

				if (!prod.isProcessing) {

					if (!prod.assignedCount || prod.assignedCount <= 0) return

					let runMachineCount = prod.assignedCount

					prod.inputs.forEach((input: any) => {

						if (input.rate <= 0) return

						const inputMachineCount = Math.floor(input.bufferCount / input.rate)
						runMachineCount = Math.min(runMachineCount, inputMachineCount)
					})

					prod.outputs.forEach((output: any) => {

						if (output.rate <= 0) return

						const outputItem = this.itemMap[output.id]
						if (!outputItem) {
							runMachineCount = 0
							return
						}

						const outputSpace = outputItem.max - outputItem.count
						const outputMachineCount = Math.floor(outputSpace / output.rate)
						runMachineCount = Math.min(runMachineCount, outputMachineCount)
					})

					if (runMachineCount >= 1) {
						
						prod.runMachineCount = runMachineCount

						prod.inputs.forEach((input: any) => {
							input.bufferCount -= input.rate * prod.runMachineCount
							if (input.bufferCount < 0) input.bufferCount = 0
						})

						prod.isProcessing = true
						prod.progressSeconds = 0
					}
				}

				// Processing production lines

				if (prod.isProcessing) {

					prod.progressSeconds += deltaSeconds
					if (prod.progressSeconds >= prod.durationSeconds) {

						let canDeliver = true

						prod.outputs.forEach((output: any) => {
							const outputItem = this.itemMap[output.id]
							if (!outputItem || (outputItem.max - outputItem.count) < (output.rate * prod.runMachineCount))
								canDeliver = false
						})

						if (canDeliver) {

							prod.outputs.forEach((output: any) => {
								const outputItem = this.itemMap[output.id]
								if (outputItem) {
									outputItem.count += output.rate * prod.runMachineCount
									if (outputItem.count > outputItem.max) outputItem.count = outputItem.max
								}
							})

							prod.isProcessing = false
							prod.progressSeconds = 0
							prod.runMachineCount = 0
						}							
						else {

							prod.progressSeconds = prod.durationSeconds
						}
					}
				}
			})
		},
	}
})