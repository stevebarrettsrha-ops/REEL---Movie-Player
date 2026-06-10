/* ============================================================================
   REEL HOME SERVER  —  a tiny, zero-dependency media server for your house.
   ----------------------------------------------------------------------------
   What it does:
     1. Scans a /movies folder and a /series folder on your PC.
     2. Builds REEL's catalog automatically from the files it finds.
     3. Serves your videos with HTTP "range" support so seeking/scrubbing works.
     4. Serves the REEL front-end (reel-prime.html) with that catalog injected.

   It uses ONLY Node's built-in modules. No "npm install", nothing to download
   beyond Node itself. See README.txt for the full Windows setup.

   Run it:   node server.js
   ============================================================================ */

const http = require("http");
const fs   = require("fs");
const path = require("path");
const os   = require("os");
const crypto = require("crypto");

const PORT       = 8080;                       // change if 8080 is busy
const ROOT       = __dirname;                  // folder this file lives in
const MOVIES_DIR = path.join(ROOT, "movies");
const SERIES_DIR = path.join(ROOT, "series");
const SHORTS_DIR = path.join(ROOT, "Short Films");
const DOCS_DIR   = path.join(ROOT, "Documentaries");
const MUSIC_DIR  = path.join(ROOT, "Music Videos");
const KIDS_DIR   = path.join(ROOT, "Kids");     // anything here is auto kid-safe (streams to kids)
const ADULT_DIR  = path.join(ROOT, "Adult");    // anything here is locked behind the adult password
// extra single-file libraries. Each: { dir, genre, prefix, rating, adult }
//   rating  -> forces a rating (so Kids content is kid-safe without per-file sidecars)
//   adult   -> content is hidden until the adult password is entered, and never shown to kids
const EXTRA_DIRS = [
  { dir: SHORTS_DIR, genre: "Short Films",  prefix: "/Short%20Films/" },
  { dir: DOCS_DIR,   genre: "Documentary",  prefix: "/Documentaries/" },
  { dir: MUSIC_DIR,  genre: "Music Videos", prefix: "/Music%20Videos/" },
  { dir: KIDS_DIR,   genre: "Kids",         prefix: "/Kids/",  rating: "G" },
  { dir: ADULT_DIR,  genre: "Adult",        prefix: "/Adult/", rating: "X", adult: true },
];
// the front-end may be named reel-prime.html (shipped) or index.html (repo) — use whichever exists
const FRONTEND   = ["reel-prime.html","index.html"].map(f=>path.join(ROOT,f)).find(f=>{ try{return fs.existsSync(f);}catch{return false;} }) || path.join(ROOT,"reel-prime.html");
const DATA_DIR   = path.join(ROOT, "data");           // saved data lives here
const DATA_FILE  = path.join(DATA_DIR, "profiles.json");   // profiles + hashed PINs/answers + per-profile history

const VIDEO_EXT = [".mp4", ".m4v", ".webm", ".mov", ".ogg", ".mkv", ".avi", ".ts", ".flv", ".wmv"];
const WEB_PLAYABLE_EXT = [".mp4", ".m4v", ".webm", ".mov", ".ogg"];   // actually playable in a browser
const IMG_EXT   = [".jpg", ".jpeg", ".png", ".webp"];

const MIME = {
  ".html":"text/html; charset=utf-8", ".js":"text/javascript", ".css":"text/css",
  ".json":"application/json", ".vtt":"text/vtt",
  ".mp4":"video/mp4", ".m4v":"video/x-m4v", ".webm":"video/webm",
  ".mov":"video/quicktime", ".ogg":"video/ogg", ".mkv":"video/x-matroska",
  ".avi":"video/x-msvideo", ".ts":"video/mp2t",
  ".jpg":"image/jpeg", ".jpeg":"image/jpeg", ".png":"image/png", ".webp":"image/webp",
};

/* ---- helpers --------------------------------------------------------------- */
const GRADS = [
  ["#c2703a","#3a1d0c","#120804"], ["#9b5fb0","#341747","#100617"],
  ["#4fae6a","#15452a","#06160d"], ["#4a87ad","#143246","#06141d"],
  ["#c43d5a","#3a1020","#14060b"], ["#3a6bc4","#101f3a","#060a14"],
  ["#c4a23d","#3a3010","#141006"], ["#6b3dc4","#1f103a","#0a0614"],
  ["#3dc4a2","#103a30","#06140f"], ["#c43d9b","#3a1030","#140618"],
];
function hash(s){ let h=0; for(let i=0;i<s.length;i++){ h=(h*31+s.charCodeAt(i))>>>0; } return h; }
function gradFor(name){ return GRADS[hash(name)%GRADS.length]; }
function scoreFor(name){ return 80 + (hash(name)%19); }            // 80–98, stable
function slug(s){ return s.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,""); }
function isRecent(file){ try { return (Date.now()-fs.statSync(file).mtimeMs) < 14*864e5; } catch { return false; } }
function isUnder(fp, dir){ return fp===dir || fp.startsWith(dir + path.sep); }   // true when fp lives inside dir

