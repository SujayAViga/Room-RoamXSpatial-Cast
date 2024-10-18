import * as THREE from "./three.module.js";
import CameraControls from './camera-controls.module.js';
import { checkCookie } from "./vodPlayer.js";
import { stringChecker } from "./vodPlayer.js";

CameraControls.install({ THREE: THREE });

var renderer, scene, camera, controls, obj, gui, resultFlag, clock;
var video_texture, mindepth, maxdepth, width, height, new_widthSegment, new_heightSegment;
var vertShader, fragShader, shader_mat, mesh;
var intDolly, intPolar, intAzimuth;
var valPointSize, valDepth, valCurve;
var dollyin, dollyout, topangle, bottomangle, leftangle, rightangle, pointSizeSlider, depthSlider, curveSlider, fovSlider, depthMin, depthMax;
var minZ, maxZ, minP, maxP, minA, maxA, PSize, Dep, Cur;
var meshBehind, mesh1, mesh2, mesh3, mesh4, panelTop, panelBottom, panelLeft, panelRight;
var showSave = true;
var streamId, org;
var fov = 45.0;

let widthSegment = 1500;
let heightSegment = Math.round(widthSegment / 1.7777);

const android = /Android/.test(navigator.userAgent)
if (android) {
    widthSegment = 400;
}

function isMobileDevice() {
    const userAgent = navigator.userAgent;
    const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
    return mobileRegex.test(userAgent);
}
const isMobile = isMobileDevice();
let el = document.createElement('div');
document.body.appendChild(el);

eruda.init({
    container: el,
    tool: ['console', 'elements']
});

var video = document.getElementById("video");
var controlBar = document.getElementById("overlay");
var seekbar = document.getElementById("custom-seekbar");
var duration_entry = document.getElementById("elapsed-duration");
var play_pause_button = document.getElementById("play-button");
var mute_button = document.getElementById("mute-button");
var quality_selector = document.getElementById("quality-selector");
var volume_bar = document.getElementById("volume-bar");
var fullscreenButton = document.getElementById("fullscreen-button");
var exitFullscreenButton = document.getElementById("exitFullscreen-button");
var container = document.getElementById("container");
video.volume = 0.2;
video.muted = true;
volume_bar.value = video.volume * 100;
var buttonClicked = false;
var videoEnded = false;
var loader = document.getElementById("load")

play_pause_button.addEventListener("click", function () {
    if (video.paused || videoEnded) {
        buttonClicked = false;
        videoEnded = false;
        video.play();
        play_pause_button.innerHTML = "<i class='fa fa-pause'></i>";
    }
    else {
        buttonClicked = true;
        video.pause();
        play_pause_button.innerHTML = "<i class='fa fa-play'></i>";
    }
});

video.addEventListener("ended", (event) => {
    play_pause_button.innerHTML = "<i class='fa fa-repeat'></i>";
    videoEnded = true;
});

fullscreenButton.addEventListener('click', () => {
    enterFullscreen();
});

exitFullscreenButton.addEventListener('click', () => {
    exitFullscreen();
});

var fullscreen = false;
function enterFullscreen() {
    fullscreen = true;
    window.parent.postMessage('requestFullscreen', '*');
    fullscreenButton.style.display = 'none';
    exitFullscreenButton.style.display = 'block';
};

function exitFullscreen() {
    fullscreen = false;
    window.parent.postMessage('exitFullscreen', '*');
    fullscreenButton.style.display = 'block';
    exitFullscreenButton.style.display = 'none';
};

let timeoutId;
container.addEventListener("mousemove", () => {
    if (fullscreen){
        controlBar.style.display = 'flex';
    }
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
        if (fullscreen) {
            controlBar.style.display = 'none';
        }
    }, 2000);
});

quality_selector.addEventListener("change", () => qualityChange(quality_selector.value));

function qualityChange(quality) {
    let newQuality;
    if (quality === 'Auto'){
        newQuality = 0;
    }
    else{
        newQuality = parseInt(quality);
    }
    if (newQuality === 0) {
        window.hls.currentLevel = -1;
    }
    else{
        window.hls.levels.forEach((level, levelIndex) => {
            if (level.height === newQuality) {
                console.log("found quality match with " + newQuality);
                window.hls.currentLevel = levelIndex;
            }
        });
    }
};

mute_button.addEventListener("click", function () {
    if (video.muted) {
        video.muted = false;
        mute_button.innerHTML = "<i class='fa fa-volume-up'></i>";
    }
    else {
        video.muted = true;
        mute_button.innerHTML = "<i class='fa fa-volume-mute'></i>";
    }
});

