import * as THREE from 'three';

const viewport = document.getElementById('viewport');
const screen = document.getElementById('screen');
const screenContent = document.getElementById('screen-content');
const scoreValue = document.getElementById('score-value');
const salvageValue = document.getElementById('salvage-value');
const hullCount = document.getElementById('hull-count');
const hullMeter = document.getElementById('hull-meter');
const objectiveValue = document.getElementById('objective-value');
const sectorLabel = document.getElementById('sector-label');
const flightState = document.getElementById('flight-state');
const driftValue = document.getElementById('drift-value');
const soundButton = document.getElementById('sound-button');

const scene = new THREE.Scene();
scene.background = new THREE.Color('#080b10');
scene.fog = new THREE.FogExp2('#080b10', 0.009);

const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 220);
camera.position.set(0, 1.8, 14);
camera.lookAt(0, -1.1, -18);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
viewport.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xb9e3e3, 0x14141a, 1.8));
const keyLight = new THREE.DirectionalLight(0xffd3a1, 2.4);
keyLight.position.set(-5, 8, 4);
scene.add(keyLight);
const rimLight = new THREE.PointLight(0x48d7d5, 28, 45, 2);
rimLight.position.set(5, 0, -11);
scene.add(rimLight);
const starLight = new THREE.PointLight(0xff804d, 34, 72, 2);
starLight.position.set(-18, 9, -68);
scene.add(starLight);

const colors = {
  cyan: 0x69e5e1,
  pale: 0xe4f2eb,
  amber: 0xffbd64,
  coral: 0xff7358,
  red: 0xff463f,
  dark: 0x142029,
};
const clock = new THREE.Clock();
const keys = new Set();
const touchInput = new Set();
const playerBullets = [];
const enemyBullets = [];
const enemies = [];
const asteroids = [];
const pickups = [];
const stars = [];
const upgrades = new Set();

let gameState = 'title';
let ship;
let boss = null;
let score = 0;
let salvage = 0;
let hull = 5;
let sector = 1;
let sectorElapsed = 0;
let elapsed = 0;
let enemySpawnTimer = 1.3;
let asteroidSpawnTimer = 0.7;
let fireTimer = 0;
let dashCooldown = 0;
let dashTime = 0;
let invulnerable = 0;
let soundOn = true;
let audioContext = null;
let shake = 0;

const MAX_HULL = 5;
const SECTOR_LENGTH = 22;
const PLAYER_Z = 4;
const ARENA_X = 8.1;
const ARENA_Y = 4.1;
const upgradeDeck = [
  { id: 'twins', type: 'WEAPON MODULE', name: 'Twin Cannons', text: 'Split your shots into a wide pair of bolts.' },
  { id: 'arc', type: 'WEAPON MODULE', name: 'Arc Coil', text: 'Shots chain once to a nearby target.' },
  { id: 'magnet', type: 'SALVAGE MODULE', name: 'Salvage Magnet', text: 'Collect salvage from farther away.' },
  { id: 'hull', type: 'HULL MODULE', name: 'Reinforced Hull', text: 'Restore one hull and raise max integrity by one.' },
  { id: 'overdrive', type: 'FLIGHT MODULE', name: 'Overdrive', text: 'Increase steering speed and dash duration.' },
];

function makeStars() {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(1050 * 3);
  const sizes = new Float32Array(1050);
  for (let i = 0; i < 1050; i += 1) {
    positions[i * 3] = (Math.random() - 0.5) * 125;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 75;
    positions[i * 3 + 2] = -Math.random() * 170 + 15;
    sizes[i] = Math.random() * 1.2 + 0.25;
  }
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  const material = new THREE.PointsMaterial({ color: 0xb6dadb, size: 0.11, transparent: true, opacity: 0.72, sizeAttenuation: true });
  const field = new THREE.Points(geometry, material);
  scene.add(field);
  stars.push(field);
}

