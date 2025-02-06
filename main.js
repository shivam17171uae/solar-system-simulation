import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import 'https://cdn.jsdelivr.net/npm/@tweenjs/tween.js@^21/dist/tween.umd.js';

let TWEEN;
if (window.TWEEN) {
    TWEEN = window.TWEEN
}

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
const initialCameraPosition = new THREE.Vector3(0, 50, 150);
camera.position.copy(initialCameraPosition);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(window.innerWidth, window.innerHeight);
labelRenderer.domElement.style.position = 'absolute';
labelRenderer.domElement.style.top = '0px';
labelRenderer.domElement.style.pointerEvents = 'none';
document.body.appendChild(labelRenderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.1;
controls.minDistance = 5;
controls.maxDistance = 5000;
controls.rotateSpeed = 0.5;
controls.enabled = true;

const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const sunLight = new THREE.PointLight(0xffffff, 1, 0);
scene.add(sunLight);

scene.background = new THREE.Color(0x000000);

const infoPanel = document.getElementById('infoPanel');
const tooltip = document.querySelector('.tooltip');
const resetButton = document.getElementById('resetButton');

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let INTERSECTED = null;

function createPlanet(radius, color, x, y, z, orbitRadius, orbitSpeed, rotationSpeed, name, timeScale) {
    const geometry = new THREE.SphereGeometry(radius, 32, 32);
    const material = new THREE.MeshLambertMaterial({ color: color });
    const planet = new THREE.Mesh(geometry, material);
    planet.position.set(x, y, z);
    planet.name = name;

    const orbitGeometry = new THREE.RingGeometry(orbitRadius - 0.1, orbitRadius + 0.1, 128);
    const orbitMaterial = new THREE.LineBasicMaterial({ color: 0x888888, transparent: true, opacity: 0.3 });
    const orbit = new THREE.Line(orbitGeometry, orbitMaterial);
    orbit.rotation.x = Math.PI / 2;
    scene.add(orbit);

    const planetDiv = document.createElement('div');
    planetDiv.className = 'label';
    planetDiv.textContent = name;
    planetDiv.style.marginTop = '-1em';
    const planetLabel = new CSS2DObject(planetDiv);
    planetLabel.position.set(0, radius + 1, 0);
    planet.add(planetLabel);
    planetLabel.layers.set(0);

    return { mesh: planet, orbitRadius, orbitSpeed, rotationSpeed, orbit, timeScale };
}

const sun = createPlanet(5, 0xffff00, 0, 0, 0, 0, 0, 0.01, "Sun", 1.0);
scene.add(sun.mesh);

const planetData = [
    { radius: 0.8, color: 0xaaaaaa, distance: 15, orbitSpeed: 0.02, rotationSpeed: 0.005, name: "Mercury", timeScale: 1.0 },
    { radius: 1.2, color: 0xffa500, distance: 25, orbitSpeed: 0.015, rotationSpeed: 0.002, name: "Venus", timeScale: 1.0 },
    { radius: 1.3, color: 0x0000ff, distance: 35, orbitSpeed: 0.01, rotationSpeed: 0.02, name: "Earth", timeScale: 1.0 },
    { radius: 0.9, color: 0xff0000, distance: 45, orbitSpeed: 0.008, rotationSpeed: 0.018, name: "Mars", timeScale: 1.0 },
    { radius: 3, color: 0xff8c00, distance: 70, orbitSpeed: 0.004, rotationSpeed: 0.04, name: "Jupiter", timeScale: 1.0 },
    { radius: 2.5, color: 0xc2b280, distance: 100, orbitSpeed: 0.002, rotationSpeed: 0.035, name: "Saturn", timeScale: 1.0 },
    { radius: 1.8, color: 0xadd8e6, distance: 120, orbitSpeed: 0.0015, rotationSpeed: 0.025, name: "Uranus", timeScale: 1.0 },
    { radius: 1.7, color: 0x00008b, distance: 140, orbitSpeed: 0.001, rotationSpeed: 0.022, name: "Neptune", timeScale: 1.0 },
];

const planets = planetData.map(data => {
    const planet = createPlanet(data.radius, data.color, data.distance, 0, 0, data.distance, data.orbitSpeed, data.rotationSpeed, data.name, data.timeScale);
    scene.add(planet.mesh);
    return planet;
});

const gui = new GUI();
const params = {
    timeScale: 1,
    showOrbits: true,
    pause: false,
};
gui.add(params, 'timeScale', 0.1, 50).name('Global Time Scale'); // Max value of 50
gui.add(params, 'showOrbits').name('Show Orbits').onChange(value => {
    planets.forEach(planet => {
        planet.orbit.visible = value;
    });
});
gui.add(params, 'pause').name('Pause Simulation');

const planetFolder = gui.addFolder('Planet Time Scales');
planets.forEach(planet => {
    planetFolder.add(planet, 'timeScale', 0.1, 5).name(planet.mesh.name);
});
planetFolder.open();

function positionResetButton() {
    const guiWidth = gui.domElement.offsetWidth;
    resetButton.style.right = `${guiWidth + 10}px`;
}
positionResetButton();
window.addEventListener('resize', positionResetButton);
gui.onChange(positionResetButton);

function onMouseMove(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    tooltip.style.left = `${event.clientX + 10}px`;
    tooltip.style.top = `${event.clientY - 25}px`;
}

function onMouseClick(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(planets.map(p => p.mesh), true);
    if (intersects.length > 0) {
        const selectedPlanet = intersects[0].object;
        focusOnPlanet(selectedPlanet);
        infoPanel.style.display = 'block';
        infoPanel.innerHTML = `<h2>${selectedPlanet.name}</h2><p>Radius: ${selectedPlanet.geometry.parameters.radius.toFixed(2)}</p>`;
    } else {
        infoPanel.style.display = 'none';
    }
}

function focusOnPlanet(planet) {
    controls.enabled = false;
    const targetPosition = planet.position;
    const offset = new THREE.Vector3(planet.geometry.parameters.radius * 2.5, planet.geometry.parameters.radius * 1.5, planet.geometry.parameters.radius * 2.5);
    const cameraTargetPosition = new THREE.Vector3().addVectors(targetPosition, offset);

    new TWEEN.Tween(camera.position)
        .to({ x: cameraTargetPosition.x, y: cameraTargetPosition.y, z: cameraTargetPosition.z }, 1000)
        .easing(TWEEN.Easing.Quadratic.InOut)
        .onUpdate(() => { camera.lookAt(targetPosition); })
        .onComplete(() => { controls.target.copy(targetPosition); controls.update(); controls.enabled = true; })
        .start();

    controls.target.copy(targetPosition);
    controls.update();
}

function resetCamera() {
    new TWEEN.Tween(camera.position)
        .to({ x: initialCameraPosition.x, y: initialCameraPosition.y, z: initialCameraPosition.z }, 1000)
        .easing(TWEEN.Easing.Quadratic.InOut)
        .onUpdate(() => { camera.lookAt(scene.position); })
        .onComplete(() => { controls.target.copy(scene.position); controls.update(); controls.enabled = true; })
        .start();
    infoPanel.style.display = 'none';
}

window.addEventListener('mousemove', onMouseMove, false);
window.addEventListener('click', onMouseClick, false);
resetButton.addEventListener('click', resetCamera, false);

function animate() {
    requestAnimationFrame(animate);
    TWEEN.update();

    if (!params.pause) {
        const time = performance.now() * 0.001;
        planets.forEach(planet => {
            const angle = time * planet.orbitSpeed * params.timeScale * planet.timeScale;
            planet.mesh.position.x = Math.cos(angle) * planet.orbitRadius;
            planet.mesh.position.z = Math.sin(angle) * planet.orbitRadius;
            planet.mesh.rotation.y += planet.rotationSpeed;
        });
        sun.mesh.rotation.y += sun.rotationSpeed;
    }

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(planets.map(p => p.mesh), true);
    if (intersects.length > 0) {
        if (INTERSECTED != intersects[0].object) {
            INTERSECTED = intersects[0].object;
            tooltip.textContent = INTERSECTED.name;
            tooltip.style.display = 'block';
        }
    } else {
        tooltip.style.display = 'none';
        INTERSECTED = null;
    }

    controls.update();
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    labelRenderer.setSize(window.innerWidth, window.innerHeight);
}, false);

animate();