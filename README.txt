==============================================================
 REEL HOME SERVER — Windows setup
 Stream your own movies to family on your home network
==============================================================

You'll do this once. After that, watching is just opening a web
address on any phone, laptop, tablet, or TV in the house.


--------------------------------------------------------------
STEP 1 — Install Node.js (one time)
--------------------------------------------------------------
1. Go to  https://nodejs.org
2. Download the "LTS" version for Windows and run the installer.
3. Click Next through the defaults. Done.

(Node is the small engine that runs the server. Nothing else
 to install — the server uses no other downloads.)


--------------------------------------------------------------
STEP 2 — Set up the folder
--------------------------------------------------------------
1. Make a folder, e.g.  C:\REEL
2. Put these two files inside it:
       server.js
       reel-prime.html
3. The server will create two folders next to them on first run:
       C:\REEL\movies
       C:\REEL\series
   (You can also create them yourself now.)

Your folder ends up looking like:

   C:\REEL\
       server.js
       reel-prime.html
       movies\
       series\


--------------------------------------------------------------
STEP 3 — Add your movies
--------------------------------------------------------------
Drop video files into the  movies  folder. Name them simply:

       The Big Trip (2023).mp4
       Grandpa 80th Birthday.mp4

The year in (brackets) is optional but shows up nicely.

>>> IMPORTANT — FORMAT <<<
Web browsers reliably play .mp4 files (H.264 video + AAC audio).
MKV and AVI containers, HEVC/x265 video, and AC3/EAC3 audio will
NOT play in a browser. REEL still LISTS these files (so your counts
look right), but they won't play until converted.

  EASIEST: run the built-in batch converter (needs ffmpeg) — it
  turns everything web-ready in one go. See "MAKE FILES WEB-READY"
  just below.
  OR convert manually with HandBrake (free, handbrake.fr): open the
  file, pick "Fast 1080p30", set Audio to AAC, Start.

