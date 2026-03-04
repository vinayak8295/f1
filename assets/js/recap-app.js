// ─── STATE ───────────────────────────────────────────────────────────────────
let raceData = null;
let currentLap = 0;
let isPlaying = false;
let playTimer = null;
let playbackSpeed = 3; // seconds per lap (fast recap = 3min / 71 laps ≈ 2.5s/lap)
let totalLaps = 0;
let shownEvents = new Set();
let activeLapChip = 0;
let activeLapChipEl = null;
let leaderboardPrevPosByCode = {};
let leaderboardLastOrderSignature = '';
let leaderboardPrevOrderCodes = [];
let leaderboardFlipToken = 0;
let leaderboardLastAnimatedSwapKey = '';
let leaderboardLastAnimatedSwapAt = 0;
const leaderboardRowCache = new Map();
const leaderboardChangeTimers = new Map();

const TEAM_COLORS = {
  'Red Bull': '#1e3a5f',
  'Ferrari': '#dc143c',
  'Mercedes': '#00d2be',
  'McLaren': '#ff8700',
  'Aston Martin': '#006f62',
  'Alpine': '#0090ff',
  'Williams': '#005aff',
  'AlphaTauri': '#2b4562',
  'Alfa Romeo': '#900000',
  'Haas': '#ffffff',
  'RB': '#2b4562',
  'Sauber': '#52e252',
};

// ─── SAMPLE DATA ─────────────────────────────────────────────────────────────
const SAMPLE_DATA = {
  race: {
    name: "Austrian Grand Prix",
    year: 2024,
    circuit: "Red Bull Ring",
    laps: 71,
    date: "June 30, 2024",
    weather: "Sunny, 28°C"
  },
  drivers: [
    { pos: 1, code: "VER", name: "Max Verstappen", team: "Red Bull", number: 1, gap: "LEADER", bestLap: "1:07.275", tyre: "H", tyreAge: 26 },
    { pos: 2, code: "NOR", name: "Lando Norris", team: "McLaren", number: 4, gap: "+9.456", bestLap: "1:07.481", tyre: "H", tyreAge: 26 },
    { pos: 3, code: "LEC", name: "Charles Leclerc", team: "Ferrari", number: 16, gap: "+14.891", bestLap: "1:07.903", tyre: "H", tyreAge: 14 },
    { pos: 4, code: "SAI", name: "Carlos Sainz", team: "Ferrari", number: 55, gap: "+21.234", bestLap: "1:08.105", tyre: "M", tyreAge: 27 },
    { pos: 5, code: "HAM", name: "Lewis Hamilton", team: "Mercedes", number: 44, gap: "+35.102", bestLap: "1:08.342", tyre: "H", tyreAge: 20 },
    { pos: 6, code: "RUS", name: "George Russell", team: "Mercedes", number: 63, gap: "+48.567", bestLap: "1:08.601", tyre: "S", tyreAge: 8 },
    { pos: 7, code: "PIA", name: "Oscar Piastri", team: "McLaren", number: 81, gap: "+54.230", bestLap: "1:08.712", tyre: "H", tyreAge: 26 },
    { pos: 8, code: "ALO", name: "Fernando Alonso", team: "Aston Martin", number: 14, gap: "+1:02.105", bestLap: "1:09.001", tyre: "H", tyreAge: 22 },
    { pos: 9, code: "STR", name: "Lance Stroll", team: "Aston Martin", number: 18, gap: "+1:15.889", bestLap: "1:09.234", tyre: "M", tyreAge: 31 },
    { pos: 10, code: "GAS", name: "Pierre Gasly", team: "Alpine", number: 10, gap: "+1:22.456", bestLap: "1:09.512", tyre: "H", tyreAge: 18 },
    { pos: 11, code: "HUL", name: "Nico Hulkenberg", team: "Haas", number: 27, gap: "+1 Lap", bestLap: "1:09.901", tyre: "H", tyreAge: 25 },
    { pos: 12, code: "MAG", name: "Kevin Magnussen", team: "Haas", number: 20, gap: "+1 Lap", bestLap: "1:10.012", tyre: "M", tyreAge: 30 },
    { pos: 13, code: "TSU", name: "Yuki Tsunoda", team: "RB", number: 22, gap: "+1 Lap", bestLap: "1:10.145", tyre: "H", tyreAge: 21 },
    { pos: 14, code: "ALB", name: "Alexander Albon", team: "Williams", number: 23, gap: "+1 Lap", bestLap: "1:10.356", tyre: "H", tyreAge: 24 },
    { pos: 15, code: "BOT", name: "Valtteri Bottas", team: "Sauber", number: 77, gap: "+2 Laps", bestLap: "1:10.789", tyre: "S", tyreAge: 10 },
    { pos: 16, code: "ZHO", name: "Guanyu Zhou", team: "Sauber", number: 24, gap: "+2 Laps", bestLap: "1:11.012", tyre: "H", tyreAge: 28 },
    { pos: 17, code: "BEA", name: "Oliver Bearman", team: "Haas", number: 87, gap: "+2 Laps", bestLap: "1:11.234", tyre: "M", tyreAge: 32 },
    { pos: 18, code: "LAW", name: "Liam Lawson", team: "RB", number: 40, gap: "+2 Laps", bestLap: "1:11.456", tyre: "H", tyreAge: 26 },
    { pos: 19, code: "COL", name: "Franco Colapinto", team: "Williams", number: 43, gap: "DNF", bestLap: "1:10.678", tyre: "—", tyreAge: 0 },
    { pos: 20, code: "OCO", name: "Esteban Ocon", team: "Alpine", number: 31, gap: "DNF", bestLap: "1:10.234", tyre: "—", tyreAge: 0 },
  ],
  events: [
    { lap: 1, type: "start", message: "Lights out! VER leads from the line, NOR second", driver: "VER" },
    { lap: 3, type: "overtake", message: "NOR overtakes LEC for P2 into Turn 3", driver: "NOR" },
    { lap: 7, type: "incident", message: "Contact between OCO and COL — investigation pending", driver: "OCO" },
    { lap: 10, type: "pitstop", message: "SAI boxes — switches to Medium tyres", driver: "SAI" },
    { lap: 14, type: "pitstop", message: "LEC pits from P3 — Hard tyre fitted", driver: "LEC" },
    { lap: 18, type: "pitstop", message: "HAM pits — undercuts RUS for P5", driver: "HAM" },
    { lap: 22, type: "pitstop", message: "VER pits from the lead — Hard tyres", driver: "VER" },
    { lap: 23, type: "pitstop", message: "NOR pits — VER retains lead on exit", driver: "NOR" },
    { lap: 31, type: "dnf", message: "OCO retires — brake failure reported", driver: "OCO" },
    { lap: 35, type: "fastest", message: "NOR sets fastest lap — 1:07.481", driver: "NOR" },
    { lap: 40, type: "overtake", message: "RUS overtakes PIA for P6 with DRS", driver: "RUS" },
    { lap: 45, type: "incident", message: "COL spins at Turn 9 — continues", driver: "COL" },
    { lap: 51, type: "dnf", message: "COL retires — suspension damage", driver: "COL" },
    { lap: 58, type: "fastest", message: "VER reclaims fastest lap — 1:07.275 🟣", driver: "VER" },
    { lap: 63, type: "overtake", message: "LEC attacks SAI — defends for P3", driver: "SAI" },
    { lap: 71, type: "finish", message: "CHEQUERED FLAG! VER wins the Austrian Grand Prix!", driver: "VER" },
  ],
  pitHistory: [
    { time: "11:23", driver: "SAI", lap: 10, compound: "M", duration: "2.4s" },
    { time: "11:31", driver: "LEC", lap: 14, compound: "H", duration: "2.3s" },
    { time: "11:39", driver: "HAM", lap: 18, compound: "H", duration: "2.6s" },
    { time: "11:41", driver: "RUS", lap: 19, compound: "S", duration: "2.5s" },
    { time: "11:47", driver: "VER", lap: 22, compound: "H", duration: "2.2s" },
    { time: "11:48", driver: "NOR", lap: 23, compound: "H", duration: "2.4s" },
    { time: "12:01", driver: "PIA", lap: 29, compound: "H", duration: "2.3s" },
    { time: "12:15", driver: "ALO", lap: 36, compound: "H", duration: "2.5s" },
  ],
  strategy: [
    { driver: "VER", stints: [{ compound: "S", laps: 22 }, { compound: "H", laps: 49 }] },
    { driver: "NOR", stints: [{ compound: "S", laps: 23 }, { compound: "H", laps: 48 }] },
    { driver: "LEC", stints: [{ compound: "S", laps: 14 }, { compound: "H", laps: 57 }] },
    { driver: "SAI", stints: [{ compound: "S", laps: 10 }, { compound: "M", laps: 61 }] },
    { driver: "HAM", stints: [{ compound: "S", laps: 18 }, { compound: "H", laps: 53 }] },
    { driver: "RUS", stints: [{ compound: "S", laps: 19 }, { compound: "S", laps: 52 }] },
    { driver: "PIA", stints: [{ compound: "S", laps: 29 }, { compound: "H", laps: 42 }] },
    { driver: "ALO", stints: [{ compound: "S", laps: 36 }, { compound: "H", laps: 35 }] },
  ],
  fastestLap: { driver: "VER", time: "1:07.275", lap: 58 },
  polePosition: { driver: "VER", time: "1:05.891" },
  totalPitStops: 8,
  topSpeeds: [
    { driver: "VER", speed: 336 },
    { driver: "NOR", speed: 334 },
    { driver: "LEC", speed: 332 },
    { driver: "SAI", speed: 331 },
    { driver: "HAM", speed: 330 },
    { driver: "RUS", speed: 329 },
  ]
};

// ─── FUNCTIONS ────────────────────────────────────────────────────────────────
function loadSampleData() {
  const json = JSON.stringify(SAMPLE_DATA, null, 2);
  document.getElementById('jsonInput').value = json;
  setStatus('Sample data loaded — generating...');
  // Auto-generate immediately
  setTimeout(generateRecap, 100);
}

function setStatus(msg) {
  document.getElementById('statusText').textContent = msg;
}

function generateRecap() {
  let raw = document.getElementById('jsonInput').value.trim();
  if (!raw) { setStatus('⚠ Please load sample data or paste JSON first'); return; }

  let parsed;
  try {
    // Sanitize Python-emitted NaN/Infinity tokens (invalid JSON but valid JS)
    const sanitized = raw
      .replace(/:\s*NaN\b/g, ': null')
      .replace(/:\s*Infinity\b/g, ': null')
      .replace(/:\s*-Infinity\b/g, ': null')
      .replace(/:\s*undefined\b/g, ': null');
    parsed = JSON.parse(sanitized);
  } catch(e) {
    // Try to give a helpful message
    const pos = e.message.match(/position (\d+)/);
    const hint = pos ? ` near character ${pos[1]}` : '';
    setStatus(`⚠ JSON parse error${hint}: ${e.message}`);
    return;
  }
  raceData = parsed;

  // Detect what type of data we have
  const hasFrames  = raceData?.frames?.length > 5;
  const hasCircuit = raceData?.circuit?.x?.length > 10;
  const dataType   = hasFrames ? '✅ Real FastF1 data' : hasCircuit ? '🗺 Real circuit, synthetic cars' : '⚠ Sample/basic data';

  document.getElementById('loadingOverlay').classList.add('active');
  setStatus(`${dataType} · Processing...`);

  setTimeout(() => {
    document.getElementById('loadingOverlay').classList.remove('active');
    initRecap();
  }, hasFrames ? 2400 : 1200);
}

function importJSONFile() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    setStatus(`📂 Loading ${file.name}...`);
    const reader = new FileReader();
    reader.onload = ev => {
      document.getElementById('jsonInput').value = ev.target.result;
      setStatus(`✅ Loaded ${file.name} (${(file.size/1024).toFixed(0)} KB) — click GENERATE`);
    };
    reader.readAsText(file);
  };
  input.click();
}

function initRecap() {
  totalLaps = raceData.race.laps || 71;
  currentLap = 0;
  shownEvents = new Set();
  activeLapChip = 0;
  activeLapChipEl = null;
  resetLeaderboardState();

  const race = raceData.race;

  // Header
  document.getElementById('headerRaceTitle').textContent = `${race.name.toUpperCase()} ${race.year}`;
  document.getElementById('headerLapBadge').textContent = `LAP 0 / ${totalLaps}`;

  // TV overlays
  document.getElementById('broadcastGPName').textContent = `${race.name.toUpperCase()} ${race.year}`;
  const circuit = document.getElementById('tvCircuitLabel');
  if (circuit) circuit.textContent = (race.circuit || 'CIRCUIT').toUpperCase();
  const weather = document.getElementById('tvWeather');
  if (weather) weather.textContent = race.weather ? `☀ ${race.weather}` : '☀ SUNNY · DRY';
  const tvCur = document.getElementById('tvLapCurrent');
  const tvReadout = document.getElementById('tvLapReadout');
  const tvTowerLap = document.getElementById('tvTowerLap');
  const tvHud = document.getElementById('tvLapCounter');
  if (tvCur) tvCur.textContent = '0';
  if (tvReadout) tvReadout.textContent = `LAPS 0 / ${totalLaps}`;
  if (tvTowerLap) tvTowerLap.textContent = `LAP 0 / ${totalLaps}`;
  if (tvHud) tvHud.style.setProperty('--lap-progress-pct', '0');

  // Show recap screen
  document.getElementById('idleScreen').style.display = 'none';
  document.getElementById('raceRecap').classList.add('active');
  const layout = document.querySelector('.app-layout');
  if (layout) layout.classList.add('no-input');

  // Sidebar (optional)
  if (document.querySelector('.right-panel')) {
    renderLeaderboard();
    renderPitStops();
    renderStrategy();
    renderStats();
  }

  // Timeline
  buildLapChips();
  buildTimelineMarkers();

  // Initial timing tower
  safeRenderTimingTower();

  // Track
  let trackReady = true;
  if (trackAnimFrame) cancelAnimationFrame(trackAnimFrame);
  try {
    spawnCars();
  } catch (err) {
    trackReady = false;
    console.error('Track spawn failed:', err);
    setStatus(`⚠ Track render failed: ${err?.message || err}`);
  }

  if (trackReady) {
    setStatus(`${race.circuit || race.name} · ${totalLaps} laps · ${race.date || ''}`);
  }
  startPlay();
}

