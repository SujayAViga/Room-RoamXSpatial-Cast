precision highp float;
precision highp int;

uniform sampler2D depthMap;
uniform vec4 depthMap_crop;
uniform sampler2D colorMap;
uniform vec4 colorMap_crop;
varying vec2 vUv;

void main() {
    vec2 fixed_uv = 
        vUv * vec2(colorMap_crop.z - colorMap_crop.x, colorMap_crop.w - colorMap_crop.y) + 
        colorMap_crop.xy;
    vec2 depthmap_fixed_uv = 
        vUv * vec2(depthMap_crop.z - depthMap_crop.x, depthMap_crop.w - depthMap_crop.y) + 
        depthMap_crop.xy;
    if (vUv.x < 0.05 || vUv.x > 0.95 || vUv.y < 0.05 || vUv.y > 0.95) discard;
    gl_FragColor = texture2D(colorMap, fixed_uv);
}