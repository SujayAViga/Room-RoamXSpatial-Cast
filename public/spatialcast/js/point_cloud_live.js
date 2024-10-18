import * as THREE from "./three.module.js";
import CameraControls from './camera-controls.module.js';
import { checkCookie } from "./livePlayer.js";
import { stringChecker } from "./livePlayer.js";

CameraControls.install( { THREE: THREE } );

var renderer, scene, camera, controls, obj, gui, resultFlag, clock;
var video, video_texture, player, mindepth, maxdepth, width, height, new_widthSegment, new_heightSegment;
var vertShader, fragShader, shader_mat, mesh;
var intZoom, intPolar, intAzimuth;
var valPointSize, valDepth, valCurve;
var zoomin, zoomout, topangle, bottomangle, leftangle, rightangle;
var minZ, maxZ, minP, maxP, minA, maxA, PSize, Dep, Cur;
var showSave = true;
var streamId, org;

let widthSegment=1000;
let heightSegment=Math.round(widthSegment/1.7777);
 
function isMobileDevice() {
    const userAgent = navigator.userAgent;
    const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
    return mobileRegex.test(userAgent);
}
const isMobile = isMobileDevice();

async function init({showConfigureControls}) {
    //cam
    scene = new THREE.Scene();
    clock = new THREE.Clock();
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 10000);

    renderer = new THREE.WebGLRenderer({
        canvas: document.querySelector('#bg'),
    })
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth/1.01, window.innerHeight/1.05);
    renderer.outputEncoding = THREE.sRGBEncoding;
    camera.position.setZ(2000);
    renderer.render(scene, camera);
    
    width = localStorage.getItem('width');
    height = localStorage.getItem('height');

    width = parseInt(width);
    height = parseInt(height);

    const geometry = new THREE.PlaneGeometry(width, height, widthSegment, heightSegment);

    video = document.getElementById("my-video");

    let videoSrc = localStorage.getItem("source");
    player = videojs('my-video');
    player.src(videoSrc);
    player.hlsQualitySelector();
    player.play();

    video_texture = new THREE.VideoTexture(video);
    video_texture.minFi1ter = THREE.LinearFi1ter;
    video_texture.magFi1ter = THREE.LinearFi1ter;

    // Y-flipped
    const img_colormap_crop_AA1 = new THREE.Vector2(0, .5);
    const img_colormap_crop_BB1 = new THREE.Vector2(1, 1.);
    const img_depthmap_crop_AA1 = new THREE.Vector2(0, 0);
    const img_depthmap_crop_BB1 = new THREE.Vector2(1, .5);

    maxdepth = localStorage.getItem('maxd');
    mindepth = localStorage.getItem('mind');
    minZ = localStorage.getItem('minZ');
    maxZ = localStorage.getItem('maxZ');
    minP = localStorage.getItem('minP');
    maxP = localStorage.getItem('maxP');
    minA = localStorage.getItem('minA');
    maxA = localStorage.getItem('maxA');
    PSize = localStorage.getItem('pointSize');
    Dep = localStorage.getItem('depth');
    Cur = localStorage.getItem('curve');

    mindepth = parseFloat(mindepth);
    maxdepth = parseFloat(maxdepth);
    console.log(maxdepth);

    mindepth *= 100;
    maxdepth *= 100;

    if (PSize !== 'undefined' && valDepth !== 'undefined' && valCurve !== 'undefined') {
        valPointSize = parseFloat(PSize);
        valDepth = parseFloat(Dep);
        valCurve = parseFloat(Cur);
    }
    else {
        valPointSize = 2.2;
        valDepth = 0.14;
        valCurve = 4.8;
    }

    let shadersVert = localStorage.getItem('vert');
    vertShader = decrypt("1V6C5584bSn", shadersVert);

    let shadersFrag = localStorage.getItem('frag');
    fragShader = decrypt("1F6c5584bSn", shadersFrag);

    shader_mat = new THREE.RawShaderMaterial({
        uniforms: {
            colorMap: {
                value: video_texture
            },
            colorMap_crop: {
                value: [img_colormap_crop_AA1.x, img_colormap_crop_AA1.y, img_colormap_crop_BB1.x, img_colormap_crop_BB1.y]
            },
            depthMap: {
                value: video_texture
            },
            depthMap_crop: {
                value: [img_depthmap_crop_AA1.x, img_depthmap_crop_AA1.y, img_depthmap_crop_BB1.x, img_depthmap_crop_BB1.y]
            },
            maxdepth: {
                value: maxdepth
            },
            mindepth: {
                value: mindepth
            },
            pointSize: {
                value: valPointSize
            },
            depth: {
                value: valDepth
            },
            curve: {
                value: valCurve
            }
        },
        vertexShader: vertShader,
        fragmentShader: fragShader,
        side:THREE.DoubleSide
    });

    controls = new CameraControls(camera, renderer.domElement);

    let valminZ = parseFloat(minZ)
    let valmaxZ = parseFloat(maxZ)
    let valminP = parseFloat(minP)
    let valmaxP = parseFloat(maxP)
    let valminA = parseFloat(minA)
    let valmaxA = parseFloat(maxA)

    if(showConfigureControls && showConfigureControls !== "false"){

        let email = '';
        let password = '';

        obj = { 
            IntZoomArea: controls.distance/100,
            ZoomIn: valminZ/100, 
            ZoomOut: valmaxZ/100, 
            IntPanArea: controls.polarAngle*57.29,
            TopAngle: valminP*57.29, 
            BottomAngle: valmaxP*57.29, 
            IntTiltArea: controls.azimuthAngle*57.29,
            LeftAngle: valminA*57.29, 
            RightAngle: valmaxA*57.29,
            PointSize: valPointSize,
            Depth: valDepth,
            Curve: valCurve,
            Email: email, Password: password, 
            login: function() {login()}, 
            save: function() {saveAngles()}
        };

        gui = new dat.GUI();
        const ZoomFolder = gui.addFolder('Zoom');
        intZoom = ZoomFolder.add(obj, 'IntZoomArea', obj.ZoomIn, obj.ZoomOut);
        zoomin = ZoomFolder.add(obj, 'ZoomIn');
        zoomout = ZoomFolder.add(obj, 'ZoomOut');
        zoomin.name('ZoomIn(0-30)');
        zoomout.name('ZoomOut(30-100)');
        ZoomFolder.__ul.childNodes[2].childNodes[0].childNodes[1].classList += ' longText';
        ZoomFolder.__ul.childNodes[2].childNodes[0].childNodes[0].classList += ' longText';
        ZoomFolder.__ul.childNodes[3].childNodes[0].childNodes[1].classList += ' longText';
        ZoomFolder.__ul.childNodes[3].childNodes[0].childNodes[0].classList += ' longText';

        const PolarFolder = gui.addFolder('Pan');
        intPolar = PolarFolder.add(obj, 'IntPanArea', obj.TopAngle, obj.BottomAngle)
        topangle = PolarFolder.add(obj, 'TopAngle');
        bottomangle = PolarFolder.add(obj, 'BottomAngle');
        topangle.name('TopAngle(0, 90)');
        bottomangle.name('BottomAngle(90, 180)');
        PolarFolder.__ul.childNodes[2].childNodes[0].childNodes[1].classList += ' longText';
        PolarFolder.__ul.childNodes[2].childNodes[0].childNodes[0].classList += ' longText';
        PolarFolder.__ul.childNodes[3].childNodes[0].childNodes[1].classList += ' longText';
        PolarFolder.__ul.childNodes[3].childNodes[0].childNodes[0].classList += ' longText';

        const AzimuthFolder = gui.addFolder('Tilt');
        intAzimuth = AzimuthFolder.add(obj, 'IntTiltArea', obj.LeftAngle, obj.RightAngle)
        leftangle = AzimuthFolder.add(obj, 'LeftAngle'); 
        rightangle = AzimuthFolder.add(obj, 'RightAngle');
        leftangle.name('LeftAngle(-360, 0)');
        rightangle.name('Right(0, 360)');
        AzimuthFolder.__ul.childNodes[2].childNodes[0].childNodes[1].classList += ' longText';
        AzimuthFolder.__ul.childNodes[2].childNodes[0].childNodes[0].classList += ' longText';
        AzimuthFolder.__ul.childNodes[3].childNodes[0].childNodes[1].classList += ' longText';
        AzimuthFolder.__ul.childNodes[3].childNodes[0].childNodes[0].classList += ' longText';

        const DevFolder = gui.addFolder('Dev');
        DevFolder.add(obj, 'PointSize', 1.0, 5.0, 0.1);
        DevFolder.add(obj, 'Depth', 0.1, 1.0, 0.1);
        DevFolder.add(obj, 'Curve', 0.2, 30.0, 0.1);

        gui.add(obj, 'Email');
        var passField = gui.add(obj, 'Password');
        gui.add(obj, 'login');

        var inputElement = passField.domElement.firstChild;
        var style = getComputedStyle(inputElement, null).cssText;
        inputElement.type = "password";
        inputElement.style.cssText = style;
    }

    mesh = new THREE.Points(geometry, shader_mat);
    mesh.frustumCulled = false;

    scene.add(mesh);

    controls.minDistance = valminZ;
  	controls.maxDistance = valmaxZ;
  	controls.minPolarAngle = valminP;
  	controls.maxPolarAngle = valmaxP;
  	controls.minAzimuthAngle = valminA;
  	controls.maxAzimuthAngle = valmaxA;
    controls.update();

    window.addEventListener('resize', onWindowResize);
    animate();

    streamId = localStorage.getItem("streamid");
    org = localStorage.getItem("org");
    let timeStamp = player.currentTime();
    
    checkCookie()
    .then(([uuid, ip]) => {
        ddLogOnRun(uuid, ip, streamId, org, 'org.'+org, timeStamp);
    })
    .catch((error) => {
        console.error(error);
    })

    let previousTime = 0;

    setInterval(function() {
        if (!player.paused()){
            let currentTime = player.currentTime();

            let currTimeInMinutes = currentTime/60;

            let intCurTime = Math.trunc(currTimeInMinutes);

            if (intCurTime !== previousTime) {
                checkCookie()
                .then(([uuid, ip]) => {
                      ddLogOnRun(uuid, ip, streamId, org, 'org.'+org, intCurTime);
                })
                .catch((error) => {
                    console.error(error);
                })
            }
            previousTime = intCurTime;
        }
    }, 30000);
};

