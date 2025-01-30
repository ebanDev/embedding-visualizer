<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
    <UContainer>
      <!-- Header -->
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-2xl font-bold">Embedding Visualizer</h1>
        <UModal title="OpenAI API Key Configuration">
          <UButton icon="i-lucide-key" label="Configure API Key" :color="apiKey ? 'green' : 'red'" variant="soft" />
          <template #body>
            <UFormGroup label="API Key" required>
              <UInput v-model="apiKey" type="password" placeholder="Enter OpenAI API Key" :error="showError" />
              <template #error>
                <p v-if="showError" class="text-red-500 text-sm">API Key is required.</p>
              </template>
            </UFormGroup>
          </template>
          <template #footer>
            <div class="flex justify-end gap-2">
              <UButton color="primary" label="Save" @click="saveApiKey" />
            </div>
          </template>
        </UModal>
      </div>

      <!-- Two Column Layout -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Left Column: Controls -->
        <div class="space-y-6">
          <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 flex gap-4 flex-col">
            <!-- Question Card -->
            <UCard>
              <template #header>
                <div class="flex justify-between items-center">
                  <h2 class="text-sm font-medium">Question</h2>
                  <UModal title="Edit Question">
                    <UButton icon="i-lucide-edit" color="gray" variant="ghost" size="xs" />
                    <template #body>
                      <UTextarea v-model="question" class="w-full" :rows="1" autoresize />
                    </template>
                  </UModal>
                </div>
              </template>
              <p class="text-base">{{ question }}</p>
            </UCard>

            <!-- Responses Card -->
            <UCard>
              <template #header>
                <div class="flex justify-between items-center">
                  <div class="flex items-center gap-2">
                    <h2 class="text-sm font-medium">Responses</h2>
                    <span v-if="responses.length > 5" class="text-xs text-gray-500">
                      (+{{ responses.length - 5 }} more)
                    </span>
                  </div>
                  <UModal title="Edit Responses">
                    <UButton icon="i-lucide-edit" color="gray" variant="ghost" size="xs" />
                    <template #body>
                      <div class="space-y-4">
                        <div v-for="(response, index) in responses" :key="index" class="flex gap-2">
                          <UTextarea v-model="responses[index]" class="w-full" :rows="1" autoresize />
                          <UButton v-if="responses.length > 1" icon="i-lucide-trash-2" color="red" variant="ghost" size="xs"
                            @click="responses.splice(index, 1)" />
                        </div>
                        <UButton block icon="i-lucide-plus" label="Add Response" @click="responses.push('')" />
                      </div>
                    </template>
                  </UModal>
                </div>
              </template>
              <ul class="list-disc pl-5 space-y-2 text-base">
                <li v-for="(response, index) in displayedResponses" :key="index">
                  {{ response }}
                </li>
              </ul>
            </UCard>

            <!-- Categories Card -->
            <UCard>
              <template #header>
                <div class="flex justify-between items-center">
                  <h2 class="text-sm font-medium">Extrémités</h2>
                  <UButton
                    icon="i-lucide-plus"
                    color="gray"
                    variant="ghost"
                    size="xs"
                    @click="addNewPair"
                  />
                </div>
              </template>
              <div class="space-y-4">
                <UCollapsible
                  v-for="(pair, pairIndex) in categoryPairs"
                  :key="pairIndex"
                  :model-value="true"
                  class="bg-gray-50 dark:bg-gray-900 rounded-lg overflow-hidden"
                >
                  <UButton
                    class="w-full flex justify-between items-center p-3"
                    color="gray"
                    variant="ghost"
                  >
                    <span class="flex items-center gap-2 flex-1">
                      <UInput
                        v-model="pair.title"
                        :placeholder="`Pair ${pairIndex + 1}`"
                        variant="none"
                        class="font-medium max-w-[200px]"
                        @click.stop
                      />
                    </span>
                    <div class="flex items-center gap-2">
                      <UButton 
                        v-if="categoryPairs.length > 1"
                        icon="i-lucide-trash-2" 
                        color="red" 
                        variant="ghost" 
                        size="xs"
                        @click.stop="deletePair(pairIndex)" 
                      />
                      <UModal :title="`Edit Pair ${pairIndex + 1}`">
                        <UButton 
                          icon="i-lucide-edit" 
                          color="gray" 
                          variant="ghost" 
                          size="xs"
                          @click.stop
                        />
                        <template #body>
                          <div class="space-y-4">
                            <div v-for="(category, index) in [0,1]" :key="index" class="space-y-2">
                              <UFormGroup :label="`Extrémité ${index + 1}`">
                                <UTextarea 
                                  v-model="categoryPairs[pairIndex].extremities[index]" 
                                  class="w-full" 
                                  :rows="2" 
                                  autoresize 
                                />
                              </UFormGroup>
                            </div>
                          </div>
                        </template>
                      </UModal>
                      <UIcon name="i-lucide-chevron-down" class="transition-transform ui-open:rotate-180" />
                    </div>
                  </UButton>

                  <template #content>
                    <div class="p-4 space-y-2">
                      <div v-for="(category, index) in pair.extremities" :key="index" 
                        class="p-3 rounded-lg bg-gray-100 dark:bg-gray-950">
                        <p class="text-sm">
                          <span class="font-medium">Extrémité {{ index + 1 }}:</span> 
                          {{ category }}
                        </p>
                      </div>
                    </div>
                  </template>
                </UCollapsible>
              </div>
            </UCard>

            <UButton
              block
              :loading="isProcessing"
              :disabled="!apiKey"
              @click="runClassification"
              :label="isProcessing ? 'Processing...' : 'Run Classification'"
            />
          </div>
        </div>

        <!-- Right Column: Visualizations Grid -->
        <div class="space-y-6">
          <template v-if="visualData">
            <div v-for="(embedding, index) in visualData.embeddings" :key="index"
              class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div class="mb-2 font-medium text-sm">Classification with Pair {{ index + 1 }}</div>
              <Graph
                :responses="responses"
                :categories="categoryPairs[index].extremities"
                :embeddings="embedding"
                :initial-spread="visualData.spreads[index]"
                :title="categoryPairs[index].title"
                @update:spread="async (spread) => {
                  await rerunClassification(index, spread)
                }"
              />
            </div>
          </template>
          <div v-else class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 min-h-[600px] flex items-center justify-center">
            <div class="text-center text-gray-500 dark:text-gray-400">
              <UIcon name="i-lucide-bar-chart" class="w-12 h-12 mx-auto mb-4" />
              <p class="text-sm">Run the classification to see the visualizations</p>
            </div>
          </div>
        </div>
      </div>
    </UContainer>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useCookie } from '#app'