CAN I PLAY HEVC / x265 WITHOUT CONVERTING?
  Often YES. REEL now just tries to play every file. Modern browsers
  CAN play HEVC when the computer provides the codec:
    - Windows: install "HEVC Video Extensions" from the Microsoft
      Store (a small paid item; some PCs have a free OEM version
      pre-installed). Newer PCs also need it for 10-bit HEVC.
    - Mac / Safari: HEVC plays out of the box.
  If a file plays with sound, you're done — no conversion needed.
  Only if the player shows "won't play here" do you need to convert
  it (or your PC simply can't decode that codec). 10-bit HEVC needs
  fairly recent hardware even with the codec installed.

MAKE FILES WEB-READY (batch — handles MKV, HEVC, AC3, the lot):
  Run the tool for your system (needs ffmpeg installed):
       Windows:  double-click  fix-sound-windows.bat
       Mac:      double-click  fix-sound-mac.command
       Linux:    ./fix-sound-linux.sh
  It scans movies, series (incl. season subfolders), Short Films,
  Documentaries and Music Videos, and for each file that a browser
  can't play it makes a web-ready .mp4:
    - wrong container only (MKV/AVI with H.264) -> repackaged, FAST
    - AC3/EAC3 audio -> converted to AAC, FAST
    - HEVC/x265 video -> picture re-encoded to H.264, SLOW (minutes
      per episode, heavy CPU) — unavoidable, browsers can't play HEVC
  Files already web-ready are skipped. Run it again whenever you add
  new files. Originals are only replaced after a successful convert.

NO SOUND but the picture plays?  That's AC3/EAC3 audio (common in
Web-DL / Blu-ray rips). The player shows a "Fix audio" button you
can click per-episode, or just run the batch tool above to do all of
them at once.

  EASIEST FIX (built in): if ffmpeg is installed on the PC running
  the server, REEL detects this automatically and shows a "Fix
  audio" button on the player. Click it — REEL re-encodes just the
  audio to AAC (the video is copied untouched, so it's quick) and
  reloads with sound. The file is fixed permanently.

  FIX A WHOLE SERIES AT ONCE: instead of clicking per episode, run
  the batch tool (also needs ffmpeg):
       Windows:  double-click  fix-sound-windows.bat
       Mac:      double-click  fix-sound-mac.command
       Linux:    ./fix-sound-linux.sh
  It scans movies, series (including season subfolders), Short Films,
  Documentaries and Music Videos, converts only the files that need
  it, skips the rest, and replaces them in place. Run it again any
  time you add new files.

  MANUAL FIX: re-encode in HandBrake (handbrake.fr) with the
  "Fast 1080p30" preset and Audio set to AAC.

(Browsers can play these audio types: AAC, MP3, Opus, Vorbis, FLAC.
They CANNOT play: AC3, EAC3, DTS, TrueHD.)

THUMBNAILS / pictures on the cards:
  REEL shows a coloured gradient unless it has a picture. Two ways
  to get real pictures:
    1. Install "ffmpeg" (free, ffmpeg.org) on this PC. REEL then
       grabs a frame from each video automatically — no work needed.
       Windows: download, unzip, and add its "bin" folder to PATH,
       or put ffmpeg.exe beside server.js.
    2. Or drop an image with the SAME name next to a video:
         Body Temple (1).mp4
         Body Temple (1).jpg     (.png/.webp also work)
  When the server starts it prints whether ffmpeg was found.

============================================================
 INSTALLING ffmpeg  (needed for: Fix Sound + auto thumbnails)
============================================================
ffmpeg and ffprobe come together in one download — install once and
you have both. You only do this ONCE per PC.

----- WINDOWS — easy way (one command) -----
  1. Click Start, type  PowerShell , open it.
  2. Paste this and press Enter:
         winget install Gyan.FFmpeg
  3. CLOSE PowerShell, open it again, and check:
         ffmpeg -version
         ffprobe -version
     If both print version info, you're done.
  (If "winget" isn't recognised, use the manual way below.)

----- WINDOWS — manual way -----
  1. Go to  https://ffmpeg.org/download.html , hover the Windows
     logo, click "Windows builds from gyan.dev".
  2. Download  ffmpeg-git-full.7z  (or the "essentials" build).
  3. Extract it (use 7-Zip from 7-zip.org if needed). Inside is a
     "bin" folder containing ffmpeg.exe AND ffprobe.exe.
  4. Move the folder to  C:\ffmpeg  so the bin path is  C:\ffmpeg\bin
  5. Add it to PATH: Start -> type "Edit the system environment
     variables" -> Environment Variables -> under "Path" click Edit
     -> New -> type  C:\ffmpeg\bin  -> OK on every window.
  6. CLOSE and reopen PowerShell, then run  ffmpeg -version  to check.

  SHORTCUT (no PATH editing): just copy  ffmpeg.exe  AND  ffprobe.exe
  straight into this REEL folder, next to server.js. REEL and the
  Fix Sound tool will find them there.

----- MAC -----
  Open Terminal and run:
         brew install ffmpeg
  (No Homebrew? Get it first from https://brew.sh — one paste-in
  command on their homepage.) ffprobe is included.

----- LINUX -----
         sudo apt install ffmpeg      (Debian / Ubuntu)
         sudo dnf install ffmpeg      (Fedora)
         sudo pacman -S ffmpeg        (Arch)
  ffprobe is included in the ffmpeg package.

TROUBLESHOOTING (Windows): if  ffmpeg -version  still says "not
recognised" after the manual steps, it's almost always one of:
  - you didn't close and reopen the terminal, or
  - the path you added doesn't actually contain ffmpeg.exe
    (open  C:\ffmpeg\bin  and confirm ffmpeg.exe + ffprobe.exe
    are sitting right there).
The drop-the-two-.exe-files-into-this-folder shortcut avoids all of
this if PATH editing gives you trouble.

TV SHOWS (optional):
Make a folder per show inside  series , with episode files named
with the season/episode, e.g.:

   series\
       Family Adventures\
           S01E01 - The Beginning.mp4
           S01E02 - The Road Trip.mp4

The server groups them into a series with an episode list.


--------------------------------------------------------------
STEP 4 — Start the server
--------------------------------------------------------------
1. Open the folder C:\REEL in File Explorer.
2. Click the address bar, type   cmd   and press Enter.
   (A black Command Prompt window opens in that folder.)
3. Type:   node server.js     and press Enter.

You'll see something like:

   REEL home server is running.
   On THIS computer:          http://localhost:8080
   On phones/TVs (same WiFi):  http://192.168.1.50:8080
   Library: 12 movie(s), 1 series.

The first time, Windows may pop up a Firewall warning.
Tick "Private networks" and click "Allow access" — this lets
family devices on your WiFi reach it.

Leave that window open while people are watching. Closing it (or
pressing Ctrl+C) stops the server.


--------------------------------------------------------------
STEP 5 — Watch
--------------------------------------------------------------
PHONES / TABLETS / LAPTOPS (easiest):
  On the SAME WiFi, open a browser and type the
  "On phones/TVs" address, e.g.  http://192.168.1.50:8080
  Bookmark it. That's your family's "Netflix" page.

TVs — a few options, easiest first:
  a) CAST FROM A PHONE: open the address in Chrome on your phone,
     play something, then use the Cast button (or screen-mirror)
     to your Chromecast / Google TV.
  b) TV's OWN BROWSER: many smart TVs (and Fire TV via the Silk
     browser) can open the address directly.
  c) HDMI CABLE: plug a laptop into the TV, open the address full
     screen. Simple and always works.
  d) A cheap Fire TV Stick / Chromecast plugged into any TV turns
     option (a) or (b) into a permanent setup.

  USING A TV REMOTE (no mouse needed): when you open REEL in a TV
  browser, the D-pad just works. Arrow keys move the highlight to
  the nearest poster/button, OK/Enter opens or plays it, and the
  Back button steps out (close a title, exit a menu). In the player:
  Left/Right skip 10s, OK pauses/plays, press Up to jump to the
  on-screen controls (then arrows + OK to reach Episodes, Next,
  Fullscreen, etc.), and Back exits the video. On a desktop with a
  mouse nothing changes until you first press an arrow key.


