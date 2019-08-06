/* 
THREE.js r106 
*/

// Global Variables
let canvas = document.getElementById("myCanvas");
let camera0, scene0, renderer, composer, clock, stats, gui;
let controls, mousePos = {}, camPos = new THREE.Vector3( 0 , 1.5 , 8 );
let textureLoader;
let Textures = {};
let Lights = [];
let shadowSetting = {
	ON: true,
	bias: 0.0005,
};
let time = 0, floor, pyramid, pyramid2;
let reflectionCamera, reflectionRenderTarget, reflectionRenderer, myPass;
let floorSize = new THREE.Vector2( 50 , 50 );


function init() {
	// Renderer
	renderer = new THREE.WebGLRenderer({ 
		canvas: canvas, 
		// antialias: true, 
		powerPreference: "high-performance",
	});
	renderer.setSize( window.innerWidth, window.innerHeight );
	if(shadowSetting.ON){ 
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
	// scene0.fog = new THREE.FogExp2( 0x202020 , 0.025 );
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
	gui = new dat.GUI();
	// gui.add(object, property, [min], [max], [step])
	
	// Loaders
	textureLoader = new THREE.TextureLoader();

	// Resize Event
	window.addEventListener("resize", function(){
		renderer.setSize( window.innerWidth, window.innerHeight );
		camera0.aspect = window.innerWidth / window.innerHeight;
		camera0.updateProjectionMatrix();
	}, false);
	
	// Inits
	initControls();
	initTextures();
	
	initLights();
	createStartingMesh();
	initPostProcessing();
	
	if( shadowSetting.ON ) renderer.shadowMap.needsUpdate = true;
	
	setInterval( function(  ){
		console.log( renderer.info.render.calls );
	}, 1000/2 )
}

let createStartingMesh = function(){
	
	let cube = new THREE.Mesh( 
		new THREE.BoxGeometry( 0.8 , 1.8 , 0.8 ) , 
		new THREE.MeshStandardMaterial({color: 0x202020 , roughness: 0.7 , metalness: 0 })
	);
	if(shadowSetting.ON) {
		cube.castShadow = true;
		cube.receiveShadow = true;
	}
	cube.position.set( 1.5 , 0.9 , 5 );
	// scene0.add( cube );
	
	setupReflectionRender();
	createFloor();
	
	createPyramid();
}

let setupReflectionRender = function(){		
	
	reflectionCamera = new THREE.OrthographicCamera( -floorSize.x/2, floorSize.x/2, floorSize.y/2, -floorSize.y/2, 0.0, 20 );
	scene0.add( reflectionCamera );
	reflectionCamera.rotation.x += 90 * Math.PI/180;
	
	reflectionRenderTarget = new THREE.WebGLRenderTarget( 256 , 256 , {} );
	reflectionRenderTarget.texture.wrapS = THREE.RepeatWrapping;
	reflectionRenderTarget.texture.wrapT = THREE.RepeatWrapping;
	// console.log( reflectionRenderTarget );
	
}

let createFloor = function(){
	
	floor = new THREE.Mesh(
		new THREE.PlaneBufferGeometry( floorSize.x , floorSize.y ),
		new THREE.MeshStandardMaterial({
			color: 0x2642D9,
			// color: 0x051680,
			// roughness: 1.0,
			metalness: 0.0,
			// map: Textures.noise1,
			bumpMap: Textures.noise2,
			// depthWrite: false,
			transparent: true,
		})
	);
	
	floor.rotation.x -= 90 * Math.PI/180;
	scene0.add( floor );
	if(shadowSetting.ON) floor.receiveShadow = true;
	
	floor.material.onBeforeCompile = function( shader ){
		
		shader.uniforms.uTime = { value: time };
		shader.uniforms.uNoise = { value: Textures.noise2 };
		shader.uniforms.CR1min = { value: 0.5 };
		shader.uniforms.CR1max = { value: 0.66 };
		shader.uniforms.CR2min = { value: 0.5 };
		shader.uniforms.CR2max = { value: 0.9 };
		shader.uniforms.uNoiseOpacity = { value: 0.1 };
		
		shader.uniforms.uReflectionRT = { value: null };
		
		gui.add( shader.uniforms.uNoiseOpacity, "value", 0.0, 1.0, 0.02 ).name("Noise Opacity");
		/* let shaderFolder = gui.addFolder( 'Shader' );
		shaderFolder.open();
		shaderFolder.add( shader.uniforms.CR1min, 'value', 0.0, 1.0, 0.02).name('CR1 min');
		shaderFolder.add( shader.uniforms.CR1max, 'value', 0.0, 1.0, 0.02).name('CR1 max');
		shaderFolder.add( shader.uniforms.CR2min, 'value', 0.0, 1.0, 0.02).name('CR2 min');
		shaderFolder.add( shader.uniforms.CR2max, 'value', 0.0, 1.0, 0.02).name('CR2 max'); */
		// shaderFolder.add( shader.uniforms.uvOffsetX, 'value', -2.0, 2.0, 0.02).name('uvX');
		// shaderFolder.add( shader.uniforms.uvOffsetY, 'value', -2.0, 2.0, 0.02).name('uvY');
		
		
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
			`vec4 diffuseColor = vec4( diffuse, opacity );`,`
			
			// vec4 reflectionTxt = texture2D( uReflectionRT , vUv * vec2( 1.0 , -1.0 ) );
			vec4 diffuseColor = vec4( diffuse, opacity );
			// vec4 diffuseColor = vec4( diffuse , opacity ) + reflectionTxt;
		`);
		
		shader.fragmentShader = shader.fragmentShader.replace( 
			`#include <roughnessmap_fragment>`,
			myChunks.adjusted_roughnessmap_fragment
		);
		
		shader.fragmentShader = shader.fragmentShader.replace( 
			`#include <bumpmap_pars_fragment>`,
			myChunks.adjusted_bumpmap_pars_fragment
		);
		
		floor.userData.shader = shader;
	}
	
}

