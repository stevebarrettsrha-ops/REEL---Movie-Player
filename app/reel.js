/* =========================================================================
   REEL — Prime-style streaming UI over a from-scratch player.
   New in this build: hover-preview cards, Categories page, autoplay hero
   with mute toggle, See-more rows, footer. Same honest engine underneath.
   ========================================================================= */

/* 1) CATALOG — replace `src` with your own hosted/licensed video to ship.   */
let CATALOG = [
  { id:"steel", type:"movie", title:"Tears of Steel", year:2012, rating:"PG-13", runtime:"12m", cc:true,
    license:"CC BY 3.0", score:97, genres:["Science fiction","Action and adventure"], cast:"Derek de Lint, Sergio Hasselbaink",
    accolade:"Blender Open Movie", badge:null,
    desc:"In a future Amsterdam, a team of warriors and scientists must defeat an army of robots — Blender's sci-fi proof of concept.",
    grad:["#c2703a","#3a1d0c","#120804"], src:"https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4" },
  { id:"sintel", type:"movie", title:"Sintel", year:2010, rating:"PG", runtime:"15m", cc:true,
    license:"CC BY 3.0", score:95, genres:["Fantasy","Action and adventure","Drama"], cast:"Halina Reijn, Thom Hoffman",
    accolade:"Award-winning short", badge:null,
    desc:"A lonely young woman befriends a baby dragon she names Scales, then undertakes a perilous journey to find him again.",
    grad:["#9b5fb0","#341747","#100617"], src:"https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4" },
  { id:"bunny", type:"movie", title:"Big Buck Bunny", year:2008, rating:"G", runtime:"10m", cc:true,
    license:"CC BY 3.0", score:92, genres:["Kids","Comedy"], cast:"Blender Institute",
    accolade:"Beloved open film", badge:"RECENTLY ADDED",
    desc:"A big, good-hearted rabbit turns the tables on three rodent bullies in this sunny, beloved open-source short.",
    grad:["#4fae6a","#15452a","#06160d"], src:"https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4" },
  { id:"dream", type:"movie", title:"Elephants Dream", year:2006, rating:"PG", runtime:"11m", cc:true,
    license:"CC BY 2.5", score:88, genres:["Science fiction","Drama"], cast:"Tygo Gernandt, Cas Jansen",
    accolade:"The first open movie", badge:null,
    desc:"Two characters wander a strange, ever-shifting mechanical world in the very first Blender open movie.",
    grad:["#4a87ad","#143246","#06141d"], src:"https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4" },
  { id:"rides", type:"series", title:"Wild Rides", year:2024, rating:"TV-PG", runtime:"5 episodes", cc:false,
    license:"Sample", score:90, genres:["Action and adventure"], cast:"Demo Anthology",
    accolade:"Demo series", badge:null,
    desc:"A short demo series showing the episode selector, season list, and auto-advance. Clips are Google's public sample assets.",
    grad:["#c43d5a","#3a1020","#14060b"],
    seasons:[{ n:1, episodes:[
      { id:"e1", ep:1, title:"For Bigger Blazes", runtime:"0:15", desc:"The pilot. Sets up the world and the stakes.", src:"https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4" },
      { id:"e2", ep:2, title:"For Bigger Escapes", runtime:"0:15", desc:"The crew makes a daring getaway.", src:"https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4" },
      { id:"e3", ep:3, title:"For Bigger Fun", runtime:"1:00", desc:"A lighter, longer interlude.", src:"https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4" },
      { id:"e4", ep:4, title:"For Bigger Joyrides", runtime:"0:15", desc:"Things accelerate.", src:"https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4" },
      { id:"e5", ep:5, title:"For Bigger Meltdowns", runtime:"0:15", desc:"The season finale.", src:"https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4" },
    ]}] },
];
const GENRES=["Action and adventure","Anime","Comedy","Documentary","Drama","Fantasy","Horror","Kids","Music Videos","Mystery and thrillers","Romance","Science fiction","Short Films","Young adult"];
const GENRE_GRAD={"Action and adventure":["#1d4e6b","#0b1f2c"],"Anime":["#5b2e6b","#1f0f2c"],"Comedy":["#6b5e1d","#2c270b"],"Documentary":["#1d6b5e","#0b2c27"],"Drama":["#6b2e1d","#2c130b"],"Fantasy":["#3a1d6b","#150b2c"],"Horror":["#1d6b2e","#0b2c13"],"Kids":["#6b4a1d","#2c1f0b"],"Music Videos":["#6b1d5e","#2c0b27"],"Mystery and thrillers":["#1d2e6b","#0b132c"],"Romance":["#6b1d4a","#2c0b1f"],"Science fiction":["#1d5e6b","#0b272c"],"Short Films":["#3d6b1d","#172c0b"],"Young adult":["#2e1d6b","#130b2c"]};

/* 2) STORAGE — per-profile state, saved to the home server so history follows
      each person across every device. Falls back to localStorage with no server. */
let SERVER_OK=false, PROFILE=null, PROFILES=[], STATE={watchlist:[],kv:{}}, saveTimer=null, TOKEN=null;
function lsGet(k){try{return JSON.parse(localStorage.getItem("reel:"+k));}catch{return null;}}
function lsSet(k,v){try{localStorage.setItem("reel:"+k,JSON.stringify(v));}catch{}}
function scheduleSave(){clearTimeout(saveTimer);saveTimer=setTimeout(saveState,700);}
async function saveState(){ if(!PROFILE)return;
  if(SERVER_OK){ try{ await fetch("/api/state/"+PROFILE.id+"?token="+encodeURIComponent(TOKEN||""),{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(STATE)});}catch{} }
  else lsSet("state:"+PROFILE.id,STATE); }
const store={
  get:k=>{ if(k==="watchlist")return STATE.watchlist; return (k in STATE.kv)?STATE.kv[k]:null; },
  set:(k,v)=>{ if(k==="watchlist")STATE.watchlist=v; else STATE.kv[k]=v; scheduleSave(); }
};

/* 3) STATE + helpers ------------------------------------------------------- */
const $=s=>document.querySelector(s);
// Escape anything derived from filenames / sidecar JSON / profile names before it goes
// into innerHTML, so a title like  <img src=x onerror=...>.mp4  can't run script.
const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

/* --- interface language (translates the UI chrome; titles/descriptions come
       from your files/TMDB and stay as provided). Add a language by adding a
       dictionary below — untranslated strings fall back to English. --------- */
const LANGS=[["en","English"],["es","Español"],["fr","Français"]];
const I18N={
  es:{ "Home":"Inicio","Movies":"Películas","TV shows":"Series","Categories":"Categorías","Search":"Buscar",
    "Play":"Reproducir","Resume":"Reanudar","More info":"Más información","My List":"Mi lista","Settings":"Ajustes","Switch profile":"Cambiar perfil",
    "Genres":"Géneros","Continue Watching":"Seguir viendo","Top 10 Today":"Top 10 de hoy","Recently Added":"Añadido recientemente","Sci-Fi & Fantasy":"Ciencia ficción y fantasía",
    "Kids & Family":"Niños y familia","Drama":"Drama","Who's watching?":"¿Quién está viendo?","Create a profile":"Crear un perfil",
    "Add profile":"Añadir perfil","Manage profiles":"Gestionar perfiles","Exit admin":"Salir de administrador","More like this":"Títulos similares",
    "Cast":"Reparto","License":"Licencia","Episodes":"Episodios","Up Next":"A continuación","Next Episode":"Próximo episodio",
    "Play Now":"Reproducir ahora","Resuming from":"Reanudando desde",
    "Action and adventure":"Acción y aventura","Anime":"Anime","Comedy":"Comedia","Documentary":"Documental","Fantasy":"Fantasía",
    "Horror":"Terror","Kids":"Niños","Mystery and thrillers":"Misterio y suspense","Romance":"Romance","Science fiction":"Ciencia ficción","Short Films":"Cortometrajes","Music Videos":"Videos musicales","Young adult":"Jóvenes adultos" },
  fr:{ "Home":"Accueil","Movies":"Films","TV shows":"Séries","Categories":"Catégories","Search":"Rechercher",
    "Play":"Lire","Resume":"Reprendre","More info":"Plus d'infos","My List":"Ma liste","Settings":"Paramètres","Switch profile":"Changer de profil",
    "Genres":"Genres","Continue Watching":"Reprendre","Top 10 Today":"Top 10 du jour","Recently Added":"Ajouts récents","Sci-Fi & Fantasy":"SF & Fantastique",
    "Kids & Family":"Enfants & Famille","Drama":"Drame","Who's watching?":"Qui regarde ?","Create a profile":"Créer un profil",
    "Add profile":"Ajouter un profil","Manage profiles":"Gérer les profils","Exit admin":"Quitter admin","More like this":"Titres similaires",
    "Cast":"Distribution","License":"Licence","Episodes":"Épisodes","Up Next":"À suivre","Next Episode":"Épisode suivant",
    "Play Now":"Lire maintenant","Resuming from":"Reprise à",
    "Action and adventure":"Action et aventure","Anime":"Animé","Comedy":"Comédie","Documentary":"Documentaire","Fantasy":"Fantastique",
    "Horror":"Horreur","Kids":"Enfants","Mystery and thrillers":"Mystère et thrillers","Romance":"Romance","Science fiction":"Science-fiction","Short Films":"Courts métrages","Music Videos":"Clips musicaux","Young adult":"Jeunes adultes" },
};
let LANG="en";
const t=s=>(I18N[LANG] && I18N[LANG][s]) || s;
function applyLang(){
  $("#langLabel").textContent=LANG.toUpperCase();
  $("#navHome").textContent=t("Home"); $("#navMovies").textContent=t("Movies"); $("#navSeries").textContent=t("TV shows"); $("#navApps").title=t("Categories");
  { const m=$("#mHome"),mv=$("#mMovies"),ms=$("#mSeries"),mc=$("#mCats"); if(m)m.textContent=t("Home"); if(mv)mv.textContent=t("Movies"); if(ms)ms.textContent=t("TV shows"); if(mc)mc.textContent=t("Categories"); }
  const nc=$("#navCats"); if(nc) nc.textContent=t("Categories");
  $("#searchInput").placeholder=t("Search");
  $("#heroPlayT").textContent=t("Play"); $("#heroInfo").title=t("More info");
  $("#pmListT").textContent=t("My List"); $("#pmSwitchT").textContent=t("Switch profile"); $("#pmSettingsT").textContent=$("#setH").textContent=t("Settings");
  $("#catsH").textContent=t("Categories"); $("#catsSub").textContent=t("Genres");
  $("#dMoreH").textContent=t("More like this");
  renderGenres();
  if(typeof PROFILE!=="undefined" && PROFILE) renderRows();
  if($("#gate").classList.contains("open")) renderGate();
}
function renderLangMenu(){ const m=$("#langMenu"); m.innerHTML="";
  LANGS.forEach(([code,label])=>{ const b=document.createElement("button"); if(code===LANG)b.className="sel"; b.textContent=label;
    b.onclick=()=>{ LANG=code; lsSet("lang",code); m.classList.remove("open"); renderLangMenu(); applyLang(); }; m.appendChild(b); }); }

