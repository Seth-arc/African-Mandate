# African Mandate: Sahel Arena // UI/UX Technical Specification

This document provides a comprehensive technical and design specification for the **African Mandate: Sahel Arena** interface. It serves as the primary reference for developers building out game systems, state management, and new features.

---

## 0. Release Positioning

The current public-facing launch is the v0.1 public web release for desktop and laptop browsers. Production browser, device, storage, media, and network support is defined only in [Production Readiness](./PRODUCTION_READINESS.md#release-support-matrix).

The landing page must run the [unsupported user gate](./PRODUCTION_READINESS.md#unsupported-user-gate) before the React game shell opens the session manager. Unsupported users must see the blocker before a new or resumed campaign can start.

Telemetry copy must say **local QA-only** until the browser queue is replaced by a durable production analytics pipeline and the canonical support contract is updated.

---

## 1. Visual Language & Core Aesthetic
The interface is designed as a **Tactical Situation Room**, emphasizing high-stakes decision-making and real-time monitoring.

*   **Design Style**: "Cyber-Brutalist" and "Glassmorphic." 
*   **Key Attributes**: High contrast, heavy use of transparency, background blurs, and sharp geometric lines.
*   **Color Palette**:
    *   **Backgrounds**: `--bg: #0a0a0a` (Deep Carbon), `--bg-panel: #111111` (Matte Obsidian).
    *   **Primary Accent**: `--gold: #79672bff` (Prestige & Imperial Authority).
    *   **Semantic Feedback**: 
        *   `--alert: #C84B31` (Critical threats, high insurgency).
        *   `--success: #2D9659` (Stabilized zones, successful operations).
        *   `--warning: #E8A523` (Rising tensions, medium threat).
*   **Typography**: Powered by the **Inter** font family. 
    *   **Headers**: Semi-bold/bold weights (700-800) for "military readout" appearance.
    *   **Body**: Light/Regular weights (300-400) for high-density data clarity.
    *   **Onboarding**: Uses **Playfair Display** for high-prestige headings (e.g., in the Landing Page).

---

## 2. Layout Architecture
The interface follows a **Fixed-Fluid-Fixed** three-column structure to maximize the "Theater of Operations" center space.

### 2.1 Header (Fixed, 75px)
*   **Branding**: African Mandate logo and Act/Turn counter.
*   **Action Tracker**: Central readout of `ACTIONS REMAINING` (e.g., 3/3).
*   **Navigation**: Fast-access buttons for "Mission Brief," "Leaderboard," and "Status Report."

### 2.2 Left Sidebar (320px) — Resource & Metric Monitoring
*   **Resource Panel**: Real-time tracking of:
    *   **budget**: Denominated in Millions ($M).
    *   **political_capital**: Abstract influence points.
    *   **personnel**: Active AU deployables.
    *   **intel_points**: Currency for uncovering hidden threats.
*   **Regional Metrics**: Five global state progress bars:
    *   **stability**: General control level.
    *   **insurgency**: Active militant pressure.
    *   **civilian_support**: Heart and minds of the population.
    *   **global_legitimacy**: International standing.
    *   **regional_synergy**: Regional cooperation level.

### 2.3 Center Panel (Fluid) — Tactical Operations
*   **Tactical Map**: Leaflet.js engine rendering the Sahel region.
    *   **Zonal Overlays**: Visual status of Mali, Burkina Faso, Niger, Chad, etc.
    *   **Intel Markers**: Pulsing POIs for IDP camps, smuggling routes, and militia cells.
*   **Scenario Panel**: Contextual briefing area at the bottom center. Includes "Tactical Tags" (e.g., `🔴 CRITICAL SITUATION`) and localized data for the selected territory.

### 2.4 Right Sidebar (380px) — Intelligence & Actors
*   **Intelligence Feed**: A chronologically sorted, auto-updating log of events.
*   **Actor Panel**: Portfolio of regional leaders (e.g., Colonel Goïta, EU Commissioner).
    *   **Sentiment Meters**: Horizontal gauges showing their current favorability toward the AU Envoy.

### 2.5 Action Bar (Fixed Bottom, 85px)
*   Context-aware buttons: **Investigate**, **Secure**, and **Negotiate**.
*   Triggers the "Configuration" sliders for tactical deployments.

---

## 3. Key Component Logic

### 3.1 Tactical Map Engine (Leaflet.js)
*   **Marker Animations**: Uses CSS `@keyframes pulse-red` to draw attention to critical hotspots.
*   **Zonal Filtering**: Dynamic GeoJSON layers that color-shift based on the `stability` metric of the region.

### 3.2 Take Action Engine
A multi-step modal decision system:
1.  **Context Injection**: Injects the currently selected region's data.
2.  **Semantic Targeting**: Shows only the selector required by the selected action's target scope: Territory, Zone, or Actor.
3.  **Resource Configuration**: HTML5 range sliders allow granular allocation of budget and political_capital.
4.  **Real-Time Summation**: Calculates the "Operation Cost" as the user adjusts sliders.
5.  **Review Gate**: Disables Review action while validation fails, keeps the reason visible, and explains target scope before confirmation.

Action and dialogue effects resolve immediately on commit. End Turn resolves delayed effects, per-turn drift, events, and AI director counter-pressure.

### 3.3 Strategic Leaderboard
A premium data visualization for player rankings:
*   **Visual Style**: Glassmorphic overlay with gold/white accents.
*   **Interaction**: Staggered row entry (50ms delay per row) for a "readout" feel.

---

## 4. Technical Implementation Details

### 4.1 State Management
*   **Source of Truth**: A single `gameState` object (synced via `schema.ts`).
*   **Reactive Updates**: UI functions (`updateMetrics()`, `updateResources()`) re-render components only when relevant data nodes change.
*   **Serializable**: The entire state is formatted for JSON serialization to enable Supabase persistence.

### 4.2 Styling & Effects
*   **Glassmorphism Utility**:
    ```css
    background: rgba(17, 17, 17, 0.85);
    backdrop-filter: blur(15px) saturate(160%);
    border: 1px solid rgba(212, 175, 55, 0.15);
    ```
*   **Motion**: `cubic-bezier(0.16, 1, 0.3, 1)` (Quart Out) for fast, military-feel transitions.

### 4.3 Onboarding & Cinematic Reveal
The production `index.html` (single entry point in the repo) includes the cinematic "Pre-Game" experience:
*   **Camera Rig**: GSAP-driven parallax on a high-resolution hero image.
*   **Text Masking**: Characters reveal from beneath transparent masks.
*   **Grain Overlay**: SVG noise filter to add texture to the digital situation room.

---

## 5. Accessibility & DOM Specification

> **Note**: The current `index.html` is the single public entry point. It owns the landing page, release-support gate, cinematic transition, and React game mount. When the entry preflight passes, the React app opens the session manager inside the same page.

### 5.1 DOM IDs and Classes

**Header Components**
| Element | ID | Class | Purpose |
|---------|-----|-------|---------|
| Logo Container | `#header-logo` | `.brand-logo` | Main branding element |
| Turn Counter | `#turn-counter` | `.turn-display` | Current turn indicator |
| Act Label | `#act-label` | `.act-display` | Current act indicator |
| Actions Remaining | `#actions-remaining` | `.action-counter` | Available action slots |
| Mission Brief Button | `#btn-mission-brief` | `.nav-btn` | Opens mission brief modal |
| Leaderboard Button | `#btn-leaderboard` | `.nav-btn` | Opens leaderboard overlay |
| Status Report Button | `#btn-status-report` | `.nav-btn` | Opens status report |

**Left Sidebar Components**
| Element | ID | Class | Purpose |
|---------|-----|-------|---------|
| Resource Panel | `#resource-panel` | `.sidebar-panel` | Container for resources |
| Budget Display | `#resource-budget` | `.resource-item` | Budget value and bar |
| Political Capital | `#resource-political-capital` | `.resource-item` | Political capital display |
| Personnel Display | `#resource-personnel` | `.resource-item` | Personnel count |
| Intel Points | `#resource-intel-points` | `.resource-item` | Intel points display |
| Metrics Panel | `#metrics-panel` | `.sidebar-panel` | Container for metrics |
| Stability Bar | `#metric-stability` | `.metric-bar` | Stability progress bar |
| Insurgency Bar | `#metric-insurgency` | `.metric-bar.metric-negative` | Insurgency level |
| Civilian Support Bar | `#metric-civilian-support` | `.metric-bar` | Civilian support level |
| Legitimacy Bar | `#metric-global-legitimacy` | `.metric-bar` | Global legitimacy |
| Synergy Bar | `#metric-regional-synergy` | `.metric-bar` | Regional synergy |

**Center Panel Components**
| Element | ID | Class | Purpose |
|---------|-----|-------|---------|
| Map Container | `#tactical-map` | `.map-container` | Leaflet map wrapper |
| Scenario Panel | `#scenario-panel` | `.scenario-briefing` | Current scenario display |
| Territory Info | `#territory-info` | `.territory-details` | Selected territory data |
| Event Display | `#event-display` | `.event-panel` | Active event information |

**Right Sidebar Components**
| Element | ID | Class | Purpose |
|---------|-----|-------|---------|
| Intel Feed | `#intel-feed` | `.intel-panel` | Intelligence feed list |
| Intel Item | - | `.intel-item` | Individual intel entry |
| Actor Panel | `#actor-panel` | `.actor-panel` | Actor portfolio |
| Actor Card | - | `.actor-card[data-actor-key]` | Individual actor display |
| Sentiment Gauge | - | `.sentiment-gauge` | Relationship indicator |

**Action Bar Components**
| Element | ID | Class | Purpose |
|---------|-----|-------|---------|
| Action Bar | `#action-bar` | `.action-bar` | Bottom action container |
| Investigate Button | `#btn-investigate` | `.action-btn.action-intel` | Intel action |
| Secure Button | `#btn-secure` | `.action-btn.action-security` | Security action |
| Negotiate Button | `#btn-negotiate` | `.action-btn.action-diplomacy` | Diplomacy action |
| End Turn Button | `#btn-end-turn` | `.action-btn.action-system` | End turn action |

### 5.2 Disabled States

All interactive elements support disabled state styling:

```css
/* Button disabled state */
.action-btn:disabled,
.nav-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  pointer-events: none;
  filter: grayscale(0.5);
}

/* Disabled button hover - no effect */
.action-btn:disabled:hover {
  transform: none;
  box-shadow: none;
}
```

**Disable Conditions**
| Element | Disabled When |
|---------|---------------|
| Action Buttons | `actions_remaining == 0` OR insufficient resources |
| Negotiate Button | `political_capital < 20` (low-impact options only) |
| End Turn Button | Never disabled (always available) |
| Actor Cards | `dialogue_state == "locked"` |
| Territory Selection | `active_events.length > 0` (event must be resolved) |

### 5.3 Tooltip System

Tooltips use a data-attribute based system:

```html
<button
  class="action-btn"
  data-tooltip="true"
  data-tooltip-content="loc.ui.action.investigate.tooltip"
  data-tooltip-position="top">
  Investigate
</button>
```

**Tooltip Positions**: `top` | `bottom` | `left` | `right`

**Tooltip CSS**:
```css
[data-tooltip]::after {
  content: attr(data-tooltip-content);
  position: absolute;
  background: var(--bg-panel);
  border: 1px solid var(--gold);
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 12px;
  white-space: nowrap;
  opacity: 0;
  transition: opacity 0.2s ease;
}

[data-tooltip]:hover::after {
  opacity: 1;
}
```

### 5.4 ARIA Attributes

**Landmark Roles**
| Element | Role | Label |
|---------|------|-------|
| Header | `role="banner"` | - |
| Left Sidebar | `role="complementary"` | `aria-label="Resources and Metrics"` |
| Center Panel | `role="main"` | `aria-label="Tactical Map"` |
| Right Sidebar | `role="complementary"` | `aria-label="Intelligence Feed"` |
| Action Bar | `role="toolbar"` | `aria-label="Available Actions"` |

**Interactive Elements**
```html
<!-- Progress bars -->
<div role="progressbar"
     aria-valuenow="42"
     aria-valuemin="0"
     aria-valuemax="100"
     aria-label="Stability: 42%">
</div>

<!-- Action buttons -->
<button
  aria-describedby="action-cost-tooltip"
  aria-disabled="false">
  Investigate
</button>

<!-- Intel feed -->
<ul role="log" aria-live="polite" aria-label="Intelligence Updates">
  <li role="article">...</li>
</ul>

<!-- Actor cards -->
<article
  role="listitem"
  aria-label="Colonel Goïta - Hostile"
  data-actor-key="junta_mali">
</article>
```

**Focus Management**
- Tab order follows logical flow: Header → Left Sidebar → Map → Right Sidebar → Action Bar
- Modal dialogs trap focus within the dialog
- Escape key closes modals and returns focus to trigger element
- Skip link: `<a href="#tactical-map" class="skip-link">Skip to main content</a>`

### 5.5 Responsive Breakpoints

The breakpoints below describe layout behavior, not production support. The production-supported device classes are defined only in [Production Readiness](./PRODUCTION_READINESS.md#release-support-matrix).

| Breakpoint | Width | Layout Changes |
|------------|-------|----------------|
| Desktop (default) | ≥1440px | Full three-column layout |
| Desktop Small | 1200px-1439px | Sidebars collapse to 280px |
| Tablet Landscape | 992px-1199px | Right sidebar becomes overlay |
| Tablet Portrait | 768px-991px | Both sidebars become overlays |
| Mobile Landscape | 576px-767px | Single column, bottom sheet panels |
| Mobile Portrait | <576px | Single column, minimized header |

**CSS Media Queries**:
```css
/* Desktop Small */
@media (max-width: 1439px) {
  .sidebar { width: 280px; }
}

/* Tablet Landscape */
@media (max-width: 1199px) {
  #actor-panel {
    position: fixed;
    right: -380px;
    transition: right 0.3s ease;
  }
  #actor-panel.visible { right: 0; }
}

/* Tablet Portrait */
@media (max-width: 991px) {
  .sidebar {
    position: fixed;
    transform: translateX(-100%);
  }
  .sidebar.visible { transform: translateX(0); }
  #tactical-map { width: 100%; }
}

/* Mobile */
@media (max-width: 767px) {
  #action-bar {
    flex-direction: column;
    height: auto;
    padding: 16px;
  }
  .action-btn { width: 100%; margin: 4px 0; }
}
```

**Touch Targets**: All interactive elements should maintain minimum 44x44px touch target where touch layouts are later certified. Touch-only play is not production-supported in v0.1.

---

## 6. Backend Integration (Supabase)
*   **Table Schema**: Stores `session_id`, `user_id`, `state` (jsonb), and `last_updated`.
*   **Flow**: Every "Commit Action" triggers a tactical snapshot to the database.
*   **Leaderboard**: Global rankings are fetched from the `profiles` table based on the `strategic_score` metric.

---
**Document Owner**: African Mandate Development Team
**Last Revised**: 2026-01-30