--------------------------------------------------------------
NO INTERNET? USE THE LAPTOP AS A HOTSPOT
--------------------------------------------------------------
REEL does NOT need the internet — it only needs the watching
devices to be on the SAME network as this PC. If your router/WiFi
is down (or you're somewhere with no WiFi at all), the laptop can
BE the network by turning on its Mobile Hotspot. The laptop then
acts as both the server AND the WiFi, and everything streams over
that — completely offline.

HOW TO SET IT UP (Windows):
  1. On the laptop: Settings -> Network & internet -> Mobile
     hotspot -> turn it ON. Note the network NAME and PASSWORD it
     shows.
  2. On each phone / tablet / TV: connect to that hotspot's WiFi
     name using that password (just like joining any WiFi).
  3. On the laptop, start REEL (node server.js). The window will
     now show an address like:
         On phones/TVs (same WiFi):  http://192.168.137.1:8080
     The 192.168.137.x address is the standard Windows-hotspot one.
  4. On each connected device, open a browser and type THAT
     address (include the :8080). You're watching — no internet.

IF WINDOWS WON'T TURN THE HOTSPOT ON (no internet to share):
  Windows sometimes refuses to enable Mobile Hotspot when there's
  no internet connection to share. Work around it like this:
    1. Press Start, type  PowerShell , right-click it and choose
       "Run as administrator".
    2. Create a hosted network (replace NAME and PASSWORD):
         netsh wlan set hostednetwork mode=allow ssid=NAME key=PASSWORD
         netsh wlan start hostednetwork
       (PASSWORD must be at least 8 characters.)
    3. Devices connect to NAME with PASSWORD, then use the REEL
       address as above.
    4. To stop it later:   netsh wlan stop hostednetwork
  (If your laptop's WiFi adapter doesn't support a hosted network,
  an alternative is a cheap travel router, or simply keeping your
  normal home router powered on — REEL works through it even with
  the internet line down, since it never uses the internet.)

NOTES:
  - The join address CHANGES depending on the network (home router
    vs hotspot). Always read the current one off the REEL window.
  - A laptop hotspot covers a room or two and a handful of devices
    — perfect for a few people together, not a whole house.
  - This uses the laptop's battery faster; keep it plugged in.


--------------------------------------------------------------
PROFILES, KIDS MODE & PINS
--------------------------------------------------------------
The first time anyone opens the page they'll see a "Who's
watching?" screen. Tap "Add profile" to create one (name +
colour). Each person gets their OWN Continue Watching, My List,
and resume points, saved on this PC (in data/profiles.json) and
shared across every device — start on the TV, finish on a phone.