const video=$("#video"),player=$("#player"),heroVid=$("#heroVid");
let current=null,currentEp=null,accent="#36a3f7",autoPlay=false,autoNext=true,saveProgress=true;
let speed=1,quality="Auto",capOn=false,heroAudio=false,heroMuted=true;
const byId=id=>CATALOG.find(c=>c.id===id);
// every episode across every season, in order, each tagged with its season number
const eps=c=>{ if(c.type!=="series"||!c.seasons) return [];
  const out=[]; c.seasons.forEach(s=>(s.episodes||[]).forEach(e=>out.push(Object.assign({_season:s.n,_seasonName:s.name||("Season "+s.n)},e)))); return out; };
const seasonsOf=c=>(c.type==="series"&&c.seasons)?c.seasons:[];
const epTag=e=>{const s=e._season!=null?e._season:1;const n=e.epLabel||e.ep;return (s===0?"Specials E":"S"+s+":E")+n;};
const findEp=(c,id)=>eps(c).find(e=>e.id===id);
const fmt=s=>{if(!isFinite(s))return"0:00";s=Math.floor(s);const h=Math.floor(s/3600),m=Math.floor(s%3600/60),x=s%60;return(h?h+":"+String(m).padStart(2,"0"):m)+":"+String(x).padStart(2,"0");};
const grad=c=>{const g=(c&&c.grad)||["#2a2f3a","#1a1d24","#23262e"];return `radial-gradient(80% 120% at 80% 10%,${g[0]},transparent 60%),linear-gradient(160deg,${g[1]},${g[2]||g[1]})`;};
// Layer the image OVER the gradient. Both are valid background layers (no leading solid
// colour, which would invalidate the shorthand). If the image 404s, its layer is just
// transparent and the gradient below shows through — so tiles never go blank.
const art=c=>c&&c.backdrop?`url('${c.backdrop}') center/cover no-repeat, ${grad(c)}`:grad(c);
const epArt=(e,series)=>e&&e.still?`url('${e.still}') center/cover no-repeat, ${grad(series)}`:art(series);
let KIDS=false;                                                                  // set when a kids profile is active
let ADULT_UNLOCKED=false;                                                         // set after the adult password is entered this session
const KID_RATINGS=["G","PG","TV-Y","TV-Y7","TV-G","TV-PG","NR"];
const isKid=c=>KID_RATINGS.includes((c.rating||"NR").toUpperCase());
const vis=()=>KIDS?CATALOG.filter(isKid):CATALOG;                                 // catalog the current profile may see
const featuredList=()=>{const v=vis();return v.length?v.slice(0,Math.min(3,v.length)).map(c=>c.id):FEATURED;};
const pkey=(c,e)=>c.type==="series"?"p:"+c.id+":"+e.id:"p:"+c.id;
const prog=(c,e)=>store.get(pkey(c,e));                 // {time,dur} or null
const DONE_PAD=15;                                       // within 15s of the end = finished
const isDone=s=>!!(s&&s.dur&&s.time>=s.dur-DONE_PAD);
const isMid =s=>!!(s&&s.time>5&&!isDone(s));
// For a series: which episode + position the viewer should land on next.
function seriesNextUp(c){
  const list=eps(c); if(!list.length) return {ep:null,time:0,started:false,doneSeries:false};
  let idx=-1; const last=store.get("last:"+c.id);
  if(last) idx=list.findIndex(e=>e.id===last);
  if(idx<0){ for(let i=0;i<list.length;i++){ if(prog(c,list[i])) idx=i; } }   // furthest touched
  if(idx<0) return {ep:list[0],time:0,started:false,doneSeries:false};
  const e=list[idx], s=prog(c,e);
  if(isDone(s)){
    if(idx<list.length-1){ const ne=list[idx+1], ns=prog(c,ne); return {ep:ne,time:isMid(ns)?ns.time:0,started:true,doneSeries:false}; }
    return {ep:e,time:0,started:true,doneSeries:true};   // finished the final episode
  }
  return {ep:e,time:isMid(s)?s.time:0,started:isMid(s)||idx>0,doneSeries:false};
}
function resume(c){
  if(c.type==="movie"){ const s=prog(c,null); const mid=isMid(s);
    return {ep:null,time:mid?s.time:0,dur:s?.dur||0,pct:mid&&s.dur?s.time/s.dur*100:0,started:mid,done:isDone(s)}; }
  const nu=seriesNextUp(c), s=prog(c,nu.ep);
  return {ep:nu.ep,time:nu.time,dur:s?.dur||0,pct:nu.time&&s?.dur?nu.time/s.dur*100:0,started:nu.started,done:nu.doneSeries};
}
function setAccent(hex){accent=hex;document.documentElement.style.setProperty("--accent",hex);
  document.querySelectorAll(".sw").forEach(s=>s.classList.toggle("on",s.dataset.c===hex));buildEmbed();}
const inList=id=>store.get("watchlist").includes(id);
function toggleList(id){const w=store.get("watchlist");const i=w.indexOf(id);i<0?w.push(id):w.splice(i,1);store.set("watchlist",w);renderRows();if(typeof refreshResults==="function")refreshResults();}

/* 4) EVENT STREAM ---------------------------------------------------------- */
const logEl=$("#log");
function logEvent(type){const d={type:"PLAYER_EVENT",data:{event:type,currentTime:+video.currentTime.toFixed(1),
  duration:+(video.duration||0).toFixed(1),progress:+((video.currentTime/(video.duration||1))*100).toFixed(1),
  id:current?.id,episode:currentEp?.id||null,mediaType:current?.type||"movie"}};
  // Real embed: window.parent.postMessage(JSON.stringify(d),"*");
  const l=document.createElement("div");l.className="ev";
  l.innerHTML=`<span class="ts">${new Date().toLocaleTimeString()}</span> <b>${type}</b> · ${d.data.currentTime}s · ${d.data.progress}%`;
  logEl.prepend(l);while(logEl.children.length>80)logEl.lastChild.remove();}

/* 5) HERO CAROUSEL (autoplay muted video + mute toggle) -------------------- */
// On weak devices (most smart TVs, low-end phones) autoplaying/decoding a big video on
// the landing page locks up the UI for many seconds. Detect that and show a STATIC hero
// (image/gradient) instead — the page stays snappy. Users can override in Settings.
const LOWPOWER = (function(){
  try{
    if(localStorage.getItem("reel_lite")==="1") return true;
    if(localStorage.getItem("reel_lite")==="0") return false;
  }catch{}
  const ua=navigator.userAgent.toLowerCase();
  const isTV=/smart-?tv|smarttv|googletv|android tv|appletv|crkey|chromecast|tizen|web0s|webos|netcast|viera|aquos|hbbtv|roku|aft[bms]|bravia|dlnadoc|philipstv|sony|vizio/.test(ua);
  const fewCores=(navigator.hardwareConcurrency||8)<=4;
  const lowMem=(navigator.deviceMemory||8)<=2;
  return isTV || (fewCores && lowMem);
})();
const FEATURED=["steel","sintel","rides"];let hi=0,heroTimer;
function renderDots(){const FL=featuredList();const d=$("#heroDots");d.innerHTML="";FL.forEach((_,i)=>{const x=document.createElement("i");
  if(i===hi)x.className="on";x.onclick=()=>{hi=i;showHero();resetHeroTimer();};d.appendChild(x);});}
function showHero(){const FL=featuredList();if(hi>=FL.length)hi=0;const c=byId(FL[hi]);if(!c)return;
  $("#heroBg").style.background=art(c);
  if(!LOWPOWER){
    const src=c.type==="series"?eps(c)[0].src:c.src;
    heroVid.classList.remove("on");heroVid.src=src;heroVid.muted=heroMuted;
    heroVid.play().then(()=>heroVid.classList.add("on")).catch(()=>{});
  } else {
    // low-power: never load a hero video; just show the still/gradient
    heroVid.classList.remove("on"); try{heroVid.removeAttribute("src");heroVid.load();}catch{}
  }
  $("#heroTitle").textContent=c.title;$("#heroTitle").classList.toggle("long",(c.title||"").length>24);$("#heroRating").textContent=c.rating;$("#heroYear").textContent=c.year;
  $("#heroGenres").textContent=c.genres.slice(0,3).join(" · ");$("#heroDesc").textContent=c.desc;
  $("#heroKicker").textContent=c.type==="series"?"Featured Series":"Featured Film";
  $("#heroAge").textContent=c.rating;$("#heroList").classList.toggle("on",inList(c.id));
  const k=$("#heroKey");k.classList.remove("hero-key");void k.offsetWidth;k.classList.add("hero-key");
  $("#heroBg").dataset.id=c.id;renderDots();}
function resetHeroTimer(){clearInterval(heroTimer);heroTimer=setInterval(()=>{hi=(hi+1)%featuredList().length;showHero();}, LOWPOWER?14000:9000);}
$("#heroPlay").onclick=()=>playContent(byId($("#heroBg").dataset.id));
$("#heroInfo").onclick=()=>openDetail(byId($("#heroBg").dataset.id));
$("#heroList").onclick=()=>{toggleList($("#heroBg").dataset.id);$("#heroList").classList.toggle("on",inList($("#heroBg").dataset.id));};
$("#heroMute").onclick=function(){heroMuted=!heroMuted;heroVid.muted=heroMuted;
  this.classList.toggle("on",!heroMuted);
  this.innerHTML=heroMuted?'<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13 3 3 3 1-1-3-3 3-3-1-1-3 3-3-3-1 1 3 3-3 3 1 1z"/></svg>':'<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3a4.5 4.5 0 00-2.5-4v8a4.5 4.5 0 002.5-4z"/></svg>';};

