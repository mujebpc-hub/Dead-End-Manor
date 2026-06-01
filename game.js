let scene, camera, renderer;
let player;

let move = { w:false, a:false, s:false, d:false };

let yaw = 0;
let pitch = 0;

let joystick = {
  active:false,
  dx:0,
  dy:0
};

let velocityY = 0;
let isJumping = false;

/* =========================
   UI FLOW
========================= */

function startGame() {

  document.getElementById("home").style.display = "none";
  document.getElementById("loading").style.display = "flex";

  setTimeout(() => {

    document.getElementById("loading").style.display = "none";
    document.getElementById("menu").style.display = "flex";

  },1500);
}

function enterGame(){

  document.getElementById("menu").style.display = "none";

  init();
  animate();
}

/* =========================
   TREE
========================= */

function createTree(x,z){

  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5,0.5,5),
    new THREE.MeshStandardMaterial({
      color:0x6b4423
    })
  );

  trunk.position.set(x,2.5,z);
  scene.add(trunk);

  const leaves = new THREE.Mesh(
    new THREE.ConeGeometry(3,6,8),
    new THREE.MeshStandardMaterial({
  map: grass
})
  );

  leaves.position.set(x,7,z);
  scene.add(leaves);
}

/* =========================
   TERRAIN
========================= */

function createTerrain(){

  const ground = new THREE.Mesh(

    new THREE.PlaneGeometry(
      500,
      500,
      100,
      100
    ),

    new THREE.MeshStandardMaterial({
      color:0x2f8f2f
    })

  );

  ground.rotation.x = -Math.PI/2;
  scene.add(ground);

  // ROAD

  const road = new THREE.Mesh(

    new THREE.BoxGeometry(
      12,
      0.2,
      250
    ),

    new THREE.MeshStandardMaterial({
      color:0x555555
    })

  );

  road.position.set(
    0,
    0.1,
    -120
  );

  scene.add(road);

  // HILLS

  const hills = [

    [-50,6,-120,30,12],
    [60,8,-180,40,18],
    [20,4,-60,25,10],
    [-90,5,-200,35,15]

  ];

  hills.forEach(h=>{

    const hill = new THREE.Mesh(

      new THREE.BoxGeometry(
        h[3],
        h[4],
        h[3]
      ),

      new THREE.MeshStandardMaterial({
        color:0x3cbf4a
      })

    );

    hill.position.set(
      h[0],
      h[1],
      h[2]
    );

    scene.add(hill);
  });

  // FOREST

  for(let i=0;i<120;i++){

    createTree(

      (Math.random()*450)-225,

      (Math.random()*-450)

    );
  }

  // MAIN MANSION

  const mansion = new THREE.Mesh(

    new THREE.BoxGeometry(
      35,
      18,
      35
    ),

    new THREE.MeshStandardMaterial({
      color:0xe5e5e5
    })

  );

  mansion.position.set(
    0,
    9,
    -250
  );

  scene.add(mansion);

  // DOOR

  const door = new THREE.Mesh(

    new THREE.BoxGeometry(
      5,
      8,
      1
    ),

    new THREE.MeshStandardMaterial({
      color:0x333333
    })

  );

  door.position.set(
    0,
    4,
    -232
  );

  scene.add(door);
}
/* =========================
   INIT
========================= */

function init(){

  scene = new THREE.Scene();

 scene.background = new THREE.Color(0x050510);

scene.fog = new THREE.Fog(
  0xbfdfff,
  80,
  450
);

  scene.fog = new THREE.Fog(
    0xbfdfff,
    100,
    500
  );

  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );

  renderer = new THREE.WebGLRenderer({
    antialias:true
  });

renderer.setPixelRatio(window.devicePixelRatio);

renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

renderer.toneMapping =
THREE.ACESFilmicToneMapping;

renderer.toneMappingExposure = 1.2;
  
  renderer.setSize(
    window.innerWidth,
    window.innerHeight
  );

  document.body.appendChild(
    renderer.domElement
  );

  // LIGHTS

  scene.add(
    new THREE.AmbientLight(
      0xffffff,
      0.7
    )
  );

 const moon = new THREE.DirectionalLight(
  0xaaccff,
  0.7
);

moon.castShadow = true;

moon.shadow.mapSize.width = 2048;
moon.shadow.mapSize.height = 2048;

moon.position.set(
  50,
  80,
  -50
);