//Mantain FPS Controller
setInterval(maintainFPS,8_000);
 
let frames=0;
let FPS=0;
let prevTime = performance.now();
const aspectRatio=1.7777;//(16:9)
const variable=100;
 
function maintainFPS(){
    if(mesh != undefined){
        if(FPS<=25 && isMobile && widthSegment>=540 && heightSegment>=260){
            new_widthSegment=widthSegment-variable;
        }
        else if(FPS>=35 && isMobile && widthSegment<=1920 && heightSegment<=1080) {
            new_widthSegment=widthSegment+variable;
        }
        else if(FPS>=35 && isMobile == false && widthSegment<=1920 && heightSegment<=1080) {
            new_widthSegment=widthSegment+variable;
        }
        else if(FPS<=25 && isMobile == false && widthSegment>=540 && heightSegment>=260) {
            new_widthSegment=widthSegment-variable;
        }
        new_heightSegment=Math.round(new_widthSegment/aspectRatio);
        widthSegment=new_widthSegment;
        heightSegment=new_heightSegment;
        mesh.geometry = new THREE.PlaneGeometry(width, height, widthSegment, heightSegment);
    }
    else {
        console.log('mesh undefined');
    }
    let resoLabel = document.getElementById("resoLabel");
    resoLabel.textContent = `widthSegment: ${widthSegment}, heightSegment: ${heightSegment}`;
}
 
