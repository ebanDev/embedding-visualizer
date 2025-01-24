import OpenAI from 'openai';
import cosineSimilarity from "cosine-similarity";

const getOpenAIClient = (apiKey) => {
  if (!apiKey) {
    throw new Error('OpenAI API key is required');
  }
  
  return new OpenAI({
    apiKey: apiKey,
    dangerouslyAllowBrowser: true
  });
};

export async function getEmbeddings(texts, apiKey, model = "text-embedding-3-small") {
  const openai = getOpenAIClient(apiKey);
  if (!Array.isArray(texts)) {
    texts = [texts];
  }

  const response = await openai.embeddings.create({
    model: model,
    input: texts,
    encoding_format: "float"
  });
  
  if (!response?.data || !response.data.length) {
    throw new Error('No embedding data received from API');
  }

  return response.data.map((item) => item.embedding);
}

export async function classifyResponses(responses, categories, question, apiKey) {
  const categoryPrompts = categories.map(cat => 
    `Question: ${question}\nUne réponse typiquement ${cat}`
  );
  
  const responsePrompts = responses.map(resp => 
    `Question: ${question}\nRéponse: ${resp}`
  );

  const responseEmbeddings = await getEmbeddings(responsePrompts, apiKey);
  const categoryEmbeddings = await getEmbeddings(categoryPrompts, apiKey);

  // Normalize vectors
  const normalizeVector = (vector) => {
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    return vector.map(val => val / magnitude);
  };

  const normalizedResponseEmbeddings = responseEmbeddings.map(normalizeVector);
  const normalizedCategoryEmbeddings = categoryEmbeddings.map(normalizeVector);

  // Classification with improved confidence calculation
  const results = responses.map((response, idx) => {
    const similarities = normalizedCategoryEmbeddings.map(catEmbed => 
      cosineSimilarity(normalizedResponseEmbeddings[idx], catEmbed)
    );
    
    // Convert similarities to relative strengths
    const [simA, simB] = similarities;
    const total = Math.abs(simA) + Math.abs(simB);
    const normalizedStrength = Math.abs(simA - simB) / total;
    
    const bestMatchIndex = simA > simB ? 0 : 1;
    
    return {
      response,
      category: categories[bestMatchIndex],
      confidence: normalizedStrength * 100, // Convert to percentage
      magneticForce: similarities // For visualization
    };
  });

  // Calculate 1D positions
  const responsePositions1D = results.map(result => {
    const [forceA, forceB] = result.magneticForce;
    return [Math.tanh((forceB - forceA) * 2), 0];
  });

  return {
    results,
    reducedEmbeddings: {
      responses: responsePositions1D,
      categories: [[-1, 0], [1, 0]]
    }
  };
}
