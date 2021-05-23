  
import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { Font } from 'three';
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { GUI } from 'three/examples/jsm/libs/dat.gui.module.js';

let stats;

const api = {

    count: 2000,
    distribution: 'random',
    resample: resample,
    surfaceColor: 0x2FFF9F,
    backgroundColor: 0xE39469,

};

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(75,window.innerWidth/window.innerHeight,0.1,1000);

const renderer = new THREE.WebGLRenderer({
    canvas: document.querySelector('#bg'),
});

renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth,window.innerHeight);
camera.position.setZ(30);
camera.position.setX(-3);

renderer.render(scene,camera);

let stemMesh, blossomMesh;
			let stemGeometry, blossomGeometry;
			let stemMaterial, blossomMaterial;

			let sampler;
			const count = api.count;
			const ages = new Float32Array( count );
			const scales = new Float32Array( count );
			const dummy = new THREE.Object3D();

			const _position = new THREE.Vector3();
			const _normal = new THREE.Vector3();
			const _scale = new THREE.Vector3();

const geometry = new THREE.TorusKnotGeometry(20,1,300,20,4,9).toNonIndexed();;
const material = new THREE.MeshStandardMaterial({ color: api.surfaceColor , wireframe : false});
const surface = new THREE.Mesh(geometry,material);

// Source: https://gist.github.com/gre/1650294
const easeOutCubic = function ( t ) {

    return ( -- t ) * t * t + 1;

};

// Scaling curve causes particles to grow quickly, ease gradually into full scale, then
// disappear quickly. More of the particle's lifetime is spent around full scale.
const scaleCurve = function ( t ) {

    return Math.abs( easeOutCubic( ( t > 0.5 ? 1 - t : t ) * 2 ) );

};

const loader = new GLTFLoader();

loader.load( 'Flower/Flower.glb', function ( gltf ) {

    const _stemMesh = gltf.scene.getObjectByName( 'Stem' );
    const _blossomMesh = gltf.scene.getObjectByName( 'Blossom' );

    stemGeometry = _stemMesh.geometry.clone();
    blossomGeometry = _blossomMesh.geometry.clone();

    const defaultTransform = new THREE.Matrix4()
        .makeRotationX( Math.PI )
        .multiply( new THREE.Matrix4().makeScale( 7, 7, 7 ) );

    stemGeometry.applyMatrix4( defaultTransform );
    blossomGeometry.applyMatrix4( defaultTransform );

    stemMaterial = _stemMesh.material;
    blossomMaterial = _blossomMesh.material;

    stemMesh = new THREE.InstancedMesh( stemGeometry, stemMaterial, count );
    blossomMesh = new THREE.InstancedMesh( blossomGeometry, blossomMaterial, count );

    // Assign random colors to the blossoms.
    const color = new THREE.Color();
    const blossomPalette = [ 0xF20587, 0xF2D479, 0xF2C879, 0xF2B077, 0xF24405 ];

    for ( let i = 0; i < count; i ++ ) {

        color.setHex( blossomPalette[ Math.floor( Math.random() * blossomPalette.length ) ] );
        blossomMesh.setColorAt( i, color );

    }

    // Instance matrices will be updated every frame.
    stemMesh.instanceMatrix.setUsage( THREE.DynamicDrawUsage );
    blossomMesh.instanceMatrix.setUsage( THREE.DynamicDrawUsage );

    resample();

    init();
    animate();

} );

function init() {

    const pointLight = new THREE.PointLight( 0xAA8899, 0.75 );
    pointLight.position.set( 50, - 25, 75 );
    scene.add( pointLight );

    scene.add( new THREE.HemisphereLight() );

    //

    scene.add( stemMesh );
    scene.add( blossomMesh );

    scene.add( surface );

}

function resample() {

    const vertexCount = surface.geometry.getAttribute( 'position' ).count;

    console.info( 'Sampling ' + count + ' points from a surface with ' + vertexCount + ' vertices...' );

    //

    console.time( '.build()' );

    sampler = new MeshSurfaceSampler( surface )
        .setWeightAttribute( api.distribution === 'weighted' ? 'uv' : null )
        .build();

    console.timeEnd( '.build()' );

    //

    console.time( '.sample()' );

    for ( let i = 0; i < count; i ++ ) {

        ages[ i ] = Math.random();
        scales[ i ] = scaleCurve( ages[ i ] );

        resampleParticle( i );

    }

    console.timeEnd( '.sample()' );

    stemMesh.instanceMatrix.needsUpdate = true;
    blossomMesh.instanceMatrix.needsUpdate = true;

}

