# African Mandate: Sahel Arena // Sound Design Specification

This document outlines the sonic landscape for the **African Mandate** simulation. The goal is to reinforce the aesthetic of a **Tactical Situation Room** where high-prestige diplomacy meets cold, military-grade data processing.

---

## 1. Ambient Foundations (The "Scenario Room" Audio Architecture)
The background audio is not a static loop, but a **procedural soundscape** designed to minimize auditory fatigue while maintaining a constant state of high-stakes psychological tension.

*   **Subterranean Hum (The "Bunker" Pulse)**: 
    *   **Logic**: A rich, multi-layered foundation at 40Hz - 65Hz.
    *   **Details**: Includes a slightly resonant 50Hz mains-hum to ground the listener. Overlay a rhythmic "breathing" effect using a slow LFO (0.1Hz) on a low-pass filter to simulate high-end server cooling systems fluctuating under load.
    *   **Function**: Acts as the "bed" for all UI sounds, providing a sense of physical weight and containment.

*   **Encrypted Static & Digital Grain (The "Secure Pipe")**: 
    *   **Logic**: High-frequency granular synthesis to simulate a live, encrypted SATCOM link.
    *   **Details**: Randomized bursts of "Digital Grain" (tiny 2ms - 10ms audio particles) processed through a 12-bit bitcrusher. Occasional "packet-loss" artifacts (short, muted clicks) should trigger every 45-90 seconds to reinforce the feeling of a field-transmitted data feed.
    *   **Function**: Provides "texture" and fills the upper frequencies, making the interface feel alive and technically connected.

*   **Dynamic Regional Atmosphere (The "Outside" World)**: 
    *   **Logic**: Spatialized sound assets that respond to Map Zoom and Territory Selection.
    *   **Details**: 
        *   **Desert Night**: A wide-stereo field of low-frequency wind gusts and fine sand-on-metal textures.
        *   **Conflict Heat**: When hovering over "Critical" zones, introduce an ultra-low volume, heavily reverberated metallic "clang" or distant engine rumble to imply activity just beyond the sensor range.
        *   **Zoom Behavior**: As the player zooms in (Map Level 5+), the "Encrypted Static" should decrease in volume while the "Regional Atmosphere" increases, creating a sonic transition from the "Briefing Room" to the "Field Operations."
    *   **Function**: Bridges the gap between the abstract data of the UI and the physical reality of the Sahel.

---

## 2. Universal Navigation & UI
Tactile, clean, and digitized.

| Interaction | Sound Description | Character |
| :--- | :--- | :--- |
| **Hover** | Short "Chirp" | High-frequency (2.5kHz), 15ms duration. |
| **Click (Standard)** | Mechanical Toggle | Medium frequency, tactile "clack." |
| **Click (Primary/Confirm)** | Confirm Thud | Low-frequency "thud" with a digital transient. |
| **Swipe (Slider/Carousel)** | Friction Sweep | A pressurized "whoosh" or tape-scrape sound. |
| **Modal Open** | Pneumatic Release | Air-pressure escape (hiss) with a bass-heavy impact. |
| **Modal Close** | Magnetic Lock | A sharp, magnetic "click" or pneumatic slam. |

---

## 3. Tactical Map interactions
Audio should provide spatial feedback for the simulation.

*   **Region Focus**: A 360-degree spatial "ping" that centers on the selected territory.
*   **Marker Hover**: A rapid "Geiger-Counter" clicking (low volume) to indicate active threat data.
*   **Map Zoom**: A mechanical lens-shifting sound (motorized whir).

---

## 4. Operational & Strategy Cues
Giving weight to decisions and outcomes.

*   **Action Selection**: A rising pitch-bend synthesized sound.
*   **Action Outcome Loading**: "Data Crunching"—a rhythmic sequence of digital glitches and logic processing beeps.
*   **Success (Positive Outcome)**: A melodic chime (Pentatonic or Western-hybrid) with a metallic reverb.
*   **Failure (Negative Outcome)**: A dull, low-end distortive rumble (like a circuit short).
*   **Status Report Update**: A high-speed "Teletype" or "Dot-Matrix" rhythmic clicking as text scrolls.

---

## 5. Narrative & Event Triggers
Breaking the routine with high-impact audio.

*   **Intel Brief (Incoming)**: A three-tone notification chime (High-Mid-Low) similar to emergency broadcasts.
*   **End of Turn / Act Change**: A heavy "Gong" hit mixed with a synthesized bass drop to signify the passage of time.
*   **Metric Alert (stability < 20%)**: A rhythmic, heartbeat-like sub-bass pulse to induce subtle tension.
*   **Leaderboard Reveal**: A shimmering, upward-scaling synthesizer chord to reward performance.

---

## 6. Implementation Notes for Audio Engine
*   **Dynamic Mixing**: UI sounds should duck the Ambient Hum by -3dB to ensure clarity.
*   **Pitch Variation**: Apply a ±5% randomized pitch shift to repeated UI clicks to prevent "machine gun" effect fatigue.
*   **Spatial Audio**: Map pings should use Panning based on the marker's X-position in the viewport.

---
**Document Owner**: African Mandate Sound Design
**Last Revised**: 2026-01-30

