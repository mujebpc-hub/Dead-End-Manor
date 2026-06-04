// ============================================
// THREE.JS HORROR GAME - FULL UPGRADED VERSION
// Inspired by Granny, with new systems and improvements
// ============================================

// ================== GAME STATE MANAGER ==================
const GameState = {
  // Core game flags
  started: false,
  paused: false,
  running: false,
  isJumping: false,
  jumpscareStarted: false,

  // Player stats
  health: 100,
  stamina: 100,
  battery: 1000, // PHASE 1: Battery system (max 1000 units)

  // Torch system
  torchOn: true,
  flashlightFlicker: false,

  // Inventory
  inventory: {
    key: false,
    basementKey: false,
    crowbar: false,
    hammer: false,
    fuse: false,
    batteries: 0,     // PHASE 1
    medkits: 0,       // PHASE 2
    notesCollected: 0,
    notes: [],        // Store note texts
    medkits: 0,
    notesCollected: 0,
    carParts: [],     // PHASE 15
  },

  // Objective system
  currentObjective: "Find the Mansion Key",
  objectiveStage: 0, // 0: Key, 1: Mansion, 2: Unlock, 3: Escape

  // Enemy AI
  enemyState: "patrol",
  enemyPauseTimer: 0,
  enemyInvestigating: false,
  investigateTimer: 0,
  lastDetectionTime: 0,
  attackCooldown: 0,

  // Danger system
  dangerLevel: 0,
  lastPlayerSound: { time: 0, type: "none" },

  // Door/Mansion
  doorUnlocked: false,
  doorOpen: false,

  // Horror events
  horrorEventTimer: 0,

  // Player movement
  yaw: 0,
  pitch: 0,
  velocityY: 0,
  move: { w: false, a: false, s: false, d: false },
  joystick: { active: false, dx: 0, dy: 0 },

  // PHASE 1 Battery & Flashlight
  batteryDrainActive: true,
  batteryDrainRate: 0.1, // units per second
  lowBatteryThreshold: 200, // threshold for flickering
  batteryUIVisible: true,

  // PHASE 2 Medkit
  medkitsAvailable: 0,
  medkitUseCooldown: false,

  // PHASE 3 Inventory expanded
  // Already in inventory object

  // PHASE 4 Mansion interior
  insideMansion: false,
  currentRoom: null,

  // PHASE 5 Locked rooms
  lockedRooms: {
    basement: true,
    secretRoom: true,
    // add more locked rooms as needed
  },

  // PHASE 6 Basement
  inBasement: false,
  basementKeyCollected: false,

  // PHASE 7 Generator
  generatorOn: false,
  fuseInserted: false,

  // PHASE 8 Granny AI States
  grannyAIState: "idle",

  // PHASE 9 Hearing system
  hearingEnabled: true,
  lastNoisePosition: new THREE.Vector3(),

  // PHASE 10 Pathfinding
  path: [],

  // PHASE 11 Jumpscare
  jumpscareActive: false,
  jumpscareTimer: 0,

  // PHASE 12 Save system
  saveData: null,

  // PHASE 13 Weather
  weatherState: "clear", // "rain", "thunder", "fog"
  weatherTimer: 0,

  // PHASE 14 Day/Night
  timeOfDay: "day", // "day" or "night"
  dayNightTimer: 0,

  // PHASE 15 Escape
  vehicleRepaired: false,
  escapeStarted: false,

  // PHASE 16 Audio system
  audioManager: null,

  // PHASE 17 Settings
  volume: 0.5,
  graphicsQuality: "high",
  fullscreen: false,
};

// ================== WORLD CONSTANTS ==================
const WORLD = {
  WIDTH: 1500,
  DEPTH: 1800,
  PLAYER_HEIGHT: 5,
  EYE_HEIGHT: 1.6,
  WALK_SPEED: 10,
  RUN_SPEED: 16,
  MOUSE_SENSITIVITY: 0.002,
  ESCAPE_POINT: new THREE.Vector3(0, 0, 500),
};

// ================== THREE OBJECTS ==================
let scene, camera, renderer, clock;
let player, torchLight, granny;
let mansionDoor, shadowFigure, keyPickup, medkitPickup;
let notesInWorld = [];
let colliders = [];
let batteryUI, healthUI, staminaUI, objectiveUI, inventoryUI, jumpscareMesh, weatherMesh, skyMesh;

// ================== SAFE POSITION ==================
let lastSafePosition = new THREE.Vector3();
let grannyTarget = new THREE.Vector3();
let investigateTarget = new THREE.Vector3();
let grannyTexture = null;

// ================== INITIALIZATION ==================
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

  if (!GameState.started) {
    GameState.started = true;
    initAudioContext();
    initGame();
    animate();
  }
  requestPointerControl();
}

