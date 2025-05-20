// script.js - Manages the Three.js solar system simulation.
// This includes scene setup, celestial body creation, UI interactions,
// and the animation loop for the interactive solar system.

class SolarSystem {
    /**
     * Constructs the SolarSystem object.
     * Initializes the scene, creates celestial bodies, sets up controls,
     * configures UI interactions, starts the animation loop, and
     * sets up the window resize handler.
     */
    constructor() {
        this.initScene();
        this.createCelestialBodies();
        this.setupControls();
        this.setupUI();
        this.animate();
        // Add and bind the resize handler
        window.addEventListener('resize', this.handleResize.bind(this));
    }

    /**
     * Initializes the Three.js scene, camera, and renderer.
     * Also adds a starfield background.
     */
    initScene() {
        // Basic scene setup
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000); // FOV, aspect ratio, near, far
        this.renderer = new THREE.WebGLRenderer({ antialias: true }); // Enable anti-aliasing for smoother edges
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        document.body.appendChild(this.renderer.domElement); // Add renderer to the DOM

        // Starfield generation
        // Create a buffer geometry to hold star positions
        const stars = new THREE.BufferGeometry();
        const starVertices = [];
        // Generate 10,000 stars with random positions within a 2000x2000x2000 cube
        for(let i = 0; i < 10000; i++) {
            starVertices.push(
                THREE.MathUtils.randFloatSpread(2000), // x
                THREE.MathUtils.randFloatSpread(2000), // y
                THREE.MathUtils.randFloatSpread(2000)  // z
            );
        }
        // Set the 'position' attribute for the stars geometry
        stars.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
        // Create material for the stars (white points)
        const starMaterial = new THREE.PointsMaterial({ color: 0xFFFFFF, size: 0.7 });
        // Create the Points object and add it to the scene
        const starField = new THREE.Points(stars, starMaterial);
        this.scene.add(starField);