function renderLeaderboard() {
  const drivers = raceData.drivers || [];
  renderLeaderboardRows(drivers, { animate: true, uptoLap: 0, displayLap: 0, live: false });
}

function resetLeaderboardState() {
  leaderboardPrevPosByCode = {};
  leaderboardLastOrderSignature = '';
  leaderboardPrevOrderCodes = [];
  leaderboardFlipToken++;
  leaderboardLastAnimatedSwapKey = '';
  leaderboardLastAnimatedSwapAt = 0;

  leaderboardChangeTimers.forEach(timer => clearTimeout(timer));
  leaderboardChangeTimers.clear();

  leaderboardRowCache.forEach(row => row.remove());
  leaderboardRowCache.clear();
}

function normalizeDriverCode(code) {
  return String(code ?? '').trim().toUpperCase();
}

function sanitizeDriverSlug(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9-]/g, '');
}

function getDriverPhotoUrl(driver) {
  const explicitPhoto = driver?.photo || driver?.photoUrl || driver?.headshot || driver?.headshot_url || driver?.image || driver?.img;
  if (typeof explicitPhoto === 'string' && explicitPhoto.trim()) {
    return explicitPhoto.trim();
  }

  const name = String(driver?.name || '').trim();
  if (!name) return '';
  const surname = sanitizeDriverSlug(name.split(/\s+/).pop());
  if (!surname) return '';
  const season = Number(raceData?.race?.year) || 2024;
  return `https://media.formula1.com/content/dam/fom-website/drivers/${season}Drivers/${surname}.jpg`;
}

function getPitStopCountsByDriver(uptoLap = Infinity) {
  const pitHistory = raceData?.pitHistory || [];
  const maxLap = Number.isFinite(Number(uptoLap)) ? Number(uptoLap) : Infinity;
  const counts = {};

  pitHistory.forEach(stop => {
    const code = normalizeDriverCode(stop?.driver);
    if (!code) return;

    const stopLap = Number(stop?.lap);
    if (Number.isFinite(stopLap) && stopLap > maxLap) return;

    counts[code] = (counts[code] || 0) + 1;
  });

  return counts;
}

function createLeaderboardRow(driverCode) {
  const row = document.createElement('div');
  row.className = 'lb-row';
  row.dataset.code = driverCode;
  row.innerHTML = `
    <div class="lb-pos-wrap">
      <span class="lb-pos-num">-</span>
      <span class="lb-pos-change"></span>
    </div>
    <div class="lb-driver-photo" data-fallback="?">
      <img class="lb-driver-photo-img" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" style="display:none">
    </div>
    <div class="lb-driver-info">
      <div class="lb-driver-line">
        <div class="lb-color"></div>
        <span class="lb-driver-code">---</span>
        <span class="lb-tyre">—</span>
      </div>
      <div class="lb-team">—</div>
    </div>
    <span class="lb-gap-col">—</span>
    <span class="lb-pit-count">0</span>
  `;

  row._parts = {
    posNum: row.querySelector('.lb-pos-num'),
    posChange: row.querySelector('.lb-pos-change'),
    photoWrap: row.querySelector('.lb-driver-photo'),
    photoImg: row.querySelector('.lb-driver-photo-img'),
    colorBar: row.querySelector('.lb-color'),
    code: row.querySelector('.lb-driver-code'),
    tyre: row.querySelector('.lb-tyre'),
    team: row.querySelector('.lb-team'),
    gap: row.querySelector('.lb-gap-col'),
    pits: row.querySelector('.lb-pit-count'),
  };

  return row;
}

function clearPositionChangeIndicator(driverCode, row) {
  const timer = leaderboardChangeTimers.get(driverCode);
  if (timer) clearTimeout(timer);
  leaderboardChangeTimers.delete(driverCode);
  if (!row || !row._parts) return;
  row.classList.remove('lb-overtake-up', 'lb-overtake-down');
  row._parts.posChange.textContent = '';
  row._parts.posChange.className = 'lb-pos-change';
}

function applyPositionChangeIndicator(driverCode, row, delta) {
  if (!row || !row._parts || !delta) return;
  clearPositionChangeIndicator(driverCode, row);

  const movedUp = delta > 0;
  row.classList.add(movedUp ? 'lb-overtake-up' : 'lb-overtake-down');
  row._parts.posChange.textContent = `${movedUp ? '▲' : '▼'}${Math.abs(delta)}`;
  row._parts.posChange.classList.add(movedUp ? 'up' : 'down');

  const timer = setTimeout(() => {
    clearPositionChangeIndicator(driverCode, row);
  }, 1050);
  leaderboardChangeTimers.set(driverCode, timer);
}

function updateLeaderboardRow(row, driver, index, pitStops) {
  const parts = row._parts;
  if (!parts) return;

  const color = driver.color || TEAM_COLORS[driver.team] || '#444';
  const driverCode = normalizeDriverCode(driver.code) || '---';
  const posClass = index === 0 ? 'p1' : index === 1 ? 'p2' : index === 2 ? 'p3' : '';
  const gapTxt = index === 0 ? 'LEADER' : (driver.gap || '—');
  const tyre = driver.tyre && driver.tyre !== '—' ? String(driver.tyre).trim().toUpperCase() : '';
  const tyreClass = tyre.replace(/[^A-Z0-9_-]/g, '');
  const photoUrl = getDriverPhotoUrl(driver);
  const fallbackChar = (driverCode.replace(/[^A-Z0-9]/g, '').charAt(0) || '?');

  parts.posNum.className = `lb-pos-num ${posClass}`.trim();
  parts.posNum.textContent = driver.pos;

  parts.photoWrap.dataset.fallback = fallbackChar;
  parts.photoWrap.style.setProperty('--driver-color', color);
  if (photoUrl && parts.photoImg.dataset.src !== photoUrl) {
    parts.photoImg.src = photoUrl;
    parts.photoImg.dataset.src = photoUrl;
    parts.photoImg.style.display = 'block';
  } else if (!photoUrl) {
    parts.photoImg.removeAttribute('src');
    delete parts.photoImg.dataset.src;
    parts.photoImg.style.display = 'none';
  }
  parts.photoImg.alt = driverCode;
  parts.photoImg.onerror = () => { parts.photoImg.style.display = 'none'; };

  parts.colorBar.style.background = color;
  parts.code.textContent = driverCode;
  parts.team.textContent = driver.team || '—';

  if (tyreClass) {
    parts.tyre.className = `lb-tyre tire-badge tire-${tyreClass}`;
    parts.tyre.textContent = tyre;
    parts.tyre.title = `Current tyre: ${tyre}`;
  } else {
    parts.tyre.className = 'lb-tyre lb-tyre-unknown';
    parts.tyre.textContent = '—';
    parts.tyre.title = 'Current tyre unavailable';
  }

  parts.gap.textContent = gapTxt;
  parts.gap.classList.toggle('gap-0', index === 0);

  parts.pits.textContent = pitStops;
  parts.pits.classList.toggle('has-pits', pitStops > 0);
}

function detectAdjacentSwap(prevOrder, nextOrder) {
  if (!Array.isArray(prevOrder) || !Array.isArray(nextOrder)) return null;
  if (prevOrder.length !== nextOrder.length || prevOrder.length < 2) return null;

  const diffs = [];
  for (let i = 0; i < nextOrder.length; i++) {
    if (prevOrder[i] !== nextOrder[i]) diffs.push(i);
    if (diffs.length > 2) return null;
  }

  if (diffs.length !== 2) return null;
  const [a, b] = diffs;
  if (b !== a + 1) return null;
  if (prevOrder[a] !== nextOrder[b] || prevOrder[b] !== nextOrder[a]) return null;

  return {
    indexA: a,
    indexB: b,
    upCode: nextOrder[a],
    downCode: nextOrder[b],
    codes: [nextOrder[a], nextOrder[b]],
  };
}

function runLeaderboardFlipAnimation(container, orderedCodes, targetCodes = null) {
  const oldTops = new Map();
  Array.from(container.children).forEach(row => {
    if (row.dataset.code) oldTops.set(row.dataset.code, row.getBoundingClientRect().top);
  });

  const flipToken = ++leaderboardFlipToken;
  const animateCodes = Array.isArray(targetCodes) && targetCodes.length ? targetCodes : orderedCodes;
  requestAnimationFrame(() => {
    if (flipToken !== leaderboardFlipToken) return;
    animateCodes.forEach(code => {
      const row = leaderboardRowCache.get(code);
      if (!row || !oldTops.has(code)) return;
      const deltaY = oldTops.get(code) - row.getBoundingClientRect().top;
      if (Math.abs(deltaY) < 1) return;

      row.style.transition = 'transform 0s';
      row.style.transform = `translateY(${deltaY}px)`;
      row.getBoundingClientRect();
      row.style.transition = 'transform 360ms cubic-bezier(0.22, 1, 0.36, 1)';
      row.style.transform = 'translateY(0)';
      setTimeout(() => {
        if (!row.isConnected) return;
        row.style.transition = '';
      }, 380);
    });
  });
}

function renderLeaderboardRows(drivers, opts = {}) {
  const container = document.getElementById('leaderboardRows');
  if (!container) return;

  const animate = !!opts.animate;
  const isLive = !!opts.live;
  const displayLap = Number(opts.displayLap) || 0;
  const maxLap = opts.uptoLap;
  const pitCounts = getPitStopCountsByDriver(maxLap);
  const allowPositionFx = isLive && displayLap > 2;
  const orderedCodes = drivers.map(d => normalizeDriverCode(d.code) || '---');
  const nextSignature = orderedCodes.join('|');
  const nowMs = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
  let swapToAnimate = null;

  if (allowPositionFx) {
    const detectedSwap = detectAdjacentSwap(leaderboardPrevOrderCodes, orderedCodes);
    if (detectedSwap) {
      const key = `${detectedSwap.indexA}:${detectedSwap.upCode}:${detectedSwap.downCode}`;
      const globalCooldownOk = (nowMs - leaderboardLastAnimatedSwapAt) > 420;
      const sameSwapCooldownOk = key !== leaderboardLastAnimatedSwapKey || (nowMs - leaderboardLastAnimatedSwapAt) > 900;
      if (globalCooldownOk && sameSwapCooldownOk) {
        swapToAnimate = detectedSwap;
        leaderboardLastAnimatedSwapKey = key;
        leaderboardLastAnimatedSwapAt = nowMs;
      }
    }
  }

  if (swapToAnimate) {
    runLeaderboardFlipAnimation(container, orderedCodes, swapToAnimate.codes);
  }

  const seen = new Set();
  drivers.forEach((d, i) => {
    const driverCode = normalizeDriverCode(d.code) || '---';
    let row = leaderboardRowCache.get(driverCode);
    const isNewRow = !row;
    if (!row) {
      row = createLeaderboardRow(driverCode);
      leaderboardRowCache.set(driverCode, row);
      if (animate) {
        row.classList.add('fade-in');
        row.style.animationDelay = `${i * 0.04}s`;
      }
    }

    updateLeaderboardRow(row, d, i, pitCounts[driverCode] || 0);
    container.appendChild(row);
    seen.add(driverCode);
  });

  if (swapToAnimate) {
    const upRow = leaderboardRowCache.get(swapToAnimate.upCode);
    const downRow = leaderboardRowCache.get(swapToAnimate.downCode);
    applyPositionChangeIndicator(swapToAnimate.upCode, upRow, 1);
    applyPositionChangeIndicator(swapToAnimate.downCode, downRow, -1);
  }

  Array.from(leaderboardRowCache.entries()).forEach(([code, row]) => {
    if (seen.has(code)) return;
    clearPositionChangeIndicator(code, row);
    row.remove();
    leaderboardRowCache.delete(code);
  });

  orderedCodes.forEach((code, idx) => { leaderboardPrevPosByCode[code] = idx + 1; });
  Array.from(Object.keys(leaderboardPrevPosByCode)).forEach(code => {
    if (!seen.has(code)) delete leaderboardPrevPosByCode[code];
  });

  leaderboardPrevOrderCodes = orderedCodes.slice();
  leaderboardLastOrderSignature = nextSignature;
}

function renderPitStops() {
  const container = document.getElementById('pitstopRows');
  const pits = raceData.pitHistory || [];
  container.innerHTML = '';
  document.getElementById('totalPits').textContent = `${pits.length} STOPS`;

  pits.forEach(p => {
    const compound = p.compound || '—';
    const duration = p.duration != null ? (typeof p.duration === 'number' ? p.duration.toFixed(1) + 's' : p.duration) : '—';
    const row = document.createElement('div');
    row.className = 'pit-row';
    row.innerHTML = `
      <span class="pit-time">${p.time || `L${p.lap}`}</span>
      <div style="display:flex;align-items:center;gap:6px;">
        <span style="font-weight:700;letter-spacing:1px;font-size:0.75rem">${p.driver || '—'}</span>
        <span class="tire-badge tire-${compound}">${compound}</span>
      </div>
      <span class="pit-lap" style="color:var(--text-dim)">L${p.lap || '—'}</span>
      <span class="pit-duration">${duration}</span>
    `;
    container.appendChild(row);
  });
}

