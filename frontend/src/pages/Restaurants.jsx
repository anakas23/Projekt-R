import { useMemo, useState } from "react";
import { restaurants as data } from "../mocks/restaurants";
import RestaurantCard from "../components/RestaurantCard";
import "./restaurants.css";

export default function Restaurants() {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return data.filter((r) => {
      if (!q) return true;

      const matchesRestaurant = r.name.toLowerCase().includes(q);

      const matchesItem = r.items?.some((item) =>
        item.name.toLowerCase().includes(q)
      );

      return matchesRestaurant || matchesItem;
    });
  }, [query]);

  return (
    <div className="rsr-page">
      <div className="rsr-shell">
        {/* Header */}
        <div className="rsr-topbar">
          <div>
            <h1 className="rsr-title">Restorani</h1>
            <div className="rsr-subtitle">
              Pretraživanje po jelima i restoranima
            </div>
          </div>

          <div className="rsr-chip">
            Prikazano <b>{filtered.length}</b> / {data.length}
          </div>
        </div>

        {/* Search */}
        <div className="rsr-card rsr-search-card">
          <div className="rsr-search-head">
            <div>
              <h2 className="rsr-h2">Pretraži jelovnik</h2>
              <div className="rsr-note">
                Npr. burger, pizza, ramen, cola…
              </div>
            </div>

            <input
              className="rsr-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Upiši naziv jela ili restorana"
            />
          </div>
        </div>

        {/* Results */}
        <div className="rsr-grid">
          {filtered.map((r) => (
            <div key={r.id} className="rsr-card rsr-card-hover">
              <RestaurantCard restaurant={r} highlight={query} />
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="rsr-empty">
            Nema restorana koji sadrže “{query}”.
          </div>
        )}
      </div>
    </div>
  );
}