volume_bar.addEventListener("change", function () {
    video.volume = volume_bar.value / 100;
});

seekbar.value = 0;
video.ontimeupdate = function () {
    if (video.duration) {
        var percentage = (video.currentTime / video.duration) * 100;
        seekbar.value = percentage;
        var duration = video.duration - Math.floor(video.currentTime);
        var min = Math.floor(duration / 60);
        var sec = Math.floor(duration % 60);
        sec = sec < 10 ? '0' + sec : sec;
        min = min < 10 ? '0' + min : min;
        duration_entry.textContent = min + ":" + sec;
    }
};

var seekbarChange = false;
seekbar.addEventListener("change", function (e) {
    seekbarChange = true;
    const seekTo = video.duration * (e.target.value / 100);
    video.currentTime = seekTo;
    seekbarChange = false;
});

function detectiPad() {
    const isMac = /Macintosh/.test(navigator.userAgent) && 'ontouchend' in document;

    return isMac;
}

window.addEventListener("resize", orientationCheck);

var orientationChanged = false;
function orientationCheck() {
    if (!detectiPad()){
        if (screen.orientation.type == "portrait-primary") {
            orientationChanged = true;
            video.pause();
            play_pause_button.innerHTML = "<i class='fa fa-play'></i>";
            container.style.display = 'none';
            if (fullscreen){
                exitFullscreen();
            }
        }
        else {
            orientationChanged = false;
            if (isMobile) {
                container.style.display = 'flex';
            }
        }
    }
};