/* 6) TILES + ROWS ---------------------------------------------------------- */
function tile(c){
  const r=resume(c);
  const el=document.createElement("div");el.className="tile";el.dataset.id=c.id;
  el.innerHTML=`<div class="tile-art" style="background:${art(c)}">
      ${c.badge?`<div class="tag">${esc(c.badge)}</div>`:""}${c.type==="series"?'<div class="typ">SERIES</div>':""}
      <div class="corner"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></div>
      <div class="name">${esc(c.title)}</div></div>
    <div class="tile-bar"><i style="width:${r.pct}%"></i></div>
    <div class="tile-info"><span class="t">${esc(c.year||(c.genres||[])[0]||"")}</span>
      <span class="m">${c.type==="series"
          ? (r.started ? epTag(eps(c).find(e=>e.id===r.ep.id)||r.ep)+(r.pct>1?" · "+Math.round(r.pct)+"%":"") : c.runtime)
          : (r.pct>1 ? Math.round(r.pct)+"% watched" : c.runtime)}</span></div>`;
  el.onclick=()=>openDetail(c);
  el.addEventListener("mouseenter",()=>schedulePreview(c,el));
  el.addEventListener("mouseleave",()=>cancelPreview());
  return el;
}
function rowEl(title,items,ranked){
  if(!items.length)return null;
  const row=document.createElement("div");row.className="row";
  const head=document.createElement("div");head.className="row-head";
  head.innerHTML=`<h2>${title}</h2><span class="more">See more <svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></span>`;
  head.querySelector(".more").onclick=()=>filterRows(c=>items.includes(c),title);
  row.appendChild(head);
  const tr=document.createElement("div");tr.className="track"+(ranked?" top":"");
  items.forEach((c,i)=>{if(ranked){const w=document.createElement("div");w.className="rank";const n=document.createElement("div");n.className="num";n.textContent=i+1;w.appendChild(n);w.appendChild(tile(c));tr.appendChild(w);}else tr.appendChild(tile(c));});
  const tw=document.createElement("div");tw.className="track-wrap";tw.appendChild(tr);
  const mk=(dir)=>{const b=document.createElement("button");b.className="row-arrow "+(dir<0?"prev":"next");b.tabIndex=-1;b.setAttribute("aria-label",dir<0?"Scroll left":"Scroll right");
    b.innerHTML='<svg viewBox="0 0 24 24"><path d="'+(dir<0?"M15 6l-6 6 6 6":"M9 6l6 6-6 6")+'"/></svg>';
    b.onclick=e=>{e.stopPropagation();tr.scrollBy({left:dir*Math.max(300,tr.clientWidth*.8),behavior:"smooth"});};tw.appendChild(b);return b;};
  const pb=mk(-1),nb=mk(1);
  const upd=()=>{pb.classList.toggle("can",tr.scrollLeft>4);nb.classList.toggle("can",tr.scrollLeft+tr.clientWidth<tr.scrollWidth-4);};
  tr.addEventListener("scroll",upd,{passive:true});row.addEventListener("mouseenter",upd);
  row.appendChild(tw);return row;
}
function renderRows(){
  const wrap=$("#rows");wrap.innerHTML="";
  const C=vis();
  // 6) nothing to show: explain where files go instead of a blank page
  document.body.classList.toggle("nolib",!C.length);
  if(!C.length){ wrap.innerHTML='<div class="nolib-msg"><h2>'+(KIDS&&CATALOG.length?"No kid-friendly titles yet":"Your library is empty")+'</h2><p>'+
    (KIDS&&CATALOG.length?"Put videos in the <b>Kids</b> folder, or give a title a G or PG rating, and they will show up here.":"Put video files in the <b>movies</b> folder (or <b>series</b>, <b>Kids</b>, <b>Documentaries</b>, <b>Short Films</b>, <b>Music Videos</b>) next to the REEL server, then refresh this page.")+'</p></div>'; return; }
  const cont=C.filter(c=>{const r=resume(c);return r.started&&!r.done;});
  const list=store.get("watchlist").map(byId).filter(c=>c&&C.includes(c));
  if(SAMPLES){ const n=document.createElement("div");n.className="lib-note";n.innerHTML="<b>Your library is empty</b> — these are sample films. Put your own videos in the <b>movies</b> or <b>series</b> folder next to the REEL server, then refresh.";wrap.appendChild(n); }
  const add=(t,items,r)=>{const e=rowEl(t,items,r);if(e)wrap.appendChild(e);};
  add(t("Continue Watching"),cont);
  add(t("My List"),list);
  add(t("Recently Added"),C.filter(c=>c.badge&&/recent/i.test(c.badge)&&!c.adult));
  const notAdult=c=>!(c.adult||c.category==="Adult");
  const seen=new Set(), names=[...GENRES];
  C.forEach(c=>(c.genres||[]).forEach(g=>{if(!names.includes(g))names.push(g);}));
  names.forEach(g=>{ if(g==="Adult"||seen.has(g))return; seen.add(g); add(t(g),C.filter(c=>notAdult(c)&&(c.genres||[]).includes(g))); });
  if(ADULT_UNLOCKED) add("Adult (18+)",C.filter(c=>c.adult||c.category==="Adult"));
}

/* 7) HOVER PREVIEW CARD ---------------------------------------------------- */
const preview=$("#preview"),pvVid=$("#pvVid");let pvTimer,pvHideTimer,pvFor=null;
const CAN_HOVER=!window.matchMedia||window.matchMedia("(hover:hover) and (pointer:fine)").matches;
function schedulePreview(c,el){if(LOWPOWER||!CAN_HOVER)return;clearTimeout(pvHideTimer);clearTimeout(pvTimer);
  pvTimer=setTimeout(()=>openPreview(c,el),420);}
function cancelPreview(){clearTimeout(pvTimer);pvHideTimer=setTimeout(()=>{if(!preview.matches(":hover")){preview.classList.remove("show");pvVid.classList.remove("on");pvVid.pause();pvFor=null;}},180);}
function openPreview(c,el){
  pvFor=c;const r=el.getBoundingClientRect();
  $("#pvArt").style.background=art(c);$("#pvName").textContent=c.title;
  const src=c.type==="series"?eps(c)[0].src:c.src;pvVid.src=src;pvVid.classList.remove("on");
  pvVid.play().then(()=>pvVid.classList.add("on")).catch(()=>{});
  $("#pvList").classList.toggle("on",inList(c.id));
  $("#pvAccolade").style.display=c.accolade?"flex":"none";if(c.accolade)$("#pvAccolade").querySelector("span").textContent=c.accolade;
  $("#pvMeta").innerHTML=`<span class="chip">${esc(c.rating)}</span>`+(c.cc?`<span class="cc">CC</span>`:"")+[c.year,c.runtime].filter(Boolean).map(v=>`<span>${esc(v)}</span>`).join(`<span class="dot"></span>`);
  $("#pvGenres").innerHTML=(c.genres||[]).length?`<b>${t("Genres")}:</b> ${c.genres.map(esc).join(", ")}`:"";
  // position: centered on tile, clamped to viewport
  const w=360,cx=r.left+r.width/2;let left=cx-w/2;left=Math.max(12,Math.min(left,window.innerWidth-w-12));
  let top=r.top-40;top=Math.max(74,Math.min(top,window.innerHeight-360));
  preview.style.left=left+"px";preview.style.top=top+"px";
  preview.classList.add("show");
}
preview.addEventListener("mouseleave",cancelPreview);
preview.addEventListener("mouseenter",()=>clearTimeout(pvHideTimer));
$("#pvPlay").onclick=()=>{if(pvFor){preview.classList.remove("show");playContent(pvFor);}};
$("#pvInfo").onclick=()=>{if(pvFor){preview.classList.remove("show");openDetail(pvFor);}};
$("#pvList").onclick=()=>{if(pvFor){toggleList(pvFor.id);$("#pvList").classList.toggle("on",inList(pvFor.id));}};
window.addEventListener("scroll",()=>{preview.classList.remove("show");pvVid.pause();},true);

/* 8) DETAIL MODAL ---------------------------------------------------------- */
let detailC=null;
function openDetail(c){
  // NOTE: the detail modal is a full-screen overlay (position:fixed; inset:0) that
  // sits ON TOP of whatever view you came from. Do NOT hideAllViews() here — that
  // tore down the open category/search/filter view and nulled activeFilter, so
  // closing the modal left a blank page with no videos. Leaving the view mounted
  // (hidden behind the modal) means closeDetail() returns you right where you were.
  detailC=c;preview.classList.remove("show");
  $("#dHero").style.background=art(c);$("#dTitle").textContent=c.title;
  $("#dYear").textContent=c.year;$("#dRating").textContent=c.rating;$("#dRuntime").textContent=c.runtime;
  $("#dDesc").textContent=c.desc;$("#dCast").innerHTML=[[t("Cast"),c.cast],[t("License"),c.license]].filter(x=>x[1]).map(x=>"<b>"+x[0]+":</b> "+esc(x[1])).join(" &nbsp;·&nbsp; ");
  $("#dDesc").style.display=c.desc?"":"none";
  const rz=resume(c);
  $("#dPlayLabel").textContent=c.type==="series"?(rz.started&&rz.ep?t("Resume")+" "+epTag(eps(c).find(e=>e.id===rz.ep.id)||rz.ep):t("Play")+" "+(eps(c)[0]?epTag(eps(c)[0]):"")):(rz.started?t("Resume"):t("Play"));
  $("#dList").classList.toggle("on",inList(c.id));
  const epWrap=$("#dEpisodes");epWrap.innerHTML="";
  if(c.type==="series"){
    const multi=seasonsOf(c).length>1;
    seasonsOf(c).forEach(season=>{
      const head=document.createElement("div");head.className="d-sec";
      head.textContent=multi?(season.name||("Season "+season.n)):t("Episodes");epWrap.appendChild(head);
      season.episodes.forEach(eRaw=>{const e=Object.assign({_season:season.n},eRaw);
        const s=store.get(pkey(c,e));const pct=s&&s.dur?s.time/s.dur*100:0;const row=document.createElement("div");row.className="ep";
        row.innerHTML=`<div class="ep-n">${e.epLabel||e.ep}</div><div class="ep-thumb" style="background:${epArt(e,c)}"><div class="pf"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></div><div class="ebar" style="width:${pct}%"></div></div><div class="ep-meta"><div class="et"><span style="color:var(--ink)">${esc(e.title)}</span><span>${esc(e.runtime)}</span></div><div class="ed">${esc(e.desc)}</div></div>`;
        row.onclick=()=>{closeDetail();openPlayer(c,e);};epWrap.appendChild(row);});
    });
  }
  const more=$("#dMore");more.innerHTML="";
  vis().filter(x=>x.id!==c.id&&x.genres.some(g=>c.genres.includes(g))).concat(vis().filter(x=>x.id!==c.id)).filter((v,i,a)=>a.indexOf(v)===i).slice(0,6).forEach(x=>more.appendChild(tile(x)));
  $("#detail").classList.add("open");document.body.style.overflow="hidden";clearInterval(heroTimer);
  if(window.TVNAV&&TVNAV.armed)setTimeout(()=>TVNAV.focusFirst($("#detail")),60);
}
function closeDetail(){$("#detail").classList.remove("open");document.body.style.overflow="";resetHeroTimer();}
$("#dClose").onclick=closeDetail;$("#detail").addEventListener("click",e=>{if(e.target===$("#detail"))closeDetail();});
$("#dPlay").onclick=()=>{closeDetail();playContent(detailC);};
$("#dList").onclick=()=>{toggleList(detailC.id);$("#dList").classList.toggle("on",inList(detailC.id));};