function getFPS(){
    const currentTime = performance.now();
    frames++;
    let fpsLabel = document.getElementById("fpsLabel");
    if (currentTime >= prevTime + 1000) {
      FPS = Math.round((frames * 1000) / (currentTime - prevTime));
      fpsLabel.textContent = `FPS: ${FPS}`;
      frames = 0;
      prevTime = currentTime;
    }
}

function animate() {
    const delta = clock.getDelta();
    controls.update(delta);
    requestAnimationFrame(animate);
    render();
    getFPS();
    controlsGui({showConfigureControls: resultFlag || true});
}

function render() 
{ 
  if ( video.readyState === video.HAVE_ENOUGH_DATA ) 
  {
    if ( video_texture ) 
      video_texture.needsUpdate = true;
  }
  renderer.render( scene, camera );
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth/1.01, window.innerHeight/1.05);
    renderer.outputEncoding = THREE.sRGBEncoding;
}

async function login() {
    let email = obj.Email;
    let password = obj.Password;
    const loginUrl = "https://us-central1-volumetric-streaming-feed1.cloudfunctions.net/webApp/v2/login/";
    let loginData = {email: email, password: password};
    const loginreqData = {method: 'POST', body: JSON.stringify(loginData), headers: {'Content-Type': 'application/json',},};
    var loginreq = await fetch(loginUrl, loginreqData);    
    if (loginreq.status == 200) {
        console.log('accepted');
        if (showSave === true){
            gui.add(obj, 'save');
            showSave = false;
        }
    }
    else {
        alert('Wrong Email/Password');
    }
}

