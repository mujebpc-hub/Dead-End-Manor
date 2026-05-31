import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);

const camera = new THREE.PerspectiveCamera(
75,
window.innerWidth / window.innerHeight,
0.1,
1000
);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Floor
const floor = new THREE.Mesh(
new THREE.PlaneGeometry(20,20),
new THREE.MeshBasicMaterial({color:0x333333})
);

floor.rotation.x = -Math.PI/2;
scene.add(floor);

// Camera Position
camera.position.set(0,2,5);

function animate(){
requestAnimationFrame(animate);
renderer.render(scene,camera);
}

animate();