/* 9) PLAYER ---------------------------------------------------------------- */
function playContent(c){const r=resume(c);openPlayer(c,r.ep);}
// Phones: a movie held upright is a small strip with big black bars. When playback
// starts on a touch phone in portrait, go full screen and turn the picture sideways
// (Android). Where the browser won't allow that (iPhone), say so once instead.
let phoneFS=false, rotateHinted=false;
function phoneLandscape(){
  const mm=q=>window.matchMedia&&window.matchMedia(q).matches;
  if(!mm("(pointer:coarse)")||!mm("(orientation:portrait)")||Math.min(screen.width,screen.height)>600) return;
  const hint=()=>{ if(!rotateHinted&&mm("(orientation:portrait)")){ rotateHinted=true; toast("Turn your phone sideways for a bigger picture"); } };
  try{
    if(!player.requestFullscreen||!(screen.orientation&&screen.orientation.lock)) return hint();
    const fs=document.fullscreenElement?Promise.resolve():player.requestFullscreen();
    Promise.resolve(fs).then(()=>{ phoneFS=true; return screen.orientation.lock("landscape"); }).catch(hint);
  }catch{ hint(); }
}
function phonePortrait(){ if(!phoneFS) return; phoneFS=false;
  try{ screen.orientation.unlock(); }catch{}
  try{ if(document.fullscreenElement) document.exitFullscreen().catch(()=>{}); }catch{} }
function openPlayer(c,ep){
  current=c;currentEp=ep||null;heroVid.pause();phoneLandscape();
  video.src=ep?ep.src:c.src;video.playbackRate=speed;
  video.muted=false; if(!video.volume) video.volume=1; $("#vol").value=video.volume; updMute();   // make sure sound is on
  if(c.type==="series")store.set("last:"+c.id,ep.id);
  $("#epBtn").classList.toggle("hide",c.type!=="series");
  $("#pTitle").textContent=c.title;$("#pMeta").textContent=c.type==="series"?`${epTag(ep)} · ${ep.title}`:[c.year,c.license,c.runtime].filter(Boolean).join(" · ");
  player.classList.add("open");document.body.classList.add("player-open");$("#upnext").classList.remove("show");$("#eppanel").classList.remove("open");
  buildEmbed();renderEpList();applyCaptions();
  const s=store.get(pkey(c,ep));
  if(saveProgress&&isMid(s)){video.currentTime=s.time;toast(t("Resuming from")+" "+fmt(s.time));}else video.currentTime=0;
  video.play().catch(()=>{});showUI();
  // Don't pre-judge by file type — modern browsers CAN play HEVC/MKV when the OS
  // supports it. Try to play, and only show the convert prompt if the browser
  // genuinely fails to decode this file (or it's flagged non-web AND errors out).
  $("#audioFixBtn").style.display="";
  $("#audioWarn").classList.remove("show");
  armPlaybackErrorCheck(ep||c, ep?ep.src:c.src);
  checkAudio(ep?ep.src:c.src);
}
// Watch for a REAL decode failure before suggesting conversion. The earlier version
// used a short 3.5s timer, which fired on TVs/phones simply because a big file buffers
// slowly over WiFi — a false alarm. Now we only warn when the browser actually reports
// a media error (or a long stall with zero progress), never just because it's slow.
let playErrTimer=null, stallTimer=null;
function armPlaybackErrorCheck(item, src){
  clearTimeout(playErrTimer); clearTimeout(stallTimer);
  const showConvert = (codecMsg)=>{
    $("#audioWarnText").textContent = codecMsg ||
      ("This file can't play in this browser. Run the \u201cMake Web-Ready\u201d tool to convert it, or install your system's HEVC codec.");
    $("#audioFixBtn").style.display=""; $("#audioWarn").classList.add("show");
  };
  let settled=false;
  const cleanup = ()=>{ settled=true;
    video.removeEventListener("error", onErr);
    video.removeEventListener("playing", onOk);
    video.removeEventListener("loadeddata", onData);
    video.removeEventListener("timeupdate", onProgress);
    clearTimeout(playErrTimer); clearTimeout(stallTimer);
  };
  // A genuine decode failure fires the media 'error' event with an error code.
  const onErr = ()=>{ if(settled)return;
    const code = video.error && video.error.code;   // 3=DECODE, 4=SRC_NOT_SUPPORTED are the codec ones
    if(item && item.playable===false)
      showConvert("This file ("+(src.split(".").pop().toUpperCase())+") won't play here. Run the \u201cMake Web-Ready\u201d tool to convert it, or install your system's HEVC codec.");
    else if(code===3||code===4) showConvert();
    else showConvert();
    cleanup();
  };
  const onOk   = ()=>cleanup();                       // it started playing -> all good
  const onData = ()=>{ if(video.videoWidth>0) cleanup(); };
  const onProgress = ()=>{ if(video.currentTime>0.3) cleanup(); };   // real playback progress
  video.addEventListener("error", onErr);
  video.addEventListener("playing", onOk);
  video.addEventListener("loadeddata", onData);
  video.addEventListener("timeupdate", onProgress);
  // Fallback for silent codec failures that never fire 'error': only after a LONG wait
  // (20s) AND only if literally nothing has loaded — buffering slow files won't trip this.
  stallTimer = setTimeout(()=>{
    if(settled) return;
    const trulyStuck = video.readyState < 1 && video.videoWidth === 0 && video.currentTime === 0;
    if(trulyStuck){
      if(item && item.playable===false)
        showConvert("This file ("+(src.split(".").pop().toUpperCase())+") won't play here. Run the \u201cMake Web-Ready\u201d tool to convert it, or install your system's HEVC codec.");
      else showConvert();
    }
    cleanup();
  }, 20000);
}
let lastAudioSrc=null;
function checkAudio(src){
  $("#audioWarn").classList.remove("show"); lastAudioSrc=src;
  if(!SERVER_OK) return;
  fetch("/api/audiocheck?token="+encodeURIComponent(TOKEN)+"&src="+encodeURIComponent(src))
    .then(r=>r.json()).then(d=>{
      if(!(d.known && d.playable===false && lastAudioSrc===src)) return;
      // ffprobe says the audio codec isn't web-standard — BUT the device's OS may decode
      // it anyway (common on the host PC and many TVs). Wait a moment and only warn if the
      // file genuinely produced NO sound. Avoids nagging "fix audio" on files that play fine.
      setTimeout(()=>{
        if(lastAudioSrc!==src) return;                 // user moved on
        // If playback is progressing and the audio track is active, assume it's fine.
        const playingOk = video.currentTime>0.5 && !video.paused;
        // Heuristic: if it's playing and not muted, the user can tell if there's sound.
        // Only surface the gentle hint; don't force it over a working file.
        if(!playingOk){
          $("#audioWarnText").textContent="No sound? This file's audio ("+(d.codec||"?")+") may not play in every browser.";
          $("#audioFixBtn").disabled=false; $("#audioFixBtn").textContent="Fix audio";
          $("#audioWarn").classList.add("show");
        }
      }, 4000);
    }).catch(()=>{});
}
$("#audioDismiss").onclick=()=>$("#audioWarn").classList.remove("show");
$("#audioFixBtn").onclick=async()=>{
  const src=lastAudioSrc; if(!src) return;
  const btn=$("#audioFixBtn"); btn.disabled=true; btn.textContent="Fixing… (may take a minute)";
  try{
    const r=await fetch("/api/fixaudio?token="+encodeURIComponent(TOKEN),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({src})});
    const d=await r.json();
    if(r.ok && d.ok){
      btn.textContent="Done — reloading"; const at=video.currentTime;
      video.src=src+(src.includes("?")?"&":"?")+"_r="+Date.now();   // reload the now-fixed file
      video.addEventListener("loadeddata",()=>{try{video.currentTime=at;}catch{}video.play().catch(()=>{});},{once:true});
      setTimeout(()=>$("#audioWarn").classList.remove("show"),1200);
    } else { btn.disabled=false; btn.textContent="Fix failed — retry"; $("#audioWarnText").textContent=(d.error==="ffmpeg not installed")?"Install ffmpeg on the server PC to auto-fix, or re-encode to AAC in HandBrake.":"Couldn't fix automatically. Re-encode to AAC in HandBrake."; }
  }catch{ btn.disabled=false; btn.textContent="Fix failed — retry"; }
};
function closePlayer(){phonePortrait();video.pause();player.classList.remove("open");document.body.classList.remove("player-open");if(typeof pCtrl!=="undefined")pCtrl=false;saveState();renderRows();if($("#heroSection").style.display!=="none")heroVid.play().catch(()=>{});if(window.TVNAV&&TVNAV.armed)setTimeout(()=>TVNAV.focusFirst(document.body),60);}
$("#pBack").onclick=closePlayer;
let hideT;
function showUI(){player.classList.add("show-ui");clearTimeout(hideT);hideT=setTimeout(()=>{if(!video.paused&&!$("#menu").classList.contains("open")&&!$("#eppanel").classList.contains("open"))player.classList.remove("show-ui");},2600);}
player.addEventListener("mousemove",showUI);player.addEventListener("click",e=>{if(e.target===video){const ep=$("#eppanel").classList.contains("open"),mn=$("#menu").classList.contains("open");if(ep||mn){$("#eppanel").classList.remove("open");$("#menu").classList.remove("open");showUI();return;}togglePlay();showUI();}});

const playI='<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>',pauseI='<svg viewBox="0 0 24 24"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>';
const volI='<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3z"/></svg>',muteI='<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13 3 3 3 1-1-3-3 3-3-1-1-3 3-3-3-1 1 3 3-3 3 1 1z"/></svg>';
$("#playBtn").innerHTML=playI;$("#muteBtn").innerHTML=volI;
const togglePlay=()=>video.paused?video.play():video.pause();
$("#playBtn").onclick=togglePlay;$("#bigPlay").onclick=togglePlay;
$("#skipBack").onclick=()=>{video.currentTime=Math.max(0,video.currentTime-10);showUI();};
$("#skipFwd").onclick=()=>{video.currentTime=Math.min(video.duration,video.currentTime+10);showUI();};
video.addEventListener("play",()=>{$("#playBtn").innerHTML=pauseI;$("#bigPlay").innerHTML=pauseI;logEvent("play");showUI();});
video.addEventListener("pause",()=>{$("#playBtn").innerHTML=playI;$("#bigPlay").innerHTML=playI;logEvent("pause");player.classList.add("show-ui");});
video.addEventListener("loadedmetadata",()=>$("#dur").textContent=fmt(video.duration));
let lastLog=0;
video.addEventListener("timeupdate",()=>{const dur=video.duration||1,frac=video.currentTime/dur;
  $("#seekFill").style.width=$("#seekKnob").style.left=(frac*100)+"%";$("#cur").textContent=fmt(video.currentTime);
  if(video.buffered.length)$("#seekBuf").style.width=(video.buffered.end(video.buffered.length-1)/dur*100)+"%";
  $("#upnext").classList.toggle("show",autoNext&&dur>20&&video.currentTime>dur-12&&video.currentTime<dur-0.4);
  if(Date.now()-lastLog>1000){lastLog=Date.now();logEvent("timeupdate");if(saveProgress&&current)store.set(pkey(current,currentEp),{time:video.currentTime,dur});}});