let createPyramid = function(){
	
	let pyramidGeo = new THREE.CylinderBufferGeometry( 3.5 , 0.2 , 4.5 , 4 );
	let pyramidMat = new THREE.ShaderMaterial({ 
		defines: {},
		
		uniforms: {
			diffuse: { value: new THREE.Color( 0.0 , 0.0 , 0.0 ) },
			opacity: { value: 1.0 },
			
			uTime: { value: 0.0 },
			uNoiseVoronoi: { value: Textures.voronoi },
			uNoisePerlin: { value: Textures.noise2 },
			uTxtMix: { value: 0.5 },
			emissive: { value: new THREE.Color( 0.0 , 0.9 , 1.0 ) },
			CR3min: { value: 0.4 },
			CR3max: { value: 0.5 },
		},
		
		vertexShader: myChunks.my_emission_shader.vertex,
		fragmentShader: myChunks.my_emission_shader.fragment,
		
		flatShading: true,
	});
	let normalMat = new THREE.MeshNormalMaterial({  });
	
	pyramid = new THREE.Mesh( pyramidGeo , pyramidMat );
	pyramid.position.set( 2 , 2.5 , -8 );
	pyramid.rotation.y += 55 * Math.PI/180;
	scene0.add( pyramid );
	
	pyramid2 = new THREE.Mesh( pyramidGeo , pyramidMat );
	pyramid2.position.set( 2 , -2.5 , -8 );
	pyramid2.rotation.y -= 55 * Math.PI/180;
	pyramid2.rotation.x += 180 * Math.PI/180;
	scene0.add( pyramid2 );
	
	
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
		// lights: false,
	}) );
	glowEffect.scale.set( 50 , 50 , 1 );
	scene0.add( glowEffect );
	glowEffect.position.set( 3.5 , 1.5 , -10 );
	glowEffect.renderOrder = 0.1;
	
	let pyrGlowFolder = gui.addFolder( 'Pyramid Glow' );
	// pyrGlowFolder.open();
	pyrGlowFolder.add( glowEffect.position , 'x' , -2.0 , 20.0 , 0.1 );
	pyrGlowFolder.add( glowEffect.position , 'y' , -1.0 , 10.0 , 0.1 );
	pyrGlowFolder.add( glowEffect.position , 'z' , -40.0 , 10.0 , 0.1 );
	pyrGlowFolder.add( glowEffect.material , 'opacity' , 0.0 , 1.0 , 0.01 );
	pyrGlowFolder.add( glowEffect.scale , 'x' , 10.0 , 200.0 , 0.1 ).name("scale").onChange( function( value ){
		glowEffect.scale.set( value , value , value );
	} );
	
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
		radius: new THREE.Vector2( 0.6 , 0.6 ),
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
	
	Textures.noise1 = textureLoader.load( 'noiseTexture.png' );
	Textures.noise1.wrapS = THREE.RepeatWrapping;
	Textures.noise1.wrapT = THREE.RepeatWrapping;
	
	Textures.noise2 = textureLoader.load( 'noiseTexture2.png' );
	Textures.noise2.wrapS = THREE.RepeatWrapping;
	Textures.noise2.wrapT = THREE.RepeatWrapping;
	Textures.noise2.repeat.set( 2 , 2 ); // 2 2
	gui.add( Textures.noise2.repeat, "x" , 0 , 16 );
	gui.add( Textures.noise2.repeat, "y" , 0 , 16 );
	console.log( Textures.noise2 );
	Textures.noise2.anisotropy = renderer.capabilities.getMaxAnisotropy();
	
	Textures.voronoi = textureLoader.load( 'voronoi.jpg' );
	Textures.voronoi.wrapS = THREE.RepeatWrapping;
	Textures.voronoi.wrapT = THREE.RepeatWrapping;
	
	
	Textures.glowOld = textureLoader.load( 'RoundSoftParticle.png' );
	Textures.glow = textureLoader.load( 'RoundSoftParticleHalved.png' );
	
}