async function init({ showConfigureControls }) {
    //cam
    scene = new THREE.Scene();
    clock = new THREE.Clock();
    camera = new THREE.PerspectiveCamera(fov, window.innerWidth / window.innerHeight, 0.1, 10000);
    
    renderer = new THREE.WebGLRenderer({
        canvas: document.querySelector('#bg'),
    })
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth / 1.01, window.innerHeight / 1.05);
    renderer.outputEncoding = THREE.sRGBEncoding;
    camera.position.setZ(3000);
    // camera.position.setZ(2000);
    renderer.render(scene, camera);

    width = localStorage.getItem('width');
    height = localStorage.getItem('height');

    width = parseInt(width);
    height = parseInt(height);

    const geometry = new THREE.PlaneGeometry(width, height, widthSegment, heightSegment);

    let videoSrc = localStorage.getItem("source");
    const source = document.createElement("source");
    source.id = "video-src";
    source.type = "video/mp4";
    source.src = videoSrc;
    const defaultOptions = {};
    if (Hls.isSupported) {
        console.log('hls supported');
        const hls = new Hls();
        hls.loadSource(videoSrc);
        hls.on(Hls.Events.MANIFEST_PARSED, function (event, data) {
            const availableQualities = hls.levels.map((l) => l.height)
            availableQualities.unshift('Auto');
            for (let i = 0; i < availableQualities.length; i++) {
                const option = document.createElement("option");
                option.value = availableQualities[i];
                option.text = availableQualities[i];
                quality_selector.appendChild(option);
            }
            defaultOptions.quality = {
                default: availableQualities[i],
                options: availableQualities,
                forced: true,
            }
            defaultOptions.i18n = {
                qualityLabel: {
                    0: 'Auto'
                },
            }
            const player = new plyr(video, defaultOptions);
        });
        hls.attachMedia(video);
        video.appendChild(source);
        window.hls = hls;
        video.play();
        play_pause_button.innerHTML = "<i class='fa fa-pause'></i>";
    }
    else {
        console.log('hls not supported');
    }

    video_texture = new THREE.VideoTexture(video);
    video_texture.minFi1ter = THREE.LinearFi1ter;
    video_texture.magFi1ter = THREE.LinearFi1ter;

    // Y-flipped
    const img_colormap_crop_AA1 = new THREE.Vector2(0, .5);
    const img_colormap_crop_BB1 = new THREE.Vector2(1, 1.);
    const img_depthmap_crop_AA1 = new THREE.Vector2(0, 0);
    const img_depthmap_crop_BB1 = new THREE.Vector2(1, .5);

    // ambient effect
    const cropmapA1 = new THREE.Vector2(0, .75);
    const cropmapB1 = new THREE.Vector2(1, 1.); 
    const cropmapA2 = new THREE.Vector2(0, .6);
    const cropmapB2 = new THREE.Vector2(1, .75); 
    const cropmapA3 = new THREE.Vector2(0, .6);
    const cropmapB3 = new THREE.Vector2(.5, 1.); 
    const cropmapA4 = new THREE.Vector2(.5, .6);
    const cropmapB4 = new THREE.Vector2(1, 1.); 

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

    // let shadersVert = localStorage.getItem('vert');
    // vertShader = decrypt("1V6C5584bSn", shadersVert);
    vertShader = await(await fetch('../shaders/shader-prod.vert')).text();
    var vertShader2 = await(await fetch('../shaders/shader2.vert')).text();

    // let shadersFrag = localStorage.getItem('frag');
    // fragShader = decrypt("1F6c5584bSn", shadersFrag);
    fragShader = await(await fetch('../shaders/shader.frag')).text();
    var fragShader2 = await(await fetch('../shaders/shader2.frag')).text();
    var fragShader3 = await(await fetch('../shaders/shader3.frag')).text();
    var fragShader4 = await(await fetch('../shaders/shader4.frag')).text();

    controls = new CameraControls(camera, renderer.domElement);

    let valminZ = parseFloat(minZ)
    let valmaxZ = parseFloat(maxZ)
    let valminP = parseFloat(minP)
    let valmaxP = parseFloat(maxP)
    let valminA = parseFloat(minA)
    let valmaxA = parseFloat(maxA)

    let email = '';
    let password = '';

    obj = {
        IntDollyArea: controls.distance / 100,
        In: valminZ / 100,
        Out: valmaxZ / 100,
        IntPanArea: controls.polarAngle * 57.29,
        TopAngle: valminP * 57.29,
        BottomAngle: valmaxP * 57.29,
        IntTiltArea: controls.azimuthAngle * 57.29,
        LeftAngle: valminA * 57.29,
        RightAngle: valmaxA * 57.29,
        PointSize: valPointSize,
        Depth: valDepth,
        minDepth: 0.09,
        maxDepth: 0.14,
        Curve: valCurve,
        Fov: fov,
        Email: email, Password: password,
        login: function () { login() },
        save: function () { saveAngles() }
    };
    if (showConfigureControls && showConfigureControls !== "false") {

        gui = new dat.GUI();
        const dollyFolder = gui.addFolder('Dolly');
        intDolly = dollyFolder.add(obj, 'IntDollyArea', obj.In, obj.Out);
        dollyin = dollyFolder.add(obj, 'In');
        dollyout = dollyFolder.add(obj, 'Out');
        dollyin.name('In(0-30)');
        dollyout.name('Out(30-100)');
        dollyFolder.__ul.childNodes[2].childNodes[0].childNodes[1].classList += ' longText';
        dollyFolder.__ul.childNodes[2].childNodes[0].childNodes[0].classList += ' longText';
        dollyFolder.__ul.childNodes[3].childNodes[0].childNodes[1].classList += ' longText';
        dollyFolder.__ul.childNodes[3].childNodes[0].childNodes[0].classList += ' longText';

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
        pointSizeSlider = DevFolder.add(obj, 'PointSize', 1.8, 2.2, 0.1);
        depthSlider = DevFolder.add(obj, 'Depth', obj.minDepth, obj.maxDepth, 0.01);
        depthMin = DevFolder.add(obj, 'minDepth');
        depthMax = DevFolder.add(obj, 'maxDepth');
        curveSlider = DevFolder.add(obj, 'Curve', 0.2, 30.0, 0.1);

        const testFolder = gui.addFolder('Test');
        fovSlider = testFolder.add(obj, 'Fov', 20.0, 90.0, 1.0);

        gui.add(obj, 'Email');
        var passField = gui.add(obj, 'Password');
        gui.add(obj, 'login');

        var inputElement = passField.domElement.firstChild;
        var style = getComputedStyle(inputElement, null).cssText;
        inputElement.type = "password";
        inputElement.style.cssText = style;

        intDolly.onChange(function() {
            controls.distance = intDolly.getValue() * 100;
            pointSizeSlider.setValue((1/intDolly.getValue()) * 45);
            depthSlider.setValue(0.01*(intDolly.getValue()-17)+0.01);
        })

        dollyin.onChange(function() {
            if (obj.In < 0) {
                dollyin.setValue(0);
            }
            else if (obj.In > 30) {
                dollyin.setValue(30);
            }
            intDolly.min(obj.In);
        })

        dollyout.onChange(function() {
            if (obj.Out < 30) {
                dollyout.setValue(30);
            }
            else if (obj.Out > 100) {
                dollyout.setValue(100);
            }
            intDolly.max(obj.Out);
        })

        intPolar.onChange(function() {
            controls.polarAngle = intPolar.getValue() / 57.29;
        })

        topangle.onChange(function() {
            if (obj.TopAngle < 0) {
                topangle.setValue(0);
            }
            else if (obj.TopAngle > 90) {
                topangle.setValue(90);
            }
            intPolar.min(obj.TopAngle);
        })

        bottomangle.onChange(function() {
            if (obj.BottomAngle < 90) {
                bottomangle.setValue(90);
            }
            else if (obj.BottomAngle > 180) {
                bottomangle.setValue(180);
            }
            intPolar.max(obj.BottomAngle);
        })

        intAzimuth.onChange(function() {
            controls.azimuthAngle = -intAzimuth.getValue() / 57.29;
        })

        leftangle.onChange(function() {
            if (obj.LeftAngle < -360) {
                leftangle.setValue(-360);
            }
            else if (obj.LeftAngle > 0) {
                leftangle.setValue(0);
            }
            intAzimuth.min(obj.LeftAngle);
        })

        rightangle.onChange(function() {
            if (obj.RightAngle < 0) {
                rightangle.setValue(0);
            }
            else if (obj.RightAngle > 360) {
                rightangle.setValue(360);
            }
            intAzimuth.max(obj.RightAngle);
        })

        pointSizeSlider.onChange(function() {
            shader_mat.uniforms.pointSize.value = obj['PointSize'];
        })

        depthSlider.onChange(function() {
            shader_mat.uniforms.depth.value = obj['Depth'];
        })

        depthMin.onChange(function() {
            if (obj['minDepth'] < 0){
                obj['minDepth'] = 0;
            }
            depthSlider.min(obj['minDepth']);
        })

        depthMax.onChange(function() {
            depthSlider.max(obj['maxDepth']);
        })
        
        curveSlider.onChange(function() {
            shader_mat.uniforms.curve.value = obj['Curve'];
        })

        fovSlider.onChange(function() {
            camera.fov = obj.Fov;
            camera.updateProjectionMatrix();
        })
    }

    const boxGeo1 = new THREE.PlaneGeometry(600, height-60);
    const boxGeo2 = new THREE.PlaneGeometry(width-90, 600);

    const metallicMaterial = new THREE.ShaderMaterial({
        vertexShader: vertShader2,
        fragmentShader: fragShader4,
        side: THREE.BackSide,
        // wireframe: true
    });

    mesh1 = new THREE.Mesh(boxGeo1, metallicMaterial);
    mesh2 = new THREE.Mesh(boxGeo1, metallicMaterial);
    mesh3 = new THREE.Mesh(boxGeo2, metallicMaterial);
    mesh4 = new THREE.Mesh(boxGeo2, metallicMaterial);

    mesh1.rotateY(-1.57);
    mesh1.position.setX(width / 2.1);
    mesh2.rotateY(1.57);
    mesh2.position.setX(-width / 2.1);
    mesh3.rotateX(1.57);
    mesh3.position.setY(height / 2.1);
    mesh4.rotateX(-1.57);
    mesh4.position.setY(-height / 2.1);

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
        side: THREE.DoubleSide,
    });

    mesh = new THREE.Points(geometry, shader_mat);
    mesh.frustumCulled = false;
    mesh.position.setZ(-360);

    var shader_mat2 = new THREE.ShaderMaterial({
        uniforms: {
            colorMap: {
                value: video_texture
            },
            colorMap_crop: {
                value: [img_colormap_crop_AA1.x, img_colormap_crop_AA1.y, img_colormap_crop_BB1.x, img_colormap_crop_BB1.y]
            },
            opacity: {
                value: 0.5
            }
        },
        vertexShader: vertShader2,
        fragmentShader: fragShader3,
        side: THREE.DoubleSide,
        transparent: true,
        depthWrite: false,
        blending: THREE.NormalBlending,
        // wireframe: true
    });

    var geoBehind = new THREE.PlaneGeometry(width/1.05, height/1.06);
    meshBehind = new THREE.Mesh(geoBehind, shader_mat2);
    meshBehind.frustumCulled = false;
    meshBehind.position.setZ(-300);
    
    function createMaterial(mapA, mapB) {
        const ambiantMaterial = new THREE.ShaderMaterial({
            uniforms: {
                colorMap_crop: {
                    value: [mapA.x, mapA.y, mapB.x, mapB.y]
                },
                tDiffuse: {
                    value: video_texture
                },
                resolution: {
                    value: new THREE.Vector2(512.0, 512.0)
                },
                blurRadius: {
                    value: 15.0
                },
                brightness: {
                    value: 0.5
                }
            },
            vertexShader: vertShader2,
            fragmentShader: fragShader2,
            transparent: true,
            side: THREE.FrontSide,
            // wireframe: true
        })
        
        return ambiantMaterial;
    }
    
    const ambient_mat1 = createMaterial(cropmapA1, cropmapB1);
    const ambient_mat2 = createMaterial(cropmapA2, cropmapB2);
    const ambient_mat3 = createMaterial(cropmapA3, cropmapB3);
    const ambient_mat4 = createMaterial(cropmapA4, cropmapB4);
    
    panelTop = new THREE.Mesh(boxGeo2, ambient_mat1);
    panelTop.rotateX(1.57);
    panelTop.position.set(0, (height / 2.1)-10, 0);
    panelBottom = new THREE.Mesh(boxGeo2, ambient_mat2);
    panelBottom.rotateX(-1.57);
    panelBottom.position.set(0, (-height / 2.1)+10, 0);
    panelLeft = new THREE.Mesh(boxGeo1, ambient_mat3);
    panelLeft.rotateY(1.57);
    panelLeft.position.set((-width / 2.1)+10, 0, 0);
    panelRight = new THREE.Mesh(boxGeo1, ambient_mat4);
    panelRight.rotateY(-1.57);
    panelRight.position.set((width / 2.1)-10, 0, 0);

    const geo = new THREE.BoxGeometry(100, 100, 100);
    const material = new THREE.MeshBasicMaterial({color: 0x00ff00});
    const cube = new THREE.Mesh(geo, material);
    cube.position.setZ(-1000);
    
    scene.add(mesh);
    scene.add(mesh1);
    scene.add(mesh2);
    scene.add(mesh3);
    scene.add(mesh4);
    scene.add(meshBehind);
    scene.add(panelTop);
    scene.add(panelBottom);
    scene.add(panelLeft);
    scene.add(panelRight);
    // scene.add(cube);
    
    controls.minDistance = valminZ;
    controls.maxDistance = valmaxZ;
    controls.minPolarAngle = valminP;
    controls.maxPolarAngle = valmaxP;
    controls.minAzimuthAngle = valminA;
    controls.maxAzimuthAngle = valmaxA;

    controls.addEventListener('control', function() {
        let zoomValue = controls.distance/100;
        obj['PointSize'] = (1/zoomValue)*45;
        if (obj['PointSize'] < 1.8){
            obj['PointSize'] = 1.8;
        }
        else if (obj['PointSize'] > 2.2) {
            obj['PointSize'] = 2.2;
        }
        obj['Depth'] = 0.01*(zoomValue-17)+0.01;
        if (obj['Depth'] < obj.minDepth){
            obj['Depth'] = obj.minDepth;
        }
        else if (obj['Depth'] > obj.maxDepth) {
            obj['Depth'] = obj.maxDepth;
        }
        shader_mat.uniforms.pointSize.value = obj['PointSize'];
        shader_mat.uniforms.depth.value = obj['Depth'];
    })

    controls.update();

    window.addEventListener('resize', onWindowResize);
    animate();
    orientationCheck();
    controlBar.style.display = 'flex';
    loader.style.display = 'none';
    // setInterval(segmentCheck, 1_000);

    streamId = localStorage.getItem("streamid");
    org = localStorage.getItem("org");
    let timeStamp = parseInt(seekbar.value / 60);

    checkCookie()
        .then(([uuid, ip]) => {
            ddLogOnRun(uuid, ip, streamId, org, 'org.' + org, timeStamp);
        })
        .catch((error) => {
            console.error(error);
        })

    let previousTime = 0;

    setInterval(function () {
        if (!video.paused) {
            let intCurTime = parseInt(seekbar.value / 60);
            if (intCurTime !== previousTime) {
                checkCookie()
                    .then(([uuid, ip]) => {
                        ddLogOnRun(uuid, ip, streamId, org, 'org.' + org, intCurTime);
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
setInterval(maintainFPS, 8_000);

let frames = 0;
let FPS = 0;
let prevTime = performance.now();
const aspectRatio = 1.7777;//(16:9)
const variable = 100;

function maintainFPS() {
    if (mesh != undefined) {
        if (FPS <= 25 && isMobile && widthSegment >= 540) {
            new_widthSegment = widthSegment - variable;
        }
        else if (FPS >= 30 && isMobile && widthSegment <= 3020) {
            new_widthSegment = widthSegment + variable;
        }
        else if (FPS >= 30 && isMobile == false && widthSegment <= 3020) {
            new_widthSegment = widthSegment + variable;
        }
        else if (FPS <= 25 && isMobile == false && widthSegment >= 540) {
            new_widthSegment = widthSegment - variable;
        }
        new_heightSegment = Math.round(new_widthSegment / aspectRatio);
        widthSegment = new_widthSegment;
        heightSegment = new_heightSegment;
        mesh.geometry = new THREE.PlaneGeometry(width, height, widthSegment, heightSegment);
    }
    else {
        console.log('mesh undefined');
    }
    let resoLabel = document.getElementById("resoLabel");
    resoLabel.textContent = `widthSegment: ${widthSegment}, heightSegment: ${heightSegment}`;
}

function getFPS() {
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

function segmentCheck() {
    if (widthSegment<900) {
        scene.remove(mesh1);
        scene.remove(mesh2);
        scene.remove(mesh3);
        scene.remove(mesh4);
        // scene.remove(meshBehind);
        scene.remove(panelTop);
        scene.remove(panelBottom);
        scene.remove(panelLeft);
        scene.remove(panelRight);
    }
    else {
        scene.add(mesh1);
        scene.add(mesh2);
        scene.add(mesh3);
        scene.add(mesh4);
        // scene.add(meshBehind);
        scene.add(panelTop);
        scene.add(panelBottom);
        scene.add(panelLeft);
        scene.add(panelRight);
    }
}

function animate() {
    const delta = clock.getDelta();
    controls.update(delta);
    requestAnimationFrame(animate);
    render();
    if (!buttonClicked && video.paused && !seekbarChange && !orientationChanged && !videoEnded) {
        console.log('video paused');
        video.play();
        play_pause_button.innerHTML = "<i class='fa fa-pause'></i>";
    }
    getFPS();
}

function render() {
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
        if (video_texture)
            video_texture.needsUpdate = true;
    }
    renderer.render(scene, camera);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth / 1.01, window.innerHeight / 1.05);
    renderer.outputEncoding = THREE.sRGBEncoding;
}

async function login() {
    let email = obj.Email;
    let password = obj.Password;
    const loginUrl = "https://us-central1-volumetric-streaming-dev.cloudfunctions.net/webApp/v2/login/";
    let loginData = { email: email, password: password };
    const loginreqData = { method: 'POST', body: JSON.stringify(loginData), headers: { 'Content-Type': 'application/json', }, };
    var loginreq = await fetch(loginUrl, loginreqData);
    if (loginreq.status == 200) {
        console.log('accepted');
        if (showSave === true) {
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
    const angleurl = 'https://us-central1-volumetric-streaming-dev.cloudfunctions.net/webApp/v2/stream/' + SId + '/';
    let angData = {
        minDistance: mindepth / 100,
        maxDistance: maxdepth / 100,
        sourceWidth: width,
        sourceHeight: height,
        minPolarAngle: obj.TopAngle / 57.29,
        maxPolarAngle: obj.BottomAngle / 57.29,
        minAzimuthAngle: obj.LeftAngle / 57.29,
        maxAzimuthAngle: obj.RightAngle / 57.29,
        minZoom: obj.In * 100,
        maxZoom: obj.Out * 100,
        pointSize: obj.PointSize,
        depth: obj.Depth,
        curve: obj.Curve,
    }
    let angreqData = { method: 'PATCH', body: JSON.stringify(angData), headers: { 'Content-Type': 'application/json', }, };
    const angRequest = await fetch(angleurl, angreqData);
    if (angRequest.status == 200) {
        alert('Saved');
    }
}

function decrypt(salt, encoded) {
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
    window.DD_LOGS && window.DD_LOGS.logger.info('Metrics', { uuid: uuid, identifier: 'browser-metrics', ip: ip, streamid: streamid, orgName: orgName, orgSlug: orgSlug, type: 'vod', timeStamp: timeStamp });
}

setTimeout(() => {
    const params = new URLSearchParams(window.location.href);
    resultFlag = params.get('showControl');
    init({ showConfigureControls: resultFlag || true });
}, 5000);