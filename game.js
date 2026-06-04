// ============================================
// THREE.JS HORROR GAME - PROPERLY ORGANIZED & FIXED
// Converted from Night to Day Scene with Granny Enemy
// ============================================

// ========== GAME STATE MANAGER ==========
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
  battery: 1000,

  // Torch system
  torchOn: true,

  // Inventory
  inventory: {
    key: false,
    batteries: 0,
    notesCollected: 0
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
  joystick: { active: false, dx: 0, dy: 0 }
};

// ========== WORLD CONSTANTS ==========
const WORLD = {
  WIDTH: 1500,
  DEPTH: 1800,
  PLAYER_HEIGHT: 5,
  EYE_HEIGHT: 1.6,
  WALK_SPEED: 10,
  RUN_SPEED: 16,
  MOUSE_SENSITIVITY: 0.002,
  ESCAPE_POINT: new THREE.Vector3(0, 0, 500)
};

// ========== GRANNY AI CONSTANTS ==========
const GRANNY = {
  DETECTION_RANGE: 15, // Can see player within 15 units
  CHASE_RANGE: 20, // Chase range
  ATTACK_RANGE: 3, // Attack range
  PATROL_SPEED: 4,
  CHASE_SPEED: 9,
  ATTACK_DAMAGE: 15, // Damage per attack
  ATTACK_COOLDOWN: 1.5, // Seconds between attacks
  VISION_CONE_ANGLE: 120 // Degrees
};

// ========== THREE.JS OBJECTS ==========
let scene, camera, renderer, clock;
let player, torchLight, granny;
let mansionDoor, shadowFigure, keyPickup;
let notesInWorld = [];
let colliders = [];

// ========== SAFE POSITION TRACKING ==========
let lastSafePosition = new THREE.Vector3();
let grannyTarget = new THREE.Vector3();
let investigateTarget = new THREE.Vector3();
let grannyTexture = null;

// ============================================
// INITIALIZATION
// ============================================

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
  // ========== SETUP THREE.JS ==========
  clock = new THREE.Clock();
  scene = new THREE.Scene();

  // ✅ BRIGHT DAY SKY
  scene.background = new THREE.Color(0x87CEEB); // Sky blue
  scene.fog = new THREE.Fog(0xb0d0ff, 200, 800);

  // ========== CAMERA ==========
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1200
  );

  // ========== RENDERER ==========
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  document.body.appendChild(renderer.domElement);

  // ========== LIGHTING - DAY SCENE ==========
  setupDayLighting();

  // ========== LOAD GRANNY TEXTURE ==========
  loadGrannyTexture();

  // ========== CREATE WORLD ==========
  createWorld();

  // ========== SETUP PLAYER ==========
  setupPlayer();

  // ========== SETUP TORCH (DAY MODE) ==========
  setupTorch();

  // ========== EVENT LISTENERS ==========
  setupEventListeners();

  // ========== MOBILE CONTROLS ==========
  setupMobileUiButtons();
  createMobileControls();

  // ========== UI UPDATES ==========
  updateHealthUI();
  updateStaminaUI();
  updateBatteryUI();
  updateObjectiveUI();
  updateInventoryUI();
}

// ============================================
// GRANNY TEXTURE LOADING
// ============================================

function setupDayLighting() {
  // ✅ BRIGHT AMBIENT LIGHT
  scene.add(new THREE.AmbientLight(0xffffff, 0.8));

  // ✅ SUN DIRECTIONAL LIGHT
  const sun = new THREE.DirectionalLight(0xffffff, 1.2);
  sun.position.set(200, 300, 150);
  sun.castShadow = true;
  sun.shadow.mapSize.set(4096, 4096);
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 800;
  sun.shadow.camera.left = -500;
  sun.shadow.camera.right = 500;
  sun.shadow.camera.top = 500;
  sun.shadow.camera.bottom = -500;
  scene.add(sun);

  // ✅ VISUAL SUN IN SKY
  const sunGeometry = new THREE.SphereGeometry(40, 32, 32);
  const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xFFD700 });
  const sunMesh = new THREE.Mesh(sunGeometry, sunMaterial);
  sunMesh.position.set(200, 400, -500);
  scene.add(sunMesh);

  // ✅ SUN GLOW
  const glowGeometry = new THREE.SphereGeometry(50, 32, 32);
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: 0xFFA500,
    transparent: true,
    opacity: 0.15
  });
  const sunGlow = new THREE.Mesh(glowGeometry, glowMaterial);
  sunGlow.position.copy(sunMesh.position);
  scene.add(sunGlow);

  // ✅ ADD CLOUDS
  createClouds();
}