let initPostProcessing = function(){
	
	composer = new THREE.EffectComposer( renderer );
	renderer.info.autoReset = false;
	
	// Passes
	let renderPass = new THREE.RenderPass( scene0, camera0 );
	let fxaaPass = new THREE.ShaderPass( THREE.FXAAShader );
	
	myPass = new THREE.ShaderPass( myChunks.myShaderPass );
	myPass.uniforms.uReflectionRT = { value: null };
	
	// resolution, strength, radius, threshold
	let unrealBloomPass = new THREE.UnrealBloomPass( 
		new THREE.Vector2( 256 , 256 ),
		4.5, 1.0 , 0.55
	);
	// unrealBloomPass.enabled = false;
	unrealBloomPass.exposure = 1.0;
	
	let bloomFolder = gui.addFolder( 'Bloom Pass' );
	// bloomFolder.open();
	bloomFolder.add( unrealBloomPass, 'exposure', 0.0, 2.0 , 0.1 )
	.onChange( function ( value ) {
		renderer.toneMappingExposure = Math.pow( value, 4.0 );
	} );
	bloomFolder.add( unrealBloomPass , 'strength' , 0.0 , 10.0 , 0.05 );
	bloomFolder.add( unrealBloomPass , 'radius' , 0.0 , 1.0 , 0.01 );
	bloomFolder.add( unrealBloomPass , 'threshold' , 0.0 , 1.0 , 0.01 );
	bloomFolder.add( unrealBloomPass , 'enabled' );
	
	composer.addPass( renderPass );
	composer.addPass( unrealBloomPass );
	composer.addPass( fxaaPass );
	
	// composer.addPass( myPass );
	
}