import { classifyResponses } from "@/composables/useEmbeddings"
import Graph from "@/components/Graph.vue"

// API Key Management
const apiKeyCookie = useCookie('openai_api_key', {
  maxAge: 30 * 24 * 60 * 60,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict'
})

// Extremities pairs cookie
const categoryPairsCookie = useCookie('extremities_pairs', {
  maxAge: 30 * 24 * 60 * 60,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict'
})

const apiKey = ref(apiKeyCookie.value || '')
const showError = ref(false)

const saveApiKey = () => {
  if (apiKey.value) {
    apiKeyCookie.value = apiKey.value
    showError.value = false
  } else {
    showError.value = true
  }
}

const question = ref("Si vous aviez 10 000 euros demain, qu'en feriez-vous ?")
const responses = ref([
  "Je donnerais l'argent à des associations caritatives.",
  "Je rembourserais mes dettes.",
  "J'investirais dans l'éducation des enfants défavorisés.",
  "Je partirais en voyage autour du monde.",
  "Je construirais un centre pour aider les sans-abris.",
  "Je m'achète une mazeratti",
  "Je donne tout à Éric Zemmour",
])

const categoryPairs = ref(categoryPairsCookie.value || [
  {
    title: "Original Pair",
    extremities: [
      "fortement orientée vers l'aide et le soutien des autres, sans considération personnelle",
      "centrée sur des bénéfices et plaisirs personnels, sans penser aux autres"
    ]
  }
])

// Watch for changes in categoryPairs and update cookie
watch(categoryPairs, (newPairs) => {
  categoryPairsCookie.value = newPairs
}, { deep: true })

const categories = [0, 1] // Fixed array for two extremities

function addNewPair() {
  categoryPairs.value = [...categoryPairs.value, {
    title: `New Pair ${categoryPairs.value.length + 1}`,
    extremities: [
      "New extremity focusing on aspect 1",
      "New extremity focusing on aspect 2"
    ]
  }]
}

function deletePair(index) {
  if (categoryPairs.value.length > 1) {
    categoryPairs.value = categoryPairs.value.filter((_, i) => i !== index)
    // If we have visual data, update it as well
    if (visualData.value) {
      visualData.value = {
        embeddings: visualData.value.embeddings.filter((_, i) => i !== index),
        spreads: visualData.value.spreads.filter((_, i) => i !== index)
      }
    }
    if (storedEmbeddings.value) {
      storedEmbeddings.value = storedEmbeddings.value.filter((_, i) => i !== index)
    }
  }
}

const visualData = ref(null)
const storedEmbeddings = ref(null) // Add this to store original embeddings
const isProcessing = ref(false)

// Add computed property for limited responses display
const displayedResponses = computed(() => responses.value.slice(0, 5))

// Update classification to handle all pairs
const runClassification = async () => {
  if (!apiKey.value) {
    showError.value = true
    return
  }

  isProcessing.value = true
  showError.value = false
  try {
    const results = await Promise.all(
      categoryPairs.value.map(pair => 
        classifyResponses(responses.value, pair.extremities, question.value, apiKey.value, 1) // Set initial spread to 1
      )
    )
    storedEmbeddings.value = results.map(r => r.originalData)
    visualData.value = {
      embeddings: results.map(r => r.reducedEmbeddings),
      spreads: new Array(results.length).fill(1) // Track spread for each graph
    }
  } catch (error) {
    console.error('Classification error:', error)
    showError.value = true
  } finally {
    isProcessing.value = false
  }
}

async function rerunClassification(pairIndex, spreadFactor) {
  if (!visualData.value || !storedEmbeddings.value) return
  
  const recalculated = recalculatePositions(storedEmbeddings.value[pairIndex], spreadFactor)
  
  visualData.value = {
    ...visualData.value,
    embeddings: visualData.value.embeddings.map((emb, i) => 
      i === pairIndex ? recalculated : emb
    ),
    spreads: visualData.value.spreads.map((s, i) => 
      i === pairIndex ? spreadFactor : s
    )
  }
}
</script>
