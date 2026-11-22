/* ==========================================================================
   IS IT NICE OUT?  —  app logic

   Data: Open-Meteo (forecast + air quality). No API key. No account.
   Nothing about you leaves this phone except the coordinates needed
   to look up the weather.
   ========================================================================== */

const $ = id => document.getElementById(id);
const r1 = n => Math.round(n);

/* ---------------- small storage wrapper ---------------- */
const mem = {};
const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return mem[k] ?? null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) { mem[k] = v; } }
};

/* ---------------- settings ---------------- */
let metric = store.get("metric") !== "no";
let place = null;                                  // {lat, lon, label}
function readJSON(key, fallback) {
  try { return JSON.parse(store.get(key)) ?? fallback; } catch { return fallback; }
}
let saved = readJSON("saved", []);
if (!Array.isArray(saved)) saved = [];
saved = saved.filter(p => p && Number.isFinite(p.lat) && Number.isFinite(p.lon) && typeof p.label === "string");
const escapeHTML = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let loadId = 0, searchId = 0;
let locationId = 0;
const validNumber = value => typeof value === "number" && Number.isFinite(value);
const wetGroup = group => ["rain", "heavyRain", "drizzle", "thunder", "snow"].includes(group);
const rainPercent = value => validNumber(value) ? `${Math.round(Math.max(0, Math.min(100, value)))}%` : "Unavailable";
function rainContext(group, probability, amount) {
  if (wetGroup(group) && (!validNumber(probability) || probability < 10)) {
    return `${group === "snow" ? "Snow" : group === "drizzle" ? "Drizzle" : "Wet weather"} is forecast${validNumber(probability) ? ` despite the ${rainPercent(probability)} measurable-precipitation chance` : "; the probability is unavailable"}. The weather symbol and probability are separate forecasts; tiny amounts can still make it damp.`;
  }
  if (validNumber(amount) && amount > 0 && probability === 0) return "A small amount of precipitation is forecast despite the 0% probability. The forecast signals differ; 0% is not a guarantee of dry weather.";
  return "";
}
function dayProbability(w, index) {
  const daily = w.daily.precipitation_probability_max?.[index];
  if (validNumber(daily)) return daily;
  const values = w.hourly.time.flatMap((time, i) => time.startsWith(w.daily.time[index]) && validNumber(w.hourly.precipitation_probability?.[i]) ? [w.hourly.precipitation_probability[i]] : []);
  return values.length ? Math.max(...values) : null;
}
function validateForecast(w) {
  if (!w?.current || !validNumber(w.current.temperature_2m) || typeof w.current.time !== "string" || !w.daily?.time?.length || !w.hourly?.time?.length) throw new Error("The forecast is incomplete. Please try refreshing.");
  for (const key of ["temperature_2m_min", "temperature_2m_max", "weather_code", "sunrise", "sunset", "daylight_duration", "wind_speed_10m_max", "uv_index_max"]) {
    if (!Array.isArray(w.daily[key]) || w.daily[key].length !== w.daily.time.length) throw new Error("The daily forecast is incomplete. Please refresh.");
  }
  if (!Array.isArray(w.hourly.temperature_2m) || w.hourly.temperature_2m.length !== w.hourly.time.length) throw new Error("The hourly forecast is incomplete. Please refresh.");
}

function packingItems(g, rain, cold, uv, wind, hot, amount = 0) {
  const wet = rain >= 45 || wetGroup(g) || amount > 0;
  const wetReason = wetGroup(g) ? `${g === "drizzle" ? "Drizzle" : g === "snow" ? "Snow" : "Rain or showers"} forecast${validNumber(rain) && rain >= 10 ? ` · ${rainPercent(rain)} rain chance` : ""}.` : validNumber(rain) && rain >= 45 ? `${rainPercent(rain)} rain chance.` : "Some precipitation is forecast.";
  return [
    { id: "umbrella", name: "Umbrella", needed: wet && wind < 38 && g !== "thunder" && g !== "snow", why: wetReason, skip: wet ? "Choose a hooded waterproof in these conditions." : "Rain looks unlikely." },
    { id: "coat", name: "Coat", needed: cold <= 10, why: `Feels as cool as ${r1(metric ? cold : cold * 1.8 + 32)}°${metric ? "C" : "F"}${cold <= 2 ? " — choose a warm coat" : " — take a coat"}.`, skip: "Looks warm enough without a coat." },
    { id: "sweater", name: "Sweater / jumper", needed: cold > 10 && cold <= 18, why: `Feels as cool as ${r1(metric ? cold : cold * 1.8 + 32)}°${metric ? "C" : "F"}; a layer will help.`, skip: cold <= 10 ? "An optional extra layer under your coat." : "Mild enough without an extra layer." },
    { id: "waterproof", name: "Hooded waterproof", needed: wet, why: wind >= 38 ? "Wind and wet weather make an umbrella impractical." : g === "thunder" ? "Thunderstorms forecast; plan indoor shelter rather than relying on an umbrella." : "Stay dry; an alternative to an umbrella in light rain.", skip: "No wet weather expected." },
    { id: "gloves", name: "Gloves", needed: cold <= 2 || g === "snow", why: "Keep your hands warm.", skip: "Not cold enough to need them." },
    { id: "sun", name: "Sun cream & sunglasses", needed: uv >= 3, why: `UV reaches ${r1(uv)} today.`, skip: "UV is low today." },
    { id: "water", name: "Water bottle", needed: hot >= 24, why: "Take water for the warmer hours.", skip: "Optional, especially for a longer walk." }
  ];
}

