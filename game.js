let scene, camera, renderer;
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
let velocity = new THREE.Vector3();
let direction = new THREE.Vector3();
let prevTime = performance.now();

// गेम के पात्र (Objects)
let playerBox;
let monster; // यह "The Watcher" या Granny है
const monsterSpeed = 0.03;

document.getElementById('start-btn').addEventListener('click', () => {
    document.getElementById('ui-container').style.display = 'none';
    init();
    animate();
});

function init() {
    // 1. सीन (Scene) बनाना - हॉरर इफ़ेक्ट के लिए फॉग (धुंध) जोड़ा गया है
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050505);
    scene.fog = new THREE.FogExp2(0x050505, 0.15);

    // 2. कैमरा (Camera) - फर्स्ट पर्सन व्यू के लिए
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.y = 1.6; // इंसान की हाइट के बराबर

    // 3. लाइट्स (Lights) - डरावने माहौल के लिए एक कमजोर फ्लैशलाइट
    const flashlight = new THREE.SpotLight(0xffffff, 2, 15, Math.PI / 4, 0.5, 1);
    flashlight.position.set(0, 0, 0);
    camera.add(flashlight);
    flashlight.target = new THREE.Object3D();
    camera.add(flashlight.target);
    flashlight.target.position.set(0, 0, -1);
    scene.add(camera);

    // 4. फर्श (Floor)
    const floorGeo = new THREE.PlaneGeometry(50, 50);
    const floorMat = new THREE.MeshBasicMaterial({ color: 0x222222 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    // 5. दीवारें (Walls) - एक साधारण कमरा
    const wallMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    const wallGeo = new THREE.BoxGeometry(50, 4, 1);
    
    let backWall = new THREE.Mesh(wallGeo, wallMat);
    backWall.position.set(0, 2, -25);
    scene.add(backWall);

    // 6. मॉन्स्टर/Granny (लाल रंग का बॉक्स - इसे बाद में 3D मॉडल से बदल सकते हैं)
    const monsterGeo = new THREE.BoxGeometry(1, 2, 1);
    const monsterMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    monster = new THREE.Mesh(monsterGeo, monsterMat);
    monster.position.set(0, 1, -15); // खिलाड़ी से दूर खड़ा है
    scene.add(monster);

    // 7. रेंडरर (Renderer)
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('game-container').appendChild(renderer.domElement);

    // कीबोर्ड कंट्रोल्स सेटअप
    setupControls();
    
    // माउस से मुड़ने के लिए सिंपल सेटअप
    window.addEventListener('mousemove', (e) => {
        camera.rotation.y -= e.movementX * 0.002;
    });
    
    // स्क्रीन रीसाइज हैंडलर
    window.addEventListener('resize', onWindowResize);
}

function setupControls() {
    const onKeyDown = (event) => {
        switch (event.code) {
            case 'KeyW': moveForward = true; break;
            case 'KeyA': moveLeft = true; break;
            case 'KeyS': moveBackward = true; break;
            case 'KeyD': moveRight = true; break;
        }
    };

    const onKeyUp = (event) => {
        switch (event.code) {
            case 'KeyW': moveForward = false; break;
            case 'KeyA': moveLeft = false; break;
            case 'KeyS': moveBackward = false; break;
            case 'KeyD': moveRight = false; break;
        }
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
}

function animate() {
    requestAnimationFrame(animate);

    const time = performance.now();
    const delta = (time - prevTime) / 1000;

    // खिलाड़ी की मूवमेंट मूवमेंट लॉजिक
    velocity.x -= velocity.x * 10.0 * delta;
    velocity.z -= velocity.z * 10.0 * delta;

    direction.z = Number(moveForward) - Number(moveBackward);
    direction.x = Number(moveRight) - Number(moveLeft);
    direction.normalize();

    if (moveForward || moveBackward) velocity.z -= direction.z * 40.0 * delta;
    if (moveLeft || moveRight) velocity.x -= direction.x * 40.0 * delta;

    camera.translateX(-velocity.x * delta);
    camera.translateZ(-velocity.z * delta);
    camera.position.y = 1.6; // हाइट फिक्स रखने के लिए

    // मॉन्स्टर/Granny का खिलाड़ी का पीछा करना
    if (monster) {
        let dirToPlayer = new THREE.Vector3().copy(camera.position).sub(monster.position);
        dirToPlayer.y = 0; // मॉन्स्टर को हवा में उड़ने से रोकने के लिए
        dirToPlayer.normalize();
        monster.position.addScaledVector(dirToPlayer, monsterSpeed);

        // गेम ओवर की स्थिति (अगर मॉन्स्टर पास आ जाये)
        if (monster.position.distanceTo(camera.position) < 1.5) {
            alert("The Watcher ने आपको पकड़ लिया! गेम ओवर।");
            location.reload();
        }
    }

    prevTime = time;
    renderer.render(scene, camera);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}
