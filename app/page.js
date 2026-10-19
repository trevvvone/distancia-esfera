"use client";
import { useState } from "react";

const R = 6371.0088; // radio medio terrestre (km)
const rad = (d) => (d * Math.PI) / 180;
const deg = (r) => (r * 180) / Math.PI;

// 1) Haversine: d = 2R·atan2(√a, √(1−a))
function haversine(a, b) {
  const dp = rad(b.lat - a.lat), dl = rad(b.lon - a.lon);
  const h = Math.sin(dp / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dl / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}
// 2) Ley esférica de cosenos: d = R·acos(sinφ1·sinφ2 + cosφ1·cosφ2·cosΔλ)
function cosenos(a, b) {
  const x = Math.sin(rad(a.lat)) * Math.sin(rad(b.lat)) + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.cos(rad(b.lon - a.lon));
  return R * Math.acos(Math.min(1, Math.max(-1, x)));
}
// 3) Equirectangular: d = R·√((Δλ·cosφm)² + Δφ²)
function equirect(a, b) {
  const x = rad(b.lon - a.lon) * Math.cos(rad((a.lat + b.lat) / 2));
  return R * Math.hypot(x, rad(b.lat - a.lat));
}
// Rumbo inicial: θ = atan2(sinΔλ·cosφ2, cosφ1·sinφ2 − sinφ1·cosφ2·cosΔλ)
function rumbo(a, b) {
  const dl = rad(b.lon - a.lon);
  const y = Math.sin(dl) * Math.cos(rad(b.lat));
  const x = Math.cos(rad(a.lat)) * Math.sin(rad(b.lat)) - Math.sin(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.cos(dl);
  return (deg(Math.atan2(y, x)) + 360) % 360;
}

const PRESETS = [
  { n: "Barranquilla → Bogotá", a: [10.9685, -74.7813], b: [4.711, -74.0721] },
  { n: "Barranquilla → Madrid", a: [10.9685, -74.7813], b: [40.4168, -3.7038] },
  { n: "Bogotá → Tokio", a: [4.711, -74.0721], b: [35.6762, 139.6503] },
  { n: "Quito → Nairobi (cerca del ecuador)", a: [-0.1807, -78.4678], b: [-1.2921, 36.8219] },
];

const f = (n, d = 2) => n.toLocaleString("es-CO", { minimumFractionDigits: d, maximumFractionDigits: d });

export default function Page() {
  const [v, setV] = useState({ la: "10.9685", oa: "-74.7813", lb: "4.7110", ob: "-74.0721" });
  const [res, setRes] = useState(null);
  const [err, setErr] = useState("");
  const set = (k) => (e) => setV({ ...v, [k]: e.target.value });

  function calcular(vals = v) {
    const [la, oa, lb, ob] = [vals.la, vals.oa, vals.lb, vals.ob].map(Number);
    if ([la, oa, lb, ob].some((x) => Number.isNaN(x))) return setErr("Todos los campos deben ser números."), setRes(null);
    if (Math.abs(la) > 90 || Math.abs(lb) > 90) return setErr("La latitud debe estar entre −90 y 90."), setRes(null);
    if (Math.abs(oa) > 180 || Math.abs(ob) > 180) return setErr("La longitud debe estar entre −180 y 180."), setRes(null);
    setErr("");
    const A = { lat: la, lon: oa }, B = { lat: lb, lon: ob };
    setRes({ A, B, h: haversine(A, B), c: cosenos(A, B), e: equirect(A, B), r: rumbo(A, B) });
  }
  function preset(p) {
    const nv = { la: String(p.a[0]), oa: String(p.a[1]), lb: String(p.b[0]), ob: String(p.b[1]) };
    setV(nv); calcular(nv);
  }

  const filas = res && [
    ["Haversine", res.h, "d = 2R·atan2(√a, √(1−a))"],
    ["Ley esférica de cosenos", res.c, "d = R·arccos(sinφ₁sinφ₂ + cosφ₁cosφ₂cosΔλ)"],
    ["Equirectangular (aprox.)", res.e, "d = R·√((Δλ·cosφm)² + Δφ²)"],
  ];

  return (
    <main>
      <h1>Distancia entre dos puntos de una esfera</h1>
      <p className="s">Ingresa las coordenadas en grados decimales (R = {R} km). Latitud: N+ / S−. Longitud: E+ / O−.</p>
      <div className="g">
        <section className="c">
          <h2>Punto A</h2>
          <label>Latitud φ₁</label><input value={v.la} onChange={set("la")} inputMode="decimal" />
          <label>Longitud λ₁</label><input value={v.oa} onChange={set("oa")} inputMode="decimal" />
        </section>
        <section className="c">
          <h2>Punto B</h2>
          <label>Latitud φ₂</label><input value={v.lb} onChange={set("lb")} inputMode="decimal" />
          <label>Longitud λ₂</label><input value={v.ob} onChange={set("ob")} inputMode="decimal" />
        </section>
      </div>
      <button onClick={() => calcular()}>Calcular distancia</button>
      {PRESETS.map((p) => (<button key={p.n} className="o" onClick={() => preset(p)}>{p.n}</button>))}
      {err && <p className="err">{err}</p>}
      {res && (
        <section className="c" style={{ marginTop: 16 }}>
          <h2>Resultado</h2>
          <p>A = (<code>{f(res.A.lat, 4)}°, {f(res.A.lon, 4)}°</code>) &nbsp; B = (<code>{f(res.B.lat, 4)}°, {f(res.B.lon, 4)}°</code>)</p>
          <table>
            <thead><tr><th>Método</th><th>km</th><th>millas</th><th>Δ vs Haversine</th></tr></thead>
            <tbody>
              {filas.map(([n, d, fm]) => (
                <tr key={n}><td>{n}<br /><code>{fm}</code></td><td>{f(d)}</td><td>{f(d / 1.609344)}</td><td>{f(d - res.h, 3)} km</td></tr>
              ))}
            </tbody>
          </table>
          <p>Rumbo inicial de A hacia B: <code>{f(res.r, 2)}°</code> (0° = Norte, 90° = Este). Ángulo central: <code>{f(deg(res.h / R), 4)}°</code></p>
        </section>
      )}
    </main>
  );
}