function packingHTML(items, heading = "WHAT TO TAKE", id = "take-heading", intro = "Suggested for today’s weather") {
  const needed = items.filter(item => item.needed);
  const row = item => `<li class="pack-row"><span class="pack-icon" aria-hidden="true">${({umbrella:"☂", coat:"🧥", sweater:"👕", waterproof:"🌧", gloves:"🧤", sun:"☀", water:"💧"})[item.id]}</span><span><strong>${item.name}</strong><small>${item.why}</small></span></li>`;
  return `<section class="card packing" aria-labelledby="${id}"><h2 id="${id}">${heading}</h2><p class="pack-intro">${intro}</p>${needed.length ? `<ul class="pack-list">${needed.map(row).join("")}</ul>` : '<p class="line">Travel light — no weather extras suggested for this period.</p>'}<p class="pack-note">Based on feels-like temperature, precipitation, wind and UV. Bring extra layers for a longer outing.</p></section>`;
}

function periodItems(w, day, period = "day") {
  const {daily:D, hourly:H, current:C} = w;
  const today = D.time[day] === C.time.slice(0, 10);
  const currentHour = C.time.slice(0, 13);
  const indices = H.time.flatMap((time, i) => {
    if (!time.startsWith(D.time[day])) return [];
    if (today && time.slice(0, 13) < currentHour) return [];
    if (!today && (time < D.sunrise[day] || time > D.sunset[day])) return [];
    return [i];
  });
  const selected = period === "now" ? indices.slice(0,3) : period === "later" ? indices.slice(3) : indices;
  if (!selected.length && period === "later") return null;
  const values = (key, fallback) => {const list = selected.map(i => H[key]?.[i]).filter(validNumber); return list.length ? list : [fallback].filter(validNumber);};
  const asC = value => metric ? value : (value-32)/1.8;
  const apparent = values("apparent_temperature", D.apparent_temperature_min?.[day] ?? D.temperature_2m_min[day]);
  if (today && period !== "later" && validNumber(C.apparent_temperature)) apparent.push(C.apparent_temperature);
  const groups = selected.map(i => code(H.weather_code?.[i])[2]);
  if (today && period !== "later") groups.unshift(code(C.weather_code)[2]);
  if (!selected.length) groups.push(code(D.weather_code[day])[2]);
  const group = ["thunder","snow","heavyRain","rain","drizzle"].find(g => groups.includes(g)) || groups[0] || "cloud";
  const probabilities = values("precipitation_probability", dayProbability(w,day));
  const amount = selected.length ? values("precipitation", 0).reduce((a,b)=>a+b,0) : D.precipitation_sum?.[day] || 0;
  return packingItems(group, probabilities.length ? Math.max(...probabilities) : null, asC(Math.min(...apparent)), Math.max(...values("uv_index",D.uv_index_max[day])), Math.max(...values("wind_speed_10m",D.wind_speed_10m_max[day]))*(metric?1:1.609344), asC(Math.max(...values("temperature_2m",D.temperature_2m_max[day]))), amount);
}

/* ---------------- weather codes ---------------- */
const CODES = {
  0:["Clear sky","☀️","clear"],      1:["Mostly clear","🌤️","clear"],
  2:["Part cloudy","⛅","cloud"],     3:["Overcast","☁️","cloud"],
  45:["Fog","🌫️","fog"],             48:["Freezing fog","🌫️","fog"],
  51:["Light drizzle","🌦️","drizzle"],53:["Drizzle","🌦️","drizzle"],
  55:["Heavy drizzle","🌦️","drizzle"],56:["Icy drizzle","🌧️","drizzle"],
  57:["Icy drizzle","🌧️","drizzle"], 61:["Light rain","🌦️","rain"],
  63:["Rain","🌧️","rain"],           65:["Heavy rain","🌧️","heavyRain"],
  66:["Freezing rain","🌧️","rain"],  67:["Freezing rain","🌧️","rain"],
  71:["Light snow","🌨️","snow"],     73:["Snow","🌨️","snow"],
  75:["Heavy snow","❄️","snow"],      77:["Snow grains","🌨️","snow"],
  80:["Showers","🌦️","rain"],        81:["Showers","🌧️","rain"],
  82:["Heavy showers","⛈️","heavyRain"],85:["Snow showers","🌨️","snow"],
  86:["Snow showers","❄️","snow"],    95:["Thunderstorm","⛈️","thunder"],
  96:["Thunder, hail","⛈️","thunder"],99:["Thunder, hail","⛈️","thunder"]
};
const code = c => CODES[c] || ["Unknown","🌡️","cloud"];

