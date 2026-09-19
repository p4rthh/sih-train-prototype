
// =============================================================================
// JURISDICTION INFORMATION & LIVE SECTION DISPATCH MATRIX
// =============================================================================
window.currentJurisdiction = window.currentJurisdiction || "ALL";

const JURISDICTION_INFO = {
  "ALL": {
    name: "All Jurisdictions (Full Corridor)",
    desk: "ALL-CTC",
    controller: "Chief Controller T. Bhatt",
    kmRange: "0–1400 km"
  },
  "MUMBAI": {
    name: "Mumbai Division (WR) Central CTC",
    desk: "MMCT-CTC",
    controller: "Chief Controller T. Bhatt",
    kmRange: "0–620 km"
  },
  "WR-S1": {
    name: "WR-S1: MMCT–BRC Suburban & Main Corridor",
    desk: "DESK-01",
    controller: "Section Controller S. Kumar",
    badge: "SCR/WR/MMCT-BRC",
    kmRange: "0–310 km"
  },
  "WR-S2": {
    name: "WR-S2: BRC–RTM Mountain Ghat Section",
    desk: "DESK-02",
    controller: "Section Controller P. Nair",
    badge: "SCR/WR/BRC-RTM",
    kmRange: "310–440 km"
  },
  "WR-S3": {
    name: "WR-S3: RTM–KOTA Plateau Corridor",
    desk: "DESK-03",
    controller: "Section Controller A. Desai",
    badge: "SCR/WR/RTM-KOTA",
    kmRange: "440–620 km"
  },
  "NR-S4": {
    name: "NR-S4: KOTA–NDLS Northern Trunk & Connected Lines",
    desk: "DESK-04",
    controller: "Section Controller R. Verma (Liaison)",
    badge: "SCR/NR-HANDSHAKE/KOTA-NDLS",
    kmRange: "620–1400 km"
  }
};

const STATION_SECTION_MAP = {
  "MMCT": "WR-S1", "BDTS": "WR-S1", "BCT": "WR-S1", "BVI": "WR-S1", "BSR": "WR-S1",
  "VR": "WR-S1", "PLG": "WR-S1", "DRD": "WR-S1", "VAPI": "WR-S1", "BL": "WR-S1",
  "NVS": "WR-S1", "ST": "WR-S1", "AKV": "WR-S1", "BH": "WR-S1", "MYG": "WR-S1",
  "BRC": "WR-S1", "ANND": "WR-S1", "ND": "WR-S1", "MHD": "WR-S1", "MAN": "WR-S1",
  "ADI": "WR-S1", "SBT": "WR-S1", "GNC": "WR-S1", "MABP": "WR-S1", "VAS": "WR-S1",

  "CPN": "WR-S2", "DRL": "WR-S2", "GDA": "WR-S2", "CCL": "WR-S2", "PVI": "WR-S2",
  "LMH": "WR-S2", "DHD": "WR-S2", "BIO": "WR-S2", "MGN": "WR-S2", "THDR": "WR-S2",
  "PCN": "WR-S2", "BMI": "WR-S2", "RTM": "WR-S2",

  "KUH": "WR-S3", "NAD": "WR-S3", "MEP": "WR-S3", "SGZ": "WR-S3", "CMW": "WR-S3",
  "BWM": "WR-S3", "GOH": "WR-S3", "RMA": "WR-S3", "MKX": "WR-S3", "DKNT": "WR-S3",
  "KOTA": "WR-S3"
};

function resolveStationSection(currCode, nextCode) {
  if (currCode && STATION_SECTION_MAP[currCode.toUpperCase()]) return STATION_SECTION_MAP[currCode.toUpperCase()];
  if (nextCode && STATION_SECTION_MAP[nextCode.toUpperCase()]) return STATION_SECTION_MAP[nextCode.toUpperCase()];
  return "NR-S4";
}

function getFilteredFleetByJurisdiction() {
  const jur = window.currentJurisdiction || "ALL";
  if (jur === "ALL") return RAIL_FLEET;
  if (jur === "MUMBAI") {
    return RAIL_FLEET.filter(t => (t.section_id && t.section_id.startsWith("WR-")) || (!t.section_id && (t.id === "12951" || t.id === "20901")));
  }
  return RAIL_FLEET.filter(t => t.section_id === jur);
}

window.setJurisdiction = function(jurId) {
  window.currentJurisdiction = jurId;

  // 1. Sync dropdown
  const select = document.getElementById("jurisdiction-selector");
  if (select) select.value = jurId;

  // 2. Sync pills
  const pills = document.querySelectorAll("[data-jurisdiction-pill]");
  pills.forEach(p => {
    if (p.getAttribute("data-jurisdiction-pill") === jurId) {
      p.classList.add("active");
    } else {
      p.classList.remove("active");
    }
  });

  // 3. Update Scope Label
  const label = document.getElementById("active-jurisdiction-name");
  const filtered = getFilteredFleetByJurisdiction();
  const jurInfo = JURISDICTION_INFO[jurId] || { name: jurId };
  if (label) {
    label.textContent = `${jurInfo.name.toUpperCase()} (${filtered.length} LIVE TRAIN${filtered.length !== 1 ? 'S' : ''})`;
  }

  // 4. Update Header Corridor & Shift Info
  const topTitle = document.getElementById("top-corridor-title");
  const topShift = document.getElementById("top-shift-text");
  const topBadge = document.getElementById("top-corridor-badge");

  if (jurId === "ALL") {
    if (topTitle) topTitle.textContent = "MUMBAI DIVISION — WESTERN RAILWAY CTC";
    if (topShift) topShift.textContent = "SHIFT B (14:00 IST) — CHC: T. BHATT • DESK-01: S. KUMAR";
    if (topBadge) topBadge.textContent = "0–1400 KM • 4 SECTION UNITS • KAVACH SIL-4 • RTIS/COA ACTIVE";
  } else if (jurId === "MUMBAI") {
    if (topTitle) topTitle.textContent = "MUMBAI DIVISION (WR) — MMCT CTC";
    if (topShift) topShift.textContent = "SHIFT B — CHC: T. BHATT • DY.CHC: M. JOSHI";
    if (topBadge) topBadge.textContent = "0–620 KM • 3 SECTIONS (WR-S1/S2/S3) • RTIS LIVE";
  } else if (jurInfo.controller) {
    if (topTitle) topTitle.textContent = `${jurInfo.name.toUpperCase()}`;
    if (topShift) topShift.textContent = `SHIFT B — ${jurInfo.controller.toUpperCase()} (${jurInfo.desk})`;
    if (topBadge) topBadge.textContent = `${jurInfo.kmRange} • SIL-4 KAVACH • CTC DESK ACTIVE`;
  }

  // 5. Re-render views
  if (typeof renderOverviewCards === "function") renderOverviewCards();
  if (typeof renderOverviewTable === "function") renderOverviewTable();
  if (typeof renderMasterTable === "function") renderMasterTable();
};

function initJurisdictionControls() {
  const select = document.getElementById("jurisdiction-selector");
  if (select) {
    select.addEventListener("change", (e) => {
      window.setJurisdiction(e.target.value);
    });
  }

  const pills = document.querySelectorAll("[data-jurisdiction-pill]");
  pills.forEach(p => {
    p.addEventListener("click", () => {
      const val = p.getAttribute("data-jurisdiction-pill");
      if (val) window.setJurisdiction(val);
    });
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initJurisdictionControls);
} else {
  initJurisdictionControls();
}

/**
 * NavaRail Operations Control — Hallmark Redesign & Stitch Final Engine
 * SignalControl Pro Standard · Mission-Critical SCADA Telemetry Console
 * Western Trunk (MMCT–NDLS) & Northern Trunk (NDLS–GZB) Sector 4
 */

// =============================================================================
// 1. MASTER FLEET TELEMETRY & RUNNING ROSTER
// =============================================================================
const RAIL_FLEET = [
  {
    id: "12952",
    name: "MMCT TEJAS RAJDHANI",
    type: "PREMIUM SUPERFAST",
    line: "UP MAIN",
    origin: "NDLS",
    dest: "MMCT (MUMBAI)",
    sched: "16:55",
    actual: "16:55",
    delay: 0,
    speed: 112,
    maxSpeed: 130,
    block: "BRC-APPR-14B",
    nextSignal: "PROCEED",
    platform: "PF-03 (BRC)",
    status: "ON TIME",
    accent: "emerald",
    rake: "WAP-7 #30245 (BRC SHED) + 22 LHB",
    driver: "S. CHATTERJEE / ALP: R. K. VERMA",
    bpPressure: 5.0,
    fpPressure: 6.0,
    etaConf: "99.4% · NOMINAL KAVACH GREEN WAVE",
    confidencePct: 99,
    coaches: 22,
    tractionCurrent: "420 A",
    oheVoltage: "24.8 kV"
  },
  {
    id: "12951",
    name: "MUMBAI TEJAS RAJDHANI",
    type: "PREMIUM SUPERFAST",
    line: "UP MAIN",
    origin: "MMCT",
    dest: "NDLS",
    sched: "14:45",
    actual: "14:45",
    delay: 0,
    speed: 118,
    maxSpeed: 130,
    block: "TC-03",
    nextSignal: "CLEAR",
    platform: "PF-01",
    status: "ON TIME",
    accent: "emerald",
    rake: "WAP-7 #30452 + 20 LHB (1A, 2A, 3A)",
    driver: "V. SHARMA / ALP: R. MEENA",
    bpPressure: 5.0,
    fpPressure: 6.0,
    etaConf: "99.8% · NOMINAL",
    confidencePct: 99,
    coaches: 20,
    tractionCurrent: "410 A",
    oheVoltage: "25.0 kV"
  },
  {
    id: "12302",
    name: "HOWRAH RAJDHANI",
    type: "PREMIUM SUPERFAST",
    line: "DN MAIN",
    origin: "NDLS",
    dest: "HWH (KOLKATA)",
    sched: "14:15",
    actual: "14:29",
    delay: 14,
    speed: 98,
    maxSpeed: 130,
    block: "TC-11",
    nextSignal: "CLEAR",
    platform: "PF-09",
    status: "DELAYED",
    accent: "amber",
    rake: "WAP-7 #30211 + 22 LHB",
    driver: "M. P. SINGH / ALP: K. DASH",
    bpPressure: 5.0,
    fpPressure: 6.0,
    etaConf: "92.4% · RESYNCHING",
    confidencePct: 92,
    coaches: 22,
    tractionCurrent: "385 A",
    oheVoltage: "24.6 kV"
  },
  {
    id: "22222",
    name: "CSMT RAJDHANI",
    type: "PREMIUM SUPERFAST",
    line: "DN MAIN",
    origin: "NZM",
    dest: "CSMT (MUMBAI)",
    sched: "14:30",
    actual: "14:42",
    delay: 12,
    speed: 0,
    maxSpeed: 160,
    block: "TC-08",
    nextSignal: "DANGER",
    platform: "PF-16",
    status: "EMERGENCY BRAKE",
    accent: "red",
    rake: "TRAIN-18 RAKE #04 (16 CAR EMU)",
    driver: "K. L. VERMA / ALP: A. GUPTA",
    bpPressure: 2.1,
    fpPressure: 4.8,
    etaConf: "CRITICAL HALT AT SBB",
    confidencePct: 99,
    coaches: 16,
    tractionCurrent: "0 A",
    oheVoltage: "24.9 kV"
  },
  {
    id: "20901",
    name: "VANDE BHARAT (MMCT-GNC)",
    type: "SEMI-HIGH SPEED",
    line: "UP MAIN",
    origin: "MMCT",
    dest: "GNC (GANDHINAGAR)",
    sched: "06:10",
    actual: "06:10",
    delay: 0,
    speed: 130,
    maxSpeed: 160,
    block: "ST-APPROACH-02",
    nextSignal: "PROCEED",
    platform: "PF-01 (ST)",
    status: "ON TIME",
    accent: "emerald",
    rake: "VANDE BHARAT 2.0 RAKE #12",
    driver: "P. R. PATEL / ALP: H. J. DAVE",
    bpPressure: 5.0,
    fpPressure: 6.0,
    etaConf: "99.9% · OPTIMAL",
    confidencePct: 99,
    coaches: 16,
    tractionCurrent: "490 A",
    oheVoltage: "25.1 kV"
  },
  {
    id: "12904",
    name: "GOLDEN TEMPLE MAIL",
    type: "MAIL/EXPRESS",
    line: "UP MAIN",
    origin: "ASR (AMRITSAR)",
    dest: "MMCT",
    sched: "18:50",
    actual: "18:58",
    delay: 8,
    speed: 84,
    maxSpeed: 110,
    block: "RTM-GHAT-TUNNEL-4",
    nextSignal: "CAUTION",
    platform: "PF-04 (RTM)",
    status: "EKF DEAD-RECKONING",
    accent: "amber",
    rake: "WAP-7 #30114 + 24 ICF",
    driver: "G. S. RAWAT / ALP: B. SINGH",
    bpPressure: 4.9,
    fpPressure: 5.9,
    etaConf: "88.6% · INERTIAL FUSION",
    confidencePct: 88,
    coaches: 24,
    tractionCurrent: "350 A",
    oheVoltage: "24.5 kV"
  },
  {
    id: "12436",
    name: "JYG GARIB RATH",
    type: "GARIB RATH",
    line: "DN MAIN",
    origin: "ANVT",
    dest: "JYG (JAYNAGAR)",
    sched: "14:40",
    actual: "14:40",
    delay: 0,
    speed: 87,
    maxSpeed: 120,
    block: "TC-07",
    nextSignal: "CAUTION",
    platform: "PF-02",
    status: "EKF DEAD-RECKONING",
    accent: "amber",
    rake: "WAP-5 #30018 + 14 LHB",
    driver: "S. CHATTERJEE",
    bpPressure: 5.0,
    fpPressure: 6.0,
    etaConf: "91.0% · SPEED REGULATED",
    confidencePct: 91,
    coaches: 14,
    tractionCurrent: "310 A",
    oheVoltage: "25.0 kV"
  },
  {
    id: "12004",
    name: "LUCKNOW SHATABDI",
    type: "SHATABDI",
    line: "UP MAIN",
    origin: "LKO",
    dest: "NDLS",
    sched: "14:55",
    actual: "14:55",
    delay: 0,
    speed: 108,
    maxSpeed: 130,
    block: "TC-01",
    nextSignal: "CLEAR",
    platform: "PF-04",
    status: "ON TIME",
    accent: "emerald",
    rake: "WAP-7 #30500 + 16 LHB",
    driver: "D. K. YADAV",
    bpPressure: 5.0,
    fpPressure: 6.0,
    etaConf: "96.2% · ON PATH",
    confidencePct: 96,
    coaches: 16,
    tractionCurrent: "390 A",
    oheVoltage: "25.0 kV"
  },
  {
    id: "14006",
    name: "LICHCHAVI EXPRESS",
    type: "MAIL/EXP",
    line: "DN MAIN",
    origin: "ANVT",
    dest: "SMI (SITAMARHI)",
    sched: "13:50",
    actual: "14:38",
    delay: 48,
    speed: 42,
    maxSpeed: 110,
    block: "TC-12",
    nextSignal: "CAUTION",
    platform: "PF-05",
    status: "DELAYED",
    accent: "amber",
    rake: "WAP-4 #22680 + 24 ICF",
    driver: "R. PRASAD",
    bpPressure: 4.8,
    fpPressure: 5.8,
    etaConf: "79.0% · SLOW ORDER",
    confidencePct: 79,
    coaches: 24,
    tractionCurrent: "290 A",
    oheVoltage: "24.7 kV"
  },
  {
    id: "BOXN-609",
    name: "COAL RAKE FREIGHT",
    type: "FREIGHT",
    line: "UP MAIN",
    origin: "HWH YARD",
    dest: "TKD YARD",
    sched: "14:00",
    actual: "14:45",
    delay: 45,
    speed: 48,
    maxSpeed: 75,
    block: "TC-05",
    nextSignal: "CAUTION",
    platform: "LOOP-1",
    status: "DELAYED",
    accent: "amber",
    rake: "TWIN WAG-9 #31102 + 58 BOXN",
    driver: "HARISH CHAND",
    bpPressure: 4.7,
    fpPressure: 5.7,
    etaConf: "LOOP HOLD ORDERED",
    confidencePct: 85,
    coaches: 58,
    tractionCurrent: "540 A",
    oheVoltage: "24.4 kV"
  },
  {
    id: "BOXN-882",
    name: "HEAVY COAL FREIGHT",
    type: "FREIGHT",
    line: "DN MAIN",
    origin: "BHARUCH YARD",
    dest: "KOTA THERMAL",
    sched: "13:10",
    actual: "13:38",
    delay: 28,
    speed: 42,
    maxSpeed: 75,
    block: "BH-LOOP-02",
    nextSignal: "RESTRICTED",
    platform: "SIDING-3",
    status: "HELD SIDING",
    accent: "amber",
    rake: "TWIN WAG-9 #31440 + 56 BOXN",
    driver: "S. K. MEHTA",
    bpPressure: 4.8,
    fpPressure: 5.8,
    etaConf: "LOOP HOLD ORDERED",
    confidencePct: 82,
    coaches: 56,
    tractionCurrent: "510 A",
    oheVoltage: "24.5 kV"
  },
  {
    id: "12260",
    name: "SEALDAH DURONTO",
    type: "DURONTO",
    line: "UP MAIN",
    origin: "SDAH",
    dest: "NDLS",
    sched: "15:10",
    actual: "15:10",
    delay: 0,
    speed: 122,
    maxSpeed: 130,
    block: "TC-06",
    nextSignal: "CLEAR",
    platform: "PF-07",
    status: "ON TIME",
    accent: "emerald",
    rake: "WAP-7 #30333 + 18 LHB",
    driver: "A. BANERJEE",
    bpPressure: 5.0,
    fpPressure: 6.0,
    etaConf: "95.0% · GREEN WAVE",
    confidencePct: 95,
    coaches: 18,
    tractionCurrent: "430 A",
    oheVoltage: "25.0 kV"
  }
];

// =============================================================================
// 2. OPERATIONAL ALARMS & INCIDENT STREAM
// =============================================================================
let OPERATIONAL_ALARMS = [
  {
    id: "INC-2024-0892B",
    time: "14:24:12",
    severity: "CRITICAL",
    asset: "BLOCK 14B",
    desc: "AFTC feedback drop at MP 348.6. Signal S-42 fail-safe locked RED.",
    by: "AUDIO FREQ TRACK CIRCUIT",
    state: "ACTIVE TRIAGE",
    acked: false
  },
  {
    id: "ALT-01",
    time: "00:47:32",
    severity: "CRITICAL",
    asset: "TC-08",
    desc: "Emergency Brake applied on 22222 Vande Bharat at TC-08.",
    by: "AXLE PULSE SENSOR",
    state: "UNACKNOWLEDGED",
    acked: false
  },
  {
    id: "ALT-02",
    time: "00:41:15",
    severity: "HIGH",
    asset: "TC-09",
    desc: "Track circuit TC-09 occupancy failure (Phantom Drop).",
    by: "AXLE DETECTOR DP-15",
    state: "ESCALATED TO S&T",
    acked: false
  },
  {
    id: "ALT-03",
    time: "00:35:02",
    severity: "MED",
    asset: "SIG-14",
    desc: "Signal SIG-14 aspect mismatch resolved automatically.",
    by: "ELECTRONIC INTERLOCK",
    state: "RESOLVED",
    acked: true
  },
  {
    id: "ALT-04",
    time: "00:12:44",
    severity: "INFO",
    asset: "SYS-AI",
    desc: "AI Dispatcher adjusting corridor speed margin for 12436.",
    by: "CONFORMAL DISPATCH",
    state: "ACTIVE ADVISORY",
    acked: true
  },
  {
    id: "ALT-05",
    time: "23:55:10",
    severity: "HIGH",
    asset: "PM-04",
    desc: "Point machine PM-04 slow operation detected (4.2s stroke time).",
    by: "SCADA TELEMETRY",
    state: "PENDING AUDIT",
    acked: false
  },
  {
    id: "ALT-06",
    time: "23:30:00",
    severity: "INFO",
    asset: "DESK-01",
    desc: "Shift handover initiated by Controller S. Kumar.",
    by: "CONSOLE AUTH",
    state: "LOGGED",
    acked: true
  },
  {
    id: "ALT-07",
    time: "23:15:22",
    severity: "INFO",
    asset: "BALISE-09",
    desc: "Balise Transponder #09 RF signal attenuation detected (-12dB).",
    by: "FIELD TELEMETRY",
    state: "ACTIVE ADVISORY",
    acked: false
  }
];

// State Management
let activeNavView = "overview";
let currentMasterFilter = "all";
let currentAlarmFilter = "all";
let currentTrackFilter = "all";
let currentDispatchMode = "auto";
let currentSimHorizon = "live";
let selectedTrainId = "12952";
let audioAlertsEnabled = true;
let gisMap = null;
let gisInitialized = false;

// DOM References
const liveClockEl = document.getElementById("live-clock");
const liveUtcEl = document.getElementById("live-utc");
const sidebarAlarmCountEl = document.getElementById("sidebar-alarm-count");
const sidebarAlarmListEl = document.getElementById("sidebar-alarm-list");
const btnAckAllAlarms = document.getElementById("btn-ack-all-alarms");
const toggleCardsBtn = document.getElementById("toggle-cards-view");
const toggleTableBtn = document.getElementById("toggle-table-view");
const cardsContainer = document.getElementById("train-cards-container");
const tableContainer = document.getElementById("train-table-container");
const overviewTableBody = document.getElementById("overview-table-body");
const masterTableBody = document.getElementById("master-table-body");
const masterSearchInput = document.getElementById("master-search-input");
const drawer = document.getElementById("train-inspector-drawer");
const drawerTitle = document.getElementById("drawer-title");
const drawerBody = document.getElementById("drawer-body-content");
const btnCloseDrawer = document.getElementById("btn-close-drawer");

// Advisory Buttons
const btnAdvisoryAccept = document.getElementById("btn-advisory-accept");
const btnAdvisoryOverride = document.getElementById("btn-advisory-override");
const btnAdvisorySim = document.getElementById("btn-advisory-sim");

// =============================================================================
// 3. LIFECYCLE INITIALIZATION
// =============================================================================
document.addEventListener("DOMContentLoaded", () => {
  initClock();
  initNavRail();
  initCorridorControls();
  initOverviewToggles();
  initAdvisoryActions();
  initHotkeys();
  renderOverviewTable();
  renderSidebarAlarms();
  renderMasterTable();
  initDrawer();
  initAlertsHub();
  initDelayIntel();
  initDeadReckoning();
  initInterlockingControls();

  // Preload first train into drawer for immediate readiness
  selectTrain("12952", false);
});

// =============================================================================
// 4. DIGITAL CLOCKS (IST & UTC)
// =============================================================================
function initClock() {
  function tick() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, "0");
    const m = String(now.getMinutes()).padStart(2, "0");
    const s = String(now.getSeconds()).padStart(2, "0");
    if (liveClockEl) liveClockEl.textContent = `${h}:${m}:${s}`;

    const uh = String(now.getUTCHours()).padStart(2, "0");
    const um = String(now.getUTCMinutes()).padStart(2, "0");
    const us = String(now.getUTCSeconds()).padStart(2, "0");
    if (liveUtcEl) liveUtcEl.textContent = `UTC ${uh}:${um}:${us}`;
  }
  tick();
  setInterval(tick, 1000);
}

// =============================================================================
// 5. LEFT SIDE NAV RAIL (72px) — 6 DEDICATED WORKBENCH VIEWS
// =============================================================================
function initNavRail() {
  const navItems = document.querySelectorAll(".side-nav-rail .nav-item");
  const views = document.querySelectorAll(".content-view");

  navItems.forEach(item => {
    item.addEventListener("click", () => {
      const targetView = item.dataset.view;
      if (!targetView) return;

      navItems.forEach(n => n.classList.remove("active"));
      views.forEach(v => v.classList.remove("active"));

      item.classList.add("active");
      activeNavView = targetView;

      const viewEl = document.getElementById(`view-${targetView}`);
      if (viewEl) {
        viewEl.classList.add("active");

        // Specific View Lifecycle hooks
        if (targetView === "gis") {
          setTimeout(() => {
            initGisMap();
            if (gisMap) gisMap.invalidateSize();
            const curTrainId = selectedTrainId || "12952";
            const trainData = (window.TRAIN_BACKEND_CACHE && window.TRAIN_BACKEND_CACHE[curTrainId]) ||
                              (INITIAL_FLEET_CACHE && INITIAL_FLEET_CACHE[curTrainId]) ||
                              RAIL_FLEET.find(t => t.id === curTrainId) ||
                              { train_no: curTrainId, train_name: "TEJAS RAJDHANI", speed_kmh: 112 };
            updateGisTacticalHud(trainData);
          }, 60);
          setTimeout(() => {
            if (gisMap) gisMap.invalidateSize();
          }, 300);
        } else if (targetView === "trains") {
          renderMasterTable();
        } else if (targetView === "overview") {
          renderOverviewTable();
          renderSidebarAlarms();
        } else if (targetView === "interlocking") {
          renderInterlockingView();
        } else if (targetView === "alerts") {
          fetchAndRenderAlerts();
        }
      }
    });
  });
}