video.addEventListener("seeked",()=>logEvent("seeked"));
const seek=$("#seek");
function seekTo(x){
  const dur=video.duration;
  if(!dur || !isFinite(dur)){ toast(t("Seeking not ready yet")); return; }   // duration unknown (still buffering / streamed MKV)
  const r=seek.getBoundingClientRect();
  const frac=Math.min(1,Math.max(0,(x-r.left)/r.width));
  let target=frac*dur;
  if(!isFinite(target)) return;
  try{ video.currentTime=target; }catch(e){ /* ignore transient seek errors */ }
}
seek.addEventListener("mousemove",e=>{const r=seek.getBoundingClientRect();const p=Math.min(1,Math.max(0,(e.clientX-r.left)/r.width));$("#seekTip").style.left=(p*100)+"%";$("#seekTip").textContent=fmt(p*(video.duration||0));});
let drag=false;seek.addEventListener("mousedown",e=>{drag=true;seekTo(e.clientX);});window.addEventListener("mousemove",e=>{if(drag){seekTo(e.clientX);showUI();}});window.addEventListener("mouseup",()=>drag=false);
// touch (phones / tablets): tap or drag the bar to seek
seek.addEventListener("touchstart",e=>{if(e.touches[0]){seekTo(e.touches[0].clientX);showUI();}},{passive:true});
seek.addEventListener("touchmove",e=>{if(e.touches[0]){seekTo(e.touches[0].clientX);showUI();}},{passive:true});
$("#vol").addEventListener("input",e=>{video.volume=e.target.value;video.muted=e.target.value==0;updMute();});
$("#muteBtn").onclick=()=>{video.muted=!video.muted;$("#vol").value=video.muted?0:video.volume;updMute();};
function updMute(){$("#muteBtn").innerHTML=(video.muted||video.volume==0)?muteI:volI;}
$("#fsBtn").onclick=()=>document.fullscreenElement?document.exitFullscreen():player.requestFullscreen();

/* settings menus */
const VTT="WEBVTT\n\n00:00:01.000 --> 00:00:05.000\n[ Demo subtitle track ]\n\n00:00:05.000 --> 00:00:10.000\nReplace with your own .vtt file to caption your content.\n\n00:00:10.000 --> 00:00:16.000\nCues render over the video even with custom controls.\n";
let trackEl=null;
try{ trackEl=document.createElement("track");trackEl.kind="subtitles";trackEl.srclang="en";trackEl.label="English";trackEl.src=URL.createObjectURL(new Blob([VTT],{type:"text/vtt"}));video.appendChild(trackEl); }
catch(e){ /* some sandboxed environments block blob: URLs — captions just stay off, everything else still works */ }
function applyCaptions(){try{if(video.textTracks[0])video.textTracks[0].mode=capOn?"showing":"hidden";}catch(e){}}
video.addEventListener("loadeddata",applyCaptions);
function renderMenus(){
  const cap=$("#capList");cap.innerHTML="";[["Off",false],["English",true]].forEach(([lbl,v])=>{const b=document.createElement("button");b.className=capOn===v?"sel":"";b.innerHTML=`<span>${lbl}</span>`;b.onclick=()=>{capOn=v;applyCaptions();renderMenus();};cap.appendChild(b);});
  const q=$("#qList");q.innerHTML="";["Auto","1080p","720p","480p"].forEach(v=>{const b=document.createElement("button");b.className=quality===v?"sel":"";b.innerHTML=`<span>${v}</span>`;b.onclick=()=>{quality=v;renderMenus();};q.appendChild(b);});
  const sp=$("#speedList");sp.innerHTML="";[0.5,0.75,1,1.25,1.5,2].forEach(v=>{const b=document.createElement("button");b.className=v===speed?"sel":"";b.innerHTML=`<span>${v===1?"Normal":v+"×"}</span>`;b.onclick=()=>{speed=v;video.playbackRate=v;renderMenus();};sp.appendChild(b);});
}
renderMenus();
$("#setBtn").onclick=e=>{e.stopPropagation();$("#menu").classList.toggle("open");showUI();};
document.addEventListener("click",()=>$("#menu").classList.remove("open"));$("#menu").addEventListener("click",e=>e.stopPropagation());
$("#epBtn").onclick=e=>{e.stopPropagation();$("#eppanel").classList.add("open");showUI();setTimeout(updateEpPageBtns,60);};$("#epClose").onclick=e=>{e.stopPropagation();$("#eppanel").classList.remove("open");};
(function(){
  const list=$("#epList"), up=$("#epPageUp"), down=$("#epPageDown");
  if(!list) return;
  function page(dir){ const h=list.clientHeight; list.scrollBy({ top: dir*Math.round(h*0.85), behavior:"smooth" }); }
  if(up)   up.onclick   =e=>{ e.stopPropagation(); page(-1); };
  if(down) down.onclick =e=>{ e.stopPropagation(); page(1);  };
  window.updateEpPageBtns=function(){
    if(!up||!down) return;
    const atTop = list.scrollTop <= 2;
    const atBottom = list.scrollTop + list.clientHeight >= list.scrollHeight - 2;
    const scrollable = list.scrollHeight > list.clientHeight + 4;
    up.style.display = down.style.display = scrollable ? "" : "none";
    up.disabled = atTop; down.disabled = atBottom;
  };
  list.addEventListener("scroll", ()=>updateEpPageBtns());
})();
document.addEventListener("click",()=>$("#eppanel").classList.remove("open"));$("#eppanel").addEventListener("click",e=>e.stopPropagation());
function renderEpList(){const l=$("#epList");l.innerHTML="";if(current?.type!=="series")return;
  const multi=seasonsOf(current).length>1; let activeEl=null;
  seasonsOf(current).forEach(season=>{
    if(multi){const h=document.createElement("div");h.className="ep-season";h.textContent=season.name||("Season "+season.n);l.appendChild(h);}
    season.episodes.forEach(eRaw=>{const e=Object.assign({_season:season.n},eRaw);
      const s=store.get(pkey(current,e));const pct=s&&s.dur?s.time/s.dur*100:0;const on=currentEp&&currentEp.id===e.id;const it=document.createElement("div");it.className="epitem"+(on?" on":"");it.tabIndex=0;
      it.innerHTML=`<div class="et" style="background:${epArt(e,current)}"><div class="eb" style="width:${pct}%"></div></div><div class="ex"><div class="n">${e.epLabel||e.ep}. ${esc(e.title)}</div><div class="d">${esc(e.runtime)}</div></div>`;
      const go=()=>openPlayer(current,e);it.onclick=go;it.onkeydown=ev=>{if(ev.key==="Enter"||ev.key===" "){ev.preventDefault();go();}};
      if(on)activeEl=it;l.appendChild(it);});
  });
  // open the list at the episode you're on, and refresh the page-button state
  setTimeout(()=>{ if(activeEl)activeEl.scrollIntoView({block:"center"}); if(window.updateEpPageBtns)updateEpPageBtns(); },30);
}
function nextItem(){if(current.type==="series"){const arr=eps(current);const i=arr.findIndex(e=>e.id===currentEp.id);if(i<arr.length-1)return{content:current,ep:arr[i+1]};}const ci=CATALOG.indexOf(current);const nc=CATALOG[(ci+1)%CATALOG.length];return{content:nc,ep:resume(nc).ep};}
function prevItem(){if(current.type==="series"){const arr=eps(current);const i=arr.findIndex(e=>e.id===currentEp.id);if(i>0)return{content:current,ep:arr[i-1]};}const ci=CATALOG.indexOf(current);const pc=CATALOG[(ci-1+CATALOG.length)%CATALOG.length];return{content:pc,ep:resume(pc).ep};}
function playNext(){const n=nextItem();openPlayer(n.content,n.ep);}
function playPrev(){
  // if we're more than 3s into the current item, jump back to its start first
  if(isFinite(video.currentTime) && video.currentTime>3){ video.currentTime=0; showUI(); return; }
  const p=prevItem(); if(p&&p.content) openPlayer(p.content,p.ep);
}
$("#nextBtn").onclick=playNext;$("#unBtn").onclick=playNext;$("#prevBtn").onclick=playPrev;
function fillUpNext(){const n=nextItem();$("#unArt").style.background=(n.ep&&n.ep.still)?`#000 url('${n.ep.still}') center/cover`:art(n.content);$("#unName").textContent=n.ep?n.ep.title:n.content.title;$("#unLabel").textContent=n.content===current?t("Next Episode"):t("Up Next");}
video.addEventListener("loadeddata",fillUpNext);
video.addEventListener("ended",()=>{logEvent("ended");if(saveProgress&&current)store.set(pkey(current,currentEp),{time:video.duration,dur:video.duration});if(autoNext)playNext();});
let toastT;function toast(m){const t=$("#toast");t.textContent=m;t.classList.add("show");clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove("show"),2600);}
let pCtrl=false;   // TV controls-focus mode: arrows move between on-screen buttons, OK activates
function exitCtrl(){ pCtrl=false; const a=document.activeElement; if(a&&a.blur&&player.contains(a))a.blur(); }
const isBackKey=(k,kc)=> k==="Backspace"||k==="GoBack"||k==="BrowserBack"||kc===461||kc===10009;
document.addEventListener("keydown",e=>{if(!player.classList.contains("open"))return;
  const k=e.key, kc=e.keyCode, tv=window.TVNAV;
  const eppanel=$("#eppanel"), menu=$("#menu");
  const panel = eppanel.classList.contains("open") ? eppanel : (menu.classList.contains("open") ? menu : null);
  // ---- episode / settings panel open: navigate inside it with the d-pad ----
  if(panel){
    if(k==="Escape"||isBackKey(k,kc)){ e.preventDefault(); panel.classList.remove("open"); showUI(); return; }
    if(k==="ArrowUp"||k==="ArrowDown"||k==="ArrowLeft"||k==="ArrowRight"){ e.preventDefault(); showUI();
      if(tv){ tv.arm(); tv.move(panel, k==="ArrowRight"?"right":k==="ArrowLeft"?"left":k==="ArrowDown"?"down":"up"); } return; }
    if((k==="Enter"||k===" ")&&tv){ tv.activate(document.activeElement,k,e); return; }
    return;
  }
  // ---- TV controls-focus mode: the on-screen control bar has focus ----
  if(tv && tv.armed && pCtrl){
    if(k==="Escape"||isBackKey(k,kc)||k==="ArrowDown"){ e.preventDefault(); exitCtrl(); showUI(); return; }
    if(k==="ArrowLeft"||k==="ArrowRight"||k==="ArrowUp"){ e.preventDefault(); showUI();
      tv.move($("#player"), k==="ArrowRight"?"right":k==="ArrowLeft"?"left":"up"); return; }
    if(k==="Enter"||k===" "){ tv.activate(document.activeElement,k,e); showUI(); return; }
    return;
  }
  // ---- video mode (default; desktop shortcuts unchanged) ----
  if(k===" "||k==="k"||k==="Enter"){e.preventDefault();togglePlay();showUI();}
  else if(k==="ArrowLeft"||k==="j"){video.currentTime-=10;showUI();}
  else if(k==="ArrowRight"||k==="l"){video.currentTime+=10;showUI();}
  else if(k==="ArrowUp"){ if(tv&&tv.armed){ e.preventDefault(); pCtrl=true; tv.arm(); showUI(); tv.focusFirst($("#player")); }
    else {video.volume=Math.min(1,video.volume+.1);$("#vol").value=video.volume;updMute();showUI();} }
  else if(k==="ArrowDown"){ if(!(tv&&tv.armed)){video.volume=Math.max(0,video.volume-.1);$("#vol").value=video.volume;updMute();showUI();} }
  else if(k==="m")$("#muteBtn").click();else if(k==="f")$("#fsBtn").click();
  else if(k==="n"||k==="N"){playNext();}else if(k==="p"||k==="P"){playPrev();}
  else if((k==="Escape"||isBackKey(k,kc))&&!document.fullscreenElement)closePlayer();});

