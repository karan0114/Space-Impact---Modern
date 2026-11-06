import { Boss, Enemy, PlayerState, PowerUp, Projectile, ThemeMode } from './types';

/**
 * Procedural Vector & Pixel Sprite Drawing Routines
 * Renders high-octane modern pixel-art space assets with neon glow
 */

// Draw player ship with glowing thrusters, cockpit, and shields
export function drawPlayerShip(
  ctx: CanvasRenderingContext2D,
  player: PlayerState,
  timestamp: number,
  theme: ThemeMode = 'CYBER'
) {
  ctx.save();
  ctx.translate(player.x, player.y);

  // Invulnerability blink
  if (player.invulnerableTime > 0 && Math.floor(timestamp / 70) % 2 === 0) {
    ctx.globalAlpha = 0.45;
  }

  const w = player.width;
  const h = player.height;
  const isPink = theme === 'SAKURA_PINK';

  // 1. Thruster Exhaust Flames (animated flicker)
  const flameLength = 12 + Math.sin(timestamp * 0.04) * 6;
  const flameGradient = ctx.createLinearGradient(-flameLength, 0, 0, 0);
  if (isPink) {
    flameGradient.addColorStop(0, 'rgba(236, 72, 153, 0)');
    flameGradient.addColorStop(0.6, 'rgba(244, 114, 182, 0.85)');
    flameGradient.addColorStop(1, '#ffffff');
  } else {
    flameGradient.addColorStop(0, 'rgba(6, 182, 212, 0)');
    flameGradient.addColorStop(0.6, 'rgba(6, 182, 212, 0.7)');
    flameGradient.addColorStop(1, '#ffffff');
  }

  ctx.fillStyle = flameGradient;
  ctx.beginPath();
  ctx.moveTo(0, h * 0.35);
  ctx.lineTo(-flameLength, h * 0.5);
  ctx.lineTo(0, h * 0.65);
  ctx.closePath();
  ctx.fill();

  // Secondary top/bottom mini thruster
  ctx.fillStyle = isPink ? 'rgba(244, 114, 182, 0.7)' : 'rgba(56, 189, 248, 0.6)';
  ctx.fillRect(-6, h * 0.15, 6, 2);
  ctx.fillRect(-6, h * 0.82, 6, 2);

  // 2. Main Ship Hull
  // Shadow/underbelly
  ctx.fillStyle = isPink ? '#2a082c' : '#0f172a';
  ctx.beginPath();
  ctx.moveTo(w, h * 0.5);
  ctx.lineTo(w * 0.3, h * 0.95);
  ctx.lineTo(0, h * 0.85);
  ctx.lineTo(w * 0.15, h * 0.5);
  ctx.lineTo(0, h * 0.15);
  ctx.lineTo(w * 0.3, h * 0.05);
  ctx.closePath();
  ctx.fill();

  // Primary fuselage (Emerald / Cyan or Sakura Rose / Magenta)
  ctx.fillStyle = isPink ? '#db2777' : '#059669';
  ctx.beginPath();
  ctx.moveTo(w, h * 0.5);
  ctx.lineTo(w * 0.4, h * 0.8);
  ctx.lineTo(w * 0.08, h * 0.65);
  ctx.lineTo(w * 0.08, h * 0.35);
  ctx.lineTo(w * 0.4, h * 0.2);
  ctx.closePath();
  ctx.fill();

  // Top plate highlight
  ctx.fillStyle = isPink ? '#f472b6' : '#10b981';
  ctx.beginPath();
  ctx.moveTo(w * 0.9, h * 0.5);
  ctx.lineTo(w * 0.45, h * 0.3);
  ctx.lineTo(w * 0.15, h * 0.42);
  ctx.lineTo(w * 0.15, h * 0.58);
  ctx.lineTo(w * 0.45, h * 0.7);
  ctx.closePath();
  ctx.fill();

  // Wings & Cannons
  ctx.fillStyle = isPink ? '#9d174d' : '#0284c7';
  ctx.fillRect(w * 0.25, 0, w * 0.45, 3);
  ctx.fillRect(w * 0.25, h - 3, w * 0.45, 3);

  // Laser emitter tips
  ctx.fillStyle = isPink ? '#fbcfe8' : '#38bdf8';
  ctx.fillRect(w * 0.7, 0, 5, 3);
  ctx.fillRect(w * 0.7, h - 3, 5, 3);
  ctx.fillRect(w - 2, h * 0.48, 6, 3);

  // Cockpit canopy
  ctx.fillStyle = isPink ? '#fda4af' : '#22d3ee';
  ctx.beginPath();
  ctx.ellipse(w * 0.52, h * 0.5, 7, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Cockpit reflection glint
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(w * 0.54, h * 0.46, 3, 1.5);

  // 3. Energy Shield Overlay (if active)
  if (player.shieldHp > 0) {
    const shieldPulse = (Math.sin(timestamp * 0.008) + 1) * 0.5;
    const shieldColor = isPink
      ? `rgba(244, 114, 182, ${0.45 + shieldPulse * 0.45})`
      : `rgba(6, 182, 212, ${0.4 + shieldPulse * 0.4})`;
    // Concentric neon shield glow (GPU accelerated, no software blur)
    ctx.strokeStyle = isPink ? 'rgba(244, 114, 182, 0.22)' : 'rgba(6, 182, 212, 0.18)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.ellipse(w * 0.5, h * 0.5, w * 0.65, h * 0.8, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = shieldColor;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(w * 0.5, h * 0.5, w * 0.65, h * 0.8, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

// Draw enemies with distinctive pixel shapes & colors
export function drawEnemy(ctx: CanvasRenderingContext2D, enemy: Enemy, timestamp: number) {
  ctx.save();
  ctx.translate(enemy.x, enemy.y);

  // Damage hit flash (solid white)
  if (enemy.hitFlashTime > 0) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, enemy.width, enemy.height);
    ctx.restore();
    return;
  }

  const w = enemy.width;
  const h = enemy.height;
  const t = timestamp * 0.005;

  switch (enemy.type) {
    case 'SCOUT': {
      // Classic Nokia Space Impact bi-wing Scout craft
      ctx.fillStyle = '#e11d48'; // Rose red
      ctx.beginPath();
      ctx.moveTo(0, h * 0.5);
      ctx.lineTo(w * 0.6, 0);
      ctx.lineTo(w, h * 0.2);
      ctx.lineTo(w * 0.7, h * 0.5);
      ctx.lineTo(w, h * 0.8);
      ctx.lineTo(w * 0.6, h);
      ctx.closePath();
      ctx.fill();

      // Eye / core
      ctx.fillStyle = '#fde047';
      ctx.fillRect(w * 0.3, h * 0.4, 4, 4);
      break;
    }

    case 'SQUID': {
      // Iconic Space Impact Alien Squid/Jellyfish with undulating tentacles
      ctx.fillStyle = '#a855f7'; // Purple bio-alien
      // Head
      ctx.beginPath();
      ctx.arc(w * 0.6, h * 0.5, h * 0.45, 0, Math.PI * 2);
      ctx.fill();

      // Brow & eye
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.arc(w * 0.45, h * 0.5, 4, 0, Math.PI * 2);
      ctx.fill();

      // Tentacles (animated wave)
      ctx.strokeStyle = '#c084fc';
      ctx.lineWidth = 2.5;
      const tentacleWave = Math.sin(t * 3 + enemy.age * 5) * 4;

      ctx.beginPath();
      ctx.moveTo(w * 0.2, h * 0.25);
      ctx.quadraticCurveTo(-4, h * 0.2 + tentacleWave, -8, h * 0.2 - tentacleWave);

      ctx.moveTo(w * 0.1, h * 0.5);
      ctx.quadraticCurveTo(-6, h * 0.5 - tentacleWave, -12, h * 0.5 + tentacleWave);

      ctx.moveTo(w * 0.2, h * 0.75);
      ctx.quadraticCurveTo(-4, h * 0.7 - tentacleWave, -8, h * 0.8 + tentacleWave);
      ctx.stroke();
      break;
    }

    case 'DRONE': {
      // Angular mecha drone
      ctx.fillStyle = '#f97316'; // Amber
      ctx.beginPath();
      ctx.moveTo(w * 0.1, h * 0.5);
      ctx.lineTo(w * 0.5, 0);
      ctx.lineTo(w, h * 0.3);
      ctx.lineTo(w, h * 0.7);
      ctx.lineTo(w * 0.5, h);
      ctx.closePath();
      ctx.fill();

      // Scanning visor
      ctx.fillStyle = '#22d3ee';
      ctx.fillRect(w * 0.15, h * 0.42, 6, 4);
      break;
    }

    case 'MINE': {
      // Explosive spiked space mine
      const pulse = Math.sin(t * 8) * 2;
      ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.arc(w * 0.5, h * 0.5, w * 0.38, 0, Math.PI * 2);
      ctx.fill();

      // Spikes
      ctx.fillStyle = '#94a3b8';
      for (let i = 0; i < 8; i++) {
        const angle = (i * Math.PI) / 4 + t;
        const sx = w * 0.5 + Math.cos(angle) * (w * 0.48 + pulse);
        const sy = h * 0.5 + Math.sin(angle) * (h * 0.48 + pulse);
        ctx.fillRect(sx - 1.5, sy - 1.5, 3, 3);
      }

      // Blinking red warning core
      ctx.fillStyle = Math.sin(t * 10) > 0 ? '#ef4444' : '#7f1d1d';
      ctx.beginPath();
      ctx.arc(w * 0.5, h * 0.5, 4, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'INTERCEPTOR': {
      // Rapid dart fighter
      ctx.fillStyle = '#14b8a6'; // Teal
      ctx.beginPath();
      ctx.moveTo(0, h * 0.5);
      ctx.lineTo(w * 0.8, 0);
      ctx.lineTo(w, h * 0.2);
      ctx.lineTo(w * 0.5, h * 0.5);
      ctx.lineTo(w, h * 0.8);
      ctx.lineTo(w * 0.8, h);
      ctx.closePath();
      ctx.fill();

      // Thruster
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(w - 2, h * 0.4, 4, 4);
      break;
    }

    case 'CRUISER': {
      // Armored gunship
      ctx.fillStyle = '#334155';
      ctx.fillRect(w * 0.1, h * 0.2, w * 0.8, h * 0.6);
      ctx.fillStyle = '#64748b';
      ctx.beginPath();
      ctx.moveTo(0, h * 0.5);
      ctx.lineTo(w * 0.3, h * 0.1);
      ctx.lineTo(w * 0.3, h * 0.9);
      ctx.closePath();
      ctx.fill();

      // Turrets
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(w * 0.2, h * 0.1, 8, 4);
      ctx.fillRect(w * 0.2, h * 0.8, 8, 4);

      // Energy shield rim
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(w * 0.05, h * 0.15, w * 0.9, h * 0.7);
      break;
    }

    case 'BIO_SERPENT': {
      // Slithering creature
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.ellipse(w * 0.5, h * 0.5, w * 0.45, h * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();

      // Sharp fangs
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(2, h * 0.3, 4, 3);
      ctx.fillRect(2, h * 0.6, 4, 3);

      // Red eye
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(w * 0.25, h * 0.35, 4, 4);
      break;
    }

    case 'TURRET': {
      // Heavy barrier turret
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(0, h * 0.35, w * 0.4, h * 0.3);
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(w * 0.6, h * 0.5, 6, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
  }

  // Draw miniature HP bar if damaged
  if (enemy.hp < enemy.maxHp) {
    const barW = w;
    const barH = 3;
    const pct = Math.max(0, enemy.hp / enemy.maxHp);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, -7, barW, barH);
    ctx.fillStyle = pct > 0.5 ? '#10b981' : '#ef4444';
    ctx.fillRect(0, -7, barW * pct, barH);
  }

  ctx.restore();
}

// Draw massive multi-phase sector bosses
export function drawBoss(ctx: CanvasRenderingContext2D, boss: Boss, timestamp: number) {
  ctx.save();
  ctx.translate(boss.x, boss.y);

  const w = boss.width;
  const h = boss.height;
  const t = timestamp * 0.003;

  // Hit flash
  if (boss.hitFlashTime > 0) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
    return;
  }

  switch (boss.type) {
    case 'SQUID_TITAN': {
      // Stage 1 Boss: Giant Alien Cephalopod
      // Pulsing mantle
      const breathe = Math.sin(t * 3) * 6;
      ctx.fillStyle = '#7c3aed'; // Deep purple
      ctx.beginPath();
      ctx.ellipse(w * 0.65, h * 0.5, w * 0.32 + breathe, h * 0.42, 0, 0, Math.PI * 2);
      ctx.fill();

      // Armored shell plates
      ctx.fillStyle = '#5b21b6';
      ctx.beginPath();
      ctx.ellipse(w * 0.72, h * 0.5, w * 0.22, h * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();

      // Colossal glowing eye with concentric neon glow ring
      ctx.fillStyle = 'rgba(244, 63, 94, 0.25)';
      ctx.beginPath();
      ctx.arc(w * 0.38, h * 0.5, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(w * 0.38, h * 0.5, 20, 0, Math.PI * 2);
      ctx.fill();

      // Inner pupil
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(w * 0.34, h * 0.5, 8, 0, Math.PI * 2);
      ctx.fill();

      // Giant tentacles sweeping forward
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 6;
      for (let i = 0; i < 4; i++) {
        const offset = (i - 1.5) * (h * 0.25);
        const wave = Math.sin(t * 4 + i) * 14;
        ctx.beginPath();
        ctx.moveTo(w * 0.3, h * 0.5 + offset);
        ctx.bezierCurveTo(w * 0.1, h * 0.5 + offset + wave, -15, h * 0.5 + offset - wave, -35, h * 0.5 + offset + wave * 0.5);
        ctx.stroke();
      }
      break;
    }

    case 'MECHA_FORTRESS': {
      // Stage 2 Boss: Rotating robotic fortress
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(w * 0.2, 0, w * 0.8, h);

      // Core plasma generator with concentric outer pulse
      const corePulse = (Math.sin(t * 6) + 1) * 0.5;
      ctx.fillStyle = 'rgba(249, 115, 22, 0.25)';
      ctx.beginPath();
      ctx.arc(w * 0.5, h * 0.5, 28 + 8 * corePulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgb(249, 115, 22)`;
      ctx.beginPath();
      ctx.arc(w * 0.5, h * 0.5, 28, 0, Math.PI * 2);
      ctx.fill();

      // Heavy Laser batteries (top & bottom)
      ctx.fillStyle = '#475569';
      ctx.fillRect(0, h * 0.15, w * 0.4, 20);
      ctx.fillRect(0, h * 0.75, w * 0.4, 20);

      // Barrels
      ctx.fillStyle = '#06b6d4';
      ctx.fillRect(-10, h * 0.18, 14, 14);
      ctx.fillRect(-10, h * 0.78, 14, 14);
      break;
    }

    case 'CYBER_DREADNOUGHT': {
      // Stage 3 Boss: Armored flagship
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.moveTo(0, h * 0.5);
      ctx.lineTo(w * 0.5, 0);
      ctx.lineTo(w, h * 0.1);
      ctx.lineTo(w, h * 0.9);
      ctx.lineTo(w * 0.5, h);
      ctx.closePath();
      ctx.fill();

      // Armor plating
      ctx.fillStyle = '#334155';
      ctx.fillRect(w * 0.35, h * 0.2, w * 0.55, h * 0.6);

      // Frontal shield generator (concentric strokes)
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(0, h * 0.5, h * 0.48, -Math.PI * 0.4, Math.PI * 0.4);
      ctx.stroke();

      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, h * 0.5, h * 0.48, -Math.PI * 0.4, Math.PI * 0.4);
      ctx.stroke();

      // Multiple missile bays
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(w * 0.4, h * 0.3, 12, 10);
      ctx.fillRect(w * 0.4, h * 0.6, 12, 10);
      ctx.fillRect(w * 0.6, h * 0.45, 16, 10);
      break;
    }

    case 'SKULL_LEVIATHAN': {
      // Stage 4 Boss: Legendary Alien Skull
      ctx.fillStyle = '#e2e8f0'; // Bone chassis
      ctx.beginPath();
      // Cranium
      ctx.ellipse(w * 0.55, h * 0.4, w * 0.4, h * 0.36, 0, 0, Math.PI * 2);
      ctx.fill();

      // Eye sockets (fiery neon laser apertures)
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.ellipse(w * 0.3, h * 0.32, 12, 16, 0, 0, Math.PI * 2);
      ctx.ellipse(w * 0.3, h * 0.55, 12, 16, 0, 0, Math.PI * 2);
      ctx.fill();

      // Jaw with teeth (chomp animation)
      const chomp = Math.sin(t * 5) * 8;
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(0, h * 0.4 + chomp, w * 0.35, 16);

      // Serrated teeth
      ctx.fillStyle = '#0f172a';
      for (let i = 0; i < 4; i++) {
        ctx.fillRect(4 + i * 14, h * 0.4 + chomp + 4, 6, 8);
      }
      break;
    }

    case 'OVERMIND_CORE': {
      // Stage 5 Final Boss: The Alien Emperor Core
      // Orbiting energy crystals
      for (let i = 0; i < 6; i++) {
        const orbitAngle = t * 2 + (i * Math.PI) / 3;
        const ox = w * 0.5 + Math.cos(orbitAngle) * (w * 0.55);
        const oy = h * 0.5 + Math.sin(orbitAngle) * (h * 0.55);
        ctx.fillStyle = '#06b6d4';
        ctx.fillRect(ox - 8, oy - 8, 16, 16);
      }

      // Central core
      const corePulse = (Math.sin(t * 8) + 1) * 0.5;
      const grad = ctx.createRadialGradient(w * 0.5, h * 0.5, 5, w * 0.5, h * 0.5, w * 0.4);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.3, '#ec4899');
      grad.addColorStop(0.7, '#8b5cf6');
      grad.addColorStop(1, '#1e1b4b');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(w * 0.5, h * 0.5, w * 0.35 + corePulse * 5, 0, Math.PI * 2);
      ctx.fill();

      // Energy crown spikes
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 3;
      ctx.stroke();
      break;
    }
  }

  ctx.restore();
}

// Draw laser projectiles and missiles
export function drawProjectile(ctx: CanvasRenderingContext2D, p: Projectile, theme: ThemeMode = 'CYBER') {
  ctx.save();
  ctx.translate(p.x, p.y);
  const isPink = theme === 'SAKURA_PINK';

  if (p.isPlayer) {
    if (p.type === 'MISSILE') {
      // Homing missile with smoke exhaust
      ctx.fillStyle = isPink ? '#f472b6' : '#f59e0b';
      ctx.fillRect(-8, -3, 14, 6);
      ctx.fillStyle = isPink ? '#fb7185' : '#ef4444';
      ctx.fillRect(6, -2, 4, 4);
    } else if (p.type === 'LASER_BEAM') {
      // High power plasma beam with concentric neon outer envelope
      ctx.fillStyle = isPink ? 'rgba(244, 63, 94, 0.35)' : 'rgba(6, 182, 212, 0.35)';
      ctx.fillRect(-16, -7, 36, 14);
      ctx.fillStyle = isPink ? '#fb7185' : '#38bdf8';
      ctx.fillRect(-12, -4, 28, 8);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-10, -2, 24, 4);
    } else {
      // Standard / Twin / Spread blaster bolt with neon halo
      ctx.fillStyle = isPink ? 'rgba(236, 72, 153, 0.35)' : 'rgba(6, 182, 212, 0.35)';
      ctx.fillRect(-9, -4, 20, 8);
      ctx.fillStyle = isPink ? '#f472b6' : '#22d3ee';
      ctx.fillRect(-6, -2, 14, 4);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-4, -1, 10, 2);
    }
  } else {
    // Enemy projectile (Hot Magenta / Crimson)
    if (p.type === 'BOSS_BEAM') {
      ctx.fillStyle = 'rgba(225, 29, 72, 0.35)';
      ctx.fillRect(-20, -9, 40, 18);
      ctx.fillStyle = '#f43f5e';
      ctx.fillRect(-16, -6, 32, 12);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-12, -2, 24, 4);
    } else {
      ctx.fillStyle = 'rgba(244, 63, 94, 0.35)';
      ctx.beginPath();
      ctx.arc(0, 0, p.radius + 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fb7185';
      ctx.beginPath();
      ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, p.radius * 0.45, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

// Draw glowing collectible power-up capsules
export function drawPowerUp(ctx: CanvasRenderingContext2D, powerUp: PowerUp, timestamp: number) {
  ctx.save();
  ctx.translate(powerUp.x, powerUp.y);

  const bob = Math.sin(timestamp * 0.006 + powerUp.age) * 3;
  ctx.translate(0, bob);

  const r = powerUp.radius;
  let color = '#f59e0b';
  let label = 'W';

  switch (powerUp.type) {
    case 'WEAPON_UPGRADE':
      color = '#06b6d4'; // Cyan
      label = 'W';
      break;
    case 'SECONDARY_AMMO':
      color = '#f59e0b'; // Amber
      label = 'M';
      break;
    case 'SHIELD':
      color = '#3b82f6'; // Blue
      label = 'S';
      break;
    case 'LIFE':
      color = '#10b981'; // Green
      label = '♥';
      break;
    case 'SCORE_GEM':
      color = '#ec4899'; // Pink
      label = '★';
      break;
  }

  // Glowing outer hexagon / circle (layered neon ring)
  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;

  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Outer neon pulse ring
  ctx.strokeStyle = color.replace(')', ', 0.3)').replace('rgb', 'rgba').replace('#', 'rgba(');
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, r + 2.5, 0, Math.PI * 2);
  ctx.stroke();

  // Inner icon
  ctx.fillStyle = color;
  ctx.font = 'bold 12px "Share Tech Mono", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, 0, 1);

  ctx.restore();
}