function resampleParticle( i ) {

    sampler.sample( _position, _normal );
    _normal.add( _position );

    dummy.position.copy( _position );
    dummy.scale.set( scales[ i ], scales[ i ], scales[ i ] );
    dummy.lookAt( _normal );
    dummy.updateMatrix();

    stemMesh.setMatrixAt( i, dummy.matrix );
    blossomMesh.setMatrixAt( i, dummy.matrix );

}

function updateParticle( i ) {

    // Update lifecycle.

    ages[ i ] += 0.003;

    if ( ages[ i ] >= 1 ) {

        ages[ i ] = 0.001;
        scales[ i ] = scaleCurve( ages[ i ] );

        resampleParticle( i );

        return;

    }

    // Update scale.

    const prevScale = scales[ i ];
    scales[ i ] = scaleCurve( ages[ i ] );
    _scale.set( scales[ i ] / prevScale, scales[ i ] / prevScale, scales[ i ] / prevScale );

    // Update transform.

    stemMesh.getMatrixAt( i, dummy.matrix );
    dummy.matrix.scale( _scale );
    stemMesh.setMatrixAt( i, dummy.matrix );
    blossomMesh.setMatrixAt( i, dummy.matrix );

}

function render() {

    if ( stemMesh && blossomMesh ) {

        const time = Date.now() * 0.001;

        //scene.rotation.x = Math.sin( time / 4 );
        //scene.rotation.y = Math.sin( time / 2 );

        for ( let i = 0; i < api.count; i ++ ) {

            updateParticle( i );

        }

        stemMesh.instanceMatrix.needsUpdate = true;
        blossomMesh.instanceMatrix.needsUpdate = true;

    }

    renderer.render( scene, camera );

}

const pointLight = new THREE.PointLight(0xFFFFFF);
pointLight.position.set(5,5,5);

const ambientLight = new THREE.AmbientLight(0xFFFFFF);
scene.add(pointLight,ambientLight);

 /* helpers

 const lightHelper = new THREE.PointLightHelper(pointLight);
 const gridHelper = new THREE.GridHelper(200,50);
 scene.add(lightHelper,gridHelper);

 const controls = new OrbitControls(camera, renderer.domElement);

 */

function addStar(){
    const geometry = new THREE.DodecahedronGeometry(1.5,0);
    const material = new THREE.MeshStandardMaterial({color:Math.random() * 0xffffff});

    const star = new THREE.Mesh(geometry,material);
    const [x,y,z] = Array(3).fill().map( () => THREE.MathUtils.randFloatSpread(300) );
    star.position.set(x,y,z);
    scene.add(star);
}

Array(500).fill().forEach(addStar);

const spaceTexture = new THREE.TextureLoader().load('space.jpg');
scene.background = spaceTexture;


const zeelTexture = new THREE.TextureLoader().load('zeel.jpg');

const zeel = new THREE.Mesh(
    new THREE.BoxGeometry(3,3,3),
    new THREE.MeshBasicMaterial( { map: zeelTexture } )
);

scene.add(zeel);

const earthTexture = new THREE.TextureLoader().load('earth.jpg');
const normalTexture = new THREE.TextureLoader().load('normal.jpg');
const moonTexture = new THREE.TextureLoader().load('moon.jpg');
const erisTexture = new THREE.TextureLoader().load('eris.jpg');
const jupiterTexture = new THREE.TextureLoader().load('jupiter.jpg');
const marsTexture = new THREE.TextureLoader().load('mars.jpg');
const planet1Texture = new THREE.TextureLoader().load('panet1.jpg');
const sunTexture = new THREE.TextureLoader().load('sun.jpg');
//const venusTexture = new THREE.TextureLoader().load('venus.jpg');


const earth = new THREE.Mesh(
new THREE.SphereGeometry(3,32,32),
new THREE.MeshStandardMaterial( {
        map: earthTexture,
        normalMap: normalTexture
    } )
);

