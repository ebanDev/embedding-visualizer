<template>
  <div>
    <h1>Embedding Visualizer</h1>
    
    <!-- API Key Input -->
    <div class="api-key-section">
      <input 
        type="password"
        v-model="apiKey"
        placeholder="Enter OpenAI API Key"
        :class="{ 'error': showError }"
      />
      <button @click="saveApiKey">Save API Key</button>
    </div>

    <p>Question: {{ question }}</p>

    <h2>Responses</h2>
    <ul>
      <li v-for="(response, index) in responses" :key="index">
        {{ response }}
      </li>
    </ul>

    <button @click="runClassification" :disabled="isProcessing || !hasApiKey">
      {{ isProcessing ? 'Processing...' : 'Run Classification' }}
    </button>

    <Graph
      v-if="visualData"
      :responses="responses"
      :categories="categories"
      :embeddings="visualData.reducedEmbeddings"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useCookie } from '#app'
import { classifyResponses } from "@/composables/useEmbeddings"
import Graph from "@/components/Graph.vue"

// API Key Management
const apiKeyCookie = useCookie('openai_api_key', {
  maxAge: 30 * 24 * 60 * 60,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict'
})
const apiKey = ref(apiKeyCookie.value || '')
const showError = ref(false)
const hasApiKey = computed(() => !!apiKey.value)

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

const categories = ref([
  "fortement orientée vers l'aide et le soutien des autres, sans considération personnelle",
  "centrée sur des bénéfices et plaisirs personnels, sans penser aux autres"
])
const visualData = ref(null)
const results = ref(null)
const isProcessing = ref(false)

const runClassification = async () => {
  if (!apiKey.value) {
    showError.value = true
    return
  }
  
  isProcessing.value = true
  showError.value = false
  try {
    const data = await classifyResponses(responses.value, categories.value, question.value, apiKey.value)
    results.value = data.results
    visualData.value = data
  } catch (error) {
    console.error('Classification error:', error)
    showError.value = true
  } finally {
    isProcessing.value = false
  }
}
</script>

<style scoped>
.api-key-section {
  margin: 20px 0;
}

input.error {
  border-color: red;
}

input[type="password"] {
  padding: 8px;
  margin-right: 10px;
  width: 300px;
}
</style>