function makeNebula() {
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(8.5, 24, 18),
    new THREE.MeshBasicMaterial({ color: 0xff744f, transparent: true, opacity: 0.13, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  glow.position.set(-18, 9, -72);
  scene.add(glow);
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(3.6, 24, 18),
    new THREE.MeshBasicMaterial({ color: 0xffa45f, transparent: true, opacity: 0.42, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  core.position.copy(glow.position);
  scene.add(core);
  const horizon = new THREE.Mesh(
    new THREE.TorusGeometry(16, 0.045, 6, 100),
    new THREE.MeshBasicMaterial({ color: 0xff825a, transparent: true, opacity: 0.55 }),
  );
  horizon.position.set(-18, 9, -70);
  horizon.rotation.x = 0.3;
  scene.add(horizon);
}

function makeShip() {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.ConeGeometry(0.48, 2.1, 5),
    new THREE.MeshStandardMaterial({ color: colors.pale, metalness: 0.72, roughness: 0.29, emissive: 0x142b30, emissiveIntensity: 0.5 }),
  );
  body.rotation.x = -Math.PI / 2;
  group.add(body);

  const wingShape = new THREE.Shape();
  wingShape.moveTo(0, 0.45);
  wingShape.lineTo(1.55, -0.68);
  wingShape.lineTo(0.3, -0.42);
  wingShape.lineTo(0, 0.45);
  const wingGeo = new THREE.ShapeGeometry(wingShape);
  const wingMat = new THREE.MeshStandardMaterial({ color: 0x278d91, metalness: 0.58, roughness: 0.35, side: THREE.DoubleSide, emissive: 0x062325, emissiveIntensity: 0.7 });
  const leftWing = new THREE.Mesh(wingGeo, wingMat);
  leftWing.position.set(-0.23, 0, 0.15);
  const rightWing = new THREE.Mesh(wingGeo, wingMat);
  rightWing.position.set(0.23, 0, 0.15);
  rightWing.scale.x = -1;
  group.add(leftWing, rightWing);

  const cockpit = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 16, 12),
    new THREE.MeshStandardMaterial({ color: 0x9ff4e8, metalness: 0.45, roughness: 0.18, emissive: 0x42cdd0, emissiveIntensity: 1.3 }),
  );
  cockpit.scale.set(0.7, 0.55, 1.2);
  cockpit.position.set(0, 0.23, -0.14);
  group.add(cockpit);

  const engineMat = new THREE.MeshBasicMaterial({ color: colors.cyan });
  for (const side of [-1, 1]) {
    const engine = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.13, 0.35, 8), engineMat);
    engine.rotation.x = Math.PI / 2;
    engine.position.set(side * 0.48, -0.04, 0.75);
    group.add(engine);
    const flame = new THREE.Mesh(
      new THREE.ConeGeometry(0.11, 0.58, 8),
      new THREE.MeshBasicMaterial({ color: 0x64e5d8, transparent: true, opacity: 0.72, blending: THREE.AdditiveBlending }),
    );
    flame.rotation.x = Math.PI / 2;
    flame.position.set(side * 0.48, -0.04, 1.16);
    group.add(flame);
  }
  group.position.set(0, -0.4, PLAYER_Z);
  group.userData.flames = group.children.filter((child) => child.geometry?.type === 'ConeGeometry').slice(1);
  scene.add(group);
  return group;
}

function makeEnemy() {
  const group = new THREE.Group();
  const core = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.75, 1),
    new THREE.MeshStandardMaterial({ color: 0x9c4140, metalness: 0.62, roughness: 0.33, emissive: 0x521513, emissiveIntensity: 0.8 }),
  );
  core.scale.set(1.25, 0.72, 1.1);
  group.add(core);
  const wingMat = new THREE.MeshStandardMaterial({ color: 0x43252a, metalness: 0.58, roughness: 0.38, side: THREE.DoubleSide });
  for (const side of [-1, 1]) {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.13, 0.55), wingMat);
    wing.position.set(side * 0.92, 0, 0.18);
    wing.rotation.z = side * -0.18;
    group.add(wing);
  }
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 8), new THREE.MeshBasicMaterial({ color: colors.coral }));
  eye.position.set(0, 0.03, -0.64);
  group.add(eye);
  const glow = new THREE.PointLight(colors.coral, 3, 7);
  glow.position.set(0, 0, 0.4);
  group.add(glow);
  group.userData.hp = 2;
  group.userData.phase = Math.random() * Math.PI * 2;
  group.userData.fire = 1.25 + Math.random() * 1.3;
  group.userData.radius = 1.1;
  return group;
}

