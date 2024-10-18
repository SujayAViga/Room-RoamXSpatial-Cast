precision mediump float;
precision mediump int;
precision mediump int;
uniform float maxdepth;
uniform float mindepth;
uniform sampler2D depthMap;
uniform vec4 depthMap_crop;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform float depth;
uniform float angle;
uniform float stretch;
uniform float pointSize;
attribute vec3 position;
attribute vec2 uv;
varying vec2 vUv;
varying vec3 vDirection;
float get_depth(vec2 uv){
   float depth=texture2D(depthMap,uv).r;
   return depth*(maxdepth-mindepth);
}
void main() {
    //Curve Effect Variable
    float depth = depth;
    float pointsize = pointSize;
    float arcAngle=angle;
 
    vec2 fixed_uv = 
        uv * vec2(depthMap_crop.z - depthMap_crop.x, depthMap_crop.w - depthMap_crop.y) + 
        depthMap_crop.xy;
    //Curve the plane
    vec3 new_pos=position;
    float AA=arcAngle*(3.14/180.0);//ArcAngle
    float theta=((AA)*fixed_uv.x)-(AA/2.0);
    theta-=3.14/2.0;//rotate by 90degrees
 
    float r=((1920.0*stretch)/AA)-(get_depth(fixed_uv)*depth);
 
    new_pos.x=r*cos(theta);
    new_pos.y=position.y;
    new_pos.z=r*sin(theta);
 
 
    gl_Position = projectionMatrix * modelViewMatrix * vec4(new_pos, 1.0);
    gl_PointSize = pointsize;
    vUv = uv;
}