function renderStrategy() {
  const container = document.getElementById('strategyRows');
  const total = raceData.race.laps || 71;
  container.innerHTML = '';

  const tireColors = { S:'#cc0000', M:'#cc9900', H:'#888', I:'#006600', W:'#0055cc' };

  // Normalise: strategy can be either:
  //   Array:  [{driver, stints:[{compound, laps}]}]          ← sample data format
  //   Object: {"VER":[{compound, start, end}], ...}          ← FastF1 extractor format
  let strats = [];
  const raw = raceData.strategy;

  if (Array.isArray(raw)) {
    // Sample format — already correct shape
    strats = raw;
  } else if (raw && typeof raw === 'object') {
    // FastF1 format — convert object to array, compute lap counts from start/end
    strats = Object.entries(raw).map(([driver, stintList]) => {
      const stints = (Array.isArray(stintList) ? stintList : []).map(st => ({
        compound: st.compound || '—',
        laps: st.end != null && st.start != null ? (st.end - st.start + 1) : (st.laps || 0),
      }));
      return { driver, stints };
    });
  }

  if (!strats.length) {
    container.innerHTML = '<div style="padding:12px;color:var(--text-muted);font-size:0.75rem">No strategy data</div>';
    return;
  }

  strats.forEach(s => {
    const stints = s.stints || [];
    const barsHtml = stints.map(st => {
      const pct = Math.max(2, (st.laps / total * 100)).toFixed(1);
      return `<div class="str-seg" style="width:${pct}%;background:${tireColors[st.compound]||'#444'}" title="${st.compound}: ${st.laps} laps"></div>`;
    }).join('');

    const row = document.createElement('div');
    row.className = 'strategy-row';
    row.innerHTML = `
      <div class="str-driver-line">
        <span style="width:36px;font-weight:700;letter-spacing:1px;font-size:0.75rem">${s.driver}</span>
        ${stints.map(st => `<span class="tire-badge tire-${st.compound}">${st.compound}</span><span style="font-size:0.65rem;color:var(--text-muted)">${st.laps}L</span>`).join('<span style="color:var(--text-muted);margin:0 2px">→</span>')}
      </div>
      <div class="str-bars">${barsHtml}</div>
    `;
    container.appendChild(row);
  });
}

function renderStats() {
  const container = document.getElementById('statsContent');
  const d = raceData;
  const topSpeeds = d.topSpeeds || [];
  const maxSpeed = topSpeeds.length ? Math.max(...topSpeeds.map(s => s.speed)) : 340;

  container.innerHTML = `
    <div class="stat-card fastest-lap-highlight">
      <div class="stat-label">FASTEST LAP 🟣</div>
      <div class="stat-value">${d.fastestLap?.time || '—'}</div>
      <div class="stat-sub">${d.fastestLap?.driver || '—'} • Lap ${d.fastestLap?.lap || '—'}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">POLE POSITION</div>
      <div class="stat-value">${d.polePosition?.time || '—'}</div>
      <div class="stat-sub">${d.polePosition?.driver || '—'}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">TOTAL PIT STOPS</div>
      <div class="stat-value">${d.totalPitStops || d.pitHistory?.length || '—'}</div>
      <div class="stat-sub">Across all teams</div>
    </div>
    <div class="section-header" style="margin-top:4px">TOP SPEEDS — SPEED TRAP</div>
    ${topSpeeds.map(s => `
      <div class="speed-row">
        <span class="speed-driver">${s.driver}</span>
        <div class="speed-bar-track">
          <div class="speed-bar-fill" style="width:${(s.speed/maxSpeed*100).toFixed(1)}%"></div>
        </div>
        <span class="speed-val">${s.speed} km/h</span>
      </div>
    `).join('')}
  `;
}

function buildLapChips() {
  const container = document.getElementById('lapChips');
  container.innerHTML = '';
  const eventLaps = new Set((raceData.events || []).map(e => e.lap));

  for (let i = 1; i <= totalLaps; i++) {
    const chip = document.createElement('div');
    chip.className = 'lap-chip' + (eventLaps.has(i) ? ' event' : '');
    chip.textContent = `L${i}`;
    chip.onclick = () => seekToLap(i);
    chip.id = `chip-${i}`;
    container.appendChild(chip);
  }
}

function buildTimelineMarkers() {
  const container = document.getElementById('timelineMarkers');
  container.innerHTML = '';
  const events = raceData.events || [];
  const typeColors = { overtake: '#E8002D', pitstop: '#ffd700', fastest: '#a855f7', incident: '#ff6600', dnf: '#888', finish: '#00e676', start: '#00c8ff' };

  events.forEach(e => {
    const pct = (e.lap / totalLaps * 100).toFixed(1);
    const marker = document.createElement('div');
    marker.className = 'tl-marker';
    marker.style.left = `${pct}%`;
    marker.style.background = typeColors[e.type] || '#ffd700';
    marker.setAttribute('data-event', `L${e.lap}: ${e.type.toUpperCase()}`);
    marker.onclick = (ev) => { ev.stopPropagation(); seekToLap(e.lap); };
    container.appendChild(marker);
  });
}

function clampLapValue(lap) {
  const n = Number(lap);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(n, totalLaps || 0));
}

function lapValueToCurrentLap(lapValue) {
  if (lapValue <= 0) return 0;
  return Math.min(totalLaps, Math.floor(lapValue) + 1);
}

function setActiveLapChip(lapNumber) {
  const nextLap = Math.max(0, Math.min(totalLaps, Math.floor(lapNumber || 0)));
  if (nextLap === activeLapChip) return;

  if (activeLapChipEl) activeLapChipEl.classList.remove('active');
  activeLapChip = nextLap;
  activeLapChipEl = nextLap > 0 ? document.getElementById(`chip-${nextLap}`) : null;

  if (activeLapChipEl) {
    activeLapChipEl.classList.add('active');
    activeLapChipEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }
}

function safeRenderTimingTower(drivers) {
  try {
    renderTimingTower(drivers);
  } catch (err) {
    console.error('Timing tower render failed:', err);
  }
}

function renderTimingTower(drivers) {
  const container = document.getElementById('tvTimingRows');
  if (!container || !raceData) return;
  drivers = drivers || raceData.drivers || [];
  const spriteMap = (typeof TEAM_SPRITE_PATHS !== 'undefined' && TEAM_SPRITE_PATHS) ? TEAM_SPRITE_PATHS : {};

  container.innerHTML = drivers.slice(0, 20).map((d, i) => {
    const gapRaw = String(d.gap || '').trim();
    const isOut = /^(DNF|DNS|DSQ|RET|OUT)$/i.test(gapRaw) || /RETIRED/i.test(gapRaw);
    const rowClass = `${i === 0 ? 'tt-leader' : ''} ${isOut ? 'tt-out' : ''}`.trim();
    const gapLabel = i === 0 ? 'Leader' : (isOut ? 'Out' : (gapRaw || '—'));

    const code = normalizeDriverCode(d.code) || '---';
    const teamPath = spriteMap[d.team]
      || (typeof teamSlug === 'function' ? `assets/sprites/cars/teams/${teamSlug(d.team)}.png` : '')
      || '';

    return `
      <div class="tt-row ${rowClass}">
        <span class="tt-pos">${d.pos}</span>
        <span class="tt-team-logo">
          ${teamPath ? `<img src="${teamPath}" alt="${d.team || ''}" loading="lazy" onerror="this.style.display='none'">` : ''}
        </span>
        <span class="tt-driver">${code}</span>
        <span class="tt-gap ${i===0?'leader-gap':''} ${isOut?'out-gap':''}">${gapLabel}</span>
        <span class="tt-ind"></span>
      </div>`;
  }).join('');
}

// ═══════════════════════════════════════════════════════════════════
//  F1 RACE ENGINE  —  Real FastF1 data when available, synthetic fallback
// ═══════════════════════════════════════════════════════════════════
let trackAnimFrame = null;
let trackCars      = [];
let lastTimestamp  = 0;

// ── Real-data replay state ───────────────────────────────────────
let replayFrames   = [];   // [{t, cars:{CODE:{x,y}}}] from FastF1 extractor
let replayTime     = 0;    // current race time in seconds (0 → maxT)
let replaySpeed    = 1.0;  // auto-calculated: maxT / TARGET_DURATION
let usingRealData  = false;

const TARGET_DURATION = 540; // play full race in 9 minutes wall-clock time (was 3 min — 3x slower)
const BASE_PLAYBACK_MULT = 0.5; // Global half-speed playback (0.5x).

// ── Synthetic fallback waypoints (Red Bull Ring) ─────────────────
const FALLBACK_WAYPOINTS = [
  [0.500,0.085],[0.570,0.080],[0.640,0.078],[0.705,0.082],[0.755,0.100],
  [0.790,0.128],[0.810,0.165],[0.815,0.210],[0.812,0.260],[0.805,0.310],
  [0.795,0.355],[0.775,0.395],[0.748,0.425],[0.710,0.445],[0.672,0.450],
  [0.635,0.440],[0.600,0.420],[0.568,0.445],[0.540,0.475],[0.510,0.500],
  [0.478,0.518],[0.448,0.510],[0.420,0.490],[0.385,0.478],[0.348,0.480],
  [0.308,0.488],[0.268,0.505],[0.232,0.530],[0.205,0.565],[0.192,0.608],
  [0.195,0.652],[0.215,0.693],[0.248,0.728],[0.292,0.758],[0.340,0.775],
  [0.390,0.778],[0.435,0.762],[0.462,0.732],[0.472,0.695],[0.464,0.658],
  [0.445,0.625],[0.435,0.590],[0.438,0.552],[0.445,0.515],[0.440,0.478],
  [0.425,0.445],[0.400,0.405],[0.375,0.358],[0.362,0.308],[0.362,0.258],
  [0.372,0.210],[0.395,0.168],[0.428,0.132],[0.463,0.105],[0.500,0.085],
];

const SECTOR_SPLITS = [0.32, 0.65];
let DRS_ZONES = [{ start:0.88, end:0.05 }, { start:0.52, end:0.62 }];
const TRACK_EDGE_PADDING_CSS = 58; // Smaller padding so the track occupies more viewport area.
const TRACK_WIDTH_MULT = 1.48;     // Wider visual track for better racing room.
const CAR_VISUAL_SCALE = 1.2;      // Larger cars while preserving proportions.
const CAR_GAP_MULT = 3.8;          // Front/back spacing multiplier (recommended: 1.0–5.0).
const CAR_LENGTH_SCALE = 0.88;     // <1 makes cars visually shorter length-wise.
const CAR_BRIGHTNESS = 1.18;       // Global brightness boost for car visibility.

// ── Build path from raw normalized [x,y] points (Catmull-Rom spline) ──
function buildTrackPath(W, H, waypoints) {
  const pts = waypoints.map(([x,y]) => [x * W, y * H]);
  const n   = pts.length;
  const out = [];
  const STEPS = 40;
  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[(i-1+n)%n], p1 = pts[i];
    const p2 = pts[(i+1)%n],   p3 = pts[(i+2)%n];
    for (let s = 0; s < STEPS; s++) {
      const t = s/STEPS, t2=t*t, t3=t2*t;
      const x = 0.5*((2*p1[0])+(-p0[0]+p2[0])*t+(2*p0[0]-5*p1[0]+4*p2[0]-p3[0])*t2+(-p0[0]+3*p1[0]-3*p2[0]+p3[0])*t3);
      const y = 0.5*((2*p1[1])+(-p0[1]+p2[1])*t+(2*p0[1]-5*p1[1]+4*p2[1]-p3[1])*t2+(-p0[1]+3*p1[1]-3*p2[1]+p3[1])*t3);
      out.push([x, y]);
    }
  }
  return out;
}

// ── Fit a source path to viewport while preserving aspect ratio ─────────────
function fitPathToViewport(sourcePath, W, H, paddingPx) {
  if (!sourcePath.length) {
    return {
      path: [],
      transform: { scale: 1, offsetX: 0, offsetY: 0 }
    };
  }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  sourcePath.forEach(([x, y]) => {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  });

  const srcW = Math.max(maxX - minX, 1e-6);
  const srcH = Math.max(maxY - minY, 1e-6);
  const pad  = Math.max(8, paddingPx || 0);
  const availW = Math.max(W - pad * 2, W * 0.1);
  const availH = Math.max(H - pad * 2, H * 0.1);
  const scale = Math.min(availW / srcW, availH / srcH);

  const fittedW = srcW * scale;
  const fittedH = srcH * scale;
  const offsetX = (W - fittedW) * 0.5 - minX * scale;
  const offsetY = (H - fittedH) * 0.5 - minY * scale;

  return {
    path: sourcePath.map(([x, y]) => [x * scale + offsetX, y * scale + offsetY]),
    transform: { scale, offsetX, offsetY }
  };
}

// ── Build path directly from FastF1 x/y arrays ───────────────────
function buildTrackPathFromReal(W, H, xs, ys) {
  const n    = xs.length;
  const step = Math.max(1, Math.floor(n / 600));
  const out  = [];
  for (let i = 0; i < n; i += step) {
    out.push([xs[i] * W, ys[i] * H]); // NO Y-flip — extractor already handles orientation
  }
  return out;
}

// ── Convert normalised frame x/y to canvas pixels ─────────────────
function realPosToCanvas(x, y, W, H) {
  const rawX = x * W;
  const rawY = y * H;
  return [
    rawX * trackViewportTransform.scale + trackViewportTransform.offsetX,
    rawY * trackViewportTransform.scale + trackViewportTransform.offsetY
  ];
}

