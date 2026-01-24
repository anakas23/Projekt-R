import { useMemo, useState } from "react";
import { restaurants as data } from "../mocks/restaurants";
import RestaurantCard from "../components/RestaurantCard";
import "./restaurants.css";

function Restaurants() {
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("Svi gradovi");
  const [type, setType] = useState("Sve vrste");

  const cities = useMemo(() => {
    const set = new Set(data.map((r) => r.city));
    return ["Svi gradovi", ...Array.from(set)];
  }, []);

  const types = useMemo(() => {
    const set = new Set(data.map((r) => r.type));
    return ["Sve vrste", ...Array.from(set)];
  }, []);

  const filtered = useMemo(() => {
    return data.filter((r) => {
      const matchesQuery =
        r.name.toLowerCase().includes(query.toLowerCase()) ||
        r.address.toLowerCase().includes(query.toLowerCase());

      const matchesCity = city === "Svi gradovi" ? true : r.city === city;
      const matchesType = type === "Sve vrste" ? true : r.type === type;

      return matchesQuery && matchesCity && matchesType;
    });
  }, [query, city, type]);

  return (
    <div className="restaurants-page">
      <div className="restaurants-header">
        <h1>Restorani i kafići</h1>
        <p>Pregled i usporedba cijena prema različitim lokacijama</p>
      </div>

      <div className="filters">
        <div className="field">
          <label>Pretraživanje</label>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pretraži restorane..."
          />
        </div>

        <div className="field">
          <label>Grad</label>
          <select value={city} onChange={(e) => setCity(e.target.value)}>
            {cities.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="field">
          <label>Vrsta</label>
          <select value={type} onChange={(e) => setType(e.target.value)}>
            {types.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="count">
        Prikazano {filtered.length} od {data.length} objekata
      </div>

      <div className="cards-grid">
        {filtered.map((r) => (
          <RestaurantCard key={r.id} restaurant={r} />
        ))}
      </div>
    </div>
  );
}

export default Restaurants;