function initGame() {
  // Setup
  clock = new THREE.Clock();
  scene = new THREE.Scene();

  // Sky & fog
  scene.background = new THREE.Color(0x87CEEB);
  scene.fog = new THREE.Fog(0xb0d0ff, 200, 800);

  // Camera
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1200);

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  document.body.appendChild(renderer.domElement);

  // Day lighting
  setupDayLighting();

  // Granny texture
  loadGrannyTexture();

  // Create world
  createWorld();

  // Player
  setupPlayer();

  // Torch
  setupTorch();

  // UI elements
  setupUI();

  // Event listeners
  setupEventListeners();

  // Mobile controls
  setupMobileUiButtons();
  createMobileControls();

  // Initialize systems
  updateHealthUI();
  updateStaminaUI();
  updateBatteryUI();
  updateObjectiveUI();
  updateInventoryUI();
}

// ================== UI SETUP ==================
function setupUI() {
  batteryUI = document.getElementById("batteryValue");
  healthUI = document.getElementById("healthValue");
  staminaUI = document.getElementById("staminaFill");
  objectiveUI = document.getElementById("objectiveText");
  inventoryUI = {
    key: document.getElementById("inventoryKey"),
    notes: document.getElementById("inventoryNotes"),
    medkits: document.getElementById("inventoryMedkits"),
  };
  jumpscareMesh = document.getElementById("jumpscare");
  weatherMesh = document.getElementById("weather");
}

// ================== LOAD TEXTURE ==================
function loadGrannyTexture(callback) {
  const textureLoader = new THREE.TextureLoader();
  textureLoader.load(
    "textures/GrannyG1New.webp",
    (texture) => {
      grannyTexture = texture;
      grannyTexture.transparent = true;
      if (callback) callback();
    },
    undefined,
    (err) => {
      console.error("Failed to load Granny texture", err);
      if (callback) callback();
    }
  );
}

// ================== DAY LIGHTING ==================
function setupDayLighting() {
  scene.add(new THREE.AmbientLight(0xffffff, 0.8));
  const sun = new THREE.DirectionalLight(0xffffff, 1.2);
  sun.position.set(200, 300, 150);
  sun.castShadow = true;
  scene.add(sun);
  // Sun visualization
  const sunGeom = new THREE.SphereGeometry(40, 32, 32);
  const sunMat = new THREE.MeshBasicMaterial({ color: 0xFFD700 });
  const sunMesh = new THREE.Mesh(sunGeom, sunMat);
  sunMesh.position.set(200, 400, -500);
  scene.add(sunMesh);
  // Sun glow
  const glowGeom = new THREE.SphereGeometry(50, 32, 32);
  const glowMat = new THREE.MeshBasicMaterial({ color: 0xFFA500, transparent: true, opacity: 0.15 });
  const glowMesh = new THREE.Mesh(glowGeom, glowMat);
  glowMesh.position.copy(sunMesh.position);
  scene.add(glowMesh);
  createClouds();
}

function createClouds() {
  const cloudTexture = createCloudTexture();
  for (let i = 0; i < 8; i++) {
    const cloudGeom = new THREE.PlaneGeometry(150, 80);
    const cloudMat = new THREE.MeshStandardMaterial({ map: cloudTexture, transparent: true });
    const cloud = new THREE.Mesh(cloudGeom, cloudMat);
    cloud.position.set((Math.random() - 0.5) * 1000, 200 + Math.random() * 150, (Math.random() - 0.5) * 800);
    cloud.rotation.z = Math.random() * Math.PI;
    scene.add(cloud);
  }
}

function createCloudTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.filter = "blur(5px)";
  for (let i = 0; i < 30; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const size = Math.random() * 40 + 20;
    ctx.fillRect(x, y, size, size);
  }
  return new THREE.CanvasTexture(canvas);
}

// ================== PLAYER SETUP ==================
function setupPlayer() {
  player = new THREE.Object3D();
  player.position.set(0, getTerrainHeight(0, 20) + WORLD.PLAYER_HEIGHT, 20);
  lastSafePosition.copy(player.position);
  scene.add(player);
  player.add(camera);
  camera.position.set(0, WORLD.EYE_HEIGHT, 0);
  camera.rotation.order = "YXZ";
}

// ================== TORCH SETUP ==================
function setupTorch() {
  torchLight = new THREE.SpotLight(0xffffff, 0, 200, Math.PI / 4.5, 0.5, 2);
  torchLight.shadow.mapSize.set(2048, 2048);
  torchLight.shadow.camera.near = 0.1;
  torchLight.shadow.camera.far = 200;
  camera.add(torchLight);
  camera.add(torchLight.target);
  torchLight.target.position.set(0, 0, -1);
  GameState.torchOn = true;
  torchLight.intensity = 3; // Day mode
}

