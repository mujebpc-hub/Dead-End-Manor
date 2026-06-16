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

    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambient);

    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(50, 80, 50);
    light.castShadow = true;
    scene.add(light);

    createGround();
    createMaze();
    createPlayer();
    createEnemy();

    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup", keyUp);
    window.addEventListener("mousemove", mouseLook);

    document.body.requestPointerLock();
}

function createGround() {
    const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE),
        new THREE.MeshStandardMaterial({ color: 0x2d2d2d })
    );

    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
}

function createPlayer() {
    player = new THREE.Object3D();
    player.position.set(0, 2, 0);
    scene.add(player);

    player.add(camera);
    camera.position.set(0, 3, 0);
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

    const size = 15;

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
                    x * size - 80,
                    5,
                    z * size - 60
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

            enemy.scale.set(3, 3, 3);
            enemy.position.set(50, 0, 50);

            enemy.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            if (gltf.animations.length > 0) {
                enemyMixer = new THREE.AnimationMixer(enemy);

                gltf.animations.forEach((clip) => {
                    enemyMixer.clipAction(clip).play();
                });
            }

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

    for(let col of colliders) {
        let dx = player.position.x - col.x;
        let dz = player.position.z - col.z;
        let dist = Math.sqrt(dx*dx + dz*dz);

        if(dist < col.r + 2) {
            player.position.copy(oldPos);
        }
    }

    if(player.position.distanceTo(lastPlayerPos) < 0.4) {
        idleTimer += delta;
    } else {
        idleTimer = 0;
    }

    lastPlayerPos.copy(player.position);

    player.rotation.y = yaw;
    camera.rotation.x = pitch;
}

function updateEnemy(delta) {
    if(!enemy) return;

    let distance = enemy.position.distanceTo(player.position);

    if(distance < 3) {
        alert("GAME OVER");
        gameOver = true;
        return;
    }

    if(idleTimer >= 6) {
        enemyState = "chase";
    }

    if(enemyState === "patrol") {
        patrolEnemy(delta);
    }

    if(enemyState === "chase") {
        chaseEnemy(delta);
    }
}

function patrolEnemy(delta) {
    let dir = new THREE.Vector3()
        .subVectors(enemyTarget, enemy.position);

    if(dir.length() < 2) {
        pickEnemyTarget();
        return;
    }

    dir.normalize();
    moveEnemy(dir, delta);
}

function chaseEnemy(delta) {
    let dir = new THREE.Vector3()
        .subVectors(player.position, enemy.position);

    dir.normalize();
    moveEnemy(dir, delta);
}

function moveEnemy(dir, delta) {
    let nextX = enemy.position.x + dir.x * ENEMY_SPEED * delta;
    let nextZ = enemy.position.z + dir.z * ENEMY_SPEED * delta;

    let blocked = false;

    for(let col of colliders) {
        let dx = nextX - col.x;
        let dz = nextZ - col.z;
        let dist = Math.sqrt(dx*dx + dz*dz);

        if(dist < col.r + 2) {
            blocked = true;
            break;
        }
    }

    if(!blocked) {
        enemy.position.x = nextX;
        enemy.position.z = nextZ;
    }

    enemy.lookAt(player.position.x, enemy.position.y, player.position.z);
}

function pickEnemyTarget() {
    enemyTarget.set(
        Math.random() * 100 - 50,
        0,
        Math.random() * 100 - 50
    );
}

function animate() {
    requestAnimationFrame(animate);

    if(gameOver) return;

    let delta = clock.getDelta();

    updatePlayer(delta);

    if(enemyMixer) enemyMixer.update(delta);

    updateEnemy(delta);

    renderer.render(scene, camera);
}

function keyDown(e) {
    let key = e.key.toLowerCase();

    if(key === "w") move.w = true;
    if(key === "a") move.a = true;
    if(key === "s") move.s = true;
    if(key === "d") move.d = true;
}

function keyUp(e) {
    let key = e.key.toLowerCase();

    if(key === "w") move.w = false;
    if(key === "a") move.a = false;
    if(key === "s") move.s = false;
    if(key === "d") move.d = false;
}

function mouseLook(e) {
    yaw -= e.movementX * 0.002;
    pitch -= e.movementY * 0.002;

    pitch = Math.max(-1.5, Math.min(1.5, pitch));
}

window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