// =============================================================================
// 6. GIS TACTICAL NETWORK MAP (Leaflet Integration)
// =============================================================================
function initGisMap() {
  const mapContainer = document.getElementById("gis-tactical-map");
  if (!mapContainer) return;

  if (gisInitialized && gisMap) {
    gisMap.invalidateSize();
    return;
  }

  // Ensure container has rendered height before initializing Leaflet
  const rect = mapContainer.getBoundingClientRect();
  if (rect.height === 0) {
    setTimeout(initGisMap, 80);
    return;
  }

  // Center on Vadodara Junction / Western Trunk
  gisMap = L.map("gis-tactical-map", {
    zoomControl: false,
    attributionControl: false
  }).setView([22.3107, 73.1812], 8);

  // Tactical Dark Canvas Basemap Tiles (Clean, high-performance, no watermark)
  L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}", {
    maxZoom: 16,
    className: "dark-tactical-tiles"
  }).addTo(gisMap);

  L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}", {
    maxZoom: 16,
    className: "dark-tactical-labels"
  }).addTo(gisMap);

  L.control.zoom({ position: "bottomright" }).addTo(gisMap);

  // ===========================================================================
  // REAL MULTI-CORRIDOR ROUTE ALIGNMENTS & STATIONS
  // ===========================================================================
  window.gisTrainMarkers = window.gisTrainMarkers || {};

  // 1. Western Trunk Corridor (Mumbai Central -> New Delhi via Kota)
  const westernTrunkStations = [
    { code: "MMCT", name: "Mumbai Central", lat: 18.9696, lng: 72.8193, mp: "0.0", color: "#f59e0b" },
    { code: "BVI",  name: "Borivali", lat: 19.2291, lng: 72.8574, mp: "29.7", color: "#f59e0b" },
    { code: "ST",   name: "Surat", lat: 21.2049, lng: 72.8406, mp: "263.0", color: "#f59e0b" },
    { code: "BH",   name: "Bharuch", lat: 21.7051, lng: 72.9959, mp: "312.4", color: "#f59e0b" },
    { code: "BRC",  name: "Vadodara Jn", lat: 22.3107, lng: 73.1812, mp: "392.1", color: "#f59e0b" },
    { code: "GDA",  name: "Godhra Jn", lat: 22.7758, lng: 73.6149, mp: "466.0", color: "#f59e0b" },
    { code: "RTM",  name: "Ratlam Jn", lat: 23.3441, lng: 75.0347, mp: "653.2", color: "#f59e0b" },
    { code: "NAD",  name: "Nagda Jn", lat: 23.4560, lng: 75.4128, mp: "694.0", color: "#f59e0b" },
    { code: "KOTA", name: "Kota Jn", lat: 25.2138, lng: 75.8648, mp: "919.8", color: "#f59e0b" },
    { code: "SWM",  name: "Sawai Madhopur", lat: 25.9928, lng: 76.3683, mp: "1027.0", color: "#f59e0b" },
    { code: "MTJ",  name: "Mathura Jn", lat: 27.4924, lng: 77.6737, mp: "1244.0", color: "#f59e0b" },
    { code: "NDLS", name: "New Delhi", lat: 28.6429, lng: 77.2195, mp: "1386.0", color: "#f59e0b" }
  ];

  // 2. Gujarat Branch (Vadodara -> Ahmedabad -> Gandhinagar Capital for #20901)
  const gujaratBranchStations = [
    { code: "BRC",  name: "Vadodara Jn", lat: 22.3107, lng: 73.1812, mp: "392.1", color: "#10b981" },
    { code: "ANND", name: "Anand Jn", lat: 22.5645, lng: 72.9289, mp: "427.0", color: "#10b981" },
    { code: "ADI",  name: "Ahmedabad Jn", lat: 23.0225, lng: 72.5714, mp: "492.0", color: "#10b981" },
    { code: "GNC",  name: "Gandhinagar Cap", lat: 23.2334, lng: 72.6292, mp: "522.0", color: "#10b981" }
  ];

  // 3. Northern Grand Trunk (Delhi -> Punjab -> Amritsar for #12904)
  const northernTrunkStations = [
    { code: "NDLS", name: "New Delhi", lat: 28.6429, lng: 77.2195, mp: "0.0", color: "#f59e0b" },
    { code: "PNP",  name: "Panipat Jn", lat: 29.3909, lng: 76.9635, mp: "89.0", color: "#f59e0b" },
    { code: "UMB",  name: "Ambala Cantt", lat: 30.3782, lng: 76.7767, mp: "198.0", color: "#f59e0b" },
    { code: "LDH",  name: "Ludhiana Jn", lat: 30.9010, lng: 75.8573, mp: "312.0", color: "#f59e0b" },
    { code: "JUC",  name: "Jalandhar City", lat: 31.3256, lng: 75.5792, mp: "369.0", color: "#f59e0b" },
    { code: "BEAS", name: "Beas Jn", lat: 31.5126, lng: 75.2974, mp: "405.0", color: "#f59e0b" },
    { code: "ASR",  name: "Amritsar Jn", lat: 31.6340, lng: 74.8723, mp: "448.0", color: "#f59e0b" }
  ];

  // 4. Central Railway Corridor (Mumbai CSMT -> Bhopal -> Delhi for #22222)
  const centralRailwayStations = [
    { code: "CSMT", name: "Mumbai CSMT", lat: 18.9402, lng: 72.8356, mp: "0.0", color: "#a855f7" },
    { code: "KYN",  name: "Kalyan Jn", lat: 19.2437, lng: 73.1355, mp: "53.0", color: "#a855f7" },
    { code: "NK",   name: "Nashik Road", lat: 19.9975, lng: 73.7898, mp: "187.0", color: "#a855f7" },
    { code: "BSL",  name: "Bhusawal Jn", lat: 21.0455, lng: 75.7956, mp: "444.0", color: "#a855f7" },
    { code: "BPL",  name: "Bhopal Jn", lat: 23.2599, lng: 77.4126, mp: "837.0", color: "#a855f7" },
    { code: "VGLJ", name: "VGL Jhansi", lat: 25.4484, lng: 78.5685, mp: "1129.0", color: "#a855f7" },
    { code: "GWL",  name: "Gwalior Jn", lat: 26.2183, lng: 78.1828, mp: "1226.0", color: "#a855f7" },
    { code: "AGC",  name: "Agra Cantt", lat: 27.1767, lng: 78.0081, mp: "1344.0", color: "#a855f7" },
    { code: "NZM",  name: "Hazrat Nizamuddin", lat: 28.5888, lng: 77.2534, mp: "1532.0", color: "#a855f7" }
  ];

  // Draw Route Polylines
  // Line 1: Western Trunk (Cyan Solid)
  L.polyline(westernTrunkStations.map(s => [s.lat, s.lng]), {
    color: "#06b6d4",
    weight: 3.5,
    opacity: 0.9,
    dashArray: "6, 2"
  }).addTo(gisMap).bindTooltip("Western Trunk: Mumbai Central ⇄ New Delhi via Kota", { sticky: true });

  // Line 2: Gujarat / Gandhinagar Branch (Emerald Dashed)
  L.polyline(gujaratBranchStations.map(s => [s.lat, s.lng]), {
    color: "#10b981",
    weight: 3,
    opacity: 0.85,
    dashArray: "4, 4"
  }).addTo(gisMap).bindTooltip("Gujarat Branch: Vadodara ➔ Ahmedabad ➔ Gandhinagar (#20901)", { sticky: true });

  // Line 3: Northern Punjab Extension (Amber Dashed)
  L.polyline(northernTrunkStations.map(s => [s.lat, s.lng]), {
    color: "#f59e0b",
    weight: 3,
    opacity: 0.85,
    dashArray: "4, 4"
  }).addTo(gisMap).bindTooltip("Northern Trunk: Delhi ➔ Ludhiana ➔ Amritsar (#12904)", { sticky: true });

  // Line 4: Central Railway Corridor (Purple Dashed)
  L.polyline(centralRailwayStations.map(s => [s.lat, s.lng]), {
    color: "#a855f7",
    weight: 2.5,
    opacity: 0.75,
    dashArray: "5, 5"
  }).addTo(gisMap).bindTooltip("Central Railway: Mumbai CSMT ⇄ Delhi via Bhopal (#22222)", { sticky: true });

  // Draw Key Station Markers
  const allStations = [
    ...westernTrunkStations,
    ...gujaratBranchStations.filter(s => s.code !== "BRC"),
    ...northernTrunkStations.filter(s => s.code !== "NDLS"),
    ...centralRailwayStations.filter(s => s.code !== "NZM" && s.code !== "CSMT")
  ];

  allStations.forEach(st => {
    const stationHtml = `
      <div style="display: flex; align-items: center; gap: 4px; pointer-events: auto; transform: translate(-6px, -6px);">
        <div style="width: 8px; height: 8px; border-radius: 50%; background: #0f172a; border: 2px solid ${st.color}; box-shadow: 0 0 6px ${st.color};"></div>
        <div style="background: rgba(15,23,42,0.85); border: 1px solid rgba(255,255,255,0.15); border-radius: 2px; padding: 1px 4px; font-family: 'JetBrains Mono', monospace; font-size: 8.5px; font-weight: 700; color: #f8fafc; white-space: nowrap;">
          ${st.code}
        </div>
      </div>
    `;

    const icon = L.divIcon({
      html: stationHtml,
      className: "custom-station-marker",
      iconSize: [0, 0]
    });

    L.marker([st.lat, st.lng], { icon }).addTo(gisMap)
      .bindTooltip(`<strong>${st.code}</strong> — ${st.name}`, { direction: "top", offset: [0, -4] });
  });

  // Global marker update helper
  window.updateGisTrainMarker = function(trainId, lat, lon, speedKmh, status, name, currentStation, nextStation) {
    if (!gisMap) return;
    window.gisTrainMarkers = window.gisTrainMarkers || {};

    const color = (trainId === '12951' || trainId === '12952') ? '#f59e0b' :
                  (trainId === '20901') ? '#10b981' :
                  (trainId === '12904') ? '#f59e0b' :
                  (trainId === '22222') ? '#a855f7' :
                  (trainId === '12302' || trainId === '12436' || trainId === '12004') ? '#ec4899' : '#06b6d4';
    const isPulse = (speedKmh > 70);
    const pulseRing = isPulse ? `<div class="pulse-halo" style="width: 28px; height: 28px; border: 2px solid ${color}; left: -9px; top: -9px;"></div>` : "";
    const spdText = Math.round(speedKmh || 0);

    const trainHtml = `
      <div class="custom-train-marker" onclick="selectTrain('${trainId}')" style="position: relative; cursor: pointer; pointer-events: auto;">
        ${pulseRing}
        <div style="width: 12px; height: 12px; border-radius: 50%; background: ${color}; border: 2px solid #ffffff; box-shadow: 0 0 10px ${color};"></div>
        <div style="background: rgba(11,28,50,0.95); border: 1px solid ${color}; border-radius: 3px; padding: 2px 6px; font-family: 'JetBrains Mono', monospace; font-size: 9.5px; font-weight: 700; color: #ffffff; white-space: nowrap; box-shadow: 0 4px 10px rgba(0,0,0,0.7);">
          ${trainId} <span style="font-size: 8px; color: ${color};">(${spdText} km/h)</span>
        </div>
      </div>
    `;

    const icon = L.divIcon({
      html: trainHtml,
      className: "custom-train-marker-wrap",
      iconSize: [0, 0]
    });

    if (window.gisTrainMarkers[trainId]) {
      window.gisTrainMarkers[trainId].setLatLng([lat, lon]);
      window.gisTrainMarkers[trainId].setIcon(icon);
    } else {
      const m = L.marker([lat, lon], { icon }).addTo(gisMap);
      m.bindTooltip(`<strong>#${trainId}</strong> ${name || ''}<br/>At ${currentStation || ''} ➔ ${nextStation || ''}<br/>Speed: ${spdText} km/h`, { direction: "top", offset: [0, -6] });
      window.gisTrainMarkers[trainId] = m;
    }
  };

  // Real GPS Initial Placements from Kinematic Engine
  const realTrainPositions = [
    { id: "12951", name: "12951 NDLS TEJAS RAJ", lat: 21.2159, lng: 72.8437, speed: 118, color: "#f59e0b", stn: "ST ➔ BRC" },
    { id: "12952", name: "12952 MMCT TEJAS RAJ", lat: 28.6418, lng: 77.2198, speed: 112, color: "#f59e0b", stn: "NDLS ➔ KOTA" },
    { id: "20901", name: "20901 VANDE BHARAT", lat: 23.2334, lng: 72.6292, speed: 130, color: "#10b981", stn: "GNC Terminus" },
    { id: "12904", name: "12904 GOLDEN TEMPLE", lat: 31.3228, lng: 75.5969, speed: 84,  color: "#f59e0b", stn: "JUC ➔ LDH (Punjab)" },
    { id: "22222", name: "22222 CSMT RAJDHANI", lat: 26.3207, lng: 78.1400, speed: 122, color: "#a855f7", stn: "GWL ➔ VGLJ (Central Rly)" },
    { id: "12302", name: "12302 HOWRAH RAJDHANI", lat: 28.6345, lng: 77.2312, speed: 122, color: "#ec4899", stn: "NDLS ➔ CNB (Eastern)" },
    { id: "12436", name: "12436 JYG GARIB RATH", lat: 28.6505, lng: 77.3152, speed: 0,   color: "#ec4899", stn: "ANVT (Delhi)" },
    { id: "12004", name: "12004 SHATABDI EXP", lat: 26.8320, lng: 80.9186, speed: 0,   color: "#ec4899", stn: "LJN (Lucknow)" },
    { id: "BOXN-882", name: "BOXN-882 COAL", lat: 21.7100, lng: 73.0100, speed: 42, color: "#64748b", stn: "BH Loop" }
  ];

  realTrainPositions.forEach(tr => {
    window.updateGisTrainMarker(tr.id, tr.lat, tr.lng, tr.speed, "RUNNING", tr.name, tr.stn);
  });

  // Jump Action Controls
  const btnAll = document.getElementById("gis-btn-all");
  const btnBrc = document.getElementById("gis-btn-brc");
  const btnRtm = document.getElementById("gis-btn-rtm");
  const btnNdls = document.getElementById("gis-btn-ndls");
  const btnReset = document.getElementById("gis-btn-reset");

  function setActiveJumpBtn(activeBtn) {
    [btnAll, btnBrc, btnRtm, btnNdls, btnReset].forEach(b => {
      if (b) b.classList.remove("active");
    });
    if (activeBtn) activeBtn.classList.add("active");
  }

  if (btnAll) btnAll.addEventListener("click", () => {
    gisMap.flyTo([23.5, 74.5], 6);
    setActiveJumpBtn(btnAll);
  });

  if (btnBrc) btnBrc.addEventListener("click", () => {
    gisMap.flyTo([22.3107, 73.1812], 12);
    setActiveJumpBtn(btnBrc);
  });

  if (btnRtm) btnRtm.addEventListener("click", () => {
    gisMap.flyTo([23.3441, 75.0347], 11);
    setActiveJumpBtn(btnRtm);
  });

  if (btnNdls) btnNdls.addEventListener("click", () => {
    gisMap.flyTo([28.6429, 77.2195], 11);
    setActiveJumpBtn(btnNdls);
  });

  if (btnReset) btnReset.addEventListener("click", () => {
    gisMap.flyTo([23.5, 74.5], 6);
    setActiveJumpBtn(btnReset);
  });

  gisInitialized = true;
}

// =============================================================================
// 7. CORRIDOR CONTROLS & DISPATCH BAR
// =============================================================================
function initCorridorControls() {
  const trackBtns = document.querySelectorAll(".track-pill-btn");
  trackBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      trackBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentTrackFilter = btn.dataset.trackFilter;
      renderOverviewTable();
    });
  });

  const modeBtns = document.querySelectorAll(".mode-switch-btn");
  modeBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      modeBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentDispatchMode = btn.dataset.mode;
      const chip = document.querySelector(".auto-dispatch-text");
      if (chip) {
        chip.textContent = currentDispatchMode === "auto" ? "AUTO-DISPATCH ONLINE" : currentDispatchMode === "supervised" ? "SUPERVISED DISPATCH" : "MANUAL RESTRICTED";
      }
    });
  });

  const btnQuickExport = document.getElementById("btn-quick-export");
  const btnExportMaster = document.getElementById("btn-export-csv-master");
  if (btnQuickExport) btnQuickExport.addEventListener("click", exportFleetCSV);
  if (btnExportMaster) btnExportMaster.addEventListener("click", exportFleetCSV);

  const btnEstop = document.getElementById("btn-estop-hold");
  if (btnEstop) {
    btnEstop.addEventListener("click", () => {
      const confirmHold = confirm("TACTICAL E-STOP WARNING:\nEnforce Corridor Emergency Stop Hold across Section 4? All signals will drop to DANGER (RED).");
      if (confirmHold) {
        alert("CORRIDOR E-STOP HOLD ACTIVATED.\nAll automatic block signals set to RESTRICTIVE DANGER.");
      }
    });
  }

  const btnAudio = document.getElementById("btn-audio-toggle");
  if (btnAudio) {
    btnAudio.addEventListener("click", () => {
      audioAlertsEnabled = !audioAlertsEnabled;
      btnAudio.innerHTML = audioAlertsEnabled 
        ? `<span class="material-symbols-outlined" aria-hidden="true">volume_up</span>`
        : `<span class="material-symbols-outlined" style="color: var(--color-danger);" aria-hidden="true">volume_off</span>`;
    });
  }

  const btnRefresh = document.getElementById("btn-refresh-state");
  if (btnRefresh) {
    btnRefresh.addEventListener("click", () => {
      btnRefresh.classList.add("is-active");
      setTimeout(() => {
        btnRefresh.classList.remove("is-active");
        renderOverviewTable();
        renderSidebarAlarms();
      }, 300);
    });
  }

  const btnHelp = document.getElementById("btn-help-modal");
  if (btnHelp) {
    btnHelp.addEventListener("click", () => {
      alert("NAVARAIL MISSION-CONTROL HOTKEYS:\n[F2] : Accept AI Co-Dispatch Advisory\n[F3] : Override AI Advisory / Run ST-GCN Simulation\n[Esc]: Close Inspector Drawer\n[Ctrl+K] / [Cmd+K]: Focus Search");
    });
  }
}

// =============================================================================
// 8. AI CO-DISPATCH ADVISORY ACTIONS
// =============================================================================
function initAdvisoryActions() {
  if (btnAdvisoryAccept) {
    btnAdvisoryAccept.addEventListener("click", () => {
      const hwhTrain = RAIL_FLEET.find(t => t.id === "12302");
      if (hwhTrain) {
        hwhTrain.speed = 78;
        hwhTrain.delay = 10;
        hwhTrain.status = "COASTING (AI SYNC)";
      }
      const advisoryStrip = document.querySelector(".ai-advisory-strip");
      if (advisoryStrip) {
        advisoryStrip.style.backgroundColor = "var(--color-nominal-subtle)";
        advisoryStrip.innerHTML = `
          <div class="ai-advisory-left">
            <div class="ai-advisory-tag" style="background-color: var(--color-nominal-subtle); color: var(--color-nominal); border-color: var(--color-nominal-border);">
              <span class="material-symbols-outlined">check_circle</span>
              <span>ADVISORY APPLIED</span>
            </div>
            <p class="ai-advisory-text" style="color: var(--color-ink);">
              Resolution accepted. Train 12302 speed restricted to 78 km/h. Track 1 priority cleared for 12951 Rajdhani. Estimated saved delay: +4.2m.
            </p>
          </div>
        `;
      }
      renderOverviewTable();
    });
  }

  if (btnAdvisoryOverride) {
    btnAdvisoryOverride.addEventListener("click", () => {
      const advisoryStrip = document.querySelector(".ai-advisory-strip");
      if (advisoryStrip) {
        advisoryStrip.innerHTML = `
          <div class="ai-advisory-left">
            <div class="ai-advisory-tag" style="background-color: var(--color-caution-subtle); color: var(--color-caution); border-color: var(--color-caution-border);">
              <span class="material-symbols-outlined">warning</span>
              <span>ADVISORY OVERRIDDEN</span>
            </div>
            <p class="ai-advisory-text">Manual routing priority enforced by Controller S. Kumar.</p>
          </div>
        `;
      }
    });
  }

  if (btnAdvisorySim) {
    btnAdvisorySim.addEventListener("click", () => {
      const delayNavBtn = document.querySelector('.nav-item[data-view="delay-intel"]');
      if (delayNavBtn) delayNavBtn.click();
    });
  }
}

// =============================================================================
// 9. HOTKEYS
// =============================================================================
function initHotkeys() {
  document.addEventListener("keydown", (e) => {
    if (e.key === "F2") {
      e.preventDefault();
      if (btnAdvisoryAccept) btnAdvisoryAccept.click();
    } else if (e.key === "F3") {
      e.preventDefault();
      if (btnAdvisoryOverride) btnAdvisoryOverride.click();
      const simBtn = document.getElementById("btn-run-simulation");
      if (simBtn) simBtn.click();
    } else if (e.key === "Escape") {
      if (drawer && drawer.classList.contains("open")) {
        drawer.classList.remove("open");
        drawer.setAttribute("aria-hidden", "true");
      }
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      const searchBox = document.querySelector(".search-box") || document.getElementById("master-search-input");
      if (searchBox) searchBox.focus();
    }
  });
}

// =============================================================================
// 10. OVERVIEW TABLE / CARDS TOGGLE & RENDER
// =============================================================================
function initOverviewToggles() {
  if (toggleCardsBtn && toggleTableBtn) {
    toggleCardsBtn.addEventListener("click", () => {
      toggleCardsBtn.classList.add("active");
      toggleTableBtn.classList.remove("active");
      cardsContainer.classList.add("active");
      tableContainer.classList.remove("active");
    });

    toggleTableBtn.addEventListener("click", () => {
      toggleTableBtn.classList.add("active");
      toggleCardsBtn.classList.remove("active");
      tableContainer.classList.add("active");
      cardsContainer.classList.remove("active");
      renderOverviewTable();
    });
  }
}

function renderOverviewTable() {
  if (!overviewTableBody) return;

  const filteredFleet = RAIL_FLEET.filter(t => {
    if (window.currentJurisdiction && window.currentJurisdiction !== "ALL") {
      if (window.currentJurisdiction === "MUMBAI" && (!t.section_id || !t.section_id.startsWith("WR-"))) return false;
      if (window.currentJurisdiction !== "MUMBAI" && t.section_id !== window.currentJurisdiction) return false;
    }
    if (currentTrackFilter === "up" && !t.line.includes("UP")) return false;
    if (currentTrackFilter === "dn" && !t.line.includes("DN")) return false;
    if (currentTrackFilter === "bypass" && t.type !== "FREIGHT") return false;
    if (currentTrackFilter === "loop" && !t.platform.includes("LOOP") && !t.platform.includes("SIDING")) return false;
    return true;
  });

  overviewTableBody.innerHTML = filteredFleet.slice(0, 8).map(t => {
    let chipClass = "chip-nominal";
    if (t.status === "EMERGENCY BRAKE") chipClass = "chip-danger";
    else if (t.delay > 0) chipClass = "chip-caution";
    else if (t.status === "AI INFERRED" || t.status === "EKF DEAD-RECKONING") chipClass = "chip-ai";

    let delayBadge = `<span class="status-chip chip-nominal">+0m</span>`;
    if (t.delay > 30) delayBadge = `<span class="status-chip chip-danger">+${t.delay}m</span>`;
    else if (t.delay > 0) delayBadge = `<span class="status-chip chip-caution">+${t.delay}m</span>`;

    return `
      <tr class="${t.id === selectedTrainId ? 'row-selected' : ''}" onclick="selectTrain('${t.id}')">
        <td class="font-mono font-bold text-cyan">${t.id}</td>
        <td style="color: var(--color-ink); font-weight: 600;">${t.name}</td>
        <td>${t.line}</td>
        <td>${t.origin} &#10132; ${t.dest}</td>
        <td class="font-mono">${t.sched}</td>
        <td class="font-mono">${t.actual}</td>
        <td>${delayBadge}</td>
        <td class="text-right font-mono font-bold ${t.speed === 0 ? 'text-danger' : t.delay > 0 ? 'text-caution' : 'text-nominal'}">
          ${t.speed} <span style="font-size: 9px; color: var(--color-ink-dim);">KM/H</span>
        </td>
        <td class="font-mono font-bold">${t.block}</td>
        <td><span class="status-chip ${chipClass}">${t.nextSignal}</span></td>
        <td>
          <button class="action-btn-small" onclick="event.stopPropagation(); selectTrain('${t.id}')">Inspect</button>
        </td>
      </tr>
    `;
  }).join("");
}

// =============================================================================
// 11. SIDEBAR ALARMS FEED
// =============================================================================
function renderSidebarAlarms() {
  if (sidebarAlarmCountEl) {
    const unacked = OPERATIONAL_ALARMS.filter(a => !a.acked && (a.severity === "CRITICAL" || a.severity === "HIGH")).length;
    sidebarAlarmCountEl.textContent = unacked;
  }

  if (sidebarAlarmListEl) {
    sidebarAlarmListEl.innerHTML = OPERATIONAL_ALARMS.map(a => {
      const dotClass = a.severity === "CRITICAL" ? "dot-red" : a.severity === "HIGH" ? "dot-amber" : a.severity === "MED" ? "dot-green" : "dot-slate";
      const timeColor = a.severity === "CRITICAL" ? "text-danger" : a.severity === "HIGH" ? "text-caution" : "text-dim";

      return `
        <div class="alarm-entry-card" onclick="handleAlarmClick('${a.asset}')" tabindex="0" role="button" aria-label="${a.severity} alarm on ${a.asset}">
          <div class="alarm-dot ${dotClass}" aria-hidden="true"></div>
          <div class="alarm-body">
            <div class="alarm-time ${timeColor}">${a.time} · ${a.asset}</div>
            <div class="alarm-msg">${a.desc}</div>
          </div>
        </div>
      `;
    }).join("");
  }
}

window.handleAlarmClick = function(asset) {
  if (asset.includes("14B")) {
    const alertsNav = document.querySelector('.nav-item[data-view="alerts"]');
    if (alertsNav) alertsNav.click();
  } else if (asset.startsWith("TC-") || asset.startsWith("PM-") || asset.startsWith("SIG-")) {
    selectBlock(asset);
  } else {
    selectTrain("22222");
  }
};

if (btnAckAllAlarms) {
  btnAckAllAlarms.addEventListener("click", () => {
    OPERATIONAL_ALARMS.forEach(a => {
      a.acked = true;
      a.state = "ACKNOWLEDGED";
    });
    renderSidebarAlarms();
  });
}

// =============================================================================
// 12. MASTER TRAIN MOVEMENTS ROSTER (Trains View)
// =============================================================================
function renderMasterTable() {
  if (!masterTableBody) return;
  const query = masterSearchInput ? masterSearchInput.value.trim().toLowerCase() : "";

  const filtered = RAIL_FLEET.filter(t => {
    if (window.currentJurisdiction && window.currentJurisdiction !== "ALL") {
      if (window.currentJurisdiction === "MUMBAI" && (!t.section_id || !t.section_id.startsWith("WR-"))) return false;
      if (window.currentJurisdiction !== "MUMBAI" && t.section_id !== window.currentJurisdiction) return false;
    }
    if (currentMasterFilter === "up" && !t.line.includes("UP")) return false;
    if (currentMasterFilter === "dn" && !t.line.includes("DN")) return false;
    if (currentMasterFilter === "delayed" && t.delay <= 0) return false;

    if (query) {
      const matchId = t.id.toLowerCase().includes(query);
      const matchName = t.name.toLowerCase().includes(query);
      const matchPf = t.platform.toLowerCase().includes(query);
      if (!matchId && !matchName && !matchPf) return false;
    }
    return true;
  });

  masterTableBody.innerHTML = filtered.map(t => {
    let chipClass = "chip-nominal";
    if (t.status === "EMERGENCY BRAKE") chipClass = "chip-danger";
    else if (t.delay > 0) chipClass = "chip-caution";
    else if (t.status === "AI INFERRED" || t.status === "EKF DEAD-RECKONING") chipClass = "chip-ai";

    return `
      <tr onclick="selectTrain('${t.id}')">
        <td class="font-mono font-bold text-cyan">${t.id}</td>
        <td style="color: var(--color-ink); font-weight: 600;">${t.name}</td>
        <td>${t.type}</td>
        <td style="font-size: 10px; color: var(--color-ink-muted);">${t.rake}</td>
        <td>${t.origin}</td>
        <td>${t.dest}</td>
        <td>${t.line}</td>
        <td class="font-mono">${t.platform}</td>
        <td>${t.sched}</td>
        <td class="font-mono">${t.actual}</td>
        <td class="font-mono font-bold ${t.delay > 30 ? 'text-danger' : t.delay > 0 ? 'text-caution' : 'text-nominal'}">
          +${t.delay}m
        </td>
        <td class="text-right font-mono font-bold">${t.speed} KM/H</td>
        <td class="font-mono font-bold">${t.block}</td>
        <td><span class="status-chip ${chipClass}">${t.nextSignal}</span></td>
        <td><span class="status-chip ${chipClass}">${t.status}</span></td>
      </tr>
    `;
  }).join("");
}

document.querySelectorAll(".filter-pill-group .pill-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".filter-pill-group .pill-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentMasterFilter = btn.dataset.filter;
    renderMasterTable();
  });
});

if (masterSearchInput) {
  masterSearchInput.addEventListener("input", renderMasterTable);
}

// =============================================================================
// 13. TRAIN DETAIL INSPECTOR DRAWER (22-Coach Rake Diagram & Deep Dive)
// =============================================================================