let initLights = function(){
	Lights[0] = new THREE.AmbientLight( 0xffffff , 0.0 );
	// Lights[0] = new THREE.DirectionalLight( 0xffffff , 0.8 );
	// Lights[0].position.set( 1 , 2 , 2 );
	
	// PYRAMID LIGHT
	Lights[1] = new THREE.PointLight( 0xaaeeff , 13 , 0 , 2 );
	Lights[1].position.set( 2 , 1.5 , -8 );
	if( shadowSetting.ON ){ 
		Lights[1].castShadow = true;
		Lights[1].shadow.bias = shadowSetting.bias;
	}
	
	let pLightFolder = gui.addFolder( 'pLight' );
	pLightFolder.add( Lights[1].position , 'x' , -10.0 , 10.0 , 0.1 );
	pLightFolder.add( Lights[1].position , 'y' , -1.0 , 10.0 , 0.1 );
	pLightFolder.add( Lights[1].position , 'z' , -10.0 , 10.0 , 0.1 );
	pLightFolder.add( Lights[1] , 'intensity' , 0.0 , 100.0 , 0.5 );
	pLightFolder.add( Lights[1] , 'distance' , 0.0 , 100.0 , 0.01 );
	
	// ORANGE LIGHT
	Lights[2] = new THREE.PointLight( 0xFF2200 , 100 , 15.5 , 2 );
	Lights[2].position.set( -12 , 1.5 , -3.0 );
	if( shadowSetting.ON ){ 
		Lights[2].castShadow = true;
		Lights[2].shadow.bias = shadowSetting.bias;
	}
	let pHelper = new pLightHelper( 0xFF2200 , 90.0 );
	pHelper.renderOrder = 0.1;
	Lights[2].add( pHelper );
	
	let orangeLightFolder = gui.addFolder( 'OrangeLight' );
	// orangeLightFolder.open();
	orangeLightFolder.add( Lights[2].position , 'x' , -30.0 , 0.0 , 0.1 );
	orangeLightFolder.add( Lights[2].position , 'y' , -1.0 , 10.0 , 0.1 );
	orangeLightFolder.add( Lights[2].position , 'z' , -30.0 , 10.0 , 0.1 );
	orangeLightFolder.add( Lights[2] , 'intensity' , 0.0 , 500.0 , 0.5 );
	orangeLightFolder.add( Lights[2] , 'distance' , 0.0 , 30.0 , 0.01 );
	
	orangeLightFolder.add( pHelper.position , 'x' , -30.0 , 0.0 , 0.1 );
	orangeLightFolder.add( pHelper.position , 'y' , -1.0 , 10.0 , 0.1 );
	orangeLightFolder.add( pHelper.position , 'z' , -30.0 , 10.0 , 0.1 );
	orangeLightFolder.add( pHelper.material , 'opacity' , 0.0 , 1.0 , 0.01 );
	orangeLightFolder.add( pHelper.scale , 'x' , 10.0 , 200.0 , 0.1 ).name("scale").onChange( function( value ){
		pHelper.scale.set( value , value , value );
	} );
	
	pHelper.position.set( -15.5 , 0.9 , -3.0 );
	
	
	for(let i = 0; i < Lights.length; i++){
		scene0.add( Lights[i] );
	}
}

function pLightHelper( color , radius ){
	
	let obj = new THREE.Sprite( new THREE.SpriteMaterial({
		map: Textures.glow,
		color: color,
		opacity: 0.7,
		fog: false,
	}) );
	obj.scale.set( 1.0 + radius , 1.0 + radius );
	
	return obj;
}


function animate() {
	stats.begin();
	renderer.info.reset();
	requestAnimationFrame( animate );
	
	
	controls.updateCamera( camera0 );
	
	let delta = clock.getDelta();
	time += 1/60;
	if( floor.userData.shader ) floor.userData.shader.uniforms.uTime.value = time;
	
	pyramid.rotation.y += 0.0005; // 0.0005
	pyramid2.rotation.y -= 0.0005;
	pyramid.material.uniforms.uTime.value = time;
	
	/* renderer.setRenderTarget( reflectionRenderTarget );
	if( floor.userData.shader ) floor.userData.shader.uniforms.uReflectionRT.value = null;
	renderer.render( scene0 , reflectionCamera );
	if( floor.userData.shader ) floor.userData.shader.uniforms.uReflectionRT.value = reflectionRenderTarget.texture; */
	
	
	composer.render( scene0 , camera0 );
	stats.end();
}

if ( WEBGL.isWebGLAvailable() === false ) {
		
	document.body.appendChild( WEBGL.getWebGLErrorMessage() );
	console.error("WEBGL IS NOT SUPPORTED");
} else {
	
	init();
	requestAnimationFrame( animate );
}
