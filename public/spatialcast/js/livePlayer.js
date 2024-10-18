import { v4 as uuidv4 } from 'https://cdn.jsdelivr.net/npm/uuid@8.3.2/dist/esm-browser/index.js';

async function pointCloud() {
  var head = document.getElementsByTagName('head')[0];
  var script = document.createElement('script');
  script.type = 'module';
  script.src = "../js/point_cloud_live.js";
  script.charset = 'utf-8';

  head.appendChild(script);
}

async function setCookie() {
  const uuid = uuidv4();
  const ip = await fetchData();
  document.cookie = `uuid=${uuid}`;
  document.cookie = `ip=${ip}`;
  return {uuid, ip};
}

export function checkCookie() {
  return new Promise((resolve, reject) =>{
    let uuid0, ip0;
    let uuid = document.cookie.match('(^|;)\\s*uuid\\s*=\\s*([^;]+)');
    let ip = document.cookie.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/);

    if (uuid) {
    uuid0 = uuid[0];
    ip0 = ip[0];
    resolve([uuid0, ip0]);
    } else {
    setCookie()
    .then((result) => {
        uuid0 = result.uuid;
        ip0 = result.ip;
        resolve([uuid0, ip0]);
    })
    .catch((error) => {
        console.error(error);
    });
    }
});
}

export function stringChecker(string) {
let newStr = String(string);
if (newStr.startsWith("uuid=")) {
    return newStr.slice(5);
}
else {
    return newStr;
}
}

function ddLog(uuid, ip, streamid, orgName, orgSlug) {
uuid = stringChecker(uuid);
window.DD_LOGS && window.DD_LOGS.logger.info('Info', {uuid: uuid, identifier: 'viewer-info', ip: ip, streamid: streamid, orgName: orgName, orgSlug: orgSlug, type: 'live'});
}

async function fetchData() {
try {
    const ip = await getIP();
    return ip;
    // You can use the IP address or perform any other actions here
} catch (error) {
    console.error("Error getting IP address:", error);
}
}

function getIP() {
return new Promise((resolve, reject) => {
    $(document).ready(() => {
    $.getJSON("https://api.ipify.org?format=json", function (data) {
        resolve(data.ip);
    });
    });
});
}

async function initURL() {
    const urlParams = new URLSearchParams(window.location.search);
    let getstreamid = urlParams.get('streamid');
    const stream = "https://us-central1-volumetric-streaming-dev.cloudfunctions.net/webApp/v2/stream/" + getstreamid + "/";
    let org = null;
    let streamdata = null;
    let subFolder = null;
    let maxdist = null;
    let mindist = null;
    let width = null;
    let height = null;
    let minZoom = null;
    let maxZoom = null;
    let minPolarAngle = null;
    let maxPolarAngle = null;
    let minAzimuthAngle = null;
    let maxAzimuthAngle = null;
    let pointSize = null;
    let depth = null;
    let curve = null;

    const result = await fetch(stream);
    const data = await result.json();
    streamdata = data.streamingData;
    org = streamdata.rtmpURLOrgName;
    subFolder = data.lastSubFolder;
    maxdist = data.maxDistance;
    mindist = data.minDistance;
    width = data.sourceWidth;
    height = data.sourceHeight;
    minZoom = data.minZoom;
    maxZoom = data.maxZoom;
    minPolarAngle = data.minPolarAngle;
    maxPolarAngle = data.maxPolarAngle;
    minAzimuthAngle = data.minAzimuthAngle;
    maxAzimuthAngle = data.maxAzimuthAngle;
    pointSize = data.pointSize;
    depth = data.depth;
    curve = data.curve;
    localStorage.setItem('streamid', getstreamid);
    localStorage.setItem('org', org);
    localStorage.setItem('maxd', maxdist);
    localStorage.setItem('mind', mindist);
    localStorage.setItem('width', width);
    localStorage.setItem('height', height);
    localStorage.setItem('minZ', minZoom);
    localStorage.setItem('maxZ', maxZoom);
    localStorage.setItem('minP', minPolarAngle);
    localStorage.setItem('maxP', maxPolarAngle);
    localStorage.setItem('minA', minAzimuthAngle);
    localStorage.setItem('maxA', maxAzimuthAngle);
    localStorage.setItem("pointSize", pointSize);
    localStorage.setItem("depth", depth);
    localStorage.setItem("curve", curve);

    const playBack = 'https://us-central1-volumetric-streaming-dev.cloudfunctions.net/webApp/v2/stream/'+ getstreamid +'/getPlayback/';

    const playResult = await fetch(playBack, {method: "POST"});

    const playData = await playResult.json();
    var playUrl = null;
    if (playData.code == 400){
        alert(playData.message);
    }
    else{
        playUrl = playData.playbackURL;
    }
    
    var videoSrc = playUrl;
    localStorage.setItem('source', videoSrc);

    const shaders = 'https://us-central1-volumetric-streaming-dev.cloudfunctions.net/webApp/v2/shader/';
    let vertshadData = {shaderName: "Shaders/v01/shader.vert", salt: "1V6C5584bSn"};
    let fragshadData = {shaderName: "Shaders/v01/shader.frag", salt: "1F6c5584bSn"};
    const vertreqData = {method: 'POST', body: JSON.stringify(vertshadData), headers: {'Content-Type': 'application/json',},};
    const fragreqData = {method: 'POST', body: JSON.stringify(fragshadData), headers: {'Content-Type': 'application/json',},};
    const vert = await fetch(shaders, vertreqData);
    const frag = await fetch(shaders, fragreqData);
    let vertjson = await vert.json();
    let fragjson = await frag.json();
    localStorage.setItem('vert', vertjson.data);
    localStorage.setItem('frag', fragjson.data);

    checkCookie()
    .then(([uuid, ip]) => {
        ddLog(uuid, ip, getstreamid, org, 'org.'+org);
    })
    .catch((error) => {
        console.error(error);
    })

    pointCloud();
}
initURL();