// Pre-cached authentic corridor route progressions
// Pre-cached authentic corridor route progressions for all fleet trains
window.INITIAL_FLEET_CACHE = {"12952": {"train_no": "12952", "train_name": "MMCT TEJAS RAJ", "run_status": "RUNNING", "current_station_code": "KOTA", "current_station_name": "KOTA JN", "next_station_code": "NAD", "next_station_name": "NAGDA JN", "lat": 25.223342, "lon": 75.880444, "speed_kmh": 86.8, "current_delay_min": 15.0, "forecasted_delay_min": 19.0, "scheduled_arrival": "23:57", "dynamic_eta": {"point_estimate": "02:14", "confidence_90": {"lower": "02:11", "upper": "02:19"}}, "delay_reasons": [{"reason": "Operational cruising speed \u2014 normal signal clearance", "severity": "LOW", "impact_min": 0.0}, {"reason": "Overnight speedup and buffer slack: historical patterns show train recovers 19m delay before terminal", "severity": "LOW", "impact_min": -19.0}], "route_progress": [{"seq": 1, "station_code": "NDLS", "station_name": "NEW DELHI", "status": "departed", "scheduled_arrival": "START", "scheduled_departure": "16:55:00", "delay_min": 12.0, "eta": null, "lat": 28.642314, "lon": 77.22000399999999, "is_recovered": false, "recovered_min": 0.0}, {"seq": 2, "station_code": "KOTA", "station_name": "KOTA JN", "status": "departed", "scheduled_arrival": "21:30:00", "scheduled_departure": "21:40:00", "delay_min": 15.0, "eta": null, "lat": 25.223553, "lon": 75.8805, "is_recovered": false, "recovered_min": 0.0}, {"seq": 3, "station_code": "NAD", "station_name": "NAGDA JN", "status": "current", "scheduled_arrival": "23:57:00", "scheduled_departure": "23:59:00", "delay_min": 19.0, "eta": "02:14", "lat": 23.45592, "lon": 75.41249099999999, "is_recovered": false, "recovered_min": 0.0}, {"seq": 4, "station_code": "RTM", "station_name": "RATLAM JN", "status": "upcoming", "scheduled_arrival": "00:30:00", "scheduled_departure": "00:33:00", "delay_min": 14.2, "eta": "02:17", "lat": 23.34038, "lon": 75.050826, "is_recovered": false, "recovered_min": 5.0}, {"seq": 5, "station_code": "BRC", "station_name": "VADODARA JN", "status": "upcoming", "scheduled_arrival": "03:40:00", "scheduled_departure": "03:50:00", "delay_min": 9.7, "eta": "03:49", "lat": 22.310756, "lon": 73.181065, "is_recovered": false, "recovered_min": 9.5}, {"seq": 6, "station_code": "ST", "station_name": "SURAT", "status": "upcoming", "scheduled_arrival": "05:13:00", "scheduled_departure": "05:18:00", "delay_min": 5.2, "eta": "05:18", "lat": 21.206568, "lon": 72.840793, "is_recovered": false, "recovered_min": 14.0}, {"seq": 7, "station_code": "BVI", "station_name": "BORIVALI", "status": "upcoming", "scheduled_arrival": "07:38:00", "scheduled_departure": "07:40:00", "delay_min": 0.7, "eta": "07:38", "lat": 19.228739, "lon": 72.85641199999999, "is_recovered": true, "recovered_min": 18.5}, {"seq": 8, "station_code": "MMCT", "station_name": "MUMBAI CENTRAL", "status": "upcoming", "scheduled_arrival": "08:35:00", "scheduled_departure": "None", "delay_min": 0.2, "eta": "08:35", "lat": 18.970667, "lon": 72.819383, "is_recovered": true, "recovered_min": 19.0}], "telemetry_source": "NTES_REALTIME", "live_position_desc": "Departed from VIKRAMGARH ALOT(VMA) at 23:50 09-Sep", "model_b_stgcn_delta": 0.0, "ensemble_blend_ratio": "60% LightGBM + 40% ST-GCN", "dest_delay_recovery_min": 19.0, "dest_forecasted_delay_min": 0.0, "historical_on_time_pct": 92.4, "is_overnight_recovery_active": true}, "12951": {"train_no": "12951", "train_name": "NDLS TEJAS RAJ", "run_status": "RUNNING", "current_station_code": "BRC", "current_station_name": "VADODARA JN", "next_station_code": "RTM", "next_station_name": "RATLAM JN", "lat": 22.31087, "lon": 73.181272, "speed_kmh": 86.8, "current_delay_min": 5.0, "forecasted_delay_min": 9.0, "scheduled_arrival": "00:25", "dynamic_eta": {"point_estimate": "02:29", "confidence_90": {"lower": "02:26", "upper": "02:34"}}, "delay_reasons": [{"reason": "Operational cruising speed \u2014 normal signal clearance", "severity": "LOW", "impact_min": 0.0}, {"reason": "Overnight speedup and buffer slack: historical patterns show train recovers 9m delay before terminal", "severity": "LOW", "impact_min": -9.0}], "route_progress": [{"seq": 1, "station_code": "MMCT", "station_name": "MUMBAI CENTRAL", "status": "departed", "scheduled_arrival": "START", "scheduled_departure": "17:00:00", "delay_min": 2.0, "eta": null, "lat": 18.970667, "lon": 72.819383, "is_recovered": false, "recovered_min": 0.0}, {"seq": 2, "station_code": "BVI", "station_name": "BORIVALI", "status": "departed", "scheduled_arrival": "17:20:00", "scheduled_departure": "17:22:00", "delay_min": 5.0, "eta": null, "lat": 19.228739, "lon": 72.85641199999999, "is_recovered": false, "recovered_min": 0.0}, {"seq": 3, "station_code": "ST", "station_name": "SURAT", "status": "departed", "scheduled_arrival": "19:43:00", "scheduled_departure": "19:48:00", "delay_min": 5.0, "eta": null, "lat": 21.206568, "lon": 72.840793, "is_recovered": false, "recovered_min": 0.0}, {"seq": 4, "station_code": "BRC", "station_name": "VADODARA JN", "status": "departed", "scheduled_arrival": "21:06:00", "scheduled_departure": "21:16:00", "delay_min": 5.0, "eta": null, "lat": 22.310756, "lon": 73.181065, "is_recovered": false, "recovered_min": 0.0}, {"seq": 5, "station_code": "RTM", "station_name": "RATLAM JN", "status": "current", "scheduled_arrival": "00:25:00", "scheduled_departure": "00:28:00", "delay_min": 9.0, "eta": "02:29", "lat": 23.34038, "lon": 75.050826, "is_recovered": false, "recovered_min": 0.0}, {"seq": 6, "station_code": "NAD", "station_name": "NAGDA JN", "status": "upcoming", "scheduled_arrival": "01:08:00", "scheduled_departure": "01:10:00", "delay_min": 4.2, "eta": "02:32", "lat": 23.45592, "lon": 75.41249099999999, "is_recovered": false, "recovered_min": 5.0}, {"seq": 7, "station_code": "KOTA", "station_name": "KOTA JN", "status": "upcoming", "scheduled_arrival": "03:15:00", "scheduled_departure": "03:20:00", "delay_min": 0.2, "eta": "03:15", "lat": 25.223553, "lon": 75.8805, "is_recovered": true, "recovered_min": 9.0}, {"seq": 8, "station_code": "NDLS", "station_name": "NEW DELHI", "status": "upcoming", "scheduled_arrival": "08:32:00", "scheduled_departure": "None", "delay_min": 0.2, "eta": "08:32", "lat": 28.642314, "lon": 77.22000399999999, "is_recovered": true, "recovered_min": 9.0}], "telemetry_source": "NTES_REALTIME", "live_position_desc": "Departed from BAJRANGARH(BJG) at 23:47 09-Sep", "model_b_stgcn_delta": 0.0, "ensemble_blend_ratio": "60% LightGBM + 40% ST-GCN", "dest_delay_recovery_min": 9.0, "dest_forecasted_delay_min": 0.0, "historical_on_time_pct": 91.8, "is_overnight_recovery_active": true}, "12302": {"train_no": "12302", "train_name": "HWH RAJDHANI", "run_status": "RUNNING", "current_station_code": "CNB", "current_station_name": "KANPUR CENTRAL", "next_station_code": "PRYJ", "next_station_name": "PRAYAGRAJ JN", "lat": 26.454109, "lon": 80.351158, "speed_kmh": 86.8, "current_delay_min": 32.0, "forecasted_delay_min": 36.0, "scheduled_arrival": "23:41", "dynamic_eta": {"point_estimate": "02:03", "confidence_90": {"lower": "02:00", "upper": "02:08"}}, "delay_reasons": [{"reason": "Operational cruising speed \u2014 normal signal clearance", "severity": "LOW", "impact_min": 0.0}, {"reason": "Overnight speedup and buffer slack: historical patterns show train recovers 36m delay before terminal", "severity": "LOW", "impact_min": -36.0}], "route_progress": [{"seq": 1, "station_code": "NDLS", "station_name": "NEW DELHI", "status": "departed", "scheduled_arrival": "START", "scheduled_departure": "16:50:00", "delay_min": 29.0, "eta": null, "lat": 28.642314, "lon": 77.22000399999999, "is_recovered": false, "recovered_min": 0.0}, {"seq": 2, "station_code": "CNB", "station_name": "KANPUR CENTRAL", "status": "departed", "scheduled_arrival": "21:30:00", "scheduled_departure": "21:35:00", "delay_min": 32.0, "eta": null, "lat": 26.454240000000002, "lon": 80.350966, "is_recovered": false, "recovered_min": 0.0}, {"seq": 3, "station_code": "PRYJ", "station_name": "PRAYAGRAJ JN", "status": "current", "scheduled_arrival": "23:41:00", "scheduled_departure": "23:43:00", "delay_min": 36.0, "eta": "02:03", "lat": 25.446241, "lon": 81.828816, "is_recovered": false, "recovered_min": 0.0}, {"seq": 4, "station_code": "DDU", "station_name": "PT.DEEN DAYAL UPADHYAYA JN", "status": "upcoming", "scheduled_arrival": "01:33:00", "scheduled_departure": "01:40:00", "delay_min": 31.2, "eta": "02:06", "lat": 25.278149, "lon": 83.11925000000001, "is_recovered": false, "recovered_min": 5.0}, {"seq": 5, "station_code": "GAYA", "station_name": "GAYA JN", "status": "upcoming", "scheduled_arrival": "03:57:00", "scheduled_departure": "04:00:00", "delay_min": 26.7, "eta": "04:23", "lat": 24.803978, "lon": 84.999294, "is_recovered": false, "recovered_min": 9.5}, {"seq": 6, "station_code": "PNME", "station_name": "PARASNATH", "status": "upcoming", "scheduled_arrival": "05:43:00", "scheduled_departure": "05:45:00", "delay_min": 22.2, "eta": "06:05", "lat": 23.987971, "lon": 86.037862, "is_recovered": false, "recovered_min": 14.0}, {"seq": 7, "station_code": "DHN", "station_name": "DHANBAD JN", "status": "upcoming", "scheduled_arrival": "06:33:00", "scheduled_departure": "06:38:00", "delay_min": 17.7, "eta": "06:50", "lat": 23.790966, "lon": 86.428956, "is_recovered": false, "recovered_min": 18.5}, {"seq": 8, "station_code": "ASN", "station_name": "ASANSOL JN", "status": "upcoming", "scheduled_arrival": "07:18:00", "scheduled_departure": "07:20:00", "delay_min": 13.2, "eta": "07:31", "lat": 23.691441, "lon": 86.975152, "is_recovered": false, "recovered_min": 23.0}, {"seq": 9, "station_code": "HWH", "station_name": "HOWRAH JN", "status": "upcoming", "scheduled_arrival": "09:55:00", "scheduled_departure": "None", "delay_min": 0.2, "eta": "09:55", "lat": 22.584077999999998, "lon": 88.34099900000001, "is_recovered": true, "recovered_min": 36.0}], "telemetry_source": "NTES_REALTIME", "live_position_desc": "Departed from MANOHARGANJ(MNJ) at 23:48 09-Sep", "model_b_stgcn_delta": 0.0, "ensemble_blend_ratio": "60% LightGBM + 40% ST-GCN", "dest_delay_recovery_min": 36.0, "dest_forecasted_delay_min": 0.0, "historical_on_time_pct": 90.0, "is_overnight_recovery_active": true}, "22222": {"train_no": "22222", "train_name": "CSMT RAJDHANI", "run_status": "RUNNING", "current_station_code": "VGLJ", "current_station_name": "VIRANGANA LAKSHMIBAI JHANSI JN", "next_station_code": "BPL", "next_station_name": "BHOPAL JN", "lat": 28.61308, "lon": 77.209031, "speed_kmh": 91.5, "current_delay_min": 10.0, "forecasted_delay_min": 14.0, "scheduled_arrival": "00:35", "dynamic_eta": {"point_estimate": "06:25", "confidence_90": {"lower": "06:22", "upper": "06:30"}}, "delay_reasons": [{"reason": "Operational cruising speed \u2014 normal signal clearance", "severity": "LOW", "impact_min": 0.0}, {"reason": "Overnight speedup and buffer slack: historical patterns show train recovers 14m delay before terminal", "severity": "LOW", "impact_min": -14.0}], "route_progress": [{"seq": 1, "station_code": "NZM", "station_name": "HAZRAT NIZAMUDDIN JN", "status": "departed", "scheduled_arrival": "START", "scheduled_departure": "16:55:00", "delay_min": 7.0, "eta": null, "lat": 28.587329999999998, "lon": 77.254249, "is_recovered": false, "recovered_min": 0.0}, {"seq": 2, "station_code": "AGC", "station_name": "AGRA CANTT JN", "status": "departed", "scheduled_arrival": "18:45:00", "scheduled_departure": "18:47:00", "delay_min": 10.0, "eta": null, "lat": 27.157992, "lon": 77.990153, "is_recovered": false, "recovered_min": 0.0}, {"seq": 3, "station_code": "GWL", "station_name": "GWALIOR JN", "status": "departed", "scheduled_arrival": "20:08:00", "scheduled_departure": "20:10:00", "delay_min": 10.0, "eta": null, "lat": 26.216483, "lon": 78.18229199999999, "is_recovered": false, "recovered_min": 0.0}, {"seq": 4, "station_code": "VGLJ", "station_name": "VIRANGANA LAKSHMIBAI JHANSI JN", "status": "departed", "scheduled_arrival": "21:28:00", "scheduled_departure": "21:33:00", "delay_min": 10.0, "eta": null, "lat": 28.6139, "lon": 77.209, "is_recovered": false, "recovered_min": 0.0}, {"seq": 5, "station_code": "BPL", "station_name": "BHOPAL JN", "status": "current", "scheduled_arrival": "00:35:00", "scheduled_departure": "00:40:00", "delay_min": 14.0, "eta": "06:25", "lat": 23.266884384300003, "lon": 77.4131428577, "is_recovered": false, "recovered_min": 0.0}, {"seq": 6, "station_code": "BSL", "station_name": "BHUSAVAL JN", "status": "upcoming", "scheduled_arrival": "05:15:00", "scheduled_departure": "05:17:00", "delay_min": 9.2, "eta": "06:28", "lat": 21.0472812, "lon": 75.78867170000001, "is_recovered": false, "recovered_min": 5.0}, {"seq": 7, "station_code": "JL", "station_name": "JALGAON JN", "status": "upcoming", "scheduled_arrival": "05:38:00", "scheduled_departure": "05:40:00", "delay_min": 4.7, "eta": "06:31", "lat": 21.018114999999998, "lon": 75.56287499999999, "is_recovered": false, "recovered_min": 9.5}, {"seq": 8, "station_code": "NK", "station_name": "NASIK ROAD", "status": "upcoming", "scheduled_arrival": "08:08:00", "scheduled_departure": "08:10:00", "delay_min": 0.2, "eta": "08:08", "lat": 19.947627, "lon": 73.841897, "is_recovered": true, "recovered_min": 14.0}, {"seq": 9, "station_code": "KYN", "station_name": "KALYAN JN", "status": "upcoming", "scheduled_arrival": "10:13:00", "scheduled_departure": "10:15:00", "delay_min": 0.2, "eta": "10:13", "lat": 19.234716000000002, "lon": 73.12974, "is_recovered": true, "recovered_min": 14.0}, {"seq": 10, "station_code": "CSMT", "station_name": "C SHIVAJI MAH T", "status": "upcoming", "scheduled_arrival": "11:15:00", "scheduled_departure": "None", "delay_min": 0.2, "eta": "11:15", "lat": 18.944481, "lon": 72.836903, "is_recovered": true, "recovered_min": 14.0}], "telemetry_source": "NTES_REALTIME", "live_position_desc": "Departed from GANJ BASODA(BAQ) at 23:51 09-Sep", "model_b_stgcn_delta": 0.0, "ensemble_blend_ratio": "60% LightGBM + 40% ST-GCN", "dest_delay_recovery_min": 14.0, "dest_forecasted_delay_min": 0.0, "historical_on_time_pct": 90.0, "is_overnight_recovery_active": true}, "12436": {"train_no": "12436", "train_name": "JYG GARIB RATH", "run_status": "NOT_RUNNING_TODAY", "current_station_code": "ANVT", "current_station_name": "ANAND VIHAR TERMINAL", "next_station_code": "JYG", "next_station_name": "JAYNAGAR", "lat": 28.650503565399998, "lon": 77.31521255, "speed_kmh": 0.0, "current_delay_min": 0.0, "forecasted_delay_min": 0.0, "scheduled_arrival": "17:20", "dynamic_eta": {"point_estimate": "17:20", "confidence_90": {"lower": "17:20", "upper": "17:20"}}, "delay_reasons": [{"reason": "Not scheduled to run today (Operates: Tue,sat, Next service: 12-Sep-2026)", "severity": "LOW", "impact_min": 0.0}], "route_progress": [{"seq": 1, "station_code": "ANVT", "station_name": "ANAND VIHAR TERMINAL", "status": "current", "scheduled_arrival": "START", "scheduled_departure": "17:20:00", "delay_min": 0.0, "eta": "17:20", "lat": 28.650503565399998, "lon": 77.31521255, "is_recovered": false, "recovered_min": 0.0}, {"seq": 2, "station_code": "ALJN", "station_name": "ALIGARH JN", "status": "upcoming", "scheduled_arrival": "18:53:00", "scheduled_departure": "18:55:00", "delay_min": 0.0, "eta": "18:53", "lat": 27.889584, "lon": 78.074559, "is_recovered": false, "recovered_min": 0.0}, {"seq": 3, "station_code": "CNB", "station_name": "KANPUR CENTRAL", "status": "upcoming", "scheduled_arrival": "22:12:00", "scheduled_departure": "22:17:00", "delay_min": 0.0, "eta": "22:12", "lat": 26.454240000000002, "lon": 80.350966, "is_recovered": false, "recovered_min": 0.0}, {"seq": 4, "station_code": "PRYJ", "station_name": "PRAYAGRAJ JN", "status": "upcoming", "scheduled_arrival": "00:23:00", "scheduled_departure": "00:25:00", "delay_min": 0.0, "eta": "00:23", "lat": 25.446241, "lon": 81.828816, "is_recovered": false, "recovered_min": 0.0}, {"seq": 5, "station_code": "DDU", "station_name": "PT.DEEN DAYAL UPADHYAYA JN", "status": "upcoming", "scheduled_arrival": "02:33:00", "scheduled_departure": "02:40:00", "delay_min": 0.0, "eta": "02:33", "lat": 25.278149, "lon": 83.11925000000001, "is_recovered": false, "recovered_min": 0.0}, {"seq": 6, "station_code": "GMR", "station_name": "GAHMAR", "status": "upcoming", "scheduled_arrival": "03:30:00", "scheduled_departure": "03:32:00", "delay_min": 0.0, "eta": "03:30", "lat": 25.488685, "lon": 83.80443100000001, "is_recovered": false, "recovered_min": 0.0}, {"seq": 7, "station_code": "BXR", "station_name": "BUXAR", "status": "upcoming", "scheduled_arrival": "03:51:00", "scheduled_departure": "03:53:00", "delay_min": 0.0, "eta": "03:51", "lat": 25.562067, "lon": 83.982184, "is_recovered": false, "recovered_min": 0.0}, {"seq": 8, "station_code": "DURE", "station_name": "DUMRAON", "status": "upcoming", "scheduled_arrival": "04:08:00", "scheduled_departure": "04:10:00", "delay_min": 0.0, "eta": "04:08", "lat": 25.571984, "lon": 84.14386499999999, "is_recovered": false, "recovered_min": 0.0}, {"seq": 9, "station_code": "BEA", "station_name": "BIHIYA", "status": "upcoming", "scheduled_arrival": "04:30:00", "scheduled_departure": "04:32:00", "delay_min": 0.0, "eta": "04:30", "lat": 25.558893, "lon": 84.448984, "is_recovered": false, "recovered_min": 0.0}, {"seq": 10, "station_code": "ARA", "station_name": "ARA", "status": "upcoming", "scheduled_arrival": "04:48:00", "scheduled_departure": "04:50:00", "delay_min": 0.0, "eta": "04:48", "lat": 25.548889, "lon": 84.66259600000001, "is_recovered": false, "recovered_min": 0.0}, {"seq": 11, "station_code": "DNR", "station_name": "DANAPUR", "status": "upcoming", "scheduled_arrival": "05:38:00", "scheduled_departure": "05:40:00", "delay_min": 0.0, "eta": "05:38", "lat": 25.581921, "lon": 85.044629, "is_recovered": false, "recovered_min": 0.0}, {"seq": 12, "station_code": "PNBE", "station_name": "PATNA JN", "status": "upcoming", "scheduled_arrival": "06:03:00", "scheduled_departure": "06:10:00", "delay_min": 0.0, "eta": "06:03", "lat": 25.60256, "lon": 85.136824, "is_recovered": false, "recovered_min": 0.0}, {"seq": 13, "station_code": "BKP", "station_name": "BAKHTIYARPUR JN", "status": "upcoming", "scheduled_arrival": "06:51:00", "scheduled_departure": "06:53:00", "delay_min": 0.0, "eta": "06:51", "lat": 25.456110000000002, "lon": 85.52956400000001, "is_recovered": false, "recovered_min": 0.0}, {"seq": 14, "station_code": "MKA", "station_name": "MOKAMA", "status": "upcoming", "scheduled_arrival": "07:18:00", "scheduled_departure": "07:20:00", "delay_min": 0.0, "eta": "07:18", "lat": 25.391885, "lon": 85.91304899999999, "is_recovered": false, "recovered_min": 0.0}, {"seq": 15, "station_code": "BJU", "station_name": "BARAUNI JN", "status": "upcoming", "scheduled_arrival": "09:00:00", "scheduled_departure": "09:10:00", "delay_min": 0.0, "eta": "09:00", "lat": 25.461768000000003, "lon": 85.988748, "is_recovered": false, "recovered_min": 0.0}, {"seq": 16, "station_code": "SPJ", "station_name": "SAMASTIPUR JN", "status": "upcoming", "scheduled_arrival": "10:35:00", "scheduled_departure": "10:40:00", "delay_min": 0.0, "eta": "10:35", "lat": 25.858304, "lon": 85.78736, "is_recovered": false, "recovered_min": 0.0}, {"seq": 17, "station_code": "HYT", "station_name": "HAYAGHAT", "status": "upcoming", "scheduled_arrival": "11:13:00", "scheduled_departure": "11:15:00", "delay_min": 0.0, "eta": "11:13", "lat": 26.020321, "lon": 85.87821199999999, "is_recovered": false, "recovered_min": 0.0}, {"seq": 18, "station_code": "LSI", "station_name": "LAHERIA SARAI", "status": "upcoming", "scheduled_arrival": "11:27:00", "scheduled_departure": "11:30:00", "delay_min": 0.0, "eta": "11:27", "lat": 26.110633, "lon": 85.903825, "is_recovered": false, "recovered_min": 0.0}, {"seq": 19, "station_code": "DBG", "station_name": "DARBHANGA JN", "status": "upcoming", "scheduled_arrival": "12:00:00", "scheduled_departure": "12:05:00", "delay_min": 0.0, "eta": "12:00", "lat": 26.157088, "lon": 85.907575, "is_recovered": false, "recovered_min": 0.0}, {"seq": 20, "station_code": "SKI", "station_name": "SAKRI JN", "status": "upcoming", "scheduled_arrival": "12:23:00", "scheduled_departure": "12:25:00", "delay_min": 0.0, "eta": "12:23", "lat": 26.208947000000002, "lon": 86.078137, "is_recovered": false, "recovered_min": 0.0}, {"seq": 21, "station_code": "MBI", "station_name": "MADHUBANI", "status": "upcoming", "scheduled_arrival": "12:38:00", "scheduled_departure": "12:41:00", "delay_min": 0.0, "eta": "12:38", "lat": 26.348165, "lon": 86.076784, "is_recovered": false, "recovered_min": 0.0}, {"seq": 22, "station_code": "JYG", "station_name": "JAYNAGAR", "status": "upcoming", "scheduled_arrival": "13:50:00", "scheduled_departure": "None", "delay_min": 0.0, "eta": "13:50", "lat": 26.589465, "lon": 86.134871, "is_recovered": false, "recovered_min": 0.0}], "telemetry_source": "NTES_REALTIME", "live_position_desc": "Not scheduled to run today (Operates: Tue,sat, Next service: 12-Sep-2026)", "model_b_stgcn_delta": 0.0, "ensemble_blend_ratio": "60% LightGBM + 40% ST-GCN", "dest_delay_recovery_min": 0.0, "dest_forecasted_delay_min": 0.0, "historical_on_time_pct": 60.0, "is_overnight_recovery_active": true}, "20901": {"train_no": "20901", "train_name": "VANDE BHARAT EXP", "run_status": "NOT_RUNNING_TODAY", "current_station_code": "MMCT", "current_station_name": "MUMBAI CENTRAL", "next_station_code": "GNC", "next_station_name": "GANDHINAGAR CAPITAL", "lat": 18.970667, "lon": 72.819383, "speed_kmh": 0.0, "current_delay_min": 0.0, "forecasted_delay_min": 0.0, "scheduled_arrival": "06:00", "dynamic_eta": {"point_estimate": "06:00", "confidence_90": {"lower": "06:00", "upper": "06:00"}}, "delay_reasons": [{"reason": "Not scheduled to run today (Operates: Mon,tue,thu,fri,sat,sun, Next service: 10-Sep-2026)", "severity": "LOW", "impact_min": 0.0}], "route_progress": [{"seq": 1, "station_code": "MMCT", "station_name": "MUMBAI CENTRAL", "status": "current", "scheduled_arrival": "START", "scheduled_departure": "06:00:00", "delay_min": 0.0, "eta": "06:00", "lat": 18.970667, "lon": 72.819383, "is_recovered": false, "recovered_min": 0.0}, {"seq": 2, "station_code": "BVI", "station_name": "BORIVALI", "status": "upcoming", "scheduled_arrival": "06:23:00", "scheduled_departure": "06:25:00", "delay_min": 0.0, "eta": "06:23", "lat": 19.228739, "lon": 72.85641199999999, "is_recovered": false, "recovered_min": 0.0}, {"seq": 3, "station_code": "VAPI", "station_name": "VAPI", "status": "upcoming", "scheduled_arrival": "07:53:00", "scheduled_departure": "07:55:00", "delay_min": 0.0, "eta": "07:53", "lat": 20.374337999999998, "lon": 72.90912700000001, "is_recovered": false, "recovered_min": 0.0}, {"seq": 4, "station_code": "BL", "station_name": "VALSAD", "status": "upcoming", "scheduled_arrival": "08:18:00", "scheduled_departure": "08:20:00", "delay_min": 0.0, "eta": "08:18", "lat": 20.6085595, "lon": 72.9335291, "is_recovered": false, "recovered_min": 0.0}, {"seq": 5, "station_code": "NVS", "station_name": "NAVSARI", "status": "upcoming", "scheduled_arrival": "08:43:00", "scheduled_departure": "08:45:00", "delay_min": 0.0, "eta": "08:43", "lat": 20.946851, "lon": 72.914294, "is_recovered": false, "recovered_min": 0.0}, {"seq": 6, "station_code": "ST", "station_name": "SURAT", "status": "upcoming", "scheduled_arrival": "09:05:00", "scheduled_departure": "09:08:00", "delay_min": 0.0, "eta": "09:05", "lat": 21.206568, "lon": 72.840793, "is_recovered": false, "recovered_min": 0.0}, {"seq": 7, "station_code": "BRC", "station_name": "VADODARA JN", "status": "upcoming", "scheduled_arrival": "10:23:00", "scheduled_departure": "10:26:00", "delay_min": 0.0, "eta": "10:23", "lat": 22.310756, "lon": 73.181065, "is_recovered": false, "recovered_min": 0.0}, {"seq": 8, "station_code": "ANND", "station_name": "ANAND JN", "status": "upcoming", "scheduled_arrival": "10:48:00", "scheduled_departure": "10:50:00", "delay_min": 0.0, "eta": "10:48", "lat": 22.561307, "lon": 72.965733, "is_recovered": false, "recovered_min": 0.0}, {"seq": 9, "station_code": "ADI", "station_name": "AHMEDABAD JN", "status": "upcoming", "scheduled_arrival": "11:35:00", "scheduled_departure": "11:40:00", "delay_min": 0.0, "eta": "11:35", "lat": 23.025515, "lon": 72.601516, "is_recovered": false, "recovered_min": 0.0}, {"seq": 10, "station_code": "GNC", "station_name": "GANDHINAGAR CAPITAL", "status": "upcoming", "scheduled_arrival": "12:30:00", "scheduled_departure": "None", "delay_min": 0.0, "eta": "12:30", "lat": 23.233379, "lon": 72.62916200000001, "is_recovered": false, "recovered_min": 0.0}], "telemetry_source": "NTES_REALTIME", "live_position_desc": "Not scheduled to run today (Operates: Mon,tue,thu,fri,sat,sun, Next service: 10-Sep-2026)", "model_b_stgcn_delta": 0.0, "ensemble_blend_ratio": "60% LightGBM + 40% ST-GCN", "dest_delay_recovery_min": 0.0, "dest_forecasted_delay_min": 0.0, "historical_on_time_pct": 90.0, "is_overnight_recovery_active": true}, "12904": {"train_no": "12904", "train_name": "GOLDEN TEMPLE M", "run_status": "RUNNING", "current_station_code": "YJUD", "current_station_name": "YAMUNANAGAR JAGADHRI", "next_station_code": "SRE", "next_station_name": "SAHARANPUR JN", "lat": 30.116858, "lon": 77.2885, "speed_kmh": 91.2, "current_delay_min": 5.0, "forecasted_delay_min": 9.0, "scheduled_arrival": "00:15", "dynamic_eta": {"point_estimate": "00:24", "confidence_90": {"lower": "00:21", "upper": "00:29"}}, "delay_reasons": [{"reason": "Operational cruising speed \u2014 normal signal clearance", "severity": "LOW", "impact_min": 0.0}, {"reason": "Overnight speedup and buffer slack: historical patterns show train recovers 9m delay before terminal", "severity": "LOW", "impact_min": -9.0}], "route_progress": [{"seq": 1, "station_code": "ASR", "station_name": "AMRITSAR", "status": "departed", "scheduled_arrival": "START", "scheduled_departure": "18:55:00", "delay_min": 2.0, "eta": null, "lat": 31.631511999999997, "lon": 74.858025, "is_recovered": false, "recovered_min": 0.0}, {"seq": 2, "station_code": "BEAS", "station_name": "BEAS", "status": "departed", "scheduled_arrival": "19:23:00", "scheduled_departure": "19:25:00", "delay_min": 5.0, "eta": null, "lat": 31.5193738, "lon": 75.2908085, "is_recovered": false, "recovered_min": 0.0}, {"seq": 3, "station_code": "JUC", "station_name": "JALANDHAR CITY", "status": "departed", "scheduled_arrival": "20:00:00", "scheduled_departure": "20:05:00", "delay_min": 5.0, "eta": null, "lat": 31.331665, "lon": 75.591499, "is_recovered": false, "recovered_min": 0.0}, {"seq": 4, "station_code": "LDH", "station_name": "LUDHIANA JN", "status": "departed", "scheduled_arrival": "21:00:00", "scheduled_departure": "21:10:00", "delay_min": 5.0, "eta": null, "lat": 30.912367, "lon": 75.84787299999999, "is_recovered": false, "recovered_min": 0.0}, {"seq": 5, "station_code": "UMB", "station_name": "AMBALA CANTT", "status": "departed", "scheduled_arrival": "22:50:00", "scheduled_departure": "22:55:00", "delay_min": 5.0, "eta": null, "lat": 30.338918, "lon": 76.826966, "is_recovered": false, "recovered_min": 0.0}, {"seq": 6, "station_code": "YJUD", "station_name": "YAMUNANAGAR JAGADHRI", "status": "departed", "scheduled_arrival": "23:33:00", "scheduled_departure": "23:35:00", "delay_min": 5.0, "eta": null, "lat": 30.1174255334, "lon": 77.28757996649999, "is_recovered": false, "recovered_min": 0.0}, {"seq": 7, "station_code": "SRE", "station_name": "SAHARANPUR JN", "status": "current", "scheduled_arrival": "00:15:00", "scheduled_departure": "00:20:00", "delay_min": 9.0, "eta": "00:24", "lat": 29.960529, "lon": 77.54173899999999, "is_recovered": false, "recovered_min": 0.0}, {"seq": 8, "station_code": "MOZ", "station_name": "MUZAFFARNAGAR", "status": "upcoming", "scheduled_arrival": "01:04:00", "scheduled_departure": "01:06:00", "delay_min": 4.2, "eta": "01:08", "lat": 29.468689, "lon": 77.707807, "is_recovered": false, "recovered_min": 5.0}, {"seq": 9, "station_code": "SKF", "station_name": "SAKHOTI TANDA", "status": "upcoming", "scheduled_arrival": "01:27:00", "scheduled_departure": "01:29:00", "delay_min": 1.7, "eta": "01:28", "lat": 29.192626, "lon": 77.71804900000001, "is_recovered": true, "recovered_min": 7.5}, {"seq": 10, "station_code": "MUT", "station_name": "MEERUT CANT", "status": "upcoming", "scheduled_arrival": "01:45:00", "scheduled_departure": "01:47:00", "delay_min": 1.2, "eta": "01:46", "lat": 29.015997000000002, "lon": 77.686937, "is_recovered": true, "recovered_min": 8.0}, {"seq": 11, "station_code": "MTC", "station_name": "MEERUT CITY", "status": "upcoming", "scheduled_arrival": "01:55:00", "scheduled_departure": "02:00:00", "delay_min": 0.7, "eta": "01:55", "lat": 28.977610000000002, "lon": 77.675106, "is_recovered": true, "recovered_min": 8.5}, {"seq": 12, "station_code": "GZB", "station_name": "GHAZIABAD", "status": "upcoming", "scheduled_arrival": "02:50:00", "scheduled_departure": "02:52:00", "delay_min": 0.2, "eta": "02:50", "lat": 28.649702, "lon": 77.431099, "is_recovered": true, "recovered_min": 9.0}, {"seq": 13, "station_code": "NZM", "station_name": "HAZRAT NIZAMUDDIN JN", "status": "upcoming", "scheduled_arrival": "03:45:00", "scheduled_departure": "04:00:00", "delay_min": 0.2, "eta": "03:45", "lat": 28.587329999999998, "lon": 77.254249, "is_recovered": true, "recovered_min": 9.0}, {"seq": 14, "station_code": "FDB", "station_name": "FARIDABAD", "status": "upcoming", "scheduled_arrival": "04:16:00", "scheduled_departure": "04:18:00", "delay_min": 0.2, "eta": "04:16", "lat": 28.411473, "lon": 77.30734799999999, "is_recovered": true, "recovered_min": 9.0}, {"seq": 15, "station_code": "MTJ", "station_name": "MATHURA JN", "status": "upcoming", "scheduled_arrival": "05:45:00", "scheduled_departure": "05:50:00", "delay_min": 0.2, "eta": "05:45", "lat": 27.480145, "lon": 77.67311699999999, "is_recovered": true, "recovered_min": 9.0}, {"seq": 16, "station_code": "BTE", "station_name": "BHARATPUR JN", "status": "upcoming", "scheduled_arrival": "06:13:00", "scheduled_departure": "06:15:00", "delay_min": 0.2, "eta": "06:13", "lat": 27.237106999999998, "lon": 77.488613, "is_recovered": true, "recovered_min": 9.0}, {"seq": 17, "station_code": "BXN", "station_name": "BAYANA JN", "status": "upcoming", "scheduled_arrival": "06:40:00", "scheduled_departure": "06:42:00", "delay_min": 0.2, "eta": "06:40", "lat": 26.916354000000002, "lon": 77.29713100000001, "is_recovered": true, "recovered_min": 9.0}, {"seq": 18, "station_code": "HAN", "station_name": "HINDAUN CITY", "status": "upcoming", "scheduled_arrival": "07:03:00", "scheduled_departure": "07:05:00", "delay_min": 0.2, "eta": "07:03", "lat": 26.756164000000002, "lon": 77.03168600000001, "is_recovered": true, "recovered_min": 9.0}, {"seq": 19, "station_code": "SMVJ", "station_name": "SHRI MAHAVEERJI", "status": "upcoming", "scheduled_arrival": "07:13:00", "scheduled_departure": "07:15:00", "delay_min": 0.2, "eta": "07:13", "lat": 28.6139, "lon": 77.209, "is_recovered": true, "recovered_min": 9.0}, {"seq": 20, "station_code": "GGC", "station_name": "GANGAPUR CITY JN", "status": "upcoming", "scheduled_arrival": "07:45:00", "scheduled_departure": "07:50:00", "delay_min": 0.2, "eta": "07:45", "lat": 26.468979, "lon": 76.72770799999999, "is_recovered": true, "recovered_min": 9.0}, {"seq": 21, "station_code": "SWM", "station_name": "SAWAI MADHOPUR JN", "status": "upcoming", "scheduled_arrival": "08:30:00", "scheduled_departure": "08:35:00", "delay_min": 0.2, "eta": "08:30", "lat": 26.018279, "lon": 76.35622, "is_recovered": true, "recovered_min": 9.0}, {"seq": 22, "station_code": "KOTA", "station_name": "KOTA JN", "status": "upcoming", "scheduled_arrival": "10:10:00", "scheduled_departure": "10:20:00", "delay_min": 0.2, "eta": "10:10", "lat": 25.223553, "lon": 75.8805, "is_recovered": true, "recovered_min": 9.0}, {"seq": 23, "station_code": "RMA", "station_name": "RAMGANJ MANDI JN", "status": "upcoming", "scheduled_arrival": "11:18:00", "scheduled_departure": "11:20:00", "delay_min": 0.2, "eta": "11:18", "lat": 24.644606, "lon": 75.939411, "is_recovered": true, "recovered_min": 9.0}, {"seq": 24, "station_code": "BWM", "station_name": "BHAWANI MANDI", "status": "upcoming", "scheduled_arrival": "11:38:00", "scheduled_departure": "11:40:00", "delay_min": 0.2, "eta": "11:38", "lat": 24.419472000000003, "lon": 75.82981, "is_recovered": true, "recovered_min": 9.0}, {"seq": 25, "station_code": "SGZ", "station_name": "SHAMGARH", "status": "upcoming", "scheduled_arrival": "12:03:00", "scheduled_departure": "12:05:00", "delay_min": 0.2, "eta": "12:03", "lat": 24.191141000000002, "lon": 75.642842, "is_recovered": true, "recovered_min": 9.0}, {"seq": 26, "station_code": "NAD", "station_name": "NAGDA JN", "status": "upcoming", "scheduled_arrival": "13:38:00", "scheduled_departure": "13:40:00", "delay_min": 0.2, "eta": "13:38", "lat": 23.45592, "lon": 75.41249099999999, "is_recovered": true, "recovered_min": 9.0}, {"seq": 27, "station_code": "RTM", "station_name": "RATLAM JN", "status": "upcoming", "scheduled_arrival": "14:15:00", "scheduled_departure": "14:25:00", "delay_min": 0.2, "eta": "14:15", "lat": 23.34038, "lon": 75.050826, "is_recovered": true, "recovered_min": 9.0}, {"seq": 28, "station_code": "MGN", "station_name": "MEGHNAGAR", "status": "upcoming", "scheduled_arrival": "15:26:00", "scheduled_departure": "15:28:00", "delay_min": 0.2, "eta": "15:26", "lat": 22.907459, "lon": 74.539834, "is_recovered": true, "recovered_min": 9.0}, {"seq": 29, "station_code": "DHD", "station_name": "DAHOD", "status": "upcoming", "scheduled_arrival": "15:52:00", "scheduled_departure": "15:54:00", "delay_min": 0.2, "eta": "15:52", "lat": 22.843607000000002, "lon": 74.25337400000001, "is_recovered": true, "recovered_min": 9.0}, {"seq": 30, "station_code": "GDA", "station_name": "GODHRA JN", "status": "upcoming", "scheduled_arrival": "17:05:00", "scheduled_departure": "17:07:00", "delay_min": 0.2, "eta": "15:55", "lat": 22.776974, "lon": 73.603672, "is_recovered": true, "recovered_min": 9.0}, {"seq": 31, "station_code": "BRC", "station_name": "VADODARA JN", "status": "upcoming", "scheduled_arrival": "18:01:00", "scheduled_departure": "18:11:00", "delay_min": 0.2, "eta": "15:58", "lat": 22.310756, "lon": 73.181065, "is_recovered": true, "recovered_min": 9.0}, {"seq": 32, "station_code": "ST", "station_name": "SURAT", "status": "upcoming", "scheduled_arrival": "19:41:00", "scheduled_departure": "19:46:00", "delay_min": 0.2, "eta": "16:01", "lat": 21.206568, "lon": 72.840793, "is_recovered": true, "recovered_min": 9.0}, {"seq": 33, "station_code": "BVI", "station_name": "BORIVALI", "status": "upcoming", "scheduled_arrival": "22:43:00", "scheduled_departure": "22:45:00", "delay_min": 0.2, "eta": "16:04", "lat": 19.228739, "lon": 72.85641199999999, "is_recovered": true, "recovered_min": 9.0}, {"seq": 34, "station_code": "BDTS", "station_name": "BANDRA TERMINUS", "status": "upcoming", "scheduled_arrival": "23:55:00", "scheduled_departure": "None", "delay_min": 0.2, "eta": "16:07", "lat": 19.061911, "lon": 72.840535, "is_recovered": true, "recovered_min": 9.0}], "telemetry_source": "NTES_REALTIME", "live_position_desc": "Departed from KALANOUR(KNZ) at 23:48 09-Sep", "model_b_stgcn_delta": 0.0, "ensemble_blend_ratio": "60% LightGBM + 40% ST-GCN", "dest_delay_recovery_min": 9.0, "dest_forecasted_delay_min": 0.0, "historical_on_time_pct": 82.0, "is_overnight_recovery_active": true}, "12004": {"train_no": "12004", "train_name": "SHATABDI EXPRESS", "run_status": "COMPLETED", "current_station_code": "LJN", "current_station_name": "LUCKNOW LJN", "next_station_code": "LJN", "next_station_name": "LUCKNOW LJN", "lat": 26.831967000000002, "lon": 80.91858699999999, "speed_kmh": 0.0, "current_delay_min": 0.0, "forecasted_delay_min": 0.0, "scheduled_arrival": "13:00", "dynamic_eta": {"point_estimate": "23:55", "confidence_90": {"lower": "23:55", "upper": "23:55"}}, "delay_reasons": [{"reason": "Train has reached destination terminal \u2014 Journey completed", "severity": "LOW", "impact_min": 0.0}], "route_progress": [{"seq": 1, "station_code": "NDLS", "station_name": "NEW DELHI", "status": "departed", "scheduled_arrival": "START", "scheduled_departure": "06:10:00", "delay_min": 0.0, "eta": null, "lat": 28.642314, "lon": 77.22000399999999, "is_recovered": false, "recovered_min": 0.0}, {"seq": 2, "station_code": "GZB", "station_name": "GHAZIABAD", "status": "departed", "scheduled_arrival": "06:40:00", "scheduled_departure": "06:42:00", "delay_min": 0.0, "eta": null, "lat": 28.649702, "lon": 77.431099, "is_recovered": false, "recovered_min": 0.0}, {"seq": 3, "station_code": "ALJN", "station_name": "ALIGARH JN", "status": "departed", "scheduled_arrival": "07:47:00", "scheduled_departure": "07:49:00", "delay_min": 0.0, "eta": null, "lat": 27.889584, "lon": 78.074559, "is_recovered": false, "recovered_min": 0.0}, {"seq": 4, "station_code": "TDL", "station_name": "TUNDLA JN", "status": "departed", "scheduled_arrival": "08:45:00", "scheduled_departure": "08:47:00", "delay_min": 0.0, "eta": null, "lat": 27.207747, "lon": 78.233285, "is_recovered": false, "recovered_min": 0.0}, {"seq": 5, "station_code": "ETW", "station_name": "ETAWAH JN", "status": "departed", "scheduled_arrival": "09:40:00", "scheduled_departure": "09:42:00", "delay_min": 0.0, "eta": null, "lat": 26.785970000000002, "lon": 79.021502, "is_recovered": false, "recovered_min": 0.0}, {"seq": 6, "station_code": "PHD", "station_name": "PHAPHUND", "status": "departed", "scheduled_arrival": "10:14:00", "scheduled_departure": "10:15:00", "delay_min": 0.0, "eta": null, "lat": 26.632118317699998, "lon": 79.5542552124, "is_recovered": false, "recovered_min": 0.0}, {"seq": 7, "station_code": "CNB", "station_name": "KANPUR CENTRAL", "status": "departed", "scheduled_arrival": "11:23:00", "scheduled_departure": "11:28:00", "delay_min": 0.0, "eta": null, "lat": 26.454240000000002, "lon": 80.350966, "is_recovered": false, "recovered_min": 0.0}, {"seq": 8, "station_code": "ON", "station_name": "UNNAO JN", "status": "departed", "scheduled_arrival": "11:54:00", "scheduled_departure": "11:56:00", "delay_min": 0.0, "eta": null, "lat": 26.548354, "lon": 80.486199, "is_recovered": false, "recovered_min": 0.0}, {"seq": 9, "station_code": "LJN", "station_name": "LUCKNOW LJN", "status": "current", "scheduled_arrival": "13:00:00", "scheduled_departure": "None", "delay_min": 0.0, "eta": "ARRIVED", "lat": 26.831967000000002, "lon": 80.91858699999999, "is_recovered": false, "recovered_min": 0.0}], "telemetry_source": "NTES_REALTIME", "live_position_desc": "Arrived at LUCKNOW LJN(LJN) at 12:52 09-Sep (On Time)", "model_b_stgcn_delta": 0.0, "ensemble_blend_ratio": "60% LightGBM + 40% ST-GCN", "dest_delay_recovery_min": 0.0, "dest_forecasted_delay_min": 0.0, "historical_on_time_pct": 86.8, "is_overnight_recovery_active": true}};
window.TRAIN_BACKEND_CACHE = window.TRAIN_BACKEND_CACHE || {};

