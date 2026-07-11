"use strict";

const canvas = document.getElementById("ocean");
window.__unknownOceanStatus = { boot: "starting" };
const gl = canvas.getContext("webgl", {
  antialias: true,
  alpha: true,
  preserveDrawingBuffer: true
});
const app = document.getElementById("app");
const beginButton = document.getElementById("beginExpedition");
const scanButton = document.getElementById("scanButton");
const diveButton = document.getElementById("diveButton");
const surfaceButton = document.getElementById("surfaceButton");
const logButton = document.getElementById("logButton");
const photoButton = document.getElementById("photoButton");
const closeLog = document.getElementById("closeLog");
const researchLog = document.getElementById("researchLog");
const discoveryModal = document.getElementById("discoveryModal");
const speciesPreview = document.getElementById("speciesPreview");
const previewCtx = speciesPreview.getContext("2d");
const saveSpeciesName = document.getElementById("saveSpeciesName");
const skipSpeciesName = document.getElementById("skipSpeciesName");
const speciesNameInput = document.getElementById("speciesNameInput");
const toast = document.getElementById("toast");
const shutter = document.getElementById("shutter");

const ui = {
  coordX: document.getElementById("coordX"),
  coordY: document.getElementById("coordY"),
  coordDepth: document.getElementById("coordDepth"),
  biomeName: document.getElementById("biomeName"),
  globalProgress: document.getElementById("globalProgress"),
  eventPill: document.getElementById("eventPill"),
  researcherName: document.getElementById("researcherName"),
  speciesCount: document.getElementById("speciesCount"),
  regionCount: document.getElementById("regionCount"),
  distanceCount: document.getElementById("distanceCount"),
  maxDepthCount: document.getElementById("maxDepthCount"),
  discoveryList: document.getElementById("discoveryList"),
  speciesTitle: document.getElementById("speciesTitle"),
  speciesId: document.getElementById("speciesId"),
  speciesBiome: document.getElementById("speciesBiome"),
  speciesDepth: document.getElementById("speciesDepth"),
  speciesBehavior: document.getElementById("speciesBehavior")
};

const STORAGE_KEY = "unknownOceanState.v3";
const TWO_PI = Math.PI * 2;
const DEG = Math.PI / 180;

const palettes = {
  "Coral Kingdom": {
    top: "#1889a8",
    mid: "#0b5f78",
    bottom: "#083747",
    glow: "#ffd985",
    accent: "#ff7aa7",
    flora: "#ffbc6d"
  },
  "Kelp Forest": {
    top: "#247f75",
    mid: "#145448",
    bottom: "#092d2e",
    glow: "#cce88f",
    accent: "#65b56a",
    flora: "#7bae4c"
  },
  "Crystal Caves": {
    top: "#225e8f",
    mid: "#183d65",
    bottom: "#0e1b38",
    glow: "#a9f6ff",
    accent: "#c99cff",
    flora: "#71dfff"
  },
  "Deep Abyss": {
    top: "#071e3a",
    mid: "#041226",
    bottom: "#020711",
    glow: "#5be6ff",
    accent: "#7390ff",
    flora: "#2e527a"
  },
  "Frozen Ocean": {
    top: "#75bed1",
    mid: "#2f788f",
    bottom: "#123b54",
    glow: "#e8fbff",
    accent: "#b8f3ff",
    flora: "#d9fbff"
  },
  "Hydrothermal Fields": {
    top: "#493045",
    mid: "#2a2636",
    bottom: "#120f1b",
    glow: "#ffb36b",
    accent: "#ff6f5d",
    flora: "#de704b"
  },
  "Ancient Ruins": {
    top: "#276e7d",
    mid: "#20485a",
    bottom: "#12263b",
    glow: "#f3d48c",
    accent: "#79e6d2",
    flora: "#9b8d72"
  },
  "Open Ocean": {
    top: "#1481a8",
    mid: "#075374",
    bottom: "#052f46",
    glow: "#b9f3ff",
    accent: "#86d6ff",
    flora: "#5f9eb6"
  }
};

const eventCatalog = [
  { name: "Leviathan Migration", tone: "A distant giant is crossing the northern shelf.", accent: "#9cdcff" },
  { name: "Temple Awakening", tone: "A submerged chamber is open for one tide cycle.", accent: "#ffd48b" },
  { name: "Glowing Bloom", tone: "Bioluminescent drifts are spreading through warm currents.", accent: "#75f5ff" },
  { name: "Giant Squid Hunt", tone: "A rare silhouette has been sighted below 900m.", accent: "#ff8fbd" },
  { name: "Abyss Portal", tone: "A blue fracture is active on the ocean floor.", accent: "#8795ff" },
  { name: "Meteor Crash", tone: "A luminous impact field is altering nearby life.", accent: "#ffbd72" },
  { name: "Lunar Eclipse", tone: "Nocturnal species are moving in unusual patterns.", accent: "#cbbcff" },
  { name: "Whale Choir", tone: "Low songs are traveling across every mapped trench.", accent: "#b9f3ff" }
];

const behaviors = [
  "Curious",
  "Shy",
  "Schooling",
  "Territorial",
  "Migrating",
  "Sleeping",
  "Predator",
  "Scavenger",
  "Friendly",
  "Nocturnal"
];

const namePartsA = [
  "Azure",
  "Glass",
  "Velvet",
  "Moon",
  "Crimson",
  "Silent",
  "Amber",
  "Ghost",
  "Ribbon",
  "Opal",
  "Dusk",
  "Needle"
];

const namePartsB = [
  "Ghostfin",
  "Drifter",
  "Halo Ray",
  "Lanternfish",
  "Veilback",
  "Spirescale",
  "Wisp Eel",
  "Bloomjaw",
  "Pearlwing",
  "Crownfish",
  "Glassback",
  "Tide Moth"
];

let width = 1;
let height = 1;
let dpr = 1;
let lastTime = performance.now();
let toastTimer = 0;
let pendingDiscovery = null;
let audio = null;

const saved = readSavedState();
const dailyEvent = getDailyEvent();

const state = {
  started: false,
  diveProgress: 0,
  time: 0,
  x: saved.x,
  y: saved.y,
  depth: saved.depth,
  heading: saved.heading,
  pitch: 0,
  roll: 0,
  speed: 0,
  targetDepth: saved.depth,
  researcherId: saved.researcherId,
  researcherName: saved.researcherName,
  discoveries: saved.discoveries,
  mappedRegions: saved.mappedRegions,
  distance: saved.distance,
  maxDepth: saved.maxDepth,
  activeCreatures: [],
  bubbles: [],
  motes: [],
  keys: new Set(),
  pointer: { active: false, x: 0, y: 0 },
  camera: {
    eye: [0, 0, 0],
    center: [0, 0, 1],
    view: m4Identity(),
    projection: m4Identity()
  },
  lastBiome: "Open Ocean",
  nearestCreatureId: null
};

const worldSeed = hashString(`unknown-ocean-${state.researcherId}`);
let renderer = null;
try {
  renderer = gl ? createRenderer(gl) : null;
  window.__unknownOceanStatus.boot = renderer ? "renderer-ready" : "webgl-unavailable";
} catch (error) {
  window.__unknownOceanStatus.boot = "renderer-error";
  window.__unknownOceanStatus.error = error && error.message ? error.message : String(error);
}
syncBootStatus();

setup();
requestAnimationFrame(loop);

function setup() {
  resize();
  window.addEventListener("resize", resize);
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", (event) => state.keys.delete(event.key.toLowerCase()));
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
  beginButton.addEventListener("click", beginExpedition);
  scanButton.addEventListener("click", performScan);
  diveButton.addEventListener("click", () => changeDepth(120));
  surfaceButton.addEventListener("click", () => changeDepth(-120));
  logButton.addEventListener("click", toggleLog);
  closeLog.addEventListener("click", closeResearchLog);
  photoButton.addEventListener("click", capturePhoto);
  saveSpeciesName.addEventListener("click", saveDiscoveryName);
  skipSpeciesName.addEventListener("click", closeDiscoveryModal);
  speciesNameInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") saveDiscoveryName();
  });

  ui.researcherName.textContent = state.researcherName;
  ui.eventPill.textContent = `${dailyEvent.name}: ${dailyEvent.tone}`;
  ui.eventPill.style.borderColor = colorWithAlpha(dailyEvent.accent, 0.36);
  ui.globalProgress.textContent = getGlobalProgress();
  syncHud();
  refreshDiscoveryList();

  if (!renderer) {
    showToast("WebGL is required for the 3D ocean.");
    app.classList.add("is-webgl-fallback");
  } else {
    app.classList.remove("is-webgl-fallback");
  }
  syncBootStatus();
}

function syncBootStatus() {
  if (!app || !window.__unknownOceanStatus) return;
  app.dataset.boot = window.__unknownOceanStatus.boot || "";
  app.dataset.frame = String(window.__unknownOceanStatus.frame || 0);
  app.dataset.error = window.__unknownOceanStatus.error || "";
}

function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  width = Math.max(1, Math.floor(window.innerWidth));
  height = Math.max(1, Math.floor(window.innerHeight));
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  if (renderer) renderer.resize(canvas.width, canvas.height);
}

