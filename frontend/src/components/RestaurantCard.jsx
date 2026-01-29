import "./restaurantCard.css";

function RestaurantCard({ restaurant }) {
  return (
    <div className="restaurant-card">
      <div className="restaurant-card-top">
        <h3>{restaurant.name}</h3>
      </div>
      <div className="restaurant-card-address">
        <span className="pin">📍</span>
        <span>{restaurant.address}</span>
      </div>
    </div>
  );
}

export default RestaurantCard;