import { useState } from "react";
import "./submitPrice.css";

function SubmitPrice() {
  const [form, setForm] = useState({
    restaurant: "",
    item: "",
    category: "food",
    price: "",
    date: "",
  });

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();

    // Za sada samo ispis (backend kasnije)
    console.log("Poslana cijena:", form);

    alert("Cijena je poslana! (čeka odobrenje administratora)");

    setForm({
      restaurant: "",
      item: "",
      category: "food",
      price: "",
      date: "",
    });
  }

  return (
    <div className="submit-page">
      <h1>Unos cijene</h1>
      <p className="subtitle">Pomozite zajednici unosom aktualnih cijena</p>

      <div className="info-box">
        Sve unesene cijene pregledavaju administratori prije objave.
        Molimo provjerite točnost podataka i unesite datum kada ste primijetili cijenu.
      </div>

      <form className="submit-form" onSubmit={handleSubmit}>
        <label>
          Restoran *
          <select
            value={form.restaurant}
            onChange={(e) => update("restaurant", e.target.value)}
            required
          >
            <option value="">Odaberite restoran</option>
            <option>Campus Café</option>
            <option>Student Union Grill</option>
            <option>The Green Bean</option>
            <option>Pizza Palace</option>
            <option>Coffee Corner</option>
            <option>Burger Hub</option>
          </select>
        </label>

        <label>
          Naziv artikla *
          <input
            value={form.item}
            onChange={(e) => update("item", e.target.value)}
            placeholder="npr. Cappuccino, Burger"
            required
          />
        </label>

        <div className="radio-group">
          <span>Kategorija *</span>
          <label>
            <input
              type="radio"
              checked={form.category === "food"}
              onChange={() => update("category", "food")}
            />
            Hrana
          </label>
          <label>
            <input
              type="radio"
              checked={form.category === "drink"}
              onChange={() => update("category", "drink")}
            />
            Piće
          </label>
        </div>

        <label>
          Cijena (€) *
          <input
            type="number"
            step="0.01"
            value={form.price}
            onChange={(e) => update("price", e.target.value)}
            required
          />
        </label>

        <label>
          Datum opažanja *
          <input
            type="date"
            value={form.date}
            onChange={(e) => update("date", e.target.value)}
            required
          />
        </label>

        <div className="buttons">
          <button className="primary" type="submit">
            Pošalji cijenu
          </button>
          <button
            className="secondary"
            type="button"
            onClick={() =>
              setForm({
                restaurant: "",
                item: "",
                category: "food",
                price: "",
                date: "",
              })
            }
          >
            Resetiraj
          </button>
        </div>
      </form>
    </div>
  );
}

export default SubmitPrice;