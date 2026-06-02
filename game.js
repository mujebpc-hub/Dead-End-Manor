Bhai, ye **full final `game.js`** copy-paste karo. Isme world, terrain, FPS player, collision, ghost enemy AI, patrol/chase/jumpscare sab add hai.

`index.html` me change tabhi chahiye agar usme `gameUI`, `gameOver`, `victory`, `healthValue`, `healthFill`, `pauseBtn`, `torchBtn`, `runBtn` IDs nahi hain. Agar tumne mera previous index use kiya hai, to kuch change nahi chahiye.

```js
let scene, camera, renderer, clock;
let player, torchLight, enemy;
let gameStarted = false;
let paused = false;
let torchOn = false;
let running = false;
let health = 100;

const WORLD_WIDTH = 1500;
const WORLD_DEPTH = 1800;
const playerHeight = 5;
const eyeHeight = 1.6;
const walkSpeed = 10;
const runSpeed = 16;
const mouseSensitivity = 0.002;

let yaw = 0;
let pitch = 0;
let velocityY = 0;
let isJumping = false;
let lastSafePosition = new THREE.Vector3();

let move = { w: false, a: false, s: false, d: false };
let joystick = { active: false, dx: 0, dy: 0 };

let colliders = [];
let enemyState = "patrol";
let enemyTarget = new THREE.Vector3();
let enemyPauseTimer = 0;
let jumpscareStarted = false;

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

  requestPointerControl();
}

function init() {
  clock = new THREE.Clock();
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x030612);
  scene.fog = new THREE.Fog(0x050816, 45, 260);

  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1200
  );

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.85;
  document.body.appendChild(renderer.domElement);

  scene.add(new THREE.AmbientLight(0x6f7fa8, 0.22));

  const moon = new THREE.DirectionalLight(0xaac8ff, 0.9);
  moon.position.set(-120, 180, 90);
  moon.castShadow = true;
  moon.shadow.mapSize.set(2048, 2048);
  scene.add(moon);

  createWorld();

  player = new THREE.Object3D();
  player.position.set(0, getTerrainHeight(0, 20) + playerHeight, 20);
  lastSafePosition.copy(player.position);
  scene.add(player);

  player.add(camera);
  camera.position.set(0, eyeHeight, 0);
  camera.rotation.order = "YXZ";

  torchLight = new THREE.SpotLight(0xffffff, 0, 120, Math.PI / 7, 0.35, 1.5);
  camera.add(torchLight);
  camera.add(torchLight.target);
  torchLight.target.position.set(0, 0, -1);

  window.addEventListener("keydown", keyDown);
  window.addEventListener("keyup", keyUp);
  document.addEventListener("click", requestPointerControl);
  document.addEventListener("mousemove", handleMouseLook);
  document.addEventListener("pointerlockchange", handlePointerLockChange);
  window.addEventListener("resize", onResize);

  setupMobileUiButtons();
  createMobileControls();
  updateHealthUI();
}

function createWorld() {
  createTerrain();
  createMansion();
  createForest();
  createRocks();
  createEnemy();
}

function getTerrainHeight(x, z) {
  return (
    Math.sin(x * 0.012) * 3 +
    Math.cos(z * 0.01) * 4 +
    Math.sin((x + z) * 0.006) * 5
  );
}

function createTerrain() {
  const loader = new THREE.TextureLoader();
  const grass = loader.load("textures/grass.jpg");
  grass.wrapS = THREE.RepeatWrapping;
  grass.wrapT = THREE.RepeatWrapping;
  grass.repeat.set(90, 110);

  const geometry = new THREE.PlaneGeometry(WORLD_WIDTH, WORLD_DEPTH, 140, 160);
  geometry.rotateX(-Math.PI / 2);

  const pos = geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    pos.setY(i, getTerrainHeight(x, z));
  }

  geometry.computeVertexNormals();

  const ground = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({ map: grass, roughness: 1 })
  );
  ground.receiveShadow = true;
  scene.add(ground);

  const road = new THREE.Mesh(
    new THREE.BoxGeometry(16, 0.25, 420),
    new THREE.MeshStandardMaterial({ color: 0x343434 })
  );
  road.position.set(0, getTerrainHeight(0, -130) + 0.12, -130);
  road.castShadow = true;
  road.receiveShadow = true;
  scene.add(road);
}

function createMansion() {
  const mansion = new THREE.Mesh(
    new THREE.BoxGeometry(70, 32, 60),
    new THREE.MeshStandardMaterial({ color: 0xb8b8b8, roughness: 0.9 })
  );
  mansion.position.set(0, getTerrainHeight(0, -420) + 16, -420);
  mansion.castShadow = true;
  mansion.receiveShadow = true;
  scene.add(mansion);
  addBoxCollider(mansion);

  const door = new THREE.Mesh(
    new THREE.BoxGeometry(9, 15, 1.5),
    new THREE.MeshStandardMaterial({ color: 0x151515 })
  );
  door.position.set(0, getTerrainHeight(0, -389) + 7.5, -389);
  scene.add(door);
  addBoxCollider(door);

  const tower = new THREE.Mesh(
    new THREE.BoxGeometry(22, 48, 22),
    new THREE.MeshStandardMaterial({ color: 0x999999 })
  );
  tower.position.set(-35, getTerrainHeight(-35, -420) + 24, -420);
  tower.castShadow = true;
  scene.add(tower);
  addBoxCollider(tower);
}

function createTree(x, z) {
  const groundY = getTerrainHeight(x, z);

  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.6, 0.9, 7, 8),
    new THREE.MeshStandardMaterial({ color: 0x4a2b17 })
  );
  trunk.position.set(x, groundY + 3.5, z);
  trunk.castShadow = true;
  scene.add(trunk);
  addCylinderCollider(x, z, 2.2);

  const leaves = new THREE.Mesh(
    new THREE.ConeGeometry(4.5, 9, 8),
    new THREE.MeshStandardMaterial({ color: 0x0d3d1d })
  );
  leaves.position.set(x, groundY + 10, z);
  leaves.castShadow = true;
  scene.add(leaves);
}

function createForest() {
  for (let i = 0; i < 360; i++) {
    const x = Math.random() * WORLD_WIDTH - WORLD_WIDTH / 2;
    const z = Math.random() * WORLD_DEPTH - WORLD_DEPTH / 2;

    if (Math.abs(x) < 85 && z > -500 && z < -340) continue;
    if (Math.abs(x) < 25 && z > -360 && z < 120) continue;

    createTree(x, z);
  }
}

function createRocks() {
  for (let i = 0; i < 120; i++) {
    const x = Math.random() * WORLD_WIDTH - WORLD_WIDTH / 2;
    const z = Math.random() * WORLD_DEPTH - WORLD_DEPTH / 2;
    const size = Math.random() * 3.5 + 1.3;

    const rock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(size),
      new THREE.MeshStandardMaterial({ color: 0x626262, roughness: 1 })
    );
    rock.position.set(x, getTerrainHeight(x, z) + size * 0.7, z);
    rock.rotation.set(Math.random(), Math.random(), Math.random());
    rock.castShadow = true;
    rock.receiveShadow = true;
    scene.add(rock);
    addCylinderCollider(x, z, size + 1);
  }
}

function createEnemy() {
  enemy = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(1.5, 2.2, 8, 12),
    new THREE.MeshStandardMaterial({
      color: 0xd8d8d8,
      transparent: true,
      opacity: 0.78
    })
  );
  body.position.y = 4;
  enemy.add(body);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(1.55, 16, 16),
    new THREE.MeshStandardMaterial({ color: 0xf0f0f0 })
  );
  head.position.y = 9;
  enemy.add(head);

  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff1111 });
  const eye1 = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), eyeMat);
  const eye2 = eye1.clone();
  eye1.position.set(-0.45, 9.2, -1.25);
  eye2.position.set(0.45, 9.2, -1.25);
  enemy.add(eye1, eye2);

  enemy.position.set(90, getTerrainHeight(90, -250), -250);
  enemy.userData.speed = 5;
  scene.add(enemy);
  pickEnemyPatrolTarget();
}

function detectPlayer() {
  const distance = enemy.position.distanceTo(player.position);
  if (distance < 40) return true;

  const toPlayer = new THREE.Vector3().subVectors(player.position, enemy.position);
  toPlayer.y = 0;

  if (toPlayer.length() < 75) {
    toPlayer.normalize();
    const enemyForward = new THREE.Vector3(0, 0, -1).applyQuaternion(enemy.quaternion);
    enemyForward.y = 0;
    enemyForward.normalize();

    if (enemyForward.dot(toPlayer) > 0.45) return true;
  }

  return false;
}

function updateEnemyAI(delta) {
  if (!enemy || jumpscareStarted) return;

  const distance = enemy.position.distanceTo(player.position);

  if (distance < 3) {
    triggerJumpscare();
    return;
  }

  if (enemyState !== "chase" && detectPlayer()) {
    enemyState = "chase";
  }

  if (enemyState === "chase" && distance > 95) {
    enemyState = "lost";
    enemyPauseTimer = 1.5;
  }

  if (enemyState === "patrol") patrolEnemy(delta);
  if (enemyState === "chase") chasePlayer(delta);
  if (enemyState === "lost") {
    enemyPauseTimer -= delta;
    if (enemyPauseTimer <= 0) {
      enemyState = "patrol";
      pickEnemyPatrolTarget();
    }
  }

  enemy.position.y = getTerrainHeight(enemy.position.x, enemy.position.z);
}

function patrolEnemy(delta) {
  enemyPauseTimer -= delta;
  if (enemyPauseTimer > 0) return;

  const dir = new THREE.Vector3().subVectors(enemyTarget, enemy.position);
  dir.y = 0;

  if (dir.length() < 4) {
    enemyPauseTimer = 1 + Math.random() * 2;
    pickEnemyPatrolTarget();
    return;
  }

  dir.normalize();
  enemy.position.addScaledVector(dir, 4 * delta);
  enemy.lookAt(enemy.position.x + dir.x, enemy.position.y, enemy.position.z + dir.z);
  avoidEnemyHardClip();
}

function chasePlayer(delta) {
  const dir = new THREE.Vector3().subVectors(player.position, enemy.position);
  dir.y = 0;
  dir.normalize();

  enemy.position.addScaledVector(dir, 10 * delta);
  enemy.lookAt(player.position.x, enemy.position.y, player.position.z);
  avoidEnemyHardClip();
}

function pickEnemyPatrolTarget() {
  enemyTarget.set(
    Math.random() * WORLD_WIDTH - WORLD_WIDTH / 2,
    0,
    Math.random() * WORLD_DEPTH - WORLD_DEPTH / 2
  );
  enemyTarget.y = getTerrainHeight(enemyTarget.x, enemyTarget.z);
}

function updatePlayer(delta) {
  player.rotation.y = yaw;
  camera.rotation.x = pitch;

  lastSafePosition.copy(player.position);

  const currentSpeed = running ? runSpeed : walkSpeed;
  const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(
    new THREE.Vector3(0, 1, 0),
    yaw
  );
  const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(
    new THREE.Vector3(0, 1, 0),
    yaw
  );
  const direction = new THREE.Vector3();

  if (move.w) direction.add(forward);
  if (move.s) direction.sub(forward);
  if (move.d) direction.add(right);
  if (move.a) direction.sub(right);

  if (joystick.active) {
    const joyX = THREE.MathUtils.clamp(joystick.dx / 60, -1, 1);
    const joyY = THREE.MathUtils.clamp(joystick.dy / 60, -1, 1);
    direction.addScaledVector(right, joyX);
    direction.addScaledVector(forward, -joyY);
  }

  if (direction.lengthSq() > 0) {
    direction.normalize();
    player.position.x += direction.x * currentSpeed * delta;
    player.position.z += direction.z * currentSpeed * delta;
  }

  const limitX = WORLD_WIDTH / 2 - 10;
  const limitZ = WORLD_DEPTH / 2 - 10;
  player.position.x = THREE.MathUtils.clamp(player.position.x, -limitX, limitX);
  player.position.z = THREE.MathUtils.clamp(player.position.z, -limitZ, limitZ);

  handleCollisions();
}

function updateGravity(delta) {
  player.position.y += velocityY * delta;
  velocityY -= 20 * delta;

  const groundY = getTerrainHeight(player.position.x, player.position.z);
  const floorY = groundY + playerHeight;

  if (player.position.y <= floorY) {
    player.position.y = floorY;
    velocityY = 0;
    isJumping = false;
  }
}

function handleCollisions() {
  const radius = 2.1;

  for (const col of colliders) {
    const dx = player.position.x - col.x;
    const dz = player.position.z - col.z;
    const distSq = dx * dx + dz * dz;
    const minDist = radius + col.r;

    if (distSq < minDist * minDist) {
      player.position.x = lastSafePosition.x;
      player.position.z = lastSafePosition.z;
      return;
    }
  }
}

function avoidEnemyHardClip() {
  for (const col of colliders) {
    const dx = enemy.position.x - col.x;
    const dz = enemy.position.z - col.z;
    const distSq = dx * dx + dz * dz;
    const minDist = 2.3 + col.r;

    if (distSq < minDist * minDist) {
      const dist = Math.sqrt(distSq) || 0.01;
      enemy.position.x = col.x + (dx / dist) * minDist;
      enemy.position.z = col.z + (dz / dist) * minDist;
    }
  }
}

function addCylinderCollider(x, z, r) {
  colliders.push({ x, z, r });
}

function addBoxCollider(mesh) {
  const box = new THREE.Box3().setFromObject(mesh);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);
  colliders.push({
    x: center.x,
    z: center.z,
    r: Math.max(size.x, size.z) * 0.5
  });
}

function triggerJumpscare() {
  jumpscareStarted = true;
  paused = true;

  if (document.exitPointerLock) document.exitPointerLock();

  camera.lookAt(enemy.position.x, enemy.position.y + 7, enemy.position.z);

  setTimeout(() => {
    showGameOver();
  }, 450);
}

function requestPointerControl() {
  if (!paused && gameStarted && document.body.requestPointerLock) {
    document.body.requestPointerLock();
  }
}

function handleMouseLook(e) {
  if (document.pointerLockElement !== document.body || paused) return;

  yaw -= e.movementX * mouseSensitivity;
  pitch -= e.movementY * mouseSensitivity;
  pitch = Math.max(-1.5, Math.min(1.5, pitch));
}

function handlePointerLockChange() {
  if (document.pointerLockElement !== document.body && gameStarted) {
    move.w = false;
    move.a = false;
    move.s = false;
    move.d = false;
    running = false;
  }
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
    runBtn.addEventListener("mousedown", () => running = true);
    runBtn.addEventListener("mouseup", () => running = false);
    runBtn.addEventListener("mouseleave", () => running = false);
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
    velocityY = 7;
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
  if (key === "p") togglePause();
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
  if (pauseBtn) pauseBtn.innerHTML = paused ? "Play" : "Pause";

  if (paused && document.exitPointerLock) {
    document.exitPointerLock();
  } else {
    requestPointerControl();
  }
}

function toggleTorch() {
  torchOn = !torchOn;
  if (torchLight) torchLight.intensity = torchOn ? 5 : 0;

  const torchBtn = document.getElementById("torchBtn");
  if (torchBtn) torchBtn.innerHTML = torchOn ? "Torch ON" : "Torch";
}

function updateHealthUI() {
  const healthValue = document.getElementById("healthValue");
  const healthFill = document.getElementById("healthFill");

  if (healthValue) healthValue.innerText = health;
  if (healthFill) healthFill.style.width = health + "%";
}

function damagePlayer(amount) {
  health = Math.max(0, health - amount);
  updateHealthUI();
  if (health <= 0) showGameOver();
}

function showGameOver() {
  paused = true;
  document.getElementById("gameUI").style.display = "none";
  document.getElementById("gameOver").style.display = "flex";
  if (document.exitPointerLock) document.exitPointerLock();
}

function showVictory() {
  paused = true;
  document.getElementById("gameUI").style.display = "none";
  document.getElementById("victory").style.display = "flex";
  if (document.exitPointerLock) document.exitPointerLock();
}

function restartGame() {
  location.reload();
}

function backToMenu() {
  location.reload();
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);

  if (!player || !renderer || !scene || !camera) return;

  const delta = Math.min(clock.getDelta(), 0.05);

  if (!paused) {
    updatePlayer(delta);
    updateGravity(delta);
    updateEnemyAI(delta);
    handleCollisions();
  }

  renderer.render(scene, camera);
}
```