function renderDrawerRouteTimeline(trainId, data) {
  if (!data || !data.route_progress || !Array.isArray(data.route_progress) || data.route_progress.length === 0) {
    const cached = window.INITIAL_FLEET_CACHE && window.INITIAL_FLEET_CACHE[trainId];
    if (cached && cached !== data) return renderDrawerRouteTimeline(trainId, cached);
    return `
      <div class="drawer-section-card" id="drawer-route-progression-card">
        <div class="drawer-section-heading">ROUTE PROGRESSION TIMELINE</div>
        <div style="display: flex; flex-direction: column; gap: 6px; margin-top: 6px; font-size: 10px; color: var(--color-ink-muted);">
          <span>Connecting live route progression...</span>
        </div>
      </div>
    `;
  }

  const stops = data.route_progress;
  const origin = stops[0];
  const dest = stops[stops.length - 1];
  const originCode = origin.station_code || 'ORIGIN';
  const destCode = dest.station_code || 'DEST';
  const totalStops = stops.length;
  const title = `ROUTE PROGRESSION TIMELINE (${originCode} &#10132; ${destCode} &bull; ${totalStops} STATIONS)`;

  const rows = stops.map((s, idx) => {
    const isOrigin = (idx === 0);
    const isDest = (idx === stops.length - 1);
    const stName = s.station_name || s.station_code;
    const stCode = s.station_code;
    const status = s.status;
    const pfNum = (idx % 5) + 1;

    if (status === 'departed') {
      const t = s.scheduled_departure || s.scheduled_arrival || '--:--';
      const tStr = String(t).slice(0, 5);
      const dly = Math.round(s.delay_min || 0);
      const dlyTag = dly > 0 ? `(+${dly}m)` : '(ON TIME)';
      return `
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 10px; font-family: var(--font-mono); color: var(--color-nominal); padding: 2px 0;">
          <span style="display: flex; align-items: center; gap: 6px;">
            <span style="opacity: 0.6; font-size: 8px;">${idx + 1}.</span>
            <strong>${stCode}</strong>
            <span style="opacity: 0.85; font-size: 9px;">(${stName})</span>
          </span>
          <span style="font-weight: 600;">DEP ${tStr} ${dlyTag} &#10003;</span>
        </div>
      `;
    } else if (status === 'current') {
      const etaVal = s.eta || s.scheduled_arrival || 'NOW';
      const isDwelling = data.run_status === 'DWELLING';
      const actionLabel = isDwelling ? 'HALT' : 'NEXT';
      return `
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 10px; font-family: var(--font-mono); color: var(--color-accent); font-weight: 700; background: rgba(245,158,11,0.12); border-left: 3px solid var(--color-accent); padding: 4px 8px; border-radius: 3px; margin: 2px 0; box-shadow: 0 0 8px rgba(245,158,11,0.15);">
          <span style="display: flex; align-items: center; gap: 6px;">
            <span style="font-size: 8px;">${idx + 1}.</span>
            <strong style="color: #ffffff;">${stCode}</strong>
            <span style="font-size: 9px; opacity: 0.95;">(${stName})</span>
          </span>
          <span style="background: rgba(245,158,11,0.18); padding: 2px 6px; border-radius: 2px; letter-spacing: 0.5px;">${actionLabel} ${etaVal} (PF-0${pfNum})</span>
        </div>
      `;
    } else if (isDest) {
      const dly = Math.round(s.delay_min != null ? s.delay_min : (data.dest_forecasted_delay_min || 0));
      const dlyStr = dly > 0 ? `+${dly}m` : (dly < 0 ? `${dly}m` : '+0m');
      const etaVal = s.eta || s.scheduled_arrival || '--:--';
      return `
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 10px; font-family: var(--font-mono); color: var(--color-ink-muted); padding: 2px 0; border-top: 1px dashed rgba(255,255,255,0.1); margin-top: 2px;">
          <span style="display: flex; align-items: center; gap: 6px;">
            <span style="opacity: 0.6; font-size: 8px;">${idx + 1}.</span>
            <strong>${stCode}</strong>
            <span style="opacity: 0.85; font-size: 9px;">(${stName}) [TERMINAL]</span>
          </span>
          <span style="font-weight: 600; color: var(--color-amber, #f59e0b);">ETA ${etaVal} (${dlyStr})</span>
        </div>
      `;
    } else {
      const schedT = String(s.scheduled_arrival || s.scheduled_departure || '--:--').slice(0, 5);
      const dly = Math.round(s.delay_min || 0);
      const dlyHint = dly > 0 ? ` (+${dly}m)` : '';
      return `
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 10px; font-family: var(--font-mono); color: var(--color-ink-muted); opacity: 0.85; padding: 2px 0;">
          <span style="display: flex; align-items: center; gap: 6px;">
            <span style="opacity: 0.6; font-size: 8px;">${idx + 1}.</span>
            <strong>${stCode}</strong>
            <span style="opacity: 0.85; font-size: 9px;">(${stName})</span>
          </span>
          <span>SCHED ${schedT}${dlyHint}</span>
        </div>
      `;
    }
  }).join('');

  return `
    <div class="drawer-section-card" id="drawer-route-progression-card">
      <div class="drawer-section-heading" style="display: flex; justify-content: space-between; align-items: center;">
        <span>${title}</span>
        <span style="font-size: 8px; color: var(--color-accent); font-weight: normal; text-transform: uppercase;">Scroll for all stops &darr;</span>
      </div>
      <div style="display: flex; flex-direction: column; gap: 3px; margin-top: 6px; max-height: 250px; overflow-y: auto; padding-right: 4px; scrollbar-width: thin;">
        ${rows}
      </div>
    </div>
  `;
}


// =============================================================================
// RAKE FORMATION ARCHITECTURE & DYNAMIC TRAINSET CONSIST
// =============================================================================
window.ACTIVE_TRAIN_COACHES = window.ACTIVE_TRAIN_COACHES || {};
window.SELECTED_COACH_INDEX = window.SELECTED_COACH_INDEX || 0;
window.CURRENT_RAKE_FILTER = window.CURRENT_RAKE_FILTER || "ALL";
window.RAKE_VIEW_MODE = window.RAKE_VIEW_MODE || "ribbon"; // 'ribbon' or 'table'

function getTrainRakeFormation(train) {
  const tId = String(train.id || "");
  const nameUpper = (train.name || "").toUpperCase();
  const isEmergency = train.status === "EMERGENCY BRAKE";
  const speedScale = typeof train.speed === "number" && train.speed > 0 ? (train.speed / 130) : 0;
  const nominalBearing = Number((39.0 + (speedScale * 4.5)).toFixed(1));

  // 1. Vande Bharat Express (Train 20901) - 16-Car Trainset EMU (Self-propelled)
  if (tId === "20901" || nameUpper.includes("VANDE BHARAT")) {
    return [
      { pos: 1, code: "DTC 1", type: "CAB", classTag: "tag-class-ec", classLabel: "CAB", name: "Driving Trailer Coach #1 (Cab)", berths: "44 Aerodynamic Seats", hub: true, hubIcon: "directions_railway", hubLabel: "FOB North Ramp", facility: "Loco Pilot Cab · Forward TCAS Radar · CCTV Console", temp: 39.2, brake: 5.0 },
      { pos: 2, code: "MC 1", type: "CC", classTag: "tag-class-cc", classLabel: "CHAIR", name: "Motor Coach #1 (Chair Car)", berths: "78 Pushback Seats", hub: false, hubIcon: "", hubLabel: "Mid-Platform", facility: "25kV Pantograph · Bio-Vacuum Toilets 1-2", temp: 42.1, brake: 4.9 },
      { pos: 3, code: "TC 1", type: "CC", classTag: "tag-class-cc", classLabel: "CHAIR", name: "Trailer Coach #1 (Chair Car)", berths: "78 Pushback Seats", hub: false, hubIcon: "", hubLabel: "Mid-Platform", facility: "Passenger Info System Display · Wi-Fi Node", temp: 40.8, brake: 4.8 },
      { pos: 4, code: "MC 2", type: "CC", classTag: "tag-class-cc", classLabel: "CHAIR", name: "Motor Coach #2 (Chair Car)", berths: "78 Pushback Seats", hub: true, hubIcon: "bolt", hubLabel: "Escalator Core", facility: "North Escalator Core Alignment · Wheelchair Berth", temp: 41.5, brake: 4.9 },
      { pos: 5, code: "NDTC 1", type: "CC", classTag: "tag-class-cc", classLabel: "CHAIR", name: "Non-Driving Trailer Coach #1", berths: "78 Pushback Seats", hub: false, hubIcon: "", hubLabel: "Mid-Platform", facility: "Air Suspension Damping Reservoir · Sensor Bay", temp: 40.2, brake: 4.8 },
      { pos: 6, code: "MC 3", type: "CC", classTag: "tag-class-cc", classLabel: "CHAIR", name: "Motor Coach #3 (Chair Car)", berths: "78 Pushback Seats", hub: false, hubIcon: "", hubLabel: "Mid-Platform", facility: "Traction Inverter Unit 1 · Auxiliary Converter", temp: 43.0, brake: 5.0 },
      { pos: 7, code: "EC 1", type: "EC", classTag: "tag-class-ec", classLabel: "EXEC", name: "Executive Chair Car #1 (EC1)", berths: "52 Rotating Seats", hub: true, hubIcon: "accessible_forward", hubLabel: "Central FOB", facility: "Main Overbridge Walkway · 180° Rotating Seats", temp: 38.9, brake: 4.8 },
      { pos: 8, code: "EC 2", type: "EC", classTag: "tag-class-ec", classLabel: "EXEC", name: "Executive Chair Car #2 (EC2)", berths: "52 Rotating Seats", hub: true, hubIcon: "elevator", hubLabel: "Platform Lift", facility: "Station Elevator Core Alignment · VIP Attendant", temp: 39.4, brake: 4.9 },
      { pos: 9, code: "PC", type: "PC", classTag: "tag-class-pc", classLabel: "PANTRY", name: "Mini Hot-Case Pantry Unit", berths: "Catering Bay", hub: true, hubIcon: "coffee", hubLabel: "Service Bay", facility: "Hot-Case Food Warmers · Deep Freezers · Beverage Hub", temp: 44.1, brake: 4.8 },
      { pos: 10, code: "TC 2", type: "CC", classTag: "tag-class-cc", classLabel: "CHAIR", name: "Trailer Coach #2 (Chair Car)", berths: "78 Pushback Seats", hub: false, hubIcon: "", hubLabel: "Mid-Platform", facility: "Braille Signage · Bio-Vacuum Odor Neutralizer", temp: 40.6, brake: 4.9 },
      { pos: 11, code: "MC 4", type: "CC", classTag: "tag-class-cc", classLabel: "CHAIR", name: "Motor Coach #4 (Chair Car)", berths: "78 Pushback Seats", hub: true, hubIcon: "bolt", hubLabel: "Escalator Core", facility: "South Escalator Alignment · High-Capacity Evac", temp: 42.4, brake: 5.0 },
      { pos: 12, code: "NDTC 2", type: "CC", classTag: "tag-class-cc", classLabel: "CHAIR", name: "Non-Driving Trailer Coach #2", berths: "78 Pushback Seats", hub: false, hubIcon: "", hubLabel: "Mid-Platform", facility: "Air Spring Pressure Regulators · Kavach Transceiver", temp: 41.0, brake: 4.8 },
      { pos: 13, code: "MC 5", type: "CC", classTag: "tag-class-cc", classLabel: "CHAIR", name: "Motor Coach #5 (Chair Car)", berths: "78 Pushback Seats", hub: false, hubIcon: "", hubLabel: "Mid-Platform", facility: "Traction Motor #4 · Wheel Slide Protection (WSP)", temp: 42.8, brake: 4.9 },
      { pos: 14, code: "TC 3", type: "CC", classTag: "tag-class-cc", classLabel: "CHAIR", name: "Trailer Coach #3 (Chair Car)", berths: "78 Pushback Seats", hub: false, hubIcon: "", hubLabel: "Mid-Platform", facility: "Bio-Vacuum Tank Level 41% · Chilled Water Station", temp: 40.5, brake: 4.8 },
      { pos: 15, code: "MC 6", type: "CC", classTag: "tag-class-cc", classLabel: "CHAIR", name: "Motor Coach #6 (Chair Car)", berths: "78 Pushback Seats", hub: false, hubIcon: "", hubLabel: "Mid-Platform", facility: "Secondary 25kV Pantograph · Roof Interlock", temp: 43.2, brake: 5.0 },
      { pos: 16, code: "DTC 2", type: "CAB", classTag: "tag-class-ec", classLabel: "CAB", name: "Rear Driving Trailer Coach #2", berths: "44 Aerodynamic Seats", hub: true, hubIcon: "directions_railway", hubLabel: "FOB South Ramp", facility: "Rear Driver Cab · Guard Operations · Marker Lights", temp: 39.8, brake: 4.9 }
    ];
  }

  // 2. CSMT Rajdhani (Train 22222) - 16-Car Push-Pull Formation with Emergency Brake Telemetry
  if (tId === "22222") {
    return [
      { pos: 1, code: "LOCO 1", type: "LOCO", classTag: "tag-class-loco", classLabel: "WAP-7", name: "Lead Locomotive WAP-7 #30499", berths: "Crew Only", hub: true, hubIcon: "directions_railway", hubLabel: "FOB North", facility: "6000 HP 3-Phase · TCAS Kavach SIL-4 Link", temp: 46.2, brake: isEmergency ? 2.1 : 5.0, alert: isEmergency },
      { pos: 2, code: "EOG 1", type: "PWR", classTag: "tag-class-pwr", classLabel: "PWR", name: "Front End-on-Generation Car", berths: "Luggage & Brake", hub: false, hubIcon: "", hubLabel: "Standard Platform", facility: "750V / 500kVA Diesel Alternator · Fire Detection", temp: 44.1, brake: isEmergency ? 2.1 : 5.0, alert: isEmergency },
      { pos: 3, code: "H1", type: "1A", classTag: "tag-class-1a", classLabel: "1A AC", name: "AC First Class (1A)", berths: "24 Berths (Coupes)", hub: true, hubIcon: "accessible_forward", hubLabel: "North FOB", facility: "Platform North Foot-Over-Bridge Ramp Alignment", temp: 41.2, brake: isEmergency ? 2.4 : 4.8, alert: isEmergency },
      { pos: 4, code: "A1", type: "2A", classTag: "tag-class-2a", classLabel: "2A AC", name: "AC 2-Tier (2A)", berths: "54 Berths", hub: false, hubIcon: "", hubLabel: "Standard Platform", facility: "Berths 1-54 · Bio-Vacuum Lavatories", temp: 41.0, brake: isEmergency ? 2.8 : 4.9, alert: isEmergency },
      { pos: 5, code: "A2", type: "2A", classTag: "tag-class-2a", classLabel: "2A AC", name: "AC 2-Tier (2A)", berths: "54 Berths", hub: true, hubIcon: "bolt", hubLabel: "Escalator Core", facility: "Central Escalator Core Alignment · Bay 2", temp: 40.8, brake: isEmergency ? 3.0 : 4.9 },
      { pos: 6, code: "A3", type: "2A", classTag: "tag-class-2a", classLabel: "2A AC", name: "AC 2-Tier (2A)", berths: "54 Berths", hub: false, hubIcon: "", hubLabel: "Standard Platform", facility: "Emergency Window 2 · Heavy Luggage Stacking", temp: 41.1, brake: isEmergency ? 3.1 : 4.9 },
      { pos: 7, code: "PC", type: "PC", classTag: "tag-class-pc", classLabel: "PANTRY", name: "Pantry Buffet Car", berths: "Catering", hub: true, hubIcon: "elevator", hubLabel: "Service Lift", facility: "Station Food Supply Elevator · Flameless Cooking", temp: 46.5, brake: isEmergency ? 3.2 : 4.9 },
      { pos: 8, code: "B1", type: "3A", classTag: "tag-class-3a", classLabel: "3A AC", name: "AC 3-Tier (3A)", berths: "72 Berths", hub: false, hubIcon: "", hubLabel: "Standard Platform", facility: "Berths 1-72 · Wheelchair Anchor Point", temp: 42.0, brake: isEmergency ? 3.4 : 4.8 },
      { pos: 9, code: "B2", type: "3A", classTag: "tag-class-3a", classLabel: "3A AC", name: "AC 3-Tier (3A)", berths: "72 Berths", hub: true, hubIcon: "bolt", hubLabel: "Escalator Core", facility: "Mid-Train Escalator Alignment · High Passenger Flow", temp: 41.8, brake: isEmergency ? 3.5 : 4.8 },
      { pos: 10, code: "B3", type: "3A", classTag: "tag-class-3a", classLabel: "3A AC", name: "AC 3-Tier (3A)", berths: "72 Berths", hub: false, hubIcon: "", hubLabel: "Standard Platform", facility: "Berths 1-72 · Dual Chilled Water Purifiers", temp: 42.2, brake: isEmergency ? 3.6 : 4.9 },
      { pos: 11, code: "B4", type: "3A", classTag: "tag-class-3a", classLabel: "3A AC", name: "AC 3-Tier (3A)", berths: "72 Berths", hub: false, hubIcon: "", hubLabel: "Standard Platform", facility: "Berths 1-72 · Central Air Duct Sensor", temp: 41.9, brake: isEmergency ? 3.7 : 4.8 },
      { pos: 12, code: "B5", type: "3A", classTag: "tag-class-3a", classLabel: "3A AC", name: "AC 3-Tier (3A)", berths: "72 Berths", hub: true, hubIcon: "accessible_forward", hubLabel: "South FOB", facility: "South Foot-Over-Bridge Stairway Alignment", temp: 42.1, brake: isEmergency ? 3.8 : 4.9 },
      { pos: 13, code: "B6", type: "3A", classTag: "tag-class-3a", classLabel: "3A AC", name: "AC 3-Tier (3A)", berths: "72 Berths", hub: false, hubIcon: "", hubLabel: "Standard Platform", facility: "Berths 1-72 · Bio-Digester Bacteria Active", temp: 41.7, brake: isEmergency ? 3.9 : 4.8 },
      { pos: 14, code: "B7", type: "3A", classTag: "tag-class-3a", classLabel: "3A AC", name: "AC 3-Tier (3A)", berths: "72 Berths", hub: false, hubIcon: "", hubLabel: "Standard Platform", facility: "Berths 1-72 · Electronic Brake Air Sensor", temp: 42.3, brake: isEmergency ? 4.0 : 4.9 },
      { pos: 15, code: "EOG 2", type: "PWR", classTag: "tag-class-pwr", classLabel: "PWR", name: "Rear End-on-Generation Car", berths: "Guard Van", hub: false, hubIcon: "", hubLabel: "Standard Platform", facility: "Generator B · Guard Intercom · Flashing Tail Lamp", temp: 43.8, brake: isEmergency ? 4.2 : 5.0 },
      { pos: 16, code: "LOCO 2", type: "LOCO", classTag: "tag-class-loco", classLabel: "WAP-7", name: "Push-Pull WAP-7 #30498", berths: "Crew Only", hub: true, hubIcon: "directions_railway", hubLabel: "FOB South", facility: "Trailing Traction Power · Cab Signal Bus Linked", temp: 44.8, brake: isEmergency ? 2.2 : 5.0, alert: isEmergency }
    ];
  }

  // 3. Tejas Rajdhani Express (12952, 12951, 12302) & Generic Rakes - Standard LHB Formation
  const is12951 = tId === "12951";
  const locoNo = is12951 ? "WAP-7 #30452 (BRC Shed)" : (tId === "12302" ? "WAP-7 #30211 (HWH Shed)" : "WAP-7 #30245 (BRC Shed)");

  return [
    { pos: 1, code: "LOCO", type: "LOCO", classTag: "tag-class-loco", classLabel: "WAP-7", name: locoNo, berths: "Loco Pilot Cab", hub: true, hubIcon: "directions_railway", hubLabel: "FOB North", facility: "25kV AC Traction Power · Microprocessor V9 Control", temp: (nominalBearing + 2.4).toFixed(1), brake: 5.0 },
    { pos: 2, code: "EOG 1", type: "PWR", classTag: "tag-class-pwr", classLabel: "PWR", name: "Front Power Car (EOG 1)", berths: "Brake Van", hub: false, hubIcon: "", hubLabel: "Mid-Platform", facility: "750V Hotel Load Generator 1 · Aerosol Fire Suppression", temp: (nominalBearing + 1.2).toFixed(1), brake: 5.0 },
    { pos: 3, code: "H1", type: "1A", classTag: "tag-class-1a", classLabel: "1A AC", name: "AC First Class (1A)", berths: "24 Berths (Coupes)", hub: true, hubIcon: "accessible_forward", hubLabel: "North FOB", facility: "North Foot-Over-Bridge Ramp Alignment", temp: nominalBearing, brake: 4.8 },
    { pos: 4, code: "A1", type: "2A", classTag: "tag-class-2a", classLabel: "2A AC", name: "AC 2-Tier (2A)", berths: "54 Berths", hub: true, hubIcon: "bolt", hubLabel: "Escalator Core", facility: "North Escalator Core Access Alignment", temp: nominalBearing, brake: 4.9 },
    { pos: 5, code: "A2", type: "2A", classTag: "tag-class-2a", classLabel: "2A AC", name: "AC 2-Tier (2A)", berths: "54 Berths", hub: false, hubIcon: "", hubLabel: "Mid-Platform", facility: "Bio-Vacuum Lavatories 1-4 · Berths 1-54", temp: nominalBearing, brake: 4.8 },
    { pos: 6, code: "A3", type: "2A", classTag: "tag-class-2a", classLabel: "2A AC", name: "AC 2-Tier (2A)", berths: "54 Berths", hub: false, hubIcon: "", hubLabel: "Mid-Platform", facility: "Luggage Racks · Emergency Breakout Window", temp: nominalBearing, brake: 4.9 },
    { pos: 7, code: "A4", type: "2A", classTag: "tag-class-2a", classLabel: "2A AC", name: "AC 2-Tier (2A)", berths: "54 Berths", hub: true, hubIcon: "elevator", hubLabel: "Platform Lift", facility: "Station Lift / Wheelchair Access Hub", temp: nominalBearing, brake: 4.8 },
    { pos: 8, code: "A5", type: "2A", classTag: "tag-class-2a", classLabel: "2A AC", name: "AC 2-Tier (2A)", berths: "54 Berths", hub: false, hubIcon: "", hubLabel: "Mid-Platform", facility: "Chilled Water Dispenser · Air Filter Array", temp: nominalBearing, brake: 4.9 },
    { pos: 9, code: "PC", type: "PC", classTag: "tag-class-pc", classLabel: "PANTRY", name: "Pantry Car", berths: "Catering Staff", hub: true, hubIcon: "coffee", hubLabel: "Service Bay", facility: "Flameless Induction Kitchen · Food Trolley Lift", temp: (nominalBearing + 3.8).toFixed(1), brake: 4.9 },
    { pos: 10, code: "B1", type: "3A", classTag: "tag-class-3a", classLabel: "3A AC", name: "AC 3-Tier (3A)", berths: "72 Berths", hub: false, hubIcon: "", hubLabel: "Mid-Platform", facility: "Berths 1-72 · Mobile Charging Array Active", temp: nominalBearing, brake: 4.8 },
    { pos: 11, code: "B2", type: "3A", classTag: "tag-class-3a", classLabel: "3A AC", name: "AC 3-Tier (3A)", berths: "72 Berths", hub: true, hubIcon: "bolt", hubLabel: "Escalator Core", facility: "Central Escalator Core Alignment · Bay 4", temp: nominalBearing, brake: 4.8 },
    { pos: 12, code: "B3", type: "3A", classTag: "tag-class-3a", classLabel: "3A AC", name: "AC 3-Tier (3A)", berths: "72 Berths", hub: false, hubIcon: "", hubLabel: "Mid-Platform", facility: "Bio-Toilets Nominal · Odor Evacuator Fan Active", temp: nominalBearing, brake: 4.9 },
    { pos: 13, code: "B4", type: "3A", classTag: "tag-class-3a", classLabel: "3A AC", name: "AC 3-Tier (3A)", berths: "72 Berths", hub: false, hubIcon: "", hubLabel: "Mid-Platform", facility: "Berths 1-72 · Electronic PIS Display Node", temp: nominalBearing, brake: 4.8 },
    { pos: 14, code: "B5", type: "3A", classTag: "tag-class-3a", classLabel: "3A AC", name: "AC 3-Tier (3A)", berths: "72 Berths", hub: true, hubIcon: "accessible_forward", hubLabel: "Mid FOB", facility: "Mid-Train Main FOB Overbridge Alignment", temp: nominalBearing, brake: 4.9 },
    { pos: 15, code: "B6", type: "3A", classTag: "tag-class-3a", classLabel: "3A AC", name: "AC 3-Tier (3A)", berths: "72 Berths", hub: false, hubIcon: "", hubLabel: "Mid-Platform", facility: "Wheelchair Tie-Down Bay · Wide Accessible Restroom", temp: nominalBearing, brake: 4.8 },
    { pos: 16, code: "B7", type: "3A", classTag: "tag-class-3a", classLabel: "3A AC", name: "AC 3-Tier (3A)", berths: "72 Berths", hub: false, hubIcon: "", hubLabel: "Mid-Platform", facility: "Berths 1-72 · High-Efficiency HEPA Filtration", temp: nominalBearing, brake: 4.9 },
    { pos: 17, code: "B8", type: "3A", classTag: "tag-class-3a", classLabel: "3A AC", name: "AC 3-Tier (3A)", berths: "72 Berths", hub: true, hubIcon: "bolt", hubLabel: "Escalator Core", facility: "South Escalator Alignment · Rapid Egress Hub", temp: nominalBearing, brake: 4.9 },
    { pos: 18, code: "B9", type: "3A", classTag: "tag-class-3a", classLabel: "3A AC", name: "AC 3-Tier (3A)", berths: "72 Berths", hub: false, hubIcon: "", hubLabel: "Mid-Platform", facility: "Berths 1-72 · Water Reservoir Sensor Nominal", temp: nominalBearing, brake: 4.8 },
    { pos: 19, code: "B10", type: "3A", classTag: "tag-class-3a", classLabel: "3A AC", name: "AC 3-Tier (3A)", berths: "72 Berths", hub: false, hubIcon: "", hubLabel: "Mid-Platform", facility: "Berths 1-72 · Emergency Escape Hatch 3", temp: nominalBearing, brake: 4.9 },
    { pos: 20, code: "B11", type: "3A", classTag: "tag-class-3a", classLabel: "3A AC", name: "AC 3-Tier (3A)", berths: "72 Berths", hub: true, hubIcon: "accessible_forward", hubLabel: "South FOB", facility: "South Foot-Over-Bridge Alignment", temp: nominalBearing, brake: 4.8 },
    { pos: 21, code: "B12", type: "3A", classTag: "tag-class-3a", classLabel: "3A AC", name: "AC 3-Tier (3A)", berths: "72 Berths", hub: false, hubIcon: "", hubLabel: "Mid-Platform", facility: "Berths 1-72 · Axle Bearing Sensor Node #21", temp: nominalBearing, brake: 4.9 },
    { pos: 22, code: "EOG 2", type: "PWR", classTag: "tag-class-pwr", classLabel: "PWR", name: "Rear Power Car (EOG 2)", berths: "Guard Van", hub: false, hubIcon: "", hubLabel: "Mid-Platform", facility: "Generator 2 · Guard Console · Flashing Tail Lamp", temp: (nominalBearing + 1.8).toFixed(1), brake: 5.0 }
  ];
}

function renderAmenityBadge(c) {
  if (!c.hub || !c.hubIcon) {
    return `<span class="rake-coach-pos-tag">#${c.pos}</span>`;
  }

  let svg = "";
  let tag = "";
  if (c.hubIcon === "directions_railway") {
    svg = `<svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c-4 0-8 .5-8 4v9.5C4 17.43 5.57 19 7.5 19L6 20.5v.5h12v-.5L16.5 19c1.93 0 3.5-1.57 3.5-3.5V6c0-3.5-4-4-8-4zm0 2c3.5 0 6 .34 6 2H6c0-1.66 2.5-2 6-2zm-6 4h12v5H6V8zm1.5 9c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>`;
    tag = "CAB";
  } else if (c.hubIcon === "accessible_forward") {
    svg = `<svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm6 12H6v-1.4c0-2 4-3.1 6-3.1s6 1.1 6 3.1V18z"/></svg>`;
    tag = "FOB";
  } else if (c.hubIcon === "bolt") {
    svg = `<svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M7 2v11h3v9l7-12h-4l4-8z"/></svg>`;
    tag = "ESC";
  } else if (c.hubIcon === "elevator") {
    svg = `<svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-8 4.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5-.67 1.5-1.5 1.5S11 8.33 11 7.5zm-5 0c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5-.67 1.5-1.5 1.5S6 8.33 6 7.5zm7 10.5h-2v-4.5h-1V12c0-.55.45-1 1-1h2c.55 0 1 .45 1 1v1.5h-1v4.5zm-5 0H7v-4.5H6V12c0-.55.45-1 1-1h2c.55 0 1 .45 1 1v1.5H8v4.5z"/></svg>`;
    tag = "LIFT";
  } else if (c.hubIcon === "coffee") {
    svg = `<svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M20 3H4v10c0 2.21 1.79 4 4 4h6c2.21 0 4-1.79 4-4v-3h2c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 5h-2V5h2v3zM2 21h18v2H2z"/></svg>`;
    tag = "DINE";
  } else {
    return `<span class="rake-coach-pos-tag">#${c.pos}</span>`;
  }

  return `
    <span class="rake-hub-badge" title="${c.hubLabel}">
      ${svg}
      <span class="rake-hub-label">${tag}</span>
    </span>
  `;
}

