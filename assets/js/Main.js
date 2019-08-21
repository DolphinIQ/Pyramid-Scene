/* 
THREE.js r107
*/

// UTILITY
import Stats from '../../node_modules/three/examples/jsm/libs/stats.module.js';
import { GUI } from '../../node_modules/three/examples/jsm/libs/dat.gui.module.js';
import { WEBGL } from '../../node_modules/three/examples/jsm/WebGL.js';

// THREE
import * as THREE from '../../node_modules/three/build/three.module.js';
import { OrbitControls } from '../../node_modules/three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from '../../node_modules/three/examples/jsm/loaders/GLTFLoader.js';
import { BufferGeometryUtils } from '../../node_modules/three/examples/jsm/utils/BufferGeometryUtils.js';

// POST PROCESSING
import { EffectComposer } from '../../node_modules/three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from '../../node_modules/three/examples/jsm/postprocessing/RenderPass.js';
import { FXAAShader } from '../../node_modules/three/examples/jsm/shaders/FXAAShader.js';
import { ShaderPass } from "../../node_modules/three/examples/jsm/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from '../../node_modules/three/examples/jsm/postprocessing/UnrealBloomPass.js';

// MY FILES
import { myChunks } from './Shaders.js';


// Global Variables
let canvas = document.getElementById("myCanvas");
let camera0, scene0, renderer, composer, clock, stats, gui;
let controls, mousePos = {}, camPos = new THREE.Vector3( 0 , 1.0 , 8 );
let textureLoader, gltfLoader;
let Textures = {};
let Lights = [];
let shadowSettings = {
	ON: true,
	bias: 0.0005,
};
let time = 0, floor, pyramid, character, particles;
let floorSize = new THREE.Vector2( 50 , 50 );
let guiFolders = {};


function init() {
	// Renderer
	renderer = new THREE.WebGLRenderer({ 
		canvas: canvas, 
		// antialias: true, 
		powerPreference: "high-performance",
	});
	renderer.setSize( window.innerWidth, window.innerHeight );
	if(shadowSettings.ON){ 
		renderer.shadowMap.enabled = true;
		renderer.shadowMap.type = THREE.PCFSoftShadowMap;
		renderer.shadowMap.autoUpdate = false;
	}
	renderer.gammaOutput = true;
	renderer.gammaFactor = 2.2;
	renderer.physicallyCorrectLights = true;
	
	// Scene
	scene0 = new THREE.Scene();
	scene0.background = new THREE.Color( 0x050505 );
	scene0.fog = new THREE.Fog( 0x050505 , 15 , 30 );
	
	// Camera
	camera0 = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 0.1, 100 );
	camera0.position.copy( camPos );
	
	// Clock
	clock = new THREE.Clock();
	
	//Stats
	stats = new Stats();
	document.body.appendChild( stats.dom );
	
	//GUI
	gui = new GUI();
	// gui.add(object, property, [min], [max], [step])
	guiFolders = {
		floor: gui.addFolder("Floor"),
		character: gui.addFolder("Character"),
		postProcessing: gui.addFolder("Post Processing"),
	};
	guiFolders.bloomPass = guiFolders.postProcessing.addFolder("Bloom Pass"),
	
	// Loaders
	textureLoader = new THREE.TextureLoader();
	gltfLoader = new GLTFLoader();

	// Resize Event
	window.addEventListener("resize", function(){
		renderer.setSize( window.innerWidth, window.innerHeight );
		camera0.aspect = window.innerWidth / window.innerHeight;
		camera0.updateProjectionMatrix();
	}, false);
	
	// LOADING
	THREE.DefaultLoadingManager.onLoad = function ( ) {
		console.log( 'Loading Complete!');
		setTimeout( function(){
			
			let x = 1.0;
			let fade = setInterval( function(){
				x-= 1/30;
				if( x <= 0.0 ){
					clearInterval( fade );
					document.getElementById('loading-screen').style.display = 'none';
				}
				document.getElementById('loading-screen').style.opacity = x;
			}, 1000/30 );
		}, 2000 );
	};
	
	THREE.DefaultLoadingManager.onProgress = function ( url, itemsLoaded, itemsTotal ) {
		let percent = (itemsLoaded/itemsTotal * 100).toString() + "%";
		// console.log( percent );
		document.querySelector('.ld-bar-progress').style.width = percent;
	};

	THREE.DefaultLoadingManager.onError = function ( url ) {
		console.log( 'There was an error loading ' + url );
	};
	
	
	// Inits
	initControls();
	initTextures();
	
	initLights();
	createStartingMesh();
	initPostProcessing();
	
	if( shadowSettings.ON ) renderer.shadowMap.needsUpdate = true;
	
	setInterval( function(  ){
		console.log( renderer.info.render.calls );
	}, 1000/2 );
}

