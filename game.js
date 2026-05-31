let scene, camera, renderer;
let player;
let move = { w:false, a:false, s:false, d:false };

let yaw = 0;
let pitch = 0;

// ✅ FIX: START GAME FUNCTION (missing before)
function startGame() {
  document.getElementById("home").style.display = "none";
  document.getElementById("loading").style.display = "flex";

  setTimeout(() => {
    document.getElementById("loading").style.display = "none";
    document.getElementById("menu").style.display = "flex";
  }, 1500);
}

// ENTER GAME
function enterGame() {
  document.getElementById("menu").style.display = "none";
  init();
  animate();
}

function init() {
  scene = new THREE.Scene();

  // 🌌 SKY BLUE
  scene.background = new THREE.Color(0x87ceeb);

  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  // LIGHT
  scene.add(new THREE.AmbientLight(0xffffff, 0.6));

  const light = new THREE.DirectionalLight(0xffffff, 1);
  light.position.set(5, 10, 5);
  scene.add(light);

  // 🌱 GREEN LAND
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    new THREE.MeshStandardMaterial({ color: 0x2ecc71 })
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  // 🏠 WHITE HOUSE
  const house = new THREE.Mesh(
    new THREE.BoxGeometry(12, 10, 12),
    new THREE.MeshStandardMaterial({ color: 0xffffff })
  );
  house.position.set(0, 5, -25);
  scene.add(house);

  // PLAYER
  player = new THREE.Object3D();
  player.position.set(0, 2, 5);
  scene.add(player);
  player.add(camera);

  camera.position.set(0, 1.6, 0);

  // CONTROLS
  window.addEventListener("keydown", keyDown);
  window.addEventListener("keyup", keyUp);

  // MOUSE LOOK
  document.addEventListener("click", () => {
    document.body.requestPointerLock();
  });

  document.addEventListener("mousemove", (e) => {
    if (document.pointerLockElement === document.body) {
      yaw -= e.movementX * 0.002;
      pitch -= e.movementY * 0.002;

      pitch = Math.max(-1.5, Math.min(1.5, pitch));
    }
  });
}

function keyDown(e){
  if(e.key === "w") move.w = true;
  if(e.key === "a") move.a = true;
  if(e.key === "s") move.s = true;
  if(e.key === "d") move.d = true;
}

function keyUp(e){
  if(e.key === "w") move.w = false;
  if(e.key === "a") move.a = false;
  if(e.key === "s") move.s = false;
  if(e.key === "d") move.d = false;
}

function animate(){
  requestAnimationFrame(animate);

  let speed = 0.2;

  let forwardX = Math.sin(yaw);
  let forwardZ = Math.cos(yaw);

  let rightX = Math.sin(yaw + Math.PI / 2);
  let rightZ = Math.cos(yaw + Math.PI / 2);

  if(move.w){
    player.position.x -= forwardX * speed;
    player.position.z -= forwardZ * speed;
  }
  if(move.s){
    player.position.x += forwardX * speed;
    player.position.z += forwardZ * speed;
  }
  if(move.a){
    player.position.x -= rightX * speed;
    player.position.z -= rightZ * speed;
  }
  if(move.d){
    player.position.x += rightX * speed;
    player.position.z += rightZ * speed;
  }

  player.rotation.y = yaw;
  camera.rotation.x = pitch;

  renderer.render(scene, camera);
}
