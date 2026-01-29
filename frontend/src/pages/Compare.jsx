import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient.ts";
import "./compare.css";

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
  LineChart,
  Line,
} from "recharts";

/** Formatiranje eura za UI */
function formatEur(v) {
  if (v == null || !Number.isFinite(v)) return "—";
  return `${Number(v).toFixed(2)} €`;
}

function euroLevel(avg, t1, t2) {
  if (!Number.isFinite(avg)) return "";
  if (avg <= t1) return "€";
  if (avg <= t2) return "€€";
  return "€€€";
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

/**
 * useRestorangData — dohvat podataka preko Supabase RPC
 */
function useRestorangData() {
  const [quarters, setQuarters] = useState([]);
  const [minMax, setMinMax] = useState(null);
  const [restaurants, setRestaurants] = useState([]);
  const [bestValue, setBestValue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setLoadError("");

        const { data: qData, error: qErr } = await supabase.rpc("quarter_price_index_latest");
        if (qErr) throw qErr;
        setQuarters(qData || []);

        const { data: mmData, error: mmErr } = await supabase.rpc("quarter_min_max_latest");
        if (mmErr) throw mmErr;
        setMinMax((mmData || [])[0] ?? null);

        const { data: rData, error: rErr } = await supabase.rpc("restaurant_cost_index_latest");
        if (rErr) throw rErr;
        setRestaurants(rData || []);

        const { data: bvData, error: bvErr } = await supabase.rpc("best_value_quarters_latest", { p_limit: 8 });
        if (bvErr) throw bvErr;
        setBestValue(bvData || []);
      } catch (e) {
        console.error(e);
        setLoadError(e?.message || "Greška pri dohvaćanju podataka.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

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

  const euroCounts = useMemo(() => {
    const { t1, t2 } = euroThresholds;
    let c1 = 0,
      c2 = 0,
      c3 = 0;

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
 * Compare (RESTORANG) — /compare
 */
export default function Compare() {
  const [tab, setTab] = useState("restaurants"); // restaurants | quarters | trend

  return (
    <div className="rs-page">
      <div className="rs-shell">
        <div className="rs-topbar">
          <div>
            <h1 className="rs-title">Analitika cijena</h1>
          </div>

          <div className="rs-nav">
            <button
              type="button"
              className={`rs-nav-btn ${tab === "restaurants" ? "active" : ""}`}
              onClick={() => setTab("restaurants")}
            >
              Restorani
            </button>

            <button
              type="button"
              className={`rs-nav-btn ${tab === "quarters" ? "active" : ""}`}
              onClick={() => setTab("quarters")}
            >
              Analiza po kvartovima
            </button>

            <button
              type="button"
              className={`rs-nav-btn ${tab === "trend" ? "active" : ""}`}
              onClick={() => setTab("trend")}
            >
              Trend cijena
            </button>
          </div>
        </div>

        {tab === "restaurants" ? <RestaurantsPage /> : null}
        {tab === "quarters" ? <ChartsPage /> : null}
        {tab === "trend" ? <TrendPage /> : null}

        <div className="rs-footer">RESTORANG • Zagreb</div>
      </div>
    </div>
  );
}

/**
 * RestaurantsPage — € filter + pretraga + tablica
 */
function RestaurantsPage() {
  const { restaurants, loading, loadError, euroThresholds, euroCounts } = useRestorangData();
  const [search, setSearch] = useState("");
  const [activeEuro, setActiveEuro] = useState("€");

  const filteredRestaurants = useMemo(() => {
    const q = search.trim().toLowerCase();
    const { t1, t2 } = euroThresholds;

    return restaurants
      .filter((r) => {
        const matchesText =
          !q ||
          (r.restaurant || "").toLowerCase().includes(q) ||
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
          <div className="rs-kpi-value" style={{ fontSize: 16, fontWeight: 900 }}>
            {loadError}
          </div>
          <div className="rs-kpi-sub">Provjeri RPC permisije / RLS / anon key.</div>
        </div>
      ) : null}

      <div className="rs-subtitle" style={{ marginTop: 10 }}>
        {loading ? "Učitavanje..." : `Restorana: ${restaurants.length} • Filter: ${activeEuro}`}
      </div>

      <div className="rs-grid-euro">
        <EuroCard label="€" count={euroCounts["€"]} active={activeEuro === "€"} onClick={() => setActiveEuro("€")} tone="green" />
        <EuroCard label="€€" count={euroCounts["€€"]} active={activeEuro === "€€"} onClick={() => setActiveEuro("€€")} tone="yellow" />
        <EuroCard label="€€€" count={euroCounts["€€€"]} active={activeEuro === "€€€"} onClick={() => setActiveEuro("€€€")} tone="red" />
      </div>

      <div className="rs-card" style={{ marginTop: 16 }}>
        <div className="rs-search-head">
          <div>
            <h2 className="rs-h2">Pretraži restorane</h2>
            <div className="rs-note">Naziv ili kvart</div>
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
                  <td className="rs-td rs-td-muted" colSpan={5}>
                    Nema rezultata.
                  </td>
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
 * ChartsPage — kvartovi (tvoj postojeći tab)
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

  const aboveAvgCount = useMemo(() => (avgOfQuarters == null ? 0 : quarters.filter((q) => q.avg_restaurant_price >= avgOfQuarters).length), [quarters, avgOfQuarters]);
  const belowAvgCount = useMemo(() => (avgOfQuarters == null ? 0 : quarters.filter((q) => q.avg_restaurant_price < avgOfQuarters).length), [quarters, avgOfQuarters]);

  const bestValueTop = bestValue?.[0];

  return (
    <>
      {loadError ? (
        <div className="rs-card rs-glow-red" style={{ marginTop: 14 }}>
          <div className="rs-kpi-title">Greška</div>
          <div className="rs-kpi-value" style={{ fontSize: 16, fontWeight: 900 }}>
            {loadError}
          </div>
          <div className="rs-kpi-sub">Provjeri RPC permisije / RLS / anon key.</div>
        </div>
      ) : null}

      <div className="rs-subtitle" style={{ marginTop: 10 }}>
        {loading ? "Učitavanje..." : `Kvartova: ${quarters.length} • Restorana: ${restaurants.length}`}
      </div>

      <div className="rs-grid-kpi">
        <KpiCard className="rs-glow-green" title="Najjeftiniji kvart" value={minMax ? minMax.cheapest_quarter : "—"} sub={minMax ? formatEur(minMax.cheapest_avg) : "—"} />
        <KpiCard className="rs-glow-red" title="Najskuplji kvart" value={minMax ? minMax.most_expensive_quarter : "—"} sub={minMax ? formatEur(minMax.most_expensive_avg) : "—"} />
        <KpiCard className="rs-glow-blue" title="Razlika" value={minMax ? formatEur(minMax.diff) : "—"} sub="Najskuplji − najjeftiniji" />
        <KpiCard
          className="rs-glow-green"
          title="Best value kvart"
          value={bestValueTop ? bestValueTop.quarter : "—"}
          sub={bestValueTop ? `score ${bestValueTop.score} • ${bestValueTop.restaurants} rest. • ${formatEur(bestValueTop.avg_restaurant_price)}` : "—"}
        />
      </div>

      <div className="rs-stack" style={{ marginTop: 16 }}>
        <div className="rs-card rs-card-soft rs-card-strongshadow">
          <div className="rs-section-head">
            <h2 className="rs-h2">Top kvartovi (prosječna cijena)</h2>
            <div className="rs-note">prosjek kvarta = prosjek prosjeka restorana</div>
          </div>

          <div className="rs-chart-fixed">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={top12} layout="vertical" margin={{ left: 30, right: 20, top: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.35} />
                <XAxis type="number" />
                <YAxis type="category" dataKey="quarter" width={190} />
                <Tooltip
                  formatter={(v, name) => (name === "avg_restaurant_price" ? [`${Number(v).toFixed(2)} €`, "Prosjek"] : [v, name])}
                  labelFormatter={() => ""}
                />
                <Bar dataKey="avg_restaurant_price" radius={[12, 12, 12, 12]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

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
                  formatter={(v, name) => {
                    if (name === "y") return [`${Number(v).toFixed(2)} €`, "Prosjek"];
                    if (name === "restaurants") return [v, "Restorana"];
                    return [v, name];
                  }}
                  labelFormatter={(_, payload) => (payload?.[0]?.payload?.quarter ? `Kvart: ${payload[0].payload.quarter}` : "")}
                />
                <Scatter data={scatterData} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          <div className="rs-mini-grid">
            <MiniStat title="Prosjek svih kvartova" value={avgOfQuarters == null ? "—" : formatEur(avgOfQuarters)} />
            <MiniStat title="Iznad/ispod prosjeka" value={avgOfQuarters == null ? "—" : `${aboveAvgCount} / ${belowAvgCount}`} />
          </div>
        </div>

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

function TrendPage() {
  const [restQuery, setRestQuery] = useState("");
  const [restOptions, setRestOptions] = useState([]); // [{rest_id, name}]
  const [restId, setRestId] = useState("");
  const [restName, setRestName] = useState("");

  const [itemId, setItemId] = useState("");
  const [days, setDays] = useState(365);

  const [items, setItems] = useState([]); // [{ item_id, name }]
  const [data, setData] = useState([]);

  const [openList, setOpenList] = useState(false);
  const [loadingRestaurants, setLoadingRestaurants] = useState(false);
  const [loadingItems, setLoadingItems] = useState(false);
  const [loadingTrend, setLoadingTrend] = useState(false);
  const [err, setErr] = useState("");

  // 1) Pretraga restorana (debounce)
  useEffect(() => {
    const handle = setTimeout(async () => {
      try {
        setLoadingRestaurants(true);
        const { data, error } = await supabase.rpc("search_restaurants", { p_q: restQuery });
        if (error) throw error;
        setRestOptions(data || []);
      } catch (e) {
        console.error(e);
        setRestOptions([]);
      } finally {
        setLoadingRestaurants(false);
      }
    }, 250);

    return () => clearTimeout(handle);
  }, [restQuery]);

  // 2) Kad odabereš restoran: povuci iteme koji imaju cijene
  useEffect(() => {
    (async () => {
      try {
        setErr("");

        if (!restId) {
          setItems([]);
          setItemId("");
          return;
        }

        setLoadingItems(true);

        const rid = Number(restId);
        if (!Number.isFinite(rid)) {
          setItems([]);
          setItemId("");
          return;
        }

        // a) item_id koji postoje u price za taj restoran
        const { data: priceRows, error: priceErr } = await supabase
          .from("price")
          .select("item_id")
          .eq("rest_id", rid);

        if (priceErr) throw priceErr;

        const ids = Array.from(new Set((priceRows || []).map((r) => r.item_id))).filter(Boolean);

        if (!ids.length) {
          setItems([]);
          setItemId("");
          return;
        }

        // b) nazivi iz item tablice
        const { data: itemRows, error: itemErr } = await supabase
          .from("item")
          .select("item_id,name")
          .in("item_id", ids)
          .order("name", { ascending: true });

        if (itemErr) throw itemErr;

        const list = (itemRows || []).map((x) => ({
          item_id: x.item_id,
          name: x.name || "Nepoznat artikl",
        }));

        setItems(list);

        // auto-select prvi item (ili zadrži ako postoji)
        if (!itemId || !list.some((x) => String(x.item_id) === String(itemId))) {
          setItemId(String(list[0].item_id));
        }
      } catch (e) {
        console.error(e);
        setErr(e?.message || "Greška pri dohvaćanju artikala.");
        setItems([]);
        setItemId("");
      } finally {
        setLoadingItems(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restId]);

  // 3) Trend (RPC: item_price_history)
  useEffect(() => {
    (async () => {
      try {
        setErr("");

        if (!restId || !itemId) {
          setData([]);
          return;
        }

        setLoadingTrend(true);

        const rid = Number(restId);
        const iid = Number(itemId);
        const d = Number(days);

        const { data: rows, error } = await supabase.rpc("item_price_history", {
          p_rest_id: rid,
          p_item_id: iid,
          p_days: d,
        });

        if (error) throw error;

        setData(
          (rows || []).map((r) => ({
            date: r.d,
            value: Number(r.value),
          }))
        );
      } catch (e) {
        console.error(e);
        setErr(e?.message || "Greška pri dohvaćanju trenda.");
        setData([]);
      } finally {
        setLoadingTrend(false);
      }
    })();
  }, [restId, itemId, days]);

  const selectedItemName =
    items.find((x) => String(x.item_id) === String(itemId))?.name || "—";

  const min = useMemo(() => {
    const vals = data.map((x) => x.value).filter(Number.isFinite);
    return vals.length ? Math.min(...vals) : null;
  }, [data]);

  const max = useMemo(() => {
    const vals = data.map((x) => x.value).filter(Number.isFinite);
    return vals.length ? Math.max(...vals) : null;
  }, [data]);

  const delta = useMemo(() => {
    if (data.length < 2) return null;
    const a = Number(data[0]?.value);
    const b = Number(data[data.length - 1]?.value);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
    return b - a;
  }, [data]);

  function chooseRestaurant(r) {
    setRestId(String(r.rest_id));
    setRestName(r.name);
    setRestQuery(r.name);       // u input upišemo ime (lijepo za usera)
    setOpenList(false);
  }

  const showList = openList && (restQuery.trim().length > 0 || loadingRestaurants);

  return (
    <>
      {err ? (
        <div className="rs-card rs-glow-red" style={{ marginTop: 14 }}>
          <div className="rs-kpi-title">Greška</div>
          <div className="rs-kpi-value" style={{ fontSize: 16, fontWeight: 900 }}>
            {err}
          </div>
          <div className="rs-kpi-sub">Provjeri RLS / RPC / podatke u tablici price.</div>
        </div>
      ) : null}

      <div className="rs-card rs-trend-card">
        <div className="rs-section-head">
          <div>
            <h2 className="rs-h2">Trend cijene artikla</h2>
          </div>
        </div>

        <div className="rs-trend-controls">
          {/* Restoran search */}
          <div className="rs-trend-search">
            <div className="rs-field-label">Restoran</div>
            <input
              className="rs-input"
              value={restQuery}
              onChange={(e) => {
                setRestQuery(e.target.value);
                setOpenList(true);
              }}
              onFocus={() => setOpenList(true)}
              placeholder="Upiši naziv restorana…"
            />

            {showList ? (
              <div className="rs-search-list">
                {loadingRestaurants ? (
                  <div className="rs-search-empty">Učitavanje…</div>
                ) : restOptions.length === 0 ? (
                  <div className="rs-search-empty">Nema rezultata.</div>
                ) : (
                  restOptions.map((r) => (
                    <button
                      key={r.rest_id}
                      type="button"
                      className="rs-search-row"
                      onClick={() => chooseRestaurant(r)}
                    >
                      <div className="rs-search-name">{r.name}</div>
                      <div className="rs-search-hint">odaberi</div>
                    </button>
                  ))
                )}
              </div>
            ) : null}

            {restId ? (
              <div className="rs-trend-selected">
                Odabrano: <b style={{ color: "var(--text)" }}>{restName || restQuery}</b>
              </div>
            ) : null}
          </div>

          {/* Item dropdown */}
          <div>
            <div className="rs-field-label">Artikl</div>
            <select
              className="rs-input"
              value={itemId}
              onChange={(e) => setItemId(e.target.value)}
              disabled={!restId || loadingItems || !items.length}
            >
              <option value="">
                {!restId ? "Prvo odaberi restoran" : loadingItems ? "Učitavanje…" : "Odaberi artikl…"}
              </option>
              {items.map((o) => (
                <option key={o.item_id} value={String(o.item_id)}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>

          {/* Period */}
          <div>
            <div className="rs-field-label">Period</div>
            <select className="rs-input" value={days} onChange={(e) => setDays(Number(e.target.value))}>
              <option value={30}>Zadnjih 30 dana</option>
              <option value={60}>Zadnjih 60 dana</option>
              <option value={90}>Zadnjih 90 dana</option>
              <option value={180}>Zadnjih 6 mjeseci</option>
              <option value={365}>Zadnjih godinu dana</option>
            </select>
          </div>
        </div>

        <div className="rs-mini-grid" style={{ marginTop: 18 }}>
          <MiniStat title="Min cijena" value={min == null ? "—" : formatEur(min)} />
          <MiniStat title="Max cijena" value={max == null ? "—" : formatEur(max)} />
        </div>

        <div className="rs-mini-grid" style={{ marginTop: 12 }}>
          <MiniStat
            title="Promjena"
            value={delta == null ? "—" : `${delta >= 0 ? "+" : ""}${delta.toFixed(2)} €`}
          />
          <MiniStat title="Broj točaka" value={loadingTrend ? "…" : String(data.length)} />
        </div>

        <div className="rs-trend-chart">
          <div className="rs-chart-fixed" style={{ marginTop: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ left: 10, right: 20, top: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.35} />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(v) => [`${Number(v).toFixed(2)} €`, "Cijena"]} />
                <Line type="monotone" dataKey="value" strokeWidth={3} dot />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {!loadingTrend && restId && itemId && data.length === 0 ? (
            <div className="rs-note" style={{ marginTop: 10 }}>
              Nema podataka za odabrani restoran i artikl u zadanom periodu.
            </div>
          ) : null}

          {restId && itemId ? (
            <div className="rs-note" style={{ marginTop: 10 }}>
              Prikaz: <b>{restName || restQuery || "Restoran"}</b> • <b>{selectedItemName}</b>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}


function EuroCard({ label, count, active, onClick, tone }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rs-euro-btn ${active ? "active" : ""} tone-${tone}`}
    >
      <div className="rs-euro-label">Rang</div>
      <div className="rs-euro-value">{label}</div>
      <div className="rs-euro-sub">{count} restorana</div>
    </button>
  );
}
function KpiCard({ title, value, sub, className }) {
  return (
    <div className={`rs-card ${className ?? ""}`}>
      <div className="rs-kpi-title">{title}</div>
      <div className="rs-kpi-value">{value}</div>
      <div className="rs-kpi-sub">{sub}</div>
    </div>
  );
}
function MiniStat({ title, value }) {
  return (
    <div className="rs-mini-stat">
      <div className="rs-mini-stat-title">{title}</div>
      <div className="rs-mini-stat-value">{value}</div>
    </div>
  );
}