// ================== EVENT LISTENERS ==================
function setupEventListeners() {
  window.addEventListener("keydown", keyDown);
  window.addEventListener("keyup", keyUp);
  document.addEventListener("click", requestPointerControl);
  document.addEventListener("mousemove", handleMouseLook);
  document.addEventListener("pointerlockchange", handlePointerLockChange);
  window.addEventListener("resize", onResize);
}

// ================== AUDIO SYSTEM ==================
let audioContext;
function initAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
}
function createSound(freq, dur, type = "sine") {
  if (!audioContext) return;
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  osc.connect(gain);
  gain.connect(audioContext.destination);
  osc.frequency.value = freq;
  osc.type = type;
  gain.gain.setValueAtTime(0.1, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + dur);
  osc.start(audioContext.currentTime);
  osc.stop(audioContext.currentTime + dur);
}
function playSound(name) {
  if (!audioContext) return;
  switch (name) {
    case "heartbeat":
      createSound(60, 0.3, "sine");
      break;
    case "chase_music":
      createSound(150, 0.5, "square");
      break;
    case "jumpscare":
      createSound(200, 0.8, "sine");
      createSound(300, 0.8, "square");
      break;
    case "footstep":
      createSound(100, 0.15, "sine");
      break;
    case "key_pickup":
      createSound(800, 0.3, "sine");
      createSound(1000, 0.3, "sine");
      break;
    case "door_open":
      createSound(200, 0.5, "sine");
      break;
    case "ghost_whisper":
      createSound(120, 0.4, "sine");
      break;
    case "distant_scream":
      createSound(180, 1.2, "sine");
      break;
    case "wind":
      createSound(80, 2, "sine");
      break;
    case "tree_creak":
      createSound(140, 0.8, "sine");
      break;
    case "granny_attack":
      createSound(250, 0.6, "sine");
      createSound(150, 0.6, "square");
      break;
    case "granny_scream":
      createSound(300, 1.0, "sine");
      createSound(200, 1.0, "square");
      break;
    case "damage":
      createSound(100, 0.4, "sine");
      break;
  }
}
function playRandomHorrorSound() {
  const sounds = ["ghost_whisper", "distant_scream", "wind", "tree_creak"];
  const rand = Math.floor(Math.random() * sounds.length);
  playSound(sounds[rand]);
}

// ================== WORLD CREATION ==================
function createWorld() {
  createTerrain();
  createMansion();
  createForest();
  createRocks();
  createGranny();
  createKey();
  createNotes();
  createShadowFigure();
  createGenerator();
  createWeather();
  createSky();
}

// ================== TERRAIN ==================
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
  const geometry = new THREE.PlaneGeometry(WORLD.WIDTH, WORLD.DEPTH, 140, 160);
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
  // Road
  const road = new THREE.Mesh(
    new THREE.BoxGeometry(16, 0.25, 420),
    new THREE.MeshStandardMaterial({ color: 0x555555 })
  );
  road.position.set(0, getTerrainHeight(0, -130) + 0.12, -130);
  road.castShadow = true;
  scene.add(road);
}

// ================== MANSION ==================
function createMansion() {
  const mansion = new THREE.Mesh(
    new THREE.BoxGeometry(70, 32, 60),
    new THREE.MeshStandardMaterial({ color: 0xA0A0A0, roughness: 0.8 })
  );
  mansion.position.set(0, getTerrainHeight(0, -420) + 16, -420);
  mansion.castShadow = true;
  scene.add(mansion);
  addBoxCollider(mansion);

  // Door
  mansionDoor = new THREE.Mesh(
    new THREE.BoxGeometry(9, 15, 1.5),
    new THREE.MeshStandardMaterial({ color: 0x3D2817 })
  );
  mansionDoor.position.set(0, getTerrainHeight(0, -389) + 7.5, -389);
  mansionDoor.userData.type = "door";
  scene.add(mansionDoor);
  addBoxCollider(mansionDoor);

  // Tower
  const tower = new THREE.Mesh(
    new THREE.BoxGeometry(22, 48, 22),
    new THREE.MeshStandardMaterial({ color: 0x808080 })
  );
  tower.position.set(-35, getTerrainHeight(-35, -420) + 24, -420);
  scene.add(tower);
  addBoxCollider(tower);

  createMansionInterior(mansion.position);
}