function createClouds() {
  const cloudTexture = createCloudTexture();

  for (let i = 0; i < 8; i++) {
    const cloudGeometry = new THREE.PlaneGeometry(150, 80);
    const cloudMaterial = new THREE.MeshStandardMaterial({
      map: cloudTexture,
      emissive: 0xffffff,
      emissiveIntensity: 0.6,
      transparent: true
    });

    const cloud = new THREE.Mesh(cloudGeometry, cloudMaterial);
    cloud.position.set(
      (Math.random() - 0.5) * 1000,
      200 + Math.random() * 150,
      (Math.random() - 0.5) * 800
    );
    cloud.rotation.z = Math.random() * Math.PI;
    cloud.castShadow = false;
    scene.add(cloud);
  }
}

function createCloudTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
  ctx.filter = "blur(5px)";

  for (let i = 0; i < 30; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const size = Math.random() * 40 + 20;
    ctx.fillRect(x, y, size, size);
  }

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

function setupPlayer() {
  player = new THREE.Object3D();
  player.position.set(
    0,
    getTerrainHeight(0, 20) + WORLD.PLAYER_HEIGHT,
    20
  );
  lastSafePosition.copy(player.position);
  scene.add(player);

  player.add(camera);
  camera.position.set(0, WORLD.EYE_HEIGHT, 0);
  camera.rotation.order = "YXZ";
}

function setupTorch() {
  // ✅ DAY MODE - TORCH IS WEAKER BUT STILL USEFUL
  torchLight = new THREE.SpotLight(0xffffff, 0, 200, Math.PI / 4.5, 0.5, 2);
  torchLight.shadow.mapSize.set(2048, 2048);
  torchLight.shadow.camera.near = 0.1;
  torchLight.shadow.camera.far = 200;
  camera.add(torchLight);
  camera.add(torchLight.target);
  torchLight.target.position.set(0, 0, -1);
  GameState.torchOn = true;
  torchLight.intensity = 3; // ✅ Reduced for day
}

function setupEventListeners() {
  window.addEventListener("keydown", keyDown);
  window.addEventListener("keyup", keyUp);
  document.addEventListener("click", requestPointerControl);
  document.addEventListener("mousemove", handleMouseLook);
  document.addEventListener("pointerlockchange", handlePointerLockChange);
  window.addEventListener("resize", onResize);
}

// ============================================
// SOUND SYSTEM
// ============================================

let audioContext;

function initAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
}