/* 10) VIEWS: home / categories / search / filter --------------------------- */
function hideAllViews(){$("#results").classList.remove("on");$("#catsPage").classList.remove("on");activeFilter=null;}
let activeFilter=null;
function showHome(){hideAllViews();$("#rows").style.display="";$("#heroSection").style.display="";heroVid.play().catch(()=>{});setActive("navHome");window.scrollTo({top:0});}
function setActive(id){document.querySelectorAll(".nav .link").forEach(l=>l.classList.remove("active"));const el=document.getElementById(id);if(el)el.classList.add("active");}
function showCategories(){hideAllViews();$("#rows").style.display="none";$("#heroSection").style.display="none";heroVid.pause();$("#catsPage").classList.add("on");setActive("navCats");window.scrollTo({top:0});}
function filterRows(pred,label,keepScroll){hideAllViews();$("#rows").style.display="none";$("#heroSection").style.display="none";heroVid.pause();
  activeFilter={pred,label};
  $("#results").classList.add("on");$("#resultsH").textContent=label;const g=$("#resultsGrid");g.innerHTML="";
  const hits=vis().filter(pred);
  if(!hits.length) g.innerHTML='<div class="empty">'+(label===t("My List")?"Your list is empty. Browse the library and tap the + button on any title (on its card or detail page) to add it here.":"Nothing here yet.")+'</div>';
  else hits.forEach(c=>g.appendChild(tile(c)));
  if(!keepScroll) window.scrollTo({top:0});}
// re-run the open filtered view in place (used after add/remove from My List)
function refreshResults(){ if(activeFilter && $("#results").classList.contains("on")) filterRows(activeFilter.pred, activeFilter.label, true); }
function doSearch(q){q=q.trim().toLowerCase();if(!q){showHome();return;}
  hideAllViews();$("#rows").style.display="none";$("#heroSection").style.display="none";heroVid.pause();
  $("#results").classList.add("on");$("#resultsH").textContent=`Results for “${q}”`;const g=$("#resultsGrid");g.innerHTML="";
  const hits=vis().filter(c=>c.title.toLowerCase().includes(q)||c.genres.join(" ").toLowerCase().includes(q)||(c.type==="series"&&eps(c).some(e=>(e.title||"").toLowerCase().includes(q))));
  if(!hits.length){ g.innerHTML='<div class="empty">No titles match. Try a different title, a genre, or an episode name.</div>'; return; }
  hits.forEach(c=>{
    const t=tile(c);
    if(c.type==="series" && !c.title.toLowerCase().includes(q)){
      const ep=eps(c).find(e=>(e.title||"").toLowerCase().includes(q));   // matched on an episode
      if(ep){ t.onclick=()=>openPlayer(c,ep); const m=t.querySelector(".tile-info .m"); if(m)m.textContent=epTag(eps(c).find(e=>e.id===ep.id)||ep)+" · "+ep.title; }
    }
    g.appendChild(t);
  });
}
$("#searchInput").addEventListener("input",e=>doSearch(e.target.value));
$("#home").onclick=()=>{$("#searchInput").value="";showHome();};
$("#navHome").onclick=()=>{$("#searchInput").value="";showHome();};
$("#navMovies").onclick=()=>{setActive("navMovies");filterRows(c=>c.type==="movie",t("Movies"));};
$("#navSeries").onclick=()=>{setActive("navSeries");filterRows(c=>c.type==="series",t("TV shows"));};
$("#navCats").onclick=showCategories;
// mobile dropdown menu (shown at phone widths in place of the nav links)
(function(){
  const wrap=$("#navMenuWrap")||document.querySelector(".navmenu-wrap"), btn=$("#navMenuBtn"), menu=$("#navMenu");
  if(!btn||!menu) return;
  const close=()=>menu.classList.remove("open");
  btn.onclick=e=>{ e.stopPropagation(); menu.classList.toggle("open"); };
  menu.addEventListener("click",e=>e.stopPropagation());
  document.addEventListener("click",close);
  $("#mHome").onclick  =()=>{ close(); $("#searchInput").value=""; showHome(); };
  $("#mMovies").onclick=()=>{ close(); setActive("navMovies"); filterRows(c=>c.type==="movie",t("Movies")); };
  $("#mSeries").onclick=()=>{ close(); setActive("navSeries"); filterRows(c=>c.type==="series",t("TV shows")); };
  $("#mCats").onclick  =()=>{ close(); showCategories(); };
  $("#mAdult").onclick =()=>{ close(); openAdult(); };
})();

/* ---- adult (18+) content: hidden by default, unlocked with a password ---- */
function updateAdultMenu(){ const show=!!PROFILE && !KIDS; const na=$("#navAdult"), ma=$("#mAdult");
  if(na) na.style.display=show?"":"none"; if(ma) ma.style.display=show?"":"none"; }
function showAdult(){ setActive("navAdult"); filterRows(c=>c.adult||c.category==="Adult", "Adult (18+)"); }
function openAdult(){ if(KIDS) return;                       // never for kids profiles
  if(ADULT_UNLOCKED){ showAdult(); return; }
  $("#adultPin").value=""; $("#adultErr").style.display="none"; $("#adultForm").classList.add("open"); setTimeout(()=>$("#adultPin").focus(),50); }
$("#navAdult").onclick=openAdult;
$("#adultCancel").onclick=()=>$("#adultForm").classList.remove("open");
$("#adultOk").onclick=async()=>{
  if(!SERVER_OK){ $("#adultErr").style.display="block"; return; }
  try{
    const r=await fetch("/api/adult/unlock?token="+encodeURIComponent(TOKEN),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({pin:$("#adultPin").value})});
    if(!r.ok){ $("#adultErr").style.display="block"; return; }
    ADULT_UNLOCKED=true; $("#adultForm").classList.remove("open");
    await loadCatalog(); renderRows(); showAdult(); toast("Adult content unlocked");
  }catch{ $("#adultErr").style.display="block"; }
};
$("#adultPin").addEventListener("keydown",e=>{ if(e.key==="Enter")$("#adultOk").click(); });
$("#listShortcut").onclick=e=>{ e.stopPropagation(); $("#profileMenu").classList.toggle("open"); };
document.addEventListener("click",e=>{ if(!e.target.closest(".avatar-wrap")) $("#profileMenu").classList.remove("open"); });
$("#pmList").onclick=()=>{ $("#profileMenu").classList.remove("open"); setActive(""); filterRows(c=>inList(c.id),t("My List")); };
$("#pmSwitch").onclick=()=>{ $("#profileMenu").classList.remove("open"); adminMode=false; refreshProfiles(); $("#gate").classList.add("open"); };

/* genre grid */
function renderGenres(){const g=$("#genreGrid");g.innerHTML="";GENRES.forEach(name=>{const gr=GENRE_GRAD[name]||["#333","#111"];
  const el=document.createElement("div");el.className="genre";el.style.background=`linear-gradient(140deg,${gr[0]},${gr[1]})`;
  el.innerHTML=`<span>${t(name)}</span>`;el.onclick=()=>filterRows(c=>c.genres.includes(name),t(name));g.appendChild(el);});}

/* 11) DEV DRAWER ----------------------------------------------------------- */
function setDev(on){$("#dev").classList.toggle("open",on);$("#devScrim").classList.toggle("open",on);if(on)setTimeout(()=>$("#devClose").focus(),60);}
$("#pmSettings").onclick=()=>{$("#profileMenu").classList.remove("open");setDev(true);};$("#devClose").onclick=$("#devScrim").onclick=()=>setDev(false);
const PALETTE=["#36a3f7","#e50914","#1db954","#f0a833","#9146ff","#ff5c8a","#00d4c8"];const sw=$("#swatches");
PALETTE.forEach(c=>{const b=document.createElement("div");b.className="sw";b.dataset.c=c;b.style.background=c;b.onclick=()=>setAccent(c);sw.appendChild(b);});
const picker=document.createElement("input");picker.type="color";picker.value=accent;picker.oninput=e=>setAccent(e.target.value);sw.appendChild(picker);
function bindTg(el,get,set,after){el.onclick=()=>{set(!get());el.classList.toggle("on",get());buildEmbed();if(after)after();};}
bindTg($("#tAuto"),()=>autoPlay,v=>autoPlay=v);bindTg($("#tNext"),()=>autoNext,v=>autoNext=v);bindTg($("#tSave"),()=>saveProgress,v=>saveProgress=v);
bindTg($("#tHeroAudio"),()=>heroAudio,v=>heroAudio=v,()=>{heroMuted=!heroAudio;heroVid.muted=heroMuted;$("#heroMute").classList.toggle("on",!heroMuted);if(!heroMuted)heroVid.play().catch(()=>{});});
// Lite mode: reflects current state, lets the user force it on/off (persisted). Changing
// it reloads so the hero/preview behaviour is re-evaluated cleanly.
(function(){
  const el=$("#tLite"); if(!el) return;
  el.classList.toggle("on", LOWPOWER);
  el.onclick=()=>{
    const next=!el.classList.contains("on");
    el.classList.toggle("on",next);
    try{ localStorage.setItem("reel_lite", next?"1":"0"); }catch{}
    location.reload();
  };
})();
function buildEmbed(){const c=current||byId("steel")||CATALOG[0];if(!c){$("#embedUrl").textContent="";return;}const id=currentEp?`${c.id}/${currentEp.ep}`:c.id;const p=["color="+accent.replace("#","")];
  if(autoPlay)p.push("autoPlay=true");if(autoNext)p.push("nextEpisode=true");const t=c.type==="series"?"tv":"movie";
  $("#embedUrl").innerHTML=`&lt;iframe src="<b>https://yoursite.com/embed/${t}/${id}?${p.join("&")}</b>"<br>&nbsp;&nbsp;width="100%" height="600" allowfullscreen&gt;&lt;/iframe&gt;`;}