/* condition colours — two tones per weather type */
const TONE = {
  clear:     ["#D98E2B", "#B8721C"],
  cloud:     ["#4C616B", "#3A4C55"],
  rain:      ["#2F6B78", "#1D4652"],
  heavyRain: ["#1E4A57", "#12333E"],
  drizzle:   ["#3D6470", "#2A4C56"],
  snow:      ["#6B8496", "#516A7C"],
  fog:       ["#66757A", "#4D5A5F"],
  thunder:   ["#3E3163", "#291F47"],
  night:     ["#22305E", "#161F42"]
};

/* ---------------- jokes: rotate weekly ---------------- */
function weekNo(d) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
  return Math.ceil(((t - Date.UTC(t.getUTCFullYear(), 0, 1)) / 86400000 + 1) / 7);
}
function pickJoke(list, dateStr) {
  const d = new Date(dateStr + "T12:00");
  const i = weekNo(d) * 7 + d.getDay();      // shifts every week AND every day
  return list[i % list.length];
}
function listFor(group, tempC, windKmh, isDay) {
  if (group === "thunder")  return JOKES.thunder;
  if (group === "snow")     return JOKES.snow;
  if (group === "heavyRain")return JOKES.heavyRain;
  if (group === "rain")     return JOKES.rain;
  if (group === "drizzle")  return JOKES.drizzle;
  if (group === "fog")      return JOKES.fog;
  if (windKmh >= 38)        return JOKES.windy;
  if (tempC <= 0)           return JOKES.freezing;
  if (tempC >= 27)          return JOKES.hot;
  if (group === "cloud")    return tempC <= 6 ? JOKES.cold : JOKES.cloudy;
  if (!isDay)               return JOKES.clearNight;
  if (tempC >= 21)          return JOKES.warm;
  if (tempC <= 4)           return JOKES.cold;
  if (tempC <= 10)          return JOKES.chilly;
  return JOKES.mild;
}

/* ---------------- moon phase (pure maths, no internet) ---------------- */
function moon(date) {
  const synodic = 29.530588853;
  const ref = Date.UTC(2000, 0, 6, 18, 14);
  let age = (((date - ref) / 86400000) % synodic + synodic) % synodic;
  const frac = age / synodic;
  const names = ["New moon","Waxing crescent","First quarter","Waxing gibbous",
                 "Full moon","Waning gibbous","Last quarter","Waning crescent"];
  const name = names[Math.floor(frac * 8 + 0.5) % 8];
  const lit = Math.round((1 - Math.cos(frac * 2 * Math.PI)) / 2 * 100);
  return { name, lit, frac, age: age.toFixed(1) };
}
function moonCss(m) {
  const side = m.frac < 0.5 ? "right" : "left";   // waxing lights the right in the north
  return `background: linear-gradient(to ${side}, #EDE7D4 0 ${m.lit}%, #22303A ${m.lit}% 100%)`;
}

/* ---------------- best time to be outside ---------------- */
function bestWindow(H, from, sunset) {
  let best = null;
  for (let i = from; i < Math.min(from + 24, H.time.length - 1); i++) {
    const t = new Date(H.time[i]);
    if (new Date(H.time[i + 1]).getTime() + 3600000 > sunset) break;
    const rain = ((H.precipitation_probability?.[i] ?? 50) + (H.precipitation_probability?.[i + 1] ?? 50)) / 2;
    const rawTemp = (H.temperature_2m[i] + H.temperature_2m[i + 1]) / 2;
    const temp = metric ? rawTemp : (rawTemp - 32) / 1.8;
    const wind = H.wind_speed_10m[i] * (metric ? 1 : 1.609344);
    const target = 18;
    const wetPenalty = [i,i+1].some(index => wetGroup(code(H.weather_code?.[index])[2]) || (H.precipitation?.[index] ?? 0)>0) ? 35 : 0;
    const score = 100 - rain * 1.6 - Math.abs(temp - target) * 1.8 - wind * 0.35 - wetPenalty;
    if (!best || score > best.score) best = { score, i, t };
  }
  return best;
}

