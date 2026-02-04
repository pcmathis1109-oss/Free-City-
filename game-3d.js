import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

const overlay = document.getElementById("overlay");
const startButton = document.getElementById("start");
const toast = document.getElementById("toast");
const togglePauseButton = document.getElementById("togglePause");
const resetButton = document.getElementById("resetGame");
const toggleThemeButton = document.getElementById("toggleTheme");
const npcCountLabel = document.getElementById("npcCount");
const playerCountLabel = document.getElementById("playerCount");
const scoreLabel = document.getElementById("score");
const timeLabel = document.getElementById("time");
const progressBar = document.getElementById("progressBar");

const keys = new Set();
let running = false;
let paused = false;
let nightMode = false;
let score = 0;
const targetScore = 10;

const state = {
  scene: null,
  camera: null,
  renderer: null,
  clock: new THREE.Clock(),
  player: null,
  npcs: [],
  players: [],
  cars: [],
  collectibles: [],
  bounds: { x: 18, z: 14 },
  roadZ: 4,
};

const canvas = document.getElementById("city");

npcCountLabel.textContent = "0";
playerCountLabel.textContent = "0";
scoreLabel.textContent = "0";

window.addEventListener("keydown", (event) => {
  keys.add(event.key.toLowerCase());
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.key.toLowerCase());
});

startButton.addEventListener("click", () => {
  if (!state.scene) {
    initScene();
  }
  startGame();
});

togglePauseButton.addEventListener("click", () => {
  if (!running) return;
  paused = !paused;
  togglePauseButton.textContent = paused ? "Reprendre" : "Pause";
  showToast(paused ? "Pause activée" : "Pause retirée");
});

resetButton.addEventListener("click", () => {
  resetGame();
  showToast("Partie réinitialisée");
});

toggleThemeButton.addEventListener("click", () => {
  nightMode = !nightMode;
  document.body.classList.toggle("night", nightMode);
  toggleThemeButton.textContent = nightMode ? "Mode jour" : "Mode nuit";
  updateLighting();
});

function initScene() {
  state.scene = new THREE.Scene();
  state.scene.background = new THREE.Color(0x0b0f1a);

  state.camera = new THREE.PerspectiveCamera(
    55,
    canvas.clientWidth / canvas.clientHeight,
    0.1,
    200
  );
  state.camera.position.set(0, 18, 26);
  state.camera.lookAt(0, 0, 0);

  state.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  state.renderer.setPixelRatio(window.devicePixelRatio);
  resizeRenderer();

  buildEnvironment();
  spawnEntities();
  updateLighting();

  window.addEventListener("resize", resizeRenderer);
}

function resizeRenderer() {
  if (!state.renderer || !state.camera) return;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  state.renderer.setSize(width, height, false);
  state.camera.aspect = width / height;
  state.camera.updateProjectionMatrix();
}

function buildEnvironment() {
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 40),
    new THREE.MeshStandardMaterial({ color: 0x111b32 })
  );
  ground.rotation.x = -Math.PI / 2;
  state.scene.add(ground);

  const road = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 8),
    new THREE.MeshStandardMaterial({ color: 0x0b1224 })
  );
  road.position.z = state.roadZ;
  road.position.y = 0.01;
  road.rotation.x = -Math.PI / 2;
  state.scene.add(road);

  const buildingColors = [0x23365f, 0x2c4478, 0x263b66, 0x2f4c82, 0x24385f];
  buildingColors.forEach((color, index) => {
    const building = new THREE.Mesh(
      new THREE.BoxGeometry(4, 8 + index * 0.8, 4),
      new THREE.MeshStandardMaterial({ color })
    );
    building.position.set(-20 + index * 10, 4 + index * 0.4, -10);
    state.scene.add(building);
  });
}

function spawnEntities() {
  state.player = createCharacter(0xffd86b, true);
  state.player.position.set(0, 0.8, 8);
  state.scene.add(state.player);

  state.npcs = Array.from({ length: 18 }, () => {
    const npc = createCharacter(0x68b0ff, true);
    npc.position.set(randomRange(-16, 16), 0.8, randomRange(-6, 12));
    npc.userData = {
      speed: randomRange(0.4, 0.8),
      angle: randomRange(0, Math.PI * 2),
    };
    state.scene.add(npc);
    return npc;
  });

  state.players = Array.from({ length: 6 }, () => {
    const player = createCharacter(0xff7aa2, Math.random() > 0.4);
    player.position.set(randomRange(-14, 14), 0.8, randomRange(-4, 12));
    player.userData = {
      speed: randomRange(0.8, 1.2),
      angle: randomRange(0, Math.PI * 2),
    };
    state.scene.add(player);
    return player;
  });

  state.cars = Array.from({ length: 4 }, (_, index) => {
    const car = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 0.8, 1.2),
      new THREE.MeshStandardMaterial({ color: index % 2 === 0 ? 0xff6b6b : 0x6bdcff })
    );
    car.position.set(index % 2 === 0 ? -30 - index * 4 : 30 + index * 4, 0.5, state.roadZ);
    car.userData = { speed: randomRange(1.2, 1.9), direction: index % 2 === 0 ? 1 : -1 };
    state.scene.add(car);
    return car;
  });

  state.collectibles = Array.from({ length: 6 }, () => {
    const collectible = new THREE.Mesh(
      new THREE.SphereGeometry(0.35, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0xffd86b, emissive: 0x3a2a00 })
    );
    collectible.position.set(randomRange(-16, 16), 0.6, randomRange(-2, 12));
    collectible.userData = { pulse: randomRange(0, Math.PI * 2) };
    state.scene.add(collectible);
    return collectible;
  });

  npcCountLabel.textContent = state.npcs.length.toString();
  playerCountLabel.textContent = state.players.length.toString();
}

function createCharacter(color, sunglasses) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.6, 0.6, 1.2, 16),
    new THREE.MeshStandardMaterial({ color })
  );
  body.position.y = 0.6;
  group.add(body);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 16, 16),
    new THREE.MeshStandardMaterial({ color: 0xf5d7b2 })
  );
  head.position.y = 1.5;
  group.add(head);

  if (sunglasses) {
    const glasses = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 0.2, 0.05),
      new THREE.MeshStandardMaterial({ color: 0x0b0f1a })
    );
    glasses.position.set(0, 1.5, 0.45);
    group.add(glasses);
  }

  return group;
}

function startGame() {
  running = true;
  paused = false;
  togglePauseButton.textContent = "Pause";
  overlay.style.display = "none";
  showToast("Trouve 10 bonus pour gagner !");
  animate();
}

function resetGame() {
  score = 0;
  scoreLabel.textContent = "0";
  updateProgress();
  state.player.position.set(0, 0.8, 8);
  state.collectibles.forEach((collectible) => {
    collectible.position.set(randomRange(-16, 16), 0.6, randomRange(-2, 12));
  });
  overlay.querySelector("h2").textContent = "Entrer dans Free City";
  overlay.querySelector("p").textContent =
    "La ville est vivante : les PNJ portent des lunettes de soleil, les joueurs réels se déplacent librement. Attrape les bonus, évite les voitures et gagne la partie !";
  startButton.textContent = "Démarrer la scène";
  overlay.style.display = "grid";
  running = false;
}

function finishGame() {
  running = false;
  overlay.style.display = "grid";
  overlay.querySelector("h2").textContent = "Bravo !";
  overlay.querySelector("p").textContent =
    "Tu as atteint " + targetScore + " bonus. Relance la scène pour rejouer.";
  startButton.textContent = "Rejouer";
}

function animate() {
  if (!running) return;
  if (paused) {
    requestAnimationFrame(animate);
    return;
  }

  updateClock();
  updatePlayer();
  updateNPCs();
  updateCars();
  updateCollectibles();

  state.renderer.render(state.scene, state.camera);
  requestAnimationFrame(animate);
}

function updatePlayer() {
  let dx = 0;
  let dz = 0;
  if (keys.has("arrowup") || keys.has("w")) dz -= 1;
  if (keys.has("arrowdown") || keys.has("s")) dz += 1;
  if (keys.has("arrowleft") || keys.has("a")) dx -= 1;
  if (keys.has("arrowright") || keys.has("d")) dx += 1;
  const magnitude = Math.hypot(dx, dz) || 1;
  const sprint = keys.has("shift");
  const speed = sprint ? 0.35 : 0.22;
  state.player.position.x = clamp(
    state.player.position.x + (dx / magnitude) * speed,
    -state.bounds.x,
    state.bounds.x
  );
  state.player.position.z = clamp(
    state.player.position.z + (dz / magnitude) * speed,
    -state.bounds.z,
    state.bounds.z
  );
}

function updateNPCs() {
  [...state.npcs, ...state.players].forEach((entity) => {
    entity.userData.angle += randomRange(-0.08, 0.08);
    entity.position.x += Math.cos(entity.userData.angle) * entity.userData.speed * 0.1;
    entity.position.z += Math.sin(entity.userData.angle) * entity.userData.speed * 0.1;
    entity.position.x = clamp(entity.position.x, -state.bounds.x, state.bounds.x);
    entity.position.z = clamp(entity.position.z, -state.bounds.z, state.bounds.z);
  });
}

function updateCars() {
  state.cars.forEach((car) => {
    car.position.x += car.userData.speed * car.userData.direction * 0.2;
    if (car.userData.direction === 1 && car.position.x > 34) car.position.x = -34;
    if (car.userData.direction === -1 && car.position.x < -34) car.position.x = 34;

    if (car.position.distanceTo(state.player.position) < 1.4) {
      score = Math.max(0, score - 1);
      scoreLabel.textContent = score.toString();
      updateProgress();
      state.player.position.set(0, 0.8, 8);
      showToast("Aïe ! Une voiture t'a touché.");
    }
  });
}

function updateCollectibles() {
  state.collectibles.forEach((collectible) => {
    collectible.userData.pulse += 0.08;
    collectible.position.y = 0.6 + Math.sin(collectible.userData.pulse) * 0.1;
    if (collectible.position.distanceTo(state.player.position) < 1) {
      score += 1;
      scoreLabel.textContent = score.toString();
      updateProgress();
      collectible.position.set(randomRange(-16, 16), 0.6, randomRange(-2, 12));
      showToast("Bonus récupéré !");
      if (score >= targetScore) {
        finishGame();
      }
    }
  });
}

function updateLighting() {
  if (!state.scene) return;
  state.scene.traverse((child) => {
    if (child.isLight) {
      state.scene.remove(child);
    }
  });

  const ambient = new THREE.AmbientLight(nightMode ? 0x303040 : 0xffffff, nightMode ? 0.5 : 0.8);
  const directional = new THREE.DirectionalLight(nightMode ? 0x9bb3ff : 0xffffff, nightMode ? 0.8 : 1.1);
  directional.position.set(8, 12, 6);
  state.scene.add(ambient, directional);
}

function updateClock() {
  const now = new Date();
  timeLabel.textContent = now.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function updateProgress() {
  const percent = Math.min((score / targetScore) * 100, 100);
  progressBar.style.width = `${percent}%`;
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  if (toast.timeout) {
    clearTimeout(toast.timeout);
  }
  toast.timeout = setTimeout(() => {
    toast.classList.remove("is-visible");
  }, 1600);
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function randomRange(min, max) {
  return Math.random() * (max - min) + min;
}

updateClock();
updateProgress();
