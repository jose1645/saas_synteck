import { useEffect, useState } from 'react';
import { AreaChart } from "@tremor/react";

export default function TimeSeriesWidget({ visibleLines }) {
  const [chartdata, setChartdata] = useState([]);

  useEffect(() => {
    const initialData = Array.from({ length: 30 }).map((_, i) => ({
      time: `${10 + i}:00`,
      Fase_A: 440 + Math.random() * 8,
      Fase_B: 432 + Math.random() * 8,
      Fase_C: 445 + Math.random() * 8,
    }));
    setChartdata(initialData);
  }, []);

  // Filtramos las categorías y colores según lo que el usuario marcó
  const categories = Object.keys(visibleLines).filter(key => visibleLines[key]);
  
  // Mapeo manual de colores para asegurar el contraste
  const colorMap = {
    Fase_A: "cyan",
    Fase_B: "amber",
    Fase_C: "rose"
  };
  const activeColors = categories.map(cat => colorMap[cat]);

  return (
    <div className="w-full h-full flex flex-col">
      <style>{`
        .recharts-cartesian-axis-tick text {
          fill: #FFFFFF !important;
          font-size: 14px !important;
          font-weight: 900 !important;
        }
        /* Esto fuerza el grosor de las líneas para que se vean bien */
        .recharts-area-path {
          stroke-width: 3px !important;
        }
      `}</style>

      <AreaChart
        className="h-[480px] w-full"
        data={chartdata}
        index="time"
        categories={categories} // Solo las seleccionadas
        colors={activeColors}   // Solo los colores de las seleccionadas
        showLegend={false}      // Quitamos la leyenda de Tremor porque ya tenemos nuestros Checkboxes
        showYAxis={true}
        yAxisWidth={70}
        showGridLines={true}
        curveType="monotone"
        animationDuration={1000}
        valueFormatter={(v) => `${v.toFixed(1)} V`}
      />
    </div>
  );
}