function makeAsteroid() {
  const size = 0.7 + Math.random() * 1.15;
  const geo = new THREE.DodecahedronGeometry(size, 1);
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color().setHSL(0.08 + Math.random() * 0.04, 0.13, 0.25 + Math.random() * 0.12),
    metalness: 0.34,
    roughness: 0.84,
    flatShading: true,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.scale.set(0.8 + Math.random() * 0.5, 0.7 + Math.random() * 0.5, 0.8 + Math.random() * 0.5);
  mesh.position.set((Math.random() - 0.5) * 16, (Math.random() - 0.5) * 7.4, -53);
  mesh.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
  mesh.userData.hp = 3;
  mesh.userData.radius = size * 0.9;
  mesh.userData.spin = new THREE.Vector3(Math.random() * 0.6, Math.random() * 0.6, Math.random() * 0.6);
  scene.add(mesh);
  asteroids.push(mesh);
}

function makeBoss() {
  const group = new THREE.Group();
  const hullMat = new THREE.MeshStandardMaterial({ color: 0x5b4543, metalness: 0.72, roughness: 0.3, emissive: 0x351511, emissiveIntensity: 0.55 });
  const hullMesh = new THREE.Mesh(new THREE.SphereGeometry(2.35, 24, 18), hullMat);
  hullMesh.scale.set(1.7, 0.65, 1.05);
  group.add(hullMesh);
  const front = new THREE.Mesh(new THREE.ConeGeometry(1.1, 2.4, 6), hullMat);
  front.rotation.x = -Math.PI / 2;
  front.position.z = -2.05;
  group.add(front);
  const wingMat = new THREE.MeshStandardMaterial({ color: 0x80372d, metalness: 0.45, roughness: 0.36, emissive: 0x40100d, emissiveIntensity: 0.4, side: THREE.DoubleSide });
  for (const side of [-1, 1]) {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.26, 1.6), wingMat);
    wing.position.set(side * 3.05, 0, 0.35);
    wing.rotation.z = side * 0.13;
    group.add(wing);
    const cannon = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.25, 1.3, 9), new THREE.MeshStandardMaterial({ color: 0x241d20, emissive: 0x8c211a, emissiveIntensity: 1.3 }));
    cannon.rotation.x = Math.PI / 2;
    cannon.position.set(side * 2.3, -0.15, -1.05);
    group.add(cannon);
  }
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.74, 1), new THREE.MeshBasicMaterial({ color: colors.coral }));
  core.position.set(0, 0.15, -1.3);
  group.add(core);
  const glow = new THREE.PointLight(colors.coral, 22, 22);
  glow.position.set(0, 0, -1.5);
  group.add(glow);
  group.position.set(0, 1, -40);
  group.userData.hp = 55;
  group.userData.maxHp = 55;
  group.userData.fire = 1.6;
  group.userData.radius = 4.1;
  group.userData.entering = true;
  scene.add(group);
  boss = group;
  objectiveValue.textContent = 'SALVAGE CARRIER - 55%';
  sectorLabel.innerHTML = 'FINAL <b>ENCOUNTER</b>';
  flightState.textContent = 'CARRIER SIGNATURE DETECTED';
}

function addPlayerShot(x, y, offset = 0) {
  const mesh = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.075, 0.52, 3, 6),
    new THREE.MeshBasicMaterial({ color: colors.cyan }),
  );
  mesh.rotation.x = Math.PI / 2;
  mesh.position.set(x + offset, y, PLAYER_Z - 0.8);
  scene.add(mesh);
  playerBullets.push(mesh);
}

function addEnemyShot(x, y, z, targetX, targetY, speed = 16) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), new THREE.MeshBasicMaterial({ color: colors.red }));
  mesh.position.set(x, y, z);
  const direction = new THREE.Vector3(targetX - x, targetY - y, 1).normalize();
  mesh.userData.velocity = direction.multiplyScalar(speed);
  scene.add(mesh);
  enemyBullets.push(mesh);
}

