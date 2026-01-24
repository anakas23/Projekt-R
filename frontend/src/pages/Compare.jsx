import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";

import { items, latestPrices, restaurantOptions } from "../mocks/compareData";
import { trendRows } from "../mocks/trends";
import "./compare.css";

const colors = {
  "Campus Café": "#ef4444",
  "Student Union Grill": "#f59e0b",
  "The Green Bean": "#3b82f6",
  "Coffee Corner": "#10b981",
  "Pizza Palace": "#8b5cf6",
  "Burger Hub": "#64748b",
};

function Compare() {
  const [selectedItem, setSelectedItem] = useState("Cappuccino");
  const [chartType, setChartType] = useState("line");
  const [selectedRestaurants, setSelectedRestaurants] = useState([1, 2, 3, 5]);

  function toggleRestaurant(id) {
    setSelectedRestaurants((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  const selectedNames = useMemo(() => {
    return restaurantOptions
      .filter((r) => selectedRestaurants.includes(r.id))
      .map((r) => r.name);
  }, [selectedRestaurants]);

  const chartLabel = chartType === "line" ? "Linijski graf" : "Stupčasti graf";

  return (
    <div className="compare-page">
      <div className="compare-header">
        <h1>Usporedba cijena i trendovi</h1>
        <p>Usporedite cijene i pratite promjene kroz vrijeme za različite restorane</p>
      </div>

      <div className="compare-controls">
        <div className="controls-top">
          <div className="field">
            <label>Odaberi artikl</label>
            <select value={selectedItem} onChange={(e) => setSelectedItem(e.target.value)}>
              {items.map((it) => (
                <option key={it} value={it}>
                  {it}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>Vrsta grafa</label>
            <div className="segmented">
              <button
                type="button"
                className={chartType === "line" ? "seg active" : "seg"}
                onClick={() => setChartType("line")}
                aria-label="Prikaži linijski graf"
                title="Linijski graf"
              >
                Linijski graf
              </button>
              <button
                type="button"
                className={chartType === "bar" ? "seg active" : "seg"}
                onClick={() => setChartType("bar")}
                aria-label="Prikaži stupčasti graf"
                title="Stupčasti graf"
              >
                Stupčasti graf
              </button>
            </div>
          </div>
        </div>

        <div className="controls-bottom">
          <label className="section-label">Odaberi restorane za usporedbu</label>

          <div className="restaurant-picks">
            {restaurantOptions.map((r) => {
              const active = selectedRestaurants.includes(r.id);
              return (
                <button
                  key={r.id}
                  type="button"
                  className={active ? "pick active" : "pick"}
                  onClick={() => toggleRestaurant(r.id)}
                >
                  <span
                    className="dot"
                    style={{ background: active ? colors[r.name] : "#d1d5db" }}
                  />
                  {r.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="chart-card">
        <div className="chart-title">
          <h2>Trend cijena za: {selectedItem}</h2>
          <p>
            Uspoređuje se {selectedRestaurants.length} objekt(a) • {chartLabel}
          </p>
        </div>

        <div className="chart-area">
          <ResponsiveContainer width="100%" height={320}>
            {chartType === "line" ? (
              <LineChart
                data={trendRows}
                margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                {selectedNames.map((name) => (
                  <Line
                    key={name}
                    type="monotone"
                    dataKey={name}
                    connectNulls
                    dot={{ r: 3 }}
                    stroke={colors[name]}
                  />
                ))}
              </LineChart>
            ) : (
              <BarChart
                data={trendRows}
                margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                {selectedNames.map((name) => (
                  <Bar key={name} dataKey={name} fill={colors[name]} />
                ))}
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      <div className="latest-card">
        <h2>Najnovije cijene</h2>
        <div className="latest-grid">
          {latestPrices.map((p) => (
            <div key={p.restaurant} className={`latest-box ${p.color}`}>
              <div className="latest-name">{p.restaurant}</div>
              <div className="latest-price">€{p.price.toFixed(2)}</div>
              <div className="latest-date">Ažurirano {p.updated}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Compare;