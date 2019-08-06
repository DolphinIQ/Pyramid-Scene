
let edgeShader = {
	DEFINES: {},
	
	uniforms: {
		tDiffuse: { value: null },
		uSize: { value: null },
	},
	
	vertexShader: `
		#version 300 es
		
		varying vec2 vUv;
		
		void main(){
			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position , 1.0 );
		}
	`,
	
	fragmentShader: `
		#version 300 es
		
		precision highp float;
		precision highp int;
		out vec4 out_FragColor;
		
		uniform sampler2D tDiffuse;
		uniform vec2 uSize;
		
		varying vec2 vUv;
		
		float med( vec3 color ){
			return ( color.x + color.y + color.z )/3.0;
		}
		
		vec3 colorPixels( vec3 pixelColor ){
			if( med( pixelColor ) > 0.15 ) {
				return vec3( 0.8 );
			} else {
				return vec3( 0.5 );
			}
		}
		
		void main(){
			// C1 C2 C3
			// B1 B2 B3
			// A1 A2 A3
			
			vec2 texCoord = gl_FragCoord.xy / uSize;
			float pxScale = 2.0;
			
			vec3 A1 = texture2D( tDiffuse , (gl_FragCoord.xy + vec2( -pxScale , -pxScale ) ) / uSize ).rgb;
			vec3 A2 = texture2D( tDiffuse , (gl_FragCoord.xy + vec2( 0.0 , -pxScale ) ) / uSize ).rgb;
			vec3 A3 = texture2D( tDiffuse , (gl_FragCoord.xy + vec2( pxScale , -pxScale ) ) / uSize ).rgb;
			vec3 B1 = texture2D( tDiffuse , (gl_FragCoord.xy + vec2( -pxScale , -0.0 ) ) / uSize ).rgb;
			vec3 B2 = texture2D( tDiffuse , (gl_FragCoord.xy + vec2( 0.0 , 0.0 ) ) / uSize ).rgb;
			vec3 B3 = texture2D( tDiffuse , (gl_FragCoord.xy + vec2( pxScale , -0.0 ) ) / uSize ).rgb;
			vec3 C1 = texture2D( tDiffuse , (gl_FragCoord.xy + vec2( -pxScale , pxScale ) ) / uSize ).rgb;
			vec3 C2 = texture2D( tDiffuse , (gl_FragCoord.xy + vec2( 0.0 , pxScale ) ) / uSize ).rgb;
			vec3 C3 = texture2D( tDiffuse , (gl_FragCoord.xy + vec2( pxScale , pxScale ) ) / uSize ).rgb;
			
			float factor = 0.01;
			
			if( abs( med(B3) - med(B1) ) > factor ) B2 = vec3( 0.0 );
			else if( abs( med(B1) - med(B3) ) > factor ) B2 = vec3( 0.0 );
			else if( abs( med(A2) - med(C2) ) > factor ) B2 = vec3( 0.0 );
			else if( abs( med(C2) - med(A2) ) > factor ) B2 = vec3( 0.0 );
			
			else if( abs( med(A1) - med(C3) ) > factor ) B2 = vec3( 0.0 );
			else if( abs( med(C3) - med(A1) ) > factor ) B2 = vec3( 0.0 );
			else if( abs( med(A3) - med(C1) ) > factor ) B2 = vec3( 0.0 );
			else if( abs( med(C1) - med(A3) ) > factor ) B2 = vec3( 0.0 );
			else B2 = vec3( 0.9 );
			
			vec3 img = B2;
			vec3 reddo = vec3( 0.3 , 0.0 , 0.0 );
			vec4 color = vec4( img , 1.0 );
			
			// if( vUv.x * uSize.x > uSize.x - 5.0 ) color = vec4( vec3(0.0) , 1.0 );
			
			out_FragColor = color;
		}
	`
}