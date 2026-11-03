# Voice: narration and word timing

Everything in the film is timed to the voice's words, so the voice is made right after the script is approved.

## Target (STYLE_BIBLE.md)
One male narrator, fast and steady: **3.5–4.1 words/s (median 3.7)**, almost no pauses (gaps > 0.25 s total < 1 s per
video), one tone throughout, English. The voice starts at frame 1–4.

## With the ElevenLabs MCP connector (how the worked example was made)
1. `creative_list_voices` — search "storyteller narrator", gender male, language en, use case narrative_story; pick a
   clear, engaging American narrator (the example used "Leo – The Engaging Narrator & Storyteller").
2. `creative_generate_speech` with model `eleven_v4`, the whole script as one prompt, the default two takes. Never call it
   again to retry (each call is charged). TTS reads slower than the reference: the example's takes were 79 s for 211 words.
3. Download the take, then tighten the pauses and speed it up (pitch is kept):
   ```bash
   ffmpeg -i take.mp3 -af "silenceremove=start_periods=1:start_threshold=-45dB:stop_periods=-1:stop_duration=0.14:stop_threshold=-35dB:stop_silence=0.09,atempo=1.14,adelay=100:all=1" -ar 48000 -ac 1 voice/voice.wav
   ffmpeg -i voice/voice.wav -b:a 128k voice/voice.mp3
   ```
   (79 s → 61.8 s, 3.4 words/s.) Above `atempo` ~1.2 the voice starts to sound sped up.
4. Word times from the *final* file: `creative_create_asset_upload` (exact byte size, `audio/mpeg`) → `curl -X PUT
   -H "Content-Type: audio/mpeg" --data-binary @voice/voice.mp3 <upload_url>` → `creative_finalize_asset_upload` with the
   flow → `creative_transcribe_audio` (`eleven_scribe_v1`, `connect_from` the node) → `creative_get_flow_run_status`
   → download `words_download_url` and convert:
   ```bash
   node -e "const r=require('./words-raw.json');const w=(r.words||r).filter(x=>x.type==='word').map(x=>({w:x.text,s:+x.start.toFixed(3),e:+x.end.toFixed(3)}));require('fs').writeFileSync('voice/words.json','['+w.map(x=>JSON.stringify(x)).join(',\n')+']\n')"
   ```
5. Check the transcript against the script: numbers come back as digits ("1173", "45", "100") and names may be spelt
   differently ("Luca" for Lucca) — `F.at()` matches what is in words.json, so look words up as transcribed.

## With an API key instead
`POST https://api.elevenlabs.io/v1/text-to-speech/<voice_id>/with-timestamps` returns the audio and character-level
alignment in one call; group characters into words (split on spaces) for `words.json`. Then tighten as above — and
re-transcribe after `atempo`, or scale every time by 1/atempo and shift for removed silences (re-transcribing is simpler).

## Without a voice yet
`new Film({ words: SCRIPT })` estimates word times from the text at ~3.7 words/s with small pauses after punctuation
(`Film.estimate`), so the film can be built and reviewed before the voice exists (the template does this). Swap in the
real `words.json` and every shot moves with it.

## Mix
`node <skill>/scripts/score.mjs score.js --dur <DURATION> --voice voice/voice.mp3 --words voice/words.json` → `out/mix.wav`:
the voice at unity on top, the bed ducked under every word (music −9 dB, SFX −3 dB) and placed ~9 LU under the voice,
the whole mix normalised to −14 LUFS with a peak limiter at −1 dB. It prints the voice / bed / mix loudness and the
margin; raise or lower `music` / `sfxGain` in `SCORE` to land 8–10 LU.