function createMansionInterior(mansionPos) {
  // Create interior rooms
  const room1 = new THREE.Mesh(
    new THREE.BoxGeometry(20, 10, 20),
    new THREE.MeshStandardMaterial({ color: 0x4a4a4a })
  );
  room1.position.set(mansionPos.x - 15, mansionPos.y - 20, mansionPos.z);
  scene.add(room1);

  const room2 = new THREE.Mesh(
    new THREE.BoxGeometry(20, 10, 20),
    new THREE.MeshStandardMaterial({ color: 0x5a5a5a })
  );
  room2.position.set(mansionPos.x + 15, mansionPos.y - 20, mansionPos.z);
  scene.add(room2);
}

// ================== FOREST & ROCKS ==================
function createTree(x, z) {
  const groundY = getTerrainHeight(x, z);
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.6, 0.9, 7, 8),
    new THREE.MeshStandardMaterial({ color: 0x6B4423 })
  );
  trunk.position.set(x, groundY + 3.5, z);
  trunk.castShadow = true;
  scene.add(trunk);
  addCylinderCollider(x, z, 2.2);
  const leaves = new THREE.Mesh(
    new THREE.ConeGeometry(4.5, 9, 8),
    new THREE.MeshStandardMaterial({ color: 0x228B22 })
  );
  leaves.position.set(x, groundY + 10, z);
  leaves.castShadow = true;
  scene.add(leaves);
}
function createForest() {
  for (let i = 0; i < 360; i++) {
    const x = Math.random() * WORLD.WIDTH - WORLD.WIDTH / 2;
    const z = Math.random() * WORLD.DEPTH - WORLD.DEPTH / 2;
    if (Math.abs(x) < 85 && z > -500 && z < -340) continue;
    if (Math.abs(x) < 25 && z > -360 && z < 120) continue;
    createTree(x, z);
  }
}
function createRocks() {
  for (let i = 0; i < 120; i++) {
    const x = Math.random() * WORLD.WIDTH - WORLD.WIDTH / 2;
    const z = Math.random() * WORLD.DEPTH - WORLD.DEPTH / 2;
    const size = Math.random() * 3.5 + 1.3;
    const rock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(size),
      new THREE.MeshStandardMaterial({ color: 0x808080, roughness: 1 })
    );
    rock.position.set(x, getTerrainHeight(x, z) + size * 0.7, z);
    rock.rotation.set(Math.random(), Math.random(), Math.random());
    rock.castShadow = true;
    scene.add(rock);
    addCylinderCollider(x, z, size + 1);
  }
}

// ================== SHADOW FIGURE ==================
function createShadowFigure() {
  shadowFigure = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(1, 1.5, 6, 8),
    new THREE.MeshStandardMaterial({ color: 0x1a1a1a, transparent: true, opacity: 0.3 })
  );
  body.position.y = 3;
  shadowFigure.add(body);
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(1, 8, 8),
    new THREE.MeshStandardMaterial({ color: 0x0a0a0a, transparent: true, opacity: 0.3 })
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

// ================== PICKUPS ==================
function createKey() {
  const keyGeom = new THREE.BoxGeometry(0.8, 1.5, 0.2);
  const keyMat = new THREE.MeshStandardMaterial({ color: 0xFFD700, metalness: 0.8 });
  keyPickup = new THREE.Mesh(keyGeom, keyMat);
  keyPickup.position.set(50, getTerrainHeight(50, 100) + 2, 100);
  keyPickup.castShadow = true;
  keyPickup.userData.type = "key";
  scene.add(keyPickup);
}
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
    const noteGeom = new THREE.BoxGeometry(1, 1.5, 0.1);
    const noteMat = new THREE.MeshStandardMaterial({ color: 0xD4A574 });
    const note = new THREE.Mesh(noteGeom, noteMat);
    note.position.copy(notePos);
    note.userData.type = "note";
    note.userData.text = noteTexts[i];
    scene.add(note);
    notesInWorld.push(note);
  }
}
function createMedkit() {
  const medGeom = new THREE.BoxGeometry(1, 1.5, 0.2);
  const medMat = new THREE.MeshStandardMaterial({ color: 0xff0000 });
  medkitPickup = new THREE.Mesh(medGeom, medMat);
  medkitPickup.position.set(80, getTerrainHeight(80, -300) + 1.5, -300);
  medkitPickup.castShadow = true;
  medkitPickup.userData.type = "medkit";
  scene.add(medkitPickup);
}

// ================== CREATE GENERATOR ==================
function createGenerator() {
  // Placeholder for generator object
  const genGeom = new THREE.BoxGeometry(3, 2, 3);
  const genMat = new THREE.MeshStandardMaterial({ color: 0x555555 });
  const generator = new THREE.Mesh(genGeom, genMat);
  generator.position.set(100, getTerrainHeight(100, -150) + 1, -150);
  generator.castShadow = true;
  generator.userData.type = "generator";
  scene.add(generator);
  // Store reference if needed
  GameState.generatorObject = generator;
}