/* 12) PROFILES + BOOT ------------------------------------------------------ */
function bootApp(){ showHero(); resetHeroTimer(); renderRows(); updMute(); }
function paintAvatar(){ const a=$("#listShortcut"); if(PROFILE){ a.style.background=PROFILE.color; a.textContent=PROFILE.name[0].toUpperCase();
  const pa=$("#pmAv"); if(pa){ pa.style.background=PROFILE.color; pa.textContent=PROFILE.name[0].toUpperCase(); }
  const pn=$("#pmName"); if(pn) pn.textContent=PROFILE.name;
  const ps=$("#pmSub"); if(ps) ps.textContent=KIDS?"Kids profile":"Profile"; } }
const PCOLORS=["#36a3f7","#e50914","#1db954","#f0a833","#9146ff","#ff5c8a","#00d4c8","#ff7a45"];
const QUESTIONS=["What is your mother's maiden name?","Which town were you born in?","What is your father's first name?"];
let adminMode=false, ADMIN_TOKEN=null, addColor=PCOLORS[0], addKids=false, pendingProfile=null;
async function api(p,o){ const r=await fetch(p,o); if(!r.ok) throw 0; return r.json(); }

async function initProfiles(){
  try{ PROFILES=await api("/api/profiles"); SERVER_OK=true; }
  catch{ SERVER_OK=false; PROFILES=lsGet("profiles")||[]; }
  renderGate(); $("#gate").classList.add("open");
}
async function refreshProfiles(){
  if(SERVER_OK){ try{ PROFILES = adminMode ? await api("/api/admin/profiles?token="+encodeURIComponent(ADMIN_TOKEN)) : await api("/api/profiles"); }catch{} }
  renderGate();
}
function renderGate(){
  const g=$("#gateGrid"); g.innerHTML="";
  PROFILES.forEach(p=>{
    const el=document.createElement("div"); el.className="pcard";
    const lock=p.locked?'<span class="plock"><svg viewBox="0 0 24 24"><path d="M12 1a5 5 0 00-5 5v3H5v12h14V9h-2V6a5 5 0 00-5-5zm3 8H9V6a3 3 0 016 0z"/></svg></span>':"";
    const editIcon='<span class="pedit" title="Edit"><svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.8 9.94l-3.75-3.75L3 17.25zM20.7 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg></span>';
    const del='<span class="pdel" title="Delete">×</span>';
    const tools = adminMode ? (editIcon + (p.admin?"":del)) : lock;
    const label = p.admin ? '<div class="pkids">ADMIN</div>' : (p.kids ? '<div class="pkids">KIDS</div>' : "");
    el.innerHTML=`<div class="pav" style="background:${esc(p.color)}">${esc((p.name[0]||"?").toUpperCase())}${tools}</div><div class="pname">${esc(p.name)}</div>${label}`;
    el.onclick=()=>{ if(!adminMode) requestProfile(p); };
    if(adminMode){
      el.querySelector(".pedit").onclick=e=>{ e.stopPropagation(); openAdminEdit(p); };
      const db=el.querySelector(".pdel"); if(db) db.onclick=e=>{ e.stopPropagation(); delProfile(p); };
    }
    g.appendChild(el);
  });
  const add=document.createElement("div"); add.className="pcard";
  add.innerHTML=`<div class="pav padd">+</div><div class="pname">${t("Add profile")}</div>`; add.onclick=showAddForm; g.appendChild(add);
  $("#gateManage").style.display="inline-block";
  $("#gateManage").textContent=adminMode?t("Exit admin"):t("Manage profiles");
  $("#gateTitle").textContent=adminMode?"Admin · manage profiles":(PROFILES.length?t("Who's watching?"):t("Create a profile"));
  if(window.TVNAV&&TVNAV.armed&&$("#gate").classList.contains("open"))setTimeout(()=>TVNAV.focusFirst($("#gate")),60);
}

/* ---- admin sign-in (password 3119) ---- */
$("#gateManage").onclick=()=>{
  if(adminMode){ adminMode=false; ADMIN_TOKEN=null; refreshProfiles(); return; }
  if(!SERVER_OK){ adminMode=true; refreshProfiles(); return; }          // preview demo: no real admin
  $("#adminPin").value=""; $("#adminErr").style.display="none"; $("#adminForm").classList.add("open"); setTimeout(()=>$("#adminPin").focus(),50);
};
$("#adminCancel").onclick=()=>$("#adminForm").classList.remove("open");
$("#adminOk").onclick=async()=>{
  try{ const r=await fetch("/api/admin/auth",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({pin:$("#adminPin").value})});
    if(!r.ok){ $("#adminErr").style.display="block"; return; }
    ADMIN_TOKEN=(await r.json()).token; adminMode=true; $("#adminForm").classList.remove("open"); refreshProfiles();
  }catch{ $("#adminErr").style.display="block"; }
};
$("#adminPin").addEventListener("keydown",e=>{ if(e.key==="Enter")$("#adminOk").click(); });

/* ---- entering a watch profile ---- */
function pinError(){ $("#pinErr").style.display="block"; $("#pinInput").value=""; $("#pinInput").focus(); }
function requestProfile(p){
  if(p.locked){ pendingProfile=p; $("#pinTitle").textContent=p.name+" — enter PIN"; $("#pinInput").value=""; $("#pinInput").type="password"; { const e=$("#pinEye"); if(e) e.innerHTML='<path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/>'; } $("#pinErr").style.display="none";
    $("#pinForgot").style.display=p.hasQuestion?"inline-block":"none"; $("#pinForm").classList.add("open"); setTimeout(()=>$("#pinInput").focus(),50); }
  else authAndEnter(p,"");
}
$("#pinCancel").onclick=()=>$("#pinForm").classList.remove("open");
$("#pinOk").onclick=()=>{ if(pendingProfile) authAndEnter(pendingProfile, $("#pinInput").value); };
(function(){
  const eyeOpen='<path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/>';
  const eyeOff='<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>';
  const btn=$("#pinReveal");
  if(btn) btn.onclick=()=>{
    const inp=$("#pinInput"), eye=$("#pinEye");
    const show = inp.type==="password";
    inp.type = show ? "text" : "password";
    eye.innerHTML = show ? eyeOff : eyeOpen;
    btn.title = show ? "Hide PIN" : "Show PIN";
    inp.focus();
  };
})();
$("#pinInput").addEventListener("keydown",e=>{ if(e.key==="Enter")$("#pinOk").click(); });
$("#pinForgot").onclick=()=>{ if(pendingProfile) openRecover(pendingProfile); };

async function authAndEnter(p, pin){
  if(SERVER_OK){
    try{
      const r=await fetch("/api/auth",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:p.id,pin})});
      if(!r.ok) return pinError();
      const data=await r.json(); TOKEN=data.token;
      await loadCatalog(); finishEnter(data.profile);
    }catch{ pinError(); }
  } else {
    if(p.locked && pin!==(p.pin||"")) return pinError();
    finishEnter(p);
  }
}
async function loadCatalog(){ if(!SERVER_OK) return;
  try{ const lib=await api("/api/catalog?token="+encodeURIComponent(TOKEN)); if(Array.isArray(lib)&&lib.length){ CATALOG=lib; SAMPLES=false; } else if(Array.isArray(lib)) SAMPLES=true; }catch{} }
var SAMPLES=false;   // true = the server found no videos, so the built-in sample films are showing
async function loadState(){
  if(SERVER_OK){ try{ STATE=await api("/api/state/"+PROFILE.id+"?token="+encodeURIComponent(TOKEN)); }catch{ STATE={watchlist:[],kv:{}}; } }
  else STATE=lsGet("state:"+PROFILE.id)||{watchlist:[],kv:{}};
  if(!STATE.watchlist)STATE.watchlist=[]; if(!STATE.kv)STATE.kv={};
}
async function finishEnter(p){
  PROFILE=p; KIDS=!!p.kids; adminMode=false; hi=0; ADULT_UNLOCKED=false;
  await loadState(); updateAdultMenu();
  paintAvatar(); $("#pinForm").classList.remove("open"); $("#gate").classList.remove("open"); $("#searchInput").value=""; showHome(); bootApp();
  if(window.TVNAV&&TVNAV.armed)setTimeout(()=>TVNAV.focusFirst(document.body),80);
}

/* ---- create profile (optional PIN + security question) ---- */
function showAddForm(){
  addColor=PCOLORS[0]; addKids=false; $("#addName").value=""; $("#addPin").value=""; $("#addKids").classList.remove("on");
  $("#addQ").value=""; $("#addAns").value=""; $("#addAns").style.display="none";
  const ac=$("#addColors"); ac.innerHTML="";
  PCOLORS.forEach(c=>{ const s=document.createElement("div"); s.className="acsw"+(c===addColor?" on":""); s.style.background=c;
    s.onclick=()=>{ addColor=c; [...ac.children].forEach(x=>x.classList.remove("on")); s.classList.add("on"); }; ac.appendChild(s); });
  $("#addForm").classList.add("open"); setTimeout(()=>$("#addName").focus(),50);
}
$("#addQ").onchange=function(){ $("#addAns").style.display=this.value!==""?"block":"none"; };
$("#addKids").onclick=function(){ addKids=!addKids; this.classList.toggle("on",addKids); };
$("#addCancel").onclick=()=>$("#addForm").classList.remove("open");
$("#addSave").onclick=async()=>{
  const n=$("#addName").value.trim(); if(!n)return;
  const pin=$("#addPin").value.replace(/\D/g,"").slice(0,4);
  const q=$("#addQ").value, ans=$("#addAns").value.trim();
  await createProfile({name:n,color:addColor,kids:addKids,pin,securityQuestion:q===""?null:Number(q),securityAnswer:q===""?"":ans});
  $("#addForm").classList.remove("open");
};
async function createProfile(body){
  if(SERVER_OK){ try{ await fetch("/api/profiles",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)}); }catch{} await refreshProfiles(); }
  else { PROFILES.push({id:"p"+Date.now().toString(36),name:body.name,color:body.color,kids:body.kids,pin:body.pin,locked:!!body.pin,hasQuestion:body.securityQuestion!=null,_q:body.securityQuestion,_a:body.securityAnswer}); lsSet("profiles",PROFILES); renderGate(); }
}

