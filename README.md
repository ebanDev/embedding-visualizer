# Embedding Visualizer

Interactive visualization tool for analyzing text embeddings and their classifications using OpenAI's embedding API.

## Features

- Text response classification between two categories (altruistic vs. egoistic)
- Interactive 1D linear visualization
- Real-time response classification
- Secure API key management

## Setup

1. Clone the repository
2. Install dependencies:
```bash
npm install
```
3. Run the development server:
```bash
bun run dev
```

## Usage

1. Enter your OpenAI API key (it will be stored securely in cookies)
2. The default question is about how one would spend 10,000€
3. Responses are automatically classified and visualized in a linear scale from altruistic to egoistic

## Technical Details

- Built with Nuxt 3
- Uses OpenAI's text-embedding-3-small model
- Visualizations created with D3.js
- PCA implementation for dimensionality reduction
- Cosine similarity for response classification

## Security

- API keys are stored in secure, HTTPS-only cookies
- No server-side storage of API keys
- Client-side only implementation

## License

AGPL-3.0