// ================== CREATE WEATHER & SKY ==================
function createWeather() {
  // Placeholder for weather effects
  // Could be rain, fog, thunder
  // For simplicity, just a fog overlay
  scene.fog = new THREE.Fog(0xb0d0ff, 200, 800);
}
function createSky() {
  // Skybox or sky sphere
  // For simplicity, keep background color
}

// ================== GRANNY AI ==================
function createGranny() {
  granny = new THREE.Group();

  // Load Granny sprite
  const grannyGeom = new THREE.PlaneGeometry(4, 8);
  const grannyMat = new THREE.MeshBasicMaterial({ map: grannyTexture, transparent: true });
  const grannySprite = new THREE.Mesh(grannyGeom, grannyMat);
  grannySprite.position.set(0, 4, 0);
  grannySprite.rotation.y = Math.PI; // Face camera initially

  // Collider
  const collider = new THREE.Mesh(
    new THREE.CylinderGeometry(0.8, 0.8, 6, 8),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })
  );
  collider.position.y = 3;
  granny.add(collider);
  granny.add(grannySprite);
  granny.position.set(80, getTerrainHeight(80, -200), -200);
  granny.userData.speed = GRANNY.PATROL_SPEED;
  granny.userData.lastKnownPlayerPos = new THREE.Vector3();
  granny.userData.canSeePlayer = false;
  granny.userData.isAttacking = false;
  scene.add(granny);
  pickGrannyPatrolTarget();
}

// ================== GRANNY AI SYSTEM ==================
function detectPlayer() {
  const distance = granny.position.distanceTo(player.position);
  if (distance < GRANNY.DETECTION_RANGE * 0.5) return true;
  const toPlayer = new THREE.Vector3().subVectors(player.position, granny.position);
  toPlayer.y = 0;
  if (toPlayer.length() < GRANNY.DETECTION_RANGE) {
    toPlayer.normalize();
    const grannyForward = new THREE.Vector3(0, 0, -1).applyQuaternion(granny.quaternion);
    grannyForward.y = 0;
    grannyForward.normalize();
    const visionCone = (GRANNY.VISION_CONE_ANGLE * Math.PI) / 180 / 2;
    if (grannyForward.dot(toPlayer) > Math.cos(visionCone)) return true;
  }
  if (GameState.lastPlayerSound.type === "footstep" && distance < GRANNY.DETECTION_RANGE * 1.2) return true;
  if (GameState.lastPlayerSound.type === "run" && distance < GRANNY.DETECTION_RANGE * 1.5) return true;
  if (GameState.lastPlayerSound.type === "jump" && distance < GRANNY.DETECTION_RANGE * 1.3) return true;
  return false;
}

function updateGrannyAI(delta) {
  if (!granny || GameState.jumpscareStarted) return;
  const distance = granny.position.distanceTo(player.position);
  if (GameState.attackCooldown > 0) GameState.attackCooldown -= delta;
  // Attack
  if (distance < GRANNY.ATTACK_RANGE) {
    if (GameState.attackCooldown <= 0) {
      attackPlayer();
      GameState.attackCooldown = GRANNY.ATTACK_COOLDOWN;
    }
    GameState.enemyState = "attack";
    return;
  }
  // Detect
  if (GameState.enemyState !== "chase" && detectPlayer()) {
    GameState.enemyState = "chase";
    GameState.lastDetectionTime = Date.now();
    playSound("chase_music");
    playSound("granny_scream");
  }
  // Chase or investigate
  if (GameState.enemyState === "chase") chasePlayer(delta);
  if (GameState.enemyState === "investigate") investigateGranny(delta);
  if (GameState.enemyState === "patrol") patrolGranny(delta);
  // Face player
  granny.lookAt(player.position.x, granny.position.y, player.position.z);
  // Random sounds
  if (Math.random() < 0.001 && GameState.enemyState === "patrol") {
    playRandomHorrorSound();
  }
}

function attackPlayer() {
  const distance = granny.position.distanceTo(player.position);
  if (distance < GRANNY.ATTACK_RANGE + 1) {
    playSound("granny_attack");
    damagePlayer(GRANNY.ATTACK_DAMAGE);
    console.log(`🔴 Granny attacked! Player health: ${GameState.health}`);
  }
}

function pickGrannyPatrolTarget() {
  grannyTarget.set(
    Math.random() * WORLD.WIDTH - WORLD.WIDTH / 2,
    0,
    Math.random() * WORLD.DEPTH - WORLD.DEPTH / 2
  );
  grannyTarget.y = getTerrainHeight(grannyTarget.x, grannyTarget.z);
}

