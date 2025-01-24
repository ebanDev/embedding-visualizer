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

// Helper functions for matrix operations
const transpose = (matrix) => {
  console.log('🔄 Transposing matrix:', matrix);
  if (!matrix || !matrix.length || !matrix[0]) {
    console.warn('⚠️ Empty or invalid matrix in transpose!');
    return [];
  }
  const result = matrix[0].map((_, i) => matrix.map(row => row[i]));
  console.log('✅ Transpose result:', result);
  return result;
};

const matrixMultiply = (a, b) => {
  if (!a?.length || !b?.length) return [];
  
  const aRows = a.length;
  const aCols = a[0].length;
  const bCols = b[0].length;
  
  const result = Array(aRows).fill().map(() => Array(bCols).fill(0));
  
  for (let i = 0; i < aRows; i++) {
    for (let j = 0; j < bCols; j++) {
      for (let k = 0; k < aCols; k++) {
        result[i][j] += a[i][k] * b[k][j];
      }
    }
  }
  
  return result;
};

const simplePCA = (data, dimensions = 2) => {
  if (!data?.length) return [];
  
  // Center the data more accurately
  const means = data[0].map((_, col) => 
    data.reduce((sum, row) => sum + row[col], 0) / data.length
  );
  
  const centered = data.map(row =>
    row.map((val, col) => val - means[col])
  );

  // Calculate covariance matrix
  const transposed = transpose(centered);
  const covMatrix = matrixMultiply(transposed, centered).map(row => 
    row.map(val => val / (data.length - 1))
  );

  // Get principal components using first two dimensions
  // Improve component selection by using magnitude
  const components = covMatrix.map((row, i) => ({
    vector: row,
    magnitude: Math.sqrt(row.reduce((sum, x) => sum + x * x, 0)),
    index: i
  }));

  components.sort((a, b) => b.magnitude - a.magnitude);
  const pc1 = components[0].vector;
  const pc2 = components[1].vector;

  // Project data onto principal components
  return centered.map(point => [
    point.reduce((sum, val, i) => sum + val * pc1[i], 0),
    point.reduce((sum, val, i) => sum + val * pc2[i], 0)
  ]);
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

  // Calculate both 1D and 2D positions
  const responsePositions1D = results.map(result => {
    const [forceA, forceB] = result.magneticForce;
    return [Math.tanh((forceB - forceA) * 2), 0];
  });

  // Use PCA for 2D vector space visualization
  const allEmbeddings = [...normalizedResponseEmbeddings, ...normalizedCategoryEmbeddings];
  const reducedData = simplePCA(allEmbeddings);
  
  // Improve scaling to better distribute points
  const scaleData = (points) => {
    const maxAbsX = Math.max(...points.map(p => Math.abs(p[0])));
    const maxAbsY = Math.max(...points.map(p => Math.abs(p[1])));
    const scale = Math.max(maxAbsX, maxAbsY) * 1.2; // Add 20% margin
    
    return points.map(point => [
      point[0] / scale,
      point[1] / scale
    ]);
  };

  const scaledData = scaleData(reducedData);
  
  // Split the scaled data
  const responsePositions2D = scaledData.slice(0, responses.length);
  const categoryPositions2D = scaledData.slice(responses.length);

  // Add classification info to results
  results.forEach((result, idx) => {
    const [x, y] = responsePositions2D[idx];
    result.position = [x, y];
    result.similarity = result.magneticForce;
  });

  return {
    results,
    reducedEmbeddings: {
      responses: responsePositions1D,
      categories: [[-1, 0], [1, 0]],
      vectorSpace: {
        responses: responsePositions2D,
        categories: categoryPositions2D
      }
    }
  };
}