/* ---------------- the fetch ---------------- */
async function load(p, opts = {}) {
  const requestId = ++loadId;
  ++locationId;
  const requestedMetric = metric;
  place = p;
  $("place").textContent = p.label;
  if (!opts.quiet) $("app").innerHTML = '<div class="boot"><div class="boot-dot"></div>Reading the sky</div>';

  const u = metric
    ? "&temperature_unit=celsius&wind_speed_unit=kmh"
    : "&temperature_unit=fahrenheit&wind_speed_unit=mph";

  const fUrl = "https://api.open-meteo.com/v1/forecast"
    + `?latitude=${p.lat}&longitude=${p.lon}`
    + "&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,"
    + "wind_speed_10m,wind_direction_10m,is_day,surface_pressure,cloud_cover"
    + "&hourly=temperature_2m,apparent_temperature,precipitation_probability,precipitation,weather_code,wind_speed_10m,uv_index"
    + "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,"
    + "precipitation_sum,apparent_temperature_min,sunrise,sunset,uv_index_max,wind_speed_10m_max,daylight_duration"
    + "&past_days=1&forecast_days=8&timezone=auto" + u;

  const aUrl = "https://air-quality-api.open-meteo.com/v1/air-quality"
    + `?latitude=${p.lat}&longitude=${p.lon}`
    + "&current=european_aqi,pm2_5,grass_pollen,birch_pollen,alder_pollen&timezone=auto";

  try {
    const [fRes, air] = await Promise.all([
      fetch(fUrl, { signal: AbortSignal.timeout(15000) }),
      fetch(aUrl, { signal: AbortSignal.timeout(5000) }).then(r => r.ok ? r.json() : null).catch(() => null)
    ]);
    if (!fRes.ok) throw new Error("HTTP " + fRes.status + " — the request was wrong");

    const w = await fRes.json();
    if (requestId !== loadId || requestedMetric !== metric) return;
    validateForecast(w);

    store.set("cache", JSON.stringify({ w, air, p, at: Date.now(), metric }));
    $("offline-note").hidden = true;
    render(w, air);

  } catch (e) {
    if (requestId !== loadId || requestedMetric !== metric) return;
    const cached = store.get("cache");
    if (cached) {
      try {
        const c = JSON.parse(cached);
        if (c.metric !== metric || c.p.lat !== p.lat || c.p.lon !== p.lon) throw new Error("Cached forecast does not match this place and unit.");
        validateForecast(c.w);
        const mins = Math.max(0, Math.round((Date.now() - c.at) / 60000));
        $("offline-note").hidden = false;
        $("offline-note").textContent = `Couldn't refresh — saved forecast from ${
          mins < 60 ? mins + " min" : Math.round(mins / 60) + " hr"} ago${mins >= 180 ? "; this forecast is stale and conditions may have changed" : ""}.`;
        render(c.w, c.air);
        return;
      } catch (_) { /* fall through to error */ }
    }
    showError(e);
  }
}

function showError(e) {
  const blocked = e instanceof TypeError;
  $("app").innerHTML = `<div class="err">
    <b>Couldn't get the weather</b>
    ${blocked ? "Check your connection and try again. You can also choose another town." : "The weather service is unavailable or returned an incomplete forecast. Please try again."}
    <div class="why">${escapeHTML(e.name)}: ${escapeHTML(e.message)}</div>
    <button onclick="if (place) load(place); else gps()">Try again</button>
  </div>`;
}

