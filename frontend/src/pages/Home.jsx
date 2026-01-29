import FeatureCard from "../components/FeatureCard";
import { useNavigate } from "react-router-dom";
import "./home.css";

export default function Home() {
  const nav = useNavigate();

  return (
    <div className="rh-page">
      <div className="rh-shell">
        {/* HERO */}
        <section className="rh-hero">
          <div className="rh-hero-head">
            <div className="rh-logo">
              <div className="rh-logo-icon">📈</div>
              <div>
                <div className="rh-wordmark">RESTORANG</div>
                <div className="rh-tagline">Zagreb • Usporedba cijena</div>
              </div>
            </div>

          </div>

          <h1 className="rh-title">Usporedba cijena hrane u restoranima</h1>

          <p className="rh-lead">
            Pronađi gdje se najviše isplati jesti. Pregledaj cijene, usporedi kvartove i
            prati promjene kroz vrijeme kroz grafove.
          </p>

          <div className="rh-actions">
            <button className="rh-btn rh-btn-primary" onClick={() => nav("/restaurants")}>
              Pregled restorana
            </button>
            <button className="rh-btn rh-btn-ghost" onClick={() => nav("/compare")}>
              Grafovi i kvartovi
            </button>
          </div>
        </section>

        {/* FEATURES */}
        <section className="rh-features">
          <div className="rh-section-head">
            <h2 className="rh-h2">Što možeš napraviti</h2>
          </div>

          <div className="rh-grid">
            <FeatureCard
              icon="📍"
              title="Pregled po restoranima"
              text="Pretraži jelovnike i usporedi cijene po restoranima."
            />
            <FeatureCard
              icon="📊"
              title="Grafovi i trendovi"
              text="Vizualizacije po kvartovima i analitika trendova cijena."
            />
            <FeatureCard
              icon="✅"
              title="Provjereni unosi"
              text="Cijene se pregledavaju i odobravaju prije objave radi kvalitete podataka."
            />
          </div>
        </section>

        {/* ABOUT */}
        <section className="rh-about">
          <div className="rh-section-head">
            <h2 className="rh-h2">O projektu</h2>
          </div>

          <p className="rh-p">
            RESTORANG je osmišljen kako bi studentima i široj zajednici pomogao u donošenju
            informiranih odluka o tome gdje jesti.
          </p>

          <div className="rh-about-actions">
            <button className="rh-btn rh-btn-soft" onClick={() => nav("/submit")}>
              Unesi cijenu
            </button>
            <button className="rh-btn rh-btn-soft" onClick={() => nav("/admin")}>
              Admin pregled
            </button>
          </div>
        </section>

        <div className="rh-footer">RESTORANG • Zagreb</div>
      </div>
    </div>
  );
}
