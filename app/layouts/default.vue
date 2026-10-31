<!-- ./app/layouts/default.vue -->

<script setup lang="ts">

	import { ref, onMounted, onBeforeUnmount } from 'vue'

	import { useGameStore } from '~/stores/game'

	const gameStore = useGameStore()

	let animationFrameId: number
	let lastTimestamp = 0

	const runGameLoop = (timestamp: number) => {

		if (!lastTimestamp) lastTimestamp = timestamp

		let deltaSeconds = (timestamp - lastTimestamp) / 1000
		lastTimestamp = timestamp

		if (deltaSeconds > 1.0) deltaSeconds = 1.0

		gameStore.processGameTick(deltaSeconds)

		animationFrameId = requestAnimationFrame(runGameLoop)
	}

	const isLoading = ref<boolean>(true)
	const loadingError = ref<string | null>(null)
	
	const isOptionsOpen = ref<boolean>(false)
	const activeTab = ref<string>('items')

    const tabs =  [

		{ label:$t('tabs.items'), value:'items', icon:'i-lucide-boxes' },
	]

	onMounted(async () => {

		isLoading.value = true
		loadingError.value = null

		try {

			await gameStore.loadLocalData()
		
			animationFrameId = requestAnimationFrame(runGameLoop)

			gameStore.startAutoSave(30000)
		}
		catch (err: any) {

			loadingError.value = err.message
			console.error(err)
		}
		finally {

			isLoading.value = false
		}
	})

	onBeforeUnmount(() => {

		gameStore.stopAutoSave()

		cancelAnimationFrame(animationFrameId)
	})

</script>

<template>
	<div class="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col">

		<!-- Loading Card -->
		<div v-if="isLoading" class="flex flex-col items-center justify-center min-h-screen py-12 px-4 text-center">
			<UCard :ui="{ 'body': 'p-3 sm:p-3 max-w-md' }">
				<div class="flex flex-col space-y-3 items-center">

					<h1 class="text-xl font-bold text-white flex items-center justify-center gap-2">
						<UIcon name="i-lucide-factory" class="w-6 h-6 text-primary" />
						{{ $t('gameName') }}
					</h1>

					<UProgress size="xs" animation="carousel" class="w-64" />

				</div>
			</UCard>
		</div>

		<!-- Error Screen -->
		<div v-else-if="loadingError" class="flex flex-col items-center justify-center min-h-screen py-12 px-4 text-center">
			<UCard :ui="{ 'body': 'p-3 sm:p-3 max-w-md' }">
				<div class="flex flex-col space-y-3 items-center">

					<div class="flex flex-col space-y-1">
						<UIcon name="i-lucide-alert-triangle" class="w-12 h-12 text-error mx-auto" />
						<h2 class="text-lg font-semibold text-white">{{ $t('loading.error') }}</h2>
						<p class="text-sm text-error italic">"{{ loadingError }}"</p>
					</div>

					<UButton color="error" variant="subtle" block @click="gameStore.wipeLocalData()">
						{{ $t('loading.error_button') }}
					</UButton>

				</div>
			</UCard>
		</div>

		<!-- Main Screen -->
		<main v-else class="flex-1 flex flex-col">

			<!-- Page Header -->
			<div class="fixed top-0 z-50 w-full">
				<UContainer class="sm:px-3 lg:px-3 backdrop-blur max-w-3xl mx-auto bg-neutral-900/70 px-3">

					<header class="pt-2 flex justify-between gap-3">

						<h1 class="text-xl font-bold text-neutral-900 dark:text-white flex items-center justify-center gap-2">
							<UIcon name="i-lucide-factory" class="w-6 h-6 text-primary" />
							{{ $t('gameName') }}
						</h1>

						<UButton color="primary" variant="ghost" icon="i-lucide-settings-2" square size="md"
							@click="isOptionsOpen = true" />

					</header>

					<UTabs v-model="activeTab" :items="tabs" size="sm"
						variant="link" :ui="{ list: 'justify-center' }" />

				</UContainer>
			</div>

			<!-- Page Content -->
			<div class="flex-1 flex flex-col">
				<UContainer class="flex-1 sm:px-3 lg:px-3 max-w-3xl mx-auto bg-neutral-900/70 px-3">

					<slot />

				</UContainer>
			</div>

		</main>

	</div>
</template>
