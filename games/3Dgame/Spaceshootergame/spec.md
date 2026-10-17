# Driftwake

## Game Summary

**Genre:** Single-player 3D arcade space shooter  
**Platform:** Browser  
**Session length:** 5-10 minutes

Pilot a salvage ship through the wreckage orbiting an unstable star. Scavenge parts, fend off rival drones, and build a different ship on every run before the star's pull swallows the field.

## Design Pillars

- **Readable 3D action:** Keep the ship, threats, and pickups easy to track while the world moves quickly.
- **Risk becomes reward:** Break wrecks for salvage, but flying close to them puts the ship in danger.
- **A ship that is yours:** Run upgrades visibly change the ship and how it fights.

## Core Run

1. Fly into a debris zone and survive its enemy wave.
2. Weave around wreckage and shoot it apart to release salvage.
3. Collect salvage while avoiding collisions and enemy fire.
4. Choose one of three ship modules between waves.
5. Survive three zones and defeat the salvage carrier to escape.

Destroyed ships and wrecks can drop salvage. Salvage is collected by flying through it; it is not a separate currency between runs. The unstable star creates a rising danger over time, so lingering to collect everything is never completely safe.

## Controls and Camera

- **WASD / arrow keys:** Steer across the flight lane.
- **Space:** Fire the primary weapon.
- **Shift:** Short forward dash with a brief cooldown.
- **Mouse:** Navigate menus and select upgrades.

The ship flies forward automatically. Use a close third-person chase camera with a slight offset, keeping the ship low enough in frame to see incoming hazards. Movement is limited to a broad 3D flight lane so depth and collisions remain readable.

## Combat and Upgrades

The primary weapon fires forward, rewarding positioning and steady aim. Enemies telegraph attacks before firing. The dash avoids damage and helps cross dangerous gaps, but cannot be held continuously.

After each zone, offer three choices from a small module pool. Modules should have immediate, visible effects, for example:

- **Twin Cannons:** Split each shot into two weaker projectiles.
- **Arc Coil:** Shots chain to a nearby target.
- **Salvage Magnet:** Pull nearby salvage toward the ship.
- **Reinforced Hull:** Increase health and reduce collision damage.
- **Overdrive Thrusters:** Increase movement speed and dash distance.

Modules stack during a run. Keep the first version's pool small enough that each choice is distinct and easy to balance.

## Threats

- **Scout drone:** Basic pursuer that fires slow, clearly telegraphed shots.
- **Rammer:** Charges the player's last position, then briefly stalls.
- **Wreck cluster:** Stationary collision hazard that can be shot apart for salvage.
- **Salvage carrier:** Final encounter that launches scouts and exposes weak points between attacks.

## Art and Audio Direction

Use a colorful, high-contrast arcade look: a deep near-black space backdrop, cool cyan ship lighting, warm amber salvage, and distinct red enemy attack cues. Give wrecks varied silhouettes and readable outlines. Keep particles brief and avoid effects that obscure incoming projectiles.

Audio should make each action legible: a crisp weapon pulse, a bright salvage pickup, a low warning as the star's pull increases, and a heavier layered cue when a module is installed.

## First Playable Version

- One ship, one flight lane, one starfield, and one debris field.
- Responsive steering, primary fire, dash, health, and collisions.
- Scout drones, wreck clusters, salvage drops, and the salvage carrier.
- Three short zones with a module choice between zones.
- Clear start, victory, and defeat screens; restart without reloading the page.

The first version should prove the flight feel, readable combat, and satisfying salvage choices. Defer persistent unlocks, online features, multiple ships, and elaborate story content until that loop is fun.

## Success Criteria

- A new player can understand movement and shooting within the first wave.
- Salvage pickups feel worth the risk of moving near wreckage.
- Module choices produce noticeably different builds by the final zone.
- The player can identify the source of damage and react to enemy attacks.
- A full run ends cleanly in victory or defeat and can be restarted immediately.
