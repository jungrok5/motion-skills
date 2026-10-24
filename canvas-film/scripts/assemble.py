"""Join the rendered scenes into one film, in film.json order (each scene opens from and closes to black).
   Run from the film project root:
     python3 <skill>/scripts/assemble.py h        → out/film-h.mp4   (1920×1080)
     python3 <skill>/scripts/assemble.py v        → out/film-v.mp4   (1080×1920)
     python3 <skill>/scripts/assemble.py h en     → out/film-h-en.mp4 (scenes rendered with --lang en)
   Picture: out/<scene>[-<lang>]-<h|v>.mp4.  Sound: scenes/<scene>.wav, loudness-normalised to −16 LUFS per scene and
   cut/padded to exactly its picture's length, so sound and picture stay in step scene by scene. Missing scenes are listed.
   Add --upload to also write film-<h|v>…-upload.mp4: the copy to upload to YouTube/Instagram (closed GOP, a keyframe
   every 2 s, no B-frames — render.mjs writes clips in this format already: H.264 ≤ 12 Mbps, tagged 'osb-upload'). Video
   sites re-encode each upload in chunks cut at keyframes; with open-GOP/B-frame files some renditions show a later frame
   for a moment at every scene start ("the start jumps"), on some phones only.

   Add --shorts (portrait) to write one file per scene instead of the film, for YouTube Shorts / Reels:
   out/shorts/<lang|src>/NN-<scene>.mp4 (the upload encode + that scene's sound, 30 ms fades against clicks). Works
   because every scene's sound is its own file and fades with the picture — no sound runs across a cut.
   A Short starts `open` seconds into its scene, past the fade-in from black (a feed shows the first frame; black loses the
   swipe), and its sound goes through a peak limiter. film.json "shorts": {"open": 1.0, "scenes": {"<id>": 0}, "limit": 0.84}
   — a per-scene value overrides "open" (0 = keep the fade, e.g. a scene that must start from black; more to skip a silent
   opening). Without the key the defaults above apply; "open": 0 and "limit": 1 give the old behaviour.

   Clips rendered straight to the upload format (render.mjs default) are joined as they are — no encode at all.
   Fast: nothing is re-encoded as a whole. Pictures are joined as they are (stream copy — every clip comes from
   render.mjs with the same settings); the upload copy is encoded per scene once and cached in out/upcache/ (re-made only
   when that scene's clip is newer). After fixing one scene, re-render that scene and run this again: it costs about one
   scene's encode, not the whole film's. A scene whose clip was deleted (disk) is taken from its cached upload encode
   (then only the upload copy is written), so keep out/upcache/."""
import os, json, subprocess, sys

FPS = 30
X265 = 'crf=20:bframes=0:open-gop=0:keyint=60:min-keyint=60:vbv-maxrate=3600:vbv-bufsize=7200:log-level=error'

ROOT = os.path.abspath(os.environ.get('FILM_ROOT', '.'))
argv = sys.argv[1:]
def opt(name, default=None): return argv[argv.index(name) + 1] if name in argv else default
only = opt('--only')   # testing: --only a,b
pos = [a for i, a in enumerate(argv) if not a.startswith('--') and (i == 0 or argv[i - 1] != '--only')]   # h|v [lang]
ori = pos[0] if pos else 'h'; lang = pos[1] if len(pos) > 1 else ''
tag = f'-{lang}' if lang else ''
FILM = json.load(open(os.path.join(ROOT, 'film.json'), encoding='utf-8'))
ORDER = [s['id'] if isinstance(s, dict) else s for s in FILM['scenes']]
OUT = os.path.join(ROOT, 'out'); TMP = os.path.join(OUT, 'assemble-tmp'); UPC = os.path.join(OUT, 'upcache')
os.makedirs(TMP, exist_ok=True); os.makedirs(UPC, exist_ok=True)

def run(args): subprocess.run(['ffmpeg', '-y', '-loglevel', 'error'] + args, check=True)
def frames(path):
    r = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-count_packets', '-show_entries',
                        'stream=nb_read_packets', '-of', 'default=nw=1:nk=1', path], capture_output=True, text=True, check=True)
    return int(r.stdout.split()[0].strip(','))   # bare value: ffprobe 8 printed "1080," with -of csv=p=0
def concat_list(name, paths):
    p = os.path.join(TMP, name)
    with open(p, 'w') as f: f.writelines(f"file '{x}'\n" for x in paths)
    return p

scenes = only.split(',') if only else ORDER
have, missing = [], []
for s in scenes:
    v, a = os.path.join(OUT, f'{s}{tag}-{ori}.mp4'), os.path.join(ROOT, 'scenes', f'{s}.wav')
    if not os.path.exists(a): a = os.path.join(ROOT, 'site', 's', f'{s}.m4a')   # the published mix (a CI checkout has no wav)
    u = os.path.join(UPC, f'{s}{tag}-{ori}.mp4')
    if not os.path.exists(v) and os.path.exists(u): v = u   # clip deleted to save disk: its cached upload encode stands in
    (have if os.path.exists(v) and os.path.exists(a) else missing).append((s, v, a))
if missing: print('skipped (not rendered or no sound yet):', ', '.join(m[0] for m in missing))
if not have: sys.exit('nothing to assemble')

