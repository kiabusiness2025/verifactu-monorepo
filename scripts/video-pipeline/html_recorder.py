"""
Record animated HTML demo scenes as video using Playwright.
Each HTML scene receives ?once=1 to play one cycle then signal completion.
Output: WebM in output/recordings/{connector}/scene-N.webm
"""
import asyncio
import subprocess
from pathlib import Path
from playwright.async_api import async_playwright
from config import HTML_DEMO_DIR, OUTPUT_DIR, SCENES, FORMATS

REC_DIR = OUTPUT_DIR / "recordings"


async def record_scene(
    scene: dict,
    connector: str,
    fmt_key: str = "16x9",
    timeout_s: int | None = None,
) -> Path:
    """Record one HTML scene as WebM. Returns path to output file."""
    fmt     = FORMATS[fmt_key]
    width   = fmt["width"]
    height  = fmt["height"]
    dur     = timeout_s or scene["duration_s"]

    out_dir  = REC_DIR / connector
    out_dir.mkdir(parents=True, exist_ok=True)
    webm_out = out_dir / f"{scene['file']}.webm"

    # HTML file is served locally — use file:// URL
    html_path = HTML_DEMO_DIR / f"{scene['file']}.html"
    if not html_path.exists():
        print(f"  ⚠ HTML not found: {html_path.name} — skipping")
        return webm_out

    url = f"file:///{html_path.as_posix()}?connector={connector}&once=1"
    print(f"  → Recording: {scene['file']} ({connector}, {dur}s)…")

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(
            headless=True,
            args=[
                "--autoplay-policy=no-user-gesture-required",
                "--disable-web-security",
            ],
        )
        ctx = await browser.new_context(
            viewport={"width": width, "height": height},
            record_video_dir=str(out_dir),
            record_video_size={"width": width, "height": height},
        )
        page = await ctx.new_page()

        # Listen for the scene to signal completion
        done_event = asyncio.Event()
        await page.expose_function("signalDone", lambda: done_event.set())

        await page.goto(url, wait_until="networkidle")

        # Wait for 'done' signal OR timeout (whichever first)
        try:
            await asyncio.wait_for(done_event.wait(), timeout=dur + 5)
        except asyncio.TimeoutError:
            pass  # Timeout is fine — we recorded enough

        await asyncio.sleep(0.5)  # Small buffer at end
        await ctx.close()
        await browser.close()

    # Playwright names recordings with a generated UUID — rename to our target name
    recorded_files = sorted(out_dir.glob("*.webm"), key=lambda f: f.stat().st_mtime)
    if recorded_files:
        latest = recorded_files[-1]
        if latest != webm_out:
            latest.rename(webm_out)
    print(f"    ✓ Saved → {webm_out.name}")
    return webm_out


async def record_all_scenes(
    connector: str,
    fmt_key: str = "16x9",
    scene_ids: list[int] | None = None,
) -> dict[int, Path]:
    """Record all (or selected) scenes for a connector."""
    scenes = SCENES if scene_ids is None else [s for s in SCENES if s["id"] in scene_ids]
    results = {}
    for scene in scenes:
        path = await record_scene(scene, connector, fmt_key)
        results[scene["id"]] = path
    return results


def webm_to_mp4(webm: Path, mp4: Path | None = None) -> Path:
    """Convert WebM to MP4 using FFmpeg."""
    out = mp4 or webm.with_suffix(".mp4")
    cmd = [
        "ffmpeg", "-y",
        "-i", str(webm),
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "20",
        "-pix_fmt", "yuv420p",
        str(out),
    ]
    subprocess.run(cmd, check=True, capture_output=True)
    return out


if __name__ == "__main__":
    import sys
    connector = sys.argv[1] if len(sys.argv) > 1 else "claude"
    fmt       = sys.argv[2] if len(sys.argv) > 2 else "16x9"

    async def main():
        results = await record_all_scenes(connector, fmt)
        print(f"\nRecorded {len(results)} scenes.")
        # Convert all WebM → MP4
        for path in results.values():
            if path.exists():
                mp4 = webm_to_mp4(path)
                print(f"  → {mp4.name}")

    asyncio.run(main())