const moon = new THREE.Mesh(
    new THREE.SphereGeometry(3,32,32),
    new THREE.MeshStandardMaterial( {
            map: moonTexture,
            normalMap: normalTexture
        } )
    );

const eris = new THREE.Mesh(
    new THREE.SphereGeometry(3,32,32),
    new THREE.MeshStandardMaterial( {
            map: erisTexture,
            normalMap: normalTexture
        } )
    );

    const jupiter = new THREE.Mesh(
        new THREE.SphereGeometry(3,32,32),
        new THREE.MeshStandardMaterial( {
                map: jupiterTexture,
                normalMap: normalTexture
            } )
        );
        const mars = new THREE.Mesh(
            new THREE.SphereGeometry(3,32,32),
            new THREE.MeshStandardMaterial( {
                    map: marsTexture,
                    normalMap: normalTexture
                } )
            );

            const planet1 = new THREE.Mesh(
                new THREE.SphereGeometry(3,32,32),
                new THREE.MeshStandardMaterial( {
                        map: planet1Texture,
                        normalMap: normalTexture
                    } )
                );
                const sun = new THREE.Mesh(
                    new THREE.SphereGeometry(3,32,32),
                    new THREE.MeshStandardMaterial( {
                            map: sunTexture,
                            normalMap: normalTexture
                        } )
                    );
                    /*const venus = new THREE.Mesh(
                        new THREE.SphereGeometry(3,32,32),
                        new THREE.MeshStandardMaterial( {
                                map: venusTexture,
                                normalMap: normalTexture
                            } )
                        );*/

scene.add(earth);
scene.add(moon);
scene.add(eris);
scene.add(jupiter);
scene.add(mars);
scene.add(planet1);
scene.add(sun);
//scene.add(venus);

earth.position.z = 30;
earth.position.setX(-12);

moon.position.z = 40;
moon.position.setX(-12);

eris.position.z = 50;
eris.position.setX(-12);

jupiter.position.z = 60;
jupiter.position.setX(-12);

mars.position.z = 70;
mars.position.setX(-12);

planet1.position.z = 80;
planet1.position.setX(-12);

sun.position.z = 90;
sun.position.setX(-12);

//venus.position.z = 100;
//venus.position.setX(-12);

zeel.position.z = -5;
zeel.position.x = 2;


function moveCamera()
{
    const t = document.body.getBoundingClientRect().top;
    earth.rotation.x += 0.005;
    earth.rotation.y += 0.075;
    earth.rotation.z += 0.005;

    moon.rotation.x += 0.005;
    moon.rotation.y += 0.075;
    moon.rotation.z += 0.005;

    eris.rotation.x += 0.005;
    eris.rotation.y += 0.075;
    eris.rotation.z += 0.005;

    jupiter.rotation.x += 0.005;
    jupiter.rotation.y += 0.075;
    jupiter.rotation.z += 0.005;

    mars.rotation.x += 0.005;
    mars.rotation.y += 0.075;
    mars.rotation.z += 0.005;

    planet1.rotation.x += 0.005;
    planet1.rotation.y += 0.075;
    planet1.rotation.z += 0.005;

    sun.rotation.x += 0.005;
    sun.rotation.y += 0.075;
    sun.rotation.z += 0.005;
  
    //zeel.rotation.y += 0.01;
    //zeel.rotation.z += 0.01;
  
    camera.position.z = t * -0.01;
    camera.position.x = t * -0.0002;
    camera.rotation.y = t * -0.0002;

}

document.body.onscroll = moveCamera;
moveCamera();


 function animate()
 {
    requestAnimationFrame(animate);

    surface.rotation.x += 0.001;
    surface.rotation.y += 0.001;
    surface.rotation.z += 0.001;

    blossomMesh.rotation.x += 0.001;
    blossomMesh.rotation.y += 0.001;
    blossomMesh.rotation.z += 0.001;
    
    stemMesh.rotation.x += 0.001;
    stemMesh.rotation.y += 0.001;
    stemMesh.rotation.z += 0.001;

    earth.rotation.x += 0.005;

    render();

	//stats.update();

    //controls.update();

    renderer.render(scene,camera);
 }

 animate();