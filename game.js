let scene, camera, renderer, clock;
let player, enemy, enemyMixer;

const WORLD_SIZE = 220;
const PLAYER_SPEED = 8;
const ENEMY_SPEED = 4;

let move = { w:false, a:false, s:false, d:false };
let colliders = [];

let yaw = 0;
let pitch = 0;

let idleTimer = 0;
let lastPlayerPos = new THREE.Vector3();

let enemyState = "patrol";
let enemyTarget = new THREE.Vector3();

let gameOver = false;

function init() {
    clock = new THREE.Clock();

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);
    scene.fog = new THREE.Fog(0xbfdfff, 80, 300);

    camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );

    renderer = new THREE.WebGLRenderer({ antialias:true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;

    document.body.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight(0xffffff, 1.5);
    scene.add(ambient);

    const light = new THREE.DirectionalLight(0xfff2cc, 2);
    light.position.set(100, 200, 100);
    light.castShadow = true;
    scene.add(light);

    createGround();
    createMaze();
    createPlayer();
    createEnemy();

    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup", keyUp);
    window.addEventListener("mousemove", mouseLook);
}

function createGround() {
    const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE),
        new THREE.MeshStandardMaterial({
            color: 0x6dbf4b
        })
    );

    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
}

function createPlayer() {
    player = new THREE.Object3D();

    player.position.set(-25, 2, -25);

    scene.add(player);

    player.add(camera);

    camera.position.set(0, 4, 0);

    player.rotation.y = Math.PI;

    camera.lookAt(0, 4, -20);

    lastPlayerPos.copy(player.position);
}

function createMaze() {
    const maze = [
        "############",
        "#     #    #",
        "# ### # ## #",
        "# #   #    #",
        "# # ###### #",
        "# #        #",
        "# #######  #",
        "#          #",
        "############"
    ];

    const size = 10;

    maze.forEach((row, z) => {
        row.split("").forEach((cell, x) => {
            if (cell === "#") {
                const wall = new THREE.Mesh(
                    new THREE.BoxGeometry(size, 10, size),
                    new THREE.MeshStandardMaterial({
                        color: 0x555555
                    })
                );

                wall.position.set(
                    x * size - 40,
                    5,
                    z * size - 40
                );

                wall.castShadow = true;
                wall.receiveShadow = true;

                scene.add(wall);

                colliders.push({
                    x: wall.position.x,
                    z: wall.position.z,
                    r: size / 2
                });
            }
        });
    });
}

function createEnemy() {
    const loader = new THREE.GLTFLoader();

    loader.load(
        "models/granny enemy 1.glb",

        function(gltf) {
            enemy = gltf.scene;

            enemy.scale.set(2,2,2);
            enemy.position.set(20,0,20);

            scene.add(enemy);

            pickEnemyTarget();
        },

        undefined,

        function(error){
            console.log("Enemy model failed:", error);

            enemy = new THREE.Mesh(
                new THREE.BoxGeometry(3,6,3),
                new THREE.MeshBasicMaterial({ color:0xff0000 })
            );

            enemy.position.set(20,3,20);

            scene.add(enemy);

            pickEnemyTarget();
        }
    );
}

function updatePlayer(delta) {
    let dir = new THREE.Vector3();

    if(move.w) dir.z -= 1;
    if(move.s) dir.z += 1;
    if(move.a) dir.x -= 1;
    if(move.d) dir.x += 1;

    dir.normalize();

    dir.applyAxisAngle(
        new THREE.Vector3(0,1,0),
        yaw
    );

    let oldPos = player.position.clone();

    player.position.addScaledVector(dir, PLAYER_SPEED * delta);

    for(let col of colliders){
        let dx = player.position.x - col.x;
        let dz = player.position.z - col.z;

        let dist = Math.sqrt(dx*dx + dz*dz);

        if(dist < col.r + 2){
            player.position.copy(oldPos);
        }
    }

    if(player.position.distanceTo(lastPlayerPos) < 0.4){
        idleTimer += delta;
    } else {
        idleTimer = 0;
    }

    lastPlayerPos.copy(player.position);

    player.rotation.y = yaw;
    camera.rotation.x = pitch;
}

function updateEnemy(delta){
    if(!enemy) return;

    let distance = enemy.position.distanceTo(player.position);

    if(distance < 3){
        alert("GAME OVER");
        gameOver = true;
        return;
    }

    if(idleTimer >= 6){
        enemyState = "chase";
    }

    if(enemyState === "patrol"){
        patrolEnemy(delta);
    }

    if(enemyState === "chase"){
        chaseEnemy(delta);
    }
}

function patrolEnemy(delta){
    let dir = new THREE.Vector3()
        .subVectors(enemyTarget, enemy.position);

    if(dir.length() < 2){
        pickEnemyTarget();
        return;
    }

    dir.normalize();
    moveEnemy(dir, delta);
}

function chaseEnemy(delta){
    let dir = new THREE.Vector3()
        .subVectors(player.position, enemy.position);

    dir.normalize();
    moveEnemy(dir, delta);
}

function moveEnemy(dir, delta){
    enemy.position.x += dir.x * ENEMY_SPEED * delta;
    enemy.position.z += dir.z * ENEMY_SPEED * delta;
}

function pickEnemyTarget(){
    enemyTarget.set(
        Math.random()*40 - 20,
        0,
        Math.random()*40 - 20
    );
}

function animate(){
    requestAnimationFrame(animate);

    if(gameOver) return;

    let delta = clock.getDelta();

    updatePlayer(delta);
    updateEnemy(delta);

    if(enemyMixer) enemyMixer.update(delta);

    renderer.render(scene, camera);
}

function keyDown(e){
    let key = e.key.toLowerCase();
    if(key==="w") move.w=true;
    if(key==="a") move.a=true;
    if(key==="s") move.s=true;
    if(key==="d") move.d=true;
}

function keyUp(e){
    let key = e.key.toLowerCase();
    if(key==="w") move.w=false;
    if(key==="a") move.a=false;
    if(key==="s") move.s=false;
    if(key==="d") move.d=false;
}

function mouseLook(e){
    yaw -= e.movementX * 0.002;
    pitch -= e.movementY * 0.002;

    pitch = Math.max(-Math.PI/2, Math.min(Math.PI/2, pitch));
}

window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