function createSound(frequency, duration, type = "sine") {
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

function playSound(soundName) {
  if (!audioContext) return;

  switch (soundName) {
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
  const randomSound = sounds[Math.floor(Math.random() * sounds.length)];
  playSound(randomSound);
}

// ============================================
// WORLD GENERATION
// ============================================

function createWorld() {
  createTerrain();
  createMansion();
  createForest();
  createRocks();
  createGranny();
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

  // ✅ ROAD
  const road = new THREE.Mesh(
    new THREE.BoxGeometry(16, 0.25, 420),
    new THREE.MeshStandardMaterial({ color: 0x555555 })
  );
  road.position.set(0, getTerrainHeight(0, -130) + 0.12, -130);
  road.castShadow = true;
  road.receiveShadow = true;
  scene.add(road);
}

function createMansion() {
  const mansion = new THREE.Mesh(
    new THREE.BoxGeometry(70, 32, 60),
    new THREE.MeshStandardMaterial({ color: 0xA0A0A0, roughness: 0.8 })
  );
  mansion.position.set(0, getTerrainHeight(0, -420) + 16, -420);
  mansion.castShadow = true;
  mansion.receiveShadow = true;
  scene.add(mansion);
  addBoxCollider(mansion);

  // ✅ MANSION DOOR
  mansionDoor = new THREE.Mesh(
    new THREE.BoxGeometry(9, 15, 1.5),
    new THREE.MeshStandardMaterial({ color: 0x3D2817 })
  );
  mansionDoor.position.set(0, getTerrainHeight(0, -389) + 7.5, -389);
  mansionDoor.userData.type = "door";
  scene.add(mansionDoor);
  addBoxCollider(mansionDoor);

  // ✅ TOWER
  const tower = new THREE.Mesh(
    new THREE.BoxGeometry(22, 48, 22),
    new THREE.MeshStandardMaterial({ color: 0x808080 })
  );
  tower.position.set(-35, getTerrainHeight(-35, -420) + 24, -420);
  tower.castShadow = true;
  scene.add(tower);
  addBoxCollider(tower);

  createMansionInterior(mansion.position);
}

function createMansionInterior(mansionPos) {
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
    new THREE.MeshStandardMaterial({ color: 0x228B22 }) // ✅ Green leaves
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
    rock.receiveShadow = true;
    scene.add(rock);
    addCylinderCollider(x, z, size + 1);
  }
}

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

function createKey() {
  const keyGeometry = new THREE.BoxGeometry(0.8, 1.5, 0.2);
  const keyMaterial = new THREE.MeshStandardMaterial({
    color: 0xFFD700,
    metalness: 0.8
  });

  keyPickup = new THREE.Mesh(keyGeometry, keyMaterial);
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

    const noteGeometry = new THREE.BoxGeometry(1, 1.5, 0.1);
    const noteMaterial = new THREE.MeshStandardMaterial({ color: 0xD4A574 });
    const note = new THREE.Mesh(noteGeometry, noteMaterial);

    note.position.copy(notePos);
    note.userData.type = "note";
    note.userData.text = noteTexts[i];
    scene.add(note);
    notesInWorld.push(note);
  }
}

// ============================================
// ✅ FIXED: GRANNY CREATION FUNCTION
// ============================================

function loadGrannyTexture(callback) {
  const textureLoader = new THREE.TextureLoader();

  textureLoader.load(
    "textures/GrannyG1New.webp",
    (texture) => {
      grannyTexture = texture;
      grannyTexture.transparent = true;

      if(callback) callback();
    },
    undefined,
    (err)=>{
      console.error("Failed to load Granny texture",err);

      if(callback) callback();
    }
  );
}

  // ✅ Create sprite
  const grannySprite = new THREE.Mesh(grannyGeometry, grannyMaterial);
  grannySprite.position.set(0, 3.5, 0);
  grannySprite.castShadow = true;
  grannySprite.receiveShadow = true;

  // ✅ Create invisible collision body
  const collider = new THREE.Mesh(
    new THREE.CylinderGeometry(0.8, 0.8, 6, 8),
    new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0
    })
  );
  collider.position.y = 3;

  // ✅ Add children to granny group
  granny.add(collider);
  granny.add(grannySprite);

  // ✅ Set position and stats
  granny.position.set(80, getTerrainHeight(80, -200), -200);
  granny.userData.speed = GRANNY.PATROL_SPEED;
  granny.userData.lastKnownPlayerPos = new THREE.Vector3();
  granny.userData.canSeePlayer = false;
  granny.userData.isAttacking = false;
  
  // ✅ Add to scene
  scene.add(granny);
  
  // ✅ Start patrol
  pickGrannyPatrolTarget();
}

// ============================================
// GRANNY AI SYSTEM
// ============================================

function detectPlayer() {
  const distance = granny.position.distanceTo(player.position);

  // ✅ CLOSE RANGE DETECTION (Always detects if too close)
  if (distance < GRANNY.DETECTION_RANGE * 0.5) return true;

  // ✅ VISION CONE DETECTION
  const toPlayer = new THREE.Vector3().subVectors(player.position, granny.position);
  toPlayer.y = 0;

  if (toPlayer.length() < GRANNY.DETECTION_RANGE) {
    toPlayer.normalize();
    const grannyForward = new THREE.Vector3(0, 0, -1).applyQuaternion(
      granny.quaternion
    );
    grannyForward.y = 0;
    grannyForward.normalize();

    // ✅ CHECK IF PLAYER IS IN VISION CONE (120 degrees)
    const visionCone = (GRANNY.VISION_CONE_ANGLE * Math.PI) / 180 / 2;
    if (grannyForward.dot(toPlayer) > Math.cos(visionCone)) return true;
  }

  // ✅ SOUND DETECTION
  if (GameState.lastPlayerSound.type === "footstep" && distance < GRANNY.DETECTION_RANGE * 1.2) return true;
  if (GameState.lastPlayerSound.type === "run" && distance < GRANNY.DETECTION_RANGE * 1.5) return true;
  if (GameState.lastPlayerSound.type === "jump" && distance < GRANNY.DETECTION_RANGE * 1.3) return true;

  return false;
}