// "The Title (2019).mp4" -> {title:"The Title", year:2019}
function parseMovieName(file){
  let base = path.basename(file, path.extname(file));
  let year = null;
  const m = base.match(/\(?((?:19|20)\d{2})\)?\s*$/);
  if(m){ year = +m[1]; base = base.slice(0, m.index).trim(); }
  base = base.replace(/[._]+/g," ").replace(/\s+/g," ").trim();
  return { title: base || path.basename(file), year };
}
// "S01E02 - Name.mp4" / "Show - 1x02 - Name.mp4" -> {season, ep, title}
function parseEpisode(file){
  const base = path.basename(file, path.extname(file));
  // S01E25-E26 / S01E25E26 / 1x25-26  -> capture the episode RANGE
  let m = base.match(/[Ss](\d{1,2})[\s._-]*[Ee](\d{1,3})(?:[\s._-]*[-–eE]+\s*(\d{1,3}))?/);
  if(!m) m = base.match(/(\d{1,2})x(\d{1,3})(?:[\s._-]*[-–]\s*(\d{1,3}))?/);
  const season = m ? +m[1] : null;       // null = unknown; caller may fill from folder name
  const ep     = m ? +m[2] : null;
  const epEnd  = m && m[3] ? +m[3] : null;
  let title = base;
  if(m) title = base.slice(m.index + m[0].length);
  title = title.replace(/^[\s._-]+/,"").replace(/[._]+/g," ").trim();
  return { season, ep, epEnd, title };
}
// "Season 4 (2002)" -> 4 ; "Specials (1995-2014)" / "Extras" -> 0 ; else null
// Map a folder name to a special bucket. Returns:
//   a number  -> that season ("Season 4", "S04")
//   "shorts" / "movies" / "specials" / "extras"  -> a named non-numbered bucket
//   null      -> nothing recognised
function bucketFromFolder(name){
  if(/short/i.test(name))                         return "shorts";
  if(/\bmovie\b|\bfilm\b/i.test(name))            return "movies";
  if(/special|extra|bonus|ova|deleted/i.test(name)) return "specials";
  const m = name.match(/season\s*(\d{1,3})/i) || name.match(/^s(\d{1,3})\b/i);
  if(m) return +m[1];
  return null;
}
// legacy numeric-only helper still used elsewhere
function seasonFromFolder(name){ const b=bucketFromFolder(name); return (typeof b==="number")?b:(b?0:null); }
// Recursively collect every video under a directory, remembering its relative path.
// Stops descending into any subfolder named like a separate show bucket is NOT done here;
// the caller decides which top-level dirs are shows.
function walkVideos(rootDir, rel=""){
  const out = [];
  let entries = [];
  try { entries = fs.readdirSync(path.join(rootDir, rel), { withFileTypes:true }); } catch { return out; }
  for(const e of entries){
    const childRel = rel ? rel + "/" + e.name : e.name;
    if(e.isDirectory()) out.push(...walkVideos(rootDir, childRel));
    else if(VIDEO_EXT.includes(path.extname(e.name).toLowerCase())) out.push(childRel);
  }
  return out;
}
// optional sidecar:  same-name .json  with {title,year,genres,desc,rating,cast,runtime,score}
function readSidecar(videoPath){
  const j = videoPath.replace(path.extname(videoPath), ".json");
  try { return JSON.parse(fs.readFileSync(j, "utf8")); } catch { return {}; }
}
// Find a poster image for a video file. Looks for, in order:
//   1) <same name>.jpg/.png/.webp   (e.g.  Body Temple (1).jpg )
//   2) poster.jpg / cover.jpg / folder.jpg in the same folder (good for series)
//   3) an auto-extracted frame in data/thumbs/ (made by ffmpeg if available)
// Returns a URL path the browser can load, or null.
function findPoster(videoFull, urlPrefix, rel){
  const dir = path.dirname(videoFull);
  const baseNoExt = path.basename(videoFull, path.extname(videoFull));
  // helper: build the browser URL for an image filename living next to this video
  const relDir = rel ? rel.split("/").slice(0,-1) : [];
  const toUrl = imgName => urlPrefix + "/" + [...relDir, imgName].map(encodeURIComponent).join("/");
  for(const ext of IMG_EXT){
    const cand = path.join(dir, baseNoExt + ext);
    if(fs.existsSync(cand)) return rel ? toUrl(baseNoExt+ext) : urlPrefix + encodeURIComponent(baseNoExt + ext);
  }
  for(const name of ["poster","cover","folder"]){
    for(const ext of IMG_EXT){
      if(fs.existsSync(path.join(dir, name+ext))) return rel ? toUrl(name+ext) : urlPrefix + encodeURIComponent(name+ext);
    }
  }
  // No image on disk. DON'T run ffmpeg here (that would block startup for every file).
  // Instead hand back a lazy thumbnail URL; the /_thumbs/ route generates the frame
  // on first request and caches it. Encodes the source path so the route can find it.
  if(hasFfmpeg()){
    const key = slug(path.basename(videoFull)) || "thumb";
    return "/_thumbs/" + encodeURIComponent(key) + ".jpg?src=" + encodeURIComponent(videoFull);
  }
  return null;
}
function thumbPathFor(videoFull){
  const key = slug(path.basename(videoFull)) || "thumb";
  return path.join(DATA_DIR, "thumbs", key + ".jpg");
}
// Extract one representative frame with ffmpeg into data/thumbs/ (cached).
// If ffmpeg isn't installed this silently returns null and we fall back to a gradient.
let FFMPEG = undefined;   // undefined = not checked yet, null = unavailable, string = path/command
function hasFfmpeg(){
  if(FFMPEG !== undefined) return FFMPEG;
  try { require("child_process").execSync(process.platform==="win32"?"where ffmpeg":"command -v ffmpeg",{stdio:"ignore"}); FFMPEG="ffmpeg"; }
  catch { FFMPEG=null; }
  return FFMPEG;
}
// Run ffmpeg/ffprobe WITHOUT blocking the event loop. The old code used execFileSync,
// which froze the entire single-threaded server for the whole job — up to 30 minutes for
// an audio re-encode, during which nobody else could stream. These run a child process
// and resolve a promise, so the server keeps serving everyone else.
const execFileP = require("util").promisify(require("child_process").execFile);
function runFfmpeg(args, timeoutMs){
  return new Promise((resolve, reject) => {
    const cp = require("child_process").spawn("ffmpeg", args, { stdio:"ignore" });
    const to = setTimeout(() => { try{ cp.kill("SIGKILL"); }catch{} reject(new Error("timeout")); }, timeoutMs);
    cp.on("error", e => { clearTimeout(to); reject(e); });
    cp.on("close", code => { clearTimeout(to); code === 0 ? resolve() : reject(new Error("ffmpeg exit "+code)); });
  });
}

// Browsers can decode AAC/MP3/Opus/Vorbis/FLAC audio. AC3/EAC3/DTS/TrueHD (common in
// Web-DL & Blu-ray rips) play NO sound in a browser. Detect the audio codec with ffprobe
// so we can warn the viewer and offer a one-click fix.
const WEB_AUDIO = ["aac","mp3","opus","vorbis","flac"];
const audioCodecCache = {};   // path -> codec string (cached in data/audio-cache.json)
async function audioCodecOf(videoFull){
  if(!hasFfmpeg()) return null;                 // can't tell without ffprobe; assume ok
  try{
    const st = fs.statSync(videoFull); const ck = videoFull + ":" + st.size;
    if(audioCodecCache[ck]) return audioCodecCache[ck];
    const { stdout } = await execFileP("ffprobe", [
      "-v", "error", "-select_streams", "a:0",
      "-show_entries", "stream=codec_name", "-of", "csv=p=0", videoFull
    ], { timeout:8000 });
    const out = stdout.toString().trim().replace(/,+$/,"");
    audioCodecCache[ck] = out || "none";
    return audioCodecCache[ck];
  }catch{ return null; }
}
// returns true only when we KNOW the audio won't play in a browser
async function audioUnplayable(videoFull){
  const c = await audioCodecOf(videoFull);
  if(!c || c==="none") return false;            // unknown / no audio -> don't cry wolf
  return !WEB_AUDIO.includes(c.toLowerCase());
}
async function makeThumb(videoFull, outPath){
  if(!hasFfmpeg()) return false;
  try{
    fs.mkdirSync(path.dirname(outPath), { recursive:true });
    for(const ss of [12, 4, 1, 0]){     // shorter clips fall through to an earlier frame
      try{
        await runFfmpeg([
          "-y", "-ss", String(ss), "-i", videoFull,
          "-frames:v", "1", "-vf", "scale=640:-1", outPath
        ], 20000);
        if(fs.existsSync(outPath) && fs.statSync(outPath).size > 0) return true;
      }catch{ /* try next seek point */ }
    }
    return false;
  }catch{ return false; }
}
function listVideos(dir){
  try { return fs.readdirSync(dir).filter(f => VIDEO_EXT.includes(path.extname(f).toLowerCase())); }
  catch { return []; }
}