/* ---------------- render ---------------- */
function render(w, air) {
  const C = w.current, D = w.daily, H = w.hourly;
  const T = metric ? "°C" : "°F";
  const S = metric ? "km/h" : "mph";

  // Locate the selected place's calendar day instead of assuming a fixed index.
  const found = D.time.indexOf(C.time.slice(0,10));
  const TODAY = found >= 0 ? found : 0, Y = Math.max(0,TODAY-1);
  const todayProbability = dayProbability(w,TODAY);
  const todayRainNote = rainContext(code(D.weather_code[TODAY])[2],todayProbability,D.precipitation_sum?.[TODAY]);
  const laterItems = periodItems(w,TODAY,"later");

  const [condName, condEmoji, g] = code(C.weather_code);
  const isDay = C.is_day === 1;
  const tone = (!isDay && (g === "clear" || g === "cloud")) ? TONE.night : (TONE[g] || TONE.cloud);
  document.documentElement.style.setProperty("--cond", tone[0]);
  document.documentElement.style.setProperty("--cond-2", tone[1]);
  document.querySelector('meta[name=theme-color]').setAttribute("content", tone[0]);

  const tempC = metric ? C.temperature_2m : (C.temperature_2m - 32) / 1.8;
  const windKmh = metric ? C.wind_speed_10m : C.wind_speed_10m * 1.609;
  const quip = pickJoke(listFor(g, tempC, windKmh, isDay), D.time[TODAY]);

  /* ---- vs yesterday ---- */
  const diff = D.temperature_2m_max[TODAY] - D.temperature_2m_max[Y];
  const vsY = Math.abs(diff) < 1.5
    ? "About the same as yesterday."
    : `<b>${Math.abs(r1(diff))}${T.slice(0,2)} ${diff > 0 ? "warmer" : "colder"}</b> than yesterday.`;

  /* ---- hours from now ---- */
  // API timestamps are wall-clock times in the selected place, not the device timezone.
  const now = new Date(C.time);
  let nowIdx = H.time.findLastIndex(t => t <= C.time);
  if (nowIdx < 0) nowIdx = 0;

  /* ---- when does rain start ---- */
  let rainLine = "No wet weather indicated in the next 12 hours. Forecasts can change.";
  let hasRainProbability = false;
  for (let i = nowIdx; i < Math.min(nowIdx + 13, H.time.length); i++) {
    if (validNumber(H.precipitation_probability?.[i])) hasRainProbability = true;
    if ((H.precipitation_probability?.[i] ?? 0) >= 45 || wetGroup(code(H.weather_code?.[i])[2]) || (H.precipitation?.[i] ?? 0) > 0 || (i === nowIdx && wetGroup(g))) {
      const t = new Date(H.time[i]);
      rainLine = i <= nowIdx + 1
        ? `${g === "snow" ? "Snow" : g === "drizzle" ? "Drizzle" : "Wet weather"} is indicated around now. Take something to keep dry.`
        : `Wet weather is possible around <b>${t.getHours()}:00</b>. Take a waterproof if you'll still be out.`;
      break;
    }
  }
  if (!hasRainProbability && rainLine.startsWith("No wet")) rainLine = "Rain probabilities are unavailable. Check the hourly conditions before heading out.";

  /* ---- best window ---- */
  const sunset = new Date(D.sunset[TODAY]);
  const bw = bestWindow(H, nowIdx, sunset);
  const bestLine = bw && bw.score > 25
    ? `Nicest stretch left today looks like <b>${bw.t.getHours()}:00–${bw.t.getHours() + 2}:00</b>.`
    : "No standout good window left today.";

  /* ---- sun ---- */
  const sr = new Date(D.sunrise[TODAY]), ss = sunset;
  const hh = d => `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
  const dl = D.daylight_duration[TODAY] / 3600;
  const dlY = D.daylight_duration[Y] / 3600;
  const dlDiff = Math.round((dl - dlY) * 60);
  const nextSun = now < sr ? sr : now < ss ? ss : new Date(D.sunrise[TODAY + 1]);
  const until = nextSun - now;
  const untilLabel = now >= sr && now < ss ? "Sunset in" : "Sunrise in";
  const untilTxt = `${Math.floor(until / 3600000)}h ${Math.floor(until % 3600000 / 60000)}m`;

  const m = moon(now);

  /* ---- chart: 24h temp line + rain bars ---- */
  const N = 24, W = 520, Ht = 150, padT = 18, padB = 30;
  const slice = [];
  for (let i = nowIdx; i < Math.min(nowIdx + N, H.time.length); i++) slice.push(i);
  const temps = slice.map(i => H.temperature_2m[i]);
  const lo = Math.min(...temps), hi = Math.max(...temps);
  const span = Math.max(1, hi - lo);
  const x = k => (k / Math.max(1,slice.length - 1)) * (W - 24) + 12;
  const y = t => padT + (1 - (t - lo) / span) * (Ht - padT - padB);

  const line = slice.map((idx, k) => `${x(k)},${y(H.temperature_2m[idx])}`).join(" ");
  const bars = slice.map((idx, k) => {
    const p = H.precipitation_probability?.[idx];
    if (!p) return "";
    const h = (p / 100) * 22;
    return `<rect x="${x(k) - 4}" y="${Ht - padB + 6 - h}" width="8" height="${h}" fill="var(--aqua)" opacity="0.55"/>`;
  }).join("");
  const labels = slice.map((idx, k) => {
    if (k % 4 !== 0) return "";
    const t = new Date(H.time[idx]);
    return `<text x="${x(k)}" y="${Ht - 4}" fill="rgba(242,245,244,0.38)" font-size="11" text-anchor="middle">${k === 0 ? "now" : t.getHours()}</text>`;
  }).join("");
  const dots = slice.map((idx, k) =>
    (k === 0 || k === slice.length - 1 || H.temperature_2m[idx] === hi || H.temperature_2m[idx] === lo)
      ? `<circle cx="${x(k)}" cy="${y(H.temperature_2m[idx])}" r="3" fill="var(--gold)"/>
         <text x="${x(k)}" y="${y(H.temperature_2m[idx]) - 9}" fill="var(--text)" font-size="11.5" text-anchor="middle">${r1(H.temperature_2m[idx])}°</text>`
      : "").join("");

  /* ---- air quality ---- */
  let airHtml = "";
  if (air && air.current && Number.isFinite(air.current.european_aqi)) {
    const a = air.current;
    const aqi = a.european_aqi ?? 0;
    const cls = aqi <= 20 ? "" : aqi <= 40 ? "mid" : "bad";
    const word = aqi <= 20 ? "Good" : aqi <= 40 ? "Fair" : aqi <= 60 ? "Moderate" : "Poor";
    const pollens = [["Grass", a.grass_pollen], ["Birch", a.birch_pollen], ["Alder", a.alder_pollen]]
      .filter(([, v]) => v != null && v > 0);
    airHtml = `<div class="card">
      <h2>AIR</h2>
      <div class="line">Air quality is <b>${word.toLowerCase()}</b> right now.</div>
      <div class="meter"><i class="${cls}" style="width:${Math.min(100, aqi)}%"></i></div>
      <div class="kv" style="margin-top:12px"><span>Fine particles</span><span>${(a.pm2_5 ?? 0).toFixed(1)} µg/m³</span></div>
      ${pollens.map(([n, v]) => `<div class="kv"><span>${n} pollen</span><span>${
        v < 1 ? "none" : v < 10 ? "low" : v < 50 ? "moderate" : "high"}</span></div>`).join("")}
    </div>`;
  }

  /* ---- the week ---- */
  const wkLo = Math.min(...D.temperature_2m_min.slice(TODAY));
  const wkHi = Math.max(...D.temperature_2m_max.slice(TODAY));
  const names = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  let week = "";
  for (let i = TODAY; i < D.time.length; i++) {
    const dt = new Date(D.time[i] + "T12:00");
    const [dn, de, dg] = code(D.weather_code[i]);
    const mid = (D.temperature_2m_max[i] + D.temperature_2m_min[i]) / 2;
    const midC = metric ? mid : (mid - 32) / 1.8;
    const dwind = metric ? D.wind_speed_10m_max[i] : D.wind_speed_10m_max[i] * 1.609;
    const dj = pickJoke(listFor(dg, midC, dwind, true), D.time[i]);
    const rp = dayProbability(w,i);
    const rainNote = rainContext(dg,rp,D.precipitation_sum?.[i]);
    const items = periodItems(w,i).filter(item=>item.needed);
    const left = ((D.temperature_2m_min[i] - wkLo) / Math.max(1, wkHi - wkLo)) * 100;
    const wide = ((D.temperature_2m_max[i] - D.temperature_2m_min[i]) / Math.max(1, wkHi - wkLo)) * 100;
    const dtone = TONE[dg] || TONE.cloud;
    week += `<button class="day" aria-expanded="false" onclick="toggleDay(this)">
      <div class="day-top">
        <span class="day-swatch" style="background:${dtone[0]}"></span>
        <span class="day-name">${i === TODAY ? "Today" : names[dt.getDay()]}</span>
        <span class="day-em">${de}</span>
        <span class="day-rain" aria-label="Chance of measurable precipitation: ${rainPercent(rp)}">${rainPercent(rp)}</span>
        <span class="day-bar"><i style="left:${left}%;width:${Math.max(6, wide)}%"></i></span>
        <span class="day-t">${r1(D.temperature_2m_max[i])}° <i>${r1(D.temperature_2m_min[i])}°</i></span>
      </div>
      <div class="day-quip">${dj}</div>
      ${rainNote ? `<div class="day-rain-note">${rainNote}</div>` : ""}
      <div class="day-more" hidden>
        ${dn} · wind to ${r1(D.wind_speed_10m_max[i])} ${S} · UV ${r1(D.uv_index_max[i])}
        · precipitation ${validNumber(D.precipitation_sum?.[i]) ? D.precipitation_sum[i].toFixed(1) + " mm" : "unavailable"}
        · light ${hh(new Date(D.sunrise[i]))}–${hh(new Date(D.sunset[i]))}
        <span class="day-items"><strong>Suggested ${i === TODAY ? "for the rest of today" : "for daytime"}:</strong> ${items.length ? items.map(item=>`${item.name} — ${item.why}`).join(" · ") : "No weather extras suggested."}</span>
      </div>
    </button>`;
  }

  const dirs = ["N","NE","E","SE","S","SW","W","NW"];
  const dir = dirs[Math.round(C.wind_direction_10m / 45) % 8];

  $("app").innerHTML = `<div class="fade">

    <section class="hero"><div class="hero-in">
      <div class="temp-row">
        <div class="temp">${r1(C.temperature_2m)}<sup>${T}</sup></div>
        <div class="temp-side">
          <b>${condEmoji} ${condName}</b>
          feels like ${r1(C.apparent_temperature)}°<br>
          ${r1(D.temperature_2m_max[TODAY])}° high · ${r1(D.temperature_2m_min[TODAY])}° low
        </div>
      </div>
      <p class="quip">${quip}</p>
    </div></section>

    ${packingHTML(periodItems(w,TODAY,"now"),"WHAT TO TAKE NOW","take-heading","Suggested for the next 3 hours, including how it feels now")}
    ${laterItems ? packingHTML(laterItems,"LATER TODAY","later-heading","For the remaining hours after that — check before a longer outing") : ""}

    <div class="card">
      <h2>TODAY</h2>
      <div class="line">${rainLine}</div>
      ${todayRainNote ? `<p class="rain-context">${todayRainNote}</p>` : ""}
      <div class="line" style="margin-top:7px">${bestLine}</div>
      <div class="line" style="margin-top:7px">${vsY}</div>
    </div>

    <div class="card flush">
      <h2 class="pad">NEXT 24 HOURS</h2>
      <svg class="chart" viewBox="0 0 ${W} ${Ht}" preserveAspectRatio="none">
        ${bars}
        <polyline points="${line}" fill="none" stroke="var(--gold)" stroke-width="2"
          stroke-linejoin="round" stroke-linecap="round"/>
        ${dots}${labels}
      </svg>
      <div class="pad" style="font-size:12.5px;color:var(--faint)">Gold line is temperature. Blue bars are chance of rain.</div>
    </div>

    <div class="tiles">
      <div class="tile"><div class="tile-k">WIND</div><div class="tile-v">${r1(C.wind_speed_10m)} <small>${S} ${dir}</small></div></div>
      <div class="tile"><div class="tile-k">HUMIDITY</div><div class="tile-v">${C.relative_humidity_2m}<small>%</small></div></div>
      <div class="tile"><div class="tile-k">TODAY'S RAIN CHANCE</div><div class="tile-v">${rainPercent(todayProbability)}</div></div>
      <div class="tile"><div class="tile-k">UV INDEX</div><div class="tile-v">${r1(D.uv_index_max[TODAY])}</div></div>
      <div class="tile"><div class="tile-k">CLOUD</div><div class="tile-v">${C.cloud_cover}<small>%</small></div></div>
      <div class="tile"><div class="tile-k">PRESSURE</div><div class="tile-v">${r1(C.surface_pressure)} <small>hPa</small></div></div>
    </div>

    ${airHtml}

    <div class="card">
      <h2>SUN &amp; MOON</h2>
      <div class="kv"><span>${untilLabel}</span><span>${untilTxt}</span></div>
      <div class="kv"><span>Sunrise / sunset</span><span>${hh(sr)} · ${hh(ss)}</span></div>
      <div class="kv"><span>Daylight</span><span>${dl.toFixed(1)} hrs (${dlDiff >= 0 ? "+" : ""}${dlDiff} min on yesterday)</span></div>
      <div class="moon-row" style="margin-top:14px">
        <span class="moon" style="${moonCss(m)}"></span>
        <span class="line">${m.name}<br><span style="color:var(--soft);font-size:14px">${m.lit}% lit · ${m.age} days old</span></span>
      </div>
    </div>

    <div class="card flush">
      <h2 class="pad">THE WEEK</h2>
      <p class="pad rain-explainer">Percentages are the highest hourly chance of more than 0.1 mm of precipitation. Light drizzle can still be forecast at 0%. Tap a day for details and suggested items.</p>
      ${week}
    </div>

    <div class="card">
      <h2>ABOUT</h2>
      <div class="line" style="color:var(--soft);font-size:14.5px">
        ${JOKES._count} different sentences in here, rotating every week — so the same
        weather gets a different comment next time round.
      </div>
    </div>
  </div>`;
}

function toggleDay(btn) {
  const m = btn.querySelector(".day-more");
  m.hidden = !m.hidden;
  btn.setAttribute("aria-expanded", String(!m.hidden));
}

/* ---------------- places ---------------- */
async function nameOf(lat, lon) {
  try {
    const r = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`, { signal: AbortSignal.timeout(5000) });
    const j = await r.json();
    return j.city || j.locality || j.principalSubdivision || "My location";
  } catch (e) { return "My location"; }
}

