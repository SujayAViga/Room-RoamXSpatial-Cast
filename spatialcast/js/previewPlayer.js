async function initURL() {
  const urlParams = new URLSearchParams(window.location.search);
  let getstreamid = urlParams.get("streamid");
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
    let player = videojs('my-video');
    player.play();
    player.src(videoSrc);
    player.qualityMenu();
    player.dvrux();
}
initURL();