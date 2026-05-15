import { useEffect, useRef } from "react";
import { createChart, LineSeries } from "lightweight-charts";

function toChartPoints(series) {
  return (series || []).map((point) => ({
    time: Math.floor(new Date(point.time).getTime() / 1000),
    value: point.value,
  }));
}

function buildLevelSeries(series, value) {
  if (!Array.isArray(series) || !series.length || !Number.isFinite(Number(value))) {
    return [];
  }

  return series.map((point) => ({
    time: Math.floor(new Date(point.time).getTime() / 1000),
    value: Number(value),
  }));
}

export default function Chart({ priceSeries, ema8Series, ema21Series, plan }) {
  const chartRef = useRef(null);

  useEffect(() => {
    if (!chartRef.current || !priceSeries?.length) {
      return undefined;
    }

    const chart = createChart(chartRef.current, {
      width: chartRef.current.clientWidth,
      height: 320,
      layout: {
        background: { color: "#0b1018" },
        textColor: "#8da2c8",
      },
      grid: {
        vertLines: { color: "rgba(116, 132, 171, 0.12)" },
        horzLines: { color: "rgba(116, 132, 171, 0.12)" },
      },
      rightPriceScale: {
        borderColor: "rgba(116, 132, 171, 0.16)",
      },
      timeScale: {
        borderColor: "rgba(116, 132, 171, 0.16)",
        timeVisible: true,
      },
    });

    const priceLine = chart.addSeries(LineSeries, {
      color: "#4a8bff",
      lineWidth: 2,
    });
    const ema8Line = chart.addSeries(LineSeries, {
      color: "#00d46a",
      lineWidth: 2,
    });
    const ema21Line = chart.addSeries(LineSeries, {
      color: "#ff6a6a",
      lineWidth: 2,
    });
    const supportLine = chart.addSeries(LineSeries, {
      color: "rgba(0, 212, 106, 0.55)",
      lineWidth: 1,
    });
    const resistanceLine = chart.addSeries(LineSeries, {
      color: "rgba(255, 191, 105, 0.75)",
      lineWidth: 1,
    });
    const stopLine = chart.addSeries(LineSeries, {
      color: "#ff6a6a",
      lineWidth: 2,
    });
    const targetLine = chart.addSeries(LineSeries, {
      color: "#8aafff",
      lineWidth: 2,
    });

    priceLine.setData(toChartPoints(priceSeries));
    ema8Line.setData(toChartPoints(ema8Series));
    ema21Line.setData(toChartPoints(ema21Series));
    supportLine.setData(buildLevelSeries(priceSeries, plan?.support));
    resistanceLine.setData(buildLevelSeries(priceSeries, plan?.resistance));
    stopLine.setData(buildLevelSeries(priceSeries, plan?.stopPrice));
    targetLine.setData(buildLevelSeries(priceSeries, plan?.targetPrice));
    chart.timeScale().fitContent();

    const resizeObserver = new ResizeObserver((entries) => {
      const nextWidth = entries[0]?.contentRect?.width;
      if (nextWidth) {
        chart.applyOptions({ width: nextWidth });
      }
    });

    resizeObserver.observe(chartRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
    };
  }, [priceSeries, ema8Series, ema21Series, plan]);

  return <div className="chartSurface" ref={chartRef} />;
}