function loop(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  try {
    state.time += dt;
    update(dt);
    render();
    window.__unknownOceanStatus.frame = (window.__unknownOceanStatus.frame || 0) + 1;
    if (window.__unknownOceanStatus.frame % 30 === 0) syncBootStatus();
  } catch (error) {
    window.__unknownOceanStatus.boot = "frame-error";
    window.__unknownOceanStatus.error = error && error.message ? error.message : String(error);
    syncBootStatus();
  }
  requestAnimationFrame(loop);
}

function update(dt) {
  if (state.started) {
    state.diveProgress = approach(state.diveProgress, 1, dt * 0.7);
    updateMovement(dt);
    updateAudio();
  } else {
    state.diveProgress = approach(state.diveProgress, 0, dt * 0.35);
    state.speed = approach(state.speed, 0, dt * 24);
  }

  state.depth = approach(state.depth, state.targetDepth, dt * (state.started ? 68 : 22));
  state.maxDepth = Math.max(state.maxDepth, Math.round(state.depth));
  state.pitch = approach(state.pitch, clamp((state.targetDepth - state.depth) / 120, -0.55, 0.62), dt * 1.8);
  state.roll = approach(state.roll, state.roll * 0.65, dt * 2.4);

  const biome = getBiomeAt(state.x, state.y, state.depth);
  if (biome !== state.lastBiome) {
    state.lastBiome = biome;
    if (state.started) showToast(biome);
  }

  if (state.started || state.diveProgress > 0.25) {
    updateCreatures(dt, biome);
    updateBubbles(dt);
    updateMotes(dt);
  }
  updateCamera();
  mapCurrentRegion();
  syncHud();
  scheduleSave();
}

function updateMovement(dt) {
  let turn = 0;
  let thrust = 0;
  let vertical = 0;

  if (state.keys.has("arrowleft") || state.keys.has("a")) turn -= 1;
  if (state.keys.has("arrowright") || state.keys.has("d")) turn += 1;
  if (state.keys.has("arrowup") || state.keys.has("w")) thrust += 1;
  if (state.keys.has("arrowdown") || state.keys.has("s")) thrust -= 0.42;
  if (state.keys.has(" ") || state.keys.has("shift")) vertical += 1;
  if (state.keys.has("control") || state.keys.has("c")) vertical -= 1;

  if (state.pointer.active) {
    const dx = (state.pointer.x - width / 2) / Math.max(width / 2, 1);
    const dy = (state.pointer.y - height / 2) / Math.max(height / 2, 1);
    turn += clamp(dx, -1, 1) * 0.75;
    vertical += clamp(dy, -0.9, 0.9) * 0.75;
    thrust += 0.45;
  }

  const oldHeading = state.heading;
  state.heading += turn * dt * 1.65;
  state.roll = approach(state.roll, clamp(-turn * 0.42, -0.55, 0.55), dt * 3.4);
  state.speed = approach(state.speed, clamp(thrust, -0.35, 1) * 54, dt * 42);
  state.targetDepth = clamp(state.targetDepth + vertical * 74 * dt, 0, 1420);

  const oldX = state.x;
  const oldY = state.y;
  state.x += Math.sin(state.heading) * state.speed * dt;
  state.y += Math.cos(state.heading) * state.speed * dt;
  state.distance += Math.hypot(state.x - oldX, state.y - oldY) / 1000;

  const turnDelta = wrapAngle(state.heading - oldHeading);
  if (Math.abs(turnDelta) > 0.001) {
    state.roll = clamp(state.roll - turnDelta * 8, -0.62, 0.62);
  }
}

function updateCamera() {
  const hero = heroPosition();
  const forward = headingForward(state.heading);
  const depthMix = clamp(state.depth / 1200, 0, 1);

  if (!state.started || state.diveProgress < 0.2) {
    const orbit = state.time * 0.05;
    const eye = [
      state.x + Math.sin(orbit) * 155,
      54,
      state.y - 135 + Math.cos(orbit) * 30
    ];
    const center = [state.x, 0, state.y + 28];
    state.camera.eye = eye;
    state.camera.center = center;
  } else {
    const back = 26 + depthMix * 8;
    const lift = 8 - depthMix * 3;
    const side = Math.sin(state.time * 0.42) * 2.5;
    const eye = [
      hero[0] - forward[0] * back + Math.cos(state.heading) * side,
      hero[1] + lift,
      hero[2] - forward[2] * back - Math.sin(state.heading) * side
    ];
    const center = [
      hero[0] + forward[0] * 20,
      hero[1] - 2 - depthMix * 4,
      hero[2] + forward[2] * 20
    ];
    const p = smoothstep(0.18, 1, state.diveProgress);
    state.camera.eye = [
      lerp(state.x - forward[0] * 44, eye[0], p),
      lerp(26, eye[1], p),
      lerp(state.y - forward[2] * 44, eye[2], p)
    ];
    state.camera.center = [
      lerp(state.x + forward[0] * 24, center[0], p),
      lerp(-state.depth * 0.15, center[1], p),
      lerp(state.y + forward[2] * 24, center[2], p)
    ];
  }

  state.camera.view = m4LookAt(state.camera.eye, state.camera.center, [0, 1, 0]);
  state.camera.projection = m4Perspective(58 * DEG, width / Math.max(1, height), 0.2, 1250);
}

function updateCreatures(dt, biome) {
  const desired = biome === "Open Ocean" ? 12 : biome === "Deep Abyss" ? 14 : 18;
  while (state.activeCreatures.length < desired) {
    state.activeCreatures.push(createCreatureNear(biome));
  }

  const hero = heroPosition();
  state.nearestCreatureId = null;
  let nearestDistance = Infinity;

  state.activeCreatures = state.activeCreatures.filter((creature) => {
    creature.age += dt;
    creature.wander += dt;
    creature.tail += dt * creature.pulseRate * (7 + creature.speed * 0.08);

    const toHero = vec3Sub(hero, [creature.x, creature.y, creature.z]);
    const distanceToHero = vec3Length(toHero);
    const avoid = distanceToHero < 38;
    const behaviorBias = creature.behavior === "Curious" || creature.behavior === "Friendly" ? 0.22 : 0;
    const shyBias = creature.behavior === "Shy" ? -0.4 : 0;
    const towardHeroYaw = Math.atan2(toHero[0], toHero[2]);
    const wanderYaw = creature.baseYaw + Math.sin(creature.wander * 0.55 + creature.seed) * creature.wanderAmount;
    let nextYaw = wanderYaw;
    if (avoid) {
      nextYaw = lerpAngle(wanderYaw, towardHeroYaw + Math.PI, 0.78);
    } else if (behaviorBias > 0) {
      nextYaw = lerpAngle(wanderYaw, towardHeroYaw, behaviorBias);
    } else if (shyBias < 0) {
      nextYaw = lerpAngle(wanderYaw, towardHeroYaw + Math.PI, Math.abs(shyBias));
    }

    creature.yaw = lerpAngle(creature.yaw, nextYaw, dt * 0.9);
    creature.pitch = approach(creature.pitch, Math.sin(creature.wander * 0.7 + creature.seed) * 0.18, dt * 0.8);
    creature.bank = approach(creature.bank, clamp(wrapAngle(nextYaw - creature.yaw) * -3, -0.55, 0.55), dt * 4);
    creature.speed = approach(creature.speed, creature.baseSpeed * (avoid ? 1.65 : 1), dt * 18);

    const f = headingForward(creature.yaw);
    creature.x += f[0] * creature.speed * dt;
    creature.z += f[2] * creature.speed * dt;
    creature.y += Math.sin(creature.wander * creature.verticalRate + creature.seed) * creature.verticalDrift * dt;

    const d = vec3Distance(hero, [creature.x, creature.y, creature.z]);
    if (d < nearestDistance) {
      nearestDistance = d;
      state.nearestCreatureId = creature.id;
    }

    return creature.age < creature.life && d < 360;
  });

  if (Math.random() < dt * 0.9 && state.activeCreatures.length < desired + 5) {
    state.activeCreatures.push(createCreatureNear(biome));
  }
}

function updateBubbles(dt) {
  const hero = heroPosition();
  if (state.started && Math.random() < dt * 24) {
    const side = (Math.random() - 0.5) * 7;
    const back = -4 - Math.random() * 6;
    const f = headingForward(state.heading);
    const r = [Math.cos(state.heading), 0, -Math.sin(state.heading)];
    state.bubbles.push({
      x: hero[0] - f[0] * back + r[0] * side,
      y: hero[1] + 1 + Math.random() * 3,
      z: hero[2] - f[2] * back + r[2] * side,
      r: 0.16 + Math.random() * 0.32,
      age: 0,
      life: 4 + Math.random() * 3,
      drift: -0.8 + Math.random() * 1.6
    });
  }

  state.bubbles = state.bubbles.filter((bubble) => {
    bubble.age += dt;
    bubble.y += (3.5 + bubble.r * 5) * dt;
    bubble.x += Math.sin(state.time * 1.5 + bubble.z) * bubble.drift * dt;
    bubble.z += Math.cos(state.time * 1.2 + bubble.x) * bubble.drift * dt;
    return bubble.age < bubble.life;
  });
}