let createStartingMesh = function(){
	
	loadCharacter();
	createFloor();
	createPyramid();
	createParticles();
	
	gui.close();
}

let createParticles = function(){
	
	let particlesGeo = new THREE.BufferGeometry();
	let posArr = [] , x,y,z;
	let particlesSettings = {
		count: 40,
		radius: new THREE.Vector3( 6 , 7 , 6 ),
		startPos: new THREE.Vector3( 2 , 2.5 , -8 ),
	};
	for( let i = 0; i < particlesSettings.count; i++ ){
		x = Math.random() * particlesSettings.radius.x - particlesSettings.radius.x/2;
		y = Math.random() * particlesSettings.radius.y - particlesSettings.radius.y/2;
		z = Math.random() * particlesSettings.radius.z - particlesSettings.radius.z/2;
		
		posArr.push( x , y , z );
	}
	
	posArr = new Float32Array( posArr );
	particlesGeo.addAttribute( 'position' , new THREE.BufferAttribute( posArr , 3 ) );
	
	let particlesMat = new THREE.PointsMaterial({
		map: Textures.particle,
		// color: 0x008Ba0, // blue
		color: 0xFF3300, // orange
		alphaTest: 0.6,
		blending: THREE.AdditiveBlending,
		size: 0.4,
	});
	
	particles = new THREE.Points( particlesGeo , particlesMat );
	// particles.position.set( 2 , 2.5 , -8 ); // blue
	particles.position.set( -12 , 1.5 , -3.0 ); // orange
	scene0.add( particles );
}

let loadCharacter = function(){
	
	gltfLoader.load( 'assets/models/character.glb' , function( gltf ){
		
		character = gltf.scene;
		
		character.position.set( 1.7 , -0.02 , 5.5 );
		character.rotation.y = 3.0; // 3.5
		
		if( shadowSettings.ON ){
			character.children[0].children[1].castShadow = true;
			character.children[0].children[1].receiveShadow = true;
			renderer.shadowMap.needsUpdate = true;
		}
		
		character.animationMixer = new THREE.AnimationMixer( character );
		character.animations = {
			idle: character.animationMixer.clipAction( gltf.animations[0] ),
		};
		character.animations.idle.play();
		character.playingAnimation = true;
		
		// guiFolders.character.open();
		guiFolders.character.add( character , "visible" );
		
		scene0.add( character );
		character.torus = new THREE.Mesh(
			new THREE.TorusBufferGeometry( 0.7 , 0.03 , 2 , 10 ),
			new THREE.MeshBasicMaterial({ color: 0xFF3310 })
		);
		character.torus.rotation.x = 90 * Math.PI/180;
		character.torus.position.set( 0.0 , 0.03 , 0.2 );
		character.add( character.torus );
	} );
	
	
}