        // Set initial camera position
        this.camera.position.z = 50;
    }

    /**
     * Creates the Sun, planets, their orbits, and Saturn's rings.
     * Also sets up ambient and point lighting.
     */
    createCelestialBodies() {
        // Planet configuration data: name, color, size (relative to Earth), and distance from Sun (arbitrary units)
        const planets = [
            { name: 'Mercury', color: 0xA0522D, size: 0.4, distance: 10 }, // Brownish
            { name: 'Venus', color: 0xDEB887, size: 0.95, distance: 15 },   // Pale yellow
            { name: 'Earth', color: 0x4169E1, size: 1, distance: 20 },     // Royal blue
            { name: 'Mars', color: 0xFF4500, size: 0.5, distance: 25 },    // Red-orange
            { name: 'Jupiter', color: 0xDAA520, size: 2.5, distance: 35 }, // Goldenrod
            { name: 'Saturn', color: 0xF4A460, size: 2, distance: 45 },    // Sandy brown
            { name: 'Uranus', color: 0x87CEEB, size: 1.7, distance: 55 },   // Sky blue
            { name: 'Neptune', color: 0x0000CD, size: 1.6, distance: 65 }  // Medium blue
        ];

        // Create Sun: A yellow sphere at the center
        const sunGeometry = new THREE.SphereGeometry(3, 32, 32); // Radius 3, 32 segments (width & height)
        const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xFFD700 }); // Gold color, basic material (unaffected by lights)
        this.sun = new THREE.Mesh(sunGeometry, sunMaterial);
        this.scene.add(this.sun);

        // Planet and Orbit Creation Loop: Iterate through planet configurations
        this.planets = planets.map(config => {
            // Create planet mesh (sphere)
            const geometry = new THREE.SphereGeometry(config.size, 32, 32);
            const material = new THREE.MeshPhongMaterial({ color: config.color }); // Phong material for lighting effects
            const planet = new THREE.Mesh(geometry, material);

            // Special handling for Saturn's rings
            if (config.name === 'Saturn') {
                const ringInnerRadius = config.size * 1.2; // Inner radius relative to planet size
                const ringOuterRadius = config.size * 2.2; // Outer radius relative to planet size
                const ringGeometry = new THREE.RingGeometry(ringInnerRadius, ringOuterRadius, 64); // 64 segments for smoothness
                const ringMaterial = new THREE.MeshBasicMaterial({
                    color: 0xcccccc, // Light grey color for rings
                    side: THREE.DoubleSide, // Render both sides of the rings
                    transparent: true,      // Enable transparency
                    opacity: 0.6            // Set opacity level
                });
                const ringsMesh = new THREE.Mesh(ringGeometry, ringMaterial);
                ringsMesh.rotation.x = Math.PI * 0.4; // Tilt the rings (radians)
                planet.add(ringsMesh); // Add rings as a child of Saturn's mesh to move together
            }
            
            // Create orbit path (a thin ring)
            const orbitGeometry = new THREE.RingGeometry(config.distance - 0.1, config.distance, 64); // Inner, outer radius, segments
            const orbitMaterial = new THREE.MeshBasicMaterial({ 
                color: 0x444444,        // Dark grey color for orbit lines
                side: THREE.DoubleSide, // Render both sides
                transparent: true,
                opacity: 0.3            // Make orbits semi-transparent
            });
            const orbit = new THREE.Mesh(orbitGeometry, orbitMaterial);
            orbit.rotation.x = Math.PI / 2; // Rotate orbit to be horizontal (align with XY plane)
            this.scene.add(orbit); // Add orbit directly to the scene

            // Return planet data including its mesh, orbit, and a random starting angle for its orbit
            return { ...config, mesh: planet, orbit, angle: Math.random() * Math.PI * 2 };
        });

        // Add all planet meshes to the scene
        this.planets.forEach(planet => this.scene.add(planet.mesh));

        // Lighting Setup
        // Ambient light: Provides a base level of light to all objects
        const ambientLight = new THREE.AmbientLight(0xFFFFFF, 0.1); // White light, low intensity
        this.scene.add(ambientLight);

        // Point light for the Sun: Emits light in all directions from the Sun's position
        const sunLight = new THREE.PointLight(0xFFFFFF, 1); // White light, full intensity
        this.sun.add(sunLight); // Add light as a child of the Sun, so it moves with the Sun (if Sun were to move)
    }

    /**
     * Sets up OrbitControls for camera manipulation (zoom, pan, rotate).
     */
    setupControls() {
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true; // Smooth camera movement
        this.controls.dampingFactor = 0.05; // Damping inertia
        this.controls.minDistance = 20;   // Minimum zoom distance
        this.controls.maxDistance = 200;  // Maximum zoom distance
        this.controls.autoRotate = true;  // Enable auto-rotation of the camera around the target
        this.controls.autoRotateSpeed = 0.5; // Speed of auto-rotation
    }

    /**
     * Sets up UI element interactions like buttons for auto-rotation, orbit visibility,
     * speed control, and the info panel close button.
     * Also initializes raycasting for planet selection.
     */
    setupUI() {
        // Get references to UI elements
        this.infoPanel = document.getElementById('infoPanel');
        this.closeInfoPanelButton = document.getElementById('closeInfoPanel');

        if (!this.infoPanel || !this.closeInfoPanelButton) {
            // Basic check to ensure UI elements are present
            console.error("Info panel or close button not found in the DOM!");
            return;
        }

        // Event listener for auto-rotate button
        document.getElementById('autoRotate').addEventListener('click', () => {
            this.controls.autoRotate = !this.controls.autoRotate; // Toggle auto-rotation
            document.getElementById('autoRotate').textContent = 
                this.controls.autoRotate ? '⏸ Auto-Rotate' : '▶ Auto-Rotate'; // Update button text
        });

        // Event listener for toggle orbits button
        document.getElementById('toggleOrbits').addEventListener('click', () => {
            this.planets.forEach(planet => {
                planet.orbit.visible = !planet.orbit.visible; // Toggle visibility of each planet's orbit
            });
        });

        // Event listener for speed control slider
        document.getElementById('speedControl').addEventListener('input', (e) => {
            this.simulationSpeed = e.target.value; // Update simulation speed based on slider value
        });

        // Setup for raycasting (clicking on planets)
        this.raycaster = new THREE.Raycaster(); // Used to detect intersections with objects
        this.mouse = new THREE.Vector2();       // Stores normalized mouse coordinates
        // Add click listener to the window for planet selection
        window.addEventListener('click', (e) => this.handlePlanetClick(e));

        // Event listener for the info panel's close button
        this.closeInfoPanelButton.addEventListener('click', () => {
            this.infoPanel.classList.remove('active'); // Hide the info panel
        });
    }

    /**
     * Handles clicks on the canvas to detect if a planet was clicked.
     * Uses raycasting to determine intersections.
     * @param {MouseEvent} event - The mouse click event.
     */
    handlePlanetClick(event) {
        // Normalize mouse coordinates to range from -1 to +1
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        // Update the raycaster with the camera and mouse position
        this.raycaster.setFromCamera(this.mouse, this.camera);
        // Get a list of objects intersected by the ray (only planet meshes)
        const intersects = this.raycaster.intersectObjects(
            this.planets.map(planet => planet.mesh) // Check intersection with planet meshes
        );

        // If any planet is intersected
        if (intersects.length > 0) {
            // Find the corresponding planet object from our list
            const planet = this.planets.find(p => p.mesh === intersects[0].object);
            this.showPlanetInfo(planet); // Display info for the clicked planet
        }
    }

    /**
     * Displays information about the selected planet in the info panel.
     * @param {object} planet - The planet object containing its data.
     */
    showPlanetInfo(planet) {
        // Populate the info panel with planet details
        document.getElementById('planetName').textContent = planet.name;
        // Simplified calculations for display purposes
        document.getElementById('planetRadius').textContent = `${(planet.size * 12742).toLocaleString()} km`; 
        document.getElementById('orbitalPeriod').textContent = `${Math.round(planet.distance * 10)} Earth days`; 
        document.getElementById('sunDistance').textContent = `${(planet.distance * 149.6).toLocaleString()} million km`;

        this.infoPanel.classList.add('active'); // Make the info panel visible
    }
    
    /**
     * The main animation loop.
     * Updates planet positions, rotates them, updates controls, and renders the scene.
     */
    animate() {
        // Request the next frame for continuous animation
        requestAnimationFrame(() => this.animate());
        
        // Update planet positions and rotations
        this.planets.forEach(planet => {
            // Update orbital angle based on distance and simulation speed
            planet.angle += 0.005 * (10 / planet.distance) * (this.simulationSpeed || 1);
            // Calculate new X and Z positions based on angle and distance (circular orbit)
            planet.mesh.position.x = Math.cos(planet.angle) * planet.distance;
            planet.mesh.position.z = Math.sin(planet.angle) * planet.distance;
            // Simulate axial rotation
            planet.mesh.rotation.y += 0.02; 
        });

        // Update OrbitControls (important if enableDamping or autoRotate is true)
        this.controls.update();
        // Render the scene from the perspective of the camera
        this.renderer.render(this.scene, this.camera);
    }

    /**
     * Handles window resize events to update camera aspect ratio and renderer size.
     */
    handleResize() {
        if (this.camera && this.renderer) {
            // Update camera's aspect ratio
            this.camera.aspect = window.innerWidth / window.innerHeight;
            // Update camera's projection matrix after changing aspect ratio
            this.camera.updateProjectionMatrix();
            // Resize the renderer to fit the new window dimensions
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        }
    }
}

// Initialize the SolarSystem simulation once the HTML document is fully loaded.
window.addEventListener('load', () => {
    new SolarSystem();
});
