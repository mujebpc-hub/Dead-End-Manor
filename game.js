let scene, camera, renderer;
let player;
let torchLight;

let gameStarted = false;
let paused = false;
let torchOn = false;
let running = false;
let health = 100;

let move = { w: false, a: false, s: false, d: false };
let yaw = 0;
let pitch = 0;

let joystick = { active: false, dx: 0, dy: 0 };
let velocityY = 0;
let isJumping = false;

function startGame() {
  document.getElementById("home").style.display = "none";
  document.getElementById("loading").style.display = "flex";

  setTimeout(() => {
    document.getElementById("loading").style.display = "none";
    document.getElementById("menu").style.display = "flex";
  }, 1500);
}

function enterGame() {
  document.getElementById("menu").style.display = "none";
  document.getElementById("gameUI").style.display = "block";
  document.getElementById("gameOver").style.display = "none";
  document.getElementById("victory").style.display = "none";

  if (!gameStarted) {
    gameStarted = true;
    init();
    animate();
  }
}

function createTree(x, z) {
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.5, 5),
    new THREE.MeshStandardMaterial({ color: 0x6b4423 })
  );
  trunk.position.set(x, 2.5, z);
  scene.add(trunk);

  const leaves = new THREE.Mesh(
    new THREE.ConeGeometry(3, 6, 8),
    new THREE.MeshStandardMaterial({ color: 0x1f8f3a })
  );
  leaves.position.set(x, 7, z);
  scene.add(leaves);
}

function createTerrain() {

  const loader = new THREE.TextureLoader();

  const grass = loader.load("textures/grass.jpg");

  grass.wrapS = THREE.RepeatWrapping;
  grass.wrapT = THREE.RepeatWrapping;

  grass.repeat.set(40,40);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(500, 500, 100, 100),
    new THREE.MeshStandardMaterial({
      map: grass
    })
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  const road = new THREE.Mesh(
    new THREE.BoxGeometry(12, 0.2, 250),
    new THREE.MeshStandardMaterial({ color: 0x555555 })
  );
  road.position.set(0, 0.1, -120);
  scene.add(road);

  const hills = [
    [-50, 6, -120, 30, 12],
    [60, 8, -180, 40, 18],
    [20, 4, -60, 25, 10],
    [-90, 5, -200, 35, 15],
  ];

  hills.forEach((h) => {
    const hill = new THREE.Mesh(
      new THREE.BoxGeometry(h[3], h[4], h[3]),
      new THREE.MeshStandardMaterial({ color: 0x3cbf4a })
    );
    hill.position.set(h[0], h[1], h[2]);
    scene.add(hill);
  });

  for (let i = 0; i < 120; i++) {
    createTree(Math.random() * 450 - 225, Math.random() * -450);
  }

  const mansion = new THREE.Mesh(
    new THREE.BoxGeometry(35, 18, 35),
    new THREE.MeshStandardMaterial({ color: 0xe5e5e5 })
  );
  mansion.position.set(0, 9, -250);
  scene.add(mansion);

  const door = new THREE.Mesh(
    new THREE.BoxGeometry(5, 8, 1),
    new THREE.MeshStandardMaterial({ color: 0x333333 })
  );
  door.position.set(0, 4, -232);
  scene.add(door);

  const river = new THREE.Mesh(
    new THREE.BoxGeometry(40, 0.1, 180),
    new THREE.MeshStandardMaterial({ color: 0x3399ff })
  );
  river.position.set(80, 0.05, -120);
  scene.add(river);

  for (let i = 0; i < 40; i++) {
    const rock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(Math.random() * 3 + 1),
      new THREE.MeshStandardMaterial({ color: 0x777777 })
    );
    rock.position.set(Math.random() * 350 - 175, 1, Math.random() * -350);
    scene.add(rock);
  }
}

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050510);
  scene.fog = new THREE.Fog(0xbfdfff, 100, 500);

  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;

  document.body.appendChild(renderer.domElement);

  scene.add(new THREE.AmbientLight(0xffffff, 0.35));

  const moon = new THREE.DirectionalLight(0xaaccff, 0.7);
  moon.castShadow = true;
  moon.shadow.mapSize.width = 2048;
  moon.shadow.mapSize.height = 2048;
  moon.position.set(50, 80, -50);
  scene.add(moon);

  createTerrain();

  player = new THREE.Object3D();
  player.position.set(0, 5, 20);
  scene.add(player);

  player.add(camera);
  camera.position.set(0, 1.6, 0);

  torchLight = new THREE.SpotLight(0xffffff, 0, 90, Math.PI / 7, 0.35, 1.5);
  torchLight.position.set(0, 0, 0);
  camera.add(torchLight);
  camera.add(torchLight.target);
  torchLight.target.position.set(0, 0, -1);

  window.addEventListener("keydown", keyDown);
  window.addEventListener("keyup", keyUp);

  document.addEventListener("click", () => {
    if (!paused && document.body.requestPointerLock) {
      document.body.requestPointerLock();
    }
  });

  document.addEventListener("mousemove", (e) => {
    if (document.pointerLockElement === document.body && !paused) {
      yaw -= e.movementX * 0.002;
      pitch -= e.movementY * 0.002;
      pitch = Math.max(-1.5, Math.min(1.5, pitch));
    }
  });

  setupMobileUiButtons();
  createMobileControls();
  updateHealthUI();

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