let createFloor = function(){
	
	floor = new THREE.Mesh(
		new THREE.PlaneBufferGeometry( floorSize.x , floorSize.y ),
		new THREE.MeshStandardMaterial({
			color: 0x2642D9,
			metalness: 0.0,
			bumpMap: Textures.noise2,
			transparent: true,
		})
	);
	
	floor.rotation.x -= 90 * Math.PI/180;
	scene0.add( floor );
	if(shadowSettings.ON) floor.receiveShadow = true;
	
	floor.material.onBeforeCompile = function( shader ){
		
		shader.uniforms.uTime = { value: time };
		shader.uniforms.uNoise = { value: Textures.noise2 };
		shader.uniforms.CR1min = { value: 0.5 };
		shader.uniforms.CR1max = { value: 0.66 };
		shader.uniforms.CR2min = { value: 0.5 };
		shader.uniforms.CR2max = { value: 0.9 };
		shader.uniforms.uNoiseOpacity = { value: 0.1 };
		
		guiFolders.floor.open();
		guiFolders.floor.add( shader.uniforms.uNoiseOpacity, "value", 0.0, 1.0, 0.02 ).name('"Water" Opacity');
		
		guiFolders.floor.add( shader.uniforms.CR1min, 'value', 0.0, 1.0, 0.02).name('CR1 min');
		guiFolders.floor.add( shader.uniforms.CR1max, 'value', 0.0, 1.0, 0.02).name('CR1 max');
		guiFolders.floor.add( shader.uniforms.CR2min, 'value', 0.0, 1.0, 0.02).name('CR2 min');
		guiFolders.floor.add( shader.uniforms.CR2max, 'value', 0.0, 1.0, 0.02).name('CR2 max');
		
		
		shader.fragmentShader = `
			uniform float uTime;
			uniform sampler2D uNoise;
			uniform float CR1min;
			uniform float CR1max;
			uniform float CR2min;
			uniform float CR2max;
			uniform float uNoiseOpacity;
			
			uniform sampler2D uReflectionRT;
			
		` + shader.fragmentShader;
		
		shader.fragmentShader = shader.fragmentShader.replace( 
			`#include <roughnessmap_fragment>`,
			myChunks.adjusted_roughnessmap_fragment
		);
		
		shader.fragmentShader = shader.fragmentShader.replace( 
			`#include <bumpmap_pars_fragment>`,
			myChunks.adjusted_bumpmap_pars_fragment
		);
		
		// floor.userData.shader = shader;
	}
	
}

let createPyramid = function(){
	
	let pyramidGeo = new THREE.ConeBufferGeometry( 3.5 , 4.5 , 4 );
	let reflectedGeometry = pyramidGeo.clone();
	
	pyramidGeo.rotateX( Math.PI ); // 180 deg
	pyramidGeo.translate( 0 , 2.5 , 0 );
	reflectedGeometry.translate( 0 , -2.5 , 0 );
	
	pyramidGeo = BufferGeometryUtils.mergeBufferGeometries([
		pyramidGeo , reflectedGeometry
	]); 
	
	let pyramidMat = new THREE.ShaderMaterial({ 
		defines: {},
		
		uniforms: {
			diffuse: { value: new THREE.Color( 0.0 , 0.0 , 0.0 ) },
			opacity: { value: 1.0 },
			
			uTime: { value: 0.0 },
			uNoiseVoronoi: { value: Textures.voronoi },
			uNoisePerlin: { value: Textures.noise2 },
			uTxtMix: { value: 0.5 },
			emissive: { value: new THREE.Color( 0.0 , 0.7 , 0.8 ) }, // 0.7 , 0.85 
			CR3min: { value: 0.4 },
			CR3max: { value: 0.5 },
		},
		
		vertexShader: myChunks.my_emission_shader.vertex,
		fragmentShader: myChunks.my_emission_shader.fragment,
		
		flatShading: true,
		transparent: true,
	});
	let normalMat = new THREE.MeshNormalMaterial({  });
	
	pyramid = new THREE.Mesh( pyramidGeo , pyramidMat );
	pyramid.position.set( 2 , 0 , -8 );
	pyramid.rotation.y += 55 * Math.PI/180;
	scene0.add( pyramid );
	
	/* let pyramidFolder = gui.addFolder( 'Pyramid' );
	pyramidFolder.open();
	let shaderFolder = pyramidFolder.addFolder( 'Shader' );
	shaderFolder.open();
	shaderFolder.add( pyramidMat.uniforms.CR3min, 'value', 0.0, 1.0, 0.02 ).name('CR3min');
	shaderFolder.add( pyramidMat.uniforms.CR3max, 'value', 0.0, 1.0, 0.02 ).name('CR3max');
	shaderFolder.add( pyramidMat.uniforms.uTxtMix, 'value', 0.0, 1.0, 0.02 ).name('mix');
	 */
	
	// GLOW
	let glowEffect = new THREE.Sprite( new THREE.SpriteMaterial({
		map: Textures.glow,
		color: new THREE.Color( 0.0 , 0.9 , 1.0 ),
		blending: THREE.AdditiveBlending,
		opacity: 0.15,
		fog: false,
	}) );
	glowEffect.scale.set( 50 , 50 , 1 );
	scene0.add( glowEffect );
	glowEffect.position.set( 3.5 , 1.5 , -10 );
	glowEffect.renderOrder = 0.1;
	
	/* let pyrGlowFolder = gui.addFolder( 'Pyramid Glow' );
	// pyrGlowFolder.open();
	pyrGlowFolder.add( glowEffect.position , 'x' , -2.0 , 20.0 , 0.1 );
	pyrGlowFolder.add( glowEffect.position , 'y' , -1.0 , 10.0 , 0.1 );
	pyrGlowFolder.add( glowEffect.position , 'z' , -40.0 , 10.0 , 0.1 );
	pyrGlowFolder.add( glowEffect.material , 'opacity' , 0.0 , 1.0 , 0.01 );
	pyrGlowFolder.add( glowEffect.scale , 'x' , 10.0 , 200.0 , 0.1 ).name("scale").onChange( function( value ){
		glowEffect.scale.set( value , value , value );
	} ); */
	
}

