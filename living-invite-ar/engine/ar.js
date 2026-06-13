/* ============================================================================
   LIVING INVITE — ANCHORED AR ENGINE  (rebuilt on the proven V1 skeleton)
   ----------------------------------------------------------------------------
   Transparency + full-screen camera are solved exactly the way the working
   Living Album (V1) does it:
     • the <a-scene> is INJECTED into <div id="ar-container">, so MindAR appends
       the camera <video> into that container (not <body>);
     • CSS forces a-scene / canvas / video to fill the screen with object-fit:cover
       (this is what fixes the half-black camera);
     • autoStart:false, then sys.start() is called INSIDE the Begin tap.
   On top of that skeleton we anchor the decoration (gold frame, name ribbon,
   caption ribbon, diamond arrows) as children of the image target, and play the
   film first, then the photos.
   URL: ?card=<folder>   &preview=1 (skip camera to check the design)
   ========================================================================== */
(function () {
  "use strict";

  var qs = new URLSearchParams(location.search);
  var CARD = qs.get("card") || "demo-emerald-5";
  var PREVIEW = qs.get("preview") === "1";
  var CARD_PATH = "cards/" + CARD + "/";
  var FRAME_OVERRIDE = qs.get("frame") || "";   // optional ?frame=royal-gold for quick preview

  var THEMES = {
    emerald:  { bg1:"#06352a", bg2:"#021c16", ink:"#f6efe0", backing:"assets/backing-emerald.jpg" },
    sapphire: { bg1:"#0a2247", bg2:"#05122b", ink:"#eef2fb", backing:"assets/backing-sapphire.jpg" }
  };
  var GOLD = ["#f5e6a5", "#e6c868", "#c79b34", "#8f6e22"];

  // anchored stage geometry (A-Frame units; target width = 1.0)
  var STAGE = {
    backW:1.00, backH:1.30, frameW:1.10, frameH:1.40,
    innerW:0.86, innerH:1.12,
    ribTopY:0.82, ribBotY:-0.82, arrowX:0.68
  };

  var byId = function (id) { return document.getElementById(id); };

  var S = {
    theme:"emerald", palette:THEMES.emerald,
    coupleNames:"", tagline:"",
    items:[], index:0, inView:false, soundOn:true, started:false
  };

  // ===========================================================================
  document.addEventListener("DOMContentLoaded", function () {
    wireButtons();
    showScreen("loading");
    loadConfig();
  });

  function loadConfig() {
    fetch(CARD_PATH + "config.json", { cache:"no-store" })
      .then(function (r){ if(!r.ok) throw new Error("config "+r.status); return r.json(); })
      .then(applyConfig)
      .catch(function (e){
        console.error("[invite]", e);
        showError("Couldn't load this card", "Check the folder name: " + CARD);
      });
  }

  function applyConfig(cfg) {
    S.theme = (cfg.theme && THEMES[cfg.theme]) ? cfg.theme : "emerald";
    S.palette = THEMES[S.theme];
    S.coupleNames = cfg.coupleNames || "Our Wedding";
    S.tagline = cfg.tagline || "";
    S.items = (cfg.playlist || []).filter(Boolean);
    if (!S.items.length) { showError("Empty card","No photos or video in the playlist."); return; }

    var root = document.documentElement.style;
    root.setProperty("--bg1", S.palette.bg1);
    root.setProperty("--bg2", S.palette.bg2);
    root.setProperty("--ink", S.palette.ink);
    if (PREVIEW) document.body.style.background =
      "radial-gradient(120% 90% at 50% 28%, "+S.palette.bg1+" 0%, "+S.palette.bg2+" 75%, #000 100%)";

    byId("ssNames").textContent = S.coupleNames;
    byId("ssTag").textContent = S.tagline || "You're Invited";

    buildScene(cfg);
    wireScene();
    showScreen("start");
  }

  // ===========================================================================
  // build the scene (mirrors V1: inject the whole <a-scene> into #ar-container)
  // ===========================================================================
  function buildScene(cfg) {
    var firstVideo = S.items.find(function (it){ return it.type === "video"; });
    var assets = "";
    if (firstVideo) {
      assets = '<video id="filmvid" src="' + CARD_PATH + firstVideo.src + '" ' +
               'preload="metadata" playsinline webkit-playsinline crossorigin="anonymous"></video>';
    }

    // mindar attributes only in real AR; preview places the target in front of the camera
    var mindarScene = PREVIEW ? "" :
      'mindar-image="imageTargetSrc: ' + CARD_PATH + (cfg.targetsFile || "targets.mind") +
      '; autoStart: false; uiLoading: no; uiError: no; uiScanning: no; maxTrack: 1" ';
    var mindarTarget = PREVIEW ? 'position="0 0 -2.2"' : 'mindar-image-target="targetIndex: 0"';

    var backing = S.palette.backing;
    var FRAME = FRAME_OVERRIDE || cfg.frame || "gold";   // frame-driven: pick the PNG by name

    var sceneHTML =
      '<a-scene ' + mindarScene +
        'embedded color-space="sRGB" ' +
        'renderer="colorManagement: true, physicallyCorrectLights" ' +
        'vr-mode-ui="enabled: false" ' +
        'device-orientation-permission-ui="enabled: false" ' +
        'loading-screen="enabled: false">' +
        '<a-assets timeout="6000">' + assets + '</a-assets>' +
        '<a-camera position="0 0 0" look-controls="enabled: false"></a-camera>' +
        '<a-entity id="target" ' + mindarTarget + '>' +
          '<a-plane id="backing" position="0 0 0" width="'+STAGE.backW+'" height="'+STAGE.backH+'" ' +
                   'material="shader: flat; src: '+backing+'; transparent: false"></a-plane>' +
          '<a-video id="mediaVideo" position="0 0 0.01" width="'+STAGE.innerW+'" height="1.0" ' +
                   (firstVideo ? 'src="#filmvid" ' : '') + 'visible="false" ' +
                   'material="shader: flat; transparent: false"></a-video>' +
          '<a-image id="mediaPhoto" position="0 0 0.011" width="'+STAGE.innerW+'" height="1.0" ' +
                   'visible="false" material="shader: flat; transparent: false"></a-image>' +
          '<a-image id="frame" position="0 0 0.02" width="'+STAGE.frameW+'" height="'+STAGE.frameH+'" ' +
                   'src="assets/frame-' + FRAME + '.png" material="shader: flat; transparent: true"></a-image>' +
          '<a-plane id="ribbonTop" position="0 '+STAGE.ribTopY+' 0.03" width="0.96" height="0.20" ' +
                   'visible="false" material="shader: flat; transparent: true; side: double"></a-plane>' +
          '<a-plane id="ribbonBottom" position="0 '+STAGE.ribBotY+' 0.03" width="0.84" height="0.16" ' +
                   'visible="false" material="shader: flat; transparent: true; side: double"></a-plane>' +
          '<a-image id="arrowL" class="nav" position="-'+STAGE.arrowX+' 0 0.03" width="0.20" height="0.20" ' +
                   'src="assets/arrow-left.png" material="shader: flat; transparent: true"></a-image>' +
          '<a-image id="arrowR" class="nav" position="'+STAGE.arrowX+' 0 0.03" width="0.20" height="0.20" ' +
                   'src="assets/arrow-right.png" material="shader: flat; transparent: true"></a-image>' +
        '</a-entity>' +
      '</a-scene>';

    byId("ar-container").innerHTML = sceneHTML;
  }

  // ===========================================================================
  function wireScene() {
    var sceneEl = document.querySelector("#ar-container a-scene");
    var film = byId("filmvid");

    if (film) {
      film.addEventListener("loadedmetadata", function () {
        if (S.items[S.index] && S.items[S.index].type === "video") fitVideo();
      });
      film.addEventListener("ended", function () {
        if (S.items.some(function (it){ return it.type === "photo"; })) goNext();
      });
    }

    if (!PREVIEW) {
      var target = byId("target");
      sceneEl.addEventListener("arReady", function () {
        showScreen(null); showHUD(true);
      });
      sceneEl.addEventListener("arError", function () {
        showError("Camera could not start", "Allow camera access and use Chrome (Android) or Safari (iPhone).");
      });
      target.addEventListener("targetFound", function () {
        S.inView = true; byId("scanHint").classList.add("hidden");
        resumeCurrent();
      });
      target.addEventListener("targetLost", function () {
        S.inView = false; byId("scanHint").classList.remove("hidden");
        pauseVideo();
      });
    }

    drawTopRibbon();
    if (sceneEl.hasLoaded) onReady(); else sceneEl.addEventListener("loaded", onReady, { once:true });

    function onReady() {
      if (PREVIEW) { S.inView = true; }
      showItem(0, true);
    }
  }

  // ===========================================================================
  // playlist
  // ===========================================================================
  function showItem(i, first) {
    var n = S.items.length;
    S.index = ((i % n) + n) % n;
    var item = S.items[S.index];
    updateCounter();
    drawBottomRibbon(item);

    var mv = byId("mediaVideo"), mp = byId("mediaPhoto");
    if (item.type === "video") {
      mp.setAttribute("visible","false");
      fitVideo();
      mv.setAttribute("visible","true");
      if (S.inView || PREVIEW) playVideo();
    } else {
      pauseVideo();
      mv.setAttribute("visible","false");
      loadPhoto(CARD_PATH + item.src);
    }
  }
  function goNext(){ if(!S.started && !PREVIEW) return; showItem(S.index+1); }
  function goPrev(){ if(!S.started && !PREVIEW) return; showItem(S.index-1); }

  function fitVideo() {
    var film = byId("filmvid"); if (!film) return;
    var a = (film.videoWidth && film.videoHeight) ? film.videoWidth/film.videoHeight : 0.5625;
    var wh = fit(a);
    var mv = byId("mediaVideo");
    mv.setAttribute("width", wh[0].toFixed(4));
    mv.setAttribute("height", wh[1].toFixed(4));
  }

  function loadPhoto(src) {
    var mp = byId("mediaPhoto");
    var img = new Image();
    img.onload = function () {
      var a = (img.width && img.height) ? img.width/img.height : 0.75;
      var wh = fit(a);
      mp.setAttribute("width", wh[0].toFixed(4));
      mp.setAttribute("height", wh[1].toFixed(4));
      mp.setAttribute("src", src);
      mp.setAttribute("visible","true");
    };
    img.onerror = function(){ console.warn("[invite] photo failed", src); };
    img.src = src;
  }

  function fit(aspect) {
    if (!aspect || aspect <= 0) aspect = 0.75;
    var w, h, ba = STAGE.innerW / STAGE.innerH;
    if (aspect < ba) { w = STAGE.innerW; h = w / aspect; }
    else              { h = STAGE.innerH; w = h * aspect; }
    if (w > STAGE.innerW) w = STAGE.innerW;
    if (h > STAGE.innerH) h = STAGE.innerH;
    return [w, h];
  }

  function playVideo(){ var v=byId("filmvid"); if(!v) return; v.muted = PREVIEW ? true : !S.soundOn; var p=v.play(); if(p&&p.catch)p.catch(function(){}); }
  function pauseVideo(){ var v=byId("filmvid"); if(v){ try{v.pause();}catch(e){} } }
  function resumeCurrent(){ var it=S.items[S.index]; if(it&&it.type==="video") playVideo(); }

  // ===========================================================================
  // ribbons (canvas texture, applied when the plane mesh is ready)
  // ===========================================================================
  function applyCanvas(el, canvas) {
    if (!el) return;
    var mesh = el.getObject3D && el.getObject3D("mesh");
    if (!mesh) { el.addEventListener("loaded", function(){ applyCanvas(el, canvas); }, { once:true }); return; }
    var tex;
    try { tex = new THREE.CanvasTexture(canvas); } catch(e){ return; }
    try { if (THREE.sRGBEncoding) tex.encoding = THREE.sRGBEncoding; } catch(e){}
    tex.minFilter = THREE.LinearFilter; tex.needsUpdate = true;
    mesh.material.map = tex; mesh.material.transparent = true; mesh.material.needsUpdate = true;
    el.setAttribute("visible","true");
  }

  function goldGrad(ctx,h){ var g=ctx.createLinearGradient(0,0,0,h);
    g.addColorStop(0,GOLD[0]); g.addColorStop(.38,GOLD[1]); g.addColorStop(.70,GOLD[2]); g.addColorStop(1,GOLD[3]); return g; }

  function banner(ctx,w,h){ var n=h*0.42,i=h*0.16;
    ctx.beginPath();
    ctx.moveTo(n,i); ctx.lineTo(w-n,i); ctx.lineTo(w,i);
    ctx.lineTo(w-n*0.62,h/2); ctx.lineTo(w,h-i); ctx.lineTo(w-n,h-i);
    ctx.lineTo(n,h-i); ctx.lineTo(0,h-i); ctx.lineTo(n*0.62,h/2); ctx.lineTo(0,i); ctx.closePath(); }

  function drawRibbon(canvas, o) {
    var ctx=canvas.getContext("2d"), w=canvas.width, h=canvas.height;
    ctx.clearRect(0,0,w,h);
    banner(ctx,w,h); ctx.fillStyle=goldGrad(ctx,h); ctx.fill();
    ctx.lineWidth=Math.max(2,h*0.025); ctx.strokeStyle="rgba(90,66,18,.85)"; ctx.stroke();
    ctx.save(); banner(ctx,w,h); ctx.clip();
    ctx.lineWidth=2; ctx.strokeStyle="rgba(255,245,200,.5)";
    ctx.strokeRect(h*0.20,h*0.26,w-h*0.40,h-h*0.52); ctx.restore();
    ctx.textAlign="center"; ctx.textBaseline="middle"; var ink="#3a2a12";
    if (o.eyebrow){ var es=h*0.20; ctx.font="600 "+es+"px Georgia, serif";
      ctx.fillStyle="rgba(58,42,18,.78)"; ctx.fillText(o.eyebrow.toUpperCase(), w/2, h*0.33); }
    var ms = o.big ? h*0.40 : h*0.34; ctx.font="700 "+ms+"px Georgia, serif";
    var maxW=w-h*0.9;
    while (ctx.measureText(o.main).width>maxW && ms>10){ ms-=1; ctx.font="700 "+ms+"px Georgia, serif"; }
    ctx.fillStyle=ink; ctx.fillText(o.main||"", w/2, o.eyebrow ? h*0.62 : h*0.5);
    if (o.sub){ var ss=h*0.17; ctx.font="italic 400 "+ss+"px Georgia, serif";
      ctx.fillStyle="rgba(58,42,18,.8)"; ctx.fillText(o.sub, w/2, h*0.80); }
  }

  function drawTopRibbon() {
    var c=document.createElement("canvas"); c.width=1000; c.height=216;
    drawRibbon(c, { main:S.coupleNames, sub:S.tagline||"", big:true });
    applyCanvas(byId("ribbonTop"), c);
  }
  function drawBottomRibbon(item) {
    var el=byId("ribbonBottom"); if(!el||!item) return;
    var has=(item.caption&&item.caption.trim())||(item.section&&item.section.trim());
    if (!has){ el.setAttribute("visible","false"); return; }
    var c=document.createElement("canvas"); c.width=900; c.height=180;
    drawRibbon(c, { eyebrow:item.section||"", main:item.caption||"" });
    applyCanvas(el, c);
  }

  // ===========================================================================
  // start (V1 pattern: unlock video then sys.start INSIDE the tap)
  // ===========================================================================
  function startAR() {
    S.started = true;
    var v = byId("filmvid");
    if (v) {
      try {
        v.muted = false;
        var p = v.play();
        if (p && p.then) p.then(function(){ v.pause(); v.currentTime=0; })
          .catch(function(){ v.muted=true; var p2=v.play(); if(p2&&p2.then)p2.then(function(){v.pause();v.currentTime=0;}).catch(function(){}); });
      } catch(e){}
    }
    byId("soundBtn").innerHTML = "&#128266;";

    if (PREVIEW) {
      showScreen(null); showHUD(true);
      S.inView = true; showItem(S.index, true);
      return;
    }
    var sceneEl = document.querySelector("#ar-container a-scene");
    var begin = function () {
      try { sceneEl.systems["mindar-image-system"].start(); }
      catch (e) { showError("Could not start camera","Please reload and allow camera access."); }
    };
    if (sceneEl.hasLoaded) begin(); else sceneEl.addEventListener("loaded", begin, { once:true });
  }

  // ===========================================================================
  // UI
  // ===========================================================================
  function wireButtons() {
    byId("btnStart").addEventListener("click", function () {
      byId("btnStart").disabled = true; showScreen("loading"); startAR();
    });
    if (byId("btnRetry")) byId("btnRetry").addEventListener("click", function(){ location.reload(); });
    byId("soundBtn").addEventListener("click", function () {
      S.soundOn = !S.soundOn; var v=byId("filmvid"); if(v) v.muted = !S.soundOn;
      byId("soundBtn").innerHTML = S.soundOn ? "&#128266;" : "&#128263;";
    });
    byId("navZoneL").addEventListener("click", goPrev);
    byId("navZoneR").addEventListener("click", goNext);
    window.addEventListener("keydown", function(e){
      if(e.key==="ArrowRight")goNext(); else if(e.key==="ArrowLeft")goPrev();
    });
    var sx=0,sy=0,t0=0;
    window.addEventListener("touchstart", function(e){ var t=e.changedTouches[0]; sx=t.clientX;sy=t.clientY;t0=Date.now(); }, {passive:true});
    window.addEventListener("touchend", function(e){ var t=e.changedTouches[0]; var dx=t.clientX-sx, dy=t.clientY-sy;
      if(Date.now()-t0<600 && Math.abs(dx)>55 && Math.abs(dx)>Math.abs(dy)*1.4){ if(dx<0)goNext(); else goPrev(); } }, {passive:true});
  }

  var SCREENS=["loading","start","error"];
  function showScreen(name){ SCREENS.forEach(function(s){ var el=byId("screen-"+s); if(el) el.classList.toggle("hidden", s!==name); }); if(name) showHUD(false); }
  function showHUD(show){ var h=byId("hud"); if(h) h.classList.toggle("hidden", !show); }
  function updateCounter(){ byId("counter").textContent=(S.index+1)+" / "+S.items.length; }
  function showError(title,msg){ var t=byId("errTitle"),m=byId("errMsg"); if(t)t.textContent=title; if(m)m.textContent=msg||""; showScreen("error"); }

  window.__invite = S;
})();
