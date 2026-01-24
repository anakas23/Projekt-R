import { useMemo, useState } from "react";
import "./admin.css";

const initial = [
  {
    id: 1,
    restaurant: "Campus Café",
    address: "123 University Ave",
    item: "Espresso",
    category: "drink",
    price: 3.5,
    date: "17/01/2026",
    submittedBy: "user11",
    status: "pending",
  },
  {
    id: 2,
    restaurant: "The Green Bean",
    address: "789 Main St",
    item: "Sandwich",
    category: "food",
    price: 7.5,
    date: "17/01/2026",
    submittedBy: "user12",
    status: "pending",
  },
  {
    id: 3,
    restaurant: "Student Union Grill",
    address: "456 College St",
    item: "Chicken Wrap",
    category: "food",
    price: 8.0,
    date: "16/01/2026",
    submittedBy: "user13",
    status: "pending",
  },
];

function Admin() {
  const [rows, setRows] = useState(initial);
  const [approvedToday, setApprovedToday] = useState(0);
  const [rejectedToday, setRejectedToday] = useState(0);

  const pending = useMemo(() => rows.filter((r) => r.status === "pending"), [rows]);

  function approve(id) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: "approved" } : r)));
    setApprovedToday((n) => n + 1);
  }

  function reject(id) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: "rejected" } : r)));
    setRejectedToday((n) => n + 1);
  }

  return (
    <div className="admin-page">
      <h1>Administratorska provjera</h1>
      <p className="subtitle">Pregled i odobravanje pristiglih unosa cijena</p>

      <div className="stats">
        <div className="stat-card">
          <div>
            <div className="stat-label">Na čekanju</div>
            <div className="stat-number orange">{pending.length}</div>
          </div>
          <div className="stat-icon orange">🕒</div>
        </div>

        <div className="stat-card">
          <div>
            <div className="stat-label">Odobreno danas</div>
            <div className="stat-number green">{approvedToday}</div>
          </div>
          <div className="stat-icon green">✓</div>
        </div>

        <div className="stat-card">
          <div>
            <div className="stat-label">Odbijeno danas</div>
            <div className="stat-number red">{rejectedToday}</div>
          </div>
          <div className="stat-icon red">✕</div>
        </div>
      </div>

      <div className="guidelines">
        <strong>Smjernice za pregled</strong>
        <p>
          Prije odobravanja provjerite jesu li cijene realne i točne.
          Provjerite moguće duplikate i osigurajte da je datum dovoljno recentan.
        </p>
      </div>

      <div className="table-card">
        <h2>Unosi na čekanju</h2>

        <table>
          <thead>
            <tr>
              <th>RESTORAN</th>
              <th>NAZIV</th>
              <th>KATEGORIJA</th>
              <th>CIJENA</th>
              <th>DATUM</th>
              <th>POSLAO</th>
              <th>STATUS</th>
              <th>RADNJE</th>
            </tr>
          </thead>

          <tbody>
            {pending.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: "center", padding: "20px" }}>
                  Nema unosa na čekanju 🎉
                </td>
              </tr>
            ) : (
              pending.map((r) => (
                <tr key={r.id}>
                  <td>
                    <div className="rest-name">{r.restaurant}</div>
                    <div className="rest-addr">{r.address}</div>
                  </td>
                  <td className="bold">{r.item}</td>
                  <td>
                    <span className={`pill ${r.category}`}>{r.category}</span>
                  </td>
                  <td className="bold">€{r.price.toFixed(2)}</td>
                  <td>{r.date}</td>
                  <td className="muted">{r.submittedBy}</td>
                  <td>
                    <span className="status pending">pending</span>
                  </td>
                  <td className="actions">
                    <button className="approve" onClick={() => approve(r.id)}>
                      ✓ Odobri
                    </button>
                    <button className="reject" onClick={() => reject(r.id)}>
                      ✕ Odbij
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Admin;