/* ---- build the catalog from disk ------------------------------------------ */
function buildLibrary(){
  const lib = [];
  const seen = {};
  const uid = s => { let id=slug(s)||"item"; while(seen[id]) id+="-x"; seen[id]=1; return id; };

  // MOVIES
  for(const f of listVideos(MOVIES_DIR)){
    const full = path.join(MOVIES_DIR, f);
    const { title, year } = parseMovieName(f);
    const side = readSidecar(full);
    const localPoster = findPoster(full, "/movies/");
    lib.push({
      id: uid(side.title || title), type:"movie",
      title: side.title || title, year: side.year || year || "",
      rating: side.rating || "NR", runtime: side.runtime || "", cc: false,
      license: "Local file", score: side.score || scoreFor(title),
      genres: side.genres || ["Drama"], cast: side.cast || "",
      accolade: side.accolade || null, badge: side.badge || (isRecent(full) ? "RECENTLY ADDED" : null),
      desc: side.desc || "",
      grad: side.grad || gradFor(title),
      poster: side.poster || localPoster || null,
      backdrop: side.backdrop || localPoster || null,
      src: "/movies/" + encodeURIComponent(f),
      playable: WEB_PLAYABLE_EXT.includes(path.extname(f).toLowerCase()),
    });
  }

  // EXTRA single-file libraries: Short Films / Documentaries / Music Videos / Kids / Adult
  for(const { dir, genre: defGenre, prefix, rating: defRating, adult } of EXTRA_DIRS){
    for(const f of listVideos(dir)){
      const full = path.join(dir, f);
      const { title, year } = parseMovieName(f);
      const side = readSidecar(full);
      const localPoster = findPoster(full, prefix);
      lib.push({
        id: uid(side.title || title), type:"movie",
        title: side.title || title, year: side.year || year || "",
        rating: side.rating || defRating || "NR", runtime: side.runtime || "", cc: false,
        license: "Local file", score: side.score || scoreFor(title),
        genres: side.genres || [defGenre], category: defGenre, cast: side.cast || "",
        adult: !!adult,
        accolade: side.accolade || null, badge: side.badge || (isRecent(full) ? "RECENTLY ADDED" : null),
        desc: side.desc || "",
        grad: side.grad || gradFor(title),
        poster: side.poster || localPoster || null,
        backdrop: side.backdrop || localPoster || null,
        src: prefix + encodeURIComponent(f),
        playable: WEB_PLAYABLE_EXT.includes(path.extname(f).toLowerCase()),
      });
    }
  }

  // SERIES  ( series/<ShowName>/...  — episodes may sit in season subfolders, any depth )
  let showDirs = [];
  try { showDirs = fs.readdirSync(SERIES_DIR).filter(d => { try { return fs.statSync(path.join(SERIES_DIR,d)).isDirectory(); } catch { return false; } }); } catch {}
  for(const show of showDirs){
    const dir = path.join(SERIES_DIR, show);
    const relFiles = walkVideos(dir);          // every video anywhere under the show folder
    if(!relFiles.length) continue;
    const side = readSidecar(path.join(dir, "_show"));
    const showPrefix = "/series/" + encodeURIComponent(show) + "/";
    const urlFor = rel => showPrefix + rel.split("/").map(encodeURIComponent).join("/");

    // Decide each file's bucket. PRIORITY:
    //   1. a special folder (Shorts / Movie / Specials/Extras) — always wins
    //   2. a numbered "Season N" FOLDER — wins over the filename's SxxExx, because
    //      the folder is the user's real intent (rips often mislabel files as S01)
    //   3. the filename's SxxExx season — only when there's no season folder
    //   4. season 1 as a last resort
    // The filename's EPISODE number is always kept for ordering inside the bucket.
    const parsed = relFiles.map((rel, idx) => {
      const p = parseEpisode(rel);
      const parts = rel.split("/"); parts.pop();
      let folderBucket = null;
      for(let i=parts.length-1; i>=0; i--){ const b=bucketFromFolder(parts[i]); if(b!=null){ folderBucket=b; break; } }
      let key;
      if(typeof folderBucket === "string")      key = folderBucket;   // 1. special folder
      else if(typeof folderBucket === "number") key = folderBucket;   // 2. Season N folder (beats filename)
      else if(p.season != null)                 key = p.season;       // 3. filename season
      else                                      key = 1;              // 4. fallback
      return { rel, key, ep: p.ep, epEnd: p.epEnd, title: p.title, idx };
    });

    // order: numbered seasons first (ascending), then Specials, Shorts, Movies
    const ORDER = { specials:9000, shorts:9001, movies:9002 };
    const keyRank = k => (typeof k === "number") ? k : (ORDER[k] ?? 9500);
    parsed.sort((a,b)=> keyRank(a.key)-keyRank(b.key) || (a.ep??1e9)-(b.ep??1e9) || a.idx-b.idx);

    // group into buckets
    const bySeason = new Map();
    let counter = 0;
    for(const p of parsed){
      if(!bySeason.has(p.key)) bySeason.set(p.key, []);
      const full = path.join(dir, p.rel);
      const label = p.epEnd ? `${p.ep}-${p.epEnd}` : (p.ep!=null ? `${p.ep}` : `${bySeason.get(p.key).length+1}`);
      let title = p.title;
      if(!title) title = (typeof p.key==="string") ? `${p.key} ${label}` : `Episode ${label}`;
      bySeason.get(p.key).push({
        id: "e"+(++counter),
        ep: p.ep!=null ? p.ep : (bySeason.get(p.key).length+1),
        epLabel: label,
        title,
        runtime: "", desc: "",
        still: findPoster(full, showPrefix.slice(0,-1), p.rel) || null,
        src: urlFor(p.rel),
        playable: WEB_PLAYABLE_EXT.includes(path.extname(p.rel).toLowerCase()),
      });
    }
    const NAMES = { specials:"Specials", shorts:"Shorts", movies:"Movie" };
    const seasons = [...bySeason.keys()].sort((a,b)=>keyRank(a)-keyRank(b)).map(k => ({
      n: (typeof k==="number")?k:0,
      key: String(k),
      name: (typeof k==="number") ? "Season "+k : (NAMES[k]||String(k)),
      episodes: bySeason.get(k)
    }));
    const epCount = parsed.length;

    // show poster: an image at the show root, else the first episode image we found
    let showPoster = null;
    for(const name of ["poster","cover","folder"]){ for(const ext of IMG_EXT){ if(fs.existsSync(path.join(dir,name+ext))){ showPoster=showPrefix+encodeURIComponent(name+ext); break; } } if(showPoster) break; }
    if(!showPoster){ for(const s of seasons){ const e=s.episodes.find(e=>e.still); if(e){ showPoster=e.still; break; } } }

    lib.push({
      id: uid(side.title || show), type:"series",
      title: side.title || show.replace(/[._]+/g," ").trim(),
      year: side.year || "", rating: side.rating || "NR",
      runtime: epCount + (epCount===1?" episode":" episodes"), cc:false,
      license:"Local files", score: side.score || scoreFor(show),
      genres: side.genres || ["Action and adventure"], cast: side.cast || "",
      accolade: side.accolade || null, badge: side.badge || null,
      desc: side.desc || "",
      grad: side.grad || gradFor(show),
      poster: side.poster || showPoster || null,
      backdrop: side.backdrop || showPoster || null,
      seasons,
    });
  }
  return lib;
}