function updateGrannyAI(delta) {
  if (!granny || GameState.jumpscareStarted) return;

  const distance = granny.position.distanceTo(player.position);

  // ✅ COOLDOWN FOR ATTACK
  if (GameState.attackCooldown > 0) {
    GameState.attackCooldown -= delta;
  }

  // ✅ KILL CHECK - ATTACK IN RANGE
  if (distance < GRANNY.ATTACK_RANGE) {
    if (GameState.attackCooldown <= 0) {
      attackPlayer();
      GameState.attackCooldown = GRANNY.ATTACK_COOLDOWN;
    }
    GameState.enemyState = "attack";
    return;
  }

  // ✅ DETECTION FLOW
  if (GameState.enemyState !== "chase" && detectPlayer()) {
    GameState.enemyState = "chase";
    GameState.lastDetectionTime = Date.now();
    playSound("chase_music");
    playSound("granny_scream");
  }

  // ✅ CHASE TO INVESTIGATE
  if (GameState.enemyState === "chase" && distance > GRANNY.CHASE_RANGE) {
    GameState.enemyState = "investigate";
    granny.userData.lastKnownPlayerPos.copy(player.position);
    GameState.enemyInvestigating = true;
    GameState.investigateTimer = 8;
  }

  // ✅ INVESTIGATE TO PATROL
  if (GameState.enemyState === "investigate" && GameState.investigateTimer <= 0) {
    GameState.enemyState = "patrol";
    GameState.enemyInvestigating = false;
    pickGrannyPatrolTarget();
  }

  // ✅ INVESTIGATE TIMER
  if (GameState.enemyInvestigating) {
    GameState.investigateTimer -= delta;
  }

  // ✅ STATES
  if (GameState.enemyState === "patrol") patrolGranny(delta);
  if (GameState.enemyState === "investigate") investigateGranny(delta);
  if (GameState.enemyState === "chase") chasePlayer(delta);

  granny.position.y = getTerrainHeight(granny.position.x, granny.position.z) + 0.5;
  updateDangerLevel(distance);

  // ✅ GRANNY BILLBOARD - ALWAYS FACE PLAYER
  granny.lookAt(player.position.x, granny.position.y, player.position.z);

  // ✅ RANDOM SOUNDS
  if (Math.random() < 0.001 && GameState.enemyState === "patrol") {
    playRandomHorrorSound();
  }
}

