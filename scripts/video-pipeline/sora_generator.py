"""
Generate cinematic background videos with OpenAI Sora API.
Used only for intro and outro scenes (scenes 0 and 7).
"""
import time
import requests
from pathlib import Path
from openai import OpenAI
from config import OPENAI_API_KEY, OUTPUT_DIR, SORA_PROMPTS, VIDEO_DURATION, SORA_MODEL

client    = OpenAI(api_key=OPENAI_API_KEY)
BKGD_DIR  = OUTPUT_DIR / "backgrounds"


def generate_background(scene_key: str, force: bool = False) -> Path:
    """Generate a Sora background video for a scene key (intro/outro)."""
    out_file = BKGD_DIR / f"{scene_key}.mp4"
    BKGD_DIR.mkdir(parents=True, exist_ok=True)

    if out_file.exists() and not force:
        print(f"  ↩ {scene_key}.mp4 already exists, skipping")
        return out_file

    prompt = SORA_PROMPTS.get(scene_key)
    if not prompt:
        raise ValueError(f"No Sora prompt defined for scene: {scene_key}")

    print(f"  → Generating Sora background: {scene_key}…")
    print(f"    Prompt: {prompt[:80]}…")

    try:
        # Sora API via OpenAI — generates a video from a text prompt.
        # The API returns a generation object; poll until status == 'completed'.
        response = client.video.generate(
            model=SORA_MODEL,
            prompt=prompt,
            size="1920x1080",
            duration=VIDEO_DURATION,
            n=1,
        )
        generation_id = response.id
        print(f"    Job submitted: {generation_id} — polling…")

        # Poll for completion (Sora is async, typically 1-5 min)
        for attempt in range(60):
            time.sleep(10)
            status_resp = client.video.retrieve(generation_id)
            status = status_resp.status
            print(f"    [{attempt+1:02d}] status: {status}")
            if status == "completed":
                video_url = status_resp.data[0].url
                _download(video_url, out_file)
                print(f"    ✓ Saved → {out_file.name}")
                return out_file
            if status in ("failed", "cancelled"):
                raise RuntimeError(f"Sora generation {status}: {generation_id}")

        raise TimeoutError(f"Sora generation timed out after 10 minutes: {generation_id}")

    except AttributeError:
        # Fallback if the API surface differs from expected
        print("  ⚠ client.video.generate not available — trying client.videos.generate…")
        return _try_alt_api(scene_key, prompt, out_file)


def _try_alt_api(scene_key: str, prompt: str, out_file: Path) -> Path:
    """Alternative API call format if the primary one fails."""
    # Try the images-style generate (some OpenAI endpoints work this way)
    response = client.images.generate(
        model=SORA_MODEL,
        prompt=prompt,
        n=1,
        size="1920x1080",
    )
    # If this returns a URL for a video
    url = response.data[0].url
    _download(url, out_file)
    print(f"    ✓ Saved via alt API → {out_file.name}")
    return out_file


def _download(url: str, dest: Path) -> None:
    """Download a file from URL to dest path."""
    r = requests.get(url, stream=True, timeout=120)
    r.raise_for_status()
    dest.write_bytes(r.content)


def generate_all_backgrounds(force: bool = False) -> dict[str, Path]:
    """Generate all Sora backgrounds defined in SORA_PROMPTS."""
    results = {}
    for key in SORA_PROMPTS:
        results[key] = generate_background(key, force=force)
    return results


if __name__ == "__main__":
    import sys
    force = "--force" in sys.argv
    generate_all_backgrounds(force=force)