/* ---- the front-end is now served statically; the catalog is fetched per
        profile (after PIN auth) from /api/catalog so locks are enforced ----- */

/* ---- stream a file with HTTP range support (this is what enables seeking) -- */
function serveFile(req, res, filePath){
  let stat;
  try { stat = fs.statSync(filePath); } catch { res.writeHead(404); return res.end("Not found"); }
  const type  = MIME[path.extname(filePath).toLowerCase()] || "application/octet-stream";
  const range = req.headers.range;

  // Pipe a read stream and ALWAYS destroy it when the client goes away. Without this,
  // every aborted request (TVs seeking/closing constantly) leaks an open file handle
  // until the process hits its open-file limit and all reads start failing.
  function pipe(opts, headers, code){
    res.writeHead(code, headers);
    if(req.method === "HEAD") return res.end();        // headers only, no body
    const stream = fs.createReadStream(filePath, opts);
    const done = () => stream.destroy();
    res.on("close", done);
    stream.on("error", () => { try{ res.end(); }catch{} });
    stream.on("end", () => res.removeListener("close", done));
    stream.pipe(res);
  }

  if(range){
    const m = range.match(/bytes=(\d*)-(\d*)/);
    let start = m && m[1] ? parseInt(m[1],10) : 0;
    let end   = m && m[2] ? parseInt(m[2],10) : stat.size - 1;
    if(start > end || start >= stat.size){ res.writeHead(416,{"Content-Range":`bytes */${stat.size}`}); return res.end(); }
    pipe({ start, end }, {
      "Content-Range": `bytes ${start}-${end}/${stat.size}`,
      "Accept-Ranges": "bytes",
      "Content-Length": end - start + 1,
      "Content-Type": type,
    }, 206);
  } else {
    pipe({}, { "Content-Length": stat.size, "Content-Type": type, "Accept-Ranges":"bytes" }, 200);
  }
}

/* ---- TMDB enrichment (real poster/backdrop art) ---------------------------
   Put your free API key in a file called  tmdb.key  next to this server,
   or set the TMDB_KEY environment variable. No key = gradients only (fine).
   Results are cached to tmdb-cache.json so the API is hit at most once
   per title. Family home-video files simply won't match and stay gradient. */
const TMDB_KEY = process.env.TMDB_KEY ||
  (()=>{ try { return fs.readFileSync(path.join(ROOT,"tmdb.key"),"utf8").trim(); } catch { return ""; } })();
const TMDB_CACHE = path.join(DATA_DIR, "tmdb-cache.json");
let tmdbCache = (()=>{ try { return JSON.parse(fs.readFileSync(TMDB_CACHE,"utf8")); } catch { return {}; } })();
function saveTmdbCache(){ try { fs.writeFileSync(TMDB_CACHE, JSON.stringify(tmdbCache,null,2)); } catch {} }

async function tmdbLookup(title, year, isTV){
  if(!TMDB_KEY || !title) return null;
  const cacheKey = (isTV?"tv:":"mv:") + title.toLowerCase() + (year ? "|"+year : "");
  if(cacheKey in tmdbCache) return tmdbCache[cacheKey];
  let out = null;
  try {
    const type = isTV ? "tv" : "movie";
    let u = `https://api.themoviedb.org/3/search/${type}?api_key=${TMDB_KEY}&query=${encodeURIComponent(title)}`;
    u += isTV ? (year?`&first_air_date_year=${year}`:"") : (year?`&year=${year}`:"");
    const r = await fetch(u);
    const j = await r.json();
    const hit = j && j.results && j.results[0];
    if(hit) out = {
      id: hit.id,
      poster:   hit.poster_path   ? "https://image.tmdb.org/t/p/w500"  + hit.poster_path   : null,
      backdrop: hit.backdrop_path ? "https://image.tmdb.org/t/p/w1280" + hit.backdrop_path : null,
      overview: hit.overview || "",
    };
  } catch(e){ out = null; }   // network/API failure -> just fall back to gradient
  tmdbCache[cacheKey] = out; saveTmdbCache();
  return out;
}
// fetch a season's episodes: { [episodeNumber]: {still, name, overview, runtime} }
async function tmdbSeason(showId, seasonNum){
  if(!TMDB_KEY || !showId) return {};
  const ck = "season:"+showId+":"+seasonNum;
  if(ck in tmdbCache) return tmdbCache[ck] || {};
  let map = {};
  try {
    const r = await fetch(`https://api.themoviedb.org/3/tv/${showId}/season/${seasonNum}?api_key=${TMDB_KEY}`);
    const j = await r.json();
    if(j && Array.isArray(j.episodes)) for(const e of j.episodes){
      map[e.episode_number] = {
        still:    e.still_path ? "https://image.tmdb.org/t/p/w300" + e.still_path : null,
        name:     e.name || "", overview: e.overview || "", runtime: e.runtime || null,
      };
    }
  } catch(e){ map = {}; }
  tmdbCache[ck] = map; saveTmdbCache();
  return map;
}
async function enrich(lib){
  if(!TMDB_KEY) return lib;
  for(const c of lib){
    const info = await tmdbLookup(c.title, c.year, c.type==="series");
    if(!info) continue;
    c.poster = info.poster; c.backdrop = info.backdrop;
    if(!c.desc && info.overview) c.desc = info.overview;
    if(c.type==="series" && info.id && c.seasons && c.seasons[0]){
      const season = await tmdbSeason(info.id, c.seasons[0].n || 1);
      for(const ep of c.seasons[0].episodes){
        const td = season[ep.ep]; if(!td) continue;
        ep.still = td.still;
        if((!ep.title || /^Episode\s/i.test(ep.title)) && td.name) ep.title = td.name;
        if(!ep.desc && td.overview) ep.desc = td.overview;
        if(!ep.runtime && td.runtime) ep.runtime = td.runtime + "m";
      }
    }
  }
  return lib;
}
// Cache the built+enriched catalog briefly. buildLibrary() walks every media folder with
// synchronous fs calls; doing that on EVERY /api/catalog hit blocked the event loop and
// stalled the home screen for every device. A short TTL keeps things fresh (new files
// appear within a few seconds) while collapsing a burst of requests into one disk scan.
let _libCache = null, _libCacheAt = 0;
const LIB_TTL = 10000;
function invalidateLibrary(){ _libCache = null; }
async function getLibrary(){
  const now = Date.now();
  if(_libCache && (now - _libCacheAt) < LIB_TTL) return _libCache;
  const lib = await enrich(buildLibrary());
  _libCache = lib; _libCacheAt = now;
  return lib;
}

