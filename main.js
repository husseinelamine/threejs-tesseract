import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let camera, scene, renderer, bulbLight, bulbMat, hemiLight;
let ballMat, cubeMat, floorMat;
let previousShadowMap = false;

scene = new THREE.Scene();

// ref for lumens: http://www.power-sure.com/lumens.htm
const bulbLuminousPowers = {
	'110000 lm (1000W)': 110000,
	'3500 lm (300W)': 3500,
	'1700 lm (100W)': 1700,
	'800 lm (60W)': 800,
	'400 lm (40W)': 400,
	'180 lm (25W)': 180,
	'20 lm (4W)': 20,
	'Off': 0
};

// ref for solar irradiances: https://en.wikipedia.org/wiki/Lux
const hemiLuminousIrradiances = {
	'0.0001 lx (Moonless Night)': 0.0001,
	'0.002 lx (Night Airglow)': 0.002,
	'0.5 lx (Full Moon)': 0.5,
	'3.4 lx (City Twilight)': 3.4,
	'50 lx (Living Room)': 50,
	'100 lx (Very Overcast)': 100,
	'350 lx (Office Room)': 350,
	'400 lx (Sunrise/Sunset)': 400,
	'1000 lx (Overcast)': 1000,
	'18000 lx (Daylight)': 18000,
	'50000 lx (Direct Sun)': 50000,
	'Custom': 0.15
};

const params = {
	shadows: true,
	exposure: 0.68,
	bulbPower: Object.keys(bulbLuminousPowers)[0],
	hemiIrradiance: Object.keys(hemiLuminousIrradiances)[11]
};

camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 1, 5);

renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);


const ambiantLight = new THREE.AmbientLight(0x404040, 0.3); // soft white light
scene.add(ambiantLight);

const bulbGeometry = new THREE.SphereGeometry(0.02, 16, 8);
bulbLight = new THREE.PointLight(0xffee88, 1, 100, 2);

bulbMat = new THREE.MeshStandardMaterial({
	emissive: 0xffffee,
	emissiveIntensity: 1,
	color: 0x111111
});
bulbLight.add(new THREE.Mesh(bulbGeometry, bulbMat));
bulbLight.position.set(0, 2, 0);
//bulbLight.castShadow = true;
//bulbLight.shadow.mapSize.width = 1024;
scene.add(bulbLight);

// add multiple bulbs that moves around
const bulbLight2 = bulbLight.clone();
// Cyan
bulbLight2.color = new THREE.Color(0x00ffff);
bulbLight2.position.set(4, 2, -1);
scene.add(bulbLight2);

const bulbLight3 = bulbLight.clone();
// Mauve
bulbLight3.color = new THREE.Color(0xff00ff);
bulbLight3.position.set(-4, 2, -1);
scene.add(bulbLight3);

const bulbLight4 = bulbLight.clone();
// Yellow
bulbLight4.color = new THREE.Color(0xffff00);
bulbLight4.position.set(0, 2, 4);
scene.add(bulbLight4);

hemiLight = new THREE.HemisphereLight(0xddeeff, 0x0f0e0d, hemiLuminousIrradiances[params.hemiIrradiance]);
scene.add(hemiLight);

floorMat = new THREE.MeshStandardMaterial({
	roughness: 0.8,
	color: 0xffffff,
	metalness: 0.2,
	bumpScale: 1
});

const roomSize = 10;
const roomGeometry = new THREE.BoxGeometry(roomSize, roomSize, roomSize);
const roomMaterial = new THREE.MeshPhongMaterial({ color: 0xaaaaaa, side: THREE.BackSide });
const room = new THREE.Mesh(roomGeometry, roomMaterial);
scene.add(room);

// const textureLoader = new THREE.TextureLoader();
// textureLoader.load('textures/hardwood2_diffuse.jpg', function (map) {

