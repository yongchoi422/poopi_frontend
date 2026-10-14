// Deterministic idle progression, 3D diorama upgrades, interactive splash/gem drops,
// and Lv.1-Lv.5 Soul Evolution showcase state for The Porcelain Quarter.

export const IDLE_STORAGE_KEY = 'souli-plaza-idle-v1';

export const UPGRADES = Object.freeze([
  Object.freeze({
    id: 'turrets',
    step: '01',
    name: 'Hydro Turrets',
    cost: 25,
    rate: 18,
    summary: 'Twin brass cannons on the gate pillars',
    story: 'Hydro Turrets built! Twin pillar cannons now help push the ink tide back.',
  }),
  Object.freeze({
    id: 'fountain',
    step: '02',
    name: 'Starlight Fountain',
    cost: 50,
    rate: 28,
    summary: 'Golden plaza fountain & cozy parasols',
    story: 'Starlight Fountain restored! The center square shimmers with fresh water.',
  }),
  Object.freeze({
    id: 'spire',
    step: '03',
    name: 'Aurora Spire',
    cost: 90,
    rate: 45,
    summary: 'Spinning tower astrolabe & warm lanterns',
    story: 'Aurora Spire lit! The clocktower beacon doubles crystal magnetism.',
  }),
  Object.freeze({
    id: 'festival',
    step: '04',
    name: 'Festival Sky',
    cost: 150,
    rate: 75,
    summary: 'Golden gate crest & floating mini airship',
    story: 'Festival Sky unlocked! A miniature airship patrols the Porcelain Quarter.',
  }),
]);

export const EVOLUTION_TIERS = Object.freeze([
  Object.freeze({
    level: 1,
    badge: 'Lv.1 · Dot',
    name: 'Tiny Spark Dot',
    tokens: '1+ SOULI',
    scale: 1.0,
    auraColor: '#fce779',
    tagline: 'Even a single 1-pixel dot soul gets a glowing 3D pedestal and defends the square.',
  }),
  Object.freeze({
    level: 2,
    badge: 'Lv.2 · Sprout',
    name: 'Voxel Explorer',
    tokens: '1,000+ SOULI',
    scale: 1.0,
    auraColor: '#7fdaca',
    tagline: 'Full 3D voxel body awakened from your on-chain SVG inscription.',
  }),
  Object.freeze({
    level: 3,
    badge: 'Lv.3 · Vibe',
    name: 'Radiant Keeper',
    tokens: '50,000+ SOULI',
    scale: 1.06,
    auraColor: '#66f0d8',
    tagline: 'Floating pixel satellites pulse with mint starlight around your soul.',
  }),
  Object.freeze({
    level: 4,
    badge: 'Lv.4 · Crown',
    name: 'Crowned Guardian',
    tokens: '500,000+ SOULI',
    scale: 1.15,
    auraColor: '#ffd978',
    tagline: '3D golden voxel crown and twin halo rings command the plaza.',
  }),
  Object.freeze({
    level: 5,
    badge: 'Lv.5 · Mythic',
    name: 'Sovereign Soul',
    tokens: '2,500,000+ SOULI',
    scale: 1.24,
    auraColor: '#ffae52',
    tagline: 'Grand sovereign crown, 6 orbiting voxel stars, and golden shockwaves.',
  }),
]);

export function createIdleState(now = Date.now()) {
  return {
    version: 1,
    sparks: 35, // Enough to build the first 3D upgrade immediately!
    totalEarned: 35,
    level: 1,
    evoLevel: 3, // Default Lv.3 preserves exact original 5-soul appearance on load
    evoPulseAt: -10,
    maxPreview: false,
    upgrades: {
      turrets: false,
      fountain: false,
      spire: false,
      festival: false,
    },
    unlockedAt: {
      turrets: -10,
      fountain: -10,
      spire: -10,
      festival: -10,
    },
    drops: [],
    splashes: [],
    cheers: {},
    nextDropId: 1,
    lastSpawnAt: 0,
    lastSavedAt: now,
  };
}

export function activeUpgrades(state) {
  if (state.maxPreview) {
    return { turrets: true, fountain: true, spire: true, festival: true };
  }
  return { ...state.upgrades };
}

