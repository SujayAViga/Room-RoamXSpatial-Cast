uniform sampler2D colorMap;
uniform vec4 colorMap_crop;
uniform float opacity;
varying vec2 vUv;

void main() {
    vec2 fixed_uv = 
        vUv * vec2(colorMap_crop.z - colorMap_crop.x, colorMap_crop.w - colorMap_crop.y) + 
        colorMap_crop.xy;
    vec4 color = texture2D(colorMap, fixed_uv);
    color.a *= opacity;
    gl_FragColor = color;
}