function addPickup(position, amount = 1) {
  const group = new THREE.Group();
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.24, 0), new THREE.MeshStandardMaterial({ color: colors.amber, emissive: 0xc16b1e, emissiveIntensity: 1.4, metalness: 0.35, roughness: 0.28 }));
  const halo = new THREE.Mesh(new THREE.TorusGeometry(0.37, 0.025, 5, 20), new THREE.MeshBasicMaterial({ color: colors.amber, transparent: true, opacity: 0.74 }));
  halo.rotation.x = Math.PI / 2;
  group.add(gem, halo);
  group.position.copy(position);
  group.userData.amount = amount;
  group.userData.spin = Math.random() * 2;
  scene.add(group);
  pickups.push(group);
}

function playTone(frequency, duration = 0.075, wave = 'sine', volume = 0.035) {
  if (!soundOn) return;
  try {
    audioContext ??= new AudioContext();
    if (audioContext.state === 'suspended') audioContext.resume();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = wave;
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
    gain.gain.setValueAtTime(volume, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration);
  } catch {
    soundOn = false;
  }
}

function setScreen(content, visible = true) {
  screenContent.innerHTML = content;
  screen.classList.toggle('hidden', !visible);
  if (visible) screenContent.style.animation = 'none';
  requestAnimationFrame(() => { screenContent.style.animation = ''; });
}

function showTitle() {
  setScreen(`
    <div class="screen-kicker">INDEPENDENT SALVAGE DIVISION</div>
    <h1>DRIFT<em>WAKE</em></h1>
    <p class="screen-copy">The ring is coming apart. Strip the wrecks, build your ship, and get out before the star pulls everything under.</p>
    <div class="screen-actions">
      <button class="launch-button" data-action="start" type="button">LAUNCH SALVAGE RUN <span aria-hidden="true">&#8594;</span></button>
      <span class="launch-note">WASD TO STEER<br />SPACE TO FIRE</span>
    </div>
  `);
}

function showUpgradeChoices() {
  gameState = 'upgrade';
  flightState.textContent = 'HOLD POSITION - MODULE SELECTION';
  objectiveValue.textContent = 'CHOOSE ONE MODULE';
  playTone(520, 0.18, 'triangle', 0.045);
  const available = upgradeDeck.filter((item) => item.id !== 'hull' || hull < MAX_HULL + 1);
  const choices = [...available].sort(() => Math.random() - 0.5).slice(0, 3);
  setScreen(`
    <div class="screen-upgrade">
      <div class="screen-kicker">SECTOR ${String(sector).padStart(2, '0')} CLEAR</div>
      <h1>REFIT YOUR SHIP</h1>
      <p class="upgrade-intro">Choose one salvaged module before the next wave.</p>
      <div class="upgrade-list">
        ${choices.map((item) => `<button class="upgrade-option" data-upgrade="${item.id}" type="button"><span class="upgrade-type">${item.type}</span><strong>${item.name}</strong><span>${item.text}</span></button>`).join('')}
      </div>
    </div>
  `);
}

function showEnd(victory) {
  gameState = 'ended';
  flightState.textContent = victory ? 'SALVAGE RUN COMPLETE' : 'SIGNAL LOST';
  objectiveValue.textContent = victory ? 'CARRIER DESTROYED' : 'HULL FAILURE';
  setScreen(`
    <div class="screen-kicker">${victory ? 'EXTRACTION CONFIRMED' : 'RUN TERMINATED'}</div>
    <h1>${victory ? 'RING CLEARED' : 'SHIP LOST'}</h1>
    <p class="screen-copy">${victory ? 'The carrier is down. Your salvage is secured, and the field is yours.' : 'The starfield has gone quiet. Refit and take another run at the ring.'}</p>
    <div class="screen-actions">
      <button class="launch-button" data-action="start" type="button">FLY AGAIN <span aria-hidden="true">&#8594;</span></button>
      <span class="launch-note">SCORE ${String(score).padStart(6, '0')}<br />SALVAGE ${String(salvage).padStart(2, '0')}</span>
    </div>
  `);
}

