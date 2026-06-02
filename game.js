let scene, camera, renderer, clock;
let player, torchLight, enemy;
let gameStarted = false;
let paused = false;
let torchOn = false;
let running = false;
let health = 100;
let stamina = 100;
let battery = 1000;

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

// ✅ INVENTORY SYSTEM
let inventory = {
  key: false,
  batteries: 0,
  notes: [],
  notesCollected: 0
};

// ✅ OBJECTIVE SYSTEM
let currentObjective = "Find the Mansion Key";
let objectiveStage = 0; // 0: Key, 1: Mansion, 2: Unlock, 3: Escape

// ✅ SOUND SYSTEM (Web Audio API)
let audioContext;
let soundLibrary = {};
let activeSounds = {};

// ✅ DANGER SYSTEM
let dangerLevel = 0; // 0-3: none, low, high, critical
let lastPlayerSound = { time: 0, type: "none" }; // Last sound enemy heard
let enemyInvestigating = false;
let investigateTarget = new THREE.Vector3();
let investigateTimer = 0;

// ✅ MANSION ENTRY
let mansionDoor = null;
let doorUnlocked = false;
let doorOpen = false;
let escapePoint = new THREE.Vector3(0, 0, 500);
let mansionInterior = null;

// ✅ KEY & ITEMS
let keyPickup = null;
let notesInWorld = [];

// ✅ HORROR EVENTS
let horrorEventTimer = 0;
let lastHorrorEvent = 0;
let shadowFigure = null;

// ✅ MARKERS & INDICATORS
let keyMarker = null;
let mansionMarker = null;
let escapeMarker = null;

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
    initAudioContext();
    init();
    animate();
  }

  requestPointerControl();
}

// ✅ SOUND SYSTEM INIT
function initAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
}