function setupMobileUiButtons() {
  const runBtn = document.getElementById("runBtn");

  if (runBtn) {
    runBtn.addEventListener("touchstart", (e) => {
      e.preventDefault();
      running = true;
    });

    runBtn.addEventListener("touchend", (e) => {
      e.preventDefault();
      running = false;
    });

    runBtn.addEventListener("mousedown", () => {
      running = true;
    });

    runBtn.addEventListener("mouseup", () => {
      running = false;
    });

    runBtn.addEventListener("mouseleave", () => {
      running = false;
    });
  }
}

function createMobileControls() {
  const joy = document.createElement("div");
  joy.style.cssText = `
    position: absolute;
    left: 40px;
    bottom: 40px;
    width: 120px;
    height: 120px;
    border-radius: 50%;
    background: rgba(255,255,255,0.25);
    border: 2px solid rgba(255,255,255,0.5);
    z-index: 999;
    touch-action: none;
  `;
  document.body.appendChild(joy);

  let startX = 0;
  let startY = 0;

  joy.addEventListener("touchstart", (e) => {
    e.preventDefault();
    joystick.active = true;
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  });

  joy.addEventListener("touchmove", (e) => {
    e.preventDefault();
    joystick.dx = e.touches[0].clientX - startX;
    joystick.dy = e.touches[0].clientY - startY;
  });

  joy.addEventListener("touchend", () => {
    joystick.active = false;
    joystick.dx = 0;
    joystick.dy = 0;
  });

  const jumpBtn = document.createElement("button");
  jumpBtn.innerHTML = "JUMP";
  jumpBtn.style.cssText = `
    position: absolute;
    right: 40px;
    bottom: 60px;
    width: 90px;
    height: 90px;
    border-radius: 50%;
    font-size: 18px;
    z-index: 999;
    touch-action: none;
  `;
  document.body.appendChild(jumpBtn);

  jumpBtn.addEventListener("touchstart", (e) => {
    e.preventDefault();
    jump();
  });
}

function jump() {
  if (!isJumping && !paused) {
    velocityY = 0.25;
    isJumping = true;
  }
}

function keyDown(e) {
  const key = e.key.toLowerCase();

  if (key === "w") move.w = true;
  if (key === "a") move.a = true;
  if (key === "s") move.s = true;
  if (key === "d") move.d = true;
  if (key === "shift") running = true;
  if (e.code === "Space") jump();
  if (key === "f") toggleTorch();
  if (key === "p" || e.code === "Escape") togglePause();
}

function keyUp(e) {
  const key = e.key.toLowerCase();

  if (key === "w") move.w = false;
  if (key === "a") move.a = false;
  if (key === "s") move.s = false;
  if (key === "d") move.d = false;
  if (key === "shift") running = false;
}

function togglePause() {
  paused = !paused;

  const pauseBtn = document.getElementById("pauseBtn");
  if (pauseBtn) {
    pauseBtn.innerHTML = paused ? "▶" : "⏸";
  }

  if (paused && document.exitPointerLock) {
    document.exitPointerLock();
  }
}

function toggleTorch() {
  torchOn = !torchOn;

  if (torchLight) {
    torchLight.intensity = torchOn ? 4 : 0;
  }

  const torchBtn = document.getElementById("torchBtn");
  if (torchBtn) {
    torchBtn.innerHTML = torchOn ? "🔦 ON" : "🔦 Torch";
  }
}

function updateHealthUI() {
  const healthValue = document.getElementById("healthValue");
  const healthFill = document.getElementById("healthFill");

  if (healthValue) healthValue.innerText = health;
  if (healthFill) healthFill.style.width = health + "%";
}

function damagePlayer(amount) {
  health -= amount;
  health = Math.max(0, health);
  updateHealthUI();

  if (health <= 0) {
    showGameOver();
  }
}

function showGameOver() {
  paused = true;
  document.getElementById("gameUI").style.display = "none";
  document.getElementById("gameOver").style.display = "flex";

  if (document.exitPointerLock) {
    document.exitPointerLock();
  }
}

function showVictory() {
  paused = true;
  document.getElementById("gameUI").style.display = "none";
  document.getElementById("victory").style.display = "flex";

  if (document.exitPointerLock) {
    document.exitPointerLock();
  }
}

function restartGame() {
  location.reload();
}

function backToMenu() {
  location.reload();
}

function animate() {
  requestAnimationFrame(animate);

  if (!player || !renderer || !scene || !camera) return;

  if (paused) {
    renderer.render(scene, camera);
    return;
  }

  const speed = running ? 0.6 : 0.35;

  const fx = Math.sin(yaw);
  const fz = Math.cos(yaw);
  const rx = Math.sin(yaw + Math.PI / 2);
  const rz = Math.cos(yaw + Math.PI / 2);

  if (move.w) {
    player.position.x -= fx * speed;
    player.position.z -= fz * speed;
  }

  if (move.s) {
    player.position.x += fx * speed;
    player.position.z += fz * speed;
  }

  if (move.a) {
    player.position.x -= rx * speed;
    player.position.z -= rz * speed;
  }

  if (move.d) {
    player.position.x += rx * speed;
    player.position.z += rz * speed;
  }

  if (joystick.active) {
    const mobileSpeed = running ? 0.018 : 0.01;
    player.position.x += joystick.dx * mobileSpeed;
    player.position.z += joystick.dy * mobileSpeed;
  }

  player.position.y += velocityY;
  velocityY -= 0.015;

  if (player.position.y <= 5) {
    player.position.y = 5;
    velocityY = 0;
    isJumping = false;
  }

  player.rotation.y = yaw;
  camera.rotation.x = pitch;

  renderer.render(scene, camera);
}
