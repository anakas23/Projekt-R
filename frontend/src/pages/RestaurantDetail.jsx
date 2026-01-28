import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./restaurantDetail.css";

const API_BASE = "http://localhost:8000/api";

function RestaurantDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRestaurant = async () => {
      try {
        const formData = new FormData();
        formData.append("rest_id", id);

        const res = await fetch(`${API_BASE}/restbyud/`, {
          method: "POST",
          body: formData,
        });

        if (!res.ok) throw new Error("Greška pri dohvaćanju restorana");

        const json = await res.json();
        const r = json.items?.[0];

        if (!r) throw new Error("Restoran nije pronađen");

        setRestaurant({
          id: r.rest_id,
          name: r.name,
          address: r.location,
          type: r.type,
          city: r.quarter,
        });
      } catch (e) {
        console.error(e);
        setError("Ne mogu dohvatiti podatke o objektu.");
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurant();
  }, [id]);

  if (loading) return <p>Učitavanje...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div className="restaurant-detail-page">
      <button className="back-btn" onClick={() => navigate(-1)}>
        ← Povratak na restorane
      </button>

      <div className="detail-card">
        <h1>{restaurant.name}</h1>
        <p className="detail-meta">
          📍 {restaurant.address} · {restaurant.type} · {restaurant.city}
        </p>
      </div>

      {/* OVDJE IDE IDUĆE:
          - tablica artikala
          - graf cijena
          - dojave */}
    </div>
  );
}

export default RestaurantDetail;
