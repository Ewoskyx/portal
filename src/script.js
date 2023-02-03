import * as dat from 'lil-gui'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { sRGBEncoding } from 'three'
import fireFliesVertexShader from './shaders/fireflies/vertex.glsl'
import fireFliesFragmentShader from './shaders/fireflies/fragment.glsl'
import portalVertexShader from './shaders/portal/vertex.glsl'
import portalFragmentShader from './shaders/portal/fragment.glsl'


/**
 * Base
 */
// Debug
const debugObject = {};
const gui = new dat.GUI({
    width: 400
})

// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()

/**
 * Loaders
 */
// Texture loader
const textureLoader = new THREE.TextureLoader()

// Draco loader
const dracoLoader = new DRACOLoader()
dracoLoader.setDecoderPath('draco/')

// GLTF loader
const gltfLoader = new GLTFLoader()
gltfLoader.setDRACOLoader(dracoLoader)


/**
 * Textures
 */
const bakedTexture = textureLoader.load('baked.jpg');
bakedTexture.flipY = false;
bakedTexture.encoding = THREE.sRGBEncoding;

/**
 * Materials
 */

const bakedMaterial = new THREE.MeshBasicMaterial({map: bakedTexture});


debugObject.portalColorStart = '#dcd0d0';
debugObject.portalColorEnd = '#201919';

gui
    .addColor(debugObject, 'portalColorStart')
    .onChange(() => {
        portalLightMaterial.uniforms.uColorStart.value.set(debugObject.portalColorStart)
    });
gui
    .addColor(debugObject, 'portalColorEnd')
    .onChange(() => {
        portalLightMaterial.uniforms.uColorEnd.value.set(debugObject.portalColorEnd)
    });

/**
 * Pole light material 
 */
const poleLightMaterial = new THREE.MeshBasicMaterial({color: 0xffffe5});
const portalLightMaterial = new THREE.ShaderMaterial({
    vertexShader: portalVertexShader,
    fragmentShader: portalFragmentShader,
    uniforms: {
        uTime: {value: 0},
        uColorStart: {value: new THREE.Color(debugObject.portalColorStart)},
        uColorEnd: {value: new THREE.Color(debugObject.portalColorEnd)},
    }
});



/**
 * Models
 */
gltfLoader.load(
    'portal.glb',
    (gltf) => {

        const bakedMesh = gltf.scene.children.find(child => child.name === 'baked');
        const lampLeft = gltf.scene.children.find(child => child.name === 'lampLeft');
        const lampRight = gltf.scene.children.find(child => child.name === 'lampRight');
        const portal = gltf.scene.children.find(child => child.name === 'portal');
        
        bakedMesh.material = bakedMaterial; 
        lampLeft.material = poleLightMaterial;
        lampRight.material = poleLightMaterial;
        portal.material = portalLightMaterial;

        
        scene.add(gltf.scene);
    }
)

/**
 * Fireflies
 */

/**
 * Geometry
 */
const fireFliesGeometry = new THREE.BufferGeometry();
const fireFliesCount = 30;
const positionArray = new Float32Array(fireFliesCount * 3);
const scaleArray = new Float32Array(fireFliesCount);

for(let i = 0; i < fireFliesCount; i++) {
    positionArray[i * 3 + 0] = (Math.random() - 0.5) * 4;
    positionArray[i * 3 + 1] = Math.random() * 1.5;
    positionArray[i * 3 + 2] = (Math.random() - 0.5) * 4;

    scaleArray[i] = Math.random();
}

fireFliesGeometry.setAttribute('position', new THREE.BufferAttribute(positionArray, 3));
fireFliesGeometry.setAttribute('aScale', new THREE.BufferAttribute(scaleArray,1));
/**
 * Material
 */
const fireFliesMaterial = new THREE.ShaderMaterial({
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    transparent: true,
    uniforms: {
        uTime: {value: 0},
        uPixelRatio: {
            value: Math.min(window.devicePixelRatio,2)
        },
        uSize: {value: 100},
    },
    vertexShader: fireFliesVertexShader,
    fragmentShader: fireFliesFragmentShader
});

gui.add(fireFliesMaterial.uniforms.uSize, 'value').min(0).max(500).step(1).name('firefliesSize')

/**
 * Points
 */
const fireFlies = new THREE.Points(fireFliesGeometry,fireFliesMaterial);
scene.add(fireFlies);

debugObject.clearColor = '#201919';
const fog = new THREE.Fog(debugObject.clearColor, 1, 9);
scene.fog = fog;

/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

window.addEventListener('resize', () =>
{
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

    // Update fireFlies
    fireFliesMaterial.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio,2);
})

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(45, sizes.width / sizes.height, 0.1, 100)
camera.position.x = 4
camera.position.y = 2
camera.position.z = 4
scene.add(camera)

// Controls
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true
})
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.outputEncoding = THREE.sRGBEncoding;


renderer.setClearColor(debugObject.clearColor);
gui
    .addColor(debugObject, 'clearColor')
    .onChange(() => {
        renderer.setClearColor(debugObject.clearColor);
    })

/**
 * Animate
 */
const clock = new THREE.Clock()

const tick = () =>
{
    const elapsedTime = clock.getElapsedTime()

    // Update fireflies
    fireFliesMaterial.uniforms.uTime.value = elapsedTime; 
    portalLightMaterial.uniforms.uTime.value = elapsedTime; 

    // Update controls
    controls.update()

    // Render
    renderer.render(scene, camera)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()