function updateHud() {
  scoreValue.textContent = String(score).padStart(6, '0');
  salvageValue.textContent = String(salvage).padStart(2, '0');
  hullCount.textContent = `${String(hull).padStart(2, '0')} / ${String(MAX_HULL + (upgrades.has('hull') ? 1 : 0)).padStart(2, '0')}`;
  hullMeter.innerHTML = Array.from({ length: MAX_HULL + (upgrades.has('hull') ? 1 : 0) }, (_, i) => `<span class="hull-segment ${i < hull ? 'full' : ''}"></span>`).join('');
}

function clearRunObjects() {
  for (const list of [playerBullets, enemyBullets, enemies, asteroids, pickups]) {
    for (const object of list) scene.remove(object);
    list.length = 0;
  }
  if (boss) scene.remove(boss);
  boss = null;
  if (ship) scene.remove(ship);
}

function startRun() {
  clearRunObjects();
  score = 0;
  salvage = 0;
  hull = MAX_HULL;
  sector = 1;
  sectorElapsed = 0;
  elapsed = 0;
  enemySpawnTimer = 1.2;
  asteroidSpawnTimer = 0.4;
  fireTimer = 0;
  dashCooldown = 0;
  dashTime = 0;
  invulnerable = 0;
  shake = 0;
  upgrades.clear();
  ship = makeShip();
  gameState = 'running';
  screen.classList.add('hidden');
  sectorLabel.innerHTML = 'SECTOR <b>01</b> / 03';
  flightState.textContent = 'SALVAGE RUN ACTIVE';
  objectiveValue.textContent = 'BREAK WRECKS - COLLECT SALVAGE';
  updateHud();
  playTone(380, 0.22, 'sawtooth', 0.035);
}

function selectUpgrade(id) {
  if (id === 'hull') {
    upgrades.add(id);
    hull = Math.min(hull + 1, MAX_HULL + 1);
  } else if (id === 'twins' || id === 'arc' || id === 'magnet' || id === 'overdrive') {
    upgrades.add(id);
  }
  sector += 1;
  sectorElapsed = 0;
  enemySpawnTimer = 1.4;
  asteroidSpawnTimer = 1.1;
  gameState = 'running';
  screen.classList.add('hidden');
  sectorLabel.innerHTML = `SECTOR <b>${String(sector).padStart(2, '0')}</b> / 03`;
  flightState.textContent = `${upgradeDeck.find((item) => item.id === id)?.name.toUpperCase()} INSTALLED`;
  objectiveValue.textContent = 'SURVIVE THE NEXT WAVE';
  updateHud();
  playTone(720, 0.16, 'triangle', 0.045);
}

function removeFrom(list, index) {
  scene.remove(list[index]);
  list.splice(index, 1);
}

function damagePlayer() {
  if (invulnerable > 0 || gameState !== 'running') return;
  hull -= 1;
  invulnerable = 1.1;
  shake = 0.28;
  updateHud();
  playTone(105, 0.24, 'sawtooth', 0.07);
  if (hull <= 0) showEnd(false);
}

function destroyEnemy(index) {
  const enemy = enemies[index];
  const position = enemy.position.clone();
  scene.remove(enemy);
  enemies.splice(index, 1);
  score += 120;
  addPickup(position, 1 + (Math.random() > 0.72 ? 1 : 0));
  playTone(240, 0.1, 'square', 0.025);
  updateHud();
}

function damageEnemy(enemy) {
  const index = enemies.indexOf(enemy);
  if (index < 0) return;
  enemy.userData.hp -= 1;
  if (enemy.userData.hp <= 0) destroyEnemy(index);
}

function destroyAsteroid(index) {
  const asteroid = asteroids[index];
  const position = asteroid.position.clone();
  scene.remove(asteroid);
  asteroids.splice(index, 1);
  score += 45;
  addPickup(position, 1);
  playTone(170, 0.12, 'triangle', 0.028);
  updateHud();
}

function fire() {
  if (fireTimer > 0 || gameState !== 'running') return;
  const twin = upgrades.has('twins');
  addPlayerShot(ship.position.x, ship.position.y, twin ? -0.22 : 0);
  if (twin) addPlayerShot(ship.position.x, ship.position.y, 0.22);
  fireTimer = Math.max(0.12, upgrades.has('arc') ? 0.18 : 0.22);
  playTone(680, 0.045, 'square', 0.012);
}

