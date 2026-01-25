/**
 * ============================================================
 * RESTORANG — Frontend (React + Supabase RPC + Recharts)
 * ============================================================
 *
 * Ovaj App koristi:
 * - Supabase RPC funkcije (SQL) za dohvat agregiranih podataka
 * - react-router-dom za 2 stranice (da se rastereti layout)
 * - Recharts za vizualizacije
 *
 * Struktura:
 * 1) useRestorangData() -> centralno mjesto gdje se data učitava
 * 2) RestaurantsPage     -> € filter + search + tablica
 * 3) ChartsPage          -> KPI + grafovi + best value
 *
 */

import { useEffect, useMemo, useState } from "react";
import { Routes, Route, NavLink } from "react-router-dom";
import { supabase } from "./supabaseClient";
import "./restorang.css";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ScatterChart,
  Scatter,
  ZAxis,
} from "recharts";

/** Tipovi su usklađeni s outputom RPC funkcija */
type QuarterRow = { quarter: string; avg_restaurant_price: number; restaurants: number };
type MinMaxRow = {
  cheapest_quarter: string;
  cheapest_avg: number;
  most_expensive_quarter: string;
  most_expensive_avg: number;
  diff: number;
};
type RestaurantCostRow = { rest_id: number; restaurant: string; quarter: string; avg_price: number; n: number };
type BestValueRow = { quarter: string; score: number; restaurants: number; avg_restaurant_price: number };

/** Formatiranje eura za UI */
function formatEur(v: number | null | undefined) {
  if (v == null || !Number.isFinite(v)) return "—";
  return `${v.toFixed(2)} €`;
}

/**
 * Euro "rang" se ne sprema u bazu — računamo ga na frontendu.
 * t1 i t2 su pragovi (33% i 66% percentil) iz distribucije avg_price.
 */
function euroLevel(avg: number, t1: number, t2: number) {
  if (!Number.isFinite(avg)) return "";
  if (avg <= t1) return "€";
  if (avg <= t2) return "€€";
  return "€€€";
}

/** Koristi se kod scatter-a za veličinu točke */
function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

/**
 * ============================================================
 * useRestorangData — centralizirani dohvat podataka
 * ============================================================
 *
 * Ovaj hook:
 * - Poziva sve RPC funkcije (koje su dokumentirane u supabase_functions.sql)
 * - Drži loading / error
 * - Računa euroThresholds i euroCounts
 *
 */
