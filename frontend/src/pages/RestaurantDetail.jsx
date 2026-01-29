import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import "./restaurantDetail.css";

const API_BASE = "http://localhost:8000/api";
const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

/* ========= LOAD GOOGLE MAPS ONCE ========= */
function loadGoogleMaps() {
  return new Promise((resolve) => {
    if (window.google && window.google.maps) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}&libraries=places,geometry`;
    script.async = true;
    script.onload = resolve;

    document.head.appendChild(script);
  });
}

function RestaurantDetail() {
  const { id } = useParams();

  const [restaurant, setRestaurant] = useState(null);
  const [items, setItems] = useState([]);

  const mapRef = useRef(null);
  const map = useRef(null);
  const directionsService = useRef(null);
  const directionsRenderer = useRef(null);
  const userLocation = useRef(null);

  /* ========= FETCH BACKEND DATA ========= */
  useEffect(() => {
    const fetchData = async () => {
      const restRes = await fetch(`${API_BASE}/restaurants/`);
      const restJson = await restRes.json();

      const found = restJson.items.find(
        (r) => String(r.rest_id) === String(id)
      );
      setRestaurant(found);

      const itemsRes = await fetch(
        `${API_BASE}/fetch-items-prices/?rest_id=${id}`
      );
      const itemsJson = await itemsRes.json();
      setItems(itemsJson.items || []);
    };

    fetchData();
  }, [id]);

  /* ========= INIT MAP (AFTER GOOGLE LOADED) ========= */
  useEffect(() => {
    if (!restaurant || !mapRef.current) return;

    loadGoogleMaps().then(() => {
      map.current = new window.google.maps.Map(mapRef.current, {
        center: { lat: 45.815, lng: 15.9819 },
        zoom: 14,
      });

      directionsService.current =
        new window.google.maps.DirectionsService();
      directionsRenderer.current =
        new window.google.maps.DirectionsRenderer({
          map: map.current,
        });

      navigator.geolocation.getCurrentPosition((pos) => {
        userLocation.current = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
      });
    });
  }, [restaurant]);

  /* ========= FIND ROUTE ========= */
  const findRoute = () => {
    if (!userLocation.current) return;

    const geocoder = new window.google.maps.Geocoder();

    geocoder.geocode(
      { address: restaurant.location },
      (results, status) => {
        if (status !== "OK") return;

        directionsService.current.route(
          {
            origin: userLocation.current,
            destination: results[0].geometry.location,
            travelMode: window.google.maps.TravelMode.DRIVING,
          },
          (result, status) => {
            if (status === "OK") {
              directionsRenderer.current.setDirections(result);
            }
          }
        );
      }
    );
  };

  if (!restaurant) return null;

  return (
    <div className="restaurant-detail-page">
      <h1>{restaurant.name}</h1>
      <p>📍 {restaurant.location}</p>

      <button className="rd-route-btn" onClick={findRoute}>
        Pronađi rutu
      </button>


      <div
        ref={mapRef}
        id="map"
        style={{ height: "400px", width: "100%", marginBottom: "32px" }}
      />

      <h2>Cjenik</h2>
      <table>
        <tbody>
          {items.map((item) =>
            item.prices.map((p) => (
              <tr key={p.price_id}>
                <td>{item.name}</td>
                <td>{item.category_name}</td>
                <td>€{p.value}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default RestaurantDetail;
