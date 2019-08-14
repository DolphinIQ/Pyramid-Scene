
let myChunks = {
	
	adjusted_roughnessmap_fragment: `
		
		float roughnessFactor = roughness;
			
		vec4 texelRoughness = texture2D( uNoise , vUv );
		
		float colRampFac = texelRoughness.r;
		colRampFac = clamp( (colRampFac - CR1min) / (CR1max - CR1min), 0.0 , 1.0 );
		roughnessFactor *= colRampFac;
		
		// vec4 reflectionTxt = texture2D( uReflectionRT , vUv * vec2( 1.0 , -1.0 ) );
		// diffuseColor += reflectionTxt * ( 1.0 - roughnessFactor );
		
		if( roughnessFactor == 0.0 ) diffuseColor.a = uNoiseOpacity;
		else if( roughnessFactor <= 0.01 ) diffuseColor.a = uNoiseOpacity + 0.2;
	`,
	
	adjusted_bumpmap_pars_fragment: `
		
		#ifdef USE_BUMPMAP

			uniform sampler2D bumpMap;
			uniform float bumpScale;
			
			
			vec2 dHdxy_fwd() {
				
				// vec2 uvOffset = vec2( uTime*0.005 , 0.0 );
				vec2 uvOffset = vec2( 0.0 );

				vec2 dSTdx = dFdx( vUv + uvOffset );
				vec2 dSTdy = dFdy( vUv + uvOffset );

				float Hll = clamp( (texture2D( bumpMap, vUv + uvOffset ).x - CR2min) / (CR2max - CR2min), 0.0 , 1.0 ) * texture2D( bumpMap, vUv + uvOffset ).x;
				
				float dBx = clamp( (texture2D( bumpMap, vUv + uvOffset + dSTdx ).x - CR2min) / (CR2max - CR2min), 0.0 , 1.0 ) * texture2D( bumpMap, vUv + uvOffset + dSTdx ).x - Hll;
				
				float dBy = clamp( (texture2D( bumpMap, vUv + uvOffset + dSTdy ).x - CR2min) / (CR2max - CR2min), 0.0 , 1.0 ) * texture2D( bumpMap, vUv + uvOffset + dSTdy ).x - Hll;
				
				// float Hll = bumpScaleAdjusted * texture2D( bumpMap, vUv + uvOffset ).x;
				// float dBx = bumpScaleAdjusted * texture2D( bumpMap, vUv + uvOffset + dSTdx ).x - Hll;
				// float dBy = bumpScaleAdjusted * texture2D( bumpMap, vUv + uvOffset + dSTdy ).x - Hll;

				return vec2( dBx, dBy );

			}

			vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy ) {

				// Workaround for Adreno 3XX dFd*( vec3 ) bug. See #9988

				vec3 vSigmaX = vec3( dFdx( surf_pos.x ), dFdx( surf_pos.y ), dFdx( surf_pos.z ) );
				vec3 vSigmaY = vec3( dFdy( surf_pos.x ), dFdy( surf_pos.y ), dFdy( surf_pos.z ) );
				vec3 vN = surf_norm;		// normalized

				vec3 R1 = cross( vSigmaY, vN );
				vec3 R2 = cross( vN, vSigmaX );

				float fDet = dot( vSigmaX, R1 );

				fDet *= ( float( gl_FrontFacing ) * 2.0 - 1.0 );

				vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
				return normalize( abs( fDet ) * surf_norm - vGrad );

			}

		#endif
	`,
	
	my_emission_shader: {
		
		vertex: `
			varying vec2 vUv;
			
			void main(){
				
				vUv = uv;
				gl_Position = projectionMatrix * modelViewMatrix * vec4( position , 1.0 );
			}
		`,
		
		fragment: `
		
			uniform vec3 diffuse;
			uniform float opacity;
			
			uniform vec3 emissive;
			
			uniform float uTime; 
			
			uniform sampler2D uNoiseVoronoi; 
			uniform sampler2D uNoisePerlin;
			uniform float uTxtMix;
			
			uniform float CR3min; 
			uniform float CR3max; 
			
			varying vec2 vUv;
			
			void main(){
				vec2 uv = vUv;
				uv.x *= 10.0;
				uv.y = uv.y * 3.0 + uTime*0.2;
				
				vec3 outputColor = diffuse;
				
				vec4 emissionNoiseVoronoi = texture2D( uNoiseVoronoi , uv );
				float emissionFactorVoronoi = emissiveMapTexelToLinear( emissionNoiseVoronoi ).r;
			
				vec4 emissionNoisePerlin = texture2D( uNoisePerlin , uv );
				float emissionFactorPerlin = emissiveMapTexelToLinear( emissionNoisePerlin ).r;
				
				
				float emissionFactor = mix( emissionFactorVoronoi , emissionFactorPerlin , uTxtMix + sin( uTime*1.0 )*0.05 );
				
				emissionFactor = clamp( (emissionFactor - CR3min)/(CR3max - CR3min) , 0.0, 1.0 );
				
				outputColor += emissionFactor * emissive;
				
				gl_FragColor = vec4( outputColor , opacity );
			}
		`,
		
		
	},
	
	myShaderPass: {
		
		vertexShader: `
			varying vec2 vUv;
			
			void main(){
				
				vUv = uv;
				gl_Position = projectionMatrix * modelViewMatrix * vec4( position , 1.0 );
			}
		`,
		
		fragmentShader: `
		
			uniform sampler2D tDiffuse;
			uniform sampler2D uReflectionRT; 
			
			varying vec2 vUv;
			
			void main(){
				vec3 outputColor = texture2D( uReflectionRT , vUv ).rgb;
				// outputColor += vec3( 0.0 , 0.0 , 0.9 );
				
				gl_FragColor = vec4( outputColor , 1.0 );
			}
		`,
		
		
	},
	
};

export { myChunks };


