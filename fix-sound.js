#!/usr/bin/env node
/* ============================================================================
   REEL — Fix Sound (batch)
   Scans every media folder, finds videos whose audio a browser can't play
   (AC3 / EAC3 / DTS / TrueHD — common in Web-DL & Blu-ray rips) and re-encodes
   ONLY the audio to AAC. The video is copied untouched, so it's fast and lossless
   for the picture. Files are replaced in place. Already-fine files are skipped.

   Needs ffmpeg + ffprobe installed (ffmpeg.org). Run it any time you add new
   files; it only touches the ones that need it.
   ========================================================================== */
const fs = require("fs");
const path = require("path");
const cp = require("child_process");

const ROOT = __dirname;
const MEDIA_DIRS = ["movies", "series", "Short Films", "Documentaries", "Music Videos"]
  .map(d => path.join(ROOT, d));
const VIDEO_EXT = [".mp4", ".m4v", ".webm", ".mov", ".mkv", ".avi", ".ogg", ".ts", ".flv", ".wmv"];
const WEB_CONTAINER = [".mp4", ".m4v", ".webm", ".mov", ".ogg"];   // play in a browser as-is
const WEB_AUDIO = ["aac", "mp3", "opus", "vorbis", "flac"];        // browser-playable audio
const WEB_VIDEO = ["h264", "vp8", "vp9", "av1"];                   // browser-playable video
// NOT web video: hevc/h265, mpeg4, mpeg2video, vc1, wmv3  -> must re-encode the picture

function have(cmd){
  try { cp.execSync((process.platform === "win32" ? "where " : "command -v ") + cmd, { stdio: "ignore" }); return true; }
  catch { return false; }
}
function probe(file, stream, entry){   // stream: "a"|"v"; entry: codec_name|pix_fmt|profile
  try {
    return cp.execFileSync("ffprobe", [
      "-v", "error", "-select_streams", stream + ":0",
      "-show_entries", "stream=" + (entry || "codec_name"), "-of", "csv=p=0", file
    ], { timeout: 15000 }).toString().trim().replace(/,+$/,"");
  } catch { return ""; }
}
function walk(dir){
  const out = [];
  let entries = [];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries){
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(full));
    else if (VIDEO_EXT.includes(path.extname(e.name).toLowerCase())) out.push(full);
  }
  return out;
}

console.log("\n  REEL — Make Web-Ready (batch converter)\n  =======================================\n");

if (!have("ffmpeg") || !have("ffprobe")){
  console.log("  ffmpeg / ffprobe are not installed.");
  console.log("  Install them from https://ffmpeg.org (on Windows, add the");
  console.log("  'bin' folder to PATH or drop ffmpeg.exe + ffprobe.exe next to");
  console.log("  this script), then run this again.\n");
  process.exit(1);
}

// gather files
let files = [];
for (const d of MEDIA_DIRS) files.push(...walk(d));
if (!files.length){
  console.log("  No video files found in movies / series / Short Films /");
  console.log("  Documentaries / Music Videos yet. Add some and run again.\n");
  process.exit(0);
}

console.log("  Scanning " + files.length + " file(s)...\n");

// Decide what each file needs. A browser needs: an MP4-family container +
// H.264 (8-bit, ≤High profile) / VP8 / VP9 / AV1 video + AAC/MP3/Opus/etc audio.
// Anything else — including 10-bit video, exotic profiles, or files ffprobe
// can't read — gets converted, because "can't tell" is safer than "assume fine".
const jobs = [];
let unreadable = 0;
for (const f of files){
  const ext = path.extname(f).toLowerCase();
  const vc  = (probe(f, "v", "codec_name") || "").toLowerCase();
  const ac  = (probe(f, "a", "codec_name") || "").toLowerCase();
  const pix = (probe(f, "v", "pix_fmt")    || "").toLowerCase();   // e.g. yuv420p / yuv420p10le
  const prof= (probe(f, "v", "profile")    || "").toLowerCase();   // e.g. high / high 10 / main 10

  const probedOk = vc !== "";                  // did ffprobe read a video codec at all?
  if(!probedOk) unreadable++;

  const tenBit   = pix.includes("10") || pix.includes("12") || prof.includes("10") || prof.includes("12");
  const oddChroma= pix && !pix.startsWith("yuv420") && !pix.startsWith("yuvj420");   // browsers want 4:2:0
  // video is browser-OK only if: we COULD read it, codec is allowed, AND it's 8-bit 4:2:0
  const videoOK  = probedOk && WEB_VIDEO.includes(vc) && !tenBit && !oddChroma;
  const audioOK  = ac === "" || ac === "none" || WEB_AUDIO.includes(ac);
  const containerOK = WEB_CONTAINER.includes(ext);

  if (containerOK && videoOK && audioOK && probedOk) continue;   // already fine, skip
  jobs.push({ f, ext, vc, ac, pix, prof, videoOK, audioOK, containerOK, tenBit, oddChroma, probedOk });
}