scene.add(moon);

  // MAP

  createTerrain();

  // PLAYER

  player = new THREE.Object3D();

  player.position.set(
    0,
    5,
    20
  );

  scene.add(player);

  player.add(camera);

  camera.position.set(
    0,
    1.6,
    0
  );

  // KEYBOARD

  window.addEventListener(
    "keydown",
    keyDown
  );

  window.addEventListener(
    "keyup",
    keyUp
  );

  // MOUSE LOOK

  document.addEventListener(
    "click",
    ()=>{
      document.body.requestPointerLock();
    }
  );

  document.addEventListener(
    "mousemove",
    e=>{

      if(
        document.pointerLockElement
        === document.body
      ){

        yaw -= e.movementX * 0.002;

        pitch -= e.movementY * 0.002;

        pitch = Math.max(
          -1.5,
          Math.min(
            1.5,
            pitch
          )
        );
      }
    }
  );

  // MOBILE

  createMobileControls();

  window.addEventListener(
    "resize",
    ()=>{

      camera.aspect =
      window.innerWidth /
      window.innerHeight;

      camera.updateProjectionMatrix();

      renderer.setSize(
        window.innerWidth,
        window.innerHeight
      );
    }
  );
}

/* =========================
   MOBILE CONTROLS
========================= */

function createMobileControls(){

  const joy = document.createElement("div");

  joy.style.cssText = `
    position:absolute;
    left:40px;
    bottom:40px;
    width:120px;
    height:120px;
    border-radius:50%;
    background:rgba(255,255,255,0.25);
    z-index:999;
  `;

  document.body.appendChild(joy);

  let startX = 0;
  let startY = 0;

  joy.addEventListener(
    "touchstart",
    e=>{

      joystick.active = true;

      startX =
      e.touches[0].clientX;

      startY =
      e.touches[0].clientY;
    }
  );

  joy.addEventListener(
    "touchmove",
    e=>{

      joystick.dx =
      e.touches[0].clientX
      - startX;

      joystick.dy =
      e.touches[0].clientY
      - startY;
    }
  );

  joy.addEventListener(
    "touchend",
    ()=>{

      joystick.active = false;

      joystick.dx = 0;
      joystick.dy = 0;
    }
  );

  // JUMP BUTTON

  const jumpBtn =
  document.createElement(
    "button"
  );

  jumpBtn.innerHTML = "JUMP";

  jumpBtn.style.cssText = `
    position:absolute;
    right:40px;
    bottom:60px;
    width:90px;
    height:90px;
    border-radius:50%;
    font-size:18px;
    z-index:999;
  `;

  document.body.appendChild(
    jumpBtn
  );

  jumpBtn.addEventListener(
    "touchstart",
    ()=>{

      if(!isJumping){

        velocityY = 0.25;
        isJumping = true;
      }
    }
  );
}

/* =========================
   KEYS
========================= */

function keyDown(e){

  if(e.key==="w") move.w=true;
  if(e.key==="a") move.a=true;
  if(e.key==="s") move.s=true;
  if(e.key==="d") move.d=true;

  if(e.code==="Space"){

    if(!isJumping){

      velocityY = 0.25;
      isJumping = true;
    }
  }
}

function keyUp(e){

  if(e.key==="w") move.w=false;
  if(e.key==="a") move.a=false;
  if(e.key==="s") move.s=false;
  if(e.key==="d") move.d=false;
}

/* =========================
   GAME LOOP
========================= */

function animate(){

  requestAnimationFrame(
    animate
  );

  const speed = 0.35;

  let fx = Math.sin(yaw);
  let fz = Math.cos(yaw);

  let rx =
  Math.sin(
    yaw + Math.PI/2
  );

  let rz =
  Math.cos(
    yaw + Math.PI/2
  );

  // PC MOVE

  if(move.w){

    player.position.x
    -= fx * speed;

    player.position.z
    -= fz * speed;
  }

  if(move.s){

    player.position.x
    += fx * speed;

    player.position.z
    += fz * speed;
  }

  if(move.a){

    player.position.x
    -= rx * speed;

    player.position.z
    -= rz * speed;
  }

  if(move.d){

    player.position.x
    += rx * speed;

    player.position.z
    += rz * speed;
  }

  // MOBILE MOVE

  if(joystick.active){

    player.position.x
    += joystick.dx * 0.01;

    player.position.z
    += joystick.dy * 0.01;
  }

  // JUMP + GRAVITY

  player.position.y += velocityY;

  velocityY -= 0.015;

  if(player.position.y <= 5){

    player.position.y = 5;

    velocityY = 0;

    isJumping = false;
  }

  player.rotation.y = yaw;

  camera.rotation.x = pitch;

  renderer.render(
    scene,
    camera
  );
}
// 🌊 RIVER

const river = new THREE.Mesh(
  new THREE.BoxGeometry(40, 0.1, 180),
  new THREE.MeshStandardMaterial({
    color: 0x3399ff
  })
);

river.position.set(
  80,
  0.05,
  -120
);

scene.add(river);

// 🪨 ROCKS

for(let i=0;i<40;i++){

  const rock = new THREE.Mesh(
    new THREE.DodecahedronGeometry(
      Math.random()*3 + 1
    ),
    new THREE.MeshStandardMaterial({
      color:0x777777
    })
  );

  rock.position.set(
    (Math.random()*350)-175,
    1,
    (Math.random()*-350)
  );

  scene.add(rock);
}
