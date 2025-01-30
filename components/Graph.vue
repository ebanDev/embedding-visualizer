<template>
  <div class="w-full min-h-[180px] bg-white border border-slate-200 rounded-lg p-2">
    <div class="flex justify-between items-center mb-2">
      <span class="text-sm font-medium">{{ title }}</span>
      <div class="flex gap-2">
        <span class="text-xs text-gray-500">Spread: {{ spreadFactor.toFixed(1) }}x</span>
        <UButton
          icon="i-lucide-minus"
          color="gray"
          variant="ghost"
          size="xs"
          :disabled="spreadFactor <= 0.5"
          @click="updateSpread(-0.5)"
        />
        <UButton
          icon="i-lucide-plus"
          color="gray"
          variant="ghost"
          size="xs"
          :disabled="spreadFactor >= 3"
          @click="updateSpread(0.5)"
        />
        <UButton
          icon="i-lucide-zoom-in"
          color="gray"
          variant="ghost"
          size="xs"
          @click="resetZoom"
        />
      </div>
    </div>
    <div ref="linearGraphRef"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, defineProps, defineEmits, watch } from 'vue'
import * as d3 from "d3"

const props = defineProps({
  responses: Array,
  categories: Array,
  embeddings: Object,
  initialSpread: {
    type: Number,
    default: 1
  },
  title: {
    type: String,
    default: 'Classification'
  }
})

const emit = defineEmits(['update:spread'])
const spreadFactor = ref(props.initialSpread)

function updateSpread(delta) {
  const newSpread = Math.max(0.5, Math.min(3, spreadFactor.value + delta))
  if (newSpread !== spreadFactor.value) {
    spreadFactor.value = newSpread // Update local state first
    emit('update:spread', newSpread) // Then emit
  }
}

// Update the watch section to watch for both spread and embedding changes
watch(
  [
    () => props.embeddings,
    () => spreadFactor.value
  ],
  () => {
    drawLinearGraph()
  },
  { deep: true }
)

const linearGraphRef = ref(null)
const graphTitle = ref('')

const drawLinearGraph = () => {
  d3.select(linearGraphRef.value).selectAll("*").remove();
  
  const { responses, embeddings, categories } = props;
  const { responses: responsePoints } = embeddings;

  // Get the container width
  const containerWidth = linearGraphRef.value.clientWidth;
  const margin = { top: 30, right: 20, bottom: 30, left: 20 };
  const width = containerWidth - margin.left - margin.right;
  const height = 120;

  // Create the SVG container
  const svg = d3.select(linearGraphRef.value)
    .append("svg")
    .attr("width", "100%")
    .attr("height", height + margin.top + margin.bottom)
    .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)

  // Add zoom behavior
  const zoom = d3.zoom()
    .scaleExtent([0.5, 5])
    .translateExtent([[margin.left, 0], [width + margin.right, height + margin.top + margin.bottom]])
    .on("zoom", (event) => {
      // Only apply scale transform, ignore translation
      mainGroup.attr("transform", `scale(${event.transform.k}, 1)`);
      
      // Update point sizes based on zoom level
      mainGroup.selectAll("circle.response")
        .attr("r", 6 / Math.sqrt(event.transform.k));
    });

  svg.call(zoom);

  // Main group for zooming
  const mainGroup = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Create scale for single axis
  const xScale = d3.scalePow()
    .exponent(1 / (spreadFactor.value * 2 + 1)) // Inverse the exponent here too
    .domain([-1, 1])
    .range([0, width]);

  // Create axis with ticks
  const xAxis = d3.axisBottom(xScale)
    .tickSize(10)
    .tickFormat(d3.format(".1f"))
    .ticks(10);

  // Add main axis

  mainGroup.append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0,${height/2})`)
    .call(xAxis)
    .call(g => g.select(".domain").attr("stroke", "#000").attr("stroke-width", 2));

  // Add axis labels using categories with dynamic text sizing and wrapping
  const addAxisLabel = (text, x, anchor) => {
    const MAX_LENGTH = 40; // characters before wrapping
    const words = text.split(' ');
    let lines = [''];
    let currentLine = 0;
    
    words.forEach(word => {
      if ((lines[currentLine] + ' ' + word).length > MAX_LENGTH) {
        currentLine++;
        lines[currentLine] = '';
      }
      lines[currentLine] = (lines[currentLine] + ' ' + word).trim();
    });

    const fontSize = Math.min(12, 180 / text.length); // Reduce font size for long text

    const label = mainGroup.append("g")
      .attr("class", "axis-label");

    lines.forEach((line, i) => {
      label.append("text")
        .attr("x", x)
        .attr("y", height/2 - 20 - (lines.length - 1 - i) * fontSize)
        .attr("text-anchor", anchor)
        .attr("font-weight", "bold")
        .attr("font-size", `${fontSize}px`)
        .text(line);
    });
  };

  // Add the labels
  addAxisLabel(categories[0], 0, "start");
  addAxisLabel(categories[1], width, "end");

  // Add minor grid lines
  mainGroup.append("g")
    .attr("class", "grid")
    .attr("transform", `translate(0,${height/2})`)
    .call(d3.axisBottom(xScale)
      .tickSize(5)
      .tickFormat("")
      .ticks(20));

  // Plot response points with hover effects
  mainGroup.selectAll("circle.response")
    .data(responsePoints)
    .enter()
    .append("circle")
    .attr("class", "response")
    .attr("cx", d => xScale(d[0]))
    .attr("cy", height/2)
    .attr("r", 6)  // Initial size
    .attr("fill", "#333")
    .on("mouseover", function(event, d) {
      const circle = d3.select(this);
      const currentZoom = d3.zoomTransform(svg.node()).k;
      circle.attr("r", 8 / Math.sqrt(currentZoom));
      
      const xValue = d[0].toFixed(3);
      mainGroup.append("text")
        .attr("class", "hover-label")
        .attr("x", xScale(d[0]))
        .attr("y", height/2 - 25)
        .attr("text-anchor", "middle")
        .attr("font-size", "12px")
        .text(`${responses[responsePoints.indexOf(d)]} (${xValue})`);
    })
    .on("mouseout", function() {
      const currentZoom = d3.zoomTransform(svg.node()).k;
      d3.select(this).attr("r", 6 / Math.sqrt(currentZoom));
      mainGroup.selectAll(".hover-label").remove();
    });
}

const resetZoom = () => {
  d3.select(linearGraphRef.value)
    .select("svg")
    .transition()
    .duration(750)
    .call(
      d3.zoom().transform,
      d3.zoomIdentity
    );
}

onMounted(() => {
  drawLinearGraph();
  window.addEventListener('resize', drawLinearGraph);
});

onUnmounted(() => {
  window.removeEventListener('resize', drawLinearGraph);
});
</script>

<style>
/* Keep only D3.js specific styles */
.x-axis path {
  stroke: #0f172a;
}

.x-axis .tick line {
  stroke: #0f172a;
}

.x-axis text {
  font-size: 12px;
}

.grid .tick line {
  stroke: #e2e8f0;
  stroke-dasharray: 2,2;
}

.hover-label {
  font-size: 12px;
  pointer-events: none;
}

.response {
  transition: all 0.2s;
  cursor: pointer;
}

.response:hover {
  opacity: 1;
  stroke-width: 3;
}

.zoom-controls {
  position: absolute;
  top: 10px;
  right: 10px;
}

svg {
  cursor: grab;
}

svg:active {
  cursor: grabbing;
}

/* Add style for axis labels */
.axis-label {
  opacity: 0.8;
}

.axis-label:hover {
  opacity: 1;
}
</style>