// ✅ CREATE SOUND WITH WEB AUDIO API
function createSound(name, frequency, duration, type = "sine") {
  if (!audioContext) return;

  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  
  osc.connect(gain);
  gain.connect(audioContext.destination);
  
  osc.frequency.value = frequency;
  osc.type = type;
  
  gain.gain.setValueAtTime(0.1, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
  
  osc.start(audioContext.currentTime);
  osc.stop(audioContext.currentTime + duration);
}

// ✅ PLAY SOUNDS - EXPANDED
function playSound(soundName) {
  if (!audioContext) return;

  switch(soundName) {
    case "heartbeat":
      createSound("heartbeat", 60, 0.3, "sine");
      break;
    case "chase_music":
      createSound("chase", 150, 0.5, "square");
      break;
    case "jumpscare":
      createSound("jumpscare", 200, 0.8, "sine");
      createSound("jumpscare2", 300, 0.8, "square");
      break;
    case "footstep":
      createSound("footstep", 100, 0.15, "sine");
      break;
    case "key_pickup":
      createSound("pickup", 800, 0.3, "sine");
      createSound("pickup2", 1000, 0.3, "sine");
      break;
    case "door_open":
      createSound("door", 200, 0.5, "sine");
      break;
    case "ghost_whisper":
      createSound("whisper", 120, 0.4, "sine");
      break;
    // ✅ NEW HORROR SOUNDS
    case "distant_scream":
      createSound("scream", 180, 1.2, "sine");
      break;
    case "wind":
      createSound("wind", 80, 2, "sine");
      break;
    case "tree_creak":
      createSound("creak", 140, 0.8, "sine");
      break;
  }
}

// ✅ PLAY RANDOM HORROR SOUNDS
function playRandomHorrorSound() {
  const sounds = ["ghost_whisper", "distant_scream", "wind", "tree_creak"];
  const randomSound = sounds[Math.floor(Math.random() * sounds.length)];
  playSound(randomSound);
}

function init() {
  clock = new THREE.Clock();
  scene = new THREE.Scene();
  
  // ✅ DARK BLUE-BLACK SKY FOR MOONLIT NIGHT
  scene.background = new THREE.Color(0x0a0f1f);
  scene.fog = new THREE.Fog(0x1a2a4a, 80, 350); // ✅ Denser fog with blue tint
  
  // ✅ ADD STARS TO SKY
  createStars();

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
  renderer.toneMappingExposure = 1.0;
  document.body.appendChild(renderer.domElement);

  // ✅ ENHANCED MOONLIGHT - BLUISH AMBIENT
  scene.add(new THREE.AmbientLight(0x4a5f8f, 0.4));

  // ✅ MOON DIRECTIONAL LIGHT - BRIGHT MOONLIGHT
  const moon = new THREE.DirectionalLight(0xc8deff, 1.4);
  moon.position.set(-200, 280, 150);
  moon.castShadow = true;
  moon.shadow.mapSize.set(4096, 4096);
  moon.shadow.camera.near = 0.5;
  moon.shadow.camera.far = 600;
  moon.shadow.camera.left = -400;
  moon.shadow.camera.right = 400;
  moon.shadow.camera.top = 400;
  moon.shadow.camera.bottom = -400;
  scene.add(moon);

  // ✅ VISUAL MOON IN SKY
  const moonGeometry = new THREE.SphereGeometry(50, 32, 32);
  const moonMaterial = new THREE.MeshBasicMaterial({ color: 0xf0f8ff });
  const moonMesh = new THREE.Mesh(moonGeometry, moonMaterial);
  moonMesh.position.set(-200, 500, -500);
  scene.add(moonMesh);

  // ✅ MOON GLOW
  const glowGeometry = new THREE.SphereGeometry(60, 32, 32);
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: 0xb8d5ff,
    transparent: true,
    opacity: 0.1
  });
  const moonGlow = new THREE.Mesh(glowGeometry, glowMaterial);
  moonGlow.position.copy(moonMesh.position);
  scene.add(moonGlow);

  createWorld();

  player = new THREE.Object3D();
  player.position.set(0, getTerrainHeight(0, 20) + playerHeight, 20);
  lastSafePosition.copy(player.position);
  scene.add(player);

  player.add(camera);
  camera.position.set(0, eyeHeight, 0);
  camera.rotation.order = "YXZ";

  // ✅ ENHANCED TORCH - NO BATTERY DRAIN, VERY POWERFUL
  torchLight = new THREE.SpotLight(0xffffff, 0, 200, Math.PI / 4.5, 0.5, 2);
  torchLight.shadow.mapSize.set(2048, 2048);
  torchLight.shadow.camera.near = 0.1;
  torchLight.shadow.camera.far = 200;
  camera.add(torchLight);
  camera.add(torchLight.target);
  torchLight.target.position.set(0, 0, -1);
  torchOn = true; // ✅ TORCH STARTS ON

  window.addEventListener("keydown", keyDown);
  window.addEventListener("keyup", keyUp);
  document.addEventListener("click", requestPointerControl);
  document.addEventListener("mousemove", handleMouseLook);
  document.addEventListener("pointerlockchange", handlePointerLockChange);
  window.addEventListener("resize", onResize);

  setupMobileUiButtons();
  createMobileControls();
  updateHealthUI();
  updateStaminaUI();
  updateBatteryUI();
  updateObjectiveUI();
  updateInventoryUI();
  
  // ✅ SET INITIAL TORCH STATE
  if (torchLight) torchLight.intensity = 9;
}

// ✅ CREATE STARS IN SKY
function createStars() {
  const starsGeometry = new THREE.BufferGeometry();
  const starsMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 2,
    transparent: true,
    opacity: 0.8
  });

  const starsVertices = [];
  for (let i = 0; i < 200; i++) {
    const x = (Math.random() - 0.5) * 2000;
    const y = Math.random() * 800 + 300;
    const z = (Math.random() - 0.5) * 2000;
    starsVertices.push(x, y, z);
  }

  starsGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(starsVertices), 3));
  const stars = new THREE.Points(starsGeometry, starsMaterial);
  scene.add(stars);
}

function createWorld() {
  createTerrain();
  createMansion();
  createForest();
  createRocks();
  createEnemy();
  createKey();
  createNotes();
  createShadowFigure();
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

  // ✅ MANSION DOOR WITH ANIMATION
  mansionDoor = new THREE.Mesh(
    new THREE.BoxGeometry(9, 15, 1.5),
    new THREE.MeshStandardMaterial({ color: 0x151515 })
  );
  mansionDoor.position.set(0, getTerrainHeight(0, -389) + 7.5, -389);
  mansionDoor.userData.type = "door";
  mansionDoor.userData.originalRotation = 0;
  scene.add(mansionDoor);
  addBoxCollider(mansionDoor);

  const tower = new THREE.Mesh(
    new THREE.BoxGeometry(22, 48, 22),
    new THREE.MeshStandardMaterial({ color: 0x999999 })
  );
  tower.position.set(-35, getTerrainHeight(-35, -420) + 24, -420);
  tower.castShadow = true;
  scene.add(tower);
  addBoxCollider(tower);

  // ✅ MANSION INTERIOR (BASEMENT/ROOMS)
  createMansionInterior(mansion.position);
}

