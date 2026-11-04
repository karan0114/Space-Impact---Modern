# Implementation Plan: Seamless Map Looping, Android Responsive UI & Cloud Profile Sync (Google / Facebook Auth + Firestore)

## 1. Executive Summary
This revised plan encompasses three coordinated upgrades to the space shooter:
1. **Seamless Parallax Map Loop Blending**: Fixing the visible hard seams and "series of cards" look during horizontal scrolling by implementing a continuous mirror-tiled (ping-pong) parallax render pipeline with a soft alpha edge crossfade buffer.
2. **Android Button Overlap Fix**: Re-architecting `TitleScreen.tsx` into an adaptive, scrollable layout with dynamic scaling (`100dvh` and safe-area insets) and a streamlined button grid to prevent overlapping on any smartphone browser.
3. **Cloud Save & Social Authentication**: Integrating Firebase Authentication (Google and Facebook providers) with persistent Firestore cloud synchronization for player high scores, gold coins, ship upgrades, and daily combat missions.

---

## 2. User Review & Critical Decisions

> [!IMPORTANT] All core user requirements and recent adjustments are integrated below:

- **Confirmed Decision 1 (Map Looping Seam Fix)**: Replace naive direct side-by-side tiling (`-scrollX` and `w - scrollX`) with an alternating mirrored tiling system (`Normal -> Horizontal Flip -> Normal`) augmented by a 100px linear alpha feathering blend at junctions, eliminating hard vertical seams completely.
- **Confirmed Decision 2 (Android Responsive UI)**: Responsive scrollable grid with dynamic scaling for compact screens, eliminating vertical crowding on smaller Android viewports.
- **Confirmed Decision 3 (Auth & Database)**: Firebase Auth with Google and Facebook sign-in providers, backed by Firestore cloud synchronization.
- **Confirmed Decision 4 (Data Sync Scope)**: Complete cloud profile synchronization covering high scores, gold coin balances, spaceship hangar upgrades, and 24-hour daily mission progress with local guest fallback.

---

## 3. Overview & Core Concept

- **What It Does**: 
  - Players experience a visually stunning, truly infinite space background where celestial nebulae, asteroid belts, and black hole gravitational rings scroll smoothly without harsh seams or repeating image cuts.
  - On any smartphone (Android Chrome, Brave, Samsung Internet, iOS Safari), the homescreen navigation dynamically fits the viewport height without buttons overlapping or falling off-screen.
  - Players can link their Google or Facebook account with one click to safeguard their coins, hangar upgrades, and daily mission rewards across sessions and devices.
- **Target Audience**: Mobile and desktop arcade gamers who value fluid aesthetics and cross-device progression.
- **Key Value**: Professional visual presentation, frictionless mobile controls, and rock-solid cloud data persistence.

---

## 4. User Experience & Visual Design

### A. Seamless Map Blending & Infinite Looping
- **The Seam Issue**: Placing standard non-tileable rectangular images end-to-end creates an abrupt vertical color/density discontinuity every cycle.
- **The Seamless Solution**:
  1. **Ping-Pong Mirrored Tiling**: Tile 0 renders in standard orientation; Tile 1 renders horizontally mirrored (`scaleX(-1)`); Tile 2 renders standard. Because the right edge of Tile 0 is identical to the left edge of mirrored Tile 1, the physical seam is mathematically 0% noticeable.
  2. **Soft Seam Edge Crossfade**: A 96px soft linear gradient mask across the seam coordinates diffuses local star clusters and nebula edges, ensuring a photographic gradient transition.
  3. **Atmospheric Color Grading**: Map-specific ambient tinting (`TOXIC_BELT` emerald glow, `SINGULARITY_ABYSS` ultraviolet distortion, `NEBULA_STATION` cyan station flare) harmonizes contrast.

### B. Android Viewport Adaptive Layout
- **Dynamic Viewport (`100dvh`)**: Compensates for mobile browser address bars and bottom navigation drawers.
- **Scrollable Adaptive Grid**: Keeps the header title and user profile pinned while housing the map carousel and action buttons inside an auto-scaling container (`max-h-[calc(100dvh-130px)]`).
- **Streamlined Button Grid**:
  - Primary Launch: High-visibility Campaign & Endless modes side-by-side.
  - Map Switcher: Sleek swipeable banner with integrated quick-cycle button and swipe gesture hints.
  - Secondary Actions: 2x2 grid for Hangar, Daily Missions, Touch Controls, and Hall of Fame.

### ASCII Layout Diagram (Mobile Android Viewport)
```
+-------------------------------------------------------------+
| [⚡ VORTEX OVERDRIVE]        [👤 Sign In / Player Profile]  |
| <Top Bar: Safe area aware, flex space-between, z-20>        |
+-------------------------------------------------------------+
|                                                             |
|   +-----------------------------------------------------+   |
|   | 🌌 MAP: SINGULARITY ABYSS  (Hard: 1.5x Multiplier)  |   |
|   | [ < Prev ]   [ Swipe or Tap to Switch ]   [ Next > ]|   |
|   +-----------------------------------------------------+   |
|                                                             |
|   +-----------------------------------------------------+   |
|   | 🚀 LAUNCH CAMPAIGN         | ♾️ ENDLESS SURVIVAL    |   |
|   | (Primary Action 1)         | (Primary Action 2)     |   |
|   +-----------------------------------------------------+   |
|                                                             |
|   +--------------------------+ +--------------------------+ |
|   | 🛠️ SHIP HANGAR           | | 🎯 DAILY ORDERS         | |
|   | Lv.3 Laser • 1,240 🪙    | | 2/3 Completed           | |
|   +--------------------------+ +--------------------------+ |
|   +--------------------------+ +--------------------------+ |
|   | 🎮 TOUCH CONTROLS        | | 🏆 HALL OF FAME         | |
|   | Drag & Auto-Fire Guide   | | Global High Scores      | |
|   +--------------------------+ +--------------------------+ |
|                                                             |
|   +-----------------------------------------------------+   |
|   | ⛶ FULLSCREEN IMMERSION (Android Browser Optimized)  |   |
|   +-----------------------------------------------------+   |
+-------------------------------------------------------------+
```

