import { useEffect, useMemo, useRef } from "react";
import { createChart, LineSeries } from "lightweight-charts";

function toChartPoints(series) {
  return (series || [])
    .filter((point) => point.value != null && Number.isFinite(point.value))
    .map((point) => ({
      time: point.time,
      value: point.value,
    }));
}

export function buildPriceHistoryPoints(item, horizonYears = 3) {
  const now = new Date();
  const retail = Number(item.retailPrice) || Number(item.price) || 0;
  const current = Number(item.currentMarketValue) || retail;
  const projected = Number(item.projectedFutureValue) || current * 1.2;
  const totalMonths = horizonYears * 12;
  const pastMonths = Math.round(totalMonths * 0.55);
  const futureMonths = totalMonths - pastMonths;
  const points = [];

  for (let i = -pastMonths; i <= futureMonths; i += 1) {
    const date = new Date(now);
    date.setMonth(date.getMonth() + i);
    const time = date.toISOString().slice(0, 10);
    const pastProgress = pastMonths ? (i + pastMonths) / pastMonths : 1;
    const futureProgress = futureMonths && i > 0 ? i / futureMonths : 0;
    const market =
      i <= 0
        ? retail + (current - retail) * pastProgress
        : current + (projected - current) * futureProgress;
    const forecast = i > 0 ? market : null;

    points.push({
      time,
      retail,
      market,
      forecast,
    });
  }

  return points;
}

export function InvestmentAnalysisChart({ item, horizonYears = 3 }) {
  const chartRef = useRef(null);
  const points = useMemo(() => buildPriceHistoryPoints(item, horizonYears), [item, horizonYears]);

  useEffect(() => {
    if (!chartRef.current || !points.length) {
      return undefined;
    }

    const chart = createChart(chartRef.current, {
      width: chartRef.current.clientWidth,
      height: 340,
      layout: {
        background: { color: "transparent" },
        textColor: "#8da2c8",
      },
      grid: {
        vertLines: { color: "rgba(116, 132, 171, 0.1)" },
        horzLines: { color: "rgba(116, 132, 171, 0.1)" },
      },
      rightPriceScale: {
        borderColor: "rgba(116, 132, 171, 0.14)",
      },
      timeScale: {
        borderColor: "rgba(116, 132, 171, 0.14)",
        timeVisible: true,
      },
    });

    const retailLine = chart.addSeries(LineSeries, {
      color: "rgba(154, 164, 184, 0.7)",
      lineWidth: 1,
      lineStyle: 2,
    });
    const marketLine = chart.addSeries(LineSeries, {
      color: "#5b6cff",
      lineWidth: 2,
    });
    const forecastLine = chart.addSeries(LineSeries, {
      color: "#c9a962",
      lineWidth: 2,
      lineStyle: 2,
    });

    retailLine.setData(
      toChartPoints(points.map((point) => ({ time: point.time, value: point.retail }))),
    );
    marketLine.setData(
      toChartPoints(points.map((point) => ({ time: point.time, value: point.market }))),
    );
    forecastLine.setData(
      toChartPoints(
        points
          .filter((point) => point.forecast != null)
          .map((point) => ({ time: point.time, value: point.forecast })),
      ),
    );
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
  }, [horizonYears, item, points]);

  return (
    <div className="iaChartWrap">
      <div className="iaChartLegend">
        <span className="iaChartLegendItem iaChartLegendItem-retail">Retail</span>
        <span className="iaChartLegendItem iaChartLegendItem-market">Market Value</span>
        <span className="iaChartLegendItem iaChartLegendItem-forecast">Forecast</span>
      </div>
      <div className="iaChartSurface" ref={chartRef} />
    </div>
  );
}