let initControls = function(){
	// controls = new THREE.OrbitControls( camera0 , canvas );
	window.addEventListener( "mousemove", function(evt){
		// get mouse screen position from -1 to 1
		mousePos.x = evt.clientX/canvas.width * 2 - 1;
		mousePos.y = evt.clientY/canvas.height * 2 - 1;
	}, false );
	
	controls = {
		speedScale: 0.1,
		radius: new THREE.Vector2( 0.3 , 0.3 ),
		updateCamera: function( cam ){
			if( mousePos.x != undefined && mousePos.y != undefined ){
				let destinationX = camPos.x + mousePos.x * controls.radius.x;
				let destinationY = camPos.y - mousePos.y * controls.radius.y;
				let destVec2 = new THREE.Vector2( destinationX, destinationY );
				let camVec2 = new THREE.Vector2( cam.position.x, cam.position.y );
				
				let distance = new THREE.Vector2(
					destVec2.x - camVec2.x,
					destVec2.y - camVec2.y
				);
				cam.position.x += distance.x * controls.speedScale;
				cam.position.y += distance.y * controls.speedScale;
			} else return;
		}
	};
}

let initTextures = function(){
	
	textureLoader.setPath('assets/textures/');
	
	Textures.noise2 = textureLoader.load( 'noiseTexture2.png' );
	Textures.noise2.wrapS = THREE.RepeatWrapping;
	Textures.noise2.wrapT = THREE.RepeatWrapping;
	Textures.noise2.repeat.set( 1.85 , 2.12 ); // 2 2
	guiFolders.floor.add( Textures.noise2.repeat, "x" , 0 , 16 , 0.01 ).name("Repeat X");
	guiFolders.floor.add( Textures.noise2.repeat, "y" , 0 , 16 , 0.01 ).name("Repeat Y");
	Textures.noise2.anisotropy = renderer.capabilities.getMaxAnisotropy();
	
	Textures.voronoi = textureLoader.load( 'voronoi.jpg' );
	Textures.voronoi.wrapS = THREE.RepeatWrapping;
	Textures.voronoi.wrapT = THREE.RepeatWrapping;
	
	Textures.particle = textureLoader.load( 'corona.png' );
	Textures.glow = textureLoader.load( 'RoundSoftParticleHalved.png' );
}

let initPostProcessing = function(){
	
	composer = new EffectComposer( renderer );
	renderer.info.autoReset = false;
	
	// Passes
	let renderPass = new RenderPass( scene0, camera0 );
	let fxaaPass = new ShaderPass( FXAAShader );
	
	// resolution, strength, radius, threshold
	let unrealBloomPass = new UnrealBloomPass( 
		new THREE.Vector2( 256 , 256 ),
		4.5, 1.0 , 0.40
	);
	// unrealBloomPass.enabled = false;
	unrealBloomPass.exposure = 1.0;
	
	guiFolders.postProcessing.open();
	guiFolders.bloomPass.add( unrealBloomPass, 'exposure', 0.0, 2.0 , 0.1 )
	.onChange( function ( value ) {
		renderer.toneMappingExposure = Math.pow( value, 4.0 );
		// renderer.toneMappingExposure = value;
	} );
	guiFolders.bloomPass.add( unrealBloomPass , 'strength' , 0.0 , 10.0 , 0.05 );
	guiFolders.bloomPass.add( unrealBloomPass , 'radius' , 0.0 , 1.0 , 0.01 );
	guiFolders.bloomPass.add( unrealBloomPass , 'threshold' , 0.0 , 1.0 , 0.01 );
	guiFolders.bloomPass.add( unrealBloomPass , 'enabled' );
	
	composer.addPass( renderPass );
	composer.addPass( unrealBloomPass );
	composer.addPass( fxaaPass );
	
	
	guiFolders.postProcessing.add( fxaaPass , 'enabled' ).name("FXAA Pass");
}