When creating a profile you can also:
  - KIDS PROFILE: only titles marked kid-safe show up. The EASY way
    to add kid content is to drop video files into the  Kids  folder —
    everything there is automatically kid-safe and streams to kids (it
    also shows for everyone else, under "Kids & Family"). You can also
    mark any other title kid-safe by giving it a rating of G, PG, TV-Y,
    TV-Y7, TV-G or TV-PG in a sidecar .json (see "rating" under ADDING
    ARTWORK / DETAILS below). NOTE: files with NO rating (and not in the
    Kids folder) are treated as NOT kid-safe, so they won't show to a
    kids profile — this is deliberate, so adult files are never assumed
    safe. Enforcement is twofold: a kids profile is never even sent the
    other titles in its catalog, AND the server refuses to stream an
    un-kid-rated file to a kids session even if its direct URL is typed.

  - ADULT (18+) CONTENT: drop explicit files into the  Adult  folder.
    They are HIDDEN from every profile by default, and NEVER shown or
    streamed to a kids profile. On a normal (non-kids) profile, tap the
    "18+" item in the top bar / menu and enter the adult password to
    unlock them for that sitting (until you switch profile or reload).
    The default adult password is 3119. Both the listing AND the actual
    video stream are gated by the server, so locked files can't be
    reached by typing their URL. To change the password, set the
    ADULT_PIN environment variable before the first run (e.g.
    ADULT_PIN=2580 node server.js).
  - PIN (optional): a 4-digit code required before the profile opens.
    PINs are salted + hashed (scrypt) on this PC and checked by the
    server; the code itself is never stored or sent to the browser.
    Without the correct PIN you get no access to that profile, its
    catalog, or its history.
  - SECURITY QUESTION (optional): pick one of three questions and
    give an answer. If you ever forget your PIN, tap "Forgot PIN?"
    on the unlock screen, answer the question, and set a new PIN.
    Answers are hashed too (never stored in the clear) and matched
    case-insensitively. Note: security questions are convenience
    recovery, not strong security — answers can be guessable, so
    don't rely on them to protect anything sensitive.

ADMIN PROFILE
  A built-in "Admin" profile is created on first run, password 3119.
  It does not appear in the watch picker. To manage profiles, tap
  "Manage profiles" on the gate and enter the admin password. As
  admin you can edit ANY profile (rename, colour, kids on/off,
  set/replace/remove its PIN without knowing the old one) and delete
  profiles. Deleting and editing are enforced by the server: those
  actions require a valid admin session, so a regular profile or a
  kid cannot perform them.

  CHANGE THE ADMIN PASSWORD: sign in as admin, tap the Admin tile's
  edit (pencil) badge, and set a new PIN. (Please change it from the
  default 3119.)

  FORGOT THE ADMIN PASSWORD: stop the server, open data/profiles.json,
  delete the whole "admin" profile object from the "profiles" list,
  save, and restart — a fresh Admin (password 3119) is re-seeded.

Switch profiles any time with the round avatar (top-right).
"Manage profiles" on the gate opens the admin area (see above).


--------------------------------------------------------------
POSTER / BACKDROP ART (optional, via TMDB)
--------------------------------------------------------------
Out of the box, titles show coloured gradient art. To pull in
real artwork automatically:

1. Make a FREE account at  https://www.themoviedb.org
2. Settings -> API -> request an API key (choose "Developer").
3. Copy the key. Either:
     a) Make a text file named  tmdb.key  next to server.js and
        paste ONLY the key inside it, OR
     b) Set an environment variable TMDB_KEY before starting.
4. Restart the server.

Now the server looks up each title by name/year and pulls its
backdrop art for the hero, tiles, and preview cards. For TV shows
it also pulls each episode's still image, name, and description,
so the episode list shows real thumbnails instead of a gradient.
Results are cached in data/tmdb-cache.json so it only looks up each
title once. Your own home videos won't match the movie database
and simply keep their gradient — that's expected and fine.

(The key lives only on your PC / server-side. It is never sent
 to the browser.)


--------------------------------------------------------------
ADDING MORE LATER
--------------------------------------------------------------
Just drop new .mp4 files into  movies  (or a show folder into
series ) and refresh the page in the browser. No need to restart
the server. Newly added files get a "RECENTLY ADDED" badge for
two weeks.


--------------------------------------------------------------
OPTIONAL — nicer details per movie
--------------------------------------------------------------
Put a small text file next to a movie with the SAME name but
ending in .json to add a description, genres, etc. Example:

   movies\The Big Trip (2023).mp4
   movies\The Big Trip (2023).json

...and inside that .json:

   {
     "title": "The Big Trip",
     "year": 2023,
     "genres": ["Documentary", "Drama"],
     "rating": "PG",
     "runtime": "1h 42m",
     "desc": "Our two weeks across the island, start to finish.",
     "cast": "The whole family"
   }


--------------------------------------------------------------
TROUBLESHOOTING
--------------------------------------------------------------
- "node is not recognized": close and reopen Command Prompt
  after installing Node, or restart the PC.
- Family can't connect: make sure they're on the SAME WiFi, and
  that you allowed Node through the Firewall (Private networks).
- A movie won't play but others do: it's almost certainly not an
  MP4/H.264 file. Run it through HandBrake (see Step 3).
- Port 8080 in use: open server.js, change PORT = 8080 to e.g.
  PORT = 8000, save, restart.
- Seeking/scrubbing doesn't work: you're likely opening the .html
  file directly instead of through the server. Always use the
  http://...:8080 address — the server is what enables seeking.

==============================================================
