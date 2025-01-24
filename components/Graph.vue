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

onMounted(() => {
  drawLinearGraph();
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