function patrolGranny(delta) {
  GameState.enemyPauseTimer -= delta;
  if (GameState.enemyPauseTimer > 0) return;
  const dir = new THREE.Vector3().subVectors(grannyTarget, granny.position);
  dir.y = 0;
  if (dir.length() < 8) {
    GameState.enemyPauseTimer = 2 + Math.random() * 3;
    pickGrannyPatrolTarget();
    return;
  }
  dir.normalize();
  granny.position.addScaledVector(dir, GRANNY.PATROL_SPEED * delta);
  granny.lookAt(granny.position.x + dir.x, granny.position.y, granny.position.z + dir.z);
  avoidGrannyHardClip();
}

function chasePlayer(delta) {
  const dir = new THREE.Vector3().subVectors(player.position, granny.position);
  dir.y = 0;
  dir.normalize();
  granny.position.addScaledVector(dir, GRANNY.CHASE_SPEED * delta);
  granny.lookAt(player.position.x, granny.position.y, player.position.z);
  avoidGrannyHardClip();
}

function investigateGranny(delta) {
  const targetPos = granny.userData.lastKnownPlayerPos;
  const dist = granny.position.distanceTo(targetPos);
  if (dist < 12) {
    if (Math.random() > 0.7) {
      pickGrannyPatrolTarget();
      GameState.enemyState = "patrol";
      GameState.enemyInvestigating = false;
    }
    return;
  }
  const dir = new THREE.Vector3().subVectors(targetPos, granny.position);
  dir.y = 0;
  dir.normalize();
  granny.position.addScaledVector(dir, GRANNY.PATROL_SPEED * 1.5 * delta);
  granny.lookAt(targetPos.x, granny.position.y, targetPos.z);
  avoidGrannyHardClip();
}

// ================== DANGER SYSTEM ==================
function updateDangerLevel(distance) {
  if (distance < 8) {
    GameState.dangerLevel = 3;
    if (Math.random() > 0.7) playSound("heartbeat");
    applyDangerUI("critical");
  } else if (distance < 15) {
    GameState.dangerLevel = 2;
    if (Math.random() > 0.85) playSound("heartbeat");
    applyDangerUI("high");
  } else if (distance < 30) {
    GameState.dangerLevel = 1;
    applyDangerUI("medium");
  } else {
    GameState.dangerLevel = 0;
    applyDangerUI("none");
  }
}
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

// ================== HORROR EVENTS ==================
function updateHorrorEvents(delta) {
  GameState.horrorEventTimer -= delta;
  if (GameState.horrorEventTimer <= 0) {
    const eventType = Math.floor(Math.random() * 4);
    if (eventType === 0 && shadowFigure && !shadowFigure.userData.visible) {
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
      playSound("ghost_whisper");
    } else if (eventType === 2) {
      if (GameState.torchOn && Math.random() > 0.5) {
        torchLight.intensity = 1;
        setTimeout(() => {
          torchLight.intensity = 3;
        }, 200);
      }
    } else if (eventType === 3) {
      playRandomHorrorSound();
    }
    GameState.horrorEventTimer = 15 + Math.random() * 20;
  }
}

// ================== PLAYER UPDATE ==================
function updatePlayer(delta) {
  // Rotation
  player.rotation.y = GameState.yaw;
  camera.rotation.x = GameState.pitch;
  // Save last position
  lastSafePosition.copy(player.position);
  // Movement
  const currentSpeed = GameState.running ? WORLD.RUN_SPEED : WORLD.WALK_SPEED;
  const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), GameState.yaw);
  const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), GameState.yaw);
  const direction = new THREE.Vector3();
  if (GameState.move.w) direction.add(forward);
  if (GameState.move.s) direction.sub(forward);
  if (GameState.move.d) direction.add(right);
  if (GameState.move.a) direction.sub(right);
  if (GameState.joystick.active) {
    const joyX = THREE.MathUtils.clamp(GameState.joystick.dx / 60, -1, 1);
    const joyY = THREE.MathUtils.clamp(GameState.joystick.dy / 60, -1, 1);
    direction.addScaledVector(right, joyX);
    direction.addScaledVector(forward, -joyY);
  }
  // Sprint & stamina
  if (GameState.running && direction.lengthSq() > 0) {
    GameState.stamina = Math.max(0, GameState.stamina - 0.08);
    if (GameState.stamina <= 0) GameState.running = false;
    if (Math.random() > 0.8) playSound("footstep");
  } else {
    GameState.stamina = Math.min(100, GameState.stamina + 0.3);
  }
  // Movement execution
  if (direction.lengthSq() > 0) {
    direction.normalize();
    player.position.x += direction.x * currentSpeed * delta;
    player.position.z += direction.z * currentSpeed * delta;
    // Update sound
    if (GameState.running) {
      GameState.lastPlayerSound = { time: Date.now(), type: "run" };
    } else {
      GameState.lastPlayerSound = { time: Date.now(), type: "footstep" };
    }
  }
  // Clamp position
  const limitX = WORLD.WIDTH / 2 - 10;
  const limitZ = WORLD.DEPTH / 2 - 10;
  player.position.x = THREE.MathUtils.clamp(player.position.x, -limitX, limitX);
  player.position.z = THREE.MathUtils.clamp(player.position.z, -limitZ, limitZ);
  // Gravity
  updateGravity(delta);
  // Collisions
  handleCollisions();
  // Interaction check
  checkInteractions();
  // Battery drain
  drainBattery(delta);
  // PHASE 1: Flashlight flickering
  updateBatteryEffects();
}