function updateMotes(dt) {
  const hero = heroPosition();
  while (state.motes.length < 46) {
    state.motes.push({
      x: hero[0] + (Math.random() - 0.5) * 260,
      y: hero[1] + (Math.random() - 0.5) * 120,
      z: hero[2] + (Math.random() - 0.5) * 260,
      r: 0.06 + Math.random() * 0.12,
      phase: Math.random() * TWO_PI
    });
  }

  for (const mote of state.motes) {
    mote.y += Math.sin(state.time * 0.35 + mote.phase) * dt * 0.22;
    if (vec3Distance(hero, [mote.x, mote.y, mote.z]) > 190) {
      mote.x = hero[0] + (Math.random() - 0.5) * 260;
      mote.y = hero[1] + (Math.random() - 0.5) * 120;
      mote.z = hero[2] + (Math.random() - 0.5) * 260;
    }
  }
}

function render() {
  if (!renderer) return;
  const biome = getBiomeAt(state.x, state.y, state.depth);
  const palette = palettes[biome];

  renderer.beginFrame(palette, state.depth, state.camera);

  if (!state.started) {
    renderSurfaceScene(palette);
  } else {
    renderUnderwaterScene(biome, palette);
  }
}

function renderSurfaceScene(palette) {
  renderer.setFog(hexToRgb01("#84c7d4"), 150, 760);
  renderer.updateWaterMesh(state.x, state.y, state.time, false);
  renderer.drawMesh("water", m4Identity(), hexToRgb01("#1483a4"), 0.9, 0.05);
  renderer.drawMesh("sphere", m4FromTRS([state.x + 70, 76, state.y - 260], [0, 0, 0], [28, 28, 28]), hexToRgb01("#fff2bd"), 0.9, 0.2);

  const cloudColor = hexToRgb01("#eefbff");
  for (let i = 0; i < 8; i += 1) {
    const x = state.x - 170 + i * 48 + Math.sin(state.time * 0.08 + i) * 12;
    const z = state.y - 160 - i * 18;
    const y = 52 + (i % 3) * 8;
    renderer.drawMesh("sphere", m4FromTRS([x, y, z], [0, 0, 0], [20 + (i % 4) * 6, 4, 7]), cloudColor, 0.22, 0);
  }
}

function renderUnderwaterScene(biome, palette) {
  const depthMix = clamp(state.depth / 1250, 0, 1);
  renderer.setFog(hexToRgb01(mixHex(palette.mid, palette.bottom, depthMix * 0.7)), 58 - depthMix * 20, 360 - depthMix * 120);
  renderer.updateTerrainMesh(state.x, state.y, state.depth, state.time, biome);

  if (state.depth < 28) {
    renderer.updateWaterMesh(state.x, state.y, state.time, true);
    renderer.drawMesh("water", m4Identity(), hexToRgb01(palette.top), 0.12, 0.08);
  }

  renderer.drawMesh("terrain", m4Identity(), hexToRgb01(mixHex("#07171c", palette.bottom, 0.4)), 1, 0);
  renderLightColumns(palette, depthMix);
  renderBiomeProps(biome, palette);
  renderCreatures(palette);
  renderHero(palette);
  renderMotes(palette);
  renderBubbles(palette);

  if (dailyEvent.name === "Leviathan Migration") renderLeviathan3d(palette);
  if (dailyEvent.name === "Glowing Bloom") renderBloom3d();
}

function renderLightColumns(palette, depthMix) {
  if (depthMix > 0.82) return;
  const color = hexToRgb01(palette.glow);
  for (let i = 0; i < 7; i += 1) {
    const x = state.x - 120 + i * 40 + Math.sin(state.time * 0.15 + i) * 18;
    const z = state.y + 55 + i * 22;
    const y = -state.depth + 38 - i * 2;
    renderer.drawMesh(
      "beam",
      m4FromTRS([x, y, z], [0.12 + i * 0.03, 0, -0.22], [12, 95, 12]),
      color,
      0.09 * (1 - depthMix),
      0.18
    );
  }
}

function renderBiomeProps(biome, palette) {
  const hero = heroPosition();
  const cellSize = 22;
  const baseX = Math.floor(state.x / cellSize);
  const baseZ = Math.floor(state.y / cellSize);
  const colorFlora = hexToRgb01(palette.flora);
  const colorAccent = hexToRgb01(palette.accent);
  const colorGlow = hexToRgb01(palette.glow);

  for (let gx = -5; gx <= 5; gx += 1) {
    for (let gz = -5; gz <= 5; gz += 1) {
      const cx = baseX + gx;
      const cz = baseZ + gz;
      const seed = hashNumber(cx * 91493 + cz * 43117 + worldSeed);
      const rnd = mulberry32(seed);
      if (rnd() < (biome === "Open Ocean" ? 0.42 : 0.16)) continue;

      const px = cx * cellSize + (rnd() - 0.5) * cellSize;
      const pz = cz * cellSize + (rnd() - 0.5) * cellSize;
      const floor = terrainHeightAt(px, pz, state.depth, biome);
      if (vec3Distance(hero, [px, floor, pz]) > 175) continue;

      if (biome === "Kelp Forest") {
        const h = 12 + rnd() * 30;
        const sway = Math.sin(state.time * 0.8 + seed) * 0.16;
        renderer.drawMesh("cylinder", m4FromTRS([px, floor + h / 2, pz], [sway, 0, -sway * 0.5], [0.35, h / 2, 0.35]), colorFlora, 0.78, 0.02);
        for (let j = 0; j < 3; j += 1) {
          const ly = floor + h * (0.35 + j * 0.2);
          renderer.drawMesh("fin", m4FromTRS([px + Math.sin(j + seed) * 1.5, ly, pz], [0.4, state.time + j, 0.2], [2.2, 3.4, 1]), colorGlow, 0.42, 0.04);
        }
      } else if (biome === "Coral Kingdom") {
        const arms = 3 + Math.floor(rnd() * 4);
        for (let j = 0; j < arms; j += 1) {
          const a = (j / arms) * TWO_PI;
          const h = 2.8 + rnd() * 6;
          renderer.drawMesh("cylinder", m4FromTRS([px + Math.sin(a) * 1.5, floor + h / 2, pz + Math.cos(a) * 1.5], [0.35 * Math.sin(a), a, 0.35 * Math.cos(a)], [0.35, h / 2, 0.35]), j % 2 ? colorAccent : colorFlora, 0.9, 0.02);
        }
        renderer.drawMesh("sphere", m4FromTRS([px, floor + 1.2, pz], [0, 0, 0], [2.3, 1.2, 2.3]), colorGlow, 0.45, 0.04);
      } else if (biome === "Crystal Caves") {
        const h = 4 + rnd() * 14;
        renderer.drawMesh("cone", m4FromTRS([px, floor, pz], [0, rnd() * TWO_PI, 0], [2.4, h, 2.4]), rnd() > 0.5 ? colorGlow : colorAccent, 0.72, 0.24);
      } else if (biome === "Hydrothermal Fields") {
        const h = 5 + rnd() * 9;
        renderer.drawMesh("cylinder", m4FromTRS([px, floor + h / 2, pz], [0, 0, 0], [1.4, h / 2, 1.4]), hexToRgb01("#0b0d10"), 1, 0);
        renderer.drawMesh("sphere", m4FromTRS([px, floor + h + 1.3, pz], [0, 0, 0], [2.2, 0.5, 2.2]), colorAccent, 0.58, 0.24);
      } else if (biome === "Ancient Ruins") {
        const h = 6 + rnd() * 13;
        renderer.drawMesh("box", m4FromTRS([px, floor + h / 2, pz], [0, rnd() * TWO_PI, 0], [2.5, h, 2.5]), hexToRgb01("#283942"), 0.95, 0);
        if (rnd() > 0.62) {
          renderer.drawMesh("box", m4FromTRS([px, floor + h + 0.8, pz], [0, rnd() * TWO_PI, 0], [5.6, 1, 2.5]), hexToRgb01("#4d524c"), 0.72, 0.02);
        }
      } else if (biome === "Frozen Ocean") {
        const h = 4 + rnd() * 11;
        renderer.drawMesh("cone", m4FromTRS([px, floor, pz], [0, rnd() * TWO_PI, 0], [2.1, h, 2.1]), colorGlow, 0.5, 0.12);
      } else if (biome === "Deep Abyss") {
        renderer.drawMesh("sphere", m4FromTRS([px, floor + 1.6, pz], [0, 0, 0], [1.2, 1.2, 1.2]), colorGlow, 0.45, 0.42);
      } else {
        renderer.drawMesh("sphere", m4FromTRS([px, floor + 0.6, pz], [0, 0, 0], [2 + rnd() * 5, 0.8, 2 + rnd() * 4]), hexToRgb01("#102b35"), 0.7, 0);
      }
    }
  }
}

function renderCreatures(palette) {
  const sorted = [...state.activeCreatures].sort((a, b) => vec3Distance(state.camera.eye, [b.x, b.y, b.z]) - vec3Distance(state.camera.eye, [a.x, a.y, a.z]));
  for (const creature of sorted) {
    drawCreature3d(creature, palette);
  }
}

