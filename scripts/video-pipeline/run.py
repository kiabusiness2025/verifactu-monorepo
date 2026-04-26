#!/usr/bin/env python3
"""
Holded Video Pipeline — main entry point.

Usage:
  python run.py                          # Full pipeline, claude, 16x9
  python run.py --connector chatgpt      # ChatGPT connector
  python run.py --format 9x16           # Reels/TikTok format
  python run.py --connector claude --format 16x9 --skip-sora
  python run.py --only-assemble          # Assemble from existing recordings
  python run.py --only-data             # Just refresh Holded data cache
"""
import argparse
import asyncio
import sys
from pathlib import Path

# ── Setup: ensure script dir is on PYTHONPATH ───────────────
sys.path.insert(0, str(Path(__file__).parent))

from config import CONNECTORS, FORMATS
from holded_client import fetch_all, summarize
from script_generator import generate_scripts
from sora_generator import generate_all_backgrounds
from html_recorder import record_all_scenes, webm_to_mp4
from assembler import assemble


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Holded Demo Video Pipeline")
    p.add_argument("--connector",      default="claude",  choices=list(CONNECTORS))
    p.add_argument("--format",         default="16x9",    choices=list(FORMATS))
    p.add_argument("--skip-sora",      action="store_true", help="Skip Sora background generation")
    p.add_argument("--skip-scripts",   action="store_true", help="Skip Q&A script generation")
    p.add_argument("--skip-record",    action="store_true", help="Skip HTML scene recording")
    p.add_argument("--only-assemble",  action="store_true", help="Only run final assembly")
    p.add_argument("--only-data",      action="store_true", help="Only refresh Holded data")
    p.add_argument("--force-data",     action="store_true", help="Force re-fetch Holded data")
    p.add_argument("--force-sora",     action="store_true", help="Re-generate Sora backgrounds")
    p.add_argument("--all-connectors", action="store_true", help="Run for Claude AND ChatGPT")
    p.add_argument("--all-formats",    action="store_true", help="Export all format variants")
    return p.parse_args()


async def run_pipeline(connector: str, fmt: str, args: argparse.Namespace) -> None:
    print(f"\n{'='*60}")
    print(f"  Holded Video Pipeline")
    print(f"  Connector: {connector}  |  Format: {fmt}")
    print(f"{'='*60}")

    # ── Step 1: Fetch Holded data ────────────────────────────
    print("\n[1/5] Fetching Holded data (Nova Gestión)…")
    data    = fetch_all(force=args.force_data)
    summary = summarize(data)
    print(f"  Revenue: {summary['total_revenue']:,.0f} €  |  Clients: {len(summary['top_clients'])}")

    if args.only_data:
        print("\nDone (--only-data mode).")
        return

    # ── Step 2: Generate Q&A scripts ────────────────────────
    if not args.skip_scripts and not args.only_assemble:
        print(f"\n[2/5] Generating Q&A scripts ({connector})…")
        generate_scripts(summary, connector)
    else:
        print("\n[2/5] Skipping script generation.")

    # ── Step 3: Generate Sora backgrounds ────────────────────
    if not args.skip_sora and not args.only_assemble:
        print("\n[3/5] Generating Sora backgrounds…")
        generate_all_backgrounds(force=args.force_sora)
    else:
        print("\n[3/5] Skipping Sora generation.")

    # ── Step 4: Record HTML scenes ───────────────────────────
    if not args.skip_record and not args.only_assemble:
        print(f"\n[4/5] Recording HTML scenes ({connector}, {fmt})…")
        recordings = await record_all_scenes(connector, fmt)
        # Convert WebM → MP4
        for path in recordings.values():
            if path.exists() and path.suffix == ".webm":
                webm_to_mp4(path)
    else:
        print("\n[4/5] Skipping HTML recording.")

    # ── Step 5: Assemble final video ─────────────────────────
    print(f"\n[5/5] Assembling final video ({connector}, {fmt})…")
    formats = list(FORMATS.keys()) if args.all_formats else [fmt]
    for f in formats:
        assemble(connector, f)

    print("\n✅ Pipeline complete!")


def main() -> None:
    args = parse_args()

    connectors = list(CONNECTORS.keys()) if args.all_connectors else [args.connector]

    for connector in connectors:
        asyncio.run(run_pipeline(connector, args.format, args))


if __name__ == "__main__":
    main()
