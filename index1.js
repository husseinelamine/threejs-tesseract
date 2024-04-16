// Constants for cube geometry and colors
const CUBE_SIZE = 1;
const lineColor1 = 0xF9D423;
const lineColor2 = 0xFC913A;
const MaterialColor = 0x79BD9A;

// Function to find edges of the tesseract
function findEdges(numvertices) {
    const edges = [];
    for (let i = 0; i < numvertices; i++) {
        for (let j = 0; j < numvertices; j++) {
            if (j <= i) continue;
            const h = hammingDistance(i, j);
            if (h === 1) {
                edges.push({ vertices: [i, j], indices: [i, j] });
            }
        }
    }
    return edges;
}

// Function to calculate Hamming distance
function hammingDistance(x, y) {
    let distance = 0;
    for (let i = x ^ y; i > 0; i >>= 1) {
        if (i & 1) {
            distance += 1;
        }
    }
    return distance;
}

// Function to create line materials
function lineMaterialMaker(color) {
    return new THREE.LineBasicMaterial({
        color: color,
        linewidth: 2,
        opacity: 0.5,
        transparent: true
    });
}

// Function to choose material based on edge pair
function chooseMaterial(edgepair, materialList) {
    return edgepair[0] & 4 ? materialList[1] : materialList[0];
}

class Skybox extends THREE.Object3D {
    constructor(size, images) {
        super();

        const loader = new THREE.CubeTextureLoader();
        loader.setCrossOrigin('');

        this._texture = loader.load(images, (t) => {
            t.format = THREE.RGBFormat;
            t.mapping = THREE.CubeRefractionMapping;

            const shader = THREE.ShaderLib['cube'];

            // Define uniforms for the cube shader
            const uniforms = {
                ...THREE.UniformsUtils.clone(shader.uniforms),
                'tCube': { value: t } // The Skybox texture
            };

            // Add envColor declaration in the fragment shader
            const fragmentShader = `
               uniform samplerCube tCube;
               varying vec3 vWorldDirection;
               void main() {
                   vec4 envColor = textureCube(tCube, vec3(vWorldDirection.x, vWorldDirection.yz)); // Get environment color
                   gl_FragColor = envColor;
               }
           `;

            this._geometry = new THREE.BoxGeometry(size[0], size[1], size[2]);

            this._material = new THREE.ShaderMaterial({
                fragmentShader: fragmentShader,
                vertexShader: shader.vertexShader,
                uniforms: shader.uniforms,
                depthWrite: false,
                side: THREE.BackSide,
            });

            this._mesh = new THREE.Mesh(this._geometry, this._material);

            this.add(this._mesh);
        });
    }
}

// Function to get rotation angle based on time
function getAngle(time) {
    return time * 0.001; // Adjust as needed based on desired rotation speed
}

// Function to rotate and project vertices
// Function to rotate and project vertices
function rotateAndProject(angle) {
    // Define the vertices of the tesseract in 4D space
    const tesseractVertices4D = [
        { x: -1, y: -1, z: -1, w: -1 },
        { x: 1, y: -1, z: -1, w: -1 },
        { x: -1, y: 1, z: -1, w: -1 },
        { x: 1, y: 1, z: -1, w: -1 },
        { x: -1, y: -1, z: 1, w: -1 },
        { x: 1, y: -1, z: 1, w: -1 },
        { x: -1, y: 1, z: 1, w: -1 },
        { x: 1, y: 1, z: 1, w: -1 },
        { x: -1, y: -1, z: -1, w: 1 },
        { x: 1, y: -1, z: -1, w: 1 },
        { x: -1, y: 1, z: -1, w: 1 },
        { x: 1, y: 1, z: -1, w: 1 },
        { x: -1, y: -1, z: 1, w: 1 },
        { x: 1, y: -1, z: 1, w: 1 },
        { x: -1, y: 1, z: 1, w: 1 },
        { x: 1, y: 1, z: 1, w: 1 }
    ];

    // Define the rotation matrix (for 3D rotation)
    const rotationMatrix = [
        [Math.cos(angle), -Math.sin(angle), 0],
        [Math.sin(angle), Math.cos(angle), 0],
        [0, 0, 1]
    ];

    // Initialize an array to store projected vertices
    const projectedVertices = [];

    // Rotate each vertex and project onto 3D space
    for (let vertex of tesseractVertices4D) {
        // Apply rotation to 3D space
        const rotatedVertex = [
            rotationMatrix[0][0] * vertex.x + rotationMatrix[0][1] * vertex.y + rotationMatrix[0][2] * vertex.z,
            rotationMatrix[1][0] * vertex.x + rotationMatrix[1][1] * vertex.y + rotationMatrix[1][2] * vertex.z,
            rotationMatrix[2][0] * vertex.x + rotationMatrix[2][1] * vertex.y + rotationMatrix[2][2] * vertex.z
        ];

        // Project onto 3D space (for now, just take the first 3 coordinates)
        projectedVertices.push(new THREE.Vector3(rotatedVertex[0], rotatedVertex[1], rotatedVertex[2]));
    }

    return projectedVertices;
}