// ✅ CREATE MANSION INTERIOR
function createMansionInterior(mansionPos) {
  mansionInterior = new THREE.Group();
  
  // Interior rooms below mansion
  const room1 = new THREE.Mesh(
    new THREE.BoxGeometry(20, 10, 20),
    new THREE.MeshStandardMaterial({ color: 0x2a2a2a })
  );
  room1.position.set(mansionPos.x - 15, mansionPos.y - 20, mansionPos.z);
  scene.add(room1);

  const room2 = new THREE.Mesh(
    new THREE.BoxGeometry(20, 10, 20),
    new THREE.MeshStandardMaterial({ color: 0x3a3a3a })
  );
  room2.position.set(mansionPos.x + 15, mansionPos.y - 20, mansionPos.z);
  scene.add(room2);
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

// ✅ CREATE SHADOW FIGURE (Horror event)
function createShadowFigure() {
  shadowFigure = new THREE.Group();
  
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(1, 1.5, 6, 8),
    new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      transparent: true,
      opacity: 0.3
    })
  );
  body.position.y = 3;
  shadowFigure.add(body);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(1, 8, 8),
    new THREE.MeshStandardMaterial({
      color: 0x0a0a0a,
      transparent: true,
      opacity: 0.3
    })
  );
  head.position.y = 7;
  shadowFigure.add(head);

  shadowFigure.position.set(
    Math.random() * 200 - 100,
    getTerrainHeight(0, -200),
    -200 + Math.random() * 100
  );
  shadowFigure.userData.visible = false;
  scene.add(shadowFigure);
}

// ✅ CREATE KEY PICKUP
function createKey() {
  const keyGeometry = new THREE.BoxGeometry(0.8, 1.5, 0.2);
  const keyMaterial = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.8 });
  
  keyPickup = new THREE.Mesh(keyGeometry, keyMaterial);
  keyPickup.position.set(50, getTerrainHeight(50, 100) + 2, 100);
  keyPickup.castShadow = true;
  keyPickup.userData.type = "key";
  scene.add(keyPickup);
}

