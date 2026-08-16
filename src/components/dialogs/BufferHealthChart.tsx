import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';

export interface TelemetryPoint {
  timestamp: number;
  bufferHealth: number; // in seconds
  latency: number;      // in ms
}

interface BufferHealthChartProps {
  data: TelemetryPoint[];
}

export const BufferHealthChart: React.FC<BufferHealthChartProps> = ({ data }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || data.length === 0) return;

    // Get container dimensions
    const width = containerRef.current.clientWidth || 400;
    const height = 130;
    const margin = { top: 12, right: 40, bottom: 18, left: 40 };

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clear previous drawing

    svg
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`);

    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // X scale (time sequence)
    const xScale = d3.scaleLinear()
      .domain([0, Math.max(29, data.length - 1)])
      .range([0, chartWidth]);

    // Y scale Left: Buffer Health (seconds) - typical range 0 to 10s
    const maxBuffer = data.length > 0 ? Math.max(...data.map(d => d.bufferHealth)) : 5;
    const yScaleBuffer = d3.scaleLinear()
      .domain([0, Math.max(8, maxBuffer)])
      .range([chartHeight, 0]);

    // Y scale Right: Latency (ms) - typical range 0 to 150ms
    const maxLatency = data.length > 0 ? Math.max(...data.map(d => d.latency)) : 60;
    const yScaleLatency = d3.scaleLinear()
      .domain([0, Math.max(120, maxLatency)])
      .range([chartHeight, 0]);

    // Add X Grid lines
    g.append('g')
      .attr('class', 'grid')
      .attr('transform', `translate(0,${chartHeight})`)
      .call(
        d3.axisBottom(xScale)
          .ticks(5)
          .tickSize(-chartHeight)
          .tickFormat(() => '')
      )
      .call(g => g.select('.domain').remove())
      .call(g => g.selectAll('.tick line').attr('stroke', 'rgba(255,255,255,0.04)'));

    // Add Y Grid lines (based on Buffer scale)
    g.append('g')
      .attr('class', 'grid')
      .call(
        d3.axisLeft(yScaleBuffer)
          .ticks(4)
          .tickSize(-chartWidth)
          .tickFormat(() => '')
      )
      .call(g => g.select('.domain').remove())
      .call(g => g.selectAll('.tick line').attr('stroke', 'rgba(255,255,255,0.04)'));

    // Draw Buffer Area (underneath)
    const bufferArea = d3.area<TelemetryPoint>()
      .x((d, i) => xScale(i))
      .y0(chartHeight)
      .y1(d => yScaleBuffer(d.bufferHealth))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(data)
      .attr('fill', 'url(#buffer-gradient-modal)')
      .attr('d', bufferArea);

    // Draw Buffer Line
    const bufferLine = d3.line<TelemetryPoint>()
      .x((d, i) => xScale(i))
      .y(d => yScaleBuffer(d.bufferHealth))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', '#10b981')
      .attr('stroke-width', 2)
      .attr('d', bufferLine);

    // Draw Latency Line
    const latencyLine = d3.line<TelemetryPoint>()
      .x((d, i) => xScale(i))
      .y(d => yScaleLatency(d.latency))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', '#06b6d4')
      .attr('stroke-dasharray', '2,2')
      .attr('stroke-width', 1.5)
      .attr('d', latencyLine);

    // Draw Warning Threshold Line for buffer (e.g., 2.0 seconds)
    const thresholdY = yScaleBuffer(2.0);
    g.append('line')
      .attr('x1', 0)
      .attr('y1', thresholdY)
      .attr('x2', chartWidth)
      .attr('y2', thresholdY)
      .attr('stroke', 'rgba(239, 68, 68, 0.4)')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '3,3');

    // Add Label for Threshold
    g.append('text')
      .attr('x', chartWidth - 110)
      .attr('y', thresholdY - 4)
      .attr('fill', 'rgba(239, 68, 68, 0.6)')
      .attr('font-size', '8px')
      .attr('font-family', 'monospace')
      .text('Buffer Underrun Danger (<2s)');

    // Add Left Axis (Buffer Health in seconds)
    g.append('g')
      .attr('transform', 'translate(0,0)')
      .call(d3.axisLeft(yScaleBuffer).ticks(4).tickFormat(d => `${d}s`))
      .call(g => g.select('.domain').remove())
      .call(g => g.selectAll('.tick text').attr('fill', '#10b981').attr('font-size', '8px').attr('font-family', 'monospace'));

    // Add Right Axis (Latency in ms)
    g.append('g')
      .attr('transform', `translate(${chartWidth},0)`)
      .call(d3.axisRight(yScaleLatency).ticks(4).tickFormat(d => `${d}ms`))
      .call(g => g.select('.domain').remove())
      .call(g => g.selectAll('.tick text').attr('fill', '#06b6d4').attr('font-size', '8px').attr('font-family', 'monospace'));

    // Add gradients definition to the SVG
    const defs = svg.append('defs');
    const linearGradient = defs.append('linearGradient')
      .attr('id', 'buffer-gradient-modal')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');

    linearGradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#10b981')
      .attr('stop-opacity', 0.22);

    linearGradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#10b981')
      .attr('stop-opacity', 0.0);

  }, [data]);

  return (
    <div ref={containerRef} className="w-full h-[130px] bg-[#0c0f16]/90 rounded-xl border border-white/5 p-1 relative overflow-hidden">
      <svg ref={svgRef} className="overflow-visible" />
      {data.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-white/30">
          Syncing with WebAudio streams...
        </div>
      )}
    </div>
  );
};