function buildNormals(path) {
  const N = path.length;
  return path.map((pt, i) => {
    const next = path[(i+1)%N], prev = path[(i-1+N)%N];
    const dx = next[0]-prev[0], dy = next[1]-prev[1];
    const len = Math.sqrt(dx*dx+dy*dy)||1;
    return [-dy/len, dx/len];
  });
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function normalizeAngle(rad) {
  let a = rad;
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

function smoothAngle(current, target, t) {
  if (!Number.isFinite(current)) return target;
  const delta = normalizeAngle(target - current);
  return current + delta * Math.max(0, Math.min(1, t));
}

function catmullRomPoint(p0, p1, p2, p3, t) {
  const t2 = t * t;
  const t3 = t2 * t;
  const x = 0.5 * (
    (2 * p1[0]) +
    (-p0[0] + p2[0]) * t +
    (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 +
    (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3
  );
  const y = 0.5 * (
    (2 * p1[1]) +
    (-p0[1] + p2[1]) * t +
    (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 +
    (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3
  );
  return [x, y];
}

function catmullRomTangent(p0, p1, p2, p3, t) {
  const t2 = t * t;
  const x = 0.5 * (
    (-p0[0] + p2[0]) +
    2 * (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t +
    3 * (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t2
  );
  const y = 0.5 * (
    (-p0[1] + p2[1]) +
    2 * (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t +
    3 * (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t2
  );
  return [x, y];
}

function findNearestTrackIndex(x, y, hintIdx = -1) {
  const N = trackPath.length;
  if (!N) return 0;

  let bestIdx = 0;
  let bestDist = Infinity;

  if (Number.isFinite(hintIdx) && hintIdx >= 0) {
    const center = ((Math.floor(hintIdx) % N) + N) % N;
    const span = Math.min(140, Math.max(24, Math.floor(N / 10)));
    for (let d = -span; d <= span; d++) {
      const i = (center + d + N) % N;
      const [tx, ty] = trackPath[i];
      const dist = (x - tx) * (x - tx) + (y - ty) * (y - ty);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    }
    return bestIdx;
  }

  for (let i = 0; i < N; i += 3) {
    const [tx, ty] = trackPath[i];
    const dist = (x - tx) * (x - tx) + (y - ty) * (y - ty);
    if (dist < bestDist) {
      bestDist = dist;
      bestIdx = i;
    }
  }
  return bestIdx;
}

let trackPath = [];
let trackNormals = [];
let preRendered = null;
let trackViewportTransform = { scale: 1, offsetX: 0, offsetY: 0 };

// ── Color helpers ──
function hexToRgb(hex) {
  const n = parseInt(hex.replace('#',''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgbToHex(r, g, b) {
  return '#' + [r,g,b].map(v => Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join('');
}
function lightenColor(hex, amt) {
  const [r,g,b] = hexToRgb(hex);
  return rgbToHex(r+amt, g+amt, b+amt);
}
function darkenColor(hex, amt) {
  const [r,g,b] = hexToRgb(hex);
  return rgbToHex(r-amt, g-amt, b-amt);
}
function hexAlpha(hex, a) {
  const [r,g,b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

// ── Optional car sprite support ────────────────────────────────────
let carSpriteConfig = {
  enabled: false,
  scale: 1,
  rotationDeg: 0,
  byCode: {},
  byTeam: {},
  default: ''
};
const carSpriteCache = new Map();
let spriteCacheBustToken = '';
const DEFAULT_TEAM_SPRITES = {
  'Red Bull Racing': 'assets/sprites/cars/teams/red-bull-racing.png',
  'Red Bull': 'assets/sprites/cars/teams/red-bull-racing.png',
  'Oracle Red Bull Racing': 'assets/sprites/cars/teams/red-bull-racing.png',
  'Ferrari': 'assets/sprites/cars/teams/ferrari.png',
  'Mercedes': 'assets/sprites/cars/teams/mercedes.png',
  'McLaren': 'assets/sprites/cars/teams/mclaren.png',
  'Aston Martin': 'assets/sprites/cars/teams/aston-martin.png',
  'Alpine': 'assets/sprites/cars/teams/alpine.png',
  'Williams': 'assets/sprites/cars/teams/williams.png',
  'RB': 'assets/sprites/cars/teams/rb.png',
  'Racing Bulls': 'assets/sprites/cars/teams/rb.png',
  'AlphaTauri': 'assets/sprites/cars/teams/rb.png',
  'Kick Sauber': 'assets/sprites/cars/teams/kick-sauber.png',
  'Sauber': 'assets/sprites/cars/teams/kick-sauber.png',
  'Haas F1 Team': 'assets/sprites/cars/teams/haas-f1-team.png',
  'Haas': 'assets/sprites/cars/teams/haas-f1-team.png',
};

function buildAutoCarSpriteConfig() {
  const byCode = {};
  (raceData?.drivers || []).forEach((d) => {
    if (d?.code) byCode[d.code] = `assets/sprites/cars/codes/${d.code}.svg`;
  });

  return {
    enabled: true,
    scale: 1,
    rotationDeg: 0,
    byCode,
    byTeam: { ...DEFAULT_TEAM_SPRITES },
    default: 'assets/sprites/cars/default.svg'
  };
}

function initCarSpritesFromData() {
  spriteCacheBustToken = `v=${Date.now()}`;
  const cfg = raceData?.assets?.carSprites || raceData?.carSprites;
  if (!cfg || typeof cfg !== 'object') {
    carSpriteConfig = buildAutoCarSpriteConfig();
    carSpriteCache.clear();
    return;
  }

  carSpriteConfig = {
    enabled: true,
    scale: Number.isFinite(cfg.scale) ? Math.min(Math.max(cfg.scale, 0.6), 3) : 1,
    rotationDeg: Number.isFinite(cfg.rotationDeg) ? cfg.rotationDeg : 0,
    byCode: cfg.byCode || {},
    byTeam: cfg.byTeam || {},
    default: cfg.default || ''
  };
  carSpriteCache.clear();
}

function getCarSpriteSource(car) {
  if (!carSpriteConfig.enabled) return '';
  return (
    carSpriteConfig.byCode?.[car.code] ||
    carSpriteConfig.byTeam?.[car.teamName] ||
    carSpriteConfig.default ||
    ''
  );
}

function expandSpritePathCandidates(src) {
  if (!src || typeof src !== 'string') return [];
  const clean = src.trim();
  if (!clean) return [];

  const extMatch = clean.match(/\.([a-zA-Z0-9]+)$/);
  if (!extMatch) {
    return [clean + '.svg', clean + '.png', clean];
  }

  const ext = extMatch[1].toLowerCase();
  const base = clean.slice(0, -(ext.length + 1));
  if (ext === 'svg') return [clean, `${base}.png`];
  if (ext === 'png') return [clean, `${base}.svg`];
  return [clean];
}

function withSpriteCacheBust(src) {
  if (!spriteCacheBustToken || !src) return src;
  return src.includes('?') ? `${src}&${spriteCacheBustToken}` : `${src}?${spriteCacheBustToken}`;
}

function teamSlug(teamName) {
  return String(teamName || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function getCarSpriteCandidates(car) {
  if (!carSpriteConfig.enabled) return [];
  const slug = teamSlug(car.teamName);
  const slugCandidates = slug ? [`assets/sprites/cars/teams/${slug}`] : [];
  if (slug === 'red-bull') slugCandidates.push('assets/sprites/cars/teams/red-bull-racing');
  if (slug === 'haas') slugCandidates.push('assets/sprites/cars/teams/haas-f1-team');
  if (slug === 'kick-sauber' || slug === 'sauber') slugCandidates.push('assets/sprites/cars/teams/kick-sauber');
  if (slug === 'racing-bulls' || slug === 'alphatauri') slugCandidates.push('assets/sprites/cars/teams/rb');

  const candidates = [
    ...expandSpritePathCandidates(carSpriteConfig.byCode?.[car.code]),
    ...expandSpritePathCandidates(carSpriteConfig.byTeam?.[car.teamName]),
    ...slugCandidates.flatMap((p) => expandSpritePathCandidates(p)),
    ...expandSpritePathCandidates(carSpriteConfig.default)
  ];
  return [...new Set(candidates)];
}

function clamp01(v) {
  return Math.min(1, Math.max(0, v));
}

function setRawFrameFromImage(entry) {
  const img = entry.img;
  const w = img.naturalWidth || img.width || 0;
  const h = img.naturalHeight || img.height || 0;
  if (!w || !h) {
    entry.failed = true;
    return;
  }
  const maxOutW = 720;
  const outScale = Math.min(1, maxOutW / Math.max(w, 1));
  const outW = Math.max(1, Math.round(w * outScale));
  const outH = Math.max(1, Math.round(h * outScale));
  const out = document.createElement('canvas');
  out.width = outW;
  out.height = outH;
  const octx = out.getContext('2d');
  octx.imageSmoothingEnabled = true;
  octx.imageSmoothingQuality = 'high';
  octx.drawImage(img, 0, 0, outW, outH);
  dehaloSpriteCanvas(out);
  entry.frame = {
    canvas: out,
    w: outW,
    h: outH,
    aspect: outW / Math.max(outH, 1)
  };
}

function dehaloSpriteCanvas(canvas) {
  const w = canvas.width;
  const h = canvas.height;
  if (!w || !h) return;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  let imageData;
  try {
    imageData = ctx.getImageData(0, 0, w, h);
  } catch {
    return;
  }
  const d = imageData.data;

  // 1) Edge decontamination: reduce checker/gray matte fringing on semi-transparent edges.
  for (let i = 0; i < d.length; i += 4) {
    const a = d[i + 3];
    if (a <= 10) {
      d[i + 3] = 0;
      continue;
    }
    if (a >= 245) continue;

    const af = a / 255;
    const lift = 1 / Math.max(af, 0.45);
    d[i] = Math.min(255, Math.round(d[i] * lift));
    d[i + 1] = Math.min(255, Math.round(d[i + 1] * lift));
    d[i + 2] = Math.min(255, Math.round(d[i + 2] * lift));

    const mx = Math.max(d[i], d[i + 1], d[i + 2]);
    const mn = Math.min(d[i], d[i + 1], d[i + 2]);
    const sat = mx - mn;
    if (sat < 20 && a < 190) {
      d[i + 3] = Math.round(a * 0.62);
    }
  }

  // 2) Alpha bleed: copy nearby opaque RGB into fully transparent pixels
  // to avoid dark/gray halos during scaled rendering.
  for (let pass = 0; pass < 2; pass++) {
    const src = new Uint8ClampedArray(d);
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const idx = (y * w + x) * 4;
        if (src[idx + 3] !== 0) continue;

        let rs = 0, gs = 0, bs = 0, n = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const j = ((y + dy) * w + (x + dx)) * 4;
            if (src[j + 3] > 0) {
              rs += src[j];
              gs += src[j + 1];
              bs += src[j + 2];
              n++;
            }
          }
        }
        if (n > 0) {
          d[idx] = Math.round(rs / n);
          d[idx + 1] = Math.round(gs / n);
          d[idx + 2] = Math.round(bs / n);
          d[idx + 3] = 0;
        }
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

function estimateSpriteBorderColor(data, w, h, thickness = 3) {
  let rSum = 0, gSum = 0, bSum = 0, count = 0;
  const add = (x, y) => {
    const i = (y * w + x) * 4;
    rSum += data[i];
    gSum += data[i + 1];
    bSum += data[i + 2];
    count++;
  };

  const t = Math.max(1, Math.min(thickness, Math.floor(Math.min(w, h) / 4)));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < t; x++) add(x, y);
    for (let x = w - t; x < w; x++) add(x, y);
  }
  for (let x = t; x < w - t; x++) {
    for (let y = 0; y < t; y++) add(x, y);
    for (let y = h - t; y < h; y++) add(x, y);
  }

  const r = count ? rSum / count : 0;
  const g = count ? gSum / count : 0;
  const b = count ? bSum / count : 0;
  return { r, g, b, luma: 0.2126 * r + 0.7152 * g + 0.0722 * b };
}

function processCarSpriteEntry(entry) {
  const img = entry.img;
  const w = img.naturalWidth || img.width || 0;
  const h = img.naturalHeight || img.height || 0;
  if (!w || !h) {
    entry.failed = true;
    return;
  }

  const work = document.createElement('canvas');
  work.width = w;
  work.height = h;
  const wctx = work.getContext('2d', { willReadFrequently: true });
  wctx.drawImage(img, 0, 0, w, h);

  let imageData;
  try {
    imageData = wctx.getImageData(0, 0, w, h);
  } catch (e) {
    // Some browser/file-origin setups block pixel reads. Use raw sprite fallback.
    console.warn('Sprite pixel-read blocked; using raw sprite:', img.src, e);
    setRawFrameFromImage(entry);
    return;
  }
  const data = imageData.data;
  const pxCount = w * h;

  let semiTransparent = 0;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 245) semiTransparent++;
  }
  const hasUsefulAlpha = semiTransparent > pxCount * 0.01;

  if (!hasUsefulAlpha) {
    // If sprite has opaque background, key out border-like background tones.
    const bg = estimateSpriteBorderColor(data, w, h, 3);
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      const mx = Math.max(r, g, b);
      const mn = Math.min(r, g, b);
      const sat = mx <= 0 ? 0 : (mx - mn) / mx;
      const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      const dist = Math.hypot(r - bg.r, g - bg.g, b - bg.b);

      const keepByDist = clamp01((dist - 18) / 68);
      const keepBySat = clamp01((sat - 0.09) / 0.34);
      const keepByLumaDelta = clamp01((Math.abs(luma - bg.luma) - 8) / 48);
      const keep = Math.max(keepByDist, keepBySat * 0.9, keepByLumaDelta * 0.7);
      data[i + 3] = Math.round(a * keep);
    }
    wctx.putImageData(imageData, 0, 0);

    // Reject opaque "photo-like" sprites when background keying fails.
    let visible = 0;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] > 14) visible++;
    }
    const visibleRatio = visible / Math.max(pxCount, 1);
    if (visibleRatio > 0.65) {
      // Keep usable even if background keying failed badly; raw frame is better than no sprite.
      console.warn('Sprite keying weak; using raw sprite fallback:', img.src);
      setRawFrameFromImage(entry);
      return;
    }
  }

  // Trim to visible pixels so oversized source art doesn't shrink the car.
  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const a = data[(y * w + x) * 4 + 3];
      if (a > 14) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < minX || maxY < minY) {
    entry.failed = true;
    return;
  }

  const trimW = maxX - minX + 1;
  const trimH = maxY - minY + 1;
  const maxOutW = 720;
  const outScale = Math.min(1, maxOutW / Math.max(trimW, 1));
  const outW = Math.max(1, Math.round(trimW * outScale));
  const outH = Math.max(1, Math.round(trimH * outScale));

  const out = document.createElement('canvas');
  out.width = outW;
  out.height = outH;
  const octx = out.getContext('2d');
  octx.imageSmoothingEnabled = true;
  octx.imageSmoothingQuality = 'high';
  octx.drawImage(work, minX, minY, trimW, trimH, 0, 0, outW, outH);
  dehaloSpriteCanvas(out);

  entry.frame = {
    canvas: out,
    w: outW,
    h: outH,
    aspect: outW / Math.max(outH, 1)
  };
}

function getCarSpriteFrame(car) {
  const candidates = getCarSpriteCandidates(car);
  if (!candidates.length) return null;

  for (const src of candidates) {
    let entry = carSpriteCache.get(src);
    if (!entry) {
      const img = new Image();
      entry = { img, loaded: false, failed: false, frame: null };
      if (/^https?:\/\//i.test(src)) {
        img.crossOrigin = 'anonymous';
      }
      img.decoding = 'async';
      img.onload = () => {
        entry.loaded = true;
        try {
          processCarSpriteEntry(entry);
        } catch (e) {
          console.warn('Sprite processing failed; using raw sprite:', src, e);
          setRawFrameFromImage(entry);
        }
      };
      img.onerror = () => { entry.failed = true; };
      img.src = withSpriteCacheBust(src);
      carSpriteCache.set(src, entry);
    }

    if (entry.loaded && !entry.frame && !entry.failed) {
      try {
        processCarSpriteEntry(entry);
      } catch {
        entry.failed = true;
      }
    }
    if (entry.frame) return entry.frame;
  }

  return null;
}

// ── Build the static offscreen track ──
function buildOffscreenTrack(W, H) {
  const oc = document.createElement('canvas');
  oc.width = W; oc.height = H;
  const ctx = oc.getContext('2d');
  const pts = trackPath;
  const N = pts.length;
  const trackW = TRACK_WIDTH_MULT;
  const runoffOuterW = 80 * trackW;
  const runoffInnerW = 74 * trackW;
  const outerKerbW = 56 * trackW;
  const innerKerbW = 38 * trackW;
  const asphaltShadowW = 30 * trackW;
  const asphaltMainW = 26 * trackW;
  const asphaltNoiseW = 24 * trackW;
  const edgeHighlightW = 27 * trackW;
  const edgeSealW = 24 * trackW;
  const raceLineOuterW = 8 * trackW;
  const raceLineInnerW = 3 * trackW;
  const drsGlowW = 22 * trackW;
  const centerLineW = 1.2 * trackW;

  function tracePath() {
    ctx.beginPath();
    pts.forEach(([x,y], i) => i === 0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y));
    ctx.closePath();
  }
  function strokeLayer(lw, style, dash=[]) {
    ctx.save(); tracePath();
    ctx.lineWidth = lw; ctx.strokeStyle = style;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    if (dash.length) ctx.setLineDash(dash);
    ctx.stroke(); ctx.setLineDash([]); ctx.restore();
  }

  // ── 1. Rich green environment ─────────────────────────────────────
  const bgGrad = ctx.createRadialGradient(W*0.5,H*0.45,0, W*0.5,H*0.5, Math.max(W,H)*0.75);
  bgGrad.addColorStop(0,   '#1a2e1a');
  bgGrad.addColorStop(0.4, '#152514');
  bgGrad.addColorStop(1,   '#0d1a0d');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // ── 2. Grass texture stripes ──────────────────────────────────────
  for (let row = 0; row < H; row += 14) {
    ctx.fillStyle = row % 28 === 0 ? 'rgba(255,255,255,0.018)' : 'rgba(0,0,0,0.02)';
    ctx.fillRect(0, row, W, 14);
  }

  // ── 3. Tarmac run-off zones (wide grey area outside track) ────────
  strokeLayer(runoffOuterW, '#26262b');
  strokeLayer(runoffInnerW, '#1e1e23');
  strokeLayer(runoffInnerW * 0.9, 'rgba(0,0,0,0.24)');

  // ── 4. Outer kerb — wide red/white alternating ────────────────────
  strokeLayer(outerKerbW, '#f5f5f5');  // white base
  ctx.save(); tracePath();
  ctx.lineWidth = outerKerbW; ctx.strokeStyle = '#c81414';
  ctx.setLineDash([18 * trackW, 18 * trackW]); ctx.lineJoin='round'; ctx.lineCap='butt';
  ctx.stroke(); ctx.setLineDash([]); ctx.restore();
  strokeLayer(outerKerbW * 0.22, 'rgba(255,255,255,0.22)');

  // ── 5. Inner kerb — slightly narrower ─────────────────────────────
  strokeLayer(innerKerbW, '#e8e8e8');
  ctx.save(); tracePath();
  ctx.lineWidth = innerKerbW; ctx.strokeStyle = '#aa1212';
  ctx.setLineDash([14 * trackW, 14 * trackW]); ctx.lineJoin='round'; ctx.lineCap='butt';
  ctx.stroke(); ctx.setLineDash([]); ctx.restore();
  strokeLayer(innerKerbW * 0.2, 'rgba(255,255,255,0.18)');

  // ── 6. Asphalt body ───────────────────────────────────────────────
  // Shadow/depth layer
  strokeLayer(asphaltShadowW, 'rgba(0,0,0,0.7)');
  // Main asphalt — dark blue-grey like real tarmac
  const asp = ctx.createLinearGradient(W*0.1,0, W*0.9,H);
  asp.addColorStop(0,   '#252530');
  asp.addColorStop(0.3, '#222230');
  asp.addColorStop(0.7, '#1e1e2c');
  asp.addColorStop(1,   '#1c1c28');
  strokeLayer(asphaltMainW, asp);
  // Slight crown highlight across the lane
  strokeLayer(asphaltMainW * 0.86, 'rgba(255,255,255,0.03)');

  // ── 7. Asphalt grain/noise ────────────────────────────────────────
  // Simulate aggregate texture with tiny noise strokes
  ctx.save(); tracePath();
  ctx.lineWidth = asphaltNoiseW;
  // Stipple-like pattern using semi-transparent white
  ctx.strokeStyle = 'rgba(255,255,255,0.012)';
  ctx.setLineDash([1 * trackW, 6 * trackW]); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.008)';
  ctx.setLineDash([2 * trackW, 11 * trackW]); ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,0.08)';
  ctx.setLineDash([6 * trackW, 19 * trackW]); ctx.stroke();
  ctx.setLineDash([]); ctx.restore();

  // ── 8. Subtle highlight on track edges ───────────────────────────
  strokeLayer(edgeHighlightW, 'rgba(255,255,255,0.05)');
  strokeLayer(edgeSealW, asp); // re-seal

  // ── 9. Tyre rubber racing line (dark buildup on ideal line) ───────
  ctx.save(); tracePath();
  ctx.lineWidth = raceLineOuterW;
  ctx.strokeStyle = 'rgba(10,8,5,0.62)';
  ctx.lineJoin = 'round'; ctx.stroke();
  // Slightly lighter center — worn rubber
  ctx.lineWidth = raceLineInnerW;
  ctx.strokeStyle = 'rgba(40,34,26,0.45)';
  ctx.stroke(); ctx.restore();

  // ── 10. DRS zones ─────────────────────────────────────────────────
  DRS_ZONES.forEach((zone, zi) => {
    const startIdx = Math.floor((zone.start||0) * N);
    const endIdx   = Math.floor((zone.end||0)   * N);
    ctx.save(); ctx.beginPath();
    const indices = [];
    let i = startIdx;
    for (let step=0; step<N && i!==endIdx; step++) {
      indices.push(i); i = (i+1)%N;
    }
    indices.forEach((idx,j) => {
      const [x,y] = pts[idx];
      j===0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y);
    });
    ctx.lineWidth = drsGlowW;
    // Animated-looking DRS glow
    const drsGrad = ctx.createLinearGradient(0,0,W,H);
    drsGrad.addColorStop(0,'rgba(0,200,255,0.15)');
    drsGrad.addColorStop(1,'rgba(0,150,255,0.08)');
    ctx.strokeStyle = drsGrad;
    ctx.lineJoin='round'; ctx.stroke();
    ctx.restore();

    // DRS label
    if (indices.length > 5) {
      const midIdx = indices[Math.floor(indices.length/2)];
      const [lx, ly] = pts[midIdx];
      ctx.save();
      ctx.fillStyle='rgba(0,0,0,0.65)';
      if(ctx.roundRect){ctx.beginPath();ctx.roundRect(lx-14,ly-20,28,13,3);ctx.fill();}
      ctx.font='bold 7px "Orbitron",monospace';
      ctx.fillStyle='rgba(0,220,255,0.9)'; ctx.textAlign='center';
      ctx.fillText(`DRS ${zi+1}`, lx, ly-10);
      ctx.restore();
    }
  });

  // ── 11. Center dashed white line ──────────────────────────────────
  ctx.save(); tracePath();
  ctx.lineWidth = centerLineW; ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.setLineDash([20 * trackW, 32 * trackW]); ctx.lineJoin='round'; ctx.stroke();
  ctx.setLineDash([]); ctx.restore();

  // ── 12. Sector boundary lines ─────────────────────────────────────
  SECTOR_SPLITS.forEach((frac, si) => {
    const idx = Math.floor(frac * N);
    const [sx, sy] = pts[idx], [nx, ny] = pts[(idx+1)%N];
    const ang = Math.atan2(ny-sy, nx-sx) + Math.PI/2;
    const col = si===0?'#ff3333':'#33ff88';
    ctx.save(); ctx.translate(sx,sy); ctx.rotate(ang);
    // Glow bar
    const g = ctx.createLinearGradient(-18,0,18,0);
    g.addColorStop(0,'transparent'); g.addColorStop(0.5,col); g.addColorStop(1,'transparent');
    ctx.fillStyle=g; ctx.globalAlpha=0.95; ctx.fillRect(-18,-2.5,36,5);
    ctx.restore();
    // Label
    ctx.save();
    const lx=sx+Math.cos(ang-Math.PI/2)*20, ly=sy+Math.sin(ang-Math.PI/2)*20;
    ctx.fillStyle='rgba(0,0,0,0.8)';
    if(ctx.roundRect){ctx.beginPath();ctx.roundRect(lx-12,ly-8,24,14,3);ctx.fill();}
    ctx.font='bold 8px "Orbitron",monospace';
    ctx.fillStyle=col; ctx.textAlign='center'; ctx.fillText(`S${si+2}`,lx,ly+4);
    ctx.restore();
  });

  // ── 13. Start/Finish line ─────────────────────────────────────────
  {
    const [sx,sy]=pts[0], [nx,ny]=pts[3];
    const ang=Math.atan2(ny-sy,nx-sx)+Math.PI/2;
    ctx.save(); ctx.translate(sx,sy); ctx.rotate(ang);
    // White line across full track width
    ctx.fillStyle='rgba(255,255,255,0.9)';
    ctx.fillRect(-16,-1.5,32,3);
    // Checkered blocks
    const sq=4, cols=8, rows=2;
    for(let r=0;r<rows;r++) for(let c=0;c<cols;c++) {
      ctx.fillStyle=(r+c)%2===0?'rgba(255,255,255,0.95)':'rgba(0,0,0,0.9)';
      ctx.fillRect(-cols*sq/2+c*sq, -rows*sq-1+r*sq, sq,sq);
    }
    ctx.restore();
    // S/F badge
    ctx.save();
    ctx.fillStyle='rgba(0,0,0,0.8)';
    if(ctx.roundRect){ctx.beginPath();ctx.roundRect(sx+18,sy-14,24,13,3);ctx.fill();}
    ctx.font='bold 7px "Orbitron",monospace';
    ctx.fillStyle='#ffd700'; ctx.textAlign='left'; ctx.fillText('S/F',sx+21,sy-4);
    ctx.restore();
  }

  // ── 14. Marshalling posts (small coloured triangles at intervals) ──
  for (let i = 0; i < N; i += Math.floor(N/16)) {
    const [px,py] = pts[i];
    const [nx,ny] = pts[(i+1)%N];
    const ang = Math.atan2(ny-py, nx-px) + Math.PI/2;
    ctx.save(); ctx.translate(px+Math.cos(ang)*20, py+Math.sin(ang)*20);
    ctx.fillStyle='rgba(0,200,80,0.55)';
    ctx.beginPath(); ctx.moveTo(0,-5); ctx.lineTo(3,3); ctx.lineTo(-3,3); ctx.closePath();
    ctx.fill(); ctx.restore();
  }

  return oc;
}

// ── spawnCars: detects real vs synthetic data and sets up accordingly ──
function spawnCars() {
  if (trackAnimFrame) { cancelAnimationFrame(trackAnimFrame); trackAnimFrame = null; }

  const canvas    = document.getElementById('trackCanvas');
  const container = document.getElementById('trackAnimation');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const W   = container.clientWidth;
  const H   = container.clientHeight;
  const canvasW = W * dpr;
  const canvasH = H * dpr;
  canvas.width  = canvasW;
  canvas.height = canvasH;
  canvas.style.width  = W + 'px';
  canvas.style.height = H + 'px';

  // ── Detect real FastF1 data ──────────────────────────────────────
  const hasRealCircuit = raceData?.circuit?.x?.length > 10;
  const hasRealFrames  = raceData?.frames?.length > 5;
  usingRealData = hasRealFrames;

  // Override DRS zones if real data has them
  if (raceData?.circuit?.drs_zones?.length) {
    DRS_ZONES = raceData.circuit.drs_zones;
  }

  // ── Build track path ─────────────────────────────────────────────
  let rawTrackPath = [];
  if (hasRealCircuit) {
    // Real FastF1 circuit geometry
    rawTrackPath = buildTrackPathFromReal(canvasW, canvasH,
      raceData.circuit.x, raceData.circuit.y);
    setStatus(`🗺 Real circuit: ${raceData.race.circuit} · ${rawTrackPath.length} path pts`);
  } else {
    // Synthetic fallback
    rawTrackPath = buildTrackPath(canvasW, canvasH, FALLBACK_WAYPOINTS);
    setStatus('⚠ No real circuit data — using synthetic Red Bull Ring layout');
  }

  const fitted = fitPathToViewport(rawTrackPath, canvasW, canvasH, TRACK_EDGE_PADDING_CSS * dpr);
  trackPath = fitted.path;
  trackViewportTransform = fitted.transform;

  trackNormals = buildNormals(trackPath);
  preRendered  = buildOffscreenTrack(canvasW, canvasH);
  initCarSpritesFromData();

  // ── Driver colour map ────────────────────────────────────────────
  const TEAM_CLR = {
    'Red Bull Racing':'#3671C6','Red Bull':'#3671C6',
    'Ferrari':        '#E8002D',
    'Mercedes':       '#00D2BE',
    'McLaren':        '#FF8000',
    'Aston Martin':   '#229971',
    'Alpine':         '#0093CC',
    'Williams':       '#64C4FF',
    'RB':             '#6692FF','Racing Bulls':'#6692FF',
    'Sauber':         '#52E252','Kick Sauber':'#52E252',
    'Haas':           '#B6BABD','Haas F1 Team':'#B6BABD',
  };

  const drivers  = (raceData?.drivers || []).slice(0, 20);
  const totalPts = trackPath.length;

  if (hasRealFrames) {
    // ── REAL MODE: position driven by frame data ─────────────────
    replayFrames = raceData.frames;
    replayTime   = 0; // always start from beginning

    // Auto-calculate speed: race duration / TARGET_DURATION wall-clock seconds
    const maxT = replayFrames[replayFrames.length - 1]?.t || 1;
    replaySpeed = maxT / TARGET_DURATION; // e.g. 8460s race / 180s = 47x speed

    // Initialise car objects from frame 0
    const f0 = replayFrames[0]?.cars || {};
    trackCars = drivers.map(d => {
      const fp = f0[d.code] || { x: 0.5, y: 0.5 };
      const [cx, cy] = realPosToCanvas(fp.x, fp.y, canvasW, canvasH);
      return {
        code:     d.code,
        color:    d.color || TEAM_CLR[d.team] || '#aaaaaa',
        teamName: d.team || '',
        pos:      d.pos || 1,
        tyre:     d.tyre || '—',
        canvasX:  cx, canvasY: cy,
        renderX:  cx, renderY: cy,
        prevX:    cx, prevY:   cy,
        laneOffset: 0,
        angle:    0,
        drsOpen:  false,
        lapCount: 0,
        progress: 0, baseSpeed: 0, speed: 0,
      };
    });

    const effectiveReplay = replaySpeed * BASE_PLAYBACK_MULT;
    setStatus(`✅ Real FastF1 data · ${drivers.length} drivers · ${replayFrames.length} frames · ${Math.round(maxT)}s · playing at ${effectiveReplay.toFixed(1)}x speed`);

  } else {
    // ── SYNTHETIC MODE: path-based animation ─────────────────────
    const spacing = totalPts * 0.066;
    trackCars = drivers.map((d, i) => {
      const baseSpd = 68 - i * 0.5;
      return {
        code:      d.code,
        color:     d.color || TEAM_CLR[d.team] || '#aaaaaa',
        teamName:  d.team || '',
        pos:       d.pos || (i + 1),
        progress:  (totalPts - i * spacing + totalPts * 2) % totalPts,
        baseSpeed: baseSpd,
        speed:     baseSpd,
        lapCount:  0,
        drsOpen:   false,
        canvasX:   0, canvasY: 0,
        renderX:   0, renderY: 0,
        prevX:     0, prevY:   0,
        laneOffset: 0,
        targetX:   0, targetY: 0,
        angle:     0,
      };
    });
  }

  lastTimestamp = 0;
  startRenderLoop(canvas);
}

function drawDriverLabel(ctx, cx, cy, car, isLeader) {
  const col = car.color;
  const s = (isLeader ? 1.55 : 1.4) * CAR_VISUAL_SCALE;
  ctx.save();
  const FS = 8.5 * s;
  ctx.font = `700 ${FS}px "IBM Plex Mono",monospace`;
  ctx.textAlign = 'center';
  const tw = ctx.measureText(car.code).width;
  const bW = tw + 14;
  const bH = 13;
  const bX = cx - bW / 2;
  const closePacked = (car._localDensity || 0) > 2;
  const yLift = closePacked ? (isLeader ? 22 * s : 20 * s) : (isLeader ? 30 * s : 27 * s);
  const bY = cy - yLift - bH / 2;
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = 7;
  ctx.fillStyle = 'rgba(6,6,12,0.92)';
  if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(bX, bY, bW, bH, 3); ctx.fill(); }
  else ctx.fillRect(bX, bY, bW, bH);
  ctx.shadowBlur = 0;
  ctx.fillStyle = col;
  if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(bX, bY, 4, bH, [3,0,0,3]); ctx.fill(); }
  else ctx.fillRect(bX, bY, 4, bH);
  ctx.fillStyle = 'rgba(255,255,255,0.38)';
  ctx.font = '500 7px "IBM Plex Mono",monospace';
  ctx.fillText(`P${car.pos}`, cx + tw / 2 + 2, bY + bH - 2);
  ctx.fillStyle = '#ffffff';
  ctx.font = `700 ${FS}px "IBM Plex Mono",monospace`;
  ctx.fillText(car.code, cx + 2.5, bY + bH - 3);
  ctx.restore();
}

function drawCarSprite(ctx, cx, cy, angle, car, isLeader) {
  const frame = getCarSpriteFrame(car);
  if (!frame) return false;

  const aspect = Math.max(1.4, Math.min(4.2, frame.aspect || 2.4));
  const scale = (isLeader ? 1.06 : 1) * (carSpriteConfig.scale || 1);
  const spriteW = 46 * scale * CAR_VISUAL_SCALE;
  const spriteH = spriteW / aspect;
  const drawW = spriteW * CAR_LENGTH_SCALE;
  const drawH = spriteH * 1.03;
  const rot = angle + (carSpriteConfig.rotationDeg || 0) * Math.PI / 180;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  // Subtle blend shadow without visible oval artifacts.
  ctx.shadowColor = 'rgba(0,0,0,0.22)';
  ctx.shadowBlur = 1.4;
  ctx.shadowOffsetY = 0.6;
  ctx.filter = `brightness(${CAR_BRIGHTNESS}) saturate(1.14) contrast(1.05)`;
  ctx.drawImage(frame.canvas, -drawW * 0.5, -drawH / 2, drawW, drawH);
  ctx.filter = 'none';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.restore();

  return true;
}

// ── Draw a single F1 car (top-down, detailed) ──
function drawCar(ctx, cx, cy, angle, car, isLeader) {
  const col = car.color;
  const s   = (isLeader ? 1.55 : 1.4) * CAR_VISUAL_SCALE; // leader slightly bigger

  if (drawCarSprite(ctx, cx, cy, angle, car, isLeader)) {
    drawDriverLabel(ctx, cx, cy, car, isLeader);
    return;
  }

  // ── Motion blur (speed streaks behind car) ──────────────────────
  if (usingRealData) {
    ctx.save();
    const blurLen = s * 10;
    const bx = cx - Math.cos(angle) * blurLen;
    const by = cy - Math.sin(angle) * blurLen;
    const blurGrad = ctx.createLinearGradient(cx, cy, bx, by);
    blurGrad.addColorStop(0, hexAlpha(col, 0.35));
    blurGrad.addColorStop(1, 'transparent');
    ctx.strokeStyle = blurGrad;
    ctx.lineWidth = s * 3.5;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(bx, by);
    ctx.stroke(); ctx.restore();
  }

  // ── Tyre skid marks ──────────────────────────────────────────────
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(angle);
  ctx.fillStyle = 'rgba(18,15,10,0.28)';
  [-4.8*s, 4.8*s].forEach(yo => ctx.fillRect(-10*s, yo-1, 16*s, 1.6));
  ctx.restore();

  // ── Exhaust heat glow ────────────────────────────────────────────
  ctx.save();
  const eg = ctx.createRadialGradient(
    cx-Math.cos(angle)*10*s, cy-Math.sin(angle)*10*s, 0,
    cx-Math.cos(angle)*10*s, cy-Math.sin(angle)*10*s, 15*s
  );
  eg.addColorStop(0, hexAlpha(col, 0.20));
  eg.addColorStop(0.6, hexAlpha(col, 0.05));
  eg.addColorStop(1, 'transparent');
  ctx.fillStyle = eg;
  ctx.beginPath();
  ctx.ellipse(cx-Math.cos(angle)*10*s, cy-Math.sin(angle)*10*s, 18*s, 8*s, angle, 0, Math.PI*2);
  ctx.fill(); ctx.restore();

  // ── Under-car drop shadow ────────────────────────────────────────
  ctx.save(); ctx.translate(cx+2, cy+2.5); ctx.rotate(angle);
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.beginPath(); ctx.ellipse(0,0, 12*s, 5*s, 0, 0, Math.PI*2); ctx.fill();
  ctx.restore();

  // ══════ CAR BODY ════════════════════════════════════════════════
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  ctx.scale(CAR_LENGTH_SCALE, 1.03);
  ctx.filter = `brightness(${CAR_BRIGHTNESS}) saturate(1.08)`;

  // ── TYRES ────────────────────────────────────────────────────────
  const wheels = [
    [ 7.5*s, -5.5*s, 3.5*s, 2.3*s],  // front-right
    [ 7.5*s,  5.5*s, 3.5*s, 2.3*s],  // front-left
    [-5.5*s, -5.3*s, 3.8*s, 2.5*s],  // rear-right
    [-5.5*s,  5.3*s, 3.8*s, 2.5*s],  // rear-left
  ];
  // Tyre compound colour rim band
  const TYRE_RIM = {S:'#cc0000',M:'#cc8800',H:'#888888',I:'#006622',W:'#0044cc'};
  const rimCol = TYRE_RIM[car.tyre] || '#333';
  wheels.forEach(([wx,wy,ww,wh]) => {
    // Tyre body
    ctx.fillStyle = '#141210';
    ctx.beginPath(); ctx.ellipse(wx,wy,ww,wh,0,0,Math.PI*2); ctx.fill();
    // Compound band
    ctx.strokeStyle = rimCol; ctx.lineWidth = 1.0;
    ctx.beginPath(); ctx.ellipse(wx,wy,ww*0.82,wh*0.82,0,0,Math.PI*2); ctx.stroke();
    // Rim
    ctx.fillStyle = '#2a2828';
    ctx.beginPath(); ctx.ellipse(wx,wy,ww*0.55,wh*0.55,0,0,Math.PI*2); ctx.fill();
    // Center hub
    ctx.fillStyle = 'rgba(210,210,210,0.6)';
    ctx.beginPath(); ctx.arc(wx,wy,ww*0.22,0,Math.PI*2); ctx.fill();
  });

  // ── FRONT WING ───────────────────────────────────────────────────
  ctx.fillStyle = col; ctx.shadowColor = hexAlpha(col,0.5); ctx.shadowBlur = 5;
  ctx.beginPath();
  ctx.moveTo(14*s, -8*s); ctx.lineTo(11.5*s,-3.8*s); ctx.lineTo(12.5*s,-3.8*s);
  ctx.lineTo(12.5*s,3.8*s); ctx.lineTo(11.5*s,3.8*s); ctx.lineTo(14*s,8*s);
  ctx.lineTo(12.5*s,8*s);  ctx.lineTo(10.5*s,3.8*s); ctx.lineTo(10.5*s,-3.8*s);
  ctx.lineTo(12.5*s,-8*s); ctx.closePath(); ctx.fill();
  // Cascade
  ctx.fillStyle = darkenColor(col,40);
  ctx.beginPath();
  ctx.moveTo(11*s,-7*s); ctx.lineTo(10*s,-3.8*s); ctx.lineTo(10*s,3.8*s);
  ctx.lineTo(11*s,7*s);  ctx.lineTo(9*s,7*s);   ctx.lineTo(8.5*s,3.8*s);
  ctx.lineTo(8.5*s,-3.8*s); ctx.lineTo(9*s,-7*s); ctx.closePath(); ctx.fill();
  ctx.shadowBlur = 0;

  // ── NOSE ─────────────────────────────────────────────────────────
  ctx.fillStyle = col;
  ctx.beginPath(); ctx.moveTo(15*s,0); ctx.lineTo(8.5*s,-2.2*s);
  ctx.lineTo(6.5*s,-2.2*s); ctx.lineTo(6.5*s,2.2*s); ctx.lineTo(8.5*s,2.2*s);
  ctx.closePath(); ctx.fill();

  // ── CHASSIS ──────────────────────────────────────────────────────
  const chGrad = ctx.createLinearGradient(-7*s,-5*s,-7*s,5*s);
  chGrad.addColorStop(0,   lightenColor(col,22));
  chGrad.addColorStop(0.3, lightenColor(col,8));
  chGrad.addColorStop(0.7, col);
  chGrad.addColorStop(1,   darkenColor(col,28));
  ctx.fillStyle = chGrad;
  ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 1.5;
  ctx.beginPath();
  ctx.moveTo(8*s,-3*s);
  ctx.bezierCurveTo(6*s,-4*s, -4*s,-4.5*s, -7.5*s,-4*s);
  ctx.lineTo(-7.5*s,4*s);
  ctx.bezierCurveTo(-4*s,4.5*s, 6*s,4*s, 8*s,3*s);
  ctx.closePath(); ctx.fill();
  ctx.shadowBlur=0; ctx.shadowOffsetY=0;

  // ── SIDEPODS ─────────────────────────────────────────────────────
  [[-3*s,-4.5*s,7*s,3*s],[-3*s,1.5*s,7*s,3*s]].forEach(([rx,ry,rw,rh])=>{
    ctx.fillStyle = darkenColor(col,18);
    ctx.beginPath();
    if(ctx.roundRect) ctx.roundRect(rx,ry,rw,rh,1.5); else ctx.rect(rx,ry,rw,rh);
    ctx.fill();
    // Air intake
    ctx.fillStyle='rgba(0,0,0,0.75)';
    ctx.beginPath(); ctx.ellipse(rx+2.5,ry+(rh<0?rh*0.3:rh*0.5),2,1,0,0,Math.PI*2); ctx.fill();
  });

  // ── HALO ─────────────────────────────────────────────────────────
  ctx.fillStyle = darkenColor(col,45);
  ctx.strokeStyle='rgba(0,0,0,0.5)'; ctx.lineWidth=0.6;
  ctx.beginPath(); ctx.ellipse(1.5*s,0,3.5*s,2.2*s,0,0,Math.PI*2);
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = darkenColor(col,35);
  ctx.fillRect(-0.3*s,-0.7*s,3.2*s,1.4*s); // center strut

  // ── COCKPIT / HELMET ─────────────────────────────────────────────
  ctx.fillStyle = lightenColor(col,15);
  ctx.beginPath(); ctx.ellipse(1*s,0,3*s,2.6*s,0,0,Math.PI*2); ctx.fill();
  const hg = ctx.createRadialGradient(1.3*s,-0.7*s,0,1*s,0,2.4*s);
  hg.addColorStop(0,'#ffffff'); hg.addColorStop(0.3,'#e8e8e8'); hg.addColorStop(1,'#909090');
  ctx.fillStyle=hg;
  ctx.beginPath(); ctx.ellipse(1*s,0,2*s,1.6*s,0,0,Math.PI*2); ctx.fill();
  // Visor
  ctx.fillStyle='rgba(10,50,80,0.88)';
  ctx.beginPath(); ctx.ellipse(1.9*s,0,1.3*s,1*s,-0.2,0,Math.PI); ctx.fill();
  ctx.fillStyle='rgba(150,210,255,0.35)';
  ctx.beginPath(); ctx.ellipse(2.2*s,-0.4*s,0.5*s,0.3*s,-0.3,0,Math.PI*2); ctx.fill();

  // ── ENGINE COVER / AIRBOX ────────────────────────────────────────
  ctx.fillStyle=darkenColor(col,12);
  ctx.beginPath(); ctx.moveTo(3.5*s,-1.6*s); ctx.lineTo(-4.5*s,-1.3*s);
  ctx.lineTo(-4.5*s,1.3*s); ctx.lineTo(3.5*s,1.6*s); ctx.closePath(); ctx.fill();
  ctx.fillStyle='rgba(0,0,0,0.65)';
  ctx.beginPath(); ctx.ellipse(-1.2*s,0,1.3*s,0.75*s,0,0,Math.PI*2); ctx.fill();

  // ── REAR WING ────────────────────────────────────────────────────
  ctx.fillStyle = lightenColor(col,10);
  ctx.beginPath();
  ctx.moveTo(-7.5*s,-7*s);  ctx.lineTo(-6*s,-4*s); ctx.lineTo(-6*s,4*s);
  ctx.lineTo(-7.5*s,7*s);   ctx.lineTo(-9*s,7*s);  ctx.lineTo(-7.5*s,4*s);
  ctx.lineTo(-7.5*s,-4*s);  ctx.lineTo(-9*s,-7*s); ctx.closePath(); ctx.fill();
  // DRS open indicator
  if (car.drsOpen) {
    ctx.strokeStyle='rgba(0,220,255,0.85)'; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.moveTo(-7.5*s,-6.5*s); ctx.lineTo(-7.5*s,6.5*s); ctx.stroke();
    // DRS glow
    ctx.shadowColor='rgba(0,200,255,0.7)'; ctx.shadowBlur=8;
    ctx.stroke(); ctx.shadowBlur=0;
  }
  // End plates
  [[-6.5*s,-4.5*s,-2.5*s,1],[-6.5*s,3.5*s,-2.5*s,-1]].forEach(([epx,epy,epw,dir])=>{
    ctx.fillStyle=darkenColor(col,22);
    ctx.fillRect(epx,epy,epw,dir*0.8*s);
  });

  // ── LEADER GLOW ──────────────────────────────────────────────────
  if (isLeader) {
    ctx.strokeStyle='rgba(255,215,0,0.7)'; ctx.lineWidth=1.5;
    ctx.shadowColor='rgba(255,200,0,0.6)'; ctx.shadowBlur=10;
    ctx.beginPath(); ctx.ellipse(0,0,13*s,5.5*s,0,0,Math.PI*2);
    ctx.stroke(); ctx.shadowBlur=0;
  }

  ctx.filter = 'none';
  ctx.restore(); // end car transform

  drawDriverLabel(ctx, cx, cy, car, isLeader);
}

function applyOvertakeLaneOffsets(cars, dt) {
  const gapMult = Math.max(1, Math.min(CAR_GAP_MULT, 8));
  const minSep = 48 * CAR_VISUAL_SCALE; // local collision relief distance
  const laneMax = 14 * CAR_VISUAL_SCALE; // keep width-wise motion subtle
  const orderLongGap = 36 * CAR_VISUAL_SCALE * gapMult; // requested front/back gap
  const longMax = Math.max(88 * CAR_VISUAL_SCALE, orderLongGap * 1.55); // don't cap away user gap
  const iterations = 4;
  const eps = 1e-3;

  // Start from telemetry position.
  cars.forEach((car) => {
    car._rx = car.canvasX;
    car._ry = car.canvasY;
    car._localDensity = 0;
  });

  // Deterministic lane staggering helps corner packs before repulsion kicks in.
  const posOrder = [...cars].sort((a, b) => (a.pos || 999) - (b.pos || 999));
  posOrder.forEach((car, i) => {
    const laneSeed = ((i % 3) - 1) * 2.2 * CAR_VISUAL_SCALE;
    const nx = -Math.sin(car.angle || 0);
    const ny = Math.cos(car.angle || 0);
    car._rx += nx * laneSeed;
    car._ry += ny * laneSeed;
  });

  // Enforce extra longitudinal gap by race order (front/back spacing).
  for (let pass = 0; pass < 4; pass++) {
    for (let i = 1; i < posOrder.length; i++) {
      const ahead = posOrder[i - 1];
      const behind = posOrder[i];
      const ang = (Number.isFinite(behind.angle) ? behind.angle : (ahead.angle || 0));
      const tx = Math.cos(ang);
      const ty = Math.sin(ang);
      const gap = (ahead._rx - behind._rx) * tx + (ahead._ry - behind._ry) * ty;
      if (gap >= orderLongGap) continue;
      const deficit = (orderLongGap - gap);
      // Push the following car back harder than we pull the car ahead forward.
      ahead._rx += tx * deficit * 0.16;
      ahead._ry += ty * deficit * 0.16;
      behind._rx -= tx * deficit * 0.92;
      behind._ry -= ty * deficit * 0.92;
      ahead._localDensity++;
      behind._localDensity++;
    }
  }

  // Push cars apart in screen-space when too close.
  for (let it = 0; it < iterations; it++) {
    for (let i = 0; i < cars.length; i++) {
      const a = cars[i];
      for (let j = i + 1; j < cars.length; j++) {
        const b = cars[j];
        const dx = b._rx - a._rx;
        const dy = b._ry - a._ry;
        const dist = Math.hypot(dx, dy);
        if (dist >= minSep) continue;
        a._localDensity++;
        b._localDensity++;

        const overlap = (minSep - Math.max(dist, eps)) * 0.5;
        const ux = dist > eps ? dx / dist : (((i + j) % 2 ? 1 : -1) * 0.7071);
        const uy = dist > eps ? dy / dist : (((i + j) % 2 ? -1 : 1) * 0.7071);
        a._rx -= ux * overlap;
        a._ry -= uy * overlap;
        b._rx += ux * overlap;
        b._ry += uy * overlap;
      }
    }
  }

  // Constrain offset so cars still follow the track naturally.
  const blend = Math.min(1, dt * 7.2);
  cars.forEach((car) => {
    const ang = car.angle || 0;
    const tx = Math.cos(ang), ty = Math.sin(ang);
    const nx = -Math.sin(ang), ny = Math.cos(ang);
    const dx = car._rx - car.canvasX;
    const dy = car._ry - car.canvasY;

    const lateral = Math.max(-laneMax, Math.min(laneMax, dx * nx + dy * ny));
    const longitudinal = Math.max(-longMax, Math.min(longMax, dx * tx + dy * ty));

    let targetX = car.canvasX + nx * lateral + tx * longitudinal;
    let targetY = car.canvasY + ny * lateral + ty * longitudinal;

    // Hard safety clamp: keep visual offsets within track corridor, tighter in corners.
    const idx = findNearestTrackIndex(car.canvasX, car.canvasY, car._trackIdxHint);
    car._trackIdxHint = idx;
    const N = trackPath.length;
    const base = trackPath[idx] || [car.canvasX, car.canvasY];
    const prev = trackPath[(idx - 2 + N) % N] || base;
    const next = trackPath[(idx + 2) % N] || base;
    const t0 = Math.atan2(base[1] - prev[1], base[0] - prev[0]);
    const t1 = Math.atan2(next[1] - base[1], next[0] - base[0]);
    const bend = Math.abs(normalizeAngle(t1 - t0));
    const cornerFactor = Math.min(1, bend / 0.85);

    const tdx = next[0] - prev[0];
    const tdy = next[1] - prev[1];
    const tLen = Math.hypot(tdx, tdy) || 1;
    const ux = tdx / tLen;
    const uy = tdy / tLen;
    const vx = -uy;
    const vy = ux;

    const laneHard = (11 + 1.5 * (1 - cornerFactor)) * TRACK_WIDTH_MULT;
    const longHard = (42 - 18 * cornerFactor) * CAR_VISUAL_SCALE;

    const rx = targetX - base[0];
    const ry = targetY - base[1];
    const pLat = Math.max(-laneHard, Math.min(laneHard, rx * vx + ry * vy));
    const pLong = Math.max(-longHard, Math.min(longHard, rx * ux + ry * uy));
    targetX = base[0] + vx * pLat + ux * pLong;
    targetY = base[1] + vy * pLat + uy * pLong;

    if (!Number.isFinite(car.renderX) || !Number.isFinite(car.renderY)) {
      car.renderX = targetX;
      car.renderY = targetY;
    }
    car.renderX += (targetX - car.renderX) * blend;
    car.renderY += (targetY - car.renderY) * blend;
  });
}


// ── Main render loop ──
function startRenderLoop(canvas) {
  const ctx = canvas.getContext('2d');
  const W   = canvas.width;
  const H   = canvas.height;
  const N   = trackPath.length;

  // ── Curvature for synthetic mode ─────────────────────────────────
  const curvature = trackPath.map((pt, i) => {
    const prev = trackPath[(i-3+N)%N], next = trackPath[(i+3)%N];
    const dx1=pt[0]-prev[0], dy1=pt[1]-prev[1];
    const dx2=next[0]-pt[0], dy2=next[1]-pt[1];
    return Math.atan2(Math.abs(dx1*dy2-dy1*dx2), Math.max(dx1*dx2+dy1*dy2, 0.001));
  });

  // ── Trail canvas ─────────────────────────────────────────────────
  const trailCanvas = document.createElement('canvas');
  trailCanvas.width = W; trailCanvas.height = H;
  const trailCtx = trailCanvas.getContext('2d');

  // ── Overlays ─────────────────────────────────────────────────────
  document.querySelectorAll('#trackAnimation .gap-overlay').forEach(e=>e.remove());
  const gapOverlay = document.createElement('div');
  gapOverlay.className = 'gap-overlay';
  gapOverlay.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:12;';
  document.getElementById('trackAnimation').appendChild(gapOverlay);

  // ── Real-data: pre-index frames by frame number ───────────────────
  // replayFrames[i].t is 0-based seconds. We advance a frameIdx each tick.
  // frameIdx = Math.floor(replayTime) since frames are 1s apart.
  // This avoids ALL binary search bugs.
  const maxFrameIdx = replayFrames.length - 1;

  let lastGapUpdate = 0;

  function frame(ts) {
    if (!lastTimestamp) lastTimestamp = ts;
    const dt = Math.min((ts - lastTimestamp) / 1000, 0.05); // cap at 50ms
    lastTimestamp = ts;

    // ── Advance time (only when playing) ─────────────────────────
    if (isPlaying) {
      if (usingRealData) {
        replayTime += dt * replaySpeed * userSpeedMult * BASE_PLAYBACK_MULT;
        const maxT = replayFrames[maxFrameIdx]?.t || 0;
        if (replayTime >= maxT) {
          replayTime = maxT;
          // stop — startPlay's setInterval will detect and call pausePlay
        }
      }
      // Synthetic: progress advanced per-car below
    }

    // ── Fade trails ───────────────────────────────────────────────
    trailCtx.fillStyle = 'rgba(0,0,0,0.06)';
    trailCtx.fillRect(0, 0, W, H);

    // ── Update & draw cars ────────────────────────────────────────
    trackCars.forEach(car => {
      if (usingRealData) {
        // Direct frame index lookup — no binary search
        const fi = Math.min(Math.floor(replayTime), maxFrameIdx);
        const fi2 = Math.min(fi + 1, maxFrameIdx);
        const f0 = replayFrames[fi];
        const f1 = replayFrames[fi2];
        const c0 = f0?.cars?.[car.code];
        const c1 = f1?.cars?.[car.code];

        if (c0) {
          let nx, ny;
          if (c1 && fi2 !== fi) {
            // Sub-frame interpolation
            const alpha = replayTime - fi;
            nx = c0.x + (c1.x - c0.x) * alpha;
            ny = c0.y + (c1.y - c0.y) * alpha;
          } else {
            nx = c0.x; ny = c0.y;
          }
          const [px, py] = realPosToCanvas(nx, ny, W, H);
          if (!Number.isFinite(car.canvasX) || !Number.isFinite(car.canvasY)) {
            car.canvasX = px;
            car.canvasY = py;
          }
          const dx = px - car.canvasX;
          const dy = py - car.canvasY;
          const dist = Math.hypot(dx, dy);
          const posBlend = Math.min(1, dt * 14);
          car.canvasX += dx * posBlend;
          car.canvasY += dy * posBlend;
          if (dist > 0.18) {
            const targetAngle = Math.atan2(dy, dx);
            car.angle = smoothAngle(car.angle, targetAngle, Math.min(1, dt * 10));
          }
        }
      } else {
        // Synthetic path movement
        const p = ((car.progress % N) + N) % N;
        const idx = Math.floor(p);
        const frac = p - idx;
        const i0 = (idx - 1 + N) % N;
        const i1 = idx;
        const i2 = (idx + 1) % N;
        const i3 = (idx + 2) % N;
        const [cx, cy] = catmullRomPoint(trackPath[i0], trackPath[i1], trackPath[i2], trackPath[i3], frac);
        const [tx, ty] = catmullRomTangent(trackPath[i0], trackPath[i1], trackPath[i2], trackPath[i3], frac);
        car.canvasX = cx;
        car.canvasY = cy;
        car._trackIdxHint = idx;
        const targetAngle = Math.atan2(ty, tx);
        car.angle = smoothAngle(car.angle, targetAngle, Math.min(1, dt * 13));
        const curv = lerp(curvature[idx] || 0, curvature[(idx + 1) % N] || 0, frac);
        const tspd  = car.baseSpeed * Math.max(0.38, 1 - curv * 2.2);
        car.speed  += (tspd - car.speed) * Math.min(dt*4, 1);
        car.progress += car.speed * dt * BASE_PLAYBACK_MULT;
        if (car.progress >= N) { car.progress -= N; car.lapCount++; }
      }
    });

    // Give cars lateral room during close racing so overtakes are visible.
    applyOvertakeLaneOffsets(trackCars, dt);

    // Trail dots
    trackCars.forEach(car => {
      trailCtx.save();
      trailCtx.globalAlpha = 0.45;
      trailCtx.fillStyle = car.color;
      trailCtx.beginPath();
      trailCtx.arc(car.renderX, car.renderY, 2.5, 0, Math.PI*2);
      trailCtx.fill();
      trailCtx.restore();
    });

    // ── Composite ─────────────────────────────────────────────────
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(preRendered, 0, 0);
    ctx.save(); ctx.globalAlpha = 0.55; ctx.drawImage(trailCanvas, 0, 0); ctx.restore();

    // Draw cars back→front
    [...trackCars].sort((a,b) => b.pos - a.pos).forEach(car => {
      if (car.renderX > 0 && car.renderY > 0) {
        drawCar(ctx, car.renderX, car.renderY, car.angle, car, car.pos === 1);
      }
    });

    trackAnimFrame = requestAnimationFrame(frame);
  }

  trackAnimFrame = requestAnimationFrame(frame);
}


function showEvents(lap) {
  const events = (raceData.events || []).filter(e => e.lap === lap);
  events.forEach(e => {
    const key = `${e.lap}-${e.type}`;
    if (shownEvents.has(key)) return;
    shownEvents.add(key);

    // Bottom TV event strip
    const strip = document.getElementById('tvEventStrip');
    if (strip) {
      strip.innerHTML = `
        <span class="tv-event-type ${e.type}">${e.type.toUpperCase()}</span>
        <span class="tv-event-msg">${e.message}</span>
        <span class="tv-event-lap">LAP ${e.lap}</span>
      `;
      strip.style.animation = 'none';
      void strip.offsetWidth;
      strip.style.animation = '';
    }

    // Fastest lap flash overlay
    if (e.type === 'fastest') {
      const flash = document.getElementById('tvFastestFlash');
      const match = e.message.match(/[\d:]+\.[\d]+/);
      document.getElementById('fflTime').textContent = match ? match[0] : '—';
      document.getElementById('fflDriver').textContent = `${e.driver} · LAP ${e.lap}`;
      flash.classList.remove('show');
      void flash.offsetWidth;
      flash.classList.add('show');
      setTimeout(() => flash.classList.remove('show'), 3200);
    }
  });
}

// ── Compute current tyre for a driver at a given lap ──────────────
function getCurrentTyre(driverCode, lap) {
  const strat = raceData.strategy;
  if (!strat) return null;

  // Handle both array and object formats
  let stints = Array.isArray(strat)
    ? (strat.find(s => s.driver === driverCode)?.stints || [])
    : (strat[driverCode] || []);

  // Normalise object format stints {compound, start, end} → {compound, laps, startLap}
  const normStints = stints.map((st, i) => {
    if (st.start != null) return { compound: st.compound, startLap: st.start, endLap: st.end };
    // Array format: accumulate laps
    const prevLaps = stints.slice(0, i).reduce((s, x) => s + (x.laps || 0), 0);
    return { compound: st.compound, startLap: prevLaps + 1, endLap: prevLaps + (st.laps || 0) };
  });

  const cur = normStints.find(s => lap >= s.startLap && lap <= s.endLap);
  return cur?.compound || normStints[normStints.length - 1]?.compound || null;
}

// ── Get car track progress (0-1) at current replayTime ───────────
// Uses frame data to find nearest trackPath point
function getCarTrackProgress(code) {
  if (!replayFrames.length || !trackPath.length) return null;
  const fi = Math.min(Math.floor(replayTime), replayFrames.length - 1);
  const pos = replayFrames[fi]?.cars?.[code];
  if (!pos) return null;
  const canvas = document.getElementById('trackCanvas');
  const W = canvas?.width || 800, H = canvas?.height || 600;
  const [px, py] = realPosToCanvas(pos.x, pos.y, W, H);
  const N = trackPath.length;
  let bestIdx = 0, bestDist = Infinity;
  for (let i = 0; i < N; i += 3) {
    const [tx,ty] = trackPath[i];
    const d = (px-tx)**2 + (py-ty)**2;
    if (d < bestDist) { bestDist = d; bestIdx = i; }
  }
  return bestIdx / N;
}

// ── Compute live standings from frame data ────────────────────────
function getLiveStandings(lap) {
  const drivers = raceData.drivers || [];

  // Always update tyre for all modes
  const withTyre = drivers.map(d => ({
    ...d,
    tyre: getCurrentTyre(d.code, lap) || d.tyre || '—'
  }));

  if (!usingRealData || !replayFrames.length || replayTime < 1) {
    return withTyre;
  }

  // Build live position order from track progress
  const progress = [];
  withTyre.forEach(d => {
    const p = getCarTrackProgress(d.code);
    if (p !== null) progress.push({ driver: d, progress: p });
  });

  if (progress.length < 2) return withTyre; // not enough data yet

  // Sort descending — higher progress = further ahead on track
  progress.sort((a, b) => b.progress - a.progress);

  const leaderProgress = progress[0].progress;

  return progress.map((item, i) => {
    const d = item.driver;
    let gap;
    if (i === 0) {
      gap = 'LEADER';
    } else {
      const fracBehind = leaderProgress - item.progress;
      // 1 full lap ≈ 70–100s in F1; use 85s as a reasonable average
      const secsBehind = fracBehind * 85;
      gap = secsBehind > 75 ? (d.gap || 'LAP') : `+${secsBehind.toFixed(1)}s`;
    }
    return { ...d, pos: i + 1, gap };
  });
}

function updatePlayback(lap) {
  const lapValue = clampLapValue(lap);
  currentLap = lapValue;
  const displayLap = lapValueToCurrentLap(lapValue);

  // Header badge
  document.getElementById('headerLapBadge').textContent = `LAP ${displayLap} / ${totalLaps}`;

  // TV lap counter
  const tvCur = document.getElementById('tvLapCurrent');
  const tvReadout = document.getElementById('tvLapReadout');
  const tvTowerLap = document.getElementById('tvTowerLap');
  if (tvCur) tvCur.textContent = displayLap;
  if (tvReadout) tvReadout.textContent = `LAPS ${displayLap} / ${totalLaps}`;
  if (tvTowerLap) tvTowerLap.textContent = `LAP ${displayLap} / ${totalLaps}`;

  // Race clock — use real replayTime if available, else estimate
  let elapsed;
  if (usingRealData && replayFrames.length) {
    elapsed = Math.floor(replayTime);
  } else {
    elapsed = Math.floor((lapValue / Math.max(totalLaps, 1)) * 5400);
  }
  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60).toString().padStart(2, '0');
  const s = (elapsed % 60).toString().padStart(2, '0');
  const clockEl = document.getElementById('tvRaceClock');
  if (clockEl) clockEl.textContent = `+${h}:${m}:${s}`;

  // Progress bar
  const pct = ((lapValue / Math.max(totalLaps, 1)) * 100).toFixed(3);
  const tvHud = document.getElementById('tvLapCounter');
  if (tvHud) tvHud.style.setProperty('--lap-progress-pct', pct);
  document.getElementById('progressFill').style.width = `${pct}%`;
  document.getElementById('tlTime').textContent = `LAP ${displayLap} / ${totalLaps}`;
  setActiveLapChip(displayLap);

  // Update timing tower and ORDER tab with live standings
  const standings = getLiveStandings(Math.max(1, displayLap));
  safeRenderTimingTower(standings);
  renderLiveLeaderboard(standings, displayLap);

  // Sync tyre on canvas car objects
  standings.forEach(d => {
    const car = trackCars.find(c => c.code === d.code);
    if (car) { car.pos = d.pos; car.tyre = d.tyre; }
  });

  if (displayLap >= 1) showEvents(displayLap);
}

// ── Live leaderboard — updates ORDER tab during playback ──────────
function renderLiveLeaderboard(standings, displayLap) {
  renderLeaderboardRows(standings || [], {
    uptoLap: displayLap,
    displayLap,
    live: true
  });
}

let userSpeedMult = 1.0; // user-controlled multiplier on top of auto replaySpeed
const SPEED_STEPS  = [0.5, 1, 2, 4];

function cycleSpeed() {
  const cur = SPEED_STEPS.indexOf(userSpeedMult);
  userSpeedMult = SPEED_STEPS[(cur + 1) % SPEED_STEPS.length];
  const btn = document.getElementById('speedBtn');
  if (btn) btn.textContent = userSpeedMult + '×';
}

function togglePlay() {
  if (!raceData) return;
  if (isPlaying) pausePlay();
  else startPlay();
}

function startPlay() {
  if (usingRealData && replayTime >= (replayFrames[replayFrames.length-1]?.t || 0)) replayTime = 0;
  if (!usingRealData && currentLap >= totalLaps) currentLap = 0;

  isPlaying = true;
  document.getElementById('playBtn').textContent = '⏸';
  document.getElementById('playBtn').classList.add('active');

  if (usingRealData) {
    // Canvas render loop already advances replayTime each frame.
    // Just poll to sync the UI (lap counter, timing tower, events).
    clearInterval(playTimer);
    playTimer = setInterval(() => {
      if (!isPlaying) return;
      const maxT = replayFrames[replayFrames.length - 1]?.t || 1;
      const rawLap = (replayTime / maxT) * totalLaps;
      const lap = clampLapValue(rawLap);
      updatePlayback(lap); // always update — handles tyre changes, events etc
      if (replayTime >= maxT) {
        pausePlay();
        setStatus('✓ Recap complete!');
      }
    }, 50); // 20x/sec keeps timeline motion smooth
  } else {
    // Synthetic mode: advance in small lap fractions for smooth timeline motion
    const tickMs = 50;
    const lapPerSecond = (totalLaps / TARGET_DURATION) * BASE_PLAYBACK_MULT;
    clearInterval(playTimer);
    playTimer = setInterval(() => {
      if (!isPlaying) return;
      currentLap = Math.min(currentLap + lapPerSecond * userSpeedMult * (tickMs / 1000), totalLaps);
      updatePlayback(currentLap);
      if (currentLap >= totalLaps) { pausePlay(); setStatus('✓ Recap complete!'); }
    }, tickMs);
  }
}

function pausePlay() {
  isPlaying = false;
  clearInterval(playTimer);
  document.getElementById('playBtn').textContent = '▶';
  document.getElementById('playBtn').classList.remove('active');
}

function seekToLap(lap) {
  lap = clampLapValue(lap);
  currentLap = lap;
  if (usingRealData && replayFrames.length) {
    const maxT = replayFrames[replayFrames.length - 1].t;
    replayTime = (lap / Math.max(totalLaps, 1)) * maxT;
  }
  updatePlayback(lap);
}

function seekRelative(delta) { seekToLap(Math.round(currentLap) + delta); }

function seekClick(e) {
  if (!raceData) return;
  const rect = e.currentTarget.getBoundingClientRect();
  const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / Math.max(rect.width, 1)));
  seekToLap(pct * totalLaps);
}

function switchTab(name, btn) {
  document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.stab').forEach(b => b.classList.remove('active'));
  document.getElementById(`tab-${name}`).classList.add('active');
  btn.classList.add('active');
}

// Pre-fill textarea with sample on page load
window.onload = () => {
  document.getElementById('jsonInput').value = JSON.stringify(SAMPLE_DATA, null, 2);
  setStatus('Sample data pre-loaded — click SAMPLE to auto-generate, or paste your own JSON');
};

// Resize canvas when window resizes
window.addEventListener('resize', () => {
  if (raceData && document.getElementById('raceRecap').classList.contains('active')) {
    if (trackAnimFrame) { cancelAnimationFrame(trackAnimFrame); trackAnimFrame = null; }
    spawnCars();
  }
});
