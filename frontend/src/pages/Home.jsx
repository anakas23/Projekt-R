import FeatureCard from "../components/FeatureCard";
import { useNavigate } from "react-router-dom";
import "./home.css";

function Home() {
  const nav = useNavigate();

  return (
    <div className="home">
      <section className="hero">
        <div className="hero-icon">📈</div>

        <h1>Usporedba cijena hrane i pića</h1>
        <p>
          Usporedite cijene u restoranima i kafićima. Pratite promjene cijena kroz
          vrijeme i pronađite najbolje ponude u svojoj okolini.
        </p>

        <div className="hero-buttons">
          <button className="primary" onClick={() => nav("/restaurants")}>
            Pregled cijena
          </button>
          <button className="secondary" onClick={() => nav("/compare")}>
            Usporedi restorane
          </button>
        </div>
      </section>

      <section className="features">
        <FeatureCard
          icon="🏪"
          title="Usporedba cijena"
          text="Pregled i usporedba cijena hrane i pića u različitim restoranima i kafićima."
        />
        <FeatureCard
          icon="📊"
          title="Praćenje trendova"
          text="Praćenje promjena cijena kroz vrijeme pomoću grafova i povijesnih podataka."
        />
        <FeatureCard
          icon="✅"
          title="Podaci zajednice"
          text="Podaci koje unose korisnici omogućuju točne i ažurne informacije za donošenje odluka."
        />
      </section>

      <section className="about">
        <h2>O projektu</h2>
        <p>
          Ovo je sveučilišni projekt osmišljen kako bi studentima i široj zajednici
          pomogao u donošenju informiranih odluka o tome gdje jesti i piti.
        </p>
        <p>
          Korisnici mogu unositi nove cijene, koje administratori pregledavaju i
          odobravaju kako bi se osigurala kvaliteta podataka. Aplikacija je neovisna
          o backend rješenju i može se povezati s bilo kojim API-jem ili izvorom podataka.
        </p>
      </section>
    </div>
  );
}

export default Home;