// 	map.wrapS = THREE.RepeatWrapping;
// 	map.wrapT = THREE.RepeatWrapping;
// 	map.anisotropy = 4;
// 	map.repeat.set(10, 24);
// 	map.colorSpace = THREE.SRGBColorSpace;
// 	floorMat.map = map;
// 	floorMat.needsUpdate = true;

// });
// textureLoader.load('textures/hardwood2_bump.jpg', function (map) {

// 	map.wrapS = THREE.RepeatWrapping;
// 	map.wrapT = THREE.RepeatWrapping;
// 	map.anisotropy = 4;
// 	map.repeat.set(10, 24);
// 	floorMat.bumpMap = map;
// 	floorMat.needsUpdate = true;

// });
// textureLoader.load('textures/hardwood2_roughness.jpg', function (map) {

// 	map.wrapS = THREE.RepeatWrapping;
// 	map.wrapT = THREE.RepeatWrapping;
// 	map.anisotropy = 4;
// 	map.repeat.set(10, 24);
// 	floorMat.roughnessMap = map;
// 	floorMat.needsUpdate = true;

// });

const floorGeometry = new THREE.PlaneGeometry(20, 20);
const floorMesh = new THREE.Mesh(floorGeometry, floorMat);
floorMesh.receiveShadow = true;
floorMesh.rotation.x = - Math.PI / 2.0;

scene.add(floorMesh);

const uniforms = {
	resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
	time: { value: 0.0 }
};

const screenGeometry = new THREE.PlaneGeometry(6, 3.375); // Assuming 16:9 aspect ratio
const screenMaterial = new THREE.ShaderMaterial(
	{
		vertexShader: `
			void main() {
				gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
			}`,
		fragmentShader: `
			uniform float time;
			uniform vec2 resolution;

				
			// display sdf square

			float sdSquare( vec2 p, vec2 sz )
			{
				vec2 d = abs(p) - sz;
				return min(max(d.x,d.y),0.0) + length(max(d,0.0));
			}
			
			void main(){
				vec2 p = (2.0 * gl_FragCoord.xy - resolution) / min(resolution.x, resolution.y);
				float d = sdSquare(p, vec2(0.5));
				float c = 0.5 + 0.5 * cos( 3.0 * time + d * 3.0);
				gl_FragColor = vec4(c, c, c, 1.0);
			}

			`,

		uniforms: uniforms
	});

const screen = new THREE.Mesh(screenGeometry, screenMaterial);
screen.position.set(0, 3, -5); // Position the screen in front of the cube

scene.add(screen);


//const geometry = new THREE.IcosahedronGeometry(1, 0);
// Tesseract geometry
const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshPhysicalMaterial({
	metalness: 0.5,
	roughness: 0.5,
	clearcoat: 1.0,
	clearcoatRoughness: 0.1,
	reflectivity: 1.0,
	transmission: 0.5,
	ior: 1.5,
	color: 0x00ff00,
	transparent: true,
	opacity: 0.9,
	depthWrite: false,
	shadowSide: THREE.DoubleSide,

});


const ico = new THREE.Mesh(geometry, material)
ico.position.y = 1;
ico.position.z = -5;
ico.castShadow = true;
ico.receiveShadow = true;

scene.add(ico);

document.addEventListener("wheel", (e) => {	
	ico.position.z += e.deltaY * 0.01;
});




function animate() {
	requestAnimationFrame(animate);

	// move the bulbs in an irregular and non repeating pattern

	const time = Date.now() * 0.0005;
	bulbLight.position.x = Math.sin(time * 0.7) * 3;
	bulbLight.position.y = Math.cos(time * 0.5) * 4;
	bulbLight.position.z = Math.cos(time * 0.3) * 3;

	bulbLight2.position.x = Math.sin(time * 0.3) * 3;
	bulbLight3.position.z = Math.cos(time * 0.5) * 3;
	bulbLight4.position.x = Math.cos(time * 0.7) * 3;


	ico.rotation.x += 0.001;
	ico.rotation.y += 0.001;
	ico.rotation.z += 0.001;

	uniforms.time.value = time;	
	renderer.render(scene, camera);
}

animate();