function triggerDash() {
  if (gameState !== 'running' || dashCooldown > 0) return;
  dashTime = upgrades.has('overdrive') ? 0.38 : 0.24;
  dashCooldown = 2.5;
  invulnerable = Math.max(invulnerable, dashTime + 0.08);
  playTone(280, 0.1, 'sawtooth', 0.035);
}

function spawnEnemy() {
  const enemy = makeEnemy();
  enemy.position.set((Math.random() - 0.5) * 14, (Math.random() - 0.5) * 6.2, -51);
  scene.add(enemy);
  enemies.push(enemy);
}

function handleInput(delta) {
  const left = keys.has('a') || keys.has('arrowleft') || touchInput.has('left');
  const right = keys.has('d') || keys.has('arrowright') || touchInput.has('right');
  const up = keys.has('w') || keys.has('arrowup') || touchInput.has('up');
  const down = keys.has('s') || keys.has('arrowdown') || touchInput.has('down');
  const firing = keys.has(' ') || touchInput.has('fire');
  if ((keys.has('shift') || touchInput.has('dash')) && dashCooldown <= 0) triggerDash();
  const dx = Number(right) - Number(left);
  const dy = Number(up) - Number(down);
  const speed = (upgrades.has('overdrive') ? 13 : 10.5) * (dashTime > 0 ? 2.15 : 1);
  ship.position.x = THREE.MathUtils.clamp(ship.position.x + dx * speed * delta, -ARENA_X, ARENA_X);
  ship.position.y = THREE.MathUtils.clamp(ship.position.y + dy * speed * delta, -ARENA_Y, ARENA_Y);
  ship.rotation.z = THREE.MathUtils.damp(ship.rotation.z, -dx * 0.27, 8, delta);
  ship.rotation.x = THREE.MathUtils.damp(ship.rotation.x, dy * 0.1, 6, delta);
  if (firing) fire();
  driftValue.textContent = (Math.abs(dx) + Math.abs(dy) ? (2.3 + Math.random() * 0.3).toFixed(1) : '0.0');
}

function updatePlayerBullets(delta) {
  for (let i = playerBullets.length - 1; i >= 0; i -= 1) {
    const bullet = playerBullets[i];
    bullet.position.z -= 49 * delta;
    let hit = false;
    for (let j = enemies.length - 1; j >= 0; j -= 1) {
      const target = enemies[j];
      if (bullet.position.distanceTo(target.position) < 1.12) {
        damageEnemy(target);
        if (upgrades.has('arc')) {
          const chainedTarget = enemies
            .filter((enemy) => enemy !== target)
            .find((enemy) => enemy.position.distanceTo(target.position) < 3.2);
          if (chainedTarget) damageEnemy(chainedTarget);
        }
        scene.remove(bullet);
        playerBullets.splice(i, 1);
        hit = true;
        break;
      }
    }
    if (hit) continue;
    for (let j = asteroids.length - 1; j >= 0; j -= 1) {
      if (bullet.position.distanceTo(asteroids[j].position) < asteroids[j].userData.radius + 0.2) {
        asteroids[j].userData.hp -= 1;
        scene.remove(bullet);
        playerBullets.splice(i, 1);
        if (asteroids[j].userData.hp <= 0) destroyAsteroid(j);
        hit = true;
        break;
      }
    }
    if (hit) continue;
    if (boss && bullet.position.distanceTo(boss.position) < 4.4) {
      boss.userData.hp -= 1;
      scene.remove(bullet);
      playerBullets.splice(i, 1);
      objectiveValue.textContent = `SALVAGE CARRIER - ${Math.max(0, Math.ceil(boss.userData.hp / boss.userData.maxHp * 100))}%`;
      if (boss.userData.hp <= 0) {
        scene.remove(boss);
        boss = null;
        score += 5000;
        updateHud();
        showEnd(true);
      }
      continue;
    }
    if (bullet.position.z < -100) removeFrom(playerBullets, i);
  }
}