function useRestorangData() {
  const [quarters, setQuarters] = useState<QuarterRow[]>([]);
  const [minMax, setMinMax] = useState<MinMaxRow | null>(null);
  const [restaurants, setRestaurants] = useState<RestaurantCostRow[]>([]);
  const [bestValue, setBestValue] = useState<BestValueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setLoadError("");

        // 1) Prosjek po kvartovima (na zadnji dan u bazi)
        const { data: qData, error: qErr } = await supabase.rpc("quarter_price_index_latest");
        if (qErr) throw qErr;
        setQuarters((qData as QuarterRow[]) || []);

        // 2) Najjeftiniji/najskuplji kvart + diff
        const { data: mmData, error: mmErr } = await supabase.rpc("quarter_min_max_latest");
        if (mmErr) throw mmErr;
        setMinMax((mmData as MinMaxRow[] | null)?.[0] ?? null);

        // 3) Prosjek po restoranu (na zadnji dan), filtrirano na having count>=5
        const { data: rData, error: rErr } = await supabase.rpc("restaurant_cost_index_latest");
        if (rErr) throw rErr;
        setRestaurants((rData as RestaurantCostRow[]) || []);

        // 4) Top "best value" kvartovi
        const { data: bvData, error: bvErr } = await supabase.rpc("best_value_quarters_latest", { p_limit: 8 });
        if (bvErr) throw bvErr;
        setBestValue((bvData as BestValueRow[]) || []);
      } catch (e: any) {
        console.error(e);
        setLoadError(e?.message || "Greška pri dohvaćanju podataka.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /**
   * euroThresholds:
   * - uzme sve avg_price (prosjeke restorana)
   * - sortira
   * - t1 = 33% percentil, t2 = 66% percentil
   *
   * Time € / €€ / €€€ budu "relativni" prema tržištu, a ne hard-coded.
   */
  const euroThresholds = useMemo(() => {
    const vals = restaurants
      .map((r) => Number(r.avg_price))
      .filter((v) => Number.isFinite(v))
      .sort((a, b) => a - b);

    if (vals.length < 3) return { t1: 0, t2: 0 };

    return {
      t1: vals[Math.floor(vals.length * 0.33)],
      t2: vals[Math.floor(vals.length * 0.66)],
    };
  }, [restaurants]);

  /** euroCounts: koliko restorana upada u € / €€ / €€€ bucket */
  const euroCounts = useMemo(() => {
    const { t1, t2 } = euroThresholds;
    let c1 = 0, c2 = 0, c3 = 0;
    for (const r of restaurants) {
      const lvl = euroLevel(Number(r.avg_price), t1, t2);
      if (lvl === "€") c1++;
      else if (lvl === "€€") c2++;
      else if (lvl === "€€€") c3++;
    }
    return { "€": c1, "€€": c2, "€€€": c3 };
  }, [restaurants, euroThresholds]);

  return { quarters, minMax, restaurants, bestValue, loading, loadError, euroThresholds, euroCounts };
}

/**
 * ============================================================
 * App — Router i layout “shell”
 * ============================================================
 */
export default function App() {
  return (
    <div className="rs-page">
      <div className="rs-shell">
        <Topbar />

        <Routes>
          <Route path="/" element={<RestaurantsPage />} />
          <Route path="/charts" element={<ChartsPage />} />
        </Routes>

        <div className="rs-footer">RESTORANG • Zagreb</div>
      </div>
    </div>
  );
}

/**
 * Topbar:
 * - naslov + navigacija između 2 stranice
 * - NavLink automatski dobije className "active" kada je ruta aktivna
 */
function Topbar() {
  return (
    <div className="rs-topbar">
      <div>
        <div className="rs-brand">RESTORANG</div>
        <h1 className="rs-title">Cijene po kvartovima</h1>
        <div className="rs-subtitle">Odvojeno: Restorani / Grafovi</div>
      </div>

      <div className="rs-nav">
        <NavLink to="/" className={({ isActive }) => `rs-nav-btn ${isActive ? "active" : ""}`}>
          Restorani
        </NavLink>
        <NavLink to="/charts" className={({ isActive }) => `rs-nav-btn ${isActive ? "active" : ""}`}>
          Grafovi
        </NavLink>
      </div>
    </div>
  );
}

/**
 * ============================================================
 * RestaurantsPage — € filter + pretraga + tablica
 * ============================================================
 *
 * Ideja:
 * - Ovdje nema grafova, samo “data browsing”
 * - activeEuro je default "€" (po želji promijeni)
 */
function RestaurantsPage() {
  const { restaurants, loading, loadError, euroThresholds, euroCounts } = useRestorangData();
  const [search, setSearch] = useState("");
  const [activeEuro, setActiveEuro] = useState<"€" | "€€" | "€€€">("€");

  /**
   * filteredRestaurants:
   * - filtrira po search tekstu (naziv restorana ili kvart)
   * - filtrira po activeEuro bucket-u
   * - slice da UI bude brz (ne renderamo tisuće redova)
   */
  const filteredRestaurants = useMemo(() => {
    const q = search.trim().toLowerCase();
    const { t1, t2 } = euroThresholds;

    return restaurants
      .filter((r) => {
        const matchesText =
          !q ||
          r.restaurant.toLowerCase().includes(q) ||
          (r.quarter || "").toLowerCase().includes(q);

        const lvl = euroLevel(Number(r.avg_price), t1, t2);
        return matchesText && lvl === activeEuro;
      })
      .slice(0, 220);
  }, [restaurants, search, activeEuro, euroThresholds]);

  return (
    <>
      {loadError ? (
        <div className="rs-card rs-glow-red" style={{ marginTop: 14 }}>
          <div className="rs-kpi-title">Greška</div>
          <div className="rs-kpi-value" style={{ fontSize: 16, fontWeight: 900 }}>{loadError}</div>
          <div className="rs-kpi-sub">Provjeri RPC permisije / RLS / anon key.</div>
        </div>
      ) : null}

      <div className="rs-subtitle" style={{ marginTop: 10 }}>
        {loading ? "Učitavanje..." : `Restorana: ${restaurants.length} • Filter: ${activeEuro}`}
      </div>

      {/* Euro filter kartice */}
      <div className="rs-grid-euro">
        <EuroCard label="€" count={euroCounts["€"]} active={activeEuro === "€"} onClick={() => setActiveEuro("€")} tone="green" />
        <EuroCard label="€€" count={euroCounts["€€"]} active={activeEuro === "€€"} onClick={() => setActiveEuro("€€")} tone="yellow" />
        <EuroCard label="€€€" count={euroCounts["€€€"]} active={activeEuro === "€€€"} onClick={() => setActiveEuro("€€€")} tone="red" />
      </div>

      {/* Search + tablica */}
      <div className="rs-card" style={{ marginTop: 16 }}>
        <div className="rs-search-head">
          <div>
            <h2 className="rs-h2">Pretraži restorane</h2>
            <div className="rs-note">€ filter je gore. Tablica ima scroll.</div>
          </div>
          <input className="rs-input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="npr. Domino's, Trnje..." />
        </div>

        <div className="rs-table-wrap">
          <table className="rs-table">
            <thead>
              <tr>
                <th className="rs-th">Restoran</th>
                <th className="rs-th">Kvart</th>
                <th className="rs-th">Prosjek</th>
                <th className="rs-th">Rang</th>
                <th className="rs-th">Broj artikala</th>
              </tr>
            </thead>
            <tbody>
              {filteredRestaurants.map((r) => {
                const lvl = euroLevel(Number(r.avg_price), euroThresholds.t1, euroThresholds.t2);
                return (
                  <tr key={r.rest_id}>
                    <td className="rs-td rs-td-strong">{r.restaurant}</td>
                    <td className="rs-td">{r.quarter}</td>
                    <td className="rs-td">{formatEur(Number(r.avg_price))}</td>
                    <td className="rs-td">
                      <span className={`rs-pill-rank ${lvl === "€" ? "pill-green" : lvl === "€€" ? "pill-yellow" : "pill-red"}`}>
                        {lvl}
                      </span>
                    </td>
                    <td className="rs-td rs-td-muted">{r.n}</td>
                  </tr>
                );
              })}

              {filteredRestaurants.length === 0 ? (
                <tr>
                  <td className="rs-td rs-td-muted" colSpan={5}>Nema rezultata.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

/**
 * ============================================================
 * ChartsPage — KPI + grafovi (Recharts) + best value
 * ============================================================
 *
 * Bitno:
 * - Grafovi imaju fixed-height wrapper (rs-chart-fixed) da ResponsiveContainer nikad ne dobije 0 visinu.
 * - “Stack” layout (jedan ispod drugog) -> stabilnije od 2-col grid-a.
 */
function ChartsPage() {
  const { quarters, minMax, restaurants, bestValue, loading, loadError } = useRestorangData();

  const quarterAllSorted = useMemo(() => {
    const copy = [...quarters];
    copy.sort((a, b) => b.avg_restaurant_price - a.avg_restaurant_price);
    return copy;
  }, [quarters]);

  const top12 = useMemo(() => quarterAllSorted.slice(0, 12).reverse(), [quarterAllSorted]);

  const scatterData = useMemo(() => {
    return quarterAllSorted.map((q, idx) => ({
      x: idx + 1,
      y: q.avg_restaurant_price,
      quarter: q.quarter,
      restaurants: q.restaurants,
      z: clamp(q.restaurants, 1, 120),
    }));
  }, [quarterAllSorted]);

  const avgOfQuarters = useMemo(() => {
    const vals = quarters.map((q) => q.avg_restaurant_price).filter(Number.isFinite);
    if (!vals.length) return null;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  }, [quarters]);

  const aboveAvgCount = useMemo(() => {
    if (avgOfQuarters == null) return 0;
    return quarters.filter((q) => q.avg_restaurant_price >= avgOfQuarters).length;
  }, [quarters, avgOfQuarters]);

  const belowAvgCount = useMemo(() => {
    if (avgOfQuarters == null) return 0;
    return quarters.filter((q) => q.avg_restaurant_price < avgOfQuarters).length;
  }, [quarters, avgOfQuarters]);

  const bestValueTop = bestValue?.[0];

  return (
    <>
      {loadError ? (
        <div className="rs-card rs-glow-red" style={{ marginTop: 14 }}>
          <div className="rs-kpi-title">Greška</div>
          <div className="rs-kpi-value" style={{ fontSize: 16, fontWeight: 900 }}>{loadError}</div>
          <div className="rs-kpi-sub">Provjeri RPC permisije / RLS / anon key.</div>
        </div>
      ) : null}

      <div className="rs-subtitle" style={{ marginTop: 10 }}>
        {loading ? "Učitavanje..." : `Kvartova: ${quarters.length} • Restorana: ${restaurants.length}`}
      </div>

      {/* KPI kartice */}
      <div className="rs-grid-kpi">
        <KpiCard className="rs-glow-green" title="Najjeftiniji kvart" value={minMax ? minMax.cheapest_quarter : "—"} sub={minMax ? formatEur(minMax.cheapest_avg) : "—"} />
        <KpiCard className="rs-glow-red" title="Najskuplji kvart" value={minMax ? minMax.most_expensive_quarter : "—"} sub={minMax ? formatEur(minMax.most_expensive_avg) : "—"} />
        <KpiCard className="rs-glow-blue" title="Razlika" value={minMax ? formatEur(minMax.diff) : "—"} sub="Najskuplji − najjeftiniji" />
        <KpiCard className="rs-glow-green" title="Best value kvart" value={bestValueTop ? bestValueTop.quarter : "—"} sub={bestValueTop ? `score ${bestValueTop.score} • ${bestValueTop.restaurants} rest. • ${formatEur(bestValueTop.avg_restaurant_price)}` : "—"} />
      </div>

      <div className="rs-stack" style={{ marginTop: 16 }}>
        {/* Bar chart */}
        <div className="rs-card rs-card-soft rs-card-strongshadow">
          <div className="rs-section-head">
            <h2 className="rs-h2">Top 10 kvartova (prosječna cijena)</h2>
            <div className="rs-note">prosjek kvarta = prosjek prosjeka restorana</div>
          </div>

          <div className="rs-chart-fixed">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={top12} layout="vertical" margin={{ left: 30, right: 20, top: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.35} />
                <XAxis type="number" />
                <YAxis type="category" dataKey="quarter" width={190} />
                <Tooltip
                  formatter={(v: any, name: any) => (name === "avg_restaurant_price" ? [`${Number(v).toFixed(2)} €`, "Prosjek"] : [v, name])}
                  labelFormatter={() => ""}
                />
                <Bar dataKey="avg_restaurant_price" radius={[12, 12, 12, 12]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Scatter */}
        <div className="rs-card">
          <div className="rs-section-head">
            <h2 className="rs-h2">Mapa kvartova</h2>
            <div className="rs-note">točka = kvart</div>
          </div>

          <div className="rs-chart-fixed-sm">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ left: 10, right: 20, top: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.35} />
                <XAxis dataKey="x" name="Rang" />
                <YAxis dataKey="y" name="Prosjek" />
                <ZAxis dataKey="z" range={[80, 320]} />
                <Tooltip
                  formatter={(v: any, name: any) => {
                    if (name === "y") return [`${Number(v).toFixed(2)} €`, "Prosjek"];
                    if (name === "restaurants") return [v, "Restorana"];
                    return [v, name];
                  }}
                  labelFormatter={(_, payload: any) => payload?.[0]?.payload?.quarter ? `Kvart: ${payload[0].payload.quarter}` : ""}
                />
                <Scatter data={scatterData} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          <div className="rs-explain">
            <div className="rs-explain-title">Kako čitati graf:</div>
            <div><b>X (Rang)</b> = 1 je najskuplji kvart, veći broj je jeftiniji</div>
            <div><b>Y</b> = prosječna cijena kvarta (u €)</div>
            <div><b>Veličina točke</b> = broj restorana u kvartu</div>
          </div>

          <div className="rs-mini-grid">
            <MiniStat title="Prosjek svih kvartova" value={avgOfQuarters == null ? "—" : formatEur(avgOfQuarters)} />
            <MiniStat title="Iznad/ispod prosjeka" value={avgOfQuarters == null ? "—" : `${aboveAvgCount} / ${belowAvgCount}`} />
          </div>
        </div>

        {/* Best value list */}
        <div className="rs-card">
          <h2 className="rs-h2">Best value kvartovi</h2>
          <div className="rs-note" style={{ marginTop: 4 }}>
            score = broj restorana / prosječna cijena (više = bolje)
          </div>

          <div className="rs-bestvalue-list">
            {(bestValue || []).map((q) => (
              <div key={q.quarter} className="rs-bestvalue-row">
                <div className="rs-bestvalue-name">{q.quarter}</div>
                <div className="rs-bestvalue-meta">
                  score <b>{q.score}</b> • {q.restaurants} • {formatEur(q.avg_restaurant_price)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

/** KPI kartica: sitna komponenta, prima title/value/sub + opcionalni class za glow */
function KpiCard(props: { title: string; value: string; sub: string; className?: string }) {
  return (
    <div className={`rs-card ${props.className ?? ""}`}>
      <div className="rs-kpi-title">{props.title}</div>
      <div className="rs-kpi-value">{props.value}</div>
      <div className="rs-kpi-sub">{props.sub}</div>
    </div>
  );
}

/** EuroCard: UI kontrola za prebacivanje activeEuro filtera */
function EuroCard(props: { label: string; count: number; active: boolean; onClick: () => void; tone: "green" | "yellow" | "red" }) {
  return (
    <button onClick={props.onClick} className={`rs-euro-btn ${props.active ? "active" : ""} tone-${props.tone}`} type="button">
      <div className="rs-euro-label">Rang</div>
      <div className="rs-euro-value">{props.label}</div>
      <div className="rs-euro-sub">{props.count} restorana</div>
    </button>
  );
}

/** MiniStat: mali “stat box” koji se koristi ispod scatter grafa */
function MiniStat(props: { title: string; value: string }) {
  return (
    <div className="rs-mini">
      <div className="rs-mini-title">{props.title}</div>
      <div className="rs-mini-value">{props.value}</div>
    </div>
  );
}