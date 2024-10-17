precision highp float;
precision highp int;
uniform float maxdepth;
uniform float mindepth;
//Curve Effect Variable-->Expose to the Client
uniform float pointSize;//--> Default Value: 1.8
uniform float depth;//--> Default Value: 0.14
uniform float curve;//--> Default Value: 4.8
uniform sampler2D depthMap;
uniform vec4 depthMap_crop;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
attribute vec3 position;
attribute vec2 uv;
varying vec2 vUv;
varying vec3 vDirection;
float get_z(vec2 uv) {
    float depth = texture2D(depthMap, uv).r;
    return (depth)*(maxdepth-mindepth);
}

void main() {
    vec2 fixed_uv = 
        uv * vec2(depthMap_crop.z - depthMap_crop.x, depthMap_crop.w - depthMap_crop.y) + 
        depthMap_crop.xy;
    float curveAmount = 0.001 * curve; // Adjust this value to control the amount of curvature
    float radius = 10.0; // Adjust this value to control the radius of curvature
    // Calculate the distance from the center of the screen
    float dist = length(position.x);
    // Apply curvature based on distance from the center
    vec3 newPosition = position;
    newPosition.z += curveAmount * pow(dist, 2.0) / (2.0 * radius);
    vec3 new_pos=newPosition;
    new_pos.z=new_pos.z+(get_z(fixed_uv)*depth);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(new_pos, 1.0);
    gl_PointSize = pointSize;
    vUv = uv;
}