function updateEnemies(delta) {
  for (let i = enemies.length - 1; i >= 0; i -= 1) {
    const enemy = enemies[i];
    enemy.position.z += (10 + sector * 1.15) * delta;
    enemy.position.x += Math.sin(elapsed * 1.25 + enemy.userData.phase) * 2.2 * delta;
    enemy.position.y += Math.sin(elapsed * 1.8 + enemy.userData.phase) * 0.7 * delta;
    enemy.rotation.z = Math.sin(elapsed + enemy.userData.phase) * 0.14;
    enemy.userData.fire -= delta;
    if (enemy.userData.fire <= 0 && enemy.position.z < 0) {
      addEnemyShot(enemy.position.x, enemy.position.y, enemy.position.z + 0.2, ship.position.x, ship.position.y, 14.5 + sector);
      enemy.userData.fire = Math.max(0.75, 1.6 + Math.random() * 0.75 - sector * 0.12);
    }
    if (enemy.position.distanceTo(ship.position) < 1.5) {
      damagePlayer();
      removeFrom(enemies, i);
      continue;
    }
    if (enemy.position.z > 8) removeFrom(enemies, i);
  }
}

function updateAsteroids(delta) {
  for (let i = asteroids.length - 1; i >= 0; i -= 1) {
    const asteroid = asteroids[i];
    asteroid.position.z += (10 + sector * 0.8) * delta;
    asteroid.rotation.x += asteroid.userData.spin.x * delta;
    asteroid.rotation.y += asteroid.userData.spin.y * delta;
    asteroid.rotation.z += asteroid.userData.spin.z * delta;
    if (asteroid.position.distanceTo(ship.position) < asteroid.userData.radius + 0.85) {
      damagePlayer();
      removeFrom(asteroids, i);
      continue;
    }
    if (asteroid.position.z > 8) removeFrom(asteroids, i);
  }
}

function updateHostileBullets(delta) {
  for (let i = enemyBullets.length - 1; i >= 0; i -= 1) {
    const bullet = enemyBullets[i];
    bullet.position.addScaledVector(bullet.userData.velocity, delta);
    if (bullet.position.distanceTo(ship.position) < 0.85) {
      damagePlayer();
      removeFrom(enemyBullets, i);
      continue;
    }
    if (bullet.position.z > 10 || Math.abs(bullet.position.x) > 20 || Math.abs(bullet.position.y) > 12) removeFrom(enemyBullets, i);
  }
}

function updatePickups(delta) {
  for (let i = pickups.length - 1; i >= 0; i -= 1) {
    const pickup = pickups[i];
    pickup.position.z += 8 * delta;
    pickup.rotation.y += 1.8 * delta;
    pickup.position.y += Math.sin(elapsed * 3 + pickup.userData.spin) * delta * 0.35;
    const range = upgrades.has('magnet') ? 3.2 : 1.35;
    if (pickup.position.distanceTo(ship.position) < range) {
      salvage += pickup.userData.amount;
      score += pickup.userData.amount * 35;
      updateHud();
      playTone(900, 0.09, 'sine', 0.04);
      removeFrom(pickups, i);
      continue;
    }
    if (pickup.position.z > 8) removeFrom(pickups, i);
  }
}

function updateBoss(delta) {
  if (!boss) return;
  if (boss.userData.entering) {
    boss.position.z = THREE.MathUtils.damp(boss.position.z, -17, 1.4, delta);
    if (boss.position.z > -18) boss.userData.entering = false;
  } else {
    boss.position.x = Math.sin(elapsed * 0.4) * 3.4;
    boss.position.y = 1 + Math.sin(elapsed * 0.65) * 0.6;
  }
  boss.rotation.z = Math.sin(elapsed * 0.45) * 0.05;
  boss.userData.fire -= delta;
  if (boss.userData.fire <= 0 && !boss.userData.entering) {
    for (const side of [-1, 0, 1]) {
      addEnemyShot(boss.position.x + side * 1.6, boss.position.y - 0.3, boss.position.z + 1, ship.position.x, ship.position.y, 15 + Math.abs(side) * 2);
    }
    boss.userData.fire = 1.4;
  }
}