/* ---- profile + history persistence ---------------------------------------- */
function readData(){ try{ return JSON.parse(fs.readFileSync(DATA_FILE,"utf8")); }catch{ return {profiles:[],state:{}}; } }
// Write atomically: a crash mid-write used to truncate profiles.json and wipe every
// profile + hashed PIN. Writing to a temp file then renaming makes the swap all-or-nothing.
function writeData(d){ try{ const tmp = DATA_FILE + ".tmp"; fs.writeFileSync(tmp, JSON.stringify(d,null,2)); fs.renameSync(tmp, DATA_FILE); }catch(e){ console.error("  save failed:", e.message); } }
function collectBody(req,cb){ let b=""; req.on("data",c=>{ b+=c; if(b.length>5e6) req.destroy(); }); req.on("end",()=>{ try{ cb(JSON.parse(b||"{}")); }catch{ cb({}); } }); }
function genId(){ return "p"+Date.now().toString(36)+Math.random().toString(36).slice(2,6); }
function sendJSON(res,obj,code){ res.writeHead(code||200,{ "Content-Type":"application/json" }); res.end(JSON.stringify(obj)); }

/* ---- real, server-enforced locks: hashed PINs + session tokens ------------
   PINs are salted+hashed with scrypt (never stored or sent in the clear).
   A correct PIN returns a random session token; the catalog and a profile's
   history are only served to a request carrying a valid token. So a kids
   profile literally never receives adult titles, and a locked profile can't
   be entered (or its history read) without the PIN. */
// Kid-safe ratings. NOTE: "NR" (the default for any file without a sidecar rating) is
// deliberately NOT here — otherwise every unrated local file would show on kids profiles,
// defeating the lock. Tag a title kid-safe by giving its sidecar .json a rating like "G"/"PG".
const KID_RATINGS = ["G","PG","TV-Y","TV-Y7","TV-G","TV-PG"];
const isKidRated = c => KID_RATINGS.includes((c.rating||"NR").toUpperCase());
// Per-rating media gate: a kids session may only fetch media (video or artwork) that
// belongs to a kid-rated title. Without this, a kid could stream an adult file by typing
// its URL directly, since the catalog filter only hides it from the listing.
async function kidMediaAllowed(decodedUrl){
  const dec = u => { try{ return decodeURIComponent(u); }catch{ return u; } };
  const lib = await getLibrary();
  for(const c of lib){
    if(!isKidRated(c)) continue;
    for(const u of [c.src, c.poster, c.backdrop]) if(u && dec(u)===decodedUrl) return true;
    if(c.seasons) for(const se of c.seasons) for(const e of (se.episodes||[]))
      for(const u of [e.src, e.still]) if(u && dec(u)===decodedUrl) return true;
  }
  return false;
}
// One gate for every route that touches a media file (stream, poster, audiocheck,
// fixaudio): a kids session may only reach kid-rated media and never the Adult folder;
// any other session needs the adult password before reaching the Adult folder. Keeping
// this in one place stops the rules from drifting apart between routes.
async function mediaAllowed(s, decodedUrl, fp){
  const underAdult = isUnder(fp, ADULT_DIR);
  if(s.kids){ if(underAdult) return false; return await kidMediaAllowed(decodedUrl); }
  if(underAdult && !s.adultUnlocked) return false;
  return true;
}
const SECURITY_QUESTIONS = [
  "What is your mother's maiden name?",
  "Which town were you born in?",
  "What is your father's first name?",
];
const sessions = {};   // token -> { profileId, kids, admin, exp }
const SESSION_TTL = 24*60*60*1000;   // tokens expire after 24h (were immortal -> slow leak)
// reap expired sessions so the map can't grow without bound
setInterval(() => { const now=Date.now(); for(const t in sessions){ if(sessions[t].exp < now) delete sessions[t]; } }, 60*60*1000).unref?.();
// Simple brute-force throttle: 4-digit PINs are only 10k combos, so without this an
// attacker on the WiFi could try them all in seconds. After 5 wrong tries for a given
// profile, that profile is locked out for 30s.
const loginFails = {};   // key -> { n, until }
function lockedOut(key){ const e=loginFails[key]; return (e && e.until>Date.now()) ? Math.ceil((e.until-Date.now())/1000) : 0; }
function noteFail(key){ const e=loginFails[key]||{n:0,until:0}; e.n++; if(e.n>=5){ e.until=Date.now()+30000; e.n=0; } loginFails[key]=e; }
function clearFail(key){ delete loginFails[key]; }
function hashSecret(v){ const salt=crypto.randomBytes(16).toString("hex"); const h=crypto.scryptSync(String(v),salt,32).toString("hex"); return salt+":"+h; }
function verifySecret(v, stored){ if(!stored) return false; const [salt,h]=String(stored).split(":"); if(!salt||!h) return false;
  const calc=crypto.scryptSync(String(v),salt,32).toString("hex"); const a=Buffer.from(h,"hex"), b=Buffer.from(calc,"hex");
  return a.length===b.length && crypto.timingSafeEqual(a,b); }
const hashPin = hashSecret, verifyPin = verifySecret;                  // PINs and answers share the scheme
const normAns = a => String(a||"").trim().toLowerCase().replace(/\s+/g," ");   // answers are case/space-insensitive
function newToken(){ return crypto.randomBytes(24).toString("hex"); }
function cookieToken(req){ const c=req.headers.cookie||""; const m=c.match(/(?:^|;\s*)reel_session=([^;]+)/); return m?decodeURIComponent(m[1]):null; }
function getToken(req){ try{ const u=new URL(req.url,"http://x"); const q=u.searchParams.get("token");
  const h=req.headers.authorization; return q || (h && h.startsWith("Bearer ") ? h.slice(7) : null) || cookieToken(req); }catch{ return cookieToken(req); } }
function sessionFor(req){ const t=getToken(req); const s = t ? sessions[t] : null;
  if(s && s.exp < Date.now()){ delete sessions[t]; return null; }   // expired
  if(s) s.exp = Date.now() + SESSION_TTL;                            // sliding expiry on use
  return s; }
// <video>/<img> tags can't send a Bearer header, so also drop the token in a cookie:
// that lets the browser stream protected media while the session lasts.
function setSessionCookie(res, token){ res.setHeader("Set-Cookie", `reel_session=${encodeURIComponent(token)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_TTL/1000}`); }
function isAdmin(req){ const s=sessionFor(req); return !!(s && s.admin); }
// picker list: real (non-admin) profiles only, with no secrets
function publicProfiles(d){ return d.profiles.filter(p=>!p.admin).map(p=>({ id:p.id, name:p.name, color:p.color, kids:!!p.kids, locked:!!p.pinHash, hasQuestion:p.qIndex!=null })); }
// admin management list: everyone, with flags (still no hashes)
function adminProfiles(d){ return d.profiles.map(p=>({ id:p.id, name:p.name, color:p.color, kids:!!p.kids, locked:!!p.pinHash, hasQuestion:p.qIndex!=null, admin:!!p.admin })); }
// seed a built-in Admin (password 3119) the first time the server runs
function ensureAdmin(){ const d=readData(); if(!d.profiles.some(p=>p.admin)){
  d.profiles.push({ id:"admin", name:"Admin", color:"#8a96a6", admin:true, kids:false, pinHash:hashPin("3119"), qIndex:null, ansHash:null });
  d.state["admin"]={ watchlist:[], kv:{} }; writeData(d);
  console.log("  (Seeded Admin profile — password 3119. Change it in admin mode and see README.)"); } }
