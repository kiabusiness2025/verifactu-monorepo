"""
FFmpeg assembler — joins Sora backgrounds (intro/outro) + HTML scene recordings
into a final polished video. Supports multiple output formats.
"""
import subprocess
import json
from pathlib import Path
from config import OUTPUT_DIR, SCENES, FORMATS

BKGD_DIR  = OUTPUT_DIR / "backgrounds"
REC_DIR   = OUTPUT_DIR / "recordings"
FINAL_DIR = OUTPUT_DIR / "final"


def _ffmpeg(*args: str, check: bool = True) -> subprocess.CompletedProcess:
    cmd = ["ffmpeg", "-y"] + list(args)
    return subprocess.run(cmd, check=check, capture_output=True, text=True)


def _get_scene_video(scene: dict, connector: str) -> Path | None:
    """Find the recorded/generated video for a scene."""
    rec_dir = REC_DIR / connector

    # Intro/outro: use Sora background if available, else fall back to HTML recording
    if scene["sora_bg"]:
        sora_mp4 = BKGD_DIR / f"{scene['topic']}.mp4"
        if sora_mp4.exists():
            return sora_mp4

    # HTML recording (WebM or MP4)
    for ext in ("mp4", "webm"):
        p = rec_dir / f"{scene['file']}.{ext}"
        if p.exists():
            return p

    return None


def assemble(connector: str, fmt_key: str = "16x9") -> Path:
    """Assemble all scenes for a connector into a final video."""
    fmt      = FORMATS[fmt_key]
    width    = fmt["width"]
    height   = fmt["height"]
    label    = fmt["label"]
    FINAL_DIR.mkdir(parents=True, exist_ok=True)

    # Collect all available scene videos in order
    clips: list[Path] = []
    for scene in SCENES:
        vid = _get_scene_video(scene, connector)
        if vid:
            clips.append(vid)
            print(f"  ✓ {scene['file']} → {vid.name}")
        else:
            print(f"  ⚠ Missing: {scene['file']} — skipped")

    if not clips:
        raise RuntimeError("No clips found. Run record step first.")

    # Build FFmpeg concat filter
    # Scale + pad each clip to target dimensions, add 0.5s crossfade transitions
    filter_parts = []
    for i, clip in enumerate(clips):
        filter_parts.append(
            f"[{i}:v]scale={width}:{height}:force_original_aspect_ratio=decrease,"
            f"pad={width}:{height}:(ow-iw)/2:(oh-ih)/2:black,"
            f"setsar=1,fps=30[v{i}]"
        )

    # Crossfade between clips
    if len(clips) > 1:
        prev = "v0"
        for i in range(1, len(clips)):
            nxt = f"xf{i}"
            offset = _get_clip_duration(clips[i - 1]) - 0.5
            filter_parts.append(
                f"[{prev}][v{i}]xfade=transition=fade:duration=0.5:offset={offset:.1f}[{nxt}]"
            )
            prev = nxt
        final_v = prev
    else:
        final_v = "v0"

    filter_complex = ";".join(filter_parts)

    out_file = FINAL_DIR / f"holded_{connector}_{label}.mp4"

    # Build input args
    inputs = []
    for clip in clips:
        inputs += ["-i", str(clip)]

    _ffmpeg(
        *inputs,
        "-filter_complex", filter_complex,
        "-map", f"[{final_v}]",
        "-c:v", "libx264",
        "-preset", "medium",
        "-crf", "18",
        "-pix_fmt", "yuv420p",
        "-movflags", "+faststart",
        str(out_file),
    )
    size_mb = out_file.stat().st_size / 1e6
    print(f"\n  ✅ Final video: {out_file.name} ({size_mb:.1f} MB)")
    return out_file


def _get_clip_duration(clip: Path) -> float:
    """Get video duration in seconds using ffprobe."""
    result = subprocess.run(
        [
            "ffprobe", "-v", "quiet",
            "-print_format", "json",
            "-show_streams",
            str(clip),
        ],
        capture_output=True, text=True, check=True,
    )
    info = json.loads(result.stdout)
    for stream in info.get("streams", []):
        if stream.get("codec_type") == "video":
            dur = stream.get("duration")
            if dur:
                return float(dur)
    return 22.0  # default fallback


def assemble_all(connector: str) -> dict[str, Path]:
    """Assemble final videos in all formats."""
    results = {}
    for fmt_key in FORMATS:
        print(f"\n→ Assembling {connector} · {fmt_key}…")
        results[fmt_key] = assemble(connector, fmt_key)
    return results


if __name__ == "__main__":
    import sys
    connector = sys.argv[1] if len(sys.argv) > 1 else "claude"
    fmt       = sys.argv[2] if len(sys.argv) > 2 else "16x9"
    assemble(connector, fmt)