function gps() {
  const requestId = ++locationId;
  $("place").textContent = "Finding you";
  $("drawer").hidden = true;
  if (!navigator.geolocation) return noGps("This browser won't share a location.");
  navigator.geolocation.getCurrentPosition(
    async pos => {
      const { latitude: lat, longitude: lon } = pos.coords;
      const label = await nameOf(lat,lon);
      if (requestId !== locationId) return;
      load({ lat: +lat.toFixed(3), lon: +lon.toFixed(3), label });
    },
    err => {if (requestId === locationId) noGps("Location unavailable (" + err.message + ").");},
    { timeout: 10000, maximumAge: 300000, enableHighAccuracy: false }
  );
}

function noGps(why) {
  $("place").textContent = "Pick a place";
  $("drawer").hidden = false;
  $("app").innerHTML = `<div class="err"><b>No location</b>${escapeHTML(why)}
    Search for a town above instead — it works exactly the same.</div>`;
}

async function search(q) {
  const requestId = ++searchId;
  if (!q || q.length < 2) return void ($("hits").innerHTML = "");

  const co = q.match(/^\s*(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)\s*$/);
  if (co) {
    if (Math.abs(+co[1]) > 90 || Math.abs(+co[2]) > 180) { $("hits").textContent = "Latitude must be between −90 and 90, longitude between −180 and 180."; return; }
    choose({ lat: +co[1], lon: +co[2], label: "Those coordinates" }); return;
  }

  $("hits").innerHTML = '<div class="note">Searching…</div>';
  try {
    const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q.trim())}&count=6&language=en&format=json`, {signal:AbortSignal.timeout(10000)});
    if (!r.ok) throw new Error("search service returned " + r.status);
    const hits = (await r.json()).results || [];
    if (requestId !== searchId) return;
    if (!hits.length) { $("hits").innerHTML = '<div class="note">No place by that name. Try a bigger town nearby.</div>'; return; }
    $("hits").innerHTML = hits.map(p => `<button class="hit"
      data-lat="${p.latitude}" data-lon="${p.longitude}" data-n="${escapeHTML(p.name)}">
      ${escapeHTML([p.name, p.admin1, p.country].filter(Boolean).join(", "))}</button>`).join("");
  } catch (e) {
    if (requestId !== searchId) return;
    $("hits").innerHTML = `<div class="note">Search failed — ${escapeHTML(e.message)}.<br><br>
      Workaround: type coordinates like <code>52.06, -1.34</code> and it'll load those directly.</div>`;
  }
}