// seed the adult-content password (default 3119, or the ADULT_PIN env var) on first run
function ensureAdultPin(){ const d=readData(); if(!d.adultPinHash){ d.adultPinHash=hashPin(process.env.ADULT_PIN||"3119"); writeData(d); } }

/* ---- request router -------------------------------------------------------- */
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);

  if(url === "/" || url === "/index.html"){ return serveFile(req, res, FRONTEND); }

  // ---- auth: exchange (profile id + PIN) for a session token ----
  if(url === "/api/auth" && req.method === "POST"){
    return collectBody(req, body => {
      const d=readData(); const p=d.profiles.find(x=>x.id===body.id);
      if(!p || p.admin) return sendJSON(res,{ error:"no such profile" },404);   // admin can't be entered as a watch profile
      const wait = lockedOut("p:"+body.id); if(wait) return sendJSON(res,{ error:"too many attempts", retryAfter:wait },429);
      if(p.pinHash && !verifyPin(body.pin||"", p.pinHash)){ noteFail("p:"+body.id); return sendJSON(res,{ error:"wrong pin" },401); }
      clearFail("p:"+body.id);
      const token=newToken(); sessions[token]={ profileId:p.id, kids:!!p.kids, admin:false, exp:Date.now()+SESSION_TTL };
      setSessionCookie(res, token);
      sendJSON(res,{ token, profile:{ id:p.id, name:p.name, color:p.color, kids:!!p.kids } });
    });
  }
  // ---- admin sign-in (password 3119 by default) ----
  if(url === "/api/admin/auth" && req.method === "POST"){
    return collectBody(req, body => {
      const d=readData(); const a=d.profiles.find(p=>p.admin);
      const wait = lockedOut("admin"); if(wait) return sendJSON(res,{ error:"too many attempts", retryAfter:wait },429);
      if(!a || !verifyPin(body.pin||"", a.pinHash)){ noteFail("admin"); return sendJSON(res,{ error:"wrong password" },401); }
      clearFail("admin");
      const token=newToken(); sessions[token]={ profileId:a.id, kids:false, admin:true, exp:Date.now()+SESSION_TTL };
      setSessionCookie(res, token);
      sendJSON(res,{ token });
    });
  }
  // ---- adult content unlock: exchange the adult password for an unlock on this session ----
  if(url === "/api/adult/unlock" && req.method === "POST"){
    const s=sessionFor(req); if(!s) return sendJSON(res,{ error:"unauthorized" },401);
    if(s.kids) return sendJSON(res,{ error:"forbidden" },403);     // a kids session can never unlock adult content
    return collectBody(req, body => {
      const wait = lockedOut("adult"); if(wait) return sendJSON(res,{ error:"too many attempts", retryAfter:wait },429);
      const stored = readData().adultPinHash;
      if(!stored || !verifyPin(body.pin||"", stored)){ noteFail("adult"); return sendJSON(res,{ error:"wrong password" },401); }
      clearFail("adult"); s.adultUnlocked=true; sendJSON(res,{ ok:true });
    });
  }
  if(url === "/api/admin/profiles" && req.method === "GET"){
    if(!isAdmin(req)) return sendJSON(res,{ error:"unauthorized" },401);
    return sendJSON(res, adminProfiles(readData()));
  }
  // ---- which security question a profile uses (answer is never revealed) ----
  if(url.startsWith("/api/profiles/") && url.endsWith("/question") && req.method === "GET"){
    const id=url.split("/")[3]; const p=readData().profiles.find(x=>x.id===id);
    if(!p) return sendJSON(res,{ error:"no such profile" },404);
    return sendJSON(res,{ index:p.qIndex, question: p.qIndex!=null ? SECURITY_QUESTIONS[p.qIndex] : null });
  }
  // ---- self-service recovery: answer the security question to reset the PIN ----
  if(url.startsWith("/api/profiles/") && url.endsWith("/recover") && req.method === "POST"){
    const id=url.split("/")[3];
    return collectBody(req, body => {
      const d=readData(); const p=d.profiles.find(x=>x.id===id);
      if(!p) return sendJSON(res,{ error:"no such profile" },404);
      if(p.qIndex==null || !p.ansHash) return sendJSON(res,{ error:"no recovery set" },400);
      if(!verifySecret(normAns(body.answer), p.ansHash)) return sendJSON(res,{ error:"wrong answer" },401);
      const np=(body.newPin||"").replace(/\D/g,"").slice(0,4);
      p.pinHash = np ? hashPin(np) : null; writeData(d);
      sendJSON(res,{ ok:true, locked:!!p.pinHash });
    });
  }

  // ---- catalog: requires a valid token; kids sessions get a filtered list ----
  if(url === "/api/catalog"){
    const s=sessionFor(req); if(!s) return sendJSON(res,{ error:"unauthorized" },401);
    return getLibrary().then(lib => {
      const out = s.kids ? lib.filter(c => isKidRated(c) && !c.adult)   // kids: kid-safe and never adult
                 : (s.adultUnlocked ? lib                              // adult unlocked: everything
                 : lib.filter(c => !c.adult));                         // default: hide adult until unlocked
      res.writeHead(200,{ "Content-Type":"application/json", "Cache-Control":"no-store, no-cache, must-revalidate", "Pragma":"no-cache" });
      res.end(JSON.stringify(out));
    });
  }

  // ---- profiles ----
  if(url === "/api/profiles" && req.method === "GET"){ return sendJSON(res, publicProfiles(readData())); }
  if(url === "/api/profiles" && req.method === "POST"){
    return collectBody(req, body => {
      const d=readData(); const pin=(body.pin||"").replace(/\D/g,"").slice(0,4);
      const qIndex = (body.securityQuestion!=null && body.securityQuestion!=="" && body.securityAnswer) ? Number(body.securityQuestion) : null;
      const p={ id:genId(), name:(body.name||"Guest").slice(0,24), color:body.color||"#36a3f7",
                kids:!!body.kids, pinHash: pin ? hashPin(pin) : null,
                qIndex: (qIndex!=null && qIndex>=0 && qIndex<SECURITY_QUESTIONS.length) ? qIndex : null,
                ansHash: (qIndex!=null) ? hashSecret(normAns(body.securityAnswer)) : null };
      d.profiles.push(p); d.state[p.id]={ watchlist:[], kv:{} }; writeData(d);
      sendJSON(res,{ id:p.id, name:p.name, color:p.color, kids:p.kids, locked:!!p.pinHash, hasQuestion:p.qIndex!=null }, 201);
    });
  }
  // ---- admin edit: name / color / kids / PIN (no current PIN needed) ----
  if(url.match(/^\/api\/profiles\/[^/]+$/) && req.method === "PUT"){
    if(!isAdmin(req)) return sendJSON(res,{ error:"unauthorized" },401);
    const id=url.split("/")[3];
    return collectBody(req, body => {
      const d=readData(); const p=d.profiles.find(x=>x.id===id);
      if(!p) return sendJSON(res,{ error:"no such profile" },404);
      if(body.name!=null) p.name=String(body.name).slice(0,24);
      if(body.color!=null) p.color=body.color;
      if(body.kids!=null) p.kids=!!body.kids;
      if(body.newPin!=null){ const np=String(body.newPin).replace(/\D/g,"").slice(0,4); p.pinHash = np ? hashPin(np) : null; }
      writeData(d); sendJSON(res,{ ok:true });
    });
  }
  if(url.startsWith("/api/profiles/") && req.method === "DELETE"){
    if(!isAdmin(req)) return sendJSON(res,{ error:"unauthorized" },401);   // only admin may delete
    const id=url.split("/")[3]; const d=readData(); const p=d.profiles.find(x=>x.id===id);
    if(p && p.admin) return sendJSON(res,{ error:"cannot delete admin" },400);
    d.profiles=d.profiles.filter(p=>p.id!==id); delete d.state[id]; writeData(d); return sendJSON(res,{ ok:true });
  }

  // ---- per-profile watch history + list (token must match the profile) ----
  if(url.startsWith("/api/state/") && req.method === "GET"){
    const id=url.split("/")[3]; const s=sessionFor(req); if(!s || s.profileId!==id) return sendJSON(res,{ error:"unauthorized" },401);
    return sendJSON(res, readData().state[id] || { watchlist:[], kv:{} });
  }
  if(url.startsWith("/api/state/") && (req.method === "PUT" || req.method === "POST")){
    const id=url.split("/")[3]; const s=sessionFor(req); if(!s || s.profileId!==id) return sendJSON(res,{ error:"unauthorized" },401);
    return collectBody(req, body => { const d=readData(); d.state[id]={ watchlist:body.watchlist||[], kv:body.kv||{} }; writeData(d); sendJSON(res,{ ok:true }); });
  }
  // ---- map a media URL (/movies/.., /series/.., etc.) to a safe disk path ----
  const MEDIA_DIRS=[MOVIES_DIR, SERIES_DIR, SHORTS_DIR, DOCS_DIR, MUSIC_DIR, KIDS_DIR, ADULT_DIR];
  const mediaPrefixes=["/movies/","/series/","/Short Films/","/Documentaries/","/Music Videos/","/Kids/","/Adult/"];
  function resolveMedia(u){
    if(!mediaPrefixes.some(p=>u.startsWith(p))) return null;
    const safe = path.normalize(u).replace(/^(\.\.[\/\\])+/,"");
    const fp = path.join(ROOT, safe);
    return MEDIA_DIRS.some(d => fp.startsWith(d)) ? fp : null;
  }

  // does this file's audio play in a browser? (the player calls this when it opens a title)
  if(url.startsWith("/api/audiocheck")){
    const s=sessionFor(req); if(!s) return sendJSON(res,{ error:"unauthorized" },401);
    const src = new URL(req.url,"http://x").searchParams.get("src") || "";
    const decoded = decodeURIComponent(src);
    const fp = resolveMedia(decoded);
    if(!fp || !fs.existsSync(fp)) return sendJSON(res,{ known:false });
    return mediaAllowed(s, decoded, fp).then(ok => {
      if(!ok) return sendJSON(res,{ error:"forbidden" },403);
      return audioCodecOf(fp).then(codec => {
        if(!codec) return sendJSON(res,{ known:false });   // no ffprobe -> can't tell
        sendJSON(res,{ known:true, codec, playable: codec==="none" || WEB_AUDIO.includes(codec.toLowerCase()) });
      });
    });
  }
  // one-click fix: re-encode just the audio to AAC (video is copied, so it's fast), in place
  if(url.startsWith("/api/fixaudio") && req.method==="POST"){
    const s=sessionFor(req); if(!s) return sendJSON(res,{ error:"unauthorized" },401);
    if(!hasFfmpeg()) return sendJSON(res,{ error:"ffmpeg not installed" },400);
    return collectBody(req, async body => {
      const decoded = decodeURIComponent(body.src||"");
      const fp = resolveMedia(decoded);
      if(!fp || !fs.existsSync(fp)) return sendJSON(res,{ error:"no such file" },404);
      if(!await mediaAllowed(s, decoded, fp)) return sendJSON(res,{ error:"forbidden" },403);
      const dir=path.dirname(fp), ext=path.extname(fp), base=path.basename(fp,ext);
      const tmp=path.join(dir, base+".reel-fixing"+ext);
      try{
        // copy video as-is, convert audio to stereo AAC -> plays in every browser.
        // Runs async (spawn) so the rest of the house can keep streaming during the encode.
        await runFfmpeg([
          "-y", "-i", fp,
          "-map", "0:v:0", "-map", "0:a:0?",
          "-c:v", "copy", "-c:a", "aac", "-ac", "2", "-b:a", "192k", tmp
        ], 1000*60*30);
        if(fs.existsSync(tmp) && fs.statSync(tmp).size>0){
          fs.renameSync(tmp, fp);                       // replace original
          for(const k of Object.keys(audioCodecCache)) if(k.startsWith(fp+":")) delete audioCodecCache[k];
          invalidateLibrary();                          // poster/playable info may have changed
          return sendJSON(res,{ ok:true });
        }
        try{ fs.unlinkSync(tmp); }catch{}
        return sendJSON(res,{ error:"conversion produced no file" },500);
      }catch(e){ try{ fs.unlinkSync(tmp); }catch{} return sendJSON(res,{ error:"conversion failed" },500); }
    });
  }

  // auto-extracted poster frames — generated lazily on first request, then cached
  if(url.startsWith("/_thumbs/")){
    if(!sessionFor(req)){ res.writeHead(401); return res.end(); }
    const fname = path.basename(url);                       // e.g. some-key.jpg
    const outPath = path.join(DATA_DIR, "thumbs", fname);
    if(fs.existsSync(outPath)) return serveFile(req, res, outPath);
    // not cached yet — need the source video path from ?src=
    let src=""; try{ src = new URL(req.url,"http://x").searchParams.get("src") || ""; }catch{}
    const MEDIA_ROOTS=[MOVIES_DIR, SERIES_DIR, SHORTS_DIR, DOCS_DIR, MUSIC_DIR, KIDS_DIR, ADULT_DIR];
    const srcOk = src && MEDIA_ROOTS.some(d => path.resolve(src).startsWith(d));   // only our media
    if(srcOk && hasFfmpeg() && fs.existsSync(src)){
      return makeThumb(src, outPath).then(made => {
        if(made && fs.existsSync(outPath)) return serveFile(req, res, outPath);
        res.writeHead(404); res.end();
      });
    }
    res.writeHead(404); return res.end();                   // no thumb -> front-end shows gradient
  }
  // serve videos / posters from the media folders only (no path escaping)
  if(["/movies/","/series/","/Short Films/","/Documentaries/","/Music Videos/","/Kids/","/Adult/"].some(p=>url.startsWith(p))){
    const s = sessionFor(req);
    if(!s){ res.writeHead(401); return res.end(); }                 // no anonymous direct-URL streaming
    const fp = resolveMedia(url);
    if(!fp){ res.writeHead(403); return res.end(); }
    return mediaAllowed(s, url, fp).then(ok => {
      if(!ok){ res.writeHead(403); return res.end(); }
      serveFile(req, res, fp);
    });
  }
  res.writeHead(404); res.end("Not found");
});

