import { NavLink } from "react-router-dom";
import "./navbar.css";

function Navbar() {
  return (
    <nav className="navbar">
      <div className="logo">
        <span className="logo-icon">📈</span>
        <span className="logo-text">PriceCompare</span>
      </div>

      <ul className="nav-links">
        <li>
          <NavLink to="/" className={({ isActive }) => (isActive ? "active" : "")}>
            Početna
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/restaurants"
            className={({ isActive }) => (isActive ? "active" : "")}
          >
            Restorani
          </NavLink>
        </li>
        <li>
          <NavLink to="/compare" className={({ isActive }) => (isActive ? "active" : "")}>
            Usporedba
          </NavLink>
        </li>
        <li>
          <NavLink to="/submit" className={({ isActive }) => (isActive ? "active" : "")}>
            Unos cijene
          </NavLink>
        </li>
        <li>
          <NavLink to="/admin" className={({ isActive }) => (isActive ? "active" : "")}>
            Administrator
          </NavLink>
        </li>
      </ul>
    </nav>
  );
}

export default Navbar;