// ================== BATTERY & FLASHLIGHT SYSTEM ==================
function drainBattery(delta) {
  if (GameState.batteryDrainActive && GameState.torchOn && GameState.battery > 0) {
    GameState.battery -= GameState.batteryDrainRate * delta * 60; // per second
    if (GameState.battery < 0) GameState.battery = 0;
  }
}
function updateBatteryEffects() {
  // Flicker flashlight when battery is low
  if (GameState.battery <= GameState.lowBatteryThreshold && GameState.torchOn) {
    if (Math.random() < 0.1) {
      torchLight.intensity = Math.random() > 0.5 ? 0 : 3; // flicker
    }
  } else {
    torchLight.intensity = GameState.torchOn ? 3 : 0;
  }
  // Update battery UI
  if (batteryUI) {
    batteryUI.innerText = Math.ceil(GameState.battery);
  }
}

// ================== BATTERY PICKUP ==================
function pickupBattery(amount) {
  // amount: number
  GameState.battery = Math.min(1000, GameState.battery + amount);
  updateBatteryUI();
}

// ================== REPLACE BATTERY ==================
function replaceBattery() {
  GameState.battery = 1000;
  updateBatteryUI();
}

// ================== MEDKIT SYSTEM ==================
function pickupMedkit() {
  // Adds medkit to inventory
  GameState.inventory.medkits += 1;
  updateInventoryUI();
}
function useMedkit() {
  if (GameState.inventory.medkits > 0 && !GameState.medkitUseCooldown) {
    healPlayer(25);
    GameState.inventory.medkits -= 1;
    GameState.medkitUseCooldown = true;
    setTimeout(() => { GameState.medkitUseCooldown = false; }, 2000);
    updateInventoryUI();
  }
}
function healPlayer(amount) {
  GameState.health = Math.min(100, GameState.health + amount);
  updateHealthUI();
}

// ================== INVENTORY SYSTEM ==================
function pickupItem(itemType) {
  // e.g., itemType: 'key', 'fuse', 'battery', etc.
  if (itemType === 'battery') {
    pickupBattery(200); // example
  } else if (itemType === 'medkit') {
    pickupMedkit();
  } else {
    GameState.inventory[itemType] = true;
  }
  updateInventoryUI();
}
function useItem(itemType) {
  // Usage logic for items
  if (itemType === 'medkit') {
    useMedkit();
  } else if (itemType === 'fuse') {
    // Insert fuse
    if (GameState.inventory.fuse) {
      repairGenerator();
      GameState.inventory.fuse = false;
      updateInventoryUI();
    }
  } else if (itemType === 'key') {
    // Unlock doors or rooms
  }
}
function dropItem(itemType) {
  // Drop logic
  if (GameState.inventory[itemType]) {
    GameState.inventory[itemType] = false;
    updateInventoryUI();
  }
}
function equipItem(itemType) {
  // Equip logic if applicable
}

// ================== ENTER MANSION & ROOMS ==================
function enterMansion() {
  // Transition to interior
  GameState.insideMansion = true;
  createInterior();
}
function exitMansion() {
  GameState.insideMansion = false;
  // Remove interior objects
}

// ================== CREATE INTERIOR ==================
function createInterior() {
  // Create rooms, hallways, doors
  // For simplicity, create a small room
  const room = new THREE.Mesh(
    new THREE.BoxGeometry(20, 10, 20),
    new THREE.MeshStandardMaterial({ color: 0x4a4a4a })
  );
  room.position.set(0, 5, 0);
  scene.add(room);
  // Create doors, etc.
}

// ================== LOCKED ROOMS ==================
function unlockRoom(roomName) {
  if (GameState.inventory.key) {
    GameState.lockedRooms[roomName] = false;
    // Open door animation
  }
}
function checkRoomAccess(roomName) {
  return !GameState.lockedRooms[roomName];
}

// ================== BASEMENT SYSTEM ==================
function createBasement() {
  // Create basement entrance
  // For simplicity, assume basement is below
}
function enterBasement() {
  GameState.inBasement = true;
  // Create basement interior
}