/* ---- start + print the address family should use -------------------------- */
function localIPs(){
  const out = [];
  const nets = os.networkInterfaces();
  for(const name of Object.keys(nets))
    for(const net of nets[name])
      if(net.family === "IPv4" && !net.internal){
        // skip auto-config / virtual addresses that other devices can't reach
        if(net.address.startsWith("169.254.")) continue;        // Windows "no DHCP" fallback
        out.push({ ip: net.address, name });
      }
  // prefer normal home-network ranges (192.168.x, 10.x, 172.16-31.x) first
  const priv = a => a.ip.startsWith("192.168.") || a.ip.startsWith("10.") || /^172\.(1[6-9]|2\d|3[01])\./.test(a.ip);
  out.sort((a,b)=> (priv(b)?1:0) - (priv(a)?1:0));
  return out.map(x => x.ip);
}
function printAddresses(){
  const ips = localIPs();
  console.log("  On THIS computer:        http://localhost:" + PORT);
  if(ips.length){
    ips.forEach(ip => console.log("  On phones/TVs (same WiFi): http://" + ip + ":" + PORT));
  } else {
    console.log("");
    console.log("  >>> No home-network address found. Other devices CAN'T join yet. <<<");
    console.log("      REEL works over your home WiFi/router (internet NOT required),");
    console.log("      but this PC isn't connected to a network right now.");
    console.log("      Connect this PC to your WiFi or router cable, then restart REEL");
    console.log("      (or wait — the address will appear here within a minute).");
  }
}
[MOVIES_DIR, SERIES_DIR, SHORTS_DIR, DOCS_DIR, MUSIC_DIR, KIDS_DIR, ADULT_DIR, DATA_DIR].forEach(d => { try { fs.mkdirSync(d, { recursive:true }); } catch {} });
// move data from the old layout (root) into data/ so upgrades don't lose profiles
try { const o=path.join(ROOT,"profiles.json");    if(fs.existsSync(o) && !fs.existsSync(DATA_FILE))  fs.renameSync(o, DATA_FILE); } catch {}
try { const o=path.join(ROOT,"tmdb-cache.json");  if(fs.existsSync(o) && !fs.existsSync(TMDB_CACHE)) fs.renameSync(o, TMDB_CACHE); } catch {}
tmdbCache = (()=>{ try { return JSON.parse(fs.readFileSync(TMDB_CACHE,"utf8")); } catch { return {}; } })();
ensureAdmin();
ensureAdultPin();

