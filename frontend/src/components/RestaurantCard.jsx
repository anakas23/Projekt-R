import "./restaurantCard.css";

function RestaurantCard({ restaurant }) {
  return (
    <div className="restaurant-card">
      <div className="restaurant-card-top">
        <h3>{restaurant.name}</h3>
        <span className="chev">›</span>
      </div>

      <div className="restaurant-card-address">
        <span className="pin">📍</span>
        <span>{restaurant.address}</span>
      </div>

      <div className="restaurant-tags">
        <span className="tag tag-primary">{restaurant.type}</span>
        <span className="tag">{restaurant.city}</span>
      </div>
    </div>
  );
}

export default RestaurantCard;