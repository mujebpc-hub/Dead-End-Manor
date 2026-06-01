let scene, camera, renderer;
let player;

let move = { w:false, a:false, s:false, d:false };

let yaw = 0;
let pitch = 0;

/* 📱 MOBILE CONTROL */
let joystick = { active:false, dx:0, dy:0 };

/* =========================
   UI FLOW
========================= */

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
  init();
  animate();
}

/* =========================
   TERRAIN (OPEN WORLD)
========================= */

function createTerrain() {

  const ground = new THREE.Mesh(
    new THREE.BoxGeometry(300, 2, 300),
    new THREE.MeshStandardMaterial({ color: 0x1f8f3a })
  );
  ground.position.set(0, -1, -100);
  scene.add(ground);

  // ⛰️ HILLS
  const hills = [
    [-50,5,-120,30,12],
    [60,8,-160,40,18],
    [20,4,-60,25,10]
  ];

  hills.forEach(h=>{
    const hill = new THREE.Mesh(
      new THREE.BoxGeometry(h[3], h[4], h[3]),
      new THREE.MeshStandardMaterial({ color: 0x2ecc71 })
    );
    hill.position.set(h[0],h[1],h[2]);
    scene.add(hill);
  });

  // 🌳 TREES
  for(let i=0;i<25;i++){
    const tree = new THREE.Mesh(
      new THREE.BoxGeometry(2,8,2),
      new THREE.MeshStandardMaterial({ color: 0x145a32 })
    );

    tree.position.set(
      (Math.random()*200)-100,
      4,
      (Math.random()*-200)
    );

    scene.add(tree);
  }

  // 🏚️ HOUSE
  const house = new THREE.Mesh(
    new THREE.BoxGeometry(20,12,20),
    new THREE.MeshStandardMaterial({ color: 0xdddddd })
  );
  house.position.set(0,6,-130);
  scene.add(house);

  const door = new THREE.Mesh(
    new THREE.BoxGeometry(4,6,1),
    new THREE.MeshStandardMaterial({ color: 0x333333 })
  );
  door.position.set(0,3,-120);
  scene.add(door);
}

/* =========================
   INIT
========================= */

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb);

  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth/window.innerHeight,
    0.1,
    1000
  );

  renderer = new THREE.WebGLRenderer({ antialias:true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  /* LIGHTS */
  scene.add(new THREE.AmbientLight(0xffffff,0.6));

  const light = new THREE.DirectionalLight(0xffffff,1);
  light.position.set(5,10,5);
  scene.add(light);

  /* TERRAIN */
  createTerrain();

  /* PLAYER */
  player = new THREE.Object3D();
  player.position.set(0,5,20);
  scene.add(player);
  player.add(camera);

  camera.position.set(0,1.6,0);

  /* PC CONTROLS */
  window.addEventListener("keydown", e=>{
    if(e.key==="w") move.w=true;
    if(e.key==="a") move.a=true;
    if(e.key==="s") move.s=true;
    if(e.key==="d") move.d=true;
  });

  window.addEventListener("keyup", e=>{
    if(e.key==="w") move.w=false;
    if(e.key==="a") move.a=false;
    if(e.key==="s") move.s=false;
    if(e.key==="d") move.d=false;
  });

  /* MOUSE LOOK (PC) */
  document.addEventListener("click", ()=>{
    document.body.requestPointerLock();
  });

  document.addEventListener("mousemove", e=>{
    if(document.pointerLockElement===document.body){
      yaw -= e.movementX*0.002;
      pitch -= e.movementY*0.002;
      pitch = Math.max(-1.5,Math.min(1.5,pitch));
    }
  });

  /* 📱 MOBILE CONTROLS */
  createMobileControls();
}

/* =========================
   📱 MOBILE CONTROLS
========================= */

function createMobileControls(){

  // JOYSTICK
  const joy = document.createElement("div");
  joy.style.cssText = `
    position:absolute; bottom:60px; left:60px;
    width:120px; height:120px;
    background:rgba(255,255,255,0.2);
    border-radius:50%;
  `;
  document.body.appendChild(joy);

  joy.addEventListener("touchstart", e=>{
    joystick.active=true;
  });

  joy.addEventListener("touchmove", e=>{
    joystick.dx = (e.touches[0].clientX - window.innerWidth/2)/50;
    joystick.dy = (e.touches[0].clientY - window.innerHeight/2)/50;
  });

  joy.addEventListener("touchend", ()=>{
    joystick.active=false;
    joystick.dx=0;
    joystick.dy=0;
  });

  // JUMP BUTTON
  const jump = document.createElement("button");
  jump.innerText="JUMP";
  jump.style.cssText=`
    position:absolute; bottom:80px; right:60px;
    padding:20px; border-radius:50%;
  `;
  document.body.appendChild(jump);

  jump.addEventListener("touchstart", ()=>{
    player.position.y += 2;
    setTimeout(()=> player.position.y=5,300);
  });

  // TOUCH LOOK
  document.addEventListener("touchmove", e=>{
    if(e.touches[0].clientX > window.innerWidth/2){
      yaw -= e.touches[0].movementX * 0.003;
    }
  });
}

/* =========================
   GAME LOOP
========================= */

function animate(){
  requestAnimationFrame(animate);

  let speed=0.3;

  let fx=Math.sin(yaw);
  let fz=Math.cos(yaw);
  let rx=Math.sin(yaw+Math.PI/2);
  let rz=Math.cos(yaw+Math.PI/2);

  // PC MOVEMENT
  if(move.w){
    player.position.x -= fx*speed;
    player.position.z -= fz*speed;
  }
  if(move.s){
    player.position.x += fx*speed;
    player.position.z += fz*speed;
  }
  if(move.a){
    player.position.x -= rx*speed;
    player.position.z -= rz*speed;
  }
  if(move.d){
    player.position.x += rx*speed;
    player.position.z += rz*speed;
  }

  // MOBILE MOVEMENT
  if(joystick.active){
    player.position.x += joystick.dx*0.1;
    player.position.z += joystick.dy*0.1;
  }

  player.rotation.y=yaw;
  camera.rotation.x=pitch;

  renderer.render(scene,camera);
}
