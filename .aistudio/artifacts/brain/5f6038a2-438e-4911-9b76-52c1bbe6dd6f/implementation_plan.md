# Space Impact — Retro Arcade Shmup

A recreation of the iconic Nokia side-scrolling space shooter **Space Impact**, engineered with modern widescreen pixel-art visuals, neon arcade glow, authentic monophonic Web Audio synthesizer effects, a 5-stage campaign with signature bosses, and an Endless Survival mode.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> The following directions were confirmed during initial planning:
> - **Visual Style**: Clean modern pixel-art widescreen with neon arcade glow, parallax multi-layered starfields, glowing projectile tracers, and optional retro CRT scanline overlay.
> - **Audio Engine**: Authentic Nokia monophonic chiptune synth and procedural 8-bit sound effects synthesized via the browser's native Web Audio API (square/triangle wave oscillators and noise bursts; no external audio files required).
> - **Game Modes**: Classic 5-Stage Campaign (distinct environments, enemy patterns, mini-bosses, and 5 epic stage bosses) plus an Endless Survival score-attack mode with escalating difficulty waves.
> - **Controls & Touch Support**: Dual-mode input with responsive desktop keyboard controls (`WASD` / Arrow keys, `Space` / `J` to shoot, `K` / `X` for secondary weapon, `Esc` / `P` to pause) plus responsive on-screen virtual d-pad and firing buttons for mobile and touch devices.

---

### 1. Overview & Core Concept

- **What It Does**: Puts players in control of the classic space fighter craft traveling horizontally through alien sectors. Players blast through swarms of insectoid scouts, biological squid craft, mecha-drones, and dreadnoughts, collecting weapon power-ups and launching screen-clearing secondary bombs against colossal multi-phase stage bosses.
- **Target Audience / Persona**: Retro gaming fans, Nokia 3310 / 3330 nostalgics, and arcade shoot-'em-up enthusiasts looking for fast, responsive, and rewarding space combat.
- **Key Value**: Delivers the tactile nostalgia of Space Impact with arcade game feel: 60fps clamped game loop, decaying screen shake, hit-stop impact freezes, fluid particle explosions, and local high-score tracking.

---

### 2. User Experience & Visual Design

#### Key User Flows
1. **Title Screen**:
   - Atmospheric live background with drifting space stars and automated combat demo.
   - Distinctive neon pixel title lockup over negative space.
   - Primary action buttons: `"Start Campaign"`, `"Endless Mode"`, `"How to Play / Controls"`, and `"High Scores"`.
   - Audio and CRT scanline toggles.
2. **Stage Progression (Campaign)**:
   - Brief pre-stage sector dispatch banner (`Sector 1: Outer Orbit`, `Sector 2: Mecha Fortress`, etc.).
   - Wave-based scrolling combat with pacing (minor swarms $\to$ heavy cruisers $\to$ boss warning alarm $\to$ boss battle).
   - Victory tally screen with accuracy, score bonus, and seamless continuation to the next sector.
3. **Gameplay HUD**:
   - World-matched, low-occlusion perimeter HUD keeping $\ge 85\%$ of the playfield clear:
     - Player hull integrity bar with `tabular-nums` numeric value (`HP: 100/100`).
     - Lives counter (iconic 3 ship glyphs).
     - Score and high score display (`font-mono tabular-nums`).
     - Weapon status indicator (Single $\to$ Dual $\to$ Triple Spread $\to$ Plasma Beam) and secondary ordnance ammo (Homing Missiles / Screen Nuke).
     - Boss health bar displayed prominently at the top when encountering sector bosses.
4. **Game Over & Pause Modals**:
   - Quick-settling overlay with final score, stage reached, enemies destroyed, accuracy percentage, and immediate one-click `"Play Again"` restart without page refresh.

#### Visual Identity & Theme
- **Color Palette (60-30-10 Rule)**:
  - **60% Deep Void Canvas**: Dark cosmic navy/slate (`#050811`, `#0A0E1A`).
  - **30% Structural Elements & Stars**: Deep steel HUD panels, muted nebula dust clouds, crisp star layers (`#1E293B`, `#334155`, `#94A3B8`).
  - **10% Neon Accent Highlights**:
    - Player Ship & Blaster: Neon Cyan (`#06B6D4`) & Electric Emerald (`#10B981`).
    - Enemy Lasers & Hazards: Hot Magenta (`#F43F5E`) & Amber Red (`#EF4444`).
    - Power-ups & Upgrades: Radiant Gold (`#F59E0B`).
    - Boss Energy Shields: Plasma Violet (`#8B5CF6`).
- **Typography & Display**:
  - Arcade pixel-proportional headings paired with crisp monospace numbers (`font-mono tabular-nums`).
  - Clean unboxed metadata with subtle typographic separators (`·`).