if (!jobs.length){
  console.log("  Good news — every file is already browser-ready. Nothing to do.\n");
  process.exit(0);
}

const reEncodeCount = jobs.filter(j => !j.videoOK).length;
console.log("  " + jobs.length + " file(s) need converting:");
jobs.forEach(j => {
  const why = [];
  if (!j.containerOK) why.push(j.ext.slice(1) + " container");
  if (!j.probedOk)    why.push("unreadable by ffprobe");
  else if (!j.videoOK){
    if (j.tenBit)        why.push((j.vc||"?") + " 10-bit video");
    else if (j.oddChroma)why.push((j.vc||"?") + " video (" + j.pix + ")");
    else                 why.push((j.vc||"?") + " video");
  }
  if (!j.audioOK) why.push((j.ac||"?") + " audio");
  console.log("    [" + why.join(", ") + "]  " + path.relative(ROOT, j.f));
});
if (reEncodeCount){
  console.log("\n  Note: " + reEncodeCount + " file(s) need their PICTURE re-encoded (HEVC/x265,");
  console.log("  10-bit, or other video a browser can't show). That is much slower");
  console.log("  (minutes per episode) and uses a lot of CPU. The rest just have their");
  console.log("  container/audio repackaged, which is quick.");
}
console.log("\n  Converting...\n");

let done = 0, failed = 0;
jobs.forEach((j, i) => {
  const f = j.f;
  const ext = path.extname(f);
  const tmp = f.slice(0, -ext.length) + ".reel-fixing.mp4";
  const finalOut = f.slice(0, -ext.length) + ".mp4";
  const tag = j.videoOK ? "repackaging" : "re-encoding video (slow)";
  process.stdout.write("  (" + (i + 1) + "/" + jobs.length + ") [" + tag + "] " + path.basename(f) + " ... ");

  // video: copy if already web-friendly, else encode H.264. audio: copy if friendly, else AAC.
  const args = ["-y", "-i", f, "-map", "0:v:0", "-map", "0:a:0?"];
  if (j.videoOK) args.push("-c:v", "copy");
  else args.push("-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p");
  if (j.audioOK) args.push("-c:a", "copy");
  else args.push("-c:a", "aac", "-ac", "2", "-b:a", "192k");
  args.push("-movflags", "+faststart", tmp);

  try {
    cp.execFileSync("ffmpeg", args, { stdio: "ignore", timeout: 1000 * 60 * 60 });
    if (fs.existsSync(tmp) && fs.statSync(tmp).size > 0){
      if (ext.toLowerCase() === ".mp4") fs.renameSync(tmp, f);
      else { fs.renameSync(tmp, finalOut); try { fs.unlinkSync(f); } catch {} }
      console.log("done");
      done++;
    } else { try { fs.unlinkSync(tmp); } catch {} console.log("FAILED (no output)"); failed++; }
  } catch (e){ try { fs.unlinkSync(tmp); } catch {} console.log("FAILED"); failed++; }
});

console.log("\n  Finished. Converted " + done + " file(s)" + (failed ? ", " + failed + " failed" : "") + ".");
console.log("  Start REEL (or refresh the page) — the new files will play with sound.\n");