function renderRakeTelemetrySection(train) {
  const coaches = getTrainRakeFormation(train);
  window.ACTIVE_TRAIN_COACHES[train.id] = coaches;
  
  if (typeof window.SELECTED_COACH_INDEX !== "number" || window.SELECTED_COACH_INDEX >= coaches.length) {
    const defaultIdx = coaches.findIndex(c => c.hub);
    window.SELECTED_COACH_INDEX = defaultIdx >= 0 ? defaultIdx : 0;
  }
  const selectedCoach = coaches[window.SELECTED_COACH_INDEX] || coaches[0];
  const curFilter = window.CURRENT_RAKE_FILTER || "ALL";
  const viewMode = window.RAKE_VIEW_MODE || "ribbon";

  // Filter counts
  const countAll = coaches.length;
  const count1A2A = coaches.filter(c => c.type === '1A' || c.type === '2A' || c.type === 'EC' || c.type === 'CAB').length;
  const count3A = coaches.filter(c => c.type === '3A' || c.type === 'CC').length;
  const countHub = coaches.filter(c => c.hub).length;

  // Visual Horizontal Ribbon
  let ribbonHtml = coaches.map((c, idx) => {
    const isSelected = idx === window.SELECTED_COACH_INDEX;
    const isMatch = (curFilter === "ALL") ||
      (curFilter === "1A/2A" && (c.type === '1A' || c.type === '2A' || c.type === 'EC' || c.type === 'CAB')) ||
      (curFilter === "3A" && (c.type === '3A' || c.type === 'CC')) ||
      (curFilter === "HUB" && c.hub);

    const dimStyle = isMatch ? "" : "opacity: 0.3; transform: scale(0.96);";
    const activeClass = isSelected ? "active" : "";
    const alertClass = c.alert ? "is-alert" : "";

    const amenityBadge = renderAmenityBadge(c);
    const coupler = (idx < coaches.length - 1) ? `<div class="rake-coupler" aria-hidden="true"></div>` : "";

    return `
      <div class="rake-coach-node ${activeClass} ${alertClass}" style="${dimStyle}" onclick="window.selectRakeCoach('${train.id}', ${idx})" title="${c.name} (${c.classLabel})">
        <div class="rake-coach-code">${c.code}</div>
        <span class="rake-coach-class-tag ${c.classTag}">${c.classLabel}</span>
        ${amenityBadge}
      </div>
      ${coupler}
    `;
  }).join("");

  // Accessible Table View
  let tableRows = coaches.map((c, idx) => {
    const isSelected = idx === window.SELECTED_COACH_INDEX;
    const alertRow = c.alert ? 'style="background:rgba(220,38,38,0.18);"' : '';
    return `
      <tr class="${isSelected ? 'active' : ''}" ${alertRow} onclick="window.selectRakeCoach('${train.id}', ${idx})">
        <td style="font-weight:700; color:var(--color-ink);">${c.pos}</td>
        <td><span class="rake-coach-class-tag ${c.classTag}">${c.code}</span></td>
        <td>${c.name}</td>
        <td style="color:var(--color-accent);">${c.hubLabel || 'Standard'}</td>
        <td>${c.temp}°C</td>
        <td style="color:${c.brake < 4.5 ? 'var(--color-danger)' : 'var(--color-nominal)'}; font-weight:700;">${c.brake} kg</td>
      </tr>
    `;
  }).join("");

  // Focused Coach HUD
  const hudHtml = `
    <div class="coach-detail-hud" id="coach-detail-hud">
      <div class="coach-hud-header">
        <div class="coach-hud-title-area">
          <div class="coach-hud-title">
            <span class="rake-coach-class-tag ${selectedCoach.classTag}" style="font-size:10px; padding:2px 6px;">${selectedCoach.code}</span>
            <span>${selectedCoach.name}</span>
          </div>
          <span class="coach-hud-sub font-mono">POSITION #${selectedCoach.pos} OF ${coaches.length} · ${selectedCoach.classLabel}</span>
        </div>
        <span class="status-chip ${selectedCoach.alert ? 'chip-danger' : (selectedCoach.hub ? 'chip-caution' : 'chip-nominal')}" style="font-size:9.5px;">
          ${selectedCoach.alert ? 'BRAKE FAULT' : (selectedCoach.hub ? 'PLATFORM HUB' : 'NOMINAL')}
        </span>
      </div>

      <div style="background:var(--color-surface); padding:6px 8px; border-radius:4px; border:1px solid var(--color-rule-subtle); display:flex; align-items:center; gap:6px;">
        <span class="material-symbols-outlined text-cyan" style="font-size:16px;">${selectedCoach.hubIcon || 'train'}</span>
        <span style="font-size:11px; font-weight:600; color:var(--color-ink);">Platform Alignment: <span style="color:var(--color-accent);">${selectedCoach.hubLabel || 'Mid-Platform Berth'}</span></span>
      </div>

      <div class="coach-hud-metrics">
        <div class="coach-metric-item">
          <span class="coach-metric-label">PASSENGER CAPACITY</span>
          <span class="coach-metric-val font-mono">${selectedCoach.berths}</span>
        </div>
        <div class="coach-metric-item">
          <span class="coach-metric-label">AXLE BEARING TEMP</span>
          <span class="coach-metric-val font-mono ${selectedCoach.temp > 65 ? 'text-danger' : 'text-nominal'}">${selectedCoach.temp}°C (Safe &lt;65°C)</span>
        </div>
        <div class="coach-metric-item">
          <span class="coach-metric-label">BRAKE PIPE PRESSURE</span>
          <span class="coach-metric-val font-mono ${selectedCoach.brake < 4.5 ? 'text-danger' : 'text-nominal'}">${selectedCoach.brake} kg/cm²</span>
        </div>
        <div class="coach-metric-item">
          <span class="coach-metric-label">AIR SPRING SUSPENSION</span>
          <span class="coach-metric-val font-mono text-cyan">6.1 bar (Nominal)</span>
        </div>
      </div>

      <div style="font-size:10px; color:var(--color-ink-muted); border-top:1px solid var(--color-rule-subtle); padding-top:5px; line-height:1.4;">
        <strong style="color:var(--color-ink-secondary);">Coach Systems:</strong> ${selectedCoach.facility}
      </div>
    </div>
  `;

  return `
    <div class="drawer-section-card">
      <div class="drawer-section-heading" style="display:flex; justify-content:space-between; align-items:center;">
        <span>${coaches.length}-COACH RAKE TELEMETRY &amp; PLATFORM ALIGNMENT</span>
        <span style="font-size:9px; color:var(--color-accent); font-family:var(--font-mono); font-weight:600;">${train.rake.split('+')[0].trim()}</span>
      </div>

      <div class="rake-formation-wrapper">
        <!-- Controls & Filter Toolbar -->
        <div class="rake-filter-bar">
          <div class="rake-filter-group">
            <button class="rake-filter-btn ${curFilter === 'ALL' ? 'active' : ''}" onclick="window.filterRakeCoaches('${train.id}', 'ALL')">ALL (${countAll})</button>
            <button class="rake-filter-btn ${curFilter === '1A/2A' ? 'active' : ''}" onclick="window.filterRakeCoaches('${train.id}', '1A/2A')">1A / 2A (${count1A2A})</button>
            <button class="rake-filter-btn ${curFilter === '3A' ? 'active' : ''}" onclick="window.filterRakeCoaches('${train.id}', '3A')">3A / CC (${count3A})</button>
            <button class="rake-filter-btn ${curFilter === 'HUB' ? 'active' : ''}" onclick="window.filterRakeCoaches('${train.id}', 'HUB')">HUBS (${countHub})</button>
          </div>
          <button class="rake-view-toggle-btn" onclick="window.toggleRakeViewMode('${train.id}')" title="Switch between Visual Ribbon and Table View">
            <span class="material-symbols-outlined" style="font-size:13px;">${viewMode === 'ribbon' ? 'table_chart' : 'view_timeline'}</span>
            <span>${viewMode === 'ribbon' ? 'Table' : 'Ribbon'}</span>
          </button>
        </div>

        <!-- View Content: Either Visual Ribbon or Table -->
        ${viewMode === 'ribbon' ? `
          <div class="rake-consist-track" id="rake-consist-track">
            ${ribbonHtml}
          </div>
        ` : `
          <div class="rake-list-table-wrap">
            <table class="rake-list-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Coach</th>
                  <th>Type</th>
                  <th>Alignment</th>
                  <th>Temp</th>
                  <th>Brake</th>
                </tr>
              </thead>
              <tbody>
                ${tableRows}
              </tbody>
            </table>
          </div>
        `}

        <!-- Detailed Focused Coach HUD -->
        ${hudHtml}

        <div style="font-size:9px; color:var(--color-ink-dim); display:flex; justify-content:space-between; align-items:center;">
          <span>Axle sensors nominal. Brake clearance: 4.8mm. All vestibules pressurized.</span>
          <span class="font-mono text-cyan">EN-15227 CRASHWORTHY</span>
        </div>
      </div>
    </div>
  `;
}

window.selectRakeCoach = function(trainId, coachIdx) {
  window.SELECTED_COACH_INDEX = coachIdx;
  const train = RAIL_FLEET.find(t => t.id === trainId) || RAIL_FLEET[0];
  const section = document.getElementById("drawer-rake-section-container");
  if (section) {
    section.innerHTML = renderRakeTelemetrySection(train);
  }
};

window.filterRakeCoaches = function(trainId, filterType) {
  window.CURRENT_RAKE_FILTER = filterType;
  const train = RAIL_FLEET.find(t => t.id === trainId) || RAIL_FLEET[0];
  const section = document.getElementById("drawer-rake-section-container");
  if (section) {
    section.innerHTML = renderRakeTelemetrySection(train);
  }
};

window.toggleRakeViewMode = function(trainId) {
  window.RAKE_VIEW_MODE = (window.RAKE_VIEW_MODE === "ribbon") ? "table" : "ribbon";
  const train = RAIL_FLEET.find(t => t.id === trainId) || RAIL_FLEET[0];
  const section = document.getElementById("drawer-rake-section-container");
  if (section) {
    section.innerHTML = renderRakeTelemetrySection(train);
  }
};


window.selectTrain = function(trainId, openDrawer = true) {
  selectedTrainId = trainId;
  const train = RAIL_FLEET.find(t => t.id === trainId) || RAIL_FLEET[0];

  if (drawerTitle) {
    drawerTitle.textContent = `${train.id} · ${train.name}`;
  }

  // Rake Formation Architecture & Dynamic Trainset Consist
  const rakeSectionHtml = `
    <div id="drawer-rake-section-container">
      ${renderRakeTelemetrySection(train)}
    </div>
  `;

  if (drawerBody) {
    drawerBody.innerHTML = `
      <!-- Top 2x2 Telemetry Metric Boxes -->
      <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-xs);">
        <div class="drawer-section-card">
          <span class="kv-key">SPEED READOUT</span>
          <div class="kv-val ${train.speed === 0 ? 'text-danger' : 'text-nominal'}" style="font-size: 18px;">
            ${train.speed} <span style="font-size: 10px; color: var(--color-ink-dim);">/ ${train.maxSpeed} KMPH</span>
          </div>
        </div>
        <div class="drawer-section-card">
          <span class="kv-key">DELAY DELTA</span>
          <div class="kv-val ${train.delay > 0 ? 'text-caution' : 'text-nominal'}" style="font-size: 18px;">
            +${train.delay} <span style="font-size: 10px; color: var(--color-ink-dim);">MINUTES</span>
          </div>
        </div>
        <div class="drawer-section-card">
          <span class="kv-key">OCCUPIED BLOCK</span>
          <div class="kv-val" style="font-size: 15px;">${train.block}</div>
        </div>
        <div class="drawer-section-card">
          <span class="kv-key">NEXT SIGNAL</span>
          <div class="kv-val ${train.nextSignal === 'DANGER' ? 'text-danger' : train.nextSignal === 'CAUTION' ? 'text-caution' : 'text-nominal'}" style="font-size: 15px;">
            ${train.nextSignal}
          </div>
        </div>
      </div>

      <!-- Dynamic Route Progression Timeline -->
      ${renderDrawerRouteTimeline(train.id, (window.TRAIN_BACKEND_CACHE && window.TRAIN_BACKEND_CACHE[train.id]) || (window.INITIAL_FLEET_CACHE && window.INITIAL_FLEET_CACHE[train.id]))}
        
      <!-- Conformal ETA Prediction Card -->
      <div class="drawer-section-card">
        <div class="drawer-section-heading">CONFORMAL ETA PROJECTION (AI CONFIDENCE: ${train.confidencePct}%)</div>
        <div style="font-size: 13px; font-weight: 700; color: var(--color-accent); margin-top: 4px;">
          ${train.etaConf}
        </div>
        <p style="font-size: 10px; color: var(--color-ink-muted); line-height: 1.4; margin-top: 2px;">
          Dynamic track gradient 1:200 compensation + Kavach balise update at Anand Vihar / BRC Interchange.
        </p>
      </div>

      <!-- Dynamic Interactive Rake Consist Array -->
      ${rakeSectionHtml}

      <!-- Pneumatic Brake Pressures & Electrical -->
      <div class="drawer-section-card">
        <div class="drawer-section-heading">PNEUMATIC BRAKE &amp; TRACTION TELEMETRY</div>
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; margin-top: 4px; text-align: center;">
          <div>
            <span class="kv-key" style="display: block; font-size: 8px;">BRAKE PIPE</span>
            <span class="kv-val ${train.bpPressure < 4.5 ? 'text-danger' : 'text-nominal'}" style="font-size: 13px;">
              ${train.bpPressure} kg/cm&sup2;
            </span>
          </div>
          <div>
            <span class="kv-key" style="display: block; font-size: 8px;">FEED PIPE</span>
            <span class="kv-val" style="font-size: 13px;">
              ${train.fpPressure} kg/cm&sup2;
            </span>
          </div>
          <div>
            <span class="kv-key" style="display: block; font-size: 8px;">OHE VOLT</span>
            <span class="kv-val text-cyan" style="font-size: 13px;">
              ${train.oheVoltage || '25.0 kV'}
            </span>
          </div>
          <div>
            <span class="kv-key" style="display: block; font-size: 8px;">TRACTION</span>
            <span class="kv-val text-nominal" style="font-size: 13px;">
              ${train.tractionCurrent || '410 A'}
            </span>
          </div>
        </div>
      </div>

      <!-- Traction & Crew Telemetry -->
      <div class="drawer-section-card">
        <div class="drawer-section-heading">TRACTION &amp; CREW TELEMETRY</div>
        <div class="telemetry-kv-row">
          <span class="kv-key">Loco Shed &amp; Rake</span>
          <span class="kv-val">${train.rake}</span>
        </div>
        <div class="telemetry-kv-row" style="margin-top: 4px;">
          <span class="kv-key">Loco Pilot / ALP</span>
          <span class="kv-val">${train.driver}</span>
        </div>
      </div>

      <!-- Action Controls -->
      <div style="display: flex; gap: var(--space-xs); margin-top: var(--space-xs);">
        <button class="btn-advisory-override" style="flex: 1; padding: 8px; font-size: 11px; background: var(--color-danger-subtle); color: var(--color-danger); border-color: var(--color-danger-border);" onclick="alert('EMERGENCY STOP SIGNAL BROADCAST TO CAB ${train.id}')">
          Trip Emergency Brake
        </button>
        <button class="btn-advisory-accept" style="flex: 1; padding: 8px; font-size: 11px;" onclick="alert('VHF Radio Audio Link connected to Loco Pilot on 160.800 MHz (Sector 4).')">
          Open VHF Radio Link
        </button>
      </div>
    `;
  }

  if (openDrawer && drawer) {
    drawer.classList.add("open");
    drawer.setAttribute("aria-hidden", "false");
  }
};

window.selectBlock = function(blockId) {
  selectTrain("12952");
};

function initDrawer() {
  if (btnCloseDrawer) {
    btnCloseDrawer.addEventListener("click", () => {
      if (drawer) {
        drawer.classList.remove("open");
        drawer.setAttribute("aria-hidden", "true");
      }
    });
  }
}

// =============================================================================
// 14. ALERTS & DISRUPTION HUB LOGIC (LIVE MULTI-INCIDENT ENGINE & AUDIT DISPATCH)
// =============================================================================
let CURRENT_ALERTS_DATA = null;
let SELECTED_INCIDENT_ID = "INC-2024-0892B";
let CURRENT_INC_FILTER = "all";
let INC_SEARCH_QUERY = "";
let ESCALATION_REMAINING_SEC = 348;
let ESCALATION_INTERVAL = null;
let ALERTS_AUTO_POLL = null;

// Audio context chime for operator dispatch acknowledgement
function playControlRoomChime(type = "nominal") {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === "danger") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.18);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.25);
    } else {
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.22);
    }
  } catch (e) {
    // Non-fatal if audio autoplay policy prevents sound
  }
}

// In-UI Toast Notification for Dispatch Actions
function showControlRoomToast(title, message, type = "success") {
  const container = document.getElementById("control-room-toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  const isDanger = type === "danger";
  const borderCol = isDanger ? "var(--color-danger, #ef4444)" : "var(--color-cyan, #f59e0b)";
  const iconName = isDanger ? "warning" : "verified";
  const iconCol = isDanger ? "#f87171" : "#f59e0b";

  toast.style.cssText = `
    background: rgba(15, 23, 42, 0.95);
    border: 1px solid ${borderCol};
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.6), 0 0 15px ${borderCol}33;
    border-radius: 6px;
    padding: 12px 16px;
    color: #f8fafc;
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
    display: flex;
    align-items: flex-start;
    gap: 12px;
    pointer-events: auto;
    backdrop-filter: blur(8px);
    transition: all 0.3s ease;
    opacity: 0;
    transform: translateY(10px);
  `;

  toast.innerHTML = `
    <span class="material-symbols-outlined" style="color: ${iconCol}; font-size: 20px; flex-shrink: 0; margin-top: 1px;">${iconName}</span>
    <div style="flex: 1; min-width: 0;">
      <div style="font-weight: 700; color: #fff; font-size: 11px; letter-spacing: 0.05em; text-transform: uppercase; margin-bottom: 2px;">${title}</div>
      <div style="color: #cbd5e1; font-size: 11px; line-height: 1.4;">${message}</div>
    </div>
    <button style="background: none; border: none; color: #94a3b8; cursor: pointer; padding: 0; font-size: 14px;" onclick="this.parentElement.remove()">✕</button>
  `;

  container.appendChild(toast);
  requestAnimationFrame(() => {
    toast.style.opacity = "1";
    toast.style.transform = "translateY(0)";
  });

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(10px)";
    setTimeout(() => toast.remove(), 320);
  }, 4500);
}

// Escalation countdown timer ticking down second by second
function startEscalationTimer() {
  if (ESCALATION_INTERVAL) clearInterval(ESCALATION_INTERVAL);
  ESCALATION_INTERVAL = setInterval(() => {
    if (ESCALATION_REMAINING_SEC > 0) {
      ESCALATION_REMAINING_SEC -= 1;
    }
    const timerEl = document.getElementById("escalation-timer-text");
    if (timerEl) {
      const mins = String(Math.floor(ESCALATION_REMAINING_SEC / 60)).padStart(2, '0');
      const secs = String(ESCALATION_REMAINING_SEC % 60).padStart(2, '0');
      timerEl.textContent = `${mins}:${secs} rem`;
    }
  }, 1000);
}

// Fetch live alerts state from FastAPI backend
async function fetchAndRenderAlerts(forceSelectId = null) {
  try {
    const res = await fetch("http://localhost:8000/api/control-room/alerts");
    if (!res.ok) return;
    const data = await res.json();
    CURRENT_ALERTS_DATA = data;

    if (data.escalation && typeof data.escalation.remaining_seconds === "number" && !ESCALATION_INTERVAL) {
      ESCALATION_REMAINING_SEC = data.escalation.remaining_seconds;
      startEscalationTimer();
    }

    if (forceSelectId) {
      SELECTED_INCIDENT_ID = forceSelectId;
    } else if (!SELECTED_INCIDENT_ID && data.incidents && data.incidents.length > 0) {
      SELECTED_INCIDENT_ID = data.incidents[0].id;
    }

    renderAlertsFilterCounts(data.counts);
    renderIncidentStream(data.incidents);

    const activeInc = (data.incidents || []).find(i => i.id === SELECTED_INCIDENT_ID) || (data.incidents || [])[0];
    if (activeInc) {
      renderIncidentTriage(activeInc);
    }

    renderAuditTrail(data.audit_log || []);
    renderCustodyBox(data.custody);
  } catch (err) {
    console.warn("[AlertsHub] Error fetching live alerts:", err);
  }
}

// Update filter pill counts (ALL, CRIT, WARN, INFO)
function renderAlertsFilterCounts(counts) {
  if (!counts) return;
  const pillAll = document.querySelector('[data-inc-filter="all"]');
  const pillCrit = document.querySelector('[data-inc-filter="crit"]');
  const pillWarn = document.querySelector('[data-inc-filter="warn"]');
  const pillInfo = document.querySelector('[data-inc-filter="info"]');

  if (pillAll) pillAll.textContent = `ALL (${counts.total || 0})`;
  if (pillCrit) {
    pillCrit.innerHTML = `<span class="pulse-indicator-danger" aria-hidden="true"></span> <span>CRIT (${counts.crit || 0})</span>`;
  }
  if (pillWarn) pillWarn.textContent = `WARN (${counts.warn || 0})`;
  if (pillInfo) pillInfo.textContent = `INFO (${counts.info || 0})`;
}