function choose(p) {
  ++searchId;
  saved = [p, ...saved.filter(s => s.label !== p.label)].slice(0, 6);
  store.set("saved", JSON.stringify(saved));
  $("drawer").hidden = true;
  $("hits").innerHTML = "";
  $("q").value = "";
  drawSaved();
  load(p);
}

function drawSaved() {
  $("saved-label").hidden = !saved.length;
  $("saved").innerHTML = saved.map((s, i) => `<div class="saved-row">
    <button class="saved-go" style="flex:1" data-go="${i}">${escapeHTML(s.label)}</button>
    <button class="x" data-del="${i}" aria-label="Remove ${escapeHTML(s.label)}">✕</button></div>`).join("");
}

/* ---------------- buttons ---------------- */
$("place-btn").onclick = () => {
  $("drawer").hidden = !$("drawer").hidden;
  if (!$("drawer").hidden) $("q").focus();
};
$("use-gps").onclick = gps;
$("refresh").onclick = () => {
  if (navigator.vibrate) navigator.vibrate(12);
  if (place) load(place);
};
$("units").onclick = () => {
  metric = !metric;
  store.set("metric", metric ? "yes" : "no");
  $("units").textContent = metric ? "°C" : "°F";
  if (place) load(place);
};
$("share").onclick = async () => {
  const q = document.querySelector(".quip");
  const txt = q ? `${place.label}: ${q.textContent}` : "Weather";
  try {
    if (navigator.share) await navigator.share({ title: "Is It Nice Out?", text: txt });
    else { await navigator.clipboard.writeText(txt); $("share").textContent = "✓"; setTimeout(() => $("share").textContent = "↗", 1200); }
  } catch (e) { /* they cancelled, that's fine */ }
};