export function upgradeCount(state) {
  const u = activeUpgrades(state);
  return UPGRADES.reduce((acc, item) => acc + (u[item.id] ? 1 : 0), 0);
}

export function passiveRatePerCycle(state) {
  const u = activeUpgrades(state);
  const base = 20;
  const bonus = UPGRADES.reduce((sum, item) => sum + (u[item.id] ? item.rate : 0), 0);
  const evoBonus = (state.evoLevel - 1) * 5;
  return base + bonus + evoBonus;
}

export function nextUpgradeToBuy(state) {
  return UPGRADES.find(u => !state.upgrades[u.id]) || null;
}

export function spawnDrop(state, x, z, value = 4, kind = 'spark', time = 0) {
  if (state.drops.length >= 28) {
    // Auto-harvest oldest drop so the plaza never overflows
    const oldest = state.drops.shift();
    if (oldest) {
      state.sparks += oldest.value;
      state.totalEarned += oldest.value;
    }
  }
  const clampedX = Math.max(-9.5, Math.min(9.5, x));
  const clampedZ = Math.max(-4.2, Math.min(7.2, z));
  const drop = {
    id: state.nextDropId++,
    x: clampedX,
    z: clampedZ,
    value: Math.max(1, Math.round(value)),
    kind,
    bornAt: time,
    collectedAt: null,
  };
  state.drops.push(drop);
  return drop;
}

export function collectDrop(state, dropId, time = 0) {
  const drop = state.drops.find(d => d.id === dropId && d.collectedAt === null);
  if (!drop) return 0;
  drop.collectedAt = time;
  state.sparks += drop.value;
  state.totalEarned += drop.value;
  state.level = 1 + Math.floor(state.totalEarned / 60);
  return drop.value;
}

export function collectNearPosition(state, x, z, radius = 2.2, time = 0) {
  let gained = 0;
  let count = 0;
  const r2 = radius * radius;
  for (const drop of state.drops) {
    if (drop.collectedAt !== null) continue;
    const dx = drop.x - x;
    const dz = drop.z - z;
    if (dx * dx + dz * dz <= r2) {
      gained += collectDrop(state, drop.id, time);
      count++;
    }
  }
  return { gained, count };
}

export function collectAllDrops(state, time = 0) {
  let gained = 0;
  let count = 0;
  for (const drop of state.drops) {
    if (drop.collectedAt === null) {
      gained += collectDrop(state, drop.id, time);
      count++;
    }
  }
  return { gained, count };
}

export function buyUpgrade(state, id, time = 0) {
  const item = UPGRADES.find(u => u.id === id);
  if (!item || state.upgrades[id] || state.sparks < item.cost) return null;
  state.sparks -= item.cost;
  state.upgrades[id] = true;
  state.unlockedAt[id] = time;
  state.maxPreview = false;
  // Celebration crystal shower around the square
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2 + 0.4;
    spawnDrop(state, Math.cos(angle) * 2.8, 1.8 + Math.sin(angle) * 2.0, 5, 'bonus', time);
  }
  return item;
}

export function toggleMaxPreview(state, time = 0) {
  state.maxPreview = !state.maxPreview;
  if (state.maxPreview) {
    UPGRADES.forEach((u, idx) => {
      if (!state.upgrades[u.id]) state.unlockedAt[u.id] = time - idx * 0.08;
    });
  }
  return state.maxPreview;
}

export function setEvolutionLevel(state, level, time = 0) {
  const tier = EVOLUTION_TIERS.find(t => t.level === Number(level));
  if (!tier) return null;
  state.evoLevel = tier.level;
  state.evoPulseAt = time;
  return tier;
}

export function triggerSplash(state, x, z, time = 0) {
  const cx = Math.max(-10.5, Math.min(10.5, x));
  const cz = Math.max(-6.5, Math.min(7.5, z));
  state.splashes.push({
    id: state.nextDropId++,
    x: cx,
    z: cz,
    bornAt: time,
  });
  if (state.splashes.length > 12) state.splashes.shift();
  // Also collect any nearby drops and pop 2 fresh sparks
  const swept = collectNearPosition(state, cx, cz, 2.8, time);
  const bonus = 3 + Math.floor(upgradeCount(state));
  for (let i = 0; i < 2; i++) {
    const a = (time * 5 + i * Math.PI) % (Math.PI * 2);
    spawnDrop(state, cx + Math.cos(a) * 0.85, cz + Math.sin(a) * 0.75, bonus, 'splash', time);
  }
  return { x: cx, z: cz, swept: swept.gained };
}

