const canvas = document.getElementById("city");
const ctx = canvas.getContext("2d");
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

const width = canvas.width;
const height = canvas.height;

const keys = new Set();
let running = false;
let score = 0;
const targetScore = 10;
let paused = false;
let nightMode = false;

const city = {
  buildings: [
    { x: 40, y: 40, w: 140, h: 160, color: "#23365f" },
    { x: 220, y: 30, w: 120, h: 190, color: "#2c4478" },
    { x: 380, y: 50, w: 160, h: 180, color: "#263b66" },
    { x: 590, y: 40, w: 140, h: 170, color: "#2f4c82" },
    { x: 750, y: 60, w: 160, h: 150, color: "#24385f" },
  ],
  roads: [
    { x: 0, y: 300, w: width, h: 80 },
    { x: 160, y: 250, w: 140, h: 200 },
    { x: 450, y: 230, w: 150, h: 230 },
  ],
};

const player = createEntity({
  type: "hero",
  x: width * 0.5,
  y: height * 0.7,
  color: "#ffd86b",
  speed: 2.4,
});

const npcs = Array.from({ length: 18 }, (_, i) =>
  createEntity({
    type: "npc",
    x: 80 + Math.random() * (width - 160),
    y: 230 + Math.random() * 250,
    color: i % 2 === 0 ? "#68b0ff" : "#7fffd4",
    sunglasses: true,
    speed: 0.8 + Math.random() * 0.6,
  })
);

const players = Array.from({ length: 6 }, (_, i) =>
  createEntity({
    type: "player",
    x: 110 + Math.random() * (width - 220),
    y: 200 + Math.random() * 280,
    color: i % 2 === 0 ? "#ff7aa2" : "#a5ff90",
    sunglasses: Math.random() > 0.4,
    speed: 1.1 + Math.random() * 0.8,
  })
);

npcCountLabel.textContent = npcs.length.toString();
playerCountLabel.textContent = players.length.toString();
scoreLabel.textContent = score.toString();

window.addEventListener("keydown", (event) => {
  keys.add(event.key.toLowerCase());
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.key.toLowerCase());
});

startButton.addEventListener("click", () => {
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
});

function createEntity({ type, x, y, color, sunglasses = false, speed }) {
  return {
    type,
    x,
    y,
    color,
    sunglasses,
    speed,
    angle: Math.random() * Math.PI * 2,
  };
}

const collectibles = Array.from({ length: 6 }, () => createCollectible());

const cars = Array.from({ length: 4 }, (_, i) => ({
  x: i % 2 === 0 ? -80 - i * 120 : width + 80 + i * 120,
  y: 330 + (i % 2) * 40,
  w: 80,
  h: 30,
  speed: 1.8 + Math.random() * 1.2,
  direction: i % 2 === 0 ? 1 : -1,
  color: i % 2 === 0 ? "#ff6b6b" : "#6bdcff",
}));

function createCollectible() {
  return {
    x: 80 + Math.random() * (width - 160),
    y: 240 + Math.random() * 240,
    radius: 8,
    pulse: Math.random() * Math.PI * 2,
  };
}

function updateEntity(entity, bounds) {
  if (entity.type === "npc") {
    entity.angle += (Math.random() - 0.5) * 0.2;
  } else if (entity.type === "player") {
    entity.angle += 0.03;
  }

  entity.x += Math.cos(entity.angle) * entity.speed;
  entity.y += Math.sin(entity.angle) * entity.speed;

  if (entity.x < bounds.left || entity.x > bounds.right) {
    entity.angle = Math.PI - entity.angle;
  }
  if (entity.y < bounds.top || entity.y > bounds.bottom) {
    entity.angle = -entity.angle;
  }

  entity.x = clamp(entity.x, bounds.left, bounds.right);
  entity.y = clamp(entity.y, bounds.top, bounds.bottom);
}

function updatePlayer() {
  let dx = 0;
  let dy = 0;
  if (keys.has("arrowup") || keys.has("w")) dy -= 1;
  if (keys.has("arrowdown") || keys.has("s")) dy += 1;
  if (keys.has("arrowleft") || keys.has("a")) dx -= 1;
  if (keys.has("arrowright") || keys.has("d")) dx += 1;

  const magnitude = Math.hypot(dx, dy) || 1;
  const sprint = keys.has("shift");
  const speedBoost = sprint ? 1.6 : 1;
  player.x += (dx / magnitude) * player.speed * speedBoost;
  player.y += (dy / magnitude) * player.speed * speedBoost;

  player.x = clamp(player.x, 60, width - 60);
  player.y = clamp(player.y, 210, height - 40);
}

function drawScene() {
  ctx.clearRect(0, 0, width, height);
  drawSky();
  drawBuildings();
  drawRoads();
  drawCars();
  drawCollectibles();
  drawPeople();
  drawHUD();
}