let t;
$("q").addEventListener("input", e => { ++searchId; clearTimeout(t); const v = e.target.value.trim(); t = setTimeout(() => search(v), 350); });
$("q").addEventListener("keydown", e => { if (e.key === "Enter") { clearTimeout(t); search(e.target.value.trim()); } });
$("hits").addEventListener("click", e => {
  const b = e.target.closest(".hit");
  if (b) choose({ lat: +b.dataset.lat, lon: +b.dataset.lon, label: b.dataset.n });
});
$("saved").addEventListener("click", e => {
  const del = e.target.dataset.del, go = e.target.dataset.go;
  if (del !== undefined) {
    saved.splice(+del, 1); store.set("saved", JSON.stringify(saved)); drawSaved();
  } else if (go !== undefined) {
    choose(saved[+go]);
  }
});

/* pull down to refresh */
let y0 = null;
addEventListener("touchstart", e => { y0 = scrollY === 0 ? e.touches[0].clientY : null; }, { passive: true });
addEventListener("touchend", e => {
  if (y0 !== null && e.changedTouches[0].clientY - y0 > 110 && place) {
    if (navigator.vibrate) navigator.vibrate(12);
    load(place, { quiet: true });
  }
  y0 = null;
}, { passive: true });

/* refresh when you come back to the app */
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && place) load(place, { quiet: true });
});

/* ---------------- start ---------------- */
$("units").textContent = metric ? "°C" : "°F";
drawSaved();

(function start() {
  const cached = store.get("cache");
  if (cached) {
    try {
      const c = JSON.parse(cached);
      place = c.p; $("place").textContent = c.p.label;
      if (c.metric === metric) render(c.w, c.air);        // instant, then refresh below
      load(c.p, { quiet: true });
      return;
    } catch (e) { /* ignore and locate */ }
  }
  gps();
})();

if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  const alreadyControlled=!!navigator.serviceWorker.controller;
  let reloading=false;
  navigator.serviceWorker.addEventListener("controllerchange",()=>{
    if (alreadyControlled && !reloading) {reloading=true;location.reload();}
  });
  addEventListener("load", () => navigator.serviceWorker.register("sw.js",{updateViaCache:"none"}).catch(() => {}));
}