// ================== GENERATOR SYSTEM ==================
function repairGenerator() {
  if (GameState.generatorObject) {
    // Animate repair
    GameState.generatorOn = true;
    // Possibly restore power
  }
}
function turnGeneratorOn() {
  if (GameState.generatorOn) {
    // Enable power
  }
}

// ================== ADVANCED GRANNY AI ==================
function updateGrannyAI(delta) {
  // Already implemented above
}

// ================== HEARING SYSTEM ==================
function makeNoise(position, type) {
  // Store last noise position
  GameState.lastNoisePosition.copy(position);
  // Play sound based on type
  // e.g., door, running, jumping
}
function detectNoise() {
  // Granny AI or enemies can investigate noise
  if (GameState.hearingEnabled) {
    // Implement detection logic
    if (GameState.lastNoisePosition.distanceTo(granny.position) < 20) {
      granny.userData.lastKnownPlayerPos.copy(GameState.lastNoisePosition);
      GameState.enemyState = "investigate";
    }
  }
}
function investigateNoise(position) {
  granny.userData.lastKnownPlayerPos.copy(position);
  GameState.enemyState = "investigate";
}

// ================== JUMPSCARE SYSTEM ==================
function showJumpscare() {
  // Show fullscreen jumpscare
  if (jumpscareMesh) {
    jumpscareMesh.style.display = "block";
    GameState.jumpscareActive = true;
  }
}
function hideJumpscare() {
  if (jumpscareMesh) {
    jumpscareMesh.style.display = "none";
    GameState.jumpscareActive = false;
  }
}

// ================== SAVE SYSTEM ==================
function saveGame() {
  localStorage.setItem("saveData", JSON.stringify(GameState));
}
function loadGame() {
  const data = localStorage.getItem("saveData");
  if (data) {
    Object.assign(GameState, JSON.parse(data));
  }
}
function autoSave() {
  saveGame();
}

// ================== WEATHER SYSTEM ==================
function startRain() {
  // Show rain particle system
  GameState.weatherState = "rain";
}
function stopRain() {
  // Remove rain particles
  GameState.weatherState = "clear";
}
function lightningStrike() {
  // Flash lightning effect
  if (weatherMesh) {
    weatherMesh.style.display = "block";
    setTimeout(() => { weatherMesh.style.display = "none"; }, 200);
  }
}

// ================== DAY NIGHT CYCLE ==================
function updateSun() {
  // Animate sun position
}
function updateMoon() {
  // Animate moon
}
function updateSky() {
  // Change sky color/skybox
}
function updateDayNightCycle(delta) {
  // Toggle day/night based on timer
}

// ================== ESCAPE SEQUENCE ==================
function collectCarPart(part) {
  GameState.inventory.carParts.push(part);
  // Check if all parts collected
}
function repairVehicle() {
  // Repair car
  GameState.vehicleRepaired = true;
}
function startVehicle() {
  if (GameState.vehicleRepaired) {
    // Initiate escape sequence
    escapeGame();
  }
}
function escapeGame() {
  // Trigger escape scene
  alert("You escaped! Congratulations!");
  // Show victory
  showVictory();
}

// ================== AUDIO MANAGER ==================
class AudioManager {
  constructor() {
    this.context = new (window.AudioContext || window.webkitAudioContext)();
    this.sounds = {};
  }
  loadSound(name, url) {
    // Load sound buffer
  }
  playSound(name) {
    // Play loaded sound
  }
  stopSound(name) {
    // Stop sound
  }
}
GameState.audioManager = new AudioManager();

// ================== SETTINGS ==================
function changeVolume(value) {
  GameState.volume = value;
  // Apply to all sounds
}
function changeGraphics(quality) {
  GameState.graphicsQuality = quality;
  // Change renderer settings
}
function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
  } else {
    document.exitFullscreen();
  }
}

// ================== MAIN ANIMATION LOOP ==================
function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.05);
  if (!GameState.paused) {
    updatePlayer(delta);
    updateGravity(delta);
    updateGrannyAI(delta);
    updateHorrorEvents(delta);
    handleCollisions();
    updateStaminaUI();
    updateBatteryUI();
    updateWeather(delta);
    updateSky(delta);
    updateDayNightCycle(delta);
    handleJumpscare(delta);
  }
  renderer.render(scene, camera);
}

// ================== HANDLERS ==================
function handleJumpscare(delta) {
  if (GameState.jumpscareActive) {
    GameState.jumpscareTimer += delta;
    if (GameState.jumpscareTimer > 2) {
      hideJumpscare();
    }
  }
}

// ================== STARTUP ==================
window.onload = () => {
  startGame();
};