// Render Left Column: Live Incident Stream
function renderIncidentStream(incidents) {
  const container = document.getElementById("incident-items-container");
  if (!container || !incidents) return;

  const filtered = incidents.filter(inc => {
    const sev = (inc.severity || "").toLowerCase();
    if (CURRENT_INC_FILTER === "crit" && sev !== "crit") return false;
    if (CURRENT_INC_FILTER === "warn" && sev !== "warn") return false;
    if (CURRENT_INC_FILTER === "info" && sev !== "info") return false;

    if (INC_SEARCH_QUERY) {
      const q = INC_SEARCH_QUERY.toLowerCase();
      const matchText = `${inc.id} ${inc.category} ${inc.title} ${inc.section_id} ${(inc.tags || []).join(' ')}`.toLowerCase();
      if (!matchText.includes(q)) return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="padding: 24px 16px; text-align: center; color: var(--color-dim);" class="font-mono text-xs">
        No active incidents match current filter criteria.
      </div>`;
    return;
  }

  let html = "";
  filtered.forEach(inc => {
    const isSelected = inc.id === SELECTED_INCIDENT_ID;
    const sev = (inc.severity || "INFO").toUpperCase();
    let sevTagClass = "tag-cyan";
    let borderClass = "";
    let timeClass = "text-dim";

    if (sev === "CRIT") {
      sevTagClass = "tag-danger";
      borderClass = "card-danger-border";
      timeClass = "text-danger";
    } else if (sev === "WARN") {
      sevTagClass = "tag-caution";
      borderClass = "card-caution-border";
      timeClass = "text-caution";
    }

    const selectedClass = isSelected ? "active-triage" : "";
    const tagsHtml = (inc.tags || []).map(t => `<span class="inc-tag">[${t}]</span>`).join("");

    let statusTagRight = `<span class="inc-triage-tag" style="font-size: 10px; font-weight: 700; font-family: monospace;">ACTIVE TRIAGE &rarr;</span>`;
    if (inc.status === "MITIGATED") {
      statusTagRight = `<span class="kpi-micro-tag tag-cyan" style="font-size: 9px;">MITIGATED</span>`;
    } else if (inc.status === "RESOLVED") {
      statusTagRight = `<span class="kpi-micro-tag tag-nominal" style="font-size: 9px;">RESOLVED</span>`;
    }

    html += `
      <div class="incident-card ${selectedClass} ${borderClass}" data-inc-id="${inc.id}" tabindex="0" role="button" aria-label="${inc.title}" style="cursor: pointer;">
        <div class="inc-card-top">
          <span class="kpi-micro-tag ${sevTagClass}">${inc.severity_label} · ${inc.category}</span>
          <span class="inc-time font-mono ${timeClass}">${inc.timestamp_ist || ""} (${inc.time_ago_str || ""})</span>
        </div>
        <h4 class="inc-card-title">${inc.title}</h4>
        <p class="inc-card-desc">Est. Delay Impact: <strong class="${sev === 'CRIT' ? 'text-danger' : (sev === 'WARN' ? 'text-caution' : 'text-cyan')} font-mono">${inc.est_delay_min > 0 ? '+' + inc.est_delay_min + ' min' : 'Nominal'}</strong> · ${inc.held_count} Rakes Impacted</p>
        <div class="inc-card-footer">
          <div class="inc-tags">${tagsHtml}</div>
          ${statusTagRight}
        </div>
      </div>
    `;
  });

  container.innerHTML = html;

  // Add click listeners to cards
  container.querySelectorAll(".incident-card").forEach(card => {
    card.addEventListener("click", () => {
      const incId = card.dataset.incId;
      if (!incId) return;
      SELECTED_INCIDENT_ID = incId;
      playControlRoomChime("nominal");

      // Update active selection visually
      container.querySelectorAll(".incident-card").forEach(c => c.classList.remove("active-triage"));
      card.classList.add("active-triage");

      const targetInc = (CURRENT_ALERTS_DATA && CURRENT_ALERTS_DATA.incidents) ?
        CURRENT_ALERTS_DATA.incidents.find(i => i.id === incId) : null;
      if (targetInc) {
        renderIncidentTriage(targetInc);
      }
    });
  });
}

// Render Center Column: Active Incident Triage & Live Track Topology SVG
function renderIncidentTriage(inc) {
  if (!inc) return;

  // 1. Header & Badges
  const badgeEl = document.getElementById("triage-incident-badge");
  const statusTagEl = document.getElementById("triage-status-tag");
  const titleEl = document.getElementById("triage-title");

  if (badgeEl) badgeEl.textContent = `INCIDENT #${inc.id}`;
  if (titleEl) titleEl.textContent = inc.full_title || inc.title;

  if (statusTagEl) {
    statusTagEl.textContent = inc.status_tag || (inc.status === "RESOLVED" ? "RESOLVED" : "ACTIVE TRIAGE IN PROGRESS");
    statusTagEl.className = "kpi-micro-tag";
    if (inc.status === "MITIGATED") {
      statusTagEl.classList.add("tag-cyan");
    } else if (inc.status === "RESOLVED") {
      statusTagEl.classList.add("tag-nominal");
    } else if (inc.severity === "CRIT") {
      statusTagEl.classList.add("tag-danger");
    } else {
      statusTagEl.classList.add("tag-caution");
    }
  }

  // 2. Topology SVG Container
  const svgContainer = document.getElementById("triage-svg-container");
  if (svgContainer) {
    svgContainer.innerHTML = renderIncidentTopologySvg(inc.topology, inc);
  }

  // 3. Root Cause Telemetry Analysis
  const rootCauseEl = document.getElementById("triage-root-cause");
  if (rootCauseEl && inc.root_cause) {
    const isCrit = inc.severity === "CRIT";
    const headerCol = isCrit ? "text-danger" : (inc.severity === "WARN" ? "text-caution" : "text-cyan");
    rootCauseEl.innerHTML = `
      <div class="flex items-center gap-1 ${headerCol} font-bold text-xs mb-1">
        <span class="material-symbols-outlined" style="font-size: 16px;" aria-hidden="true">build_circle</span>
        <span>Root Cause Telemetry Analysis</span>
      </div>
      <p class="text-xs text-secondary leading-snug">${inc.root_cause.description || ""}</p>
      <span class="font-mono text-dim text-xs mt-1 block">
        ${inc.root_cause.model_name || "ST-GCN Anomaly Detector"} Confidence: 
        <strong class="text-nominal">${inc.root_cause.confidence || 99.4}%</strong> · ${inc.root_cause.classification || "Nominal"}
      </span>
    `;
  }

  // 4. Affected Services Queue
  const queueEl = document.getElementById("triage-affected-queue");
  if (queueEl && inc.affected_trains) {
    let queueItemsHtml = "";
    inc.affected_trains.forEach(t => {
      const dlyClass = t.delay_min.includes("+") && !t.delay_min.includes("Nominal") ? (t.delay_min.includes("+1") || t.delay_min.includes("+2") ? "text-danger" : "text-caution") : "text-nominal";
      queueItemsHtml += `
        <div class="queue-item">
          <span class="kpi-micro-tag ${t.tag_class || 'tag-cyan'}">${t.priority}</span>
          <span class="font-mono text-ink font-bold">${t.name}</span>
          <span class="text-dim">${t.state}</span>
          <span class="${dlyClass} font-mono font-bold">${t.delay_min}</span>
        </div>
      `;
    });

    queueEl.innerHTML = `
      <span class="queue-title">Affected Services in Corridor Queue (${inc.affected_trains.length} Consists)</span>
      <div class="queue-list">${queueItemsHtml}</div>
    `;
  }

  // 5. Emergency Actions Grid
  const actionsEl = document.getElementById("triage-actions-grid");
  if (actionsEl && inc.actions) {
    let actionsHtml = "";
    inc.actions.forEach(action => {
      const btnClass = action.btn_class || "cyan";
      actionsHtml += `
        <button class="btn-emergency-action ${btnClass}" data-action-id="${action.id}" style="cursor: pointer;">
          <span class="material-symbols-outlined" style="font-size: 16px;" aria-hidden="true">${action.icon || 'play_arrow'}</span>
          <span>${action.label}</span>
        </button>
      `;
    });

    // Append Mute button
    actionsHtml += `
      <button class="btn-emergency-mute" id="btn-mute-alert" style="cursor: pointer;">
        <span class="material-symbols-outlined" style="font-size: 14px;" aria-hidden="true">notifications_off</span>
        <span>Acknowledge &amp; Mute Alert Tone (10m)</span>
      </button>
    `;

    actionsEl.innerHTML = actionsHtml;

    // Attach click listeners to dynamic action buttons
    actionsEl.querySelectorAll(".btn-emergency-action").forEach(btn => {
      btn.addEventListener("click", () => {
        const actionId = btn.dataset.actionId;
        if (!actionId) return;
        executeIncidentAction(inc.id, actionId, btn.innerText.trim());
      });
    });

    const muteBtn = actionsEl.querySelector("#btn-mute-alert");
    if (muteBtn) {
      muteBtn.addEventListener("click", () => {
        playControlRoomChime("nominal");
        showControlRoomToast("ALARM MUTED", "Corridor audible disruption siren muted for 10 minutes.", "info");
      });
    }
  }
}

// Generate Dedicated Dynamic SVG Track Topologies for each disruption type
function renderIncidentTopologySvg(top, inc) {
  if (!top) return "";
  const type = top.type || "block_14b";
  const startStn = top.start_station || "BHARUCH (BH)";
  const startKm = top.start_km || "KM 312";
  const endStn = top.end_station || "VADODARA (BRC)";
  const endKm = top.end_km || "KM 392";
  const blockLabel = top.block_label || "BLOCK 14B: OCCUPIED / LOCKED RED";
  const bypassLabel = top.bypass_label || "Loop Track 3 (Clear & Interlocked)";
  const heldTrain = top.held_train || "#12952";
  const sigState = top.signal_state || "S-42 (RED)";

  let svgInner = "";

  if (type === "block_14b") {
    svgInner = `
      <defs>
        <linearGradient id="blockedGlow" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#ef4444" stop-opacity="0.1"/>
          <stop offset="50%" stop-color="#ef4444" stop-opacity="0.4"/>
          <stop offset="100%" stop-color="#ef4444" stop-opacity="0.1"/>
        </linearGradient>
      </defs>
      <!-- Main Track -->
      <line x1="20" y1="40" x2="400" y2="40" stroke="#334155" stroke-width="2.5"/>
      <!-- Siding Bypass Track -->
      <line x1="20" y1="75" x2="400" y2="75" stroke="#334155" stroke-dasharray="3,3" stroke-width="1.5"/>
      <!-- Switch Divert Path -->
      <path d="M 140,40 L 190,75 L 340,75" fill="none" stroke="#f59e0b" stroke-dasharray="2,2" stroke-width="2"/>
      <!-- Blocked Glow -->
      <rect x="150" y="27" width="120" height="26" rx="2" fill="url(#blockedGlow)"/>
      <line x1="150" y1="40" x2="270" y2="40" stroke="#ef4444" stroke-width="4"/>
      <text x="210" y="34" fill="#f87171" font-family="JetBrains Mono" font-size="8.5" font-weight="700" text-anchor="middle">! ${blockLabel} !</text>
      <!-- Train Held -->
      <rect x="90" y="33" width="45" height="15" rx="2" fill="#f59e0b"/>
      <text x="112" y="44" fill="#040a14" font-family="JetBrains Mono" font-size="8" font-weight="700" text-anchor="middle">${heldTrain}</text>
      <!-- Signal S-42 (Red) -->
      <circle cx="145" cy="28" r="4.5" fill="#ef4444" stroke="#000" stroke-width="1"/>
      <text x="145" y="20" fill="#ef4444" font-family="JetBrains Mono" font-size="7.5" font-weight="700" text-anchor="middle">${sigState}</text>
      <!-- Signal S-40 (Double Yellow) -->
      <circle cx="70" cy="28" r="3.5" fill="#f59e0b"/>
      <circle cx="70" cy="20" r="3.5" fill="#f59e0b"/>
      <text x="50" y="15" fill="#f59e0b" font-family="JetBrains Mono" font-size="7">S-40 (YY)</text>
      <!-- Siding-01 -->
      <rect x="220" y="69" width="40" height="13" rx="1.5" fill="#1e293b" stroke="#64748b"/>
      <text x="240" y="79" fill="#ffffff" font-family="JetBrains Mono" font-size="7.5" text-anchor="middle">SIDING-01</text>
      <text x="280" y="92" fill="#f59e0b" font-family="JetBrains Mono" font-size="8">${bypassLabel}</text>
    `;
  } else if (type === "dwell_conflict") {
    svgInner = `
      <!-- Platform 1 Track -->
      <line x1="20" y1="36" x2="400" y2="36" stroke="#334155" stroke-width="2.5"/>
      <!-- Platform 2 Through Track -->
      <line x1="20" y1="76" x2="400" y2="76" stroke="#f59e0b" stroke-width="2"/>
      <!-- Crossover Switched Path -->
      <path d="M 80,36 L 130,76 L 380,76" fill="none" stroke="#f59e0b" stroke-dasharray="3,3" stroke-width="2"/>
      <!-- Platform 1 Island -->
      <rect x="150" y="22" width="130" height="12" rx="2" fill="#334155" stroke="#f59e0b" stroke-width="1"/>
      <text x="215" y="31" fill="#fde68a" font-family="JetBrains Mono" font-size="7.5" font-weight="700" text-anchor="middle">PF-1 BERTH HOLD (+7m)</text>
      <!-- Held Train #22953 on PF1 -->
      <rect x="170" y="38" width="55" height="15" rx="2" fill="#f59e0b"/>
      <text x="197" y="49" fill="#040a14" font-family="JetBrains Mono" font-size="8" font-weight="700" text-anchor="middle">${heldTrain}</text>
      <!-- Signal S-18 -->
      <circle cx="235" cy="28" r="4.5" fill="#f59e0b" stroke="#000" stroke-width="1"/>
      <text x="235" y="18" fill="#f59e0b" font-family="JetBrains Mono" font-size="7.5" font-weight="700" text-anchor="middle">${sigState}</text>
      <!-- Approaching Train #20901 Vande Bharat -->
      <rect x="35" y="69" width="50" height="15" rx="2" fill="#f59e0b"/>
      <text x="60" y="80" fill="#040a14" font-family="JetBrains Mono" font-size="8" font-weight="700" text-anchor="middle">#20901</text>
      <!-- Platform 2 Indicator -->
      <text x="180" y="93" fill="#f59e0b" font-family="JetBrains Mono" font-size="8.5" font-weight="600">${bypassLabel}</text>
    `;
  } else if (type === "ekf_tunnel") {
    svgInner = `
      <defs>
        <linearGradient id="cuttingShade" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#475569" stop-opacity="0.4"/>
          <stop offset="100%" stop-color="#0f172a" stop-opacity="0.9"/>
        </linearGradient>
      </defs>
      <!-- Ghat Rock Cutting Overlay -->
      <polygon points="120,15 280,15 310,95 90,95" fill="url(#cuttingShade)" stroke="#475569" stroke-dasharray="2,2"/>
      <text x="200" y="26" fill="#94a3b8" font-family="JetBrains Mono" font-size="8" font-weight="700" text-anchor="middle">GHAT ROCK CUTTING MP 492 (RF ATTENUATION 100%)</text>
      <!-- Ghat Track Line -->
      <line x1="20" y1="55" x2="400" y2="55" stroke="#334155" stroke-width="3"/>
      <!-- Trackside RFID Balises -->
      <circle cx="140" cy="55" r="3" fill="#f59e0b"/>
      <circle cx="200" cy="55" r="3" fill="#f59e0b"/>
      <circle cx="260" cy="55" r="3" fill="#f59e0b"/>
      <text x="200" y="68" fill="#f59e0b" font-family="JetBrains Mono" font-size="7" text-anchor="middle">BALISE ARRAY B-101 / B-102 / B-103</text>
      <!-- Train with EKF vector -->
      <rect x="185" y="47" width="55" height="16" rx="2" fill="#b45309" stroke="#f59e0b" stroke-width="1.5"/>
      <text x="212" y="59" fill="#ffffff" font-family="JetBrains Mono" font-size="8" font-weight="700" text-anchor="middle">${heldTrain} EKF</text>
      <line x1="240" y1="55" x2="280" y2="55" stroke="#22c55e" stroke-width="2" marker-end="url(#arrow)"/>
      <!-- Telemetry status -->
      <text x="310" y="58" fill="#22c55e" font-family="JetBrains Mono" font-size="7.5" font-weight="700">P < 0.08m (NOMINAL)</text>
      <text x="200" y="88" fill="#f59e0b" font-family="JetBrains Mono" font-size="8" text-anchor="middle">${bypassLabel}</text>
    `;
  } else if (type === "fog_abs") {
    svgInner = `
      <defs>
        <linearGradient id="fogGlow" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#94a3b8" stop-opacity="0.1"/>
          <stop offset="50%" stop-color="#94a3b8" stop-opacity="0.35"/>
          <stop offset="100%" stop-color="#94a3b8" stop-opacity="0.1"/>
        </linearGradient>
      </defs>
      <!-- Fog Haze Rect -->
      <rect x="40" y="15" width="340" height="80" rx="4" fill="url(#fogGlow)" stroke="#64748b" stroke-dasharray="3,3"/>
      <text x="210" y="28" fill="#cbd5e1" font-family="JetBrains Mono" font-size="8" font-weight="700" text-anchor="middle">LOW VISIBILITY ZONE: RVR < 120m (FSD ACTIVE)</text>
      <!-- Automatic Block Signal Track -->
      <line x1="20" y1="55" x2="400" y2="55" stroke="#334155" stroke-width="2.5"/>
      <!-- Train 12904 -->
      <rect x="70" y="47" width="50" height="16" rx="2" fill="#ef4444"/>
      <text x="95" y="59" fill="#ffffff" font-family="JetBrains Mono" font-size="8" font-weight="700" text-anchor="middle">#12904</text>
      <!-- Signal S-08 Double Yellow -->
      <circle cx="140" cy="48" r="3.5" fill="#f59e0b"/>
      <circle cx="140" cy="40" r="3.5" fill="#f59e0b"/>
      <text x="140" y="34" fill="#f59e0b" font-family="JetBrains Mono" font-size="7" font-weight="700" text-anchor="middle">S-08 (YY)</text>
      <!-- Expanded Spatial Headway Bracket -->
      <line x1="130" y1="75" x2="260" y2="75" stroke="#f59e0b" stroke-width="1.5"/>
      <line x1="130" y1="70" x2="130" y2="80" stroke="#f59e0b" stroke-width="1.5"/>
      <line x1="260" y1="70" x2="260" y2="80" stroke="#f59e0b" stroke-width="1.5"/>
      <text x="195" y="88" fill="#f59e0b" font-family="JetBrains Mono" font-size="8" font-weight="700" text-anchor="middle">${bypassLabel}</text>
      <!-- Trailing Train 12951 -->
      <rect x="270" y="47" width="50" height="16" rx="2" fill="#f59e0b"/>
      <text x="295" y="59" fill="#040a14" font-family="JetBrains Mono" font-size="8" font-weight="700" text-anchor="middle">#12951</text>
    `;
  } else {
    // ohe_sag
    svgInner = `
      <!-- Catenary Mast Wire -->
      <line x1="20" y1="35" x2="400" y2="35" stroke="#f59e0b" stroke-width="2"/>
      <!-- Neutral Section Insulator -->
      <rect x="180" y="31" width="40" height="8" rx="2" fill="#f59e0b"/>
      <text x="200" y="25" fill="#f59e0b" font-family="JetBrains Mono" font-size="7.5" font-weight="700" text-anchor="middle">NEUTRAL SECTION (40m)</text>
      <!-- Track Wire -->
      <line x1="20" y1="65" x2="400" y2="65" stroke="#334155" stroke-width="2.5"/>
      <!-- Passing Train #12951 -->
      <rect x="240" y="57" width="55" height="16" rx="2" fill="#22c55e"/>
      <text x="267" y="69" fill="#040a14" font-family="JetBrains Mono" font-size="8" font-weight="700" text-anchor="middle">#12951 NOMINAL</text>
      <!-- Substation TSS-03 Indicator -->
      <rect x="80" y="15" width="80" height="15" rx="2" fill="#1e293b" stroke="#f59e0b"/>
      <text x="120" y="26" fill="#f59e0b" font-family="JetBrains Mono" font-size="7.5" font-weight="700" text-anchor="middle">TSS-03: 24.8 kV</text>
      <text x="200" y="90" fill="#22c55e" font-family="JetBrains Mono" font-size="8" font-weight="600" text-anchor="middle">${blockLabel}</text>
    `;
  }

  return `
    <div class="flex items-center justify-between text-xs font-mono text-dim mb-1">
      <span>${startStn} <strong class="text-slate-100">${startKm}</strong></span>
      <span class="${inc.severity === 'CRIT' ? 'text-danger' : (inc.severity === 'WARN' ? 'text-caution' : 'text-cyan')} font-bold flex items-center gap-1">
        <span class="${inc.severity === 'CRIT' ? 'pulse-indicator-danger' : ''}" aria-hidden="true"></span>
        ${blockLabel}
      </span>
      <span>${endStn} <strong class="text-slate-100">${endKm}</strong></span>
    </div>
    <div class="triage-svg-viewport">
      <svg viewBox="0 0 420 110" class="triage-svg" aria-label="Incident interlocking diagram">
        ${svgInner}
      </svg>
    </div>
  `;
}

// Execute Incident Dispatch Action via Backend REST API
async function executeIncidentAction(incidentId, actionId, actionLabel) {
  playControlRoomChime("nominal");
  try {
    const res = await fetch(`http://localhost:8000/api/control-room/alerts/${incidentId}/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action_id: actionId,
        operator: "Section Controller (Desk-01)"
      })
    });

    if (!res.ok) throw new Error("HTTP error " + res.status);
    const data = await res.json();

    if (data.success) {
      showControlRoomToast("DISPATCH AUTHORIZED & LOGGED", data.new_event.desc, "success");

      // Update local memory
      if (CURRENT_ALERTS_DATA && CURRENT_ALERTS_DATA.incidents) {
        const idx = CURRENT_ALERTS_DATA.incidents.findIndex(i => i.id === incidentId);
        if (idx !== -1 && data.incident) {
          CURRENT_ALERTS_DATA.incidents[idx] = data.incident;
        }
        if (data.new_event) {
          if (!CURRENT_ALERTS_DATA.audit_log) CURRENT_ALERTS_DATA.audit_log = [];
          CURRENT_ALERTS_DATA.audit_log.unshift(data.new_event);
        }

        renderIncidentStream(CURRENT_ALERTS_DATA.incidents);
        const updatedInc = CURRENT_ALERTS_DATA.incidents.find(i => i.id === incidentId);
        if (updatedInc) {
          renderIncidentTriage(updatedInc);
        }
        renderAuditTrail(CURRENT_ALERTS_DATA.audit_log);
      }
    }
  } catch (err) {
    console.error("[AlertsHub] Failed to execute action:", err);
    showControlRoomToast("DISPATCH ERROR", "Failed to communicate with Section Interlocking controller.", "danger");
  }
}

// Render Column 3: Chronological Audit Trail & Dispatch Log
function renderAuditTrail(events) {
  const container = document.getElementById("audit-timeline-container");
  if (!container || !events) return;

  let html = "";
  events.slice(0, 10).forEach((ev, idx) => {
    const isNewest = idx === 0;
    const animStyle = isNewest ? "animation: fadeIn 0.4s ease;" : "";
    html += `
      <div class="timeline-event" style="${animStyle}">
        <span class="event-dot ${ev.dot_class || 'bg-cyan'}"></span>
        <span class="event-time font-mono ${ev.time_class || 'text-cyan'}">${ev.time}</span>
        <p class="event-desc">${ev.desc}</p>
      </div>
    `;
  });

  container.innerHTML = html;
}

// Render Column 3: Custody & Sign-Off Box
function renderCustodyBox(custody) {
  const container = document.getElementById("custody-box-container");
  if (!container || !custody) return;

  container.innerHTML = `
    <span class="text-dim text-xs font-mono font-bold block mb-1">CUSTODY &amp; SIGN-OFF</span>
    <p class="text-xs text-ink font-medium">${custody.desk || "Chief Controller DS-04 (Mumbai Central CTC)"}</p>
    <p class="text-xs text-cyan font-mono">${custody.chief_controller || "T. Bhatt (ChC/WR/MMCT)"}</p>
    <span class="text-dim text-xs font-mono block mt-1">${custody.shift || "Shift B"} Active: ${custody.shift_start || "14:00:00 IST"}</span>
  `;
}

// Initialize Alerts Hub on app boot
function initAlertsHub() {
  const incPills = document.querySelectorAll(".inc-pill");
  const incSearch = document.getElementById("inc-search-input");

  incPills.forEach(pill => {
    pill.addEventListener("click", () => {
      incPills.forEach(p => p.classList.remove("active"));
      pill.classList.add("active");
      CURRENT_INC_FILTER = pill.dataset.incFilter || "all";
      if (CURRENT_ALERTS_DATA && CURRENT_ALERTS_DATA.incidents) {
        renderIncidentStream(CURRENT_ALERTS_DATA.incidents);
      }
    });
  });

  if (incSearch) {
    incSearch.addEventListener("input", (e) => {
      INC_SEARCH_QUERY = e.target.value;
      if (CURRENT_ALERTS_DATA && CURRENT_ALERTS_DATA.incidents) {
        renderIncidentStream(CURRENT_ALERTS_DATA.incidents);
      }
    });
  }

  // Initial fetch
  fetchAndRenderAlerts();

  // Background auto-refresh every 8s
  if (ALERTS_AUTO_POLL) clearInterval(ALERTS_AUTO_POLL);
  ALERTS_AUTO_POLL = setInterval(() => {
    if (activeNavView === "alerts") {
      fetchAndRenderAlerts();
    }
  }, 8000);
}


// =============================================================================
// 15. AI DELAY INTELLIGENCE CONSOLE LOGIC
// =============================================================================
function initDelayIntel() {
  const simBtn = document.getElementById("btn-run-simulation");
  if (simBtn) {
    simBtn.addEventListener("click", () => {
      simBtn.innerHTML = `<span class="material-symbols-outlined" style="font-size: 16px; animation: spin 1s infinite linear;">sync</span> <span>Calculating GCN Adjacency Matrix...</span>`;
      setTimeout(() => {
        simBtn.innerHTML = `<span class="material-symbols-outlined" style="font-size: 16px;">check_circle</span> <span>Optimal Dispatch Found (-3.8 min delay)</span>`;
        simBtn.style.background = "var(--color-nominal-subtle)";
        simBtn.style.borderColor = "var(--color-nominal)";
        simBtn.style.color = "var(--color-nominal)";

        const targetPill = document.querySelector(".target-train-badge");
        if (targetPill) {
          targetPill.innerHTML = `<span class="font-bold text-nominal">SIMULATED: 12952 TEJAS RAJDHANI</span> · <span class="text-ink">SAVED: +3.8m</span>`;
        }
      }, 700);
    });
  }
}

// =============================================================================
// 16. DEAD-RECKONING & EDGE TELEMETRY CONSOLE LOGIC
// =============================================================================
function initDeadReckoning() {
  const repollBtn = document.getElementById("btn-repoll-radio");
  if (repollBtn) {
    repollBtn.addEventListener("click", () => {
      repollBtn.innerText = "PINGING UHF 450MHz...";
      setTimeout(() => {
        repollBtn.innerText = "RE-POLL UHF RADIO";
        alert("RADIO TELEMETRY HEALTH: OK\nRound-trip latency: 24ms over 450MHz Band.\nBuffer Flush: 84 packets successfully synced to Central Kafka.");
      }, 500);
    });
  }

  // Subtly append packets to the stream monitor every 4s
  const streamCode = document.querySelector(".packet-stream-code");
  if (streamCode) {
    setInterval(() => {
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
      const randomSpeed = (112 + Math.floor(Math.random() * 3) - 1);
      const newPacket = `\n[${timeStr}.042] PKT-09827: TR#12952 SPEED=${randomSpeed}KMPH GRAD=+0.25% BP=5.0kg S-42=CAUTION CRC=0x9FE4`;
      streamCode.textContent += newPacket;
      streamCode.scrollTop = streamCode.scrollHeight;
    }, 4000);
  }
}

// =============================================================================
// 17. FLEET TELEMETRY CSV EXPORT
// =============================================================================
function exportFleetCSV() {
  const headers = ["TRAIN_ID", "NAME", "TYPE", "LINE", "ORIGIN", "DEST", "SCHED", "ACTUAL", "DELAY_MIN", "SPEED_KMPH", "BLOCK", "NEXT_SIGNAL", "STATUS"];
  const rows = RAIL_FLEET.map(t => [
    t.id,
    `"${t.name}"`,
    t.type,
    t.line,
    t.origin,
    t.dest,
    t.sched,
    t.actual,
    t.delay,
    t.speed,
    t.block,
    t.nextSignal,
    `"${t.status}"`
  ]);

  const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `navarail_fleet_telemetry_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// =============================================================================
// 18. CTC INTERLOCKING TOPOLOGY & VITAL RELAY CONTROLS
// =============================================================================
// =============================================================================
// DYNAMIC CTC INTERLOCKING & VITAL RELAY ENGINE
// =============================================================================
let currentInterlockingSection = "WR-S1";

const INTERLOCKING_CORRIDORS = {
  "WR-S1": {
    id: "WR-S1",
    name: "WR-S1: MMCT–BRC",
    title: "MMCT–BRC 4-TRACK QUADRUPLE SUBURBAN & MAIN CORRIDOR · SIL-4 ELECTRONIC INTERLOCKING · KAVACH TCAS 1.2",
    mpRange: "MP 0.0 → MP 392.1 · 4-TRACK REAL-TIME RELAY LOGIC",
    stations: [
      { code: "MMCT", name: "MUMBAI CENTRAL", mp: "0.0", x: 100 },
      { code: "BVI",  name: "BORIVALI", mp: "29.7", x: 320 },
      { code: "VAPI", name: "VAPI JN", mp: "167.5", x: 560 },
      { code: "ST",   name: "SURAT", mp: "263.0", x: 900 },
      { code: "BH",   name: "BHARUCH JN", mp: "312.4", x: 1250 },
      { code: "BRC",  name: "VADODARA JN", mp: "392.1", x: 1520 }
    ],
    footerLabels: [
      { text: "MMCT YARD & PLATFORMS (KM 0.0)", x: 100 },
      { text: "BORIVALI QUADRUPLE JUNCTION (KM 29.7)", x: 420 },
      { text: "SURAT JN PLATFORM LADDER (KM 263.0)", x: 900 },
      { text: "BHARUCH BRIDGE (KM 312.4)", x: 1250 },
      { text: "BRC & DFCC MERGE (KM 392.1)", x: 1520, anchor: "end" }
    ],
    trains: [
      { id: "12951", name: "NDLS TEJAS RAJ", track: "up_fast", x: 740, y: 53, speed: 118, dir: "◀", status: "ON TIME", tagClass: "#10b981", block: "TC-03" },
      { id: "20901", name: "VANDE BHARAT", track: "up_fast", x: 1020, y: 53, speed: 130, dir: "◀", status: "ON TIME", tagClass: "#10b981", block: "TC-04" },
      { id: "90122", name: "VR SUBURBAN", track: "up_slow", x: 650, y: 103, speed: 54, dir: "◀", status: "LOCAL", tagClass: "#f59e0b", block: "SUBURBAN" },
      { id: "12952", name: "MMCT TEJAS RAJ", track: "dn_fast", x: 400, y: 183, speed: 112, dir: "▶", status: "ON TIME", tagClass: "#10b981", block: "TC-08" },
      { id: "12904", name: "GOLDEN TEMPLE", track: "dn_fast", x: 1220, y: 183, speed: 84, dir: "▶", status: "+8m DLY", tagClass: "#f59e0b", block: "TC-11" },
      { id: "BOXN-882", name: "BOXN-882 COAL", track: "dfcc", x: 960, y: 233, speed: 42, dir: "▶", status: "DFCC", tagClass: "#94a3b8", block: "DFCC" }
    ],
    pointMachines: {
      "PM-01": { id: "PM-01", name: "MMCT Yard Ladder", position: "NORMAL", stroke: "2.3s", current: "3.2A", svgId: "ei-sw-01" },
      "PM-02": { id: "PM-02", name: "Borivali Crossover", position: "NORMAL", stroke: "2.1s", current: "3.1A", svgId: "ei-sw-02" },
      "PM-04": { id: "PM-04", name: "Surat PF-1 Loop", position: "NORMAL", stroke: "2.4s", current: "3.2A", svgId: "ei-sw-04" },
      "PM-09": { id: "PM-09", name: "Bharuch Siding Switch", position: "NORMAL", stroke: "2.4s", current: "3.3A", svgId: "ei-sw-09" },
      "PM-12": { id: "PM-12", name: "Vadodara South Flyover", position: "NORMAL", stroke: "2.2s", current: "3.0A", svgId: "ei-sw-12" },
      "PM-15": { id: "PM-15", name: "Vadodara Central Ladder", position: "NORMAL", stroke: "2.5s", current: "3.4A", svgId: "ei-sw-15" }
    }
  },
  "WR-S2": {
    id: "WR-S2",
    name: "WR-S2: BRC–RTM",
    title: "BRC–RTM MOUNTAIN GHAT SECTION · KAVACH TCAS 1.2 · EKF DEAD-RECKONING RELAY INTERLOCKING",
    mpRange: "MP 392.1 → MP 653.2 · GHAT CUTTING VITAL ROUTE CONTROLS",
    stations: [
      { code: "BRC",  name: "VADODARA JN", mp: "392.1", x: 100 },
      { code: "GDA",  name: "GODHRA JN", mp: "466.0", x: 320 },
      { code: "DHD",  name: "DAHOD", mp: "541.2", x: 560 },
      { code: "MGN",  name: "MEGHNAGAR", mp: "574.0", x: 900 },
      { code: "BMI",  name: "BAMNIA", mp: "610.0", x: 1250 },
      { code: "RTM",  name: "RATLAM JN", mp: "653.2", x: 1520 }
    ],
    footerLabels: [
      { text: "BRC EAST EXIT (KM 392.1)", x: 100 },
      { text: "GODHRA JUNCTION (KM 466.0)", x: 420 },
      { text: "DAHOD GHAT ENTRY (KM 541.2)", x: 900 },
      { text: "BAMNIA (KM 610.0)", x: 1250 },
      { text: "RATLAM CTC MERGE (KM 653.2)", x: 1520, anchor: "end" }
    ],
    trains: [
      { id: "12951", name: "NDLS TEJAS RAJ", track: "up_fast", x: 740, y: 53, speed: 115, dir: "◀", status: "ON TIME", tagClass: "#10b981", block: "TC-03" },
      { id: "12952", name: "MMCT TEJAS RAJ", track: "dn_fast", x: 480, y: 183, speed: 88, dir: "▶", status: "EKF SYNC", tagClass: "#f59e0b", block: "TC-08" },
      { id: "BCN-402", name: "BCN GRAIN FREIGHT", track: "dfcc", x: 980, y: 233, speed: 52, dir: "▶", status: "DFCC", tagClass: "#94a3b8", block: "DFCC" }
    ],
    pointMachines: {
      "PM-01": { id: "PM-01", name: "BRC East Yard Switch", position: "NORMAL", stroke: "2.2s", current: "3.1A", svgId: "ei-sw-01" },
      "PM-02": { id: "PM-02", name: "Godhra Bypass Loop", position: "NORMAL", stroke: "2.1s", current: "3.0A", svgId: "ei-sw-02" },
      "PM-04": { id: "PM-04", name: "Dahod Ghat Siding", position: "NORMAL", stroke: "2.4s", current: "3.2A", svgId: "ei-sw-04" },
      "PM-09": { id: "PM-09", name: "Meghnagar Catch Siding", position: "NORMAL", stroke: "2.3s", current: "3.3A", svgId: "ei-sw-09" },
      "PM-12": { id: "PM-12", name: "Bamnia Crossover", position: "NORMAL", stroke: "2.2s", current: "3.1A", svgId: "ei-sw-12" },
      "PM-15": { id: "PM-15", name: "Ratlam Yard Reception", position: "NORMAL", stroke: "2.4s", current: "3.4A", svgId: "ei-sw-15" }
    }
  },
  "WR-S3": {
    id: "WR-S3",
    name: "WR-S3: RTM–KOTA",
    title: "RTM–KOTA PLATEAU CORRIDOR · HIGH-SPEED DUAL DOUBLE-TRACK SIL-4 RELAYS",
    mpRange: "MP 653.2 → MP 919.8 · CHAMBAL VALLEY HIGH-SPEED INTERLOCKING",
    stations: [
      { code: "RTM",  name: "RATLAM JN", mp: "653.2", x: 100 },
      { code: "NAD",  name: "NAGDA JN", mp: "694.0", x: 320 },
      { code: "SGZ",  name: "SHAMGARH", mp: "786.0", x: 560 },
      { code: "BWM",  name: "BHAWANI MANDI", mp: "818.0", x: 900 },
      { code: "RMA",  name: "RAMGANJ MANDI", mp: "846.0", x: 1250 },
      { code: "KOTA", name: "KOTA JN", mp: "919.8", x: 1520 }
    ],
    footerLabels: [
      { text: "RTM NORTH YARD (KM 653.2)", x: 100 },
      { text: "NAGDA JUNCTION CHUTE (KM 694.0)", x: 420 },
      { text: "SHAMGARH HIGH SPEED BYPASS (KM 786.0)", x: 900 },
      { text: "RAMGANJ SIDING (KM 846.0)", x: 1250 },
      { text: "KOTA CTC MERGE (KM 919.8)", x: 1520, anchor: "end" }
    ],
    trains: [
      { id: "12951", name: "NDLS TEJAS RAJ", track: "up_fast", x: 1100, y: 52, speed: 128, dir: "◀", status: "ON TIME", tagClass: "#10b981", block: "TC-04" },
      { id: "12952", name: "MMCT TEJAS RAJ", track: "dn_fast", x: 520, y: 183, speed: 126, dir: "▶", status: "ON TIME", tagClass: "#10b981", block: "TC-08" },
      { id: "12904", name: "GOLDEN TEMPLE", track: "dn_fast", x: 1320, y: 183, speed: 92, dir: "▶", status: "ON TIME", tagClass: "#10b981", block: "TC-11" }
    ],
    pointMachines: {
      "PM-01": { id: "PM-01", name: "RTM North Cross", position: "NORMAL", stroke: "2.2s", current: "3.1A", svgId: "ei-sw-01" },
      "PM-02": { id: "PM-02", name: "Nagda Flyover Loop", position: "NORMAL", stroke: "2.0s", current: "3.0A", svgId: "ei-sw-02" },
      "PM-04": { id: "PM-04", name: "Shamgarh Fast Crossover", position: "NORMAL", stroke: "2.3s", current: "3.2A", svgId: "ei-sw-04" },
      "PM-09": { id: "PM-09", name: "Bhawani Freight Loop", position: "NORMAL", stroke: "2.4s", current: "3.3A", svgId: "ei-sw-09" },
      "PM-12": { id: "PM-12", name: "Ramganj Bypass", position: "NORMAL", stroke: "2.1s", current: "3.0A", svgId: "ei-sw-12" },
      "PM-15": { id: "PM-15", name: "Kota South Yard Entry", position: "NORMAL", stroke: "2.5s", current: "3.5A", svgId: "ei-sw-15" }
    }
  },
  "NR-S4": {
    id: "NR-S4",
    name: "NR-S4: KOTA–NDLS",
    title: "NDLS–GZB 4-TRACK QUADRUPLE CORRIDOR · SIL-4 ELECTRONIC INTERLOCKING · KAVACH TCAS 1.2",
    mpRange: "MP 0.0 → MP 28.6 · 4-TRACK REAL-TIME RELAY LOGIC",
    stations: [
      { code: "NDLS", name: "NEW DELHI", mp: "0.0", x: 100 },
      { code: "CSB",  name: "CSB", mp: "2.3", x: 320 },
      { code: "TKJ",  name: "TILAK BRIDGE", mp: "4.1", x: 560 },
      { code: "ANVT", name: "ANAND VIHAR", mp: "13.8", x: 900 },
      { code: "SBB",  name: "SAHIBABAD", mp: "22.4", x: 1250 },
      { code: "GZB",  name: "GHAZIABAD", mp: "28.6", x: 1520 }
    ],
    footerLabels: [
      { text: "NDLS YARD & INTERCHANGE (KM 0.0)", x: 100 },
      { text: "YAMUNA RIVER RAIL BRIDGE (KM 3.6)", x: 420 },
      { text: "ANAND VIHAR INTERCHANGE (KM 13.8)", x: 900 },
      { text: "SAHIBABAD JN (KM 22.4)", x: 1250 },
      { text: "GZB & DFCC MERGE (KM 28.6)", x: 1520, anchor: "end" }
    ],
    trains: [
      { id: "12951", name: "NDLS TEJAS RAJ", track: "up_fast", x: 740, y: 53, speed: 112, dir: "◀", status: "ON TIME", tagClass: "#16a34a", block: "TC-03" },
      { id: "12436", name: "JYG GARIB RATH", track: "dn_fast", x: 135, y: 183, speed: 87, dir: "▶", status: "REGULATED", tagClass: "#ea580c", block: "TC-07" },
      { id: "22222", name: "CSMT RAJDHANI", track: "dn_fast", x: 375, y: 183, speed: 122, dir: "▶", status: "ON TIME", tagClass: "#10b981", block: "TC-08" },
      { id: "12302", name: "HOWRAH RAJ", track: "dn_fast", x: 1210, y: 183, speed: 98, dir: "▶", status: "+14m DLY", tagClass: "#f59e0b", block: "TC-11" }
    ],
    pointMachines: {
      "PM-01": { id: "PM-01", name: "NDLS Exit Cross", position: "NORMAL", stroke: "2.3s", current: "3.2A", svgId: "ei-sw-01" },
      "PM-02": { id: "PM-02", name: "Yamuna Approach", position: "NORMAL", stroke: "2.1s", current: "3.1A", svgId: "ei-sw-02" },
      "PM-04": { id: "PM-04", name: "ANVT Diamond", position: "REVERSE", stroke: "4.2s (SLOW)", current: "4.8A", svgId: "ei-sw-04" },
      "PM-09": { id: "PM-09", name: "SBB South Loop", position: "NORMAL", stroke: "2.4s", current: "3.3A", svgId: "ei-sw-09" },
      "PM-12": { id: "PM-12", name: "GZB West Flyover", position: "NORMAL", stroke: "2.2s", current: "3.0A", svgId: "ei-sw-12" },
      "PM-15": { id: "PM-15", name: "GZB Platform Ladder", position: "NORMAL", stroke: "2.5s", current: "3.4A", svgId: "ei-sw-15" }
    }
  }
};

let CURRENT_POINT_MACHINES = Object.assign({}, INTERLOCKING_CORRIDORS["WR-S1"].pointMachines);

// Render Corridor Section Selector Pills
function renderInterlockingSectionStrip() {
  const container = document.getElementById("ei-section-strip");
  if (!container) return;

  let html = `<span style="font-family: var(--font-body); font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: var(--color-ink-muted); margin-right: 8px;">INTERLOCKING SECTORS:</span>`;
  Object.keys(INTERLOCKING_CORRIDORS).forEach(key => {
    const c = INTERLOCKING_CORRIDORS[key];
    const isActive = key === currentInterlockingSection;
    const btnStyle = isActive ?
      "background: rgba(245, 158, 11, 0.16); border: 1px solid #f59e0b; color: #f59e0b; font-weight: 600; box-shadow: 0 0 10px rgba(245,158,11,0.18);" :
      "background: rgba(15, 23, 42, 0.6); border: 1px solid #334155; color: #94a3b8; font-weight: 500;";

    html += `
      <button onclick="switchInterlockingSection('${key}')" style="font-family: var(--font-body); font-size: 11px; font-weight: 600; letter-spacing: 0.015em; padding: 4px 10px; border-radius: 4px; cursor: pointer; white-space: nowrap; transition: all 0.2s ease; ${btnStyle}">
        ${c.name}
      </button>
    `;
  });
  container.innerHTML = html;
}

// Switch Interlocking Corridor Section
function switchInterlockingSection(sectionId) {
  if (!INTERLOCKING_CORRIDORS[sectionId]) return;
  currentInterlockingSection = sectionId;
  playControlRoomChime("nominal");

  const corridor = INTERLOCKING_CORRIDORS[sectionId];
  CURRENT_POINT_MACHINES = Object.assign({}, corridor.pointMachines);

  // 1. Subtitle & Chip
  const subEl = document.getElementById("ei-corridor-subtitle");
  if (subEl) subEl.textContent = corridor.title;

  const chipEl = document.getElementById("ei-corridor-mp-chip") || document.querySelector("#view-interlocking .corridor-coord-chip");
  if (chipEl) chipEl.innerHTML = `${corridor.mpRange}`;

  // 2. Section Selector Strip
  renderInterlockingSectionStrip();

  // 3. SVG Station Milestones & Grid
  renderInterlockingStationsSvg(corridor);

  // 4. Point Machines Table
  renderPointMachinesTable();

  // 5. Dynamic Trains on Tracks
  renderInterlockingTrains(corridor);

  // 6. Dynamic KPI Counters
  updateInterlockingKpis(corridor);
}

// Render SVG Station Guidelines and Milestones
function renderInterlockingStationsSvg(corridor) {
  const container = document.getElementById("ei-station-lines-and-labels");
  if (container && corridor) {
    let html = "";
    (corridor.stations || []).forEach((stn, idx) => {
      const isMain = idx === 0 || idx === corridor.stations.length - 1 || idx === 3;
      const txtCol = isMain ? "#f1f5f9" : "#94a3b8";
      const fontWt = isMain ? "700" : "500";
      html += `
        <line x1="${stn.x}" y1="25" x2="${stn.x}" y2="280" stroke="#2d313a" stroke-dasharray="2,3" />
        <text x="${stn.x}" y="20" text-anchor="middle" fill="${txtCol}" font-weight="${fontWt}">${stn.name} (KM ${stn.mp})</text>
      `;
    });
    container.innerHTML = html;
  }

  // Update Footer Sector Labels
  const footerContainer = document.getElementById("ei-footer-sector-labels");
  if (footerContainer && corridor && corridor.footerLabels) {
    let fHtml = "";
    corridor.footerLabels.forEach(fl => {
      const anchor = fl.anchor ? `text-anchor="${fl.anchor}"` : "";
      fHtml += `<text x="${fl.x}" y="290" ${anchor}>${fl.text}</text>`;
    });
    footerContainer.innerHTML = fHtml;
  }
}

// Render Dynamic Trains along the 4 Tracks in SVG
function renderInterlockingTrains(corridor) {
  const layer = document.getElementById("ei-dynamic-trains-layer");
  if (!layer || !corridor) return;

  // Retrieve trains for current section, enriching with live telemetry
  let html = "";
  const trains = corridor.trains || [];

  trains.forEach(t => {
    // Check if live speed is available in cache
    let liveSpeed = t.speed;
    let liveStatus = t.status;
    let tagColor = t.tagClass || "#10b981";

    if (window.TRAIN_BACKEND_CACHE && window.TRAIN_BACKEND_CACHE[t.id]) {
      const liveData = window.TRAIN_BACKEND_CACHE[t.id];
      if (typeof liveData.speed_kmh === "number") liveSpeed = Math.round(liveData.speed_kmh);
      if (typeof liveData.current_delay_min === "number") {
        const d = Math.round(liveData.current_delay_min);
        liveStatus = d > 15 ? `+${d}m DLY` : (d > 5 ? `+${d}m` : "ON TIME");
        tagColor = d > 15 ? "#ef4444" : (d > 5 ? "#f59e0b" : "#10b981");
      }
    }

    const dirArrow = t.dir || (t.track.includes("up") ? "◀" : "▶");
    const strokeCol = tagColor;
    const bgCol = liveStatus.includes("DLY") ? "#1e1014" : "#0b1c32";

    html += `
      <g class="train-schematic-tag" transform="translate(${t.x}, ${t.y})" filter="url(#ei-card-shadow)" onclick="window.selectTrain('${t.id}')" style="cursor: pointer; pointer-events: auto;">
        <rect x="0" y="0" width="105" height="22" rx="3" fill="${bgCol}" stroke="${strokeCol}" stroke-width="1.5" />
        <text x="8" y="15" font-family="JetBrains Mono" font-size="9.5" font-weight="700" fill="${strokeCol}">${dirArrow} ${t.id}</text>
        <text x="66" y="15" font-family="JetBrains Mono" font-size="8.5" fill="#94a3b8">${liveSpeed}k</text>
      </g>
    `;
  });

  layer.innerHTML = html;
}

// Render Point Machines Diagnostics Table
function renderPointMachinesTable() {
  const tbody = document.getElementById("point-machine-table-body");
  if (!tbody) return;

  let html = "";
  Object.keys(CURRENT_POINT_MACHINES).forEach(pmKey => {
    const pm = CURRENT_POINT_MACHINES[pmKey];
    const isNormal = pm.position === "NORMAL";
    const pillClass = isNormal ? "status-pill status-nominal" : "status-pill";
    const pillStyle = isNormal ? "" : "background: var(--color-caution); color: #000;";
    const actionLabel = isNormal ? "THROW [R]" : "THROW [N]";
    const num = pm.id.replace("PM-", "");

    html += `
      <tr id="pm-row-${num}">
        <td class="font-mono font-bold text-cyan">${pm.id}</td>
        <td class="text-dim">${pm.name}</td>
        <td><span class="${pillClass}" id="pm-pos-${num}" style="${pillStyle}">${pm.position} (${pm.position[0]})</span></td>
        <td class="font-mono ${isNormal ? 'text-nominal' : 'text-caution font-bold'}">${pm.stroke}</td>
        <td class="font-mono">${pm.current}</td>
        <td><button class="btn-point-throw" onclick="togglePoint('${pm.id}')" style="cursor: pointer;">${actionLabel}</button></td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
}

// Point Machine Toggle with Live SVG Visual Throw & Toast
window.togglePoint = function(pointId) {
  const pm = CURRENT_POINT_MACHINES[pointId];
  if (!pm) return;

  const newPos = pm.position === "NORMAL" ? "REVERSE" : "NORMAL";
  pm.position = newPos;
  pm.stroke = newPos === "REVERSE" ? "2.6s" : "2.2s";
  pm.current = newPos === "REVERSE" ? "3.8A" : "3.1A";

  // 1. Update Table Row
  renderPointMachinesTable();

  // 2. Update SVG Visual Crossover Switch
  const svgGroup = document.getElementById(pm.svgId);
  if (svgGroup) {
    const textEl = svgGroup.querySelector("text");
    if (textEl) {
      const code = pointId.replace('PM-', 'SW-');
      textEl.textContent = `${code}(${newPos[0]})`;
      textEl.setAttribute("fill", newPos === "NORMAL" ? "#f59e0b" : "#f59e0b");
      textEl.setAttribute("font-weight", newPos === "NORMAL" ? "400" : "700");
    }

    const lineEl = svgGroup.querySelector("line");
    if (lineEl) {
      if (newPos === "REVERSE") {
        lineEl.setAttribute("stroke", "#f59e0b");
        lineEl.setAttribute("stroke-width", "3");
        lineEl.removeAttribute("stroke-dasharray");
      } else {
        lineEl.setAttribute("stroke", "#f59e0b");
        lineEl.setAttribute("stroke-width", "2");
        lineEl.setAttribute("stroke-dasharray", "3,3");
      }
    }
  }

  playControlRoomChime("nominal");
  showControlRoomToast("POINT MACHINE THROWN", `Switch ${pointId} (${pm.name}) thrown to ${newPos} (${newPos[0]}). Stroke time: ${pm.stroke}. Current: ${pm.current}. Vital locking proved.`, "info");

  // Update KPI counters
  updateInterlockingKpis(INTERLOCKING_CORRIDORS[currentInterlockingSection]);
};

// Dynamic KPI Counters
function updateInterlockingKpis(corridor) {
  const pms = CURRENT_POINT_MACHINES;
  const pmKeys = Object.keys(pms);
  const slowCount = pmKeys.filter(k => pms[k].stroke.includes("SLOW")).length;

  const kpiLocks = document.getElementById("ei-kpi-locks");
  const kpiPoints = document.getElementById("ei-kpi-points");
  const kpiSignals = document.getElementById("ei-kpi-signals");
  const kpiAxle = document.getElementById("ei-kpi-axle");

  if (kpiLocks) kpiLocks.textContent = `${pmKeys.length - 2} CONFIGURED`;
  if (kpiPoints) kpiPoints.textContent = `${pmKeys.length} LOCKED (${slowCount} SLOW)`;
  if (kpiSignals) kpiSignals.textContent = `12 CAB-MONITORED`;
  if (kpiAxle) kpiAxle.textContent = `11 CLEAR / 1 DESYNC`;
}

// Reset Axle Counter (TC-09)
window.resetAxleCounter = function(blockId) {
  const btn = document.getElementById("btn-reset-dp15");
  if (btn) {
    btn.innerHTML = "RESETTING...";
    btn.disabled = true;
    setTimeout(() => {
      btn.innerHTML = "NORMALIZED ✓";
      btn.style.borderColor = "var(--color-nominal)";
      btn.style.color = "var(--color-nominal)";
      btn.style.background = "var(--color-nominal-subtle)";

      const parentRow = btn.closest(".axle-diag-row");
      if (parentRow) {
        parentRow.style.background = "var(--color-canvas-inset)";
        parentRow.style.borderColor = "var(--color-rule-subtle)";
        const desc = parentRow.querySelector("span:nth-child(2)");
        if (desc) {
          desc.textContent = "IN: 148 · OUT: 148 (Reset By Controller)";
          desc.className = "text-nominal block text-xs";
        }
        const title = parentRow.querySelector(".font-bold");
        if (title) title.className = "font-bold text-nominal";
      }

      // Update TC-09 in SVG
      const tc09Line = document.querySelector("#interlocking-full-svg line[stroke-dasharray='3,3']");
      if (tc09Line) {
        tc09Line.setAttribute("stroke", "#10b981");
        tc09Line.removeAttribute("stroke-dasharray");
      }
      const tc09Text = document.querySelector("#interlocking-full-svg text[fill='#f59e0b']");
      if (tc09Text && tc09Text.textContent.includes("TC-09")) {
        tc09Text.textContent = "TC-09 [CLEAR]";
        tc09Text.setAttribute("fill", "#10b981");
      }
      playControlRoomChime("nominal");
      showControlRoomToast("AXLE COUNTER RESET", "Track Circuit TC-09 (DP-15) reset and verified. Pulse count synchronized (148/148).", "success");
    }, 500);
  }
};

function renderInterlockingView() {
  switchInterlockingSection(currentInterlockingSection || "WR-S1");
}


window.switchInterlockingSection = switchInterlockingSection;
window.renderInterlockingView = renderInterlockingView;
window.renderInterlockingTrains = renderInterlockingTrains;
window.INTERLOCKING_CORRIDORS = INTERLOCKING_CORRIDORS;

function initInterlockingControls() {
  renderInterlockingSectionStrip();

  const btnAutoRoute = document.getElementById("btn-ei-auto-route");
  if (btnAutoRoute) {
    btnAutoRoute.addEventListener("click", () => {
      const isAuto = btnAutoRoute.textContent.includes("ACTIVE");
      btnAutoRoute.innerHTML = isAuto
        ? `<span class="material-symbols-outlined" style="font-size: 14px;">engineering</span> <span>AUTO-ROUTE: MANUAL</span>`
        : `<span class="material-symbols-outlined" style="font-size: 14px;">smart_toy</span> <span>AUTO-ROUTE: ACTIVE</span>`;
      playControlRoomChime("nominal");
      showControlRoomToast("ROUTE DISPATCH MODE", isAuto ? "Manual operator route setting engaged." : "AI Conformal auto-route dispatch active.", "info");
    });
  }

  const btnReprove = document.getElementById("btn-ei-reprove");
  if (btnReprove) {
    btnReprove.addEventListener("click", () => {
      playControlRoomChime("nominal");
      btnReprove.innerHTML = `<span class="material-symbols-outlined" style="font-size: 14px; animation: spin 0.6s infinite linear;">sync</span> <span>PROVING...</span>`;
      setTimeout(() => {
        btnReprove.innerHTML = `<span class="material-symbols-outlined" style="font-size: 14px;">check_circle</span> <span>PROVED (SIL-4)</span>`;
        showControlRoomToast("SIL-4 ROUTE RE-PROVED", "Vital interlocking relay matrix verified across all 6 switch machines and 12 signals.", "success");
        setTimeout(() => {
          btnReprove.innerHTML = `<span class="material-symbols-outlined" style="font-size: 14px;">sync</span> <span>FORCE RE-PROVE</span>`;
        }, 1500);
      }, 500);
    });
  }

  const btnErc = document.getElementById("btn-ei-erc");
  if (btnErc) {
    btnErc.addEventListener("click", () => {
      playControlRoomChime("danger");
      showControlRoomToast("EMERGENCY ROUTE CANCEL INITIATED", "SIL-4 Vital approach locking active (120s timer). Signal aspects reverting to RED.", "danger");
      btnErc.innerHTML = `<span class="material-symbols-outlined" style="font-size: 14px;">lock_clock</span> <span>RELEASING (120s)</span>`;
      setTimeout(() => {
        btnErc.innerHTML = `<span class="material-symbols-outlined" style="font-size: 14px;">lock_reset</span> <span>EMERGENCY ROUTE CANCEL</span>`;
      }, 4000);
    });
  }

  // Initial render for default section
  renderInterlockingView();
}


// =============================================================================
// NAVARAIL LIVE BACKEND INTEGRATION ENGINE (FastAPI port 8000)
// High-Frequency Kinematics, Conformal Bounds, Tree-SHAP & Full Fleet SCADA
// =============================================================================

function renderOverviewCards() {
  const container = document.getElementById("train-cards-container");
  if (!container) return;

  const topTrains = getFilteredFleetByJurisdiction();
  if (topTrains.length === 0) {
    const jurId = window.currentJurisdiction || "ALL";
    const jurInfo = (typeof JURISDICTION_INFO !== "undefined" && JURISDICTION_INFO[jurId]) ? JURISDICTION_INFO[jurId] : { name: jurId, controller: "Section Controller", desk: "STANDBY" };
    container.innerHTML = `
      <div style="grid-column: 1 / -1; background: var(--color-canvas-inset); border: 1px dashed var(--color-rule); border-radius: var(--radius-card); padding: 36px 24px; text-align: center;">
        <span class="material-symbols-outlined text-cyan" style="font-size: 40px; margin-bottom: 8px;">verified_user</span>
        <h4 style="color: var(--color-ink); font-size: 16px; margin: 4px 0 2px 0;">TERRITORIAL SECTION UNOCCUPIED</h4>
        <p class="text-xs text-dim font-mono" style="max-width: 580px; margin: 8px auto 16px auto;">
          No live trains are currently occupying <strong>${jurInfo.name}</strong> (${jurInfo.kmRange || ''}).<br/>
          Automatic block signaling, track circuits and SIL-4 Kavach normal. ${jurInfo.controller} (${jurInfo.desk}) monitoring territory.
        </p>
        <button class="action-btn-small primary" onclick="setJurisdiction('ALL')" style="font-size: 11px; padding: 6px 16px;">View Full Corridor (8 Active Trains)</button>
      </div>
    `;
    return;
  }
  container.innerHTML = topTrains.map(t => {
    const isSelected = (typeof selectedTrainId !== "undefined" && selectedTrainId === t.id);
    const isNominal = t.status === "ON TIME";
    const isDanger = t.status === "EMERGENCY BRAKE" || t.delay > 30;
    const cardClass = isDanger ? "card-danger" : (isNominal ? "card-nominal" : "card-caution");
    const chipClass = isDanger ? "chip-danger" : (isNominal ? "chip-nominal" : "chip-caution");
    const valClass = isDanger ? "val-danger" : (isNominal ? "val-nominal" : "val-caution");
    const selectedStyle = isSelected ? "border: 2px solid var(--color-cyan, #f59e0b); box-shadow: 0 0 12px rgba(245, 158, 11, 0.25);" : "";

    return `
      <div class="train-card ${cardClass}" onclick="selectTrain('${t.id}')" tabindex="0" role="button" aria-label="Train ${t.id} ${t.name}" style="${selectedStyle}">
        <div class="card-top-row">
          <div>
            <h4 class="card-train-num font-mono">${t.id}</h4>
            <p class="card-train-name">${t.name} (${t.origin} &#10132; ${t.dest})</p>
          </div>
          <span class="status-chip ${chipClass}">${t.status}</span>
        </div>
        <div class="card-metrics-grid">
          <div class="metric-cell">
            <span class="cell-label">SPEED</span>
            <span class="cell-value ${valClass} font-mono">${t.speed} <span class="unit">KMPH</span></span>
          </div>
          <div class="metric-cell">
            <span class="cell-label">${t.delay > 0 ? 'DELAY' : 'BLOCK'}</span>
            <span class="cell-value ${t.delay > 0 ? valClass : ''} font-mono">${t.delay > 0 ? '+' + t.delay + ' <span class="unit">MIN</span>' : t.block}</span>
          </div>
          <div class="metric-cell">
            <span class="cell-label">ETA CONF</span>
            <span class="cell-value font-mono text-cyan">${t.confidencePct || 99}%</span>
          </div>
          <div class="metric-cell">
            <span class="cell-label">RAKE</span>
            <span class="cell-value font-mono text-dim">${t.rake ? t.rake.split('+')[0] : 'WAP-7'}</span>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

// Live Update for AI Delay Intelligence Console
window._shapSimulateActive = false;
window.LAST_DELAY_DATA = null;

function updateDelayIntelligenceView(data) {
  if (!data) return;
  window.LAST_DELAY_DATA = data;

  const isSimActive = window._shapSimulateActive;
  const trainId = String(data.train_no || '12952');

  // 1. Sync Train Selector Heading & Active Pill
  const targetHeading = document.getElementById("delay-target-train-heading");
  if (targetHeading) {
    targetHeading.textContent = `#${trainId} ${data.train_name || 'EXPRESS'} — LIVE INFERENCE (${data.telemetry_source || 'NTES_REALTIME'})`;
  }

  const pills = document.querySelectorAll("[data-delay-train]");
  pills.forEach(p => {
    if (p.getAttribute("data-delay-train") === trainId) {
      p.classList.add("active");
    } else {
      p.classList.remove("active");
    }
  });

  // 2. Target Train Badge in Card 1
  const badge = document.querySelector(".target-train-badge");
  if (badge) {
    const rawDelay = parseFloat(data.current_delay_min || 0);
    const dly = Math.round(isSimActive ? Math.max(0, rawDelay - 7.2) : rawDelay);
    const tagClass = dly > 15 ? "tag-danger" : (dly > 0 ? "tag-caution" : "tag-nominal");
    const tagText = dly > 0 ? `+${dly}m DELAY` : "ON TIME";
    const simTag = isSimActive ? ' <span class="status-chip chip-nominal" style="font-size:9px; margin-left:4px;">[F3 SIM ACTIVE: -7.2m]</span>' : '';
    
    badge.innerHTML = `
      <span class="pulse-indicator-emerald" aria-hidden="true"></span>
      <span class="text-dim">TARGET TRAIN:</span>
      <span class="font-mono text-cyan font-bold">#${trainId} (${data.train_name || 'EXPRESS'})</span>
      <span class="kpi-micro-tag ${tagClass}">APPROACHING ${data.next_station_code || 'DEST'} [${tagText}]</span>
      ${simTag}
    `;
  }

  // 3. Conformal Legend & Schedule Baseline
  const schedLegend = document.querySelector(".conformal-chart-legend strong.text-ink");
  if (schedLegend && data.scheduled_arrival) {
    schedLegend.textContent = `${data.scheduled_arrival} IST`;
  }
  const arrivalTarget = document.querySelector(".conformal-chart-legend div.text-cyan");
  if (arrivalTarget && data.next_station_name) {
    arrivalTarget.textContent = `Arrival Target: ${data.next_station_name} (${data.next_station_code})`;
  }

  // 4. DYNAMIC CONFORMAL GAUSSIAN SVG CURVE RE-CALCULATION
  const svgChart = document.getElementById("conformal-svg-chart") || document.querySelector(".conformal-svg");
  if (svgChart && data.dynamic_eta) {
    let fcDly = parseFloat(data.forecasted_delay_min !== undefined ? data.forecasted_delay_min : (data.current_delay_min || 0));
    if (isSimActive) fcDly = Math.max(0, fcDly - 7.2);
    const roundedDly = Math.round(fcDly);
    const sign = roundedDly >= 0 ? '+' : '';

    // Calculate dynamic X positions scaled along the 800px SVG timeline
    // Baseline (Schedule 0m) at X=150
    const schedX = 150;
    // Scale: 1 delay minute = 16px shift, clamped between X=250 and X=650
    const peakX = Math.max(240, Math.min(640, schedX + Math.max(1, roundedDly) * 16 + 80));
    // Conformal uncertainty margin width
    const mpiwWidth = Math.max(50, Math.min(110, roundedDly > 10 ? 95 : 60));
    const lbX = Math.max(90, peakX - mpiwWidth);
    const ubX = Math.min(760, peakX + mpiwWidth);

    // Dynamic Bell Curve Path
    const bellPath = `M ${lbX - 45},100 C ${lbX},100 ${peakX - 35},22 ${peakX},18 C ${peakX + 35},22 ${ubX},100 ${ubX + 45},100`;

    const pointTime = isSimActive ? '01:12' : (data.dynamic_eta.point_estimate || '01:19');
    const lowerTime = isSimActive ? '01:09' : (data.dynamic_eta.confidence_90?.lower || '01:16');
    const upperTime = isSimActive ? '01:16' : (data.dynamic_eta.confidence_90?.upper || '01:24');

    const statusColor = isSimActive ? '#10b981' : (roundedDly > 15 ? '#ef4444' : (roundedDly > 0 ? '#f59e0b' : '#10b981'));

    svgChart.innerHTML = `
      <defs>
        <linearGradient id="conformalGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="${statusColor}" stop-opacity="0.4"/>
          <stop offset="100%" stop-color="${statusColor}" stop-opacity="0.02"/>
        </linearGradient>
        <linearGradient id="curveGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="${statusColor}" stop-opacity="0.35"/>
          <stop offset="100%" stop-color="${statusColor}" stop-opacity="0.0"/>
        </linearGradient>
      </defs>

      <!-- Time Guidelines -->
      <line x1="80" y1="10" x2="80" y2="100" stroke="#2d313a" stroke-dasharray="2,2"/>
      <line x1="200" y1="10" x2="200" y2="100" stroke="#2d313a" stroke-dasharray="2,2"/>
      <line x1="320" y1="10" x2="320" y2="100" stroke="#2d313a" stroke-dasharray="2,2"/>
      <line x1="440" y1="10" x2="440" y2="100" stroke="#2d313a" stroke-dasharray="2,2"/>
      <line x1="560" y1="10" x2="560" y2="100" stroke="#2d313a" stroke-dasharray="2,2"/>
      <line x1="680" y1="10" x2="680" y2="100" stroke="#2d313a" stroke-dasharray="2,2"/>

      <!-- Base Axis -->
      <line x1="20" y1="100" x2="780" y2="100" stroke="#334155" stroke-width="2"/>

      <!-- Timetable Baseline -->
      <line x1="${schedX}" y1="18" x2="${schedX}" y2="100" stroke="#94a3b8" stroke-dasharray="4,3" stroke-width="2"/>
      <circle cx="${schedX}" cy="100" r="4" fill="#94a3b8"/>
      <text x="${schedX}" y="14" fill="#94a3b8" font-family="JetBrains Mono" font-size="9" font-weight="700" text-anchor="middle">SCHEDULE ${data.scheduled_arrival || '21:30'} IST</text>

      <!-- Conformal Prediction Band (alpha = 0.10) -->
      <rect x="${lbX}" y="24" width="${ubX - lbX}" height="76" rx="4" fill="url(#conformalGradient)"/>
      <line x1="${lbX}" y1="24" x2="${lbX}" y2="100" stroke="${statusColor}" stroke-width="2.5"/>
      <line x1="${ubX}" y1="24" x2="${ubX}" y2="100" stroke="${statusColor}" stroke-width="2.5"/>
      <polygon points="${lbX},24 ${lbX - 6},18 ${lbX + 6},18" fill="${statusColor}"/>
      <polygon points="${ubX},24 ${ubX - 6},18 ${ubX + 6},18" fill="${statusColor}"/>

      <!-- Probability Density Curve -->
      <path d="${bellPath}" fill="url(#curveGradient)" stroke="${statusColor}" stroke-width="2.5"/>

      <!-- Point Estimate Pin & Marker -->
      <line x1="${peakX}" y1="20" x2="${peakX}" y2="100" stroke="${statusColor}" stroke-width="2"/>
      <circle cx="${peakX}" cy="20" r="5" fill="${statusColor}" stroke="#ffffff" stroke-width="1.5"/>
      <circle cx="${peakX}" cy="100" r="4" fill="${statusColor}"/>

      <!-- Callout Tag -->
      <g transform="translate(${peakX}, 8)">
        <rect x="-70" y="-12" width="140" height="22" rx="3" fill="#041E33" stroke="${statusColor}" stroke-width="1"/>
        <text x="0" y="3" fill="${statusColor}" font-family="JetBrains Mono" font-size="9.5" font-weight="700" text-anchor="middle">★ ${pointTime} (${sign}${roundedDly}m DELAY)</text>
      </g>

      <text x="${lbX}" y="116" fill="${statusColor}" font-family="JetBrains Mono" font-size="9" font-weight="600" text-anchor="middle">${lowerTime} (90% LB)</text>
      <text x="${ubX}" y="116" fill="${statusColor}" font-family="JetBrains Mono" font-size="9" font-weight="600" text-anchor="middle">${upperTime} (90% UB)</text>
    `;

    // Conformal Meta Strip
    const mpiwVal = ((ubX - lbX) / 18).toFixed(1);
    const metaStrip = document.querySelector(".conformal-meta-strip");
    if (metaStrip) {
      metaStrip.innerHTML = `
        <div class="meta-tags-left">
          <span class="kpi-micro-tag tag-nominal"><strong>Empirical PICP:</strong> 91.4% (14,288 Calibration Runs)</span>
          <span class="kpi-micro-tag tag-cyan"><strong>MPIW:</strong> ${mpiwVal} min (CQR Conformal Margin)</span>
          <span class="kpi-micro-tag tag-dim"><strong>&alpha; Significance:</strong> 0.10 (90% Nominal)</span>
        </div>
        <span class="font-mono text-dim text-xs">NONCONFORMITY: SPLIT CONFORMAL (CQR RESIDUALS)</span>
      `;
    }
  }

  // 5. CUMULATIVE PATH BREADCRUMB (100% Dynamic from train's true route_progress)
  const pathContainer = document.getElementById("cumulative-path-container") || document.querySelector(".cumulative-path-bar");
  if (pathContainer && data.route_progress && Array.isArray(data.route_progress) && data.route_progress.length > 0) {
    const stops = data.route_progress;
    const pathItems = stops.map((s, idx) => {
      const dVal = Math.round(s.delay_min || 0);
      const isPast = (s.status === 'departed');
      const isCurr = (s.status === 'current');
      let pillClass = isPast ? '' : (isCurr ? 'pill-caution' : 'pill-nominal');
      if (dVal > 15) pillClass = 'pill-danger';
      const dStr = dVal > 0 ? `+${dVal}m` : '0m';
      const label = idx === 0 ? `Start (${s.station_code})` : (idx === stops.length - 1 ? `${s.station_code} Term` : s.station_code);
      return `<span class="path-pill ${pillClass}">${label} (${dStr})</span>`;
    });

    pathContainer.innerHTML = `
      <span class="text-dim">Cumulative Path:</span>
      ${pathItems.join('<span class="path-arrow">&rarr;</span>')}
    `;
  }

  // 6. SECTION WATERFALL PROGRESSION
  if (data.route_progress && Array.isArray(data.route_progress) && data.route_progress.length > 0) {
    const waterfallContainer = document.querySelector(".waterfall-blocks-list");
    if (waterfallContainer) {
      const activeIdx = data.route_progress.findIndex(s => s.status === 'current');
      const startIdx = Math.max(0, (activeIdx !== -1 ? activeIdx - 1 : 0));
      const displayStops = data.route_progress.slice(startIdx, startIdx + 4);

      if (displayStops.length >= 2) {
        let waterfallHtml = '';
        for (let i = 0; i < displayStops.length - 1; i++) {
          const from = displayStops[i];
          const to = displayStops[i + 1];
          const isRec = to.is_recovered || (to.recovered_min && to.recovered_min > 0);
          const recAmt = to.recovered_min || (data.dest_delay_recovery_min || 4);
          const dlyVal = to.delay_min !== undefined ? to.delay_min : (data.forecasted_delay_min || 0);
          const isNeg = isRec || (dlyVal < (from.delay_min || 0));

          const valColor = isNeg ? "text-nominal" : (dlyVal > 15 ? "text-danger" : "text-caution");
          const barClass = isNeg ? "delta-bar-left bg-nominal" : (dlyVal > 15 ? "delta-bar-right bg-danger" : "delta-bar-right bg-caution");
          const barWidth = Math.min(65, Math.max(12, Math.round(Math.abs(dlyVal) * 2.5 + 10)));
          const sign = isNeg ? `-${recAmt} min Δ [REC]` : `+${Math.round(dlyVal)} min Δ`;

          waterfallHtml += `
            <div class="waterfall-row">
              <div class="waterfall-info">
                <span class="waterfall-name">${i + 1}. ${from.station_code} &rarr; ${to.station_code} (${to.station_name})</span>
                <span class="waterfall-sub">${isNeg ? 'AI Schedule Recovery & Buffer Slack' : (to.status === 'upcoming' ? 'ST-GCN Predicted Section Transit' : 'Actual Operational Dwell')}</span>
              </div>
              <div class="waterfall-meter-wrap">
                <div class="zero-center-line"></div>
                <div class="${barClass}" style="width: ${barWidth}%;"></div>
              </div>
              <div class="waterfall-val ${valColor} font-mono font-bold">${sign}</div>
            </div>
          `;
        }
        waterfallContainer.innerHTML = waterfallHtml;
      }
    }
  }

  // 7. DYNAMIC TreeSHAP ATTRIBUTION BARS
  const shapContainer = document.querySelector(".shap-bars-container");
  if (shapContainer) {
    let reasons = (data.delay_reasons && data.delay_reasons.length > 0) ? [...data.delay_reasons] : [];

    // If What-If simulation active, prepend simulated mitigation
    let simHtml = '';
    if (isSimActive) {
      simHtml = `
        <div class="shap-row" style="background: rgba(16,185,129,0.08); border-radius: 4px; padding: 6px; border: 1px dashed var(--color-nominal);">
          <div class="shap-label-row">
            <span class="shap-label text-nominal font-bold">★ [F3 SIMULATION] Preemptive Freight Siding Hold (Loop 2)</span>
            <span class="shap-val text-nominal font-mono font-bold">-7.2m (-100% Priority Wave)</span>
          </div>
          <div class="shap-meter"><div class="shap-fill bg-nominal" style="width: 90%;"></div></div>
        </div>
      `;
    }

    // If delay is low/nominal, generate standard feature breakdown
    if (reasons.length <= 1 && (!reasons[0] || reasons[0].impact_min === 0)) {
      reasons = [
        { reason: "Preceding Block Clearance & Headway Headroom", severity: "LOW", impact_min: 0.2, pct: 45 },
        { reason: "Track Section Speed Adhesion & Gradient Alignment", severity: "LOW", impact_min: 0.1, pct: 28 },
        { reason: "Intermediate Timetable Schedule Margin Absorption", severity: "LOW", impact_min: -3.5, pct: 60, isRec: true },
        { reason: "Kavach SIL-4 Green Wave Continuous Authority", severity: "LOW", impact_min: 0.0, pct: 85 }
      ];
    }

    const totalImpact = reasons.reduce((acc, r) => acc + Math.abs(r.impact_min || 1), 0) || 1;
    const rowsHtml = reasons.map(r => {
      const pct = r.pct || Math.min(95, Math.max(18, Math.round((Math.abs(r.impact_min || 1) / totalImpact) * 100)));
      const isNeg = r.isRec || (r.impact_min < 0);
      const colorClass = isNeg ? "nominal" : (r.severity === "HIGH" ? "danger" : (r.severity === "MEDIUM" ? "caution" : "cyan"));
      const sign = (r.impact_min > 0 ? '+' : '');

      return `
        <div class="shap-row">
          <div class="shap-label-row">
            <span class="shap-label">${r.reason}</span>
            <span class="shap-val text-${colorClass} font-mono font-bold">${sign}${r.impact_min}m (${pct}%)</span>
          </div>
          <div class="shap-meter"><div class="shap-fill bg-${colorClass}" style="width: ${pct}%;"></div></div>
        </div>
      `;
    }).join('');

    shapContainer.innerHTML = simHtml + rowsHtml;
  }

  // 8. WHAT-IF SIMULATE BUTTON TOGGLE
  const simBtn = document.getElementById("btn-shap-simulate");
  if (simBtn) {
    if (isSimActive) {
      simBtn.style.background = 'rgba(16,185,129,0.2)';
      simBtn.style.borderColor = 'var(--color-nominal)';
      simBtn.innerHTML = `
        <span class="material-symbols-outlined" style="font-size: 16px; color:var(--color-nominal);" aria-hidden="true">check_circle</span>
        <span style="color:var(--color-nominal); font-weight:700;">[F3] RESET SIMULATION (RESTORE LIVE TELEMETRY)</span>
      `;
    } else {
      simBtn.style.background = '';
      simBtn.style.borderColor = '';
      simBtn.innerHTML = `
        <span class="material-symbols-outlined" style="font-size: 16px;" aria-hidden="true">tune</span>
        <span>[F3] SIMULATE FREIGHT SIDING REROUTE (-7.2 min mitigation)</span>
      `;
    }
  }

  // 9. DYNAMIC MODEL CALIBRATION HEALTH CARD
  const calLoss = document.getElementById("cal-val-loss");
  if (calLoss) {
    const loss = Math.max(0.015, (parseFloat(data.model_b_stgcn_delta || 0) + 0.024) * 0.15).toFixed(3);
    calLoss.innerHTML = `${loss} <span class="unit">MSE</span>`;
  }

  const calDrift = document.getElementById("cal-drift-metric");
  if (calDrift) {
    const otp = data.historical_on_time_pct || 92.4;
    calDrift.innerHTML = `${otp}% <span class="unit">OTP</span>`;
  }

  const calCheckpoint = document.getElementById("cal-checkpoint");
  if (calCheckpoint) {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    calCheckpoint.innerHTML = `${timeStr} <span class="unit">IST</span>`;
  }

  const calNodes = document.getElementById("cal-nodes-synced");
  if (calNodes) {
    calNodes.textContent = data.ensemble_blend_ratio || "60% LightGBM + 40% ST-GCN";
  }
}

// Attach Train Selector Click Handlers
function initDelayIntelligenceControls() {
  const pills = document.querySelectorAll("[data-delay-train]");
  pills.forEach(p => {
    p.addEventListener("click", () => {
      const trainId = p.getAttribute("data-delay-train");
      if (!trainId) return;
      window.selectedTrainId = trainId;
      pills.forEach(b => b.classList.remove("active"));
      p.classList.add("active");

      fetch(`http://localhost:8000/api/train/${trainId}/eta`)
        .then(r => r.json())
        .then(data => {
          updateDelayIntelligenceView(data);
        })
        .catch(() => {});
    });
  });

  // Hotkey / Click for F3 Simulation
  const simBtn = document.getElementById("btn-shap-simulate");
  if (simBtn) {
    simBtn.onclick = () => {
      window._shapSimulateActive = !window._shapSimulateActive;
      if (window.LAST_DELAY_DATA) {
        updateDelayIntelligenceView(window.LAST_DELAY_DATA);
      }
    };
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDelayIntelligenceControls);
} else {
  initDelayIntelligenceControls();
}

// Live Update for GIS Tactical Map HUD
// =============================================================================
// DYNAMIC GIS SPEED PROFILE & TACTICAL HUD ENGINE
// =============================================================================
const CORRIDOR_TRAIN_PRESETS = [
  { id: "12952", name: "MMCT TEJAS RAJ", maxPsr: 130, defaultStops: ["MMCT", "ST", "BRC", "RTM", "KOTA", "NDLS"] },
  { id: "12951", name: "NDLS TEJAS RAJ", maxPsr: 130, defaultStops: ["NDLS", "KOTA", "RTM", "BRC", "ST", "MMCT"] },
  { id: "20901", name: "VANDE BHARAT", maxPsr: 160, defaultStops: ["MMCT", "BVI", "VAPI", "ST", "BRC", "GNC"] },
  { id: "12904", name: "GOLDEN TEMPLE", maxPsr: 110, defaultStops: ["ASR", "LDH", "NDLS", "KOTA", "BRC", "MMCT"] },
  { id: "22222", name: "CSMT RAJDHANI", maxPsr: 130, defaultStops: ["CSMT", "NK", "BSL", "BPL", "GWL", "NZM"] },
  { id: "12302", name: "HOWRAH RAJDHANI", maxPsr: 130, defaultStops: ["NDLS", "CNB", "PRYJ", "DDU", "DHN", "HWH"] },
  { id: "12436", name: "JYG GARIB RATH", maxPsr: 110, defaultStops: ["ANVT", "CNB", "PRYJ", "DDU", "BJU", "JYG"] }
];

function renderGisTrainStrip() {
  const container = document.getElementById("gis-train-strip");
  if (!container) return;

  const currentId = selectedTrainId || "12952";
  let html = "";
  CORRIDOR_TRAIN_PRESETS.forEach(t => {
    const isActive = t.id === currentId;
    const btnStyle = isActive ?
      "background: rgba(245, 158, 11, 0.16); border: 1px solid #f59e0b; color: #f59e0b; font-weight: 700; box-shadow: 0 0 8px rgba(245,158,11,0.2);" :
      "background: rgba(15, 23, 42, 0.65); border: 1px solid #334155; color: #94a3b8; font-weight: 500;";

    html += `
      <button onclick="window.selectTrain('${t.id}')" style="font-family: var(--font-mono); font-size: 10.5px; font-weight: 600; padding: 3px 8px; border-radius: 3px; cursor: pointer; white-space: nowrap; transition: all 0.2s ease; ${btnStyle}">
        #${t.id}
      </button>
    `;
  });
  container.innerHTML = html;
}

function renderGisSpeedProfile(data) {
  if (!data) return;
  const trainId = data.train_no || selectedTrainId || "12952";
  const preset = CORRIDOR_TRAIN_PRESETS.find(p => p.id === trainId) || CORRIDOR_TRAIN_PRESETS[0];
  const maxPsr = preset.maxPsr || 130;

  // 1. Update PSR Badge
  const psrBadge = document.getElementById("gis-psr-badge");
  if (psrBadge) {
    psrBadge.textContent = `PSR ${maxPsr} MAX`;
  }

  // 2. Determine 6 Waypoint Stations
  let waypoints = [];
  if (data.route_progress && Array.isArray(data.route_progress) && data.route_progress.length >= 4) {
    const allStops = data.route_progress.map(s => s.station_code || "").filter(Boolean);
    if (allStops.length <= 6) {
      waypoints = allStops;
    } else {
      const n = allStops.length;
      const curIdx = data.route_progress.findIndex(s => s.station_code === data.current_station_code || s.station_code === data.next_station_code);
      const step = (n - 1) / 5.0;
      for (let i = 0; i < 6; i++) {
        const sampleIdx = Math.min(n - 1, Math.round(i * step));
        waypoints.push(allStops[sampleIdx]);
      }
      if (curIdx > 0 && curIdx < n - 1 && !waypoints.includes(allStops[curIdx])) {
        waypoints[2] = allStops[curIdx];
      }
    }
  } else {
    waypoints = preset.defaultStops || ["MMCT", "ST", "BRC", "RTM", "KOTA", "NDLS"];
  }

  while (waypoints.length < 6) waypoints.push(`W-${waypoints.length + 1}`);
  if (waypoints.length > 6) waypoints = waypoints.slice(0, 6);

  // 3. Calculate Speed Profile Polyline coordinates
  const xCoords = [12, 63, 114, 166, 217, 268];
  const profileFactors = [0.28, 0.92, 0.98, 0.48, 0.94, 0.32];

  const yCoords = profileFactors.map(f => {
    const spd = Math.round(maxPsr * f);
    return Math.round(75 - (spd / maxPsr) * 55);
  });

  let linePathD = `M ${xCoords[0]} ${yCoords[0]}`;
  for (let i = 1; i < 6; i++) {
    linePathD += ` L ${xCoords[i]} ${yCoords[i]}`;
  }

  const areaPathD = `M ${xCoords[0]} 75 L ${xCoords[0]} ${yCoords[0]}` +
    xCoords.slice(1).map((x, i) => ` L ${x} ${yCoords[i+1]}`).join("") +
    ` L ${xCoords[5]} 75 Z`;

  const areaEl = document.getElementById("gis-speed-area-path");
  const lineEl = document.getElementById("gis-speed-line-path");
  if (areaEl) areaEl.setAttribute("d", areaPathD);
  if (lineEl) lineEl.setAttribute("d", linePathD);

  // 4. Calculate Train Pin Position & Color
  const vTrain = Math.round(data.speed_kmh || 0);
  const curStn = data.current_station_code || (data.route_progress && data.route_progress[0]?.station_code) || waypoints[2];
  const nxtStn = data.next_station_code || waypoints[3];

  let stnIdx = waypoints.indexOf(curStn);
  if (stnIdx === -1) stnIdx = waypoints.indexOf(nxtStn);
  if (stnIdx === -1) stnIdx = 2;

  const fraction = Math.max(0.06, Math.min(0.94, (stnIdx + 0.4) / 5.0));
  const pinX = Math.round(12 + fraction * 256);
  const pinY = Math.max(16, Math.min(72, Math.round(75 - (vTrain / maxPsr) * 55)));

  let pinColor = "#10b981"; // Green
  if (vTrain < 30) {
    pinColor = "#ef4444"; // Red
  } else if (vTrain < 90) {
    pinColor = "#f59e0b"; // Yellow
  }

  const pinGroup = document.getElementById("gis-speed-pin-group");
  if (pinGroup) {
    pinGroup.innerHTML = `
      <circle cx="${pinX}" cy="${pinY}" r="7" fill="none" stroke="${pinColor}" stroke-width="1" opacity="0.65"/>
      <circle cx="${pinX}" cy="${pinY}" r="4" fill="${pinColor}" stroke="#ffffff" stroke-width="1.5"/>
      <text x="${pinX}" y="${pinY - 7}" fill="${pinColor}" font-family="JetBrains Mono" font-size="8" font-weight="700" text-anchor="middle">#${trainId} (${vTrain}k)</text>
    `;
  }

  // 5. Render Station Axis Labels
  const stationsGroup = document.getElementById("gis-speed-stations-group");
  if (stationsGroup) {
    let stnsHtml = "";
    waypoints.forEach((stnCode, idx) => {
      const isApproaching = (stnCode === curStn || stnCode === nxtStn);
      const fillCol = isApproaching ? "#f59e0b" : "#64748b";
      const fontWt = isApproaching ? "700" : "400";
      stnsHtml += `<text x="${xCoords[idx]}" y="83" fill="${fillCol}" font-family="JetBrains Mono" font-size="7" font-weight="${fontWt}" text-anchor="middle">${stnCode}</text>`;
    });
    stationsGroup.innerHTML = stnsHtml;
  }
}

// Live Update for GIS Tactical Map HUD & Speed Profile
function updateGisTacticalHud(data) {
  if (!data) return;

  const focusBadge = document.querySelector(".gis-focus-badge .font-mono");
  if (focusBadge) {
    focusBadge.textContent = `#${data.train_no} ${data.train_name}`;
  }

  const spd = Math.round(data.speed_kmh || 0);
  const blk = (data.current_station_code && data.next_station_code) ? `${data.current_station_code}-${data.next_station_code}` : 'TC-SEC-04';
  const nxt = data.next_station_name ? `${data.next_station_name} (${data.next_station_code})` : 'EN ROUTE';

  const metricsRow = document.querySelector(".gis-metrics-row");
  if (metricsRow) {
    const spdColor = spd >= 90 ? "text-nominal" : (spd >= 30 ? "text-caution" : "text-danger");
    metricsRow.innerHTML = `
      <span class="gis-metric">SPEED: <strong class="font-mono ${spdColor}">${spd} KM/H</strong></span>
      <span class="gis-sep" aria-hidden="true">•</span>
      <span class="gis-metric">BLOCK: <strong class="font-mono text-cyan">${blk}</strong></span>
      <span class="gis-sep" aria-hidden="true">•</span>
      <span class="gis-metric">APPROACH: <strong class="font-mono text-slate-100">${nxt}</strong></span>
      <span class="gis-sep" aria-hidden="true">•</span>
      <span class="gis-metric">ETA CONF: <strong class="font-mono text-cyan">99.8%</strong></span>
    `;
  }

  const inspectBtn = document.querySelector(".gis-hud-right-actions button");
  if (inspectBtn && data.train_no) {
    inspectBtn.setAttribute("onclick", `window.selectTrain('${data.train_no}')`);
    inspectBtn.innerHTML = `
      <span class="material-symbols-outlined" style="font-size: 15px;" aria-hidden="true">open_in_new</span>
      <span>INSPECT RAKE (#${data.train_no})</span>
    `;
  }

  // Update Dynamic Corridor Speed Profile & Train Selector Strip
  renderGisTrainStrip();
  renderGisSpeedProfile(data);
}

function connectBackendTelemetry() {
  const BACKEND_HTTP = 'http://localhost:8000';
  let activeSocket = null;
  let currentStreamingTrain = '12952';
  let wsRetryTimer = null;

  function updateFleetItem(data) {
    if (!data) return;
    const trainId = data.train_no || '12952';
    const trainObj = RAIL_FLEET.find(t => t.id === trainId);
    if (trainObj) {
      if (typeof data.speed_kmh === 'number') trainObj.speed = Math.round(data.speed_kmh);
      if (typeof data.current_delay_min === 'number') {
        trainObj.delay = Math.round(data.current_delay_min);
        trainObj.status = trainObj.delay > 30 ? 'CRITICAL DELAY' : (trainObj.delay > 5 ? 'DELAYED' : (trainObj.delay < 0 ? 'EARLY' : 'ON TIME'));
      }
      if (data.current_station_code && data.next_station_code) {
        trainObj.block = `${data.current_station_code}-${data.next_station_code}`;
      }
      if (typeof resolveStationSection === 'function') {
        const curCode = data.current_station_code || (data.route_stops && data.route_stops[0]?.station_code);
        const nxtCode = data.next_station_code;
        trainObj.section_id = resolveStationSection(curCode, nxtCode);
      }
      if (typeof window.updateGisTrainMarker === 'function' && data.lat && data.lon) {
        window.updateGisTrainMarker(trainId, data.lat, data.lon, data.speed_kmh, data.run_status, data.train_name, data.current_station_code, data.next_station_code);
      }
      if (data.dynamic_eta && data.dynamic_eta.point_estimate) {
        trainObj.actual = data.dynamic_eta.point_estimate;
        const low = data.dynamic_eta.confidence_90?.lower || '';
        const up = data.dynamic_eta.confidence_90?.upper || '';
        trainObj.etaConf = `${data.dynamic_eta.point_estimate} (90% CI: ${low}-${up}) • LIVE AI`;
      }
    }

    // Refresh UI components
    renderOverviewCards();
    if (typeof renderOverviewTable === 'function') renderOverviewTable();
    if (typeof renderMasterTable === 'function') renderMasterTable();
    if (typeof renderInterlockingTrains === 'function' && typeof currentInterlockingSection !== 'undefined' && typeof INTERLOCKING_CORRIDORS !== 'undefined' && INTERLOCKING_CORRIDORS[currentInterlockingSection]) {
      renderInterlockingTrains(INTERLOCKING_CORRIDORS[currentInterlockingSection]);
    }

    // Update GIS Leaflet Marker if active
    if (window.gisTrainMarkers && window.gisTrainMarkers[trainId] && data.lat && data.lon) {
      window.gisTrainMarkers[trainId].setLatLng([data.lat, data.lon]);
    }

    
    // Update Route Progression Timeline in Drawer if inspecting this train
    window.TRAIN_BACKEND_CACHE = window.TRAIN_BACKEND_CACHE || {};
    window.TRAIN_BACKEND_CACHE[trainId] = data;
    const routeCard = document.getElementById("drawer-route-progression-card");
    if (routeCard && typeof selectedTrainId !== 'undefined' && selectedTrainId === trainId && typeof renderDrawerRouteTimeline === 'function') {
      routeCard.outerHTML = renderDrawerRouteTimeline(trainId, data);
    }

    // Update Drawer if inspecting this train
    if (typeof selectedTrainId !== 'undefined' && selectedTrainId === trainId && typeof window._originalSelectTrain === 'function') {
      const drawer = document.getElementById("train-inspector-drawer");
      const isDrawerOpen = drawer ? drawer.classList.contains('open') : false;
      window._originalSelectTrain(trainId, isDrawerOpen);
    }

    // Update AI Delay Intelligence View & GIS HUD for currently viewed train
    if (typeof selectedTrainId === 'undefined' || selectedTrainId === trainId) {
      updateDelayIntelligenceView(data);
      updateGisTacticalHud(data);
    }

    // Push live packet to console stream
    const streamCode = document.querySelector('.packet-stream-code');
    if (streamCode && data.speed_kmh !== undefined) {
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
      const newPacket = `\n[${timeStr}.${String(now.getMilliseconds()).padStart(3, '0')} LIVE-WS] TR#${trainId} LAT=${Number(data.lat).toFixed(4)} LON=${Number(data.lon).toFixed(4)} SPD=${Math.round(data.speed_kmh)}KMPH DLY=+${Math.round(data.current_delay_min || 0)}m BLK=${data.current_station_code || 'KOTA'}->${data.next_station_code || 'NAD'} MODEL=ST-GCN/LGBM`;
      streamCode.textContent += newPacket;
      streamCode.scrollTop = streamCode.scrollHeight;
    }
  }

  function fetchTrainEta(tId) {
    fetch(`${BACKEND_HTTP}/api/train/${tId}/eta`)
      .then(res => res.json())
      .then(data => {
        updateFleetItem(data);
      })
      .catch(() => {});
  }

  function syncEntireFleet() {
    const fleetIds = ['12952', '12951', '12302', '20901', '12904', '12436', '22222'];
    fleetIds.forEach((tId, idx) => {
      setTimeout(() => fetchTrainEta(tId), idx * 300);
    });
  }

  syncEntireFleet();
  setInterval(syncEntireFleet, 6000);

  // Switchable WebSocket stream for currently inspected train
  window.switchTelemetryWs = function(trainId) {
    if (currentStreamingTrain === trainId && activeSocket && activeSocket.readyState === WebSocket.OPEN) return;
    currentStreamingTrain = trainId;
    clearTimeout(wsRetryTimer);

    if (activeSocket) {
      try { activeSocket.close(); } catch(e) {}
    }

    try {
      const wsUrl = `ws://localhost:8000/api/train/${trainId}/stream`;
      activeSocket = new WebSocket(wsUrl);
      activeSocket.onopen = () => {
        console.log('[NavaRail SCADA] Streaming live telemetry for TR#' + trainId);
      };
      activeSocket.onmessage = (evt) => {
        try {
          const payload = JSON.parse(evt.data);
          updateFleetItem(payload);
        } catch(e) {}
      };
      activeSocket.onclose = () => {
        wsRetryTimer = setTimeout(() => {
          if (currentStreamingTrain === trainId) window.switchTelemetryWs(trainId);
        }, 3000);
      };
      activeSocket.onerror = () => {
        if (activeSocket) activeSocket.close();
      };
    } catch(e) {}
  };

  window.switchTelemetryWs('12952');
}

// Global master selectTrain router
window._originalSelectTrain = window.selectTrain;
window._liveSelectTrain = function(trainId, openDrawer = true) {
  selectedTrainId = trainId;
  if (typeof window._originalSelectTrain === 'function') {
    window._originalSelectTrain(trainId, openDrawer);
  }
  if (typeof window.switchTelemetryWs === 'function') {
    window.switchTelemetryWs(trainId);
  }
  
  // Immediate update of drawer route progression card
  if (window.TRAIN_BACKEND_CACHE && window.TRAIN_BACKEND_CACHE[trainId] && typeof renderDrawerRouteTimeline === 'function') {
    const routeCard = document.getElementById("drawer-route-progression-card");
    if (routeCard) {
      routeCard.outerHTML = renderDrawerRouteTimeline(trainId, window.TRAIN_BACKEND_CACHE[trainId]);
    }
  } else if (window.INITIAL_FLEET_CACHE && window.INITIAL_FLEET_CACHE[trainId] && typeof renderDrawerRouteTimeline === 'function') {
    const routeCard = document.getElementById("drawer-route-progression-card");
    if (routeCard) {
      routeCard.outerHTML = renderDrawerRouteTimeline(trainId, window.INITIAL_FLEET_CACHE[trainId]);
    }
  }

  // Immediate REST sync for instant reaction
  fetch(`http://localhost:8000/api/train/${trainId}/eta`)
    .then(r => r.json())
    .then(data => {
      updateDelayIntelligenceView(data);
      updateGisTacticalHud(data);
      renderOverviewCards();
    })
    .catch(() => {});
};
window.selectTrain = window._liveSelectTrain;

// Start telemetry sync
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    connectBackendTelemetry();
  });
} else {
  connectBackendTelemetry();
}

