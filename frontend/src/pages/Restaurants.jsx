import { useEffect, useMemo, useState } from "react";
import RestaurantCard from "../components/RestaurantCard";
import "./restaurants.css";

const isDevelopment = import.meta.env.MODE === "development";
const API_BASE = isDevelopment ? "http://localhost:8000/api" : "https://projekt-r-lvfd.onrender.com/api";

function Restaurants() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [query, setQuery] = useState("");
  const [city, setCity] = useState("Svi kvartovi");
  const [type, setType] = useState("Sve vrste");

  // FETCH RESTORANA S BACKENDA
  useEffect(() => {
    const fetchRestaurants = async () => {
      try {
        const res = await fetch(`${API_BASE}/restaurants/`);
        if (!res.ok) throw new Error("Greška pri dohvaćanju restorana");

        const json = await res.json();

        //  MAPIRANJE BACKEND → FRONTEND SHAPE
        const mapped = (json.items || []).map((r) => ({
          id: r.rest_id,
          name: r.name,
          address: r.location,
          city: r.quarter, // privremeno quarter → city
          type: r.type,
        }));

        setData(mapped);
      } catch (err) {
        console.error(err);
        setError("Ne mogu dohvatiti restorane.");
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurants();
  }, []);

  //  FILTERI 
  const cities = useMemo(() => {
    const set = new Set(
      data
        .map((r) => r.city)
        .filter((c) => c && c.trim() !== "")
    );

    return ["Svi kvartovi", ...Array.from(set)];
  }, [data]);


  const types = useMemo(() => {
    const set = new Set(data.map((r) => r.type));
    return ["Sve vrste", ...Array.from(set)];
  }, [data]);

  const filtered = useMemo(() => {
    return data.filter((r) => {
      const matchesQuery =
        r.name.toLowerCase().includes(query.toLowerCase()) ||
        r.address.toLowerCase().includes(query.toLowerCase());

      const matchesCity = city === "Svi kvartovi" ? true : r.city === city;
      const matchesType = type === "Sve vrste" ? true : r.type === type;

      return matchesQuery && matchesCity && matchesType;
    });
  }, [data, query, city, type]);

  // STATES
  if (loading) return <p>Učitavanje restorana...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div className="restaurants-page">
      <div className="restaurants-header">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1>Restorani</h1>
            <p>Pregled jelovnika i lokacije restorana</p>
          </div>

          <a
            href="https://docs.google.com/forms/d/1Hl9AXhpQfy6R63L_YUgwwvAzd_GALLl9ETFa5k7boU0/viewform?edit_requested=true"
            target="_blank"
            rel="noopener noreferrer"
            className="report-price-btn"
          >
            Prijavi pogrešnu cijenu
          </a>
        </div>
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
          <label>Kvart</label>
          <select value={city} onChange={(e) => setCity(e.target.value)}>
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label>Vrsta</label>
          <select value={type} onChange={(e) => setType(e.target.value)}>
            {types.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
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