---

### 3. Key Product Decisions & Trade-Offs

- **Canvas 2D Rendering with Sub-Pixel Physics**:
  - *Chosen Approach*: Pure HTML5 Canvas 2D with vector/pixel procedural sprite routines and double buffering.
  - *Why*: Guaranteed 60fps performance across all devices, zero external texture download latency, and razor-sharp resolution-independent scaling.
  - *Alternatives Considered*: Three.js (unnecessary overhead for a 2D side-scrolling pixel shmup) or DOM div elements (unacceptable frame drops with 100+ projectiles and particles).
- **Procedural Web Audio API Chiptune Synth**:
  - *Chosen Approach*: Built-in browser audio synthesis generating square-wave melodic bleeps, frequency-swept laser zaps, and white-noise explosion buffers.
  - *Why*: Emulates the authentic Nokia 3310 piezoelectric buzzer sound while remaining 100% self-contained with instant zero-network audio playback.
- **5 Campaign Stages with Custom Bosses**:
  - *Stage 1*: Alien Scout Vanguard $\to$ Biological Mothership (Squid Titan).
  - *Stage 2*: Mecha-Drone Fleet $\to$ Armored Battle Fortress with rotating turrets.
  - *Stage 3*: Asteroid Belt & Minefield $\to$ Cyber Dreadnought with missile salvos.
  - *Stage 4*: Bioluminescent Swarmers $\to$ Alien Skull Leviathan with sweeping laser beams.
  - *Stage 5*: Alien Command Fleet $\to$ The Overmind Core (multi-phase showdown).
- **Persistent Local Records**:
  - High scores, best sector, and audio settings stored persistently in browser `localStorage`.

---

### 4. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────────┐
│                           App.tsx                               │
│       (Game State Machine: MENU | PLAYING | PAUSED | OVER)       │
└──────────────┬──────────────────────────────────┬───────────────┘
               │                                  │
       ┌───────▼────────┐                ┌────────▼────────┐
       │   HUD / Touch  │                │  SoundEngine.ts │
       │  Controls Overlay               │ (Web Audio API) │
       └───────┬────────┘                └────────▲────────┘
               │                                  │
┌──────────────▼──────────────────────────────────┴───────────────┐
│                         GameEngine.ts                           │
│  ┌───────────────────────┐             ┌─────────────────────┐  │
│  │    Game Loop (60fps)  │             │   InputManager.ts   │  │
│  │   Math.min(dt, 0.05)  │             │ (Keyboard + Touch)  │  │
│  └───────────┬───────────┘             └──────────┬──────────┘  │
│              ▼                                    │             │
│  ┌────────────────────────────────────────────────▼──────────┐  │
│  │                    EntityManager                          │  │
│  │  - PlayerShip (HP, power-up tier, weapon cooldown)        │  │
│  │  - Projectiles (Player blasters, missiles, lasers, enemy) │  │
│  │  - Enemies & Bosses (Movement paths, firing AI, phases)   │  │
│  │  - PowerUps (Laser, Spread, Shield, Bomb, 1-Up)           │  │
│  │  - Particles & Floating Text (Spark, explosion, shake)    │  │
│  └───────────────────────────┬───────────────────────────────┘  │
│                              │                                  │
│                              ▼                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                   CanvasRenderer.ts                       │  │
│  │  - Starfield Parallax, Space Debris, Sprite Rasterizer    │  │
│  │  - Hit-Stop Freeze, Screen Shake, Glow Filters            │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

#### Core Modules to Implement:
1. `src/game/types.ts`: Game states, entity interfaces, weapon types, enemy definitions, boss phase structures.
2. `src/game/audio/soundEngine.ts`: Nokia-style monophonic square-wave SFX (laser, hit, explosion, powerup, boss alarm, stage clear, game over jingle).
3. `src/game/sprites.ts`: Crisp pixel vector renderers for the player fighter, 8 distinct alien enemies, 5 colossal bosses, projectiles, and collectible capsules.
4. `src/game/stages.ts`: Stage wave pacing data, spawn tables, and boss encounter configurations for Stages 1–5.
5. `src/game/gameEngine.ts`: Core simulation loop, collision detection (AABB + circle), particle system, camera shake, hit-stop mechanic, and wave progression.
6. `src/components/GameCanvas.tsx`: High-DPI responsive canvas wrapper with CRT filter toggle.
7. `src/components/GameHUD.tsx`: Low-occlusion, world-matched HUD with health bar, score, secondary weapons, and boss status.
8. `src/components/VirtualControls.tsx`: Responsive on-screen directional pad and action buttons for mobile touch devices.
9. `src/components/TitleScreen.tsx` & `src/components/GameOverModal.tsx`: Polished title screen with interactive mode selector, high scores, and victory/game over views.