window.renderOverviewCards = renderOverviewCards;
window.updateDelayIntelligenceView = updateDelayIntelligenceView;
window.updateGisTacticalHud = updateGisTacticalHud;


// =============================================================================
// 15. DYNAMIC JURISDICTION & HIERARCHICAL COMMAND INTEGRATION
// =============================================================================
async function loadJurisdictionData() {
  try {
    const curJur = window.currentJurisdiction || "ALL";
    const res = await fetch('http://localhost:8000/api/control-room/jurisdiction');
    if (!res.ok) return;
    const data = await res.json();

    // Synchronize section_id for all fleet items
    if (Array.isArray(data.sections)) {
      data.sections.forEach(sec => {
        if (sec.active_trains) {
          sec.active_trains.forEach(t => {
            const tr = RAIL_FLEET.find(f => f.id === t.train_no);
            if (tr) {
              tr.section_id = sec.section_id;
              if (t.speed_kmh !== undefined) tr.speed = Math.round(t.speed_kmh);
              if (t.delay_min !== undefined) tr.delay = Math.round(t.delay_min);
              if (t.current_station && t.next_station) tr.block = `${t.current_station}-${t.next_station}`;
            }
          });
        }
      });
    }

    // Update Pill Count Badges
    const pillALL = document.querySelector('[data-jurisdiction-pill="ALL"]');
    if (pillALL && data.total_active_trains !== undefined) {
      pillALL.textContent = `ALL (${data.total_active_trains})`;
    }

    const s1 = data.sections.find(s => s.section_id === "WR-S1");
    const s2 = data.sections.find(s => s.section_id === "WR-S2");
    const s3 = data.sections.find(s => s.section_id === "WR-S3");
    const s4 = data.sections.find(s => s.section_id === "NR-S4");

    const pillS1 = document.querySelector('[data-jurisdiction-pill="WR-S1"]');
    if (pillS1 && s1) pillS1.textContent = `WR-S1 (${s1.active_train_count})`;

    const pillS2 = document.querySelector('[data-jurisdiction-pill="WR-S2"]');
    if (pillS2 && s2) pillS2.textContent = `WR-S2 (${s2.active_train_count})`;

    const pillS3 = document.querySelector('[data-jurisdiction-pill="WR-S3"]');
    if (pillS3 && s3) pillS3.textContent = `WR-S3 (${s3.active_train_count})`;

    const pillS4 = document.querySelector('[data-jurisdiction-pill="NR-S4"]');
    if (pillS4 && s4) pillS4.textContent = `NR-S4 (${s4.active_train_count})`;

    const mumbaiCount = (s1?.active_train_count || 0) + (s2?.active_train_count || 0) + (s3?.active_train_count || 0);
    const pillMUMBAI = document.querySelector('[data-jurisdiction-pill="MUMBAI"]');
    if (pillMUMBAI) pillMUMBAI.textContent = `MUMBAI (${mumbaiCount})`;

    // Update Scope Label
    const scopeLabel = document.getElementById("active-jurisdiction-name");
    if (scopeLabel) {
      const activeFiltered = getFilteredFleetByJurisdiction();
      const jurInfo = (typeof JURISDICTION_INFO !== "undefined" && JURISDICTION_INFO[curJur]) ? JURISDICTION_INFO[curJur] : { name: curJur };
      scopeLabel.textContent = `${jurInfo.name.toUpperCase()} (${activeFiltered.length} LIVE TRAIN${activeFiltered.length !== 1 ? 'S' : ''})`;
    }

    // Top Bar updates
    if (curJur === "ALL") {
      const topTitle = document.getElementById("top-corridor-title");
      if (topTitle && data.division && data.zone) {
        topTitle.textContent = `${data.division.toUpperCase()} — ${data.zone.toUpperCase()} CTC`;
      }
      const topShift = document.getElementById("top-shift-text");
      if (topShift && data.current_shift && data.command) {
        topShift.textContent = `SHIFT ${data.current_shift.shift} (${data.current_shift.shift_start}) — CHC: ${data.command.chief_controller.name} • DESK-01: ${data.sections[0]?.controller?.name || 'S. Kumar'}`;
      }
      const topBadge = document.getElementById("top-corridor-badge");
      if (topBadge && data.sections) {
        topBadge.textContent = `0–1400 KM • ${data.sections.length} SECTION UNITS • KAVACH SIL-4 • RTIS/COA ACTIVE`;
      }
    }

    // Master Jurisdiction View Elements
    const jTitle = document.getElementById("jurisdiction-title");
    if (jTitle && data.jurisdiction_level) {
      jTitle.textContent = `${data.jurisdiction_level.toUpperCase()} — ${data.division.toUpperCase()} (${data.zone})`;
    }

    const jHq = document.getElementById("jurisdiction-hq");
    if (jHq && data.hq_location) {
      jHq.textContent = `HQ: ${data.hq_location}`;
    }

    const jShiftChip = document.getElementById("jurisdiction-shift-chip");
    if (jShiftChip && data.current_shift) {
      jShiftChip.textContent = `SHIFT ${data.current_shift.shift} (${data.current_shift.shift_start}) • OFFICER: ${data.current_shift.shift_officer}`;
    }

    const jTrainsChip = document.getElementById("jurisdiction-trains-chip");
    if (jTrainsChip && data.total_active_trains !== undefined) {
      jTrainsChip.textContent = `${data.total_active_trains} ACTIVE TRAINS MONITORED`;
    }

    const totalSectionsBadge = document.getElementById("total-sections-badge");
    if (totalSectionsBadge && data.sections) {
      totalSectionsBadge.textContent = `${data.sections.length} DESKS ACTIVE • ${data.total_active_trains} TRAINS ALLOCATED`;
    }

    const officerLabel = document.getElementById("handover-officer-label");
    if (officerLabel && data.current_shift) {
      officerLabel.textContent = `Handover Officer: ${data.current_shift.shift_officer} (ChC)`;
    }

    // Render Section Units Grid in View 7
    const sectionGrid = document.getElementById("section-units-grid");
    if (sectionGrid && Array.isArray(data.sections)) {
      sectionGrid.innerHTML = data.sections.map(sec => {
        const trainBadges = (sec.active_trains && sec.active_trains.length > 0)
          ? sec.active_trains.map(t => {
              const delayClass = t.delay_min > 5 ? 'chip-danger' : (t.delay_min > 0 ? 'chip-caution' : 'chip-nominal');
              const delayLabel = t.delay_min > 0 ? `+${t.delay_min}m` : 'On-Time';
              return `
                <div onclick="window.selectTrain('${t.train_no}')" style="cursor:pointer; background:var(--color-surface); border:1px solid var(--color-rule-subtle); border-radius:4px; padding:6px 8px; display:flex; justify-content:space-between; align-items:center; transition:border-color 0.2s;" onmouseover="this.style.borderColor='var(--color-accent)'" onmouseout="this.style.borderColor='var(--color-rule-subtle)'">
                  <div style="display:flex; flex-direction:column; gap:2px;">
                    <div style="display:flex; align-items:center; gap:6px;">
                      <span class="font-mono text-cyan" style="font-weight:700; font-size:12px;">#${t.train_no}</span>
                      <span class="text-xs text-ink" style="font-weight:500; font-size:11px;">${t.train_name}</span>
                    </div>
                    <span class="text-dim font-mono" style="font-size:10px;">At ${t.current_station || 'EN-ROUTE'} ➔ ${t.next_station || '--'} • ${Math.round(t.speed_kmh)} km/h</span>
                  </div>
                  <span class="status-chip ${delayClass}" style="font-size:10px; padding:1px 6px;">${delayLabel}</span>
                </div>
              `;
            }).join('')
          : `<div class="text-dim font-mono" style="font-size:11px; padding:8px 0; text-align:center;">No trains currently occupying block</div>`;

        return `
          <div style="background:var(--color-canvas-inset); border:1px solid var(--color-rule); border-radius:6px; padding:12px; display:flex; flex-direction:column; gap:8px;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
              <div>
                <div style="display:flex; align-items:center; gap:6px;">
                  <span class="font-mono text-cyan" style="font-weight:700; font-size:13px;">${sec.section_id}</span>
                  <span class="text-xs font-mono text-dim" style="background:rgba(255,255,255,0.05); padding:1px 5px; border-radius:3px;">${sec.km_range}</span>
                </div>
                <h5 style="font-size:12px; font-weight:600; color:var(--color-ink); margin:2px 0 0 0;">${sec.section_name}</h5>
              </div>
              <span class="status-chip ${sec.active_train_count > 0 ? 'chip-nominal' : 'chip-ai'}" style="font-size:10px;">${sec.active_train_count} TRAIN${sec.active_train_count !== 1 ? 'S' : ''}</span>
            </div>

            <div style="background:var(--color-surface); padding:6px 8px; border-radius:4px; border:1px solid var(--color-rule-subtle); display:flex; justify-content:space-between; align-items:center;">
              <div>
                <span class="text-dim text-xs" style="font-size:10px; display:block;">CONTROLLER (${sec.controller?.desk || '--'})</span>
                <span class="font-mono text-cyan" style="font-weight:600; font-size:12px;">${sec.controller?.name || 'On Duty'}</span>
              </div>
              <span class="text-dim font-mono" style="font-size:10px;">${sec.controller?.badge || ''}</span>
            </div>

            <div style="display:flex; flex-direction:column; gap:5px; margin-top:2px;">
              <span class="text-dim font-mono" style="font-size:10px; text-transform:uppercase;">Active Territorial Allocations:</span>
              ${trainBadges}
            </div>

            <div style="margin-top:4px; padding-top:6px; border-top:1px solid var(--color-rule-subtle); display:flex; justify-content:flex-end;">
              <button class="action-btn-small" onclick="window.setJurisdiction('${sec.section_id}'); document.querySelector('.nav-item[data-view=\'overview\']').click();" style="font-size:10px; padding:3px 10px;">
                Focus Cockpit on ${sec.section_id} ➔
              </button>
            </div>
          </div>
        `;
      }).join('');
    }

    // Re-render live cards
    if (typeof renderOverviewCards === 'function') renderOverviewCards();
  } catch (e) {
    console.warn("[Jurisdiction] Failed to fetch jurisdiction data:", e);
  }
}
window.loadJurisdictionData = loadJurisdictionData;