function updateWorld(delta) {
  if (gameState !== 'running') {
    for (const field of stars) {
      const positions = field.geometry.attributes.position;
      for (let i = 0; i < positions.count; i += 1) {
        positions.array[i * 3 + 2] += delta * 7;
        if (positions.array[i * 3 + 2] > 16) positions.array[i * 3 + 2] = -154;
      }
      positions.needsUpdate = true;
    }
    return;
  }
  elapsed += delta;
  if (ship) {
    if (invulnerable > 0) {
      invulnerable -= delta;
      ship.visible = Math.floor(elapsed * 18) % 2 === 0;
    } else ship.visible = true;
    if (dashTime > 0) dashTime -= delta;
    if (dashCooldown > 0) dashCooldown -= delta;
    if (fireTimer > 0) fireTimer -= delta;
    handleInput(delta);
    ship.position.y = THREE.MathUtils.clamp(ship.position.y, -ARENA_Y, ARENA_Y);
    ship.position.x = THREE.MathUtils.clamp(ship.position.x, -ARENA_X, ARENA_X);
    camera.position.x = THREE.MathUtils.damp(camera.position.x, ship.position.x * 0.12, 2, delta);
    camera.lookAt(camera.position.x * 0.4, -1.1, -18);
  }

  for (const field of stars) {
    const positionAttribute = field.geometry.attributes.position;
    for (let i = 0; i < positionAttribute.count; i += 1) {
      positionAttribute.array[i * 3 + 2] += delta * 12;
      if (positionAttribute.array[i * 3 + 2] > 15) positionAttribute.array[i * 3 + 2] = -155;
    }
    positionAttribute.needsUpdate = true;
  }

  if (!boss) {
    sectorElapsed += delta;
    enemySpawnTimer -= delta;
    asteroidSpawnTimer -= delta;
    if (enemySpawnTimer <= 0) {
      spawnEnemy();
      enemySpawnTimer = Math.max(0.85, 2.5 - sector * 0.32) + Math.random() * 0.65;
    }
    if (asteroidSpawnTimer <= 0) {
      makeAsteroid();
      asteroidSpawnTimer = 1.25 + Math.random() * 1.15;
    }
    if (sectorElapsed >= SECTOR_LENGTH) {
      if (sector < 3) showUpgradeChoices();
      else makeBoss();
    }
  }

  updatePlayerBullets(delta);
  updateEnemies(delta);
  updateAsteroids(delta);
  updateHostileBullets(delta);
  updatePickups(delta);
  updateBoss(delta);
  if (shake > 0) shake = Math.max(0, shake - delta);
}

function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.04);
  updateWorld(delta);
  renderer.render(scene, camera);
}

function resize() {
  const width = viewport.clientWidth;
  const height = viewport.clientHeight;
  camera.aspect = width / height;
  camera.fov = width < 700 ? 66 : 58;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
}

function bindInputs() {
  window.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) event.preventDefault();
    keys.add(key);
  });
  window.addEventListener('keyup', (event) => keys.delete(event.key.toLowerCase()));
  window.addEventListener('blur', () => { keys.clear(); touchInput.clear(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { keys.clear(); touchInput.clear(); } });

  document.addEventListener('click', (event) => {
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (action === 'start') startRun();
    const upgrade = event.target.closest('[data-upgrade]')?.dataset.upgrade;
    if (upgrade) selectUpgrade(upgrade);
  });

  document.querySelectorAll('[data-control]').forEach((button) => {
    const control = button.dataset.control;
    const release = (event) => { event.preventDefault(); touchInput.delete(control); };
    button.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      touchInput.add(control);
      if (control === 'dash') triggerDash();
      button.setPointerCapture(event.pointerId);
    });
    button.addEventListener('pointerup', release);
    button.addEventListener('pointercancel', release);
    button.addEventListener('lostpointercapture', () => touchInput.delete(control));
  });

  soundButton.addEventListener('click', () => {
    soundOn = !soundOn;
    soundButton.setAttribute('aria-label', soundOn ? 'Mute sound' : 'Enable sound');
    soundButton.style.color = soundOn ? '' : 'var(--coral)';
    if (soundOn) playTone(520, 0.08, 'sine', 0.035);
  });
}

makeStars();
makeNebula();
ship = makeShip();
bindInputs();
resize();
window.addEventListener('resize', resize);
showTitle();
updateHud();
animate();