export function cheerSoul(state, soulId, x = 0, z = 1.5, time = 0) {
  state.cheers[soulId] = time;
  const val = 5 + state.evoLevel;
  spawnDrop(state, x - 0.6, z + 0.5, val, 'cheer', time);
  spawnDrop(state, x + 0.6, z + 0.5, val, 'cheer', time);
  return val * 2;
}

export function stepIdleWorld(state, data, time = 0) {
  // Clean up finished fly-out animations and splashes
  state.drops = state.drops.filter(d => d.collectedAt === null || time - d.collectedAt < 0.55);
  state.splashes = state.splashes.filter(s => time - s.bornAt < 1.1);

  // Auto-collect ripe drops after 5.5 seconds (or 3.2s if Aurora Spire is active) so idle play is effortless
  const u = activeUpgrades(state);
  const autoDelay = u.spire ? 3.2 : 5.5;
  for (const drop of state.drops) {
    if (drop.collectedAt === null && time - drop.bornAt >= autoDelay) {
      collectDrop(state, drop.id, time);
    }
  }

  // Spawn periodic idle drops from active souls & fountain
  if (time - state.lastSpawnAt >= 2.6) {
    state.lastSpawnAt = time;
    const crew = data?.crew || [];
    if (crew.length) {
      const idx = Math.floor(Math.abs(time * 10)) % crew.length;
      const actor = crew[idx];
      const baseVal = 3 + upgradeCount(state) + Math.floor((state.evoLevel - 1) * 0.8);
      spawnDrop(state, actor.x + Math.sin(time * 3) * 0.7, actor.z + 0.55, baseVal, 'work', time);
    }
    if (u.fountain) {
      const angle = time * 1.9;
      spawnDrop(state, Math.cos(angle) * 1.4, 3.2 + Math.sin(angle) * 1.1, 4, 'fountain', time);
    }
  }
  state.level = 1 + Math.floor(state.totalEarned / 60);
  return state;
}

export function serializeIdleState(state, now = Date.now()) {
  return JSON.stringify({
    version: 1,
    sparks: Math.min(1e9, Math.max(0, Math.round(state.sparks))),
    totalEarned: Math.min(1e9, Math.max(0, Math.round(state.totalEarned))),
    evoLevel: state.evoLevel,
    upgrades: { ...state.upgrades },
    lastSavedAt: now,
  });
}

export function restoreIdleState(raw, now = Date.now()) {
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!parsed || parsed.version !== 1) return null;
    const state = createIdleState(now);
    if (Number.isSafeInteger(parsed.sparks) && parsed.sparks >= 0) state.sparks = parsed.sparks;
    if (Number.isSafeInteger(parsed.totalEarned) && parsed.totalEarned >= 0) state.totalEarned = parsed.totalEarned;
    if (Number.isInteger(parsed.evoLevel) && parsed.evoLevel >= 1 && parsed.evoLevel <= 5) {
      state.evoLevel = parsed.evoLevel;
    }
    if (parsed.upgrades && typeof parsed.upgrades === 'object') {
      for (const item of UPGRADES) {
        if (parsed.upgrades[item.id] === true) {
          state.upgrades[item.id] = true;
          state.unlockedAt[item.id] = -10;
        }
      }
    }
    let awayBonus = 0;
    if (Number.isFinite(parsed.lastSavedAt) && now > parsed.lastSavedAt) {
      const awaySec = Math.min(12 * 3600, (now - parsed.lastSavedAt) / 1000);
      if (awaySec >= 30) {
        const cycles = awaySec / 83;
        awayBonus = Math.max(2, Math.min(500, Math.round(cycles * passiveRatePerCycle(state) * 0.5)));
        state.sparks += awayBonus;
        state.totalEarned += awayBonus;
      }
    }
    state.level = 1 + Math.floor(state.totalEarned / 60);
    state.awayBonus = awayBonus;
    return state;
  } catch {
    return null;
  }
}
