uniform sampler2D tDiffuse;
uniform vec4 colorMap_crop;
uniform vec2 resolution;
uniform float blurRadius;
uniform float brightness;
varying vec2 vUv;

vec4 stackBlur(sampler2D image, vec2 uv, vec2 resolution, float radius) {
    vec2 texOffset = vec2(1.0)/resolution;
    vec4 color = vec4(0.0);
    float totalWeight = 0.0;
    int radiusInt = int(radius);

    for (int y=-radiusInt; y<=radiusInt; y++) {
        for (int x=-radiusInt; x<=radiusInt; x++){
            float weight = 1.0 - (abs(float(x)) + abs(float(y))) / (2.0 * radius);
            color += texture2D(image, uv + vec2(float(x), float(y)) * texOffset) * weight;
            totalWeight += weight;
        }
    }
    return color/totalWeight;
}

void main() {
    vec2 fixed_uv = 
        vUv * vec2(colorMap_crop.z - colorMap_crop.x, colorMap_crop.w - colorMap_crop.y) + 
        colorMap_crop.xy;
    vec4 color = stackBlur(tDiffuse, fixed_uv, resolution, blurRadius);
    color.rgb *= brightness;
    gl_FragColor = color;
}