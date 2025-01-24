<template>
  <div>
    <div ref="linearGraphRef" class="graph-container"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, defineProps } from 'vue'
import * as d3 from "d3"

const props = defineProps({
  responses: Array,
  categories: Array,
  embeddings: Object,
})

const linearGraphRef = ref(null)
const vectorGraphRef = ref(null)

const drawLinearGraph = () => {
  d3.select(linearGraphRef.value).selectAll("*").remove();
  
  const { responses, embeddings } = props;
  const { responses: responsePoints } = embeddings;

  const margin = { top: 50, right: 200, bottom: 50, left: 200 };
  const width = 1000 - margin.left - margin.right;
  const height = 100; // Reduced height since we don't need vertical space

  const svg = d3.select(linearGraphRef.value)
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Create scale for single axis
  const xScale = d3.scalePow()
    .exponent(0.5)  // This helps spread out clustered points
    .domain([-1, 1])
    .range([0, width]);

  // Create axis with ticks every 0.2
  const xAxis = d3.axisBottom(xScale)
    .tickSize(10)
    .tickFormat(d3.format(".1f"))
    .ticks(10);

  // Add main axis
  svg.append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0,${height/2})`)
    .call(xAxis)
    .call(g => g.select(".domain").attr("stroke", "#000").attr("stroke-width", 2));

  // Add axis labels
  svg.append("text")
    .attr("x", 0)
    .attr("y", height/2 - 20)
    .attr("text-anchor", "middle")
    .attr("font-weight", "bold")
    .text("Altruiste");

  svg.append("text")
    .attr("x", width)
    .attr("y", height/2 - 20)
    .attr("text-anchor", "middle")
    .attr("font-weight", "bold")
    .text("Égoïste");

  // Add minor grid lines
  svg.append("g")
    .attr("class", "grid")
    .attr("transform", `translate(0,${height/2})`)
    .call(d3.axisBottom(xScale)
      .tickSize(5)
      .tickFormat("")
      .ticks(20));

  // Plot response points with hover effects
  svg.selectAll("circle.response")
    .data(responsePoints)
    .enter()
    .append("circle")
    .attr("class", "response")
    .attr("cx", d => xScale(d[0]))
    .attr("cy", height/2)
    .attr("r", 6)
    .attr("fill", "#333")
    .on("mouseover", function(event, d) {
      const circle = d3.select(this);
      circle.attr("r", 8);
      
      const xValue = d[0].toFixed(3);
      svg.append("text")
        .attr("class", "hover-label")
        .attr("x", xScale(d[0]))
        .attr("y", height/2 - 25)
        .attr("text-anchor", "middle")
        .attr("font-size", "12px")
        .text(`${responses[responsePoints.indexOf(d)]} (${xValue})`);
    })
    .on("mouseout", function() {
      d3.select(this).attr("r", 6);
      svg.selectAll(".hover-label").remove();
    });
}

const drawVectorGraph = () => {
  d3.select(vectorGraphRef.value).selectAll("*").remove();
  
  const { responses, embeddings } = props;
  const { vectorSpace } = props.embeddings;
  const { responses: vectorPoints, categories: categoryPoints } = vectorSpace;

  const margin = { top: 50, right: 50, bottom: 50, left: 50 };
  const width = 600 - margin.left - margin.right;
  const height = 600 - margin.top - margin.bottom;

  const svg = d3.select(vectorGraphRef.value)
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Adjust scale padding and domain
  const padding = 0.2; // Increase padding to 20%
  const domain = [-1 - padding, 1 + padding];

  // Create scales for vector space with equal aspect ratio
  const xScale = d3.scaleLinear()
    .domain(domain)
    .range([0, width]);
  
  const yScale = d3.scaleLinear()
    .domain(domain) // Use same domain for both axes
    .range([height, 0]);

  // Update color scale
  const colorScale = d3.scaleSequential(d3.interpolateRdBu)
    .domain([1, -1]); // Reverse domain for red-blue scale

  // Draw coordinate system
  svg.append("line")
    .attr("class", "axis")
    .attr("x1", 0)
    .attr("y1", height/2)
    .attr("x2", width)
    .attr("y2", height/2)
    .attr("stroke", "#000");

  svg.append("line")
    .attr("class", "axis")
    .attr("x1", width/2)
    .attr("y1", 0)
    .attr("x2", width/2)
    .attr("y2", height)
    .attr("stroke", "#000");

  // Add grid
  const grid = svg.append("g").attr("class", "grid");
  
  // Vertical grid
  grid.selectAll("line.vertical")
    .data(d3.range(-1, 1.1, 0.2))
    .enter()
    .append("line")
    .attr("class", "grid-line")
    .attr("x1", d => xScale(d))
    .attr("x2", d => xScale(d))
    .attr("y1", 0)
    .attr("y2", height);

  // Horizontal grid
  grid.selectAll("line.horizontal")
    .data(d3.range(-1, 1.1, 0.2))
    .enter()
    .append("line")
    .attr("class", "grid-line")
    .attr("x1", 0)
    .attr("x2", width)
    .attr("y1", d => yScale(d))
    .attr("y2", d => yScale(d));

  // Add axes labels and ticks
  const xTicks = d3.range(-1, 1.2, 0.2);
  const yTicks = d3.range(0, 1.2, 0.2);
  
  // X axis
  svg.append("g")
    .attr("transform", `translate(0,${height * 0.9})`) // Move axis lower
    .call(d3.axisBottom(xScale).tickValues(xTicks));

  // Y axis
  svg.append("g")
    .attr("transform", `translate(${width/2},0)`)
    .call(d3.axisLeft(yScale).tickValues(yTicks));

  // Plot category markers (bigger circles)
  categoryPoints.forEach((point, i) => {
    const x = xScale(point[0]);
    const y = yScale(point[1]);
    
    // Add category marker circle
    svg.append("circle")
      .attr("class", "category-marker")
      .attr("cx", x)
      .attr("cy", y)
      .attr("r", 12)
      .attr("fill", i === 0 ? "#ff6b6b" : "#4dabf7")
      .attr("opacity", 0.3);

    svg.append("text")
      .attr("x", x)
      .attr("y", y - 20)
      .attr("text-anchor", "middle")
      .attr("font-weight", "bold")
      .attr("fill", i === 0 ? "#ff6b6b" : "#4dabf7")
      .text(i === 0 ? "Altruiste" : "Égoïste");
  });

  // Plot response points with enhanced visibility
  svg.selectAll("circle.response")
    .data(vectorPoints)
    .enter()
    .append("circle")
    .attr("class", "response")
    .attr("cx", d => xScale(d[0]))
    .attr("cy", d => yScale(d[1]))
    .attr("r", 6)
    .attr("fill", d => colorScale(d[0])) // Color based on x position (left-right bias)
    .attr("opacity", 0.8)
    .attr("stroke", "#fff")
    .attr("stroke-width", 2)
    .on("mouseover", function(event, d) {
      const circle = d3.select(this);
      circle.attr("r", 8)
        .attr("opacity", 1);
      
      const coords = `(${d[0].toFixed(3)}, ${d[1].toFixed(3)})`;
      svg.append("text")
        .attr("class", "hover-label")
        .attr("x", xScale(d[0]) + 10)
        .attr("y", yScale(d[1]))
        .text(`${responses[vectorPoints.indexOf(d)]} ${coords}`);
    })
    .on("mouseout", function() {
      d3.select(this)
        .attr("r", 6)
        .attr("opacity", 0.8);
      svg.selectAll(".hover-label").remove();
    });
}

// Add arrow marker definition
const addArrowDef = (svg) => {
  svg.append("defs").append("marker")
    .attr("id", "arrow")
    .attr("viewBox", "0 -5 10 10")
    .attr("refX", 8)
    .attr("refY", 0)
    .attr("markerWidth", 6)
    .attr("markerHeight", 6)
    .attr("orient", "auto")
    .append("path")
    .attr("d", "M0,-5L10,0L0,5")
    .attr("fill", "#666");
}

onMounted(() => {
  drawLinearGraph();
  const svg = d3.select(vectorGraphRef.value).append("svg");
  addArrowDef(svg);
  drawVectorGraph();
})
</script>

<style>
.graph-container {
  margin: 20px 0;
  background: #fff;
  border: 1px solid #eee;
  border-radius: 8px;
}

.x-axis path {
  stroke: #000;
}

.x-axis .tick line {
  stroke: #000;
}

.x-axis text {
  font-size: 12px;
}

.grid .tick line {
  stroke: #ddd;
  stroke-dasharray: 2,2;
}

.grid-line {
  stroke: #eee;
  stroke-width: 1;
}

.hover-label {
  font-size: 12px;
  pointer-events: none;
}

.vector {
  opacity: 0.7;
  stroke-width: 3;
}

.category-marker {
  stroke: none;
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
</style>