---

## 5. Key Product Decisions & Trade-Offs

- **Decision 1: Ping-Pong Mirroring vs. Single Scaled Image**
  - *Chosen Approach*: Ping-pong mirrored tiling (`scaleX(-1)`) with soft boundary gradient feathering.
  - *Why*: Instant, high-performance runtime solution that works with all three maps without requiring heavy external image generation or degrading canvas framerates.
- **Decision 2: Responsive Scrollable Grid for Android**
  - *Chosen Approach*: Adaptive 2-column action matrix inside a dynamic viewport height (`100dvh`) scroll container.
  - *Why*: Solves height crowding across diverse Android devices (from 640px portrait to 360px landscape) without hiding any gameplay buttons.
- **Decision 3: Firebase Auth (Google & Facebook) + Firestore Sync**
  - *Chosen Approach*: Popups with auto-fallback and anonymous-to-authenticated profile merger.
  - *Why*: Players can immediately enjoy offline/guest play, but can seamlessly preserve and restore their hard-earned upgrades and coins on Google or Facebook with zero loss.

---

## 6. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                       React Game Shell                      │
├──────────────────────────────┬──────────────────────────────┤
│      TitleScreen (UI)        │       GameCanvas (View)      │
│  - Adaptive 100dvh Grid      │  - GameEngine loop           │
│  - Map Swipe & Select        │  - Ping-Pong Mirror Parallax │
│  - AuthModal (Google / FB)   │  - Soft Seam Crossfader      │
│  - Hangar & Daily Modals     │  - Particle / Combat systems │
└──────────────┬───────────────┴──────────────┬───────────────┘
               │                              │
               ▼                              ▼
┌──────────────────────────────┐ ┌────────────────────────────┐
│      Firebase Service        │ │   Ship Upgrades & Orders   │
│  - GoogleAuthProvider        │ │  - 5 Upgrade branches      │
│  - FacebookAuthProvider      │ │  - 24-hr combat missions   │
│  - Firestore: users/{uid}    │ │  - Gold coin drop engine   │
└──────────────────────────────┘ └────────────────────────────┘
```

### Firestore Document Schema (`users/{userId}`)
```json
{
  "uid": "string",
  "displayName": "string",
  "email": "string",
  "photoURL": "string",
  "providerId": "google.com | facebook.com | anonymous",
  "highScore": 48250,
  "coins": 1850,
  "upgrades": {
    "primaryWeapon": 3,
    "shields": 2,
    "speed": 4,
    "magnet": 2,
    "comboTime": 1
  },
  "dailyMissions": {
    "lastRefreshedDay": "2026-11-04",
    "missions": [...]
  },
  "lastPlayedMap": "NEBULA_STATION",
  "updatedAt": "2026-11-04T05:30:00Z"
}
```

---

## 7. Phased Implementation Roadmap

### Phase 1: Background Loop & Parallax Blending Engine
- Modify `render()` in `src/game/gameEngine.ts` to implement ping-pong mirrored tile rendering (`tileIndex % 2 === 1 ? scaleX(-1) : normal`).
- Add junction edge blend feathering to eliminate seam artifacts.
- Verify continuous visual fluidity across all three maps (`NEBULA_STATION`, `TOXIC_BELT`, `SINGULARITY_ABYSS`).

### Phase 2: Firebase Provisioning & Integration
- Trigger `show_aistudio_ui` with `ui_type: "firebase_setup"` for user consent.
- Complete `ProvisionFirebase` RPC via `fax` integration service.
- Install `firebase` package (`install_applet_package`).
- Create `firebase-blueprint.json` and deploy secure `firestore.rules`.
- Create `src/game/firebase.ts` (Google & Facebook Auth helpers, Firestore progression sync).

### Phase 3: Android Responsive Layout Restructuring
- Overhaul `src/components/TitleScreen.tsx`:
  - Adopt dynamic viewport height (`100dvh`) with safe-area spacing.
  - Consolidate primary actions into side-by-side buttons.
  - Compact map swipe carousel with embedded selector.
  - 2x2 grid for Hangar, Missions, Controls, and Hall of Fame.
  - Clean Cloud Profile pill in top header.

### Phase 4: Auth Modal & End-to-End Progression Wiring
- Create `src/components/AuthModal.tsx` for Google and Facebook login, sync status display, and profile management.
- Wire progression sync in `src/App.tsx` on game over, coin collection, upgrade purchase, and mission claim.
- Provide smooth guest-to-cloud profile merge.

### Phase 5: Verification & Compilation
- Validate with `compile_applet` and `lint_applet` (`tsc --noEmit`).
- Verify smooth, seam-free parallax map rendering and mobile responsive controls.
