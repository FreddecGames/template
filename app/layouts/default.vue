<script setup lang="ts">

	import { onMounted, onBeforeUnmount } from 'vue'
	import { useGameStore } from '~/stores/game'

	const gameStore = useGameStore()

	let animationFrameId: number
	let lastTimestamp = 0

	const runGameLoop = (timestamp: number) => {

		if (!lastTimestamp) lastTimestamp = timestamp

		const deltaTime = (timestamp - lastTimestamp) / 1000
		lastTimestamp = timestamp

		gameStore.processGameTick(deltaTime)

		animationFrameId = requestAnimationFrame(runGameLoop)
	}

    const isLoading = ref<boolean>(true)
    const loadingError = ref<string | null>(null)

	onMounted(() => {

        isLoading.value = true
        loadingError.value = null

        try {

			gameStore.loadLocalData()
		
			animationFrameId = requestAnimationFrame(runGameLoop)
        }
        catch (err: any) {

            loadingError.value = err.message
			console.log(err)
        }
        finally {

            isLoading.value = false
        }
	})

	onBeforeUnmount(() => { cancelAnimationFrame(animationFrameId) })

</script>

<template>
	<div class="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col">

		<!-- Loading Card -->

		<div v-if="isLoading" class="flex flex-col items-center justify-center py-12">

			<UCard :ui="{ 'body':'p-3 sm:p-3' }">
				<div class="flex flex-col space-y-2">

					<h1 class="text-xl font-bold text-white flex items-center justify-center gap-2">
						<UIcon name="i-lucide-factory" class="w-6 h-6 text-primary" />
						FG Factory
					</h1>

					<UProgress size="xs" animation="carousel" class="w-64" />

				</div>
			</UCard>

		</div>

		<!-- Main Screen -->

		<main v-else class="flex-1">
			<slot />
		</main>

	</div>
</template>