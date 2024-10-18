import { v4 as uuidv4 } from 'https://cdn.jsdelivr.net/npm/uuid@8.3.2/dist/esm-browser/index.js';

async function pointCloud() {
  var head = document.getElementsByTagName('head')[0];
  var script = document.createElement('script');
  script.type = 'module';
  script.src = "../js/point_cloud_vod.js";
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
  window.DD_LOGS && window.DD_LOGS.logger.info('Info', {uuid: uuid, identifier: 'viewer-info', ip: ip, streamid: streamid, orgName: orgName, orgSlug: orgSlug, type: 'vod'});
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
  var startTime = performance.now();

  const urlParams = new URLSearchParams(window.location.search);
  let getstreamid = urlParams.get("streamid");
  const fullStream = "https://us-central1-volumetric-streaming-dev.cloudfunctions.net/webApp/v2/stream/getFullStream/get/";
  let shader1Name = "Shaders/v01/shader.vert";
  let salt1 = "1V6C5584bSn";
  let shader2Name = "Shaders/v01/shader.frag";
  let salt2 = "1F6c5584bSn";
  const fullStreamBody = {method: 'POST', body: JSON.stringify({streamId: getstreamid, shaderName1: shader1Name, salt1: salt1, shaderName2: shader2Name, salt2: salt2}), headers: {'Content-Type': 'application/json',},};
  const getFullStream = await fetch(fullStream, fullStreamBody);
  let fullStreamjson = await getFullStream.json();
  let streamData = fullStreamjson.streamData;
  let vodData = fullStreamjson.vodData;

  var videoSrc = null;
  let maxdist = null;
  let mindist = null;
  let width = null;
  let height = null;

  let org = null;
  let vodId = null;
  let streamdata = null;
  let minZoom = null;
  let maxZoom = null;
  let minPolarAngle = null;
  let maxPolarAngle = null;
  let minAzimuthAngle = null;
  let maxAzimuthAngle = null;
  let pointSize = null;
  let depth = null;
  let curve = null;
  // const stream =
  // "https://us-central1-volumetric-streaming-dev.cloudfunctions.net/webApp/v2/stream/" +
  // getstreamid +
  // "/";
  // const streamResult = await fetch(stream);
  // const streamData = await streamResult.json();
  vodId = streamData.defaultLinkedVod;
  if (streamData.streamingData) {
    streamdata = streamData.streamingData;
    org = streamdata.rtmpURLOrgName;
    maxdist = streamData.maxDistance;
    mindist = streamData.minDistance;
    width = streamData.sourceWidth;
    height = streamData.sourceHeight;
    minZoom = streamData.minZoom;
    maxZoom = streamData.maxZoom;
    minPolarAngle = streamData.minPolarAngle;
    maxPolarAngle = streamData.maxPolarAngle;
    minAzimuthAngle = streamData.minAzimuthAngle;
    maxAzimuthAngle = streamData.maxAzimuthAngle;
    pointSize = streamData.pointSize;
    depth = streamData.depth;
    curve = streamData.curve;
  }
  else {
    streamdata = streamData;
    org = vodData.orgName;
    maxdist = streamData.maxDistance;
    mindist = streamData.minDistance;
    width = streamData.sourceWidth;
    height = streamData.sourceHeight;
    minZoom = streamData.minZoom;
    maxZoom = streamData.maxZoom;
    minPolarAngle = streamData.minPolarAngle;
    maxPolarAngle = streamData.maxPolarAngle;
    minAzimuthAngle = streamData.minAzimuthAngle;
    maxAzimuthAngle = streamData.maxAzimuthAngle;
    pointSize = streamData.pointSize;
    depth = streamData.depth;
    curve = streamData.curve;
  }
  
  // const vodInfo = 
  //   "https://us-central1-volumetric-streaming-dev.cloudfunctions.net/webApp/v2/vod/"
  //   + vodId;
  // const vodResult = await fetch(vodInfo);
  // const vodData = await vodResult.json();
  // let vodStreamdata = vodData.data;
  let hlsPath = vodData.hlsPath;
  localStorage.setItem("streamid", getstreamid);
  localStorage.setItem("org", org);
  localStorage.setItem("maxd", maxdist);
  localStorage.setItem("mind", mindist);
  localStorage.setItem("width", width);
  localStorage.setItem("height", height);
  localStorage.setItem("minZ", minZoom);
  localStorage.setItem("maxZ", maxZoom);
  localStorage.setItem("minP", minPolarAngle);
  localStorage.setItem("maxP", maxPolarAngle);
  localStorage.setItem("minA", minAzimuthAngle);
  localStorage.setItem("maxA", maxAzimuthAngle);
  localStorage.setItem("pointSize", pointSize);
  localStorage.setItem("depth", depth);
  localStorage.setItem("curve", curve);
  
  videoSrc = hlsPath;
  localStorage.setItem("source", videoSrc);
    
  // const shaders = 'https://us-central1-volumetric-streaming-dev.cloudfunctions.net/webApp/v2/shader/';
  // let vertshadData = {shaderName: "Shaders/v01/shader.vert", salt: "1V6C5584bSn"};
  // let fragshadData = {shaderName: "Shaders/v01/shader.frag", salt: "1F6c5584bSn"};
  // const vertreqData = {method: 'POST', body: JSON.stringify(vertshadData), headers: {'Content-Type': 'application/json',},};
  // const fragreqData = {method: 'POST', body: JSON.stringify(fragshadData), headers: {'Content-Type': 'application/json',},};
  // const vert = await fetch(shaders, vertreqData);
  // const frag = await fetch(shaders, fragreqData);
  // let vertjson = await vert.json();
  // let fragjson = await frag.json();
  // localStorage.setItem('vert', vertjson.data);
  // localStorage.setItem('frag', fragjson.data);
  let vert = fullStreamjson.shader1;
  let frag = fullStreamjson.shader2;
  localStorage.setItem('vert', vert);
  localStorage.setItem('frag', frag);
  
  checkCookie()
  .then(([uuid, ip]) => {
      ddLog(uuid, ip, getstreamid, org, 'org.'+org);
  })
  .catch((error) => {
      console.error(error);
  })

  var endtime = performance.now();
  var totaltime = (endtime-startTime).toFixed(2);
  console.log(`api call time: ${totaltime} ms`);

  pointCloud();
}
initURL();