function drawCreature3d(creature, palette) {
  const bodyColor = colorToRgb01(creature.color);
  const finColor = colorToRgb01(creature.secondary);
  const glowColor = creature.glow > 0.5 ? finColor : hexToRgb01(palette.glow);
  const s = creature.size * 0.46;
  const parent = m4FromTRS(
    [creature.x, creature.y + Math.sin(state.time * 1.2 + creature.seed) * 0.15, creature.z],
    [creature.pitch, creature.yaw, creature.bank],
    [1, 1, 1]
  );
  const body = m4Multiply(parent, m4FromTRS([0, 0, 0], [0, 0, 0], [s * 0.58, s * creature.height, s * creature.length]));
  renderer.drawMesh("sphere", body, bodyColor, creature.alpha, creature.glow * 0.12);

  const flap = Math.sin(creature.tail) * (0.55 + creature.glow * 0.22);
  const tail = m4Multiply(parent, m4FromTRS([0, 0, -s * creature.length * 0.98], [0, flap, 0], [s * 0.62, s * 0.58, s * 0.18]));
  renderer.drawMesh("tail", tail, finColor, creature.alpha * 0.92, creature.glow * 0.12);

  const topFin = m4Multiply(parent, m4FromTRS([0, s * creature.height * 0.86, -s * 0.08], [0.15, 0, 0], [s * 0.45, s * creature.finSize, s * 0.45]));
  renderer.drawMesh("fin", topFin, finColor, creature.alpha * 0.86, creature.glow * 0.08);

  const leftFin = m4Multiply(parent, m4FromTRS([-s * 0.5, -s * 0.03, s * 0.05], [0.15, 0.15, 1.12 + flap * 0.18], [s * 0.42, s * creature.finSize, s * 0.34]));
  const rightFin = m4Multiply(parent, m4FromTRS([s * 0.5, -s * 0.03, s * 0.05], [0.15, -0.15, -1.12 - flap * 0.18], [s * 0.42, s * creature.finSize, s * 0.34]));
  renderer.drawMesh("fin", leftFin, finColor, creature.alpha * 0.72, creature.glow * 0.07);
  renderer.drawMesh("fin", rightFin, finColor, creature.alpha * 0.72, creature.glow * 0.07);

  const eyeCount = Math.min(2, creature.eyeCount);
  for (let i = 0; i < eyeCount; i += 1) {
    const side = eyeCount === 1 ? 0 : i === 0 ? -1 : 1;
    const eye = m4Multiply(parent, m4FromTRS([side * s * 0.22, s * 0.16, s * creature.length * 0.72], [0, 0, 0], [s * 0.08, s * 0.08, s * 0.08]));
    renderer.drawMesh("sphere", eye, hexToRgb01("#f7feff"), creature.alpha, 0.12);
  }

  if (creature.glow > 0.46) {
    const halo = m4Multiply(parent, m4FromTRS([0, 0, 0], [0, 0, 0], [s * 1.1, s * 0.7, s * 1.5]));
    renderer.drawMesh("sphere", halo, glowColor, creature.glow * 0.13, creature.glow * 0.45);
  }
}

function renderHero(palette) {
  if (!state.started || state.diveProgress < 0.36) return;

  const hero = heroPosition();
  const bob = Math.sin(state.time * 4.2 + state.speed * 0.05) * 0.35;
  const kick = Math.sin(state.time * 8 + state.speed * 0.1);
  const parent = m4FromTRS([hero[0], hero[1] + bob, hero[2]], [state.pitch * 0.65, state.heading, state.roll], [2.05, 2.05, 2.05]);
  const suit = hexToRgb01("#101820");
  const suitSoft = hexToRgb01("#1f3b4a");
  const accent = hexToRgb01(palette.glow);

  renderer.drawMesh("sphere", m4Multiply(parent, m4FromTRS([0, 0.8, 0.65], [0, 0, 0], [1.1, 1.1, 1.1])), hexToRgb01("#dffaff"), 0.34, 0.18);
  renderer.drawMesh("sphere", m4Multiply(parent, m4FromTRS([0, -0.25, 0], [0.08, 0, 0], [0.92, 1.35, 0.58])), suit, 1, 0);
  renderer.drawMesh("sphere", m4Multiply(parent, m4FromTRS([0, -0.12, 0.38], [0, 0, 0], [0.55, 0.46, 0.16])), accent, 0.85, 0.18);

  renderer.drawMesh("cylinder", m4Multiply(parent, m4FromTRS([-0.55, -0.15, -0.72], [0, 0, 0], [0.23, 1.15, 0.23])), hexToRgb01("#c6d4d8"), 0.9, 0.02);
  renderer.drawMesh("cylinder", m4Multiply(parent, m4FromTRS([0.55, -0.15, -0.72], [0, 0, 0], [0.23, 1.15, 0.23])), hexToRgb01("#c6d4d8"), 0.9, 0.02);

  renderer.drawMesh("cylinder", m4Multiply(parent, m4FromTRS([-1.02, -0.18, 0.05], [0.7 + kick * 0.18, 0, 0.45], [0.13, 1.0, 0.13])), suitSoft, 1, 0);
  renderer.drawMesh("cylinder", m4Multiply(parent, m4FromTRS([1.02, -0.18, 0.05], [0.7 - kick * 0.18, 0, -0.45], [0.13, 1.0, 0.13])), suitSoft, 1, 0);

  renderer.drawMesh("cylinder", m4Multiply(parent, m4FromTRS([-0.42, -1.48, -0.05], [0.45 + kick * 0.32, 0, 0.12], [0.16, 1.05, 0.16])), suit, 1, 0);
  renderer.drawMesh("cylinder", m4Multiply(parent, m4FromTRS([0.42, -1.48, -0.05], [0.45 - kick * 0.32, 0, -0.12], [0.16, 1.05, 0.16])), suit, 1, 0);
  renderer.drawMesh("fin", m4Multiply(parent, m4FromTRS([-0.48, -2.48, -0.12], [1.45 + kick * 0.34, 0, 0.05], [0.48, 0.9, 0.22])), accent, 0.78, 0.08);
  renderer.drawMesh("fin", m4Multiply(parent, m4FromTRS([0.48, -2.48, -0.12], [1.45 - kick * 0.34, 0, -0.05], [0.48, 0.9, 0.22])), accent, 0.78, 0.08);

  renderer.drawMesh("sphere", m4Multiply(parent, m4FromTRS([0, 0.9, 1.22], [0, 0, 0], [0.18, 0.18, 0.18])), accent, 0.92, 0.7);
  renderer.drawMesh("beam", m4Multiply(parent, m4FromTRS([0, 0.75, 4.5], [Math.PI / 2, 0, 0], [0.28, 4.2, 0.28])), accent, 0.18, 0.9);
}

function renderMotes(palette) {
  const color = hexToRgb01(palette.glow);
  for (const mote of state.motes) {
    const alpha = 0.12 + Math.sin(state.time + mote.phase) * 0.04;
    renderer.drawMesh("sphere", m4FromTRS([mote.x, mote.y, mote.z], [0, 0, 0], [mote.r, mote.r, mote.r]), color, alpha, 0.28);
  }
}

function renderBubbles(palette) {
  const color = hexToRgb01("#dffaff");
  for (const bubble of state.bubbles) {
    const a = 1 - bubble.age / bubble.life;
    renderer.drawMesh("sphere", m4FromTRS([bubble.x, bubble.y, bubble.z], [0, 0, 0], [bubble.r, bubble.r, bubble.r]), color, a * 0.38, 0.1);
  }
}

function renderLeviathan3d() {
  const hero = heroPosition();
  const t = state.time * 0.08;
  const x = hero[0] + Math.sin(t) * 170;
  const y = hero[1] + 40 + Math.sin(t * 0.7) * 8;
  const z = hero[2] - 210 + Math.cos(t) * 70;
  const parent = m4FromTRS([x, y, z], [0.02, t + Math.PI * 0.5, 0.03], [1, 1, 1]);
  const color = hexToRgb01("#bfefff");
  renderer.drawMesh("sphere", m4Multiply(parent, m4FromTRS([0, 0, 0], [0, 0, 0], [18, 5, 54])), color, 0.13, 0.18);
  renderer.drawMesh("tail", m4Multiply(parent, m4FromTRS([0, 0, -58], [0, Math.sin(state.time * 0.7) * 0.28, 0], [20, 13, 8])), color, 0.1, 0.12);
}

function renderBloom3d() {
  const hero = heroPosition();
  const color = hexToRgb01(dailyEvent.accent);
  for (let i = 0; i < 42; i += 1) {
    const seed = hashNumber(i * 1249 + worldSeed);
    const x = hero[0] + ((seed % 1000) / 1000 - 0.5) * 210;
    const y = hero[1] + Math.sin(state.time * 0.35 + i) * 20 + ((hashNumber(seed + 8) % 1000) / 1000 - 0.5) * 90;
    const z = hero[2] + ((hashNumber(seed + 17) % 1000) / 1000 - 0.5) * 210;
    renderer.drawMesh("sphere", m4FromTRS([x, y, z], [0, 0, 0], [0.7, 0.38, 0.7]), color, 0.22, 0.45);
  }
}

function createCreatureNear(biome) {
  const hero = heroPosition();
  const angle = Math.random() < 0.82 ? state.heading + (Math.random() - 0.5) * 1.8 : state.heading + Math.PI + (Math.random() - 0.5) * TWO_PI;
  const distance = 24 + Math.random() * 105;
  const x = hero[0] + Math.sin(angle) * distance;
  const z = hero[2] + Math.cos(angle) * distance;
  const y = hero[1] + (Math.random() - 0.35) * 38;
  const species = generateSpecies(Math.round(x / 120), Math.round(z / 120), Math.round(Math.max(0, -y) / 90), biome);
  const baseYaw = angle + Math.PI + (Math.random() - 0.5) * 0.8;
  const behaviorBoost = species.behavior === "Predator" ? 1.4 : species.behavior === "Shy" ? 1.18 : 1;

  return {
    ...species,
    x,
    y,
    z,
    yaw: baseYaw,
    baseYaw,
    pitch: 0,
    bank: 0,
    speed: 8 + Math.random() * 20,
    baseSpeed: (7 + Math.random() * 20) * behaviorBoost,
    age: 0,
    life: 42 + Math.random() * 55,
    alpha: 0.72 + Math.random() * 0.26,
    tail: Math.random() * TWO_PI,
    wander: Math.random() * 100,
    wanderAmount: 0.25 + Math.random() * 0.75,
    verticalRate: 0.45 + Math.random() * 0.9,
    verticalDrift: 0.7 + Math.random() * 2.2
  };
}

function performScan() {
  if (!state.started) return;

  const biome = getBiomeAt(state.x, state.y, state.depth);
  const nearby = getNearestCreature();
  const species = nearby || generateSpecies(Math.round(state.x / 120), Math.round(state.y / 120), Math.max(0, Math.round(state.depth / 90)), biome);

  if (state.discoveries[species.id]) {
    showToast(`${state.discoveries[species.id].name || species.suggestedName} already recorded here.`);
    return;
  }

  const discovery = {
    ...species,
    name: "",
    x: Math.round(state.x),
    y: Math.round(state.y),
    depth: Math.round(state.depth),
    temperature: getTemperature(biome, state.depth),
    event: dailyEvent.name
  };

  state.discoveries[species.id] = discovery;
  pendingDiscovery = discovery;
  openDiscoveryModal(discovery);
  refreshDiscoveryList();
  saveState();
}

function getNearestCreature() {
  const hero = heroPosition();
  let best = null;
  let bestDistance = Infinity;
  for (const creature of state.activeCreatures) {
    const d = vec3Distance(hero, [creature.x, creature.y, creature.z]);
    if (d < bestDistance) {
      bestDistance = d;
      best = creature;
    }
  }
  return bestDistance < 115 ? best : null;
}

function generateSpecies(cellX, cellY, depthBand, biome) {
  const seed = hashString(`${worldSeed}:${cellX}:${cellY}:${depthBand}:${biome}`);
  const rnd = mulberry32(seed);
  const hue = Math.floor(rnd() * 360);
  const secondaryHue = (hue + 80 + Math.floor(rnd() * 130)) % 360;
  const id = `AQ-${String(seed % 100000).padStart(5, "0")}`;
  const behavior = behaviors[Math.floor(rnd() * behaviors.length)];
  const suggestedName = `${namePartsA[Math.floor(rnd() * namePartsA.length)]} ${namePartsB[Math.floor(rnd() * namePartsB.length)]}`;

  return {
    id,
    cellX,
    cellY,
    depthBand,
    biome,
    behavior,
    suggestedName,
    discoverer: state.researcherName,
    date: new Date().toISOString(),
    seed,
    color: `hsl(${hue}, 72%, ${Math.round(48 + rnd() * 18)}%)`,
    secondary: `hsl(${secondaryHue}, 80%, ${Math.round(58 + rnd() * 16)}%)`,
    glow: rnd(),
    length: 0.85 + rnd() * 1.7,
    height: 0.45 + rnd() * 0.46,
    finSize: 0.38 + rnd() * 0.52,
    finCount: 1 + Math.floor(rnd() * 4),
    eyeCount: 1 + Math.floor(rnd() * 4),
    size: 2.9 + rnd() * 5.5 + (biome === "Deep Abyss" ? rnd() * 5.5 : 0),
    pulseRate: 0.7 + rnd() * 1.7
  };
}

function openDiscoveryModal(discovery) {
  ui.speciesTitle.textContent = discovery.name || "Unknown Species";
  ui.speciesId.textContent = discovery.id;
  ui.speciesBiome.textContent = discovery.biome;
  ui.speciesDepth.textContent = `${discovery.depth}m`;
  ui.speciesBehavior.textContent = discovery.behavior;
  speciesNameInput.value = discovery.name || "";
  speciesNameInput.placeholder = discovery.suggestedName;
  discoveryModal.classList.add("is-open");
  discoveryModal.setAttribute("aria-hidden", "false");
  drawSpeciesPreview(discovery);
  setTimeout(() => speciesNameInput.focus(), 120);
}

function closeDiscoveryModal() {
  discoveryModal.classList.remove("is-open");
  discoveryModal.setAttribute("aria-hidden", "true");
  if (pendingDiscovery) showToast(`${pendingDiscovery.id} added to the encyclopedia.`);
  pendingDiscovery = null;
}

function saveDiscoveryName() {
  if (!pendingDiscovery) return;
  const clean = speciesNameInput.value.trim().replace(/\s+/g, " ").slice(0, 34);
  const finalName = clean || pendingDiscovery.suggestedName;
  pendingDiscovery.name = finalName;
  state.discoveries[pendingDiscovery.id] = pendingDiscovery;
  ui.speciesTitle.textContent = finalName;
  refreshDiscoveryList();
  saveState();
  showToast(`${finalName} is now part of the ocean record.`);
  closeDiscoveryModal();
}

function drawSpeciesPreview(discovery) {
  const w = speciesPreview.width;
  const h = speciesPreview.height;
  const palette = palettes[discovery.biome] || palettes["Open Ocean"];
  previewCtx.clearRect(0, 0, w, h);
  const bg = previewCtx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, palette.mid);
  bg.addColorStop(1, palette.bottom);
  previewCtx.fillStyle = bg;
  previewCtx.fillRect(0, 0, w, h);

  previewCtx.save();
  previewCtx.globalCompositeOperation = "screen";
  previewCtx.globalAlpha = 0.22;
  previewCtx.fillStyle = palette.glow;
  previewCtx.beginPath();
  previewCtx.ellipse(w / 2, h / 2, 130, 76, 0, 0, TWO_PI);
  previewCtx.fill();
  previewCtx.restore();

  const color = discovery.color;
  const secondary = discovery.secondary;
  const cx = w / 2;
  const cy = h / 2;
  const size = Math.min(58, discovery.size * 8);
  const flap = Math.sin(state.time * 6 + discovery.seed) * 18;

  previewCtx.save();
  previewCtx.translate(cx, cy);
  previewCtx.fillStyle = secondary;
  previewCtx.beginPath();
  previewCtx.moveTo(-size * 1.2, 0);
  previewCtx.lineTo(-size * 1.95, -size * 0.55 + flap * 0.2);
  previewCtx.lineTo(-size * 1.8, size * 0.55 + flap * 0.2);
  previewCtx.closePath();
  previewCtx.fill();

  previewCtx.fillStyle = color;
  previewCtx.beginPath();
  previewCtx.ellipse(0, 0, size * discovery.length, size * discovery.height, 0, 0, TWO_PI);
  previewCtx.fill();

  previewCtx.fillStyle = colorWithAlpha(secondary, 0.82);
  previewCtx.beginPath();
  previewCtx.ellipse(-size * 0.1, -size * discovery.height * 0.85, size * 0.22, size * discovery.finSize, -0.15, 0, TWO_PI);
  previewCtx.fill();

  previewCtx.fillStyle = "#f7feff";
  previewCtx.beginPath();
  previewCtx.arc(size * discovery.length * 0.68, -size * 0.12, size * 0.08, 0, TWO_PI);
  previewCtx.fill();
  previewCtx.fillStyle = "#07151a";
  previewCtx.beginPath();
  previewCtx.arc(size * discovery.length * 0.7, -size * 0.12, size * 0.035, 0, TWO_PI);
  previewCtx.fill();
  previewCtx.restore();
}

function refreshDiscoveryList() {
  const discoveries = Object.values(state.discoveries).sort((a, b) => new Date(b.date) - new Date(a.date));
  ui.speciesCount.textContent = discoveries.length;
  ui.discoveryList.innerHTML = "";

  if (!discoveries.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "No species recorded yet.";
    ui.discoveryList.appendChild(empty);
    return;
  }

  for (const discovery of discoveries.slice(0, 24)) {
    const item = document.createElement("button");
    item.className = "discovery-item";
    item.type = "button";
    item.style.setProperty("--swatch", discovery.color);
    item.innerHTML = `
      <span class="discovery-item__swatch" aria-hidden="true"></span>
      <span>
        <strong>${escapeHtml(discovery.name || discovery.suggestedName || discovery.id)}</strong>
        <span>${escapeHtml(discovery.id)} / ${escapeHtml(discovery.biome)} / ${discovery.depth}m</span>
      </span>
    `;
    item.addEventListener("click", () => {
      pendingDiscovery = discovery;
      openDiscoveryModal(discovery);
    });
    ui.discoveryList.appendChild(item);
  }
}

function syncHud() {
  ui.coordX.textContent = Math.round(state.x).toLocaleString();
  ui.coordY.textContent = Math.round(state.y).toLocaleString();
  ui.coordDepth.textContent = `${Math.round(state.depth)}m`;
  ui.biomeName.textContent = getBiomeAt(state.x, state.y, state.depth);
  ui.regionCount.textContent = Object.keys(state.mappedRegions).length.toLocaleString();
  ui.distanceCount.textContent = `${state.distance.toFixed(1)}km`;
  ui.maxDepthCount.textContent = `${Math.round(state.maxDepth)}m`;
}

function toggleLog() {
  const isOpen = researchLog.classList.toggle("is-open");
  researchLog.setAttribute("aria-hidden", String(!isOpen));
  if (isOpen) refreshDiscoveryList();
}

