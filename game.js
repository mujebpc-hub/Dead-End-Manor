let scene, camera, renderer;
let player;
let move = { w:false, a:false, s:false, d:false };

function startGame() {
  document.getElementById("home").style.display = "none";
  document.getElementById("loading").style.display = "flex";

  setTimeout(() => {
    document.getElementById("loading").style.display = "none";
    document.getElementById("menu").style.display = "flex";
  }, 2000);
}

function enterGame() {
  document.getElementById("menu").style.display = "none";
  init();
  animate();
}

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x111111);

  camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
  camera.position.set(0, 2, 5);

  renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  // LIGHT
  const light = new THREE.DirectionalLight(0xffffff, 1);
  light.position.set(5,10,5);
  scene.add(light);

  // GROUND
  const groundGeo = new THREE.PlaneGeometry(50,50);
  const groundMat = new THREE.MeshStandardMaterial({ color:0x222222 });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI/2;
  scene.add(ground);

  // MANSION (simple box)
  const houseGeo = new THREE.BoxGeometry(5,5,5);
  const houseMat = new THREE.MeshStandardMaterial({ color:0x555555 });
  const house = new THREE.Mesh(houseGeo, houseMat);
  house.position.set(0,2.5,-10);
  scene.add(house);

  // PLAYER (invisible controller)
  player = new THREE.Object3D();
  scene.add(player);
  player.add(camera);

  window.addEventListener("keydown", keyDown);
  window.addEventListener("keyup", keyUp);
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

  let speed = 0.1;

  if(move.w) player.position.z -= speed;
  if(move.s) player.position.z += speed;
  if(move.a) player.position.x -= speed;
  if(move.d) player.position.x += speed;

  renderer.render(scene, camera);
}