let initLights = function(){
	
	// PYRAMID LIGHT
	Lights[0] = new THREE.PointLight( 0xaaeeff , 50 , 0 , 2 ); // int 13
	Lights[0].position.set( 2 , 1.5 , -8 );
	if( shadowSettings.ON ){ 
		Lights[0].castShadow = true;
		Lights[0].shadow.bias = shadowSettings.bias;
	}
	
	/* let pLightFolder = gui.addFolder( 'pLight' );
	pLightFolder.add( Lights[0].position , 'x' , -10.0 , 10.0 , 0.1 );
	pLightFolder.add( Lights[0].position , 'y' , -1.0 , 10.0 , 0.1 );
	pLightFolder.add( Lights[0].position , 'z' , -10.0 , 10.0 , 0.1 );
	pLightFolder.add( Lights[0] , 'intensity' , 0.0 , 100.0 , 0.5 );
	pLightFolder.add( Lights[0] , 'distance' , 0.0 , 100.0 , 0.01 ); */
	
	// ORANGE LIGHT
	Lights[1] = new THREE.PointLight( 0xFF2200 , 30 , 16.4 , 2 ); // 16.3 dist
	Lights[1].position.set( -12 , 1.5 , -3.0 );
	let pHelper = new THREE.Sprite( new THREE.SpriteMaterial({
		map: Textures.glow,
		color: 0xFF2200,
		opacity: 0.7,
		fog: false,
	}) );
	pHelper.scale.set( 1.0 + 90 , 1.0 + 90 );
	pHelper.renderOrder = 0.1;
	Lights[1].add( pHelper );
	
	/* let orangeLightFolder = gui.addFolder( 'OrangeLight' );
	// orangeLightFolder.open();
	orangeLightFolder.add( Lights[1].position , 'x' , -30.0 , 0.0 , 0.1 );
	orangeLightFolder.add( Lights[1].position , 'y' , -1.0 , 10.0 , 0.1 );
	orangeLightFolder.add( Lights[1].position , 'z' , -30.0 , 10.0 , 0.1 );
	orangeLightFolder.add( Lights[1] , 'intensity' , 0.0 , 500.0 , 0.5 );
	orangeLightFolder.add( Lights[1] , 'distance' , 0.0 , 30.0 , 0.01 );
	
	orangeLightFolder.add( pHelper.position , 'x' , -30.0 , 0.0 , 0.1 );
	orangeLightFolder.add( pHelper.position , 'y' , -1.0 , 10.0 , 0.1 );
	orangeLightFolder.add( pHelper.position , 'z' , -30.0 , 10.0 , 0.1 );
	orangeLightFolder.add( pHelper.material , 'opacity' , 0.0 , 1.0 , 0.01 );
	orangeLightFolder.add( pHelper.scale , 'x' , 10.0 , 200.0 , 0.1 ).name("scale").onChange( function( value ){
		pHelper.scale.set( value , value , value );
	} ); */
	
	pHelper.position.set( -15.5 , 0.9 , -3.0 );
	
	
	for(let i = 0; i < Lights.length; i++){
		scene0.add( Lights[i] );
	}
}

function animate() {
	// stats.begin();
	renderer.info.reset();
	requestAnimationFrame( animate );
	
	controls.updateCamera( camera0 );
	
	let delta = clock.getDelta();
	time += 1/60;
	
	pyramid.rotation.y += 0.0007;
	pyramid.material.uniforms.uTime.value = time;
	particles.rotation.y += 0.0002;
	
	if( character instanceof THREE.Scene ) {
		character.animationMixer.update( delta );
		character.torus.rotation.z += 3.35;
	}
	
	composer.render( scene0 , camera0 );
	// stats.end();
	stats.update();
}

if ( WEBGL.isWebGLAvailable() === false ) {
		
	document.body.appendChild( WEBGL.getWebGLErrorMessage() );
	console.error("WEBGL IS NOT SUPPORTED");
} else {
	
	init();
	requestAnimationFrame( animate );
}