# sound: per scene, normalised and cut/padded to the picture's exact length
auds = []
for s, v, a in have:
    n = frames(v) * 48000 // FPS; out = os.path.join(TMP, f'aud-{s}.wav')
    # exactly as many samples as the picture has frames: cut by sample count, not by timestamps — an AAC source (the m4a)
    # carries an encoder delay that made a time-based cut 90 ms short per scene, and the sound drifted ahead of the picture
    run(['-i', a, '-af', f'aresample=48000,loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000,atrim=start=0,asetpts=PTS-STARTPTS,apad,atrim=end_sample={n}',
         '-ac', '2', '-ar', '48000', '-c:a', 'pcm_s16le', out])
    auds.append(out)
sound = os.path.join(TMP, 'sound.wav')
run(['-f', 'concat', '-safe', '0', '-i', concat_list('aud.txt', auds), '-c', 'copy', sound])

def mux(video_paths, dst):
    run(['-f', 'concat', '-safe', '0', '-i', concat_list('vid.txt', video_paths), '-i', sound, '-map', '0:v', '-map', '1:a',
         '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', dst])

def probe(path, what):
    return subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', what, '-of', 'default=nw=1:nk=1', path],
                          capture_output=True, text=True).stdout.strip()
def is_upload(path):   # written by render.mjs in the upload format (tagged), or a legacy HEVC upload encode
    return 'osb-upload' in probe(path, 'format_tags=comment') or probe(path, 'stream=codec_name') == 'hevc'
ENC = {   # the upload formats render.mjs writes (closed GOP, 2 s keyframes, no B-frames) — same settings here
    'h264': ['-c:v', 'libx264', '-preset', 'faster', '-crf', '18', '-maxrate', '12M', '-bufsize', '24M', '-g', '60', '-keyint_min', '60', '-sc_threshold', '0', '-bf', '0'],
    'hevc': ['-c:v', 'libx265', '-preset', 'fast', '-x265-params', X265, '-tag:v', 'hvc1'],
}
def upload_encode(s, v, target):
    # a clip is used as it is when it is already the upload format in the target codec (a stream-copy join cannot mix codecs)
    if is_upload(v) and probe(v, 'stream=codec_name') == target: return v
    u = os.path.join(UPC, f'{s}{tag}-{ori}.mp4')
    if v != u and (not os.path.exists(u) or os.path.getmtime(u) < os.path.getmtime(v) or probe(u, 'stream=codec_name') != target):
        print(f'  upload encode ({target}):', s, flush=True)
        run(['-i', v, '-map', '0:v'] + ENC[target] + ['-pix_fmt', 'yuv420p', '-metadata', 'comment=osb-upload', u])
    return u
def upload_target():   # the codec most of the clips already have (so the fewest get re-encoded); new renders are h264
    cs = [probe(v, 'stream=codec_name') for _, v, _ in have if is_upload(v)]
    return max(set(cs), key=cs.count) if cs else 'h264'

if '--shorts' in argv:   # one file per scene (Shorts/Reels), no film
    SD = os.path.join(OUT, 'shorts', lang or 'src'); os.makedirs(SD, exist_ok=True); tgt = upload_target()
    SH = FILM.get('shorts', {}); limit = SH.get('limit', 0.84)   # 0.84 ≈ −1.5 dBFS peaks
    for (s, v, _), aud in zip(have, auds):
        u = upload_encode(s, v, tgt); d = frames(v) / FPS; n = ORDER.index(s) + 1
        skip = SH.get('scenes', {}).get(s, SH.get('open', 1.0)); dd = d - skip
        dst = os.path.join(SD, f'{n:02d}-{s}.mp4')
        # a cut off the 2 s keyframe grid has to be re-encoded; skip 0 stays a stream copy
        vid = ['-c:v', 'copy'] if skip == 0 else ENC[tgt] + ['-pix_fmt', 'yuv420p', '-metadata', 'comment=osb-upload']
        af = (f'alimiter=limit={limit}:level=false,' if limit < 1 else '') + f'afade=t=in:d=0.05,afade=t=out:st={dd - 0.03:.3f}:d=0.03'
        run(['-ss', f'{skip}', '-i', u, '-ss', f'{skip}', '-i', aud, '-map', '0:v', '-map', '1:a'] + vid +
            ['-af', af, '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', dst])
        print('→', dst, f'{dd:.1f}s (from {skip:g} s)')
    sys.exit(0)

dst = os.path.join(OUT, f'film-{ori}{tag}.mp4')
if '--upload' in argv:
    tgt = upload_target()
    if all(is_upload(v) and probe(v, 'stream=codec_name') == tgt for _, v, _ in have):   # already the upload format: one file serves both
        up = dst[:-4] + '-upload.mp4'; mux([v for _, v, _ in have], up)
        print('→', up, f'(upload copy; clips joined as rendered, no encode, {tgt}) ·', len(have), 'scenes'); sys.exit(0)
if any(os.path.dirname(v) == UPC for _, v, _ in have):   # can't mix codecs by stream copy: only the upload copy
    print('master skipped (some scene clips were deleted; their cached upload encodes are used)')
    if '--upload' not in argv: argv.append('--upload')
else:
    mux([v for _, v, _ in have], dst)
    print('→', dst, '·', len(have), 'scenes:', ' → '.join(h[0] for h in have))

if '--upload' in argv:
    tgt = upload_target(); ups = [upload_encode(s, v, tgt) for s, v, _ in have]
    up = dst[:-4] + '-upload.mp4'
    mux(ups, up)
    print('→', up, '(upload copy)')