function investigateGranny(delta) {
  const investigatePos = granny.userData.lastKnownPlayerPos;
  const dist = granny.position.distanceTo(investigatePos);

  if (dist < 12) {
    if (Math.random() > 0.7) {
      pickGrannyPatrolTarget();
      GameState.enemyState = "patrol";
      GameState.enemyInvestigating = false;
    }
    return;
  }

  const dir = new THREE.Vector3().subVectors(investigatePos, granny.position);
  dir.y = 0;
  dir.normalize();

  granny.position.addScaledVector(dir, GRANNY.PATROL_SPEED * 1.5 * delta);
  granny.lookAt(investigatePos.x, granny.position.y, investigatePos.z);
  avoidGrannyHardClip();
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
  granny.lookAt(
    granny.position.x + dir.x,
    granny.position.y,
    granny.position.z + dir.z
  );
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

function attackPlayer() {
  const distance = granny.position.distanceTo(player.position);
  
  if (distance < GRANNY.ATTACK_RANGE + 2) {
    playSound("granny_attack");
    damagePlayer(GRANNY.ATTACK_DAMAGE);
    
    console.log(`🔴 GRANNY ATTACKED! Health: ${GameState.health}`);
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

// ============================================
// DANGER SYSTEM
// ============================================

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

// ============================================
// HORROR EVENTS
// ============================================

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

// ============================================
// PLAYER UPDATE
// ============================================

function updatePlayer(delta) {
  player.rotation.y = GameState.yaw;
  camera.rotation.x = GameState.pitch;

  lastSafePosition.copy(player.position);

  const currentSpeed = GameState.running ? WORLD.RUN_SPEED : WORLD.WALK_SPEED;
  const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(
    new THREE.Vector3(0, 1, 0),
    GameState.yaw
  );
  const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(
    new THREE.Vector3(0, 1, 0),
    GameState.yaw
  );
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

  if (GameState.running && direction.lengthSq() > 0) {
    GameState.stamina = Math.max(0, GameState.stamina - 0.08);
    if (GameState.stamina <= 0) GameState.running = false;
    if (Math.random() > 0.8) playSound("footstep");
  } else {
    GameState.stamina = Math.min(100, GameState.stamina + 0.3);
  }

  if (direction.lengthSq() > 0) {
    direction.normalize();
    player.position.x += direction.x * currentSpeed * delta;
    player.position.z += direction.z * currentSpeed * delta;

    if (GameState.running) {
      GameState.lastPlayerSound = { time: Date.now(), type: "run" };
    } else if (direction.lengthSq() > 0) {
      GameState.lastPlayerSound = { time: Date.now(), type: "footstep" };
    }
  }

  const limitX = WORLD.WIDTH / 2 - 10;
  const limitZ = WORLD.DEPTH / 2 - 10;
  player.position.x = THREE.MathUtils.clamp(player.position.x, -limitX, limitX);
  player.position.z = THREE.MathUtils.clamp(player.position.z, -limitZ, limitZ);

  handleCollisions();
  checkInteractions();
}

// ============================================
// INTERACTIONS
// ============================================

function checkInteractions() {
  const interactionRange = 5;
  const interactionText = document.getElementById("interactionText");

  let nearItem = false;

  if (keyPickup && !GameState.inventory.key) {
    const keyDist = player.position.distanceTo(keyPickup.position);
    if (keyDist < interactionRange) {
      interactionText.style.display = "block";
      interactionText.innerText = "Press E to Pick Up Key";
      nearItem = true;
    }
  }

  if (mansionDoor && GameState.inventory.key && !GameState.doorUnlocked) {
    const doorDist = player.position.distanceTo(mansionDoor.position);
    if (doorDist < interactionRange) {
      interactionText.style.display = "block";
      interactionText.innerText = "Press E to Unlock Door";
      nearItem = true;
    }
  }

  for (let note of notesInWorld) {
    const noteDist = player.position.distanceTo(note.position);
    if (noteDist < interactionRange) {
      interactionText.style.display = "block";
      interactionText.innerText = "Press E to Read Note";
      nearItem = true;
      break;
    }
  }

  if (GameState.doorUnlocked) {
    const escapeDist = player.position.distanceTo(WORLD.ESCAPE_POINT);
    if (escapeDist < 20) {
      showVictory();
    }
  }

  if (!nearItem) {
    interactionText.style.display = "none";
  }
}

function handleInteraction() {
  const interactionRange = 5;

  if (keyPickup && !GameState.inventory.key) {
    if (player.position.distanceTo(keyPickup.position) < interactionRange) {
      GameState.inventory.key = true;
      scene.remove(keyPickup);
      playSound("key_pickup");
      updateObjective(1);
      updateInventoryUI();
      return;
    }
  }

  if (mansionDoor && GameState.inventory.key && !GameState.doorUnlocked) {
    if (player.position.distanceTo(mansionDoor.position) < interactionRange) {
      GameState.doorUnlocked = true;
      playSound("door_open");
      updateObjective(2);

      let angle = 0;
      const animateOpen = setInterval(() => {
        angle += 0.1;
        mansionDoor.rotation.y = angle;
        if (angle >= Math.PI / 2) {
          clearInterval(animateOpen);
          GameState.doorOpen = true;
        }
      }, 30);

      updateInventoryUI();
      return;
    }
  }

  for (let i = 0; i < notesInWorld.length; i++) {
    const note = notesInWorld[i];
    if (player.position.distanceTo(note.position) < interactionRange) {
      alert("NOTE: " + note.userData.text);
      GameState.inventory.notesCollected++;
      notesInWorld.splice(i, 1);
      scene.remove(note);
      updateInventoryUI();
      return;
    }
  }
}

function updateObjective(stage) {
  GameState.objectiveStage = stage;

  const stages = [
    "Find the Mansion Key",
    "Reach the Mansion",
    "Unlock the Door",
    "Escape the Island"
  ];

  GameState.currentObjective = stages[stage] || stages[0];
  updateObjectiveUI();
}

// ============================================
// PHYSICS
// ============================================

function updateGravity(delta) {
  player.position.y += GameState.velocityY * delta;
  GameState.velocityY -= 20 * delta;

  const groundY = getTerrainHeight(player.position.x, player.position.z);
  const floorY = groundY + WORLD.PLAYER_HEIGHT;

  if (player.position.y <= floorY) {
    player.position.y = floorY;
    GameState.velocityY = 0;
    GameState.isJumping = false;
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

function avoidGrannyHardClip() {
  for (const col of colliders) {
    const dx = granny.position.x - col.x;
    const dz = granny.position.z - col.z;
    const distSq = dx * dx + dz * dz;
    const minDist = 2.3 + col.r;

    if (distSq < minDist * minDist) {
      const dist = Math.sqrt(distSq) || 0.01;
      granny.position.x = col.x + (dx / dist) * minDist;
      granny.position.z = col.z + (dz / dist) * minDist;
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

// ============================================
// INPUT HANDLING
// ============================================

function keyDown(e) {
  const key = e.key.toLowerCase();

  if (key === "w") GameState.move.w = true;
  if (key === "a") GameState.move.a = true;
  if (key === "s") GameState.move.s = true;
  if (key === "d") GameState.move.d = true;
  if (key === "shift") GameState.running = true;
  if (e.code === "Space") jump();
  if (key === "f") toggleTorch();
  if (key === "p") togglePause();
  if (key === "e") handleInteraction();
}

function keyUp(e) {
  const key = e.key.toLowerCase();

  if (key === "w") GameState.move.w = false;
  if (key === "a") GameState.move.a = false;
  if (key === "s") GameState.move.s = false;
  if (key === "d") GameState.move.d = false;
  if (key === "shift") GameState.running = false;
}

function handleMouseLook(e) {
  if (document.pointerLockElement !== document.body || GameState.paused) return;

  GameState.yaw -= e.movementX * WORLD.MOUSE_SENSITIVITY;
  GameState.pitch -= e.movementY * WORLD.MOUSE_SENSITIVITY;
  GameState.pitch = Math.max(-1.5, Math.min(1.5, GameState.pitch));
}

function handlePointerLockChange() {
  if (document.pointerLockElement !== document.body && GameState.started) {
    GameState.move.w = false;
    GameState.move.a = false;
    GameState.move.s = false;
    GameState.move.d = false;
    GameState.running = false;
  }
}

function requestPointerControl() {
  if (!GameState.paused && GameState.started && document.body.requestPointerLock) {
    document.body.requestPointerLock();
  }
}

function togglePause() {
  GameState.paused = !GameState.paused;

  const pauseBtn = document.getElementById("pauseBtn");
  if (pauseBtn) pauseBtn.innerHTML = GameState.paused ? "Play" : "Pause";

  if (GameState.paused && document.exitPointerLock) {
    document.exitPointerLock();
  } else {
    requestPointerControl();
  }
}

function toggleTorch() {
  GameState.torchOn = !GameState.torchOn;
  if (torchLight) torchLight.intensity = GameState.torchOn ? 3 : 0;

  const torchBtn = document.getElementById("torchBtn");
  if (torchBtn) torchBtn.innerHTML = GameState.torchOn ? "Torch ON" : "Torch OFF";
}

function jump() {
  if (!GameState.isJumping && !GameState.paused) {
    GameState.velocityY = 7;
    GameState.isJumping = true;
    playSound("footstep");
    GameState.lastPlayerSound = { time: Date.now(), type: "jump" };
  }
}

// ============================================
// MOBILE CONTROLS
// ============================================

function setupMobileUiButtons() {
  const runBtn = document.getElementById("runBtn");

  if (runBtn) {
    runBtn.addEventListener("touchstart", (e) => {
      e.preventDefault();
      GameState.running = true;
    });
    runBtn.addEventListener("touchend", (e) => {
      e.preventDefault();
      GameState.running = false;
    });
    runBtn.addEventListener("mousedown", () => (GameState.running = true));
    runBtn.addEventListener("mouseup", () => (GameState.running = false));
    runBtn.addEventListener("mouseleave", () => (GameState.running = false));
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
    GameState.joystick.active = true;
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  });

  joy.addEventListener("touchmove", (e) => {
    e.preventDefault();
    GameState.joystick.dx = e.touches[0].clientX - startX;
    GameState.joystick.dy = e.touches[0].clientY - startY;
  });

  joy.addEventListener("touchend", () => {
    GameState.joystick.active = false;
    GameState.joystick.dx = 0;
    GameState.joystick.dy = 0;
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

// ============================================
// UI UPDATES
// ============================================

function updateHealthUI() {
  const healthValue = document.getElementById("healthValue");
  const healthFill = document.getElementById("healthFill");

  if (healthValue) healthValue.innerText = Math.ceil(GameState.health);
  if (healthFill) healthFill.style.width = GameState.health + "%";

  if (GameState.health < 30) {
    document.getElementById("gameUI").classList.add("low-health");
  } else {
    document.getElementById("gameUI").classList.remove("low-health");
  }

  // ✅ AUTO GAME OVER IF HEALTH REACHES 0
  if (GameState.health <= 0) {
    showGameOver();
  }
}

function updateStaminaUI() {
  const staminaFill = document.getElementById("staminaFill");
  if (staminaFill) staminaFill.style.width = GameState.stamina + "%";
}

function updateBatteryUI() {
  const torchIndicator = document.getElementById("torchIndicator");
  if (torchIndicator) {
    torchIndicator.innerText = GameState.torchOn ? "Torch: ON" : "Torch: OFF";
  }
}

function updateObjectiveUI() {
  const objectiveText = document.getElementById("objectiveText");
  if (objectiveText) objectiveText.innerText = GameState.currentObjective;
}

function updateInventoryUI() {
  const invKey = document.getElementById("inventoryKey");
  const invNotes = document.getElementById("inventoryNotes");

  if (invKey) {
    invKey.style.display = GameState.inventory.key ? "block" : "none";
  }

  if (invNotes) {
    invNotes.innerText = "Notes: " + GameState.inventory.notesCollected;
  }
}

// ============================================
// GAME OVER & VICTORY
// ============================================

function showGameOver() {
  if (GameState.paused) return; // Prevent multiple calls
  
  GameState.paused = true;
  GameState.jumpscareStarted = true;
  document.getElementById("gameUI").style.display = "none";
  document.getElementById("gameOver").style.display = "flex";
  if (document.exitPointerLock) document.exitPointerLock();
  
  playSound("jumpscare");
  console.log("💀 GAME OVER! Granny caught you!");
}

function showVictory() {
  if (GameState.paused) return; // Prevent multiple calls
  
  GameState.paused = true;
  document.getElementById("gameUI").style.display = "none";
  document.getElementById("victory").style.display = "flex";
  if (document.exitPointerLock) document.exitPointerLock();

  playSound("door_open");

  setTimeout(() => {
    playSound("jumpscare");
    alert("You escaped... but it follows you still...");
  }, 2000);
}

function damagePlayer(amount) {
  GameState.health = Math.max(0, GameState.health - amount);
  playSound("damage");
  updateHealthUI();
  
  // ✅ FLASH EFFECT ON DAMAGE
  const gameUI = document.getElementById("gameUI");
  gameUI.style.filter = "brightness(0.7)";
  setTimeout(() => {
    gameUI.style.filter = "brightness(1)";
  }, 200);

  if (GameState.health <= 0) {
    showGameOver();
  }
}

function restartGame() {
  location.reload();
}

function backToMenu() {
  location.reload();
}

// ============================================
// WINDOW & RENDERING
// ============================================

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);

  if (!player || !renderer || !scene || !camera) return;

  const delta = Math.min(clock.getDelta(), 0.05);

  if (!GameState.paused) {
    updatePlayer(delta);
    updateGravity(delta);
    updateGrannyAI(delta);
    updateHorrorEvents(delta);
    handleCollisions();
    updateStaminaUI();
    updateBatteryUI();

    if (shadowFigure && shadowFigure.userData.visible) {
      shadowFigure.visible = true;
    } else if (shadowFigure) {
      shadowFigure.visible = false;
    }
  }

  renderer.render(scene, camera);
}