/* ---- forgot PIN: answer the security question to reset it ---- */
let recoverProfile=null;
async function openRecover(p){
  recoverProfile=p; $("#recAns").value=""; $("#recNew").value=""; $("#recErr").style.display="none";
  let qtext="Answer your security question";
  if(SERVER_OK){ try{ const q=await api("/api/profiles/"+p.id+"/question"); if(q.question) qtext=q.question; }catch{} }
  else if(p._q!=null) qtext=QUESTIONS[p._q];
  $("#recQ").textContent=qtext;
  $("#pinForm").classList.remove("open"); $("#recoverForm").classList.add("open"); setTimeout(()=>$("#recAns").focus(),50);
}
$("#recCancel").onclick=()=>$("#recoverForm").classList.remove("open");
$("#recSave").onclick=async()=>{
  const p=recoverProfile; if(!p) return;
  const answer=$("#recAns").value, newPin=$("#recNew").value.replace(/\D/g,"").slice(0,4);
  if(SERVER_OK){
    try{ const r=await fetch("/api/profiles/"+p.id+"/recover",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({answer,newPin})});
      if(!r.ok){ $("#recErr").style.display="block"; return; }
    }catch{ $("#recErr").style.display="block"; return; }
  } else {
    if((p._a||"").trim().toLowerCase()!==answer.trim().toLowerCase()){ $("#recErr").style.display="block"; return; }
    p.pin=newPin; p.locked=!!newPin; lsSet("profiles",PROFILES);
  }
  $("#recoverForm").classList.remove("open"); refreshProfiles();
};

/* ---- admin: edit / delete any profile ---- */
let aeColor=PCOLORS[0], aeKids=false, aeProfile=null;
function openAdminEdit(p){
  aeProfile=p; aeColor=p.color; aeKids=!!p.kids;
  $("#aeTitle").textContent="Edit · "+p.name; $("#aeName").value=p.name; $("#aePin").value="";
  $("#aeKids").classList.toggle("on",aeKids); $("#aeRemove").style.display=p.locked?"inline-block":"none";
  const ac=$("#aeColors"); ac.innerHTML="";
  PCOLORS.forEach(c=>{ const s=document.createElement("div"); s.className="acsw"+(c===aeColor?" on":""); s.style.background=c;
    s.onclick=()=>{ aeColor=c; [...ac.children].forEach(x=>x.classList.remove("on")); s.classList.add("on"); }; ac.appendChild(s); });
  $("#aeForm").classList.add("open"); setTimeout(()=>$("#aeName").focus(),50);
}
$("#aeKids").onclick=function(){ aeKids=!aeKids; this.classList.toggle("on",aeKids); };
$("#aeCancel").onclick=()=>$("#aeForm").classList.remove("open");
async function adminPut(id, body){ try{ await fetch("/api/profiles/"+id,{method:"PUT",headers:{"Content-Type":"application/json","Authorization":"Bearer "+ADMIN_TOKEN},body:JSON.stringify(body)}); }catch{} }
$("#aeSave").onclick=async()=>{
  const p=aeProfile; if(!p) return;
  const body={ name:$("#aeName").value.trim()||p.name, color:aeColor, kids:aeKids };
  const np=$("#aePin").value.replace(/\D/g,""); if(np!=="") body.newPin=np;     // typed = set; blank = leave unchanged
  if(SERVER_OK) await adminPut(p.id, body);
  else { Object.assign(p,{name:body.name,color:body.color,kids:body.kids}); if(np!==""){p.pin=np;p.locked=true;} lsSet("profiles",PROFILES); }
  $("#aeForm").classList.remove("open"); refreshProfiles();
};
$("#aeRemove").onclick=async()=>{
  const p=aeProfile; if(!p) return;
  if(SERVER_OK) await adminPut(p.id, {newPin:""});
  else { p.pin=""; p.locked=false; lsSet("profiles",PROFILES); }
  $("#aeForm").classList.remove("open"); refreshProfiles();
};
async function delProfile(p){
  if(p.admin) return;
  if(SERVER_OK){ try{ await fetch("/api/profiles/"+p.id+"?token="+encodeURIComponent(ADMIN_TOKEN),{method:"DELETE"}); }catch{} await refreshProfiles(); }
  else { PROFILES=PROFILES.filter(x=>x.id!==p.id); lsSet("profiles",PROFILES); renderGate(); }
}
window.addEventListener("pagehide",()=>{ if(PROFILE){ if(SERVER_OK&&navigator.sendBeacon){ navigator.sendBeacon("/api/state/"+PROFILE.id+"?token="+encodeURIComponent(TOKEN||""),new Blob([JSON.stringify(STATE)],{type:"application/json"})); } else lsSet("state:"+PROFILE.id,STATE); } });

$("#navApps").onclick=showCategories;
$("#langBtn").onclick=e=>{ e.stopPropagation(); $("#langMenu").classList.toggle("open"); };
document.addEventListener("click",e=>{ if(!e.target.closest(".lang-wrap")) $("#langMenu").classList.remove("open"); });

window.addEventListener("scroll",()=>$("#nav").classList.toggle("solid",window.scrollY>80));
LANG=lsGet("lang")||"en"; renderLangMenu(); applyLang();
setAccent(accent); renderGenres(); initProfiles();
/* ===========================================================================
   TV / REMOTE (D-PAD) SPATIAL NAVIGATION
   Smart TVs and set-top boxes send arrow keys + OK (Enter) + a Back key, with
   no mouse. This makes every screen operable from a remote: arrows move focus
   to the nearest element in that direction, OK activates it, Back goes up a
   level. It stays invisible for mouse users until an arrow key is first used
   (or a TV is detected), so desktop behaviour is unchanged.
   =========================================================================== */
(function(){
  const FOCUS_SEL='a[href],button:not([disabled]),input:not([type=range]),select,textarea,[tabindex],.tile,.epitem,.ep,.genre,.pcard,.hero-dots i';
  const TABBABLE='.tile,.ep,.genre,.pcard,.hero-dots i';
  function makeFocusable(root){ (root||document).querySelectorAll(TABBABLE).forEach(el=>{ if(!el.hasAttribute("tabindex")) el.tabIndex=0; }); }
  function visible(el){ if(!el||el.disabled) return false; if(el.getClientRects().length===0) return false;
    const r=el.getBoundingClientRect(); return r.width>1 && r.height>1 && r.bottom>0 && r.right>0; }
  // Which layer currently owns the remote? Returns null when the player is open
  // (the player's own handler takes over there).
  function scopeEl(){
    if($("#player").classList.contains("open")) return null;
    for(const s of ["#addForm","#pinForm","#recoverForm","#adminForm","#aeForm"]){ const e=$(s); if(e&&e.classList.contains("open")) return e; }
    for(const s of [".navmenu",".lang-menu"]){ const e=document.querySelector(s+".open"); if(e) return e; }
    if($("#dev").classList.contains("open")) return $("#dev");
    if($("#detail").classList.contains("open")) return $("#detail");
    if($("#gate").classList.contains("open")) return $("#gate");
    return document.body;
  }
  function candidates(scope){ makeFocusable(scope); return [...scope.querySelectorAll(FOCUS_SEL)].filter(visible); }
  const cen=r=>({x:r.left+r.width/2,y:r.top+r.height/2});
  function pick(dir,cur,list){
    const c=cen(cur.getBoundingClientRect()); let best=null,score=Infinity;
    for(const el of list){ if(el===cur) continue; const t=cen(el.getBoundingClientRect());
      const dx=t.x-c.x, dy=t.y-c.y; let ok,prim,off;
      if(dir==="right"){ok=dx>2;prim=dx;off=Math.abs(dy);}
      else if(dir==="left"){ok=dx<-2;prim=-dx;off=Math.abs(dy);}
      else if(dir==="down"){ok=dy>2;prim=dy;off=Math.abs(dx);}
      else {ok=dy<-2;prim=-dy;off=Math.abs(dx);}
      if(!ok) continue;
      const sc=prim+off*2;                       // bias toward staying in line with the cursor
      if(sc<score){score=sc;best=el;}
    }
    return best;
  }
  function focusEl(el){ if(!el) return; el.focus({preventScroll:true}); try{ el.scrollIntoView({block:"nearest",inline:"center",behavior:"smooth"}); }catch{ el.scrollIntoView(); } }
  function move(scope,dir){ const list=candidates(scope); if(!list.length) return null;
    const ae=document.activeElement; const cur=(ae&&scope.contains(ae)&&visible(ae))?ae:null;
    if(!cur){ focusEl(list[0]); return list[0]; }
    const n=pick(dir,cur,list); if(n) focusEl(n); return n||cur; }
  function focusFirst(scope){ const list=candidates(scope); if(!list.length) return;
    const pref=scope.querySelector("#dPlay,#heroPlay,#playBtn,.pcard,.tile,button,a,[tabindex]");
    focusEl(visible(pref)?pref:list[0]); }
  // Activate the focused element. Native buttons/links fire their own Enter click,
  // and elements with their own onkeydown handle themselves — so we only synthesize
  // a click for plain focusable <div>s (tiles, episodes, profile cards) to avoid double-firing.
  function activate(a,k,e){ if(!a) return;
    if(a.onkeydown){ if(k===" ") e.preventDefault(); return; }
    if(a.tagName==="BUTTON"||a.tagName==="A"){ if(k===" "){ e.preventDefault(); a.click(); } return; }
    e.preventDefault(); a.click();
  }
  let armed=false;
  function arm(){ if(armed) return; armed=true; document.body.classList.add("tvnav"); }
  function back(){
    if($("#player").classList.contains("open")) return false;   // player owns Back when open
    if($("#dev").classList.contains("open")){ setDev(false); return true; }
    if($("#detail").classList.contains("open")){ closeDetail(); return true; }
    const open=document.querySelector(".navmenu.open,.lang-menu.open,#addForm.open,#pinForm.open,#recoverForm.open,#adminForm.open,#aeForm.open");
    if(open){ open.classList.remove("open"); return true; }
    return false;
  }
  document.addEventListener("keydown",e=>{
    const k=e.key, kc=e.keyCode;
    if($("#player").classList.contains("open")) return;          // handled by the player
    const ae=document.activeElement, tag=ae&&ae.tagName;
    const typing = ae && ((tag==="INPUT"&&ae.type!=="range")||tag==="TEXTAREA"||ae.isContentEditable);
    const isBack = k==="Escape" || ((k==="Backspace"||k==="GoBack"||k==="BrowserBack"||kc===461||kc===10009) && !typing);
    if(isBack){ if(back()){ e.preventDefault(); arm(); } return; }
    if(typing) return;                                           // let text fields keep their keys
    const scope=scopeEl(); if(!scope) return;
    if(k==="Enter"||k===" "){ if(ae&&scope.contains(ae)&&ae!==document.body){ arm(); activate(ae,k,e); } return; }
    const dir = k==="ArrowRight"?"right":k==="ArrowLeft"?"left":k==="ArrowDown"?"down":k==="ArrowUp"?"up":null;
    if(!dir) return;
    arm(); e.preventDefault(); move(scope,dir);
  }, true);   // capture phase: run before page handlers, but only preventDefault when we act
  // Auto-enable on TVs / low-power devices (already detected for the hero), and expose the API.
  try{ if(typeof LOWPOWER!=="undefined" && LOWPOWER) arm(); }catch{}
  window.TVNAV={ get armed(){return armed;}, arm, move, focusFirst, activate, candidates, visible };
})();