// ✅ CREATE NOTES IN WORLD
function createNotes() {
  const noteTexts = [
    "HELP... TRAPPED HERE",
    "DON'T GO OUT AT NIGHT",
    "IT WATCHES... ALWAYS",
    "THE KEY IS HIDDEN"
  ];

  for (let i = 0; i < 3; i++) {
    const notePos = new THREE.Vector3(
      Math.random() * 200 - 100,
      getTerrainHeight(Math.random() * 200 - 100, Math.random() * 200 - 100) + 1,
      Math.random() * 200 - 100
    );

    const noteGeometry = new THREE.BoxGeometry(1, 1.5, 0.1);
    const noteMaterial = new THREE.MeshStandardMaterial({ color: 0xd4a574 });
    const note = new THREE.Mesh(noteGeometry, noteMaterial);
    
    note.position.copy(notePos);
    note.userData.type = "note";
    note.userData.text = noteTexts[i];
    scene.add(note);
    notesInWorld.push(note);
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
  enemy.userData.lastKnownPlayerPos = new THREE.Vector3();
  enemy.userData.canSeePlayer = false;
  scene.add(enemy);
  pickEnemyPatrolTarget();
}

function detectPlayer() {
  const distance = enemy.position.distanceTo(player.position);
  
  // ✅ CLOSE DETECTION
  if (distance < 50) return true;

  // ✅ VISION CONE - IMPROVED
  const toPlayer = new THREE.Vector3().subVectors(player.position, enemy.position);
  toPlayer.y = 0;

  if (toPlayer.length() < 100) {
    toPlayer.normalize();
    const enemyForward = new THREE.Vector3(0, 0, -1).applyQuaternion(enemy.quaternion);
    enemyForward.y = 0;
    enemyForward.normalize();

    if (enemyForward.dot(toPlayer) > 0.4) return true;
  }

  // ✅ SOUND DETECTION - IMPROVED
  if (lastPlayerSound.type === "footstep" && distance < 60) return true;
  if (lastPlayerSound.type === "run" && distance < 80) return true;
  if (lastPlayerSound.type === "jump" && distance < 70) return true;

  return false;
}

// ✅ SMARTER ENEMY AI
function updateEnemyAI(delta) {
  if (!enemy || jumpscareStarted) return;

  const distance = enemy.position.distanceTo(player.position);

  // ✅ KILL CHECK
  if (distance < 3) {
    triggerJumpscare();
    return;
  }

  // ✅ DETECTION FLOW
  if (enemyState !== "chase" && detectPlayer()) {
    enemyState = "chase";
    playSound("chase_music");
  }

  // ✅ CHASE TO INVESTIGATE - SMARTER
  if (enemyState === "chase" && distance > 120) {
    enemyState = "investigate";
    enemy.userData.lastKnownPlayerPos.copy(player.position);
    enemyInvestigating = true;
    investigateTimer = 8;
  }

  // ✅ INVESTIGATE TO PATROL
  if (enemyState === "investigate" && investigateTimer <= 0) {
    enemyState = "patrol";
    enemyInvestigating = false;
    pickEnemyPatrolTarget();
  }

  // ✅ INVESTIGATE TIMER
  if (enemyInvestigating) {
    investigateTimer -= delta;
  }

  // ✅ STATES
  if (enemyState === "patrol") patrolEnemy(delta);
  if (enemyState === "investigate") investigateEnemy(delta);
  if (enemyState === "chase") chasePlayer(delta);

  enemy.position.y = getTerrainHeight(enemy.position.x, enemy.position.z);
  updateDangerLevel(distance);

  // ✅ RANDOM FAKE SOUNDS INVESTIGATION
  if (Math.random() < 0.001 && enemyState === "patrol") {
    playRandomHorrorSound();
  }
}

// ✅ SMARTER INVESTIGATE STATE
function investigateEnemy(delta) {
  const investigatePos = enemy.userData.lastKnownPlayerPos;
  const dist = enemy.position.distanceTo(investigatePos);

  if (dist < 12) {
    if (Math.random() > 0.7) {
      pickEnemyPatrolTarget();
      enemyState = "patrol";
      enemyInvestigating = false;
    }
    return;
  }

  const dir = new THREE.Vector3().subVectors(investigatePos, enemy.position);
  dir.y = 0;
  dir.normalize();

  enemy.position.addScaledVector(dir, 7 * delta);
  enemy.lookAt(investigatePos.x, enemy.position.y, investigatePos.z);
  avoidEnemyHardClip();
}

function patrolEnemy(delta) {
  enemyPauseTimer -= delta;
  if (enemyPauseTimer > 0) return;

  const dir = new THREE.Vector3().subVectors(enemyTarget, enemy.position);
  dir.y = 0;

  if (dir.length() < 8) {
    enemyPauseTimer = 2 + Math.random() * 3;
    pickEnemyPatrolTarget();
    return;
  }

  dir.normalize();
  enemy.position.addScaledVector(dir, 5 * delta);
  enemy.lookAt(enemy.position.x + dir.x, enemy.position.y, enemy.position.z + dir.z);
  avoidEnemyHardClip();
}

function chasePlayer(delta) {
  const dir = new THREE.Vector3().subVectors(player.position, enemy.position);
  dir.y = 0;
  dir.normalize();

  enemy.position.addScaledVector(dir, 11 * delta);
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

// ✅ DANGER LEVEL SYSTEM
function updateDangerLevel(distance) {
  if (distance < 8) {
    dangerLevel = 3;
    if (Math.random() > 0.7) playSound("heartbeat");
    applyDangerUI("critical");
  } else if (distance < 15) {
    dangerLevel = 2;
    if (Math.random() > 0.85) playSound("heartbeat");
    applyDangerUI("high");
  } else if (distance < 30) {
    dangerLevel = 1;
    applyDangerUI("medium");
  } else {
    dangerLevel = 0;
    applyDangerUI("none");
  }
}

// ✅ DANGER UI APPLICATION
function applyDangerUI(level) {
  const gameUI = document.getElementById("gameUI");
  
  gameUI.classList.remove("enemy-near", "danger-shake");
  
  if (level === "high" || level === "critical") {
    gameUI.classList.add("enemy-near");
  }
  if (level === "critical") {
    gameUI.classList.add("danger-shake");
  }
}

// ✅ HORROR EVENTS
function updateHorrorEvents(delta) {
  horrorEventTimer -= delta;

  if (horrorEventTimer <= 0) {
    const eventType = Math.floor(Math.random() * 4);

    if (eventType === 0 && shadowFigure && !shadowFigure.userData.visible) {
      // Shadow figure appears in distance
      shadowFigure.userData.visible = true;
      shadowFigure.position.set(
        Math.random() * 300 - 150,
        getTerrainHeight(0, -200),
        -200 + Math.random() * 150
      );
      setTimeout(() => {
        shadowFigure.userData.visible = false;
      }, 3000);
    } else if (eventType === 1) {
      // Whisper near player
      playSound("ghost_whisper");
    } else if (eventType === 2) {
      // Light flicker
      if (torchOn && Math.random() > 0.5) {
        torchLight.intensity = 3;
        setTimeout(() => {
          torchLight.intensity = 9;
        }, 200);
      }
    } else if (eventType === 3) {
      // Random horror sound
      playRandomHorrorSound();
    }

    horrorEventTimer = 15 + Math.random() * 20;
  }
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

  // ✅ STAMINA - MUCH SLOWER DRAIN (can run 30+ seconds)
  if (running && direction.lengthSq() > 0) {
    stamina = Math.max(0, stamina - 0.08); // ✅ Very slow drain
    if (stamina <= 0) running = false;
    if (Math.random() > 0.8) playSound("footstep");
  } else {
    stamina = Math.min(100, stamina + 0.3); // ✅ Fast recovery
  }

  if (direction.lengthSq() > 0) {
    direction.normalize();
    player.position.x += direction.x * currentSpeed * delta;
    player.position.z += direction.z * currentSpeed * delta;
    
    // ✅ SOUND TRIGGER
    if (running) {
      lastPlayerSound = { time: Date.now(), type: "run" };
    } else if (direction.lengthSq() > 0) {
      lastPlayerSound = { time: Date.now(), type: "footstep" };
    }
  }

  const limitX = WORLD_WIDTH / 2 - 10;
  const limitZ = WORLD_DEPTH / 2 - 10;
  player.position.x = THREE.MathUtils.clamp(player.position.x, -limitX, limitX);
  player.position.z = THREE.MathUtils.clamp(player.position.z, -limitZ, limitZ);

  handleCollisions();
  checkInteractions();
}

// ✅ INTERACTION CHECK - IMPROVED
function checkInteractions() {
  const interactionRange = 5;
  const interactionText = document.getElementById("interactionText");

  let nearItem = false;

  // ✅ CHECK KEY
  if (keyPickup && !inventory.key) {
    const keyDist = player.position.distanceTo(keyPickup.position);
    if (keyDist < interactionRange) {
      interactionText.style.display = "block";
      interactionText.innerText = "Press E to Pick Up Key";
      nearItem = true;
    }
  }

  // ✅ CHECK DOOR
  if (mansionDoor && inventory.key && !doorUnlocked) {
    const doorDist = player.position.distanceTo(mansionDoor.position);
    if (doorDist < interactionRange) {
      interactionText.style.display = "block";
      interactionText.innerText = "Press E to Unlock Door";
      nearItem = true;
    }
  }

  // ✅ CHECK NOTES
  for (let note of notesInWorld) {
    const noteDist = player.position.distanceTo(note.position);
    if (noteDist < interactionRange) {
      interactionText.style.display = "block";
      interactionText.innerText = "Press E to Read Note";
      nearItem = true;
      break;
    }
  }

  // ✅ ESCAPE POINT
  if (doorUnlocked) {
    const escapeDist = player.position.distanceTo(escapePoint);
    if (escapeDist < 20) {
      showVictory();
    }
  }

  if (!nearItem) {
    interactionText.style.display = "none";
  }
}

// ✅ INTERACTION HANDLER - IMPROVED
function handleInteraction() {
  const interactionRange = 5;

  // ✅ PICK UP KEY
  if (keyPickup && !inventory.key) {
    if (player.position.distanceTo(keyPickup.position) < interactionRange) {
      inventory.key = true;
      scene.remove(keyPickup);
      playSound("key_pickup");
      updateObjective(1);
      updateInventoryUI();
      return;
    }
  }

  // ✅ UNLOCK DOOR WITH ANIMATION
  if (mansionDoor && inventory.key && !doorUnlocked) {
    if (player.position.distanceTo(mansionDoor.position) < interactionRange) {
      doorUnlocked = true;
      playSound("door_open");
      updateObjective(2);
      
      // ✅ DOOR OPENING ANIMATION
      let angle = 0;
      const animateOpen = setInterval(() => {
        angle += 0.1;
        mansionDoor.rotation.y = angle;
        if (angle >= Math.PI / 2) {
          clearInterval(animateOpen);
          doorOpen = true;
        }
      }, 30);
      
      updateInventoryUI();
      return;
    }
  }

  // ✅ READ NOTES
  for (let i = 0; i < notesInWorld.length; i++) {
    const note = notesInWorld[i];
    if (player.position.distanceTo(note.position) < interactionRange) {
      alert("NOTE: " + note.userData.text);
      inventory.notesCollected++;
      notesInWorld.splice(i, 1);
      scene.remove(note);
      updateInventoryUI();
      return;
    }
  }
}

// ✅ UPDATE OBJECTIVE
function updateObjective(stage) {
  objectiveStage = stage;
  
  const stages = [
    "Find the Mansion Key",
    "Reach the Mansion",
    "Unlock the Door",
    "Escape the Island"
  ];
  
  currentObjective = stages[stage] || stages[0];
  updateObjectiveUI();
}

// ✅ UPDATE INVENTORY UI
function updateInventoryUI() {
  const invKey = document.getElementById("inventoryKey");
  const invNotes = document.getElementById("inventoryNotes");

  if (invKey) {
    invKey.style.display = inventory.key ? "block" : "none";
  }

  if (invNotes) {
    invNotes.innerText = "Notes: " + inventory.notesCollected;
  }
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
  playSound("jumpscare");

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
    playSound("footstep");
    lastPlayerSound = { time: Date.now(), type: "jump" };
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
  if (key === "e") handleInteraction();
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
  // ✅ TORCH ALWAYS ON - NO BATTERY DRAIN
  torchOn = !torchOn;
  if (torchLight) torchLight.intensity = torchOn ? 9 : 0;

  const torchBtn = document.getElementById("torchBtn");
  if (torchBtn) torchBtn.innerHTML = torchOn ? "Torch ON" : "Torch OFF";
}

function updateHealthUI() {
  const healthValue = document.getElementById("healthValue");
  const healthFill = document.getElementById("healthFill");

  if (healthValue) healthValue.innerText = Math.ceil(health);
  if (healthFill) healthFill.style.width = health + "%";

  if (health < 30) {
    document.getElementById("gameUI").classList.add("low-health");
  } else {
    document.getElementById("gameUI").classList.remove("low-health");
  }
}

// ✅ STAMINA UI
function updateStaminaUI() {
  const staminaFill = document.getElementById("staminaFill");
  if (staminaFill) staminaFill.style.width = stamina + "%";
}

// ✅ BATTERY UI - NO DRAIN (unlimited torch)
function updateBatteryUI() {
  const torchIndicator = document.getElementById("torchIndicator");
  if (torchIndicator) {
    torchIndicator.innerText = torchOn ? "Torch: ON (∞)" : "Torch: OFF (∞)";
  }
}

// ✅ OBJECTIVE UI
function updateObjectiveUI() {
  const objectiveText = document.getElementById("objectiveText");
  if (objectiveText) objectiveText.innerText = currentObjective;
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

// ✅ IMPROVED VICTORY SCREEN WITH CUTSCENE
function showVictory() {
  paused = true;
  document.getElementById("gameUI").style.display = "none";
  document.getElementById("victory").style.display = "flex";
  if (document.exitPointerLock) document.exitPointerLock();

  // ✅ PLAY VICTORY CUTSCENE
  playSound("door_open");
  
  // Final ghost appearance
  setTimeout(() => {
    playSound("jumpscare");
    alert("You escaped... but it follows you still...");
  }, 2000);
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
    updateHorrorEvents(delta);
    handleCollisions();
    updateStaminaUI();
    updateBatteryUI();

    // ✅ RENDER SHADOW FIGURE IF VISIBLE
    if (shadowFigure && shadowFigure.userData.visible) {
      shadowFigure.visible = true;
    } else if (shadowFigure) {
      shadowFigure.visible = false;
    }
  }

  renderer.render(scene, camera);
}