function closeResearchLog() {
  researchLog.classList.remove("is-open");
  researchLog.setAttribute("aria-hidden", "true");
}

function beginExpedition() {
  state.started = true;
  app.classList.remove("is-landing");
  app.classList.add("has-started");
  state.targetDepth = Math.max(state.targetDepth, 42);
  ensureAudio();
  showToast("Expedition started.");
}

function changeDepth(delta) {
  if (!state.started) beginExpedition();
  state.targetDepth = clamp(state.targetDepth + delta, 0, 1420);
}

function capturePhoto() {
  if (!state.started) return;
  shutter.classList.remove("is-flashing");
  void shutter.offsetWidth;
  shutter.classList.add("is-flashing");

  const link = document.createElement("a");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  link.download = `unknown-ocean-${Math.round(state.x)}-${Math.round(state.y)}-${Math.round(state.depth)}m-${stamp}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
  showToast("Photograph captured.");
}

function onKeyDown(event) {
  const key = event.key.toLowerCase();
  if (["arrowup", "arrowdown", "arrowleft", "arrowright", " ", "control"].includes(key)) {
    event.preventDefault();
  }
  if (key === "l") toggleLog();
  if (key === "p") capturePhoto();
  if (key === "e") performScan();
  state.keys.add(key);
}

function onPointerDown(event) {
  if (!state.started) return;
  state.pointer.active = true;
  state.pointer.x = event.clientX;
  state.pointer.y = event.clientY;
  canvas.setPointerCapture?.(event.pointerId);
}

function onPointerMove(event) {
  if (!state.pointer.active) return;
  state.pointer.x = event.clientX;
  state.pointer.y = event.clientY;
}

function onPointerUp() {
  state.pointer.active = false;
}

function createRenderer(context) {
  const vertex = `
    precision mediump float;
    attribute vec3 aPosition;
    attribute vec3 aNormal;
    uniform mat4 uProjection;
    uniform mat4 uView;
    uniform mat4 uModel;
    uniform vec3 uColor;
    uniform vec3 uLight;
    uniform vec3 uFogColor;
    uniform float uFogNear;
    uniform float uFogFar;
    uniform float uGlow;
    varying vec3 vColor;
    varying float vFog;
    varying float vLight;
    void main() {
      vec4 worldPosition = uModel * vec4(aPosition, 1.0);
      vec4 viewPosition = uView * worldPosition;
      vec3 normal = normalize(mat3(uModel) * aNormal);
      float diffuse = max(dot(normal, normalize(uLight)), 0.0);
      vLight = 0.34 + diffuse * 0.66 + uGlow;
      vColor = uColor;
      vFog = smoothstep(uFogNear, uFogFar, length(viewPosition.xyz));
      gl_Position = uProjection * viewPosition;
    }
  `;
  const fragment = `
    precision mediump float;
    uniform vec3 uFogColor;
    uniform float uAlpha;
    uniform float uGlow;
    varying vec3 vColor;
    varying float vFog;
    varying float vLight;
    void main() {
      vec3 lit = vColor * vLight + vColor * uGlow * 0.45;
      vec3 color = mix(lit, uFogColor, vFog);
      gl_FragColor = vec4(color, uAlpha);
    }
  `;
  const program = createProgram(context, vertex, fragment);
  context.useProgram(program);

  const rendererState = {
    gl: context,
    program,
    locations: {
      aPosition: context.getAttribLocation(program, "aPosition"),
      aNormal: context.getAttribLocation(program, "aNormal"),
      uProjection: context.getUniformLocation(program, "uProjection"),
      uView: context.getUniformLocation(program, "uView"),
      uModel: context.getUniformLocation(program, "uModel"),
      uColor: context.getUniformLocation(program, "uColor"),
      uLight: context.getUniformLocation(program, "uLight"),
      uFogColor: context.getUniformLocation(program, "uFogColor"),
      uFogNear: context.getUniformLocation(program, "uFogNear"),
      uFogFar: context.getUniformLocation(program, "uFogFar"),
      uAlpha: context.getUniformLocation(program, "uAlpha"),
      uGlow: context.getUniformLocation(program, "uGlow")
    },
    meshes: {},
    fogColor: [0.04, 0.18, 0.25],
    fogNear: 60,
    fogFar: 340
  };

  context.enable(context.DEPTH_TEST);
  context.depthFunc(context.LEQUAL);
  context.enable(context.BLEND);
  context.blendFunc(context.SRC_ALPHA, context.ONE_MINUS_SRC_ALPHA);
  context.disable(context.CULL_FACE);

  rendererState.meshes.sphere = uploadMesh(context, createSphereMesh(18, 12), false);
  rendererState.meshes.cylinder = uploadMesh(context, createCylinderMesh(18), false);
  rendererState.meshes.cone = uploadMesh(context, createConeMesh(18), false);
  rendererState.meshes.box = uploadMesh(context, createBoxMesh(), false);
  rendererState.meshes.tail = uploadMesh(context, createTailMesh(), false);
  rendererState.meshes.fin = uploadMesh(context, createFinMesh(), false);
  rendererState.meshes.beam = uploadMesh(context, createCylinderMesh(10), false);
  rendererState.meshes.terrain = uploadMesh(context, createGridMesh(42, 16), true);
  rendererState.meshes.water = uploadMesh(context, createGridMesh(34, 18), true);

  return {
    resize(w, h) {
      context.viewport(0, 0, w, h);
    },
    beginFrame(palette, depth, camera) {
      const depthMix = clamp(depth / 1300, 0, 1);
      const clear = state.started && state.diveProgress > 0.45 ? hexToRgb01(mixHex(palette.mid, palette.bottom, depthMix)) : hexToRgb01("#8bc8d8");
      context.clearColor(clear[0], clear[1], clear[2], 1);
      context.clear(context.COLOR_BUFFER_BIT | context.DEPTH_BUFFER_BIT);
      context.useProgram(program);
      context.uniformMatrix4fv(rendererState.locations.uProjection, false, camera.projection);
      context.uniformMatrix4fv(rendererState.locations.uView, false, camera.view);
      context.uniform3fv(rendererState.locations.uLight, new Float32Array([-0.28, 0.84, 0.48]));
      context.uniform3fv(rendererState.locations.uFogColor, new Float32Array(rendererState.fogColor));
      context.uniform1f(rendererState.locations.uFogNear, rendererState.fogNear);
      context.uniform1f(rendererState.locations.uFogFar, rendererState.fogFar);
    },
    setFog(color, near, far) {
      rendererState.fogColor = color;
      rendererState.fogNear = near;
      rendererState.fogFar = far;
      context.uniform3fv(rendererState.locations.uFogColor, new Float32Array(color));
      context.uniform1f(rendererState.locations.uFogNear, near);
      context.uniform1f(rendererState.locations.uFogFar, far);
    },
    updateTerrainMesh(x, z, depth, time, biome) {
      updateGridMesh(rendererState.meshes.terrain, (px, pz) => {
        const wx = x + px;
        const wz = z + pz;
        return [wx, terrainHeightAt(wx, wz, depth, biome), wz];
      });
    },
    updateWaterMesh(x, z, time, below) {
      updateGridMesh(rendererState.meshes.water, (px, pz) => {
        const wx = x + px;
        const wz = z + pz;
        const wave = Math.sin(wx * 0.035 + time * 0.8) * 1.2 + Math.cos(wz * 0.028 - time * 0.7) * 0.8;
        return [wx, below ? 0 : wave, wz];
      });
    },
    drawMesh(name, model, color, alpha = 1, glow = 0) {
      const mesh = rendererState.meshes[name];
      if (!mesh) return;
      context.bindBuffer(context.ARRAY_BUFFER, mesh.positionBuffer);
      context.enableVertexAttribArray(rendererState.locations.aPosition);
      context.vertexAttribPointer(rendererState.locations.aPosition, 3, context.FLOAT, false, 0, 0);
      context.bindBuffer(context.ARRAY_BUFFER, mesh.normalBuffer);
      context.enableVertexAttribArray(rendererState.locations.aNormal);
      context.vertexAttribPointer(rendererState.locations.aNormal, 3, context.FLOAT, false, 0, 0);
      context.bindBuffer(context.ELEMENT_ARRAY_BUFFER, mesh.indexBuffer);
      context.uniformMatrix4fv(rendererState.locations.uModel, false, model);
      context.uniform3fv(rendererState.locations.uColor, new Float32Array(color));
      context.uniform1f(rendererState.locations.uAlpha, alpha);
      context.uniform1f(rendererState.locations.uGlow, glow);
      context.depthMask(alpha > 0.48);
      context.drawElements(context.TRIANGLES, mesh.indexCount, context.UNSIGNED_SHORT, 0);
      context.depthMask(true);
    }
  };
}

function createShader(context, type, source) {
  const shader = context.createShader(type);
  context.shaderSource(shader, source);
  context.compileShader(shader);
  if (!context.getShaderParameter(shader, context.COMPILE_STATUS)) {
    throw new Error(context.getShaderInfoLog(shader) || "Shader compile failed.");
  }
  return shader;
}

function createProgram(context, vertex, fragment) {
  const program = context.createProgram();
  context.attachShader(program, createShader(context, context.VERTEX_SHADER, vertex));
  context.attachShader(program, createShader(context, context.FRAGMENT_SHADER, fragment));
  context.linkProgram(program);
  if (!context.getProgramParameter(program, context.LINK_STATUS)) {
    throw new Error(context.getProgramInfoLog(program) || "Program link failed.");
  }
  return program;
}

function uploadMesh(context, mesh, dynamic) {
  const positionBuffer = context.createBuffer();
  context.bindBuffer(context.ARRAY_BUFFER, positionBuffer);
  context.bufferData(context.ARRAY_BUFFER, mesh.positions, dynamic ? context.DYNAMIC_DRAW : context.STATIC_DRAW);
  const normalBuffer = context.createBuffer();
  context.bindBuffer(context.ARRAY_BUFFER, normalBuffer);
  context.bufferData(context.ARRAY_BUFFER, mesh.normals, dynamic ? context.DYNAMIC_DRAW : context.STATIC_DRAW);
  const indexBuffer = context.createBuffer();
  context.bindBuffer(context.ELEMENT_ARRAY_BUFFER, indexBuffer);
  context.bufferData(context.ELEMENT_ARRAY_BUFFER, mesh.indices, context.STATIC_DRAW);
  return {
    ...mesh,
    positionBuffer,
    normalBuffer,
    indexBuffer,
    indexCount: mesh.indices.length,
    dynamic
  };
}

function updateGridMesh(mesh, sampler) {
  const positions = mesh.positions;
  const normals = mesh.normals;
  for (let i = 0; i < mesh.base.length; i += 1) {
    const base = mesh.base[i];
    const p = sampler(base[0], base[1]);
    const o = i * 3;
    positions[o] = p[0];
    positions[o + 1] = p[1];
    positions[o + 2] = p[2];
    normals[o] = 0;
    normals[o + 1] = 1;
    normals[o + 2] = 0;
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, mesh.positionBuffer);
  gl.bufferSubData(gl.ARRAY_BUFFER, 0, positions);
  gl.bindBuffer(gl.ARRAY_BUFFER, mesh.normalBuffer);
  gl.bufferSubData(gl.ARRAY_BUFFER, 0, normals);
}

function createSphereMesh(segments, rings) {
  const positions = [];
  const normals = [];
  const indices = [];
  for (let y = 0; y <= rings; y += 1) {
    const v = y / rings;
    const theta = v * Math.PI;
    const sy = Math.cos(theta);
    const sr = Math.sin(theta);
    for (let x = 0; x <= segments; x += 1) {
      const u = x / segments;
      const phi = u * TWO_PI;
      const px = Math.cos(phi) * sr;
      const pz = Math.sin(phi) * sr;
      positions.push(px, sy, pz);
      normals.push(px, sy, pz);
    }
  }
  for (let y = 0; y < rings; y += 1) {
    for (let x = 0; x < segments; x += 1) {
      const a = y * (segments + 1) + x;
      const b = a + segments + 1;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  return typedMesh(positions, normals, indices);
}

function createCylinderMesh(segments) {
  const positions = [];
  const normals = [];
  const indices = [];
  for (let i = 0; i <= segments; i += 1) {
    const a = (i / segments) * TWO_PI;
    const x = Math.cos(a);
    const z = Math.sin(a);
    positions.push(x, -1, z, x, 1, z);
    normals.push(x, 0, z, x, 0, z);
  }
  for (let i = 0; i < segments; i += 1) {
    const a = i * 2;
    indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  return typedMesh(positions, normals, indices);
}

function createConeMesh(segments) {
  const positions = [0, 1, 0];
  const normals = [0, 1, 0];
  for (let i = 0; i <= segments; i += 1) {
    const a = (i / segments) * TWO_PI;
    const x = Math.cos(a);
    const z = Math.sin(a);
    positions.push(x, 0, z);
    normals.push(x * 0.6, 0.72, z * 0.6);
  }
  const indices = [];
  for (let i = 1; i <= segments; i += 1) {
    indices.push(0, i, i + 1);
  }
  return typedMesh(positions, normals, indices);
}

function createBoxMesh() {
  const p = [
    -1, -1, 1, 1, -1, 1, 1, 1, 1, -1, 1, 1,
    1, -1, -1, -1, -1, -1, -1, 1, -1, 1, 1, -1,
    -1, 1, 1, 1, 1, 1, 1, 1, -1, -1, 1, -1,
    -1, -1, -1, 1, -1, -1, 1, -1, 1, -1, -1, 1,
    1, -1, 1, 1, -1, -1, 1, 1, -1, 1, 1, 1,
    -1, -1, -1, -1, -1, 1, -1, 1, 1, -1, 1, -1
  ];
  const n = [
    0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1,
    0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1,
    0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,
    0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0,
    1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0,
    -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0
  ];
  const idx = [];
  for (let f = 0; f < 6; f += 1) {
    const o = f * 4;
    idx.push(o, o + 1, o + 2, o, o + 2, o + 3);
  }
  return typedMesh(p, n, idx);
}

function createTailMesh() {
  const positions = [0, 1, 0, 1, 0, 0, 0, -1, 0, -1, 0, 0];
  const normals = [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1];
  const indices = [0, 1, 2, 0, 2, 3];
  return typedMesh(positions, normals, indices);
}

function createFinMesh() {
  const positions = [0, 1, 0, 0.7, -0.65, 0, -0.7, -0.65, 0];
  const normals = [0, 0, 1, 0, 0, 1, 0, 0, 1];
  const indices = [0, 1, 2];
  return typedMesh(positions, normals, indices);
}

function createGridMesh(cells, step) {
  const positions = [];
  const normals = [];
  const indices = [];
  const base = [];
  const half = (cells * step) / 2;
  for (let z = 0; z <= cells; z += 1) {
    for (let x = 0; x <= cells; x += 1) {
      const px = x * step - half;
      const pz = z * step - half;
      base.push([px, pz]);
      positions.push(px, 0, pz);
      normals.push(0, 1, 0);
    }
  }
  for (let z = 0; z < cells; z += 1) {
    for (let x = 0; x < cells; x += 1) {
      const a = z * (cells + 1) + x;
      const b = a + cells + 1;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  return { positions: new Float32Array(positions), normals: new Float32Array(normals), indices: new Uint16Array(indices), base };
}

function typedMesh(positions, normals, indices) {
  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    indices: new Uint16Array(indices)
  };
}

function heroPosition() {
  return [state.x, -state.depth, state.y];
}

function headingForward(heading) {
  return [Math.sin(heading), 0, Math.cos(heading)];
}

function terrainHeightAt(x, z, depth, biome) {
  const heroFloor = -depth - 48 - clamp(depth * 0.08, 0, 80);
  const ridge = Math.sin(x * 0.022 + worldSeed) * 4 + Math.cos(z * 0.017 - worldSeed) * 5;
  const detail = fractalNoise(x * 0.018, z * 0.018, worldSeed + 881) * 14;
  const cave = biome === "Crystal Caves" ? Math.sin(x * 0.08) * 7 : 0;
  return heroFloor + ridge + detail + cave;
}

function getBiomeAt(x, y, depth) {
  const n = fractalNoise(x * 0.0018, y * 0.0018, worldSeed);
  const heat = fractalNoise(x * 0.003 + 20, y * 0.003 - 14, worldSeed + 911);
  const relic = fractalNoise(x * 0.006 - 80, y * 0.006 + 40, worldSeed + 2718);

  if (relic > 0.84 && depth > 120) return "Ancient Ruins";
  if (heat > 0.82 && depth > 420) return "Hydrothermal Fields";
  if (n < 0.16 && depth < 450) return "Frozen Ocean";
  if (depth > 850) return "Deep Abyss";
  if (n > 0.72 && depth > 260) return "Crystal Caves";
  if (n > 0.56 && depth < 320) return "Coral Kingdom";
  if (n > 0.36 && depth < 520) return "Kelp Forest";
  return "Open Ocean";
}

function mapCurrentRegion() {
  const key = `${Math.round(state.x / 180)}:${Math.round(state.y / 180)}:${Math.round(state.depth / 160)}`;
  if (!state.mappedRegions[key]) state.mappedRegions[key] = Date.now();
}

function getTemperature(biome, depth) {
  const surface = biome === "Hydrothermal Fields" ? 16 : biome === "Frozen Ocean" ? -1 : 22;
  const temp = surface - depth * 0.018 + (biome === "Hydrothermal Fields" ? 28 : 0);
  return `${Math.round(temp * 10) / 10}C`;
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2600);
}

function ensureAudio() {
  if (audio) return;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;

  const context = new AudioContext();
  const master = context.createGain();
  master.gain.value = 0.2;
  master.connect(context.destination);

  const noiseBuffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;

  const noise = context.createBufferSource();
  noise.buffer = noiseBuffer;
  noise.loop = true;
  const lowpass = context.createBiquadFilter();
  lowpass.type = "lowpass";
  lowpass.frequency.value = 560;
  const waveGain = context.createGain();
  waveGain.gain.value = 0.22;
  noise.connect(lowpass);
  lowpass.connect(waveGain);
  waveGain.connect(master);
  noise.start();

  const drone = context.createOscillator();
  drone.type = "sine";
  drone.frequency.value = 54;
  const droneGain = context.createGain();
  droneGain.gain.value = 0.045;
  drone.connect(droneGain);
  droneGain.connect(master);
  drone.start();

  const whale = context.createOscillator();
  whale.type = "sine";
  whale.frequency.value = dailyEvent.name === "Whale Choir" ? 92 : 72;
  const whaleGain = context.createGain();
  whaleGain.gain.value = dailyEvent.name === "Whale Choir" ? 0.06 : 0.025;
  whale.connect(whaleGain);
  whaleGain.connect(master);
  whale.start();

  audio = { context, master, lowpass, drone, whale, waveGain, whaleGain };
}

function updateAudio() {
  if (!audio) return;
  const depthMix = clamp(state.depth / 1200, 0, 1);
  const t = audio.context.currentTime;
  audio.lowpass.frequency.setTargetAtTime(780 - depthMix * 520, t, 0.6);
  audio.drone.frequency.setTargetAtTime(48 + depthMix * 20 + Math.sin(state.time * 0.2) * 3, t, 0.8);
  audio.whale.frequency.setTargetAtTime((dailyEvent.name === "Whale Choir" ? 94 : 70) + Math.sin(state.time * 0.08) * 12, t, 1.6);
  audio.waveGain.gain.setTargetAtTime(0.24 - depthMix * 0.08, t, 0.8);
}

let saveFrame = 0;
function scheduleSave() {
  saveFrame += 1;
  if (saveFrame > 90) {
    saveFrame = 0;
    saveState();
  }
}

function saveState() {
  const payload = {
    x: state.x,
    y: state.y,
    depth: state.depth,
    heading: state.heading,
    targetDepth: state.targetDepth,
    researcherId: state.researcherId,
    researcherName: state.researcherName,
    discoveries: state.discoveries,
    mappedRegions: state.mappedRegions,
    distance: state.distance,
    maxDepth: state.maxDepth
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function readSavedState() {
  const fallbackId = Math.floor(100000 + Math.random() * 899999);
  const fallback = {
    x: Math.round((Math.random() - 0.5) * 5000),
    y: Math.round((Math.random() - 0.5) * 5000),
    depth: 0,
    heading: Math.random() * TWO_PI,
    researcherId: fallbackId,
    researcherName: `Researcher ${String(fallbackId).slice(-4)}`,
    discoveries: {},
    mappedRegions: {},
    distance: 0,
    maxDepth: 0
  };

  try {
    const savedState = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (!savedState || typeof savedState !== "object") return fallback;
    return {
      ...fallback,
      ...savedState,
      discoveries: savedState.discoveries || {},
      mappedRegions: savedState.mappedRegions || {}
    };
  } catch {
    return fallback;
  }
}

function getDailyEvent() {
  const now = new Date();
  const daySeed = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) / 86400000;
  return eventCatalog[Math.abs(Math.floor(daySeed)) % eventCatalog.length];
}

function getGlobalProgress() {
  const start = Date.UTC(2026, 0, 1);
  const days = Math.max(0, Math.floor((Date.now() - start) / 86400000));
  const base = 3.48 + days * 0.013;
  return `${Math.min(19.95, base).toFixed(2)}%`;
}

function m4Identity() {
  return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
}

function m4Multiply(a, b) {
  const out = new Float32Array(16);
  const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
  const a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
  const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
  const a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
  let b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3];
  out[0] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
  b0 = b[4]; b1 = b[5]; b2 = b[6]; b3 = b[7];
  out[4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[5] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[6] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[7] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
  b0 = b[8]; b1 = b[9]; b2 = b[10]; b3 = b[11];
  out[8] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[9] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[10] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[11] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
  b0 = b[12]; b1 = b[13]; b2 = b[14]; b3 = b[15];
  out[12] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[13] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[14] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[15] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
  return out;
}

function m4Translation(v) {
  return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, v[0], v[1], v[2], 1]);
}

function m4Scaling(v) {
  return new Float32Array([v[0], 0, 0, 0, 0, v[1], 0, 0, 0, 0, v[2], 0, 0, 0, 0, 1]);
}

function m4RotationX(a) {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return new Float32Array([1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]);
}

function m4RotationY(a) {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return new Float32Array([c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]);
}

function m4RotationZ(a) {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return new Float32Array([c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
}

function m4FromTRS(t, r, s) {
  let m = m4Translation(t);
  m = m4Multiply(m, m4RotationY(r[1]));
  m = m4Multiply(m, m4RotationX(r[0]));
  m = m4Multiply(m, m4RotationZ(r[2]));
  m = m4Multiply(m, m4Scaling(s));
  return m;
}

function m4Perspective(fovy, aspect, near, far) {
  const f = 1 / Math.tan(fovy / 2);
  const nf = 1 / (near - far);
  return new Float32Array([
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (far + near) * nf, -1,
    0, 0, 2 * far * near * nf, 0
  ]);
}

function m4LookAt(eye, center, up) {
  const z = vec3Normalize(vec3Sub(eye, center));
  const x = vec3Normalize(vec3Cross(up, z));
  const y = vec3Cross(z, x);
  return new Float32Array([
    x[0], y[0], z[0], 0,
    x[1], y[1], z[1], 0,
    x[2], y[2], z[2], 0,
    -vec3Dot(x, eye), -vec3Dot(y, eye), -vec3Dot(z, eye), 1
  ]);
}

function vec3Sub(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function vec3Cross(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0]
  ];
}

function vec3Dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function vec3Length(v) {
  return Math.hypot(v[0], v[1], v[2]);
}

function vec3Distance(a, b) {
  return vec3Length(vec3Sub(a, b));
}

function vec3Normalize(v) {
  const len = vec3Length(v) || 1;
  return [v[0] / len, v[1] / len, v[2] / len];
}

function fractalNoise(x, y, seed) {
  let value = 0;
  let amp = 0.5;
  let freq = 1;
  let total = 0;
  for (let i = 0; i < 4; i += 1) {
    value += valueNoise(x * freq, y * freq, seed + i * 1013) * amp;
    total += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return value / total;
}

function valueNoise(x, y, seed) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const xf = x - x0;
  const yf = y - y0;
  const u = fade(xf);
  const v = fade(yf);
  const a = randomGrid(x0, y0, seed);
  const b = randomGrid(x0 + 1, y0, seed);
  const c = randomGrid(x0, y0 + 1, seed);
  const d = randomGrid(x0 + 1, y0 + 1, seed);
  return lerp(lerp(a, b, u), lerp(c, d, u), v);
}

function randomGrid(x, y, seed) {
  const h = hashNumber(x * 374761393 + y * 668265263 + seed * 1442695041);
  return (h >>> 0) / 4294967295;
}

function hashString(input) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function hashNumber(n) {
  let h = n | 0;
  h ^= h >>> 16;
  h = Math.imul(h, 0x7feb352d);
  h ^= h >>> 15;
  h = Math.imul(h, 0x846ca68b);
  h ^= h >>> 16;
  return h >>> 0;
}

function mulberry32(seed) {
  return function rng() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function approach(value, target, amount) {
  if (value < target) return Math.min(target, value + amount);
  return Math.max(target, value - amount);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function lerpAngle(a, b, t) {
  return a + wrapAngle(b - a) * clamp(t, 0, 1);
}

function wrapAngle(a) {
  return Math.atan2(Math.sin(a), Math.cos(a));
}

function fade(t) {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function smoothstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function mixHex(a, b, amount) {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  const r = Math.round(lerp(ca.r, cb.r, amount));
  const g = Math.round(lerp(ca.g, cb.g, amount));
  const bl = Math.round(lerp(ca.b, cb.b, amount));
  return `rgb(${r}, ${g}, ${bl})`;
}

function colorWithAlpha(color, alpha) {
  if (color.startsWith("#")) {
    const rgb = hexToRgb(color);
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
  }
  if (color.startsWith("hsl")) {
    const values = color.slice(color.indexOf("(") + 1, -1).split(",").map((part) => part.trim());
    return `hsla(${values[0]}, ${values[1]}, ${values[2]}, ${alpha})`;
  }
  if (color.startsWith("rgb(")) {
    return color.replace("rgb(", "rgba(").replace(")", `, ${alpha})`);
  }
  return color;
}

function colorToRgb01(color) {
  if (color.startsWith("#")) return hexToRgb01(color);
  if (color.startsWith("hsl")) {
    const values = color.slice(color.indexOf("(") + 1, -1).split(",").map((part) => part.trim());
    const h = parseFloat(values[0]);
    const s = parseFloat(values[1]) / 100;
    const l = parseFloat(values[2]) / 100;
    return hslToRgb01(h, s, l);
  }
  if (color.startsWith("rgb")) {
    const values = color.slice(color.indexOf("(") + 1, -1).split(",").map((part) => parseFloat(part.trim()) / 255);
    return values.slice(0, 3);
  }
  return [1, 1, 1];
}

function hexToRgb01(hex) {
  const rgb = hexToRgb(hex);
  return [rgb.r / 255, rgb.g / 255, rgb.b / 255];
}

function hexToRgb(hex) {
  if (hex.startsWith("rgb(")) {
    const values = hex.slice(4, -1).split(",").map((part) => parseInt(part.trim(), 10));
    return { r: values[0], g: values[1], b: values[2] };
  }
  const clean = hex.replace("#", "");
  const num = parseInt(clean, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

function hslToRgb01(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = ((h % 360) + 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0, g = 0, b = 0;
  if (hp >= 0 && hp < 1) [r, g, b] = [c, x, 0];
  else if (hp < 2) [r, g, b] = [x, c, 0];
  else if (hp < 3) [r, g, b] = [0, c, x];
  else if (hp < 4) [r, g, b] = [0, x, c];
  else if (hp < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const m = l - c / 2;
  return [r + m, g + m, b + m];
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