async function saveAngles() {
    let SId = localStorage.getItem('streamid');
    const angleurl = 'https://us-central1-volumetric-streaming-feed1.cloudfunctions.net/webApp/v2/stream/'+SId;
    let angData = {
        minDistance: mindepth/100,
        maxDistance: maxdepth/100,
        sourceWidth: width,
        sourceHeight: height,
        minPolarAngle: obj.TopAngle/57.29,
        maxPolarAngle: obj.BottomAngle/57.29,
        minAzimuthAngle: obj.LeftAngle/57.29,
        maxAzimuthAngle: obj.RightAngle/57.29,
        minZoom: obj.ZoomIn*100,
        maxZoom: obj.ZoomOut*100,
        pointSize: obj.PointSize,
        depth: obj.Depth,
        curve: obj.Curve,
    }
    let angreqData = {method: 'PATCH', body: JSON.stringify(angData), headers: {'Content-Type': 'application/json',},};
    const angRequest = await fetch(angleurl, angreqData);
    if (angRequest.status == 200){
        alert('Saved');
    }
}

function controlsGui({showConfigureControls}) {
    if(showConfigureControls && showConfigureControls !== "false"){
        controls.distance = intZoom.getValue()*100;
        if(obj.ZoomIn < 0){
            zoomin.setValue(0);
        }
        else if(obj.ZoomIn > 30){
            zoomin.setValue(30);
        }
        if(obj.ZoomOut < 30){
            zoomout.setValue(30);
        }
        else if(obj.ZoomOut > 100){
            zoomout.setValue(100);
        }
        intZoom.min(obj.ZoomIn);
        intZoom.max(obj.ZoomOut);

        controls.polarAngle = intPolar.getValue()/57.29;
        if(obj.TopAngle < 0){
            topangle.setValue(0);
        }
        else if(obj.TopAngle > 90){
            topangle.setValue(90);
        }
        if(obj.BottomAngle < 90){
            bottomangle.setValue(90);
        }
        else if(obj.BottomAngle > 180){
            bottomangle.setValue(180);
        }
        intPolar.min(obj.TopAngle);
        intPolar.max(obj.BottomAngle);

        controls.azimuthAngle = -intAzimuth.getValue()/57.29;
        if(obj.LeftAngle < -360){
            leftangle.setValue(-360);
        }
        else if(obj.LeftAngle > 0){
            leftangle.setValue(0);
        }
        if(obj.RightAngle < 0){
            rightangle.setValue(0);
        }
        else if(obj.RightAngle > 360){
            rightangle.setValue(360);
        }
        intAzimuth.min(obj.LeftAngle);
        intAzimuth.max(obj.RightAngle);

        shader_mat.uniforms.pointSize.value = obj.PointSize;
        shader_mat.uniforms.depth.value = obj.Depth;
        shader_mat.uniforms.curve.value = obj.Curve;
    }
}

function decrypt(salt, encoded){
    const textToChars = (text) => text.split("").map((c) => c.charCodeAt(0));
    const applySaltToChar = (code) => textToChars(salt).reduce((a, b) => a ^ b, code);
    return encoded
        .match(/.{1,2}/g)
        .map((hex) => parseInt(hex, 16))
        .map(applySaltToChar)
        .map((charCode) => String.fromCharCode(charCode))
        .join("");
};

function ddLogOnRun(uuid, ip, streamid, orgName, orgSlug, timeStamp) {
    uuid = stringChecker(uuid);
    window.DD_LOGS && window.DD_LOGS.logger.info('Metrics', {uuid: uuid, identifier: 'browser-metrics', ip: ip, streamid: streamid, orgName: orgName, orgSlug: orgSlug, type: 'live', timeStamp: timeStamp});
}

setTimeout(() => {
    const params = new URLSearchParams(window.location.href);
    resultFlag = params.get('showControl');
    init({showConfigureControls: resultFlag || true});
}, 5000);