function drawSky() {
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#1e2c4d");
  gradient.addColorStop(1, "#0a1224");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

function drawBuildings() {
  city.buildings.forEach((building) => {
    ctx.fillStyle = building.color;
    ctx.fillRect(building.x, building.y, building.w, building.h);
    ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
    for (let i = 0; i < 4; i += 1) {
      ctx.fillRect(building.x + 20, building.y + 20 + i * 35, building.w - 40, 12);
    }
  });
}

function drawRoads() {
  city.roads.forEach((road) => {
    ctx.fillStyle = "#111b32";
    ctx.fillRect(road.x, road.y, road.w, road.h);
    ctx.strokeStyle = "rgba(255, 216, 107, 0.35)";
    ctx.setLineDash([10, 10]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(road.x + 10, road.y + road.h / 2);
    ctx.lineTo(road.x + road.w - 10, road.y + road.h / 2);
    ctx.stroke();
    ctx.setLineDash([]);
  });
}

function drawCars() {
  cars.forEach((car) => {
    ctx.fillStyle = car.color;
    ctx.fillRect(car.x, car.y, car.w, car.h);
    ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
    ctx.fillRect(car.x + 10, car.y + 6, car.w - 20, 8);
    ctx.fillStyle = "#1b243d";
    ctx.fillRect(car.x + 8, car.y + 20, 14, 6);
    ctx.fillRect(car.x + car.w - 22, car.y + 20, 14, 6);
  });
}

function drawCollectibles() {
  collectibles.forEach((collectible) => {
    collectible.pulse += 0.08;
    const glow = 6 + Math.sin(collectible.pulse) * 3;
    ctx.fillStyle = "rgba(255, 216, 107, 0.25)";
    ctx.beginPath();
    ctx.arc(collectible.x, collectible.y, collectible.radius + glow, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffd86b";
    ctx.beginPath();
    ctx.arc(collectible.x, collectible.y, collectible.radius, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawPeople() {
  const everyone = [player, ...npcs, ...players];
  everyone.sort((a, b) => a.y - b.y);

  everyone.forEach((person) => {
    ctx.fillStyle = person.color;
    ctx.beginPath();
    ctx.arc(person.x, person.y, 12, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#101621";
    ctx.beginPath();
    ctx.arc(person.x - 4, person.y - 2, 3, 0, Math.PI * 2);
    ctx.arc(person.x + 4, person.y - 2, 3, 0, Math.PI * 2);
    ctx.fill();

    if (person.sunglasses) {
      ctx.fillStyle = "#0b0f1a";
      ctx.fillRect(person.x - 8, person.y - 6, 16, 5);
      ctx.fillStyle = "#1f293d";
      ctx.fillRect(person.x - 10, person.y - 6, 6, 5);
      ctx.fillRect(person.x + 4, person.y - 6, 6, 5);
      ctx.strokeStyle = "#3c4b6b";
      ctx.beginPath();
      ctx.moveTo(person.x - 4, person.y - 4);
      ctx.lineTo(person.x + 4, person.y - 4);
      ctx.stroke();
    }

    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    ctx.beginPath();
    ctx.ellipse(person.x, person.y + 14, 10, 4, 0, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawHUD() {
  ctx.fillStyle = "rgba(7, 11, 20, 0.65)";
  ctx.fillRect(16, 16, 220, 70);
  ctx.fillStyle = "#ffd86b";
  ctx.font = "bold 14px Inter, sans-serif";
  ctx.fillText("Free City • Zone centrale", 28, 40);
  ctx.fillStyle = "#b9c8e6";
  ctx.font = "12px Inter, sans-serif";
  ctx.fillText("PNJ à lunettes : " + npcs.length, 28, 58);
  ctx.fillText("Joueurs actifs : " + players.length, 28, 74);
}

function updateClock() {
  const now = new Date();
  timeLabel.textContent = now.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function loop() {
  if (!running) return;
  if (paused) {
    requestAnimationFrame(loop);
    return;
  }
  updateClock();
  updatePlayer();

  const bounds = { left: 40, right: width - 40, top: 210, bottom: height - 30 };
  npcs.forEach((npc) => updateEntity(npc, bounds));
  players.forEach((playerEntity) => updateEntity(playerEntity, bounds));
  updateCars();
  checkCollectibles();

  drawScene();
  requestAnimationFrame(loop);
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function updateCars() {
  cars.forEach((car) => {
    car.x += car.speed * car.direction;
    if (car.direction === 1 && car.x > width + 120) {
      car.x = -120;
    }
    if (car.direction === -1 && car.x < -120) {
      car.x = width + 120;
    }

    if (intersectsPlayer(car)) {
      score = Math.max(0, score - 1);
      scoreLabel.textContent = score.toString();
      updateProgress();
      player.x = width * 0.5;
      player.y = height * 0.7;
      showToast("Aïe ! Une voiture t'a touché.");
    }
  });
}

function checkCollectibles() {
  collectibles.forEach((collectible, index) => {
    const distance = Math.hypot(player.x - collectible.x, player.y - collectible.y);
    if (distance < 18) {
      score += 1;
      scoreLabel.textContent = score.toString();
      updateProgress();
      collectibles[index] = createCollectible();
      showToast("Bonus récupéré !");
      if (score >= targetScore) {
        finishGame();
      }
    }
  });
}

function intersectsPlayer(car) {
  const playerRadius = 12;
  const closestX = clamp(player.x, car.x, car.x + car.w);
  const closestY = clamp(player.y, car.y, car.y + car.h);
  const distance = Math.hypot(player.x - closestX, player.y - closestY);
  return distance < playerRadius + 4;
}

let toastTimeout = null;
function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  if (toastTimeout) {
    clearTimeout(toastTimeout);
  }
  toastTimeout = setTimeout(() => {
    toast.classList.remove("is-visible");
  }, 1600);
}

function updateProgress() {
  const percent = Math.min((score / targetScore) * 100, 100);
  progressBar.style.width = `${percent}%`;
}

function startGame() {
  running = true;
  paused = false;
  togglePauseButton.textContent = "Pause";
  overlay.style.display = "none";
  showToast("Trouve 10 bonus pour gagner !");
  requestAnimationFrame(loop);
}

function resetGame() {
  score = 0;
  scoreLabel.textContent = score.toString();
  updateProgress();
  player.x = width * 0.5;
  player.y = height * 0.7;
  collectibles.splice(0, collectibles.length, ...Array.from({ length: 6 }, () => createCollectible()));
  cars.forEach((car, index) => {
    car.x = index % 2 === 0 ? -80 - index * 120 : width + 80 + index * 120;
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

updateClock();
updateProgress();