// One bad request (or a transient fs/network hiccup) should never take down movie night.
process.on("uncaughtException",  e => console.error("  (recovered from an unexpected error: " + (e && e.message) + ")"));
process.on("unhandledRejection", e => console.error("  (recovered from an unexpected error: " + (e && e.message) + ")"));

// A clear, non-scary message instead of a raw stack trace when the port is taken.
server.on("error", e => {
  if(e.code === "EADDRINUSE"){
    console.log("\n  >>> Couldn't start: port " + PORT + " is already in use. <<<");
    console.log("      REEL may already be running in another window — use that one,");
    console.log("      or close it first. (Advanced: change PORT near the top of server.js.)\n");
  } else {
    console.log("\n  >>> Couldn't start the server: " + e.message + " <<<\n");
  }
  process.exit(1);
});

// Nudge the owner to change the seeded admin password while it's still the default.
try { const a = readData().profiles.find(p=>p.admin); if(a && verifyPin("3119", a.pinHash))
  console.log("\n  >>> Admin password is still the default (3119). Change it: sign-in screen -> Manage profiles. <<<"); } catch {}

server.listen(PORT, "0.0.0.0", () => {
  const lib = buildLibrary();
  console.log("\n  REEL home server is running.\n");
  printAddresses();
  // If the network changes (WiFi/router drops or comes back), re-print the join
  // address so you never have to restart. Polls frequently and reacts to ANY change.
  let lastIPs = localIPs().join(",");
  function recheck(manual){
    const nowList = localIPs();
    const now = nowList.join(",");
    if(now !== lastIPs || manual){
      if(nowList.length){
        console.log("\n  >>> Network " + (manual?"check":"changed") + " — devices can join at: <<<");
        printAddresses();
      } else {
        console.log("\n  >>> No network connection — other devices can't join until it returns. <<<");
        if(manual) dumpAdapters();
      }
      lastIPs = now;
    } else if(manual){
      console.log("\n  (no change — still "+(nowList.length?("at "+nowList.join(", ")):"no network")+")");
      dumpAdapters();
    }
  }
  function dumpAdapters(){
    console.log("  Network adapters Windows is reporting to REEL:");
    const nets = os.networkInterfaces(); let any=false;
    for(const name of Object.keys(nets))
      for(const net of nets[name])
        if(net.family === "IPv4"){ any=true; console.log("      " + name + ": " + net.address + (net.internal?" (loopback)":"")); }
    if(!any) console.log("      (none — Windows reports no IPv4 addresses at all)");
  }
  setInterval(() => recheck(false), 8000);
  // Press Enter in this window to force an immediate re-check (no restart needed).
  try{
    process.stdin.resume(); process.stdin.setEncoding("utf8");
    process.stdin.on("data", () => recheck(true));
    console.log("  (Tip: if the network changes, press Enter here to re-check the address.)");
  }catch{}
  console.log("\n  Library: " + lib.filter(x=>x.type==="movie").length + " movie(s), "
                              + lib.filter(x=>x.type==="series").length + " series."
                              + (lib.length ? "" : "  (Drop .mp4 files into the 'movies' folder, then refresh.)"));
  console.log(hasFfmpeg()
    ? "  Thumbnails: ffmpeg found — auto-generating pictures from your videos."
    : "  Thumbnails: install 'ffmpeg' for automatic pictures, or drop a same-named .jpg next to each video. (Without either, cards show colour gradients.)");
  const shows = lib.filter(x=>x.type==="series");
  if(shows.length){
    console.log("\n  Series detected:");
    shows.forEach(sh=>{
      const tot = (sh.seasons||[]).reduce((n,se)=>n+se.episodes.length,0);
      console.log("    " + sh.title.slice(0,52) + "  (" + tot + " total)");
      (sh.seasons||[]).forEach(se=> console.log("        " + (se.name||("Season "+se.n)) + ": " + se.episodes.length));
    });
  }
  console.log("\n  Press Ctrl+C to stop.\n");
});