// Class for handling camera movement based on mouse position
class MousePerspectiveCamera extends THREE.PerspectiveCamera {
    constructor(...args) {
        super(...args);

        this._handleMouseMove = this._handleMouseMove.bind(this);

        this._mouseX = 0;
        this._mouseY = 0;

        document.addEventListener('mousemove', this._handleMouseMove, false);
    }

    _handleMouseMove(e) {
        e.preventDefault();
        this._mouseX = (e.clientX - window.innerWidth / 2) * 0.05;
        this._mouseY = (e.clientY - window.innerHeight / 2) * 0.05;
    }

    _update() {
        this.position.x += (this._mouseX - this.position.x) * 0.015;
        this.position.y += (-this._mouseY - this.position.y) * 0.015;
    }
}

class ReflectionCube extends THREE.Object3D {
    constructor(texture) {
        super();

        // Define cube geometry
        const geometry = new THREE.BoxGeometry(1, 1, 1);

        // Define cube materials with environment map
        const materials = [
            new THREE.MeshBasicMaterial({ envMap: texture, side: THREE.DoubleSide }), // Right
            new THREE.MeshBasicMaterial({ envMap: texture, side: THREE.DoubleSide }), // Left
            new THREE.MeshBasicMaterial({ envMap: texture, side: THREE.DoubleSide }), // Top
            new THREE.MeshBasicMaterial({ envMap: texture, side: THREE.DoubleSide }), // Bottom
            new THREE.MeshBasicMaterial({ envMap: texture, side: THREE.DoubleSide }), // Front
            new THREE.MeshBasicMaterial({ envMap: texture, side: THREE.DoubleSide })  // Back
        ];

        // Create cube mesh with materials
        const cube = new THREE.Mesh(geometry, materials);

        // Add cube to the object
        this.add(cube);
    }
}


class App {
    constructor() {
        this._bind('_render', '_resize');
        this._setup();
        this._createScene();

        window.addEventListener('resize', this._resize);
    }

    _bind(...methods) {
        methods.forEach((method) => (this[method] = this[method].bind(this)));
    }

    _setup() {
        const renderer = (this._renderer = new THREE.WebGLRenderer({ antialias: true }));
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        document.body.appendChild(renderer.domElement);

        this._scene = new THREE.Scene();
        const camera = (this._camera = new MousePerspectiveCamera(
            45,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        ));
        camera.position.set(100, 100, 100);
    }

    _createScene() {
        const scene = this._scene;
        this._then = 0;

        // Create the edges of the tesseract
        const edges = findEdges(16);
        const materials = [lineMaterialMaker(lineColor1), lineMaterialMaker(lineColor2)];
        for (let i = 0; i < edges.length; i++) {
            const geometry = new THREE.BufferGeometry();

            const vertices = new Float32Array(edges[i].vertices);
            const indices = new Uint32Array(edges[i].indices);

            geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
            geometry.setIndex(new THREE.BufferAttribute(indices, 1));

            const edge = new THREE.Line(geometry, chooseMaterial(edges[i], materials));
            edge.name = 'edge_' + i;
            scene.add(edge);
        }

        // Create the tesseract (cube)
        const cubeMaterial = new THREE.MeshBasicMaterial({
            color: MaterialColor,
            opacity: 0.25,
            transparent: true
        });
        const cubeGeometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
        this._tesseract = new THREE.Mesh(cubeGeometry, cubeMaterial);
        scene.add(this._tesseract);

        const SKYBOX_IMG = 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/476907/black-marble.jpg';

        const skybox = new Skybox([1024, 1024, 1024], [
            SKYBOX_IMG, // Right side image
            SKYBOX_IMG, // Left side image
            SKYBOX_IMG, // Top side image
            SKYBOX_IMG, // Bottom side image
            SKYBOX_IMG, // Front side image
            SKYBOX_IMG  // Back side image
        ]);
        scene.add(skybox);

        // Add reflection cube
        const reflectionCube = new ReflectionCube(skybox._texture);
        reflectionCube.position.set(0, 0, 0);
        scene.add(reflectionCube);
    }

    _render() {
        const scene = this._scene;
        const camera = this._camera;
        const renderer = this._renderer;
        const tesseract = this._tesseract;
        const t = Date.now();
        const now = t * 0.001;
        const deltaTime = (now - this._then) * 0.001;
        this._then = now;

        const rot = getAngle(t);
        const projected = rotateAndProject(rot);

        // Update cube vertices
        tesseract.geometry.vertices = projected.slice(0, 8);
        tesseract.geometry.verticesNeedUpdate = true;
        tesseract.geometry.elementsNeedUpdate = true;

        camera._update(); // Update camera position based on mouse movement

        renderer.render(scene, camera);

        requestAnimationFrame(this._render);
    }

    _resize(e) {
        const renderer = this._renderer;
        const camera = this._camera;

        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
}

// Entry point, creating and rendering the app
document.addEventListener('DOMContentLoaded', function () {
    var app = new App();
    app._render();
});
