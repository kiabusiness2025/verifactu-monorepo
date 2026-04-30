"""Central config â€” loads from .env.local at repo root."""
import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env.local from repo root
REPO_ROOT = Path(__file__).resolve().parents[2]
load_dotenv(REPO_ROOT / ".env.local")

# â”€â”€ API keys â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
HOLDED_API_KEY    = os.environ.get("HOLDED_TEST_API_KEY") or os.environ["HOLDED_API_KEY"]
ANTHROPIC_API_KEY = os.environ["ANTHROPIC_API_KEY"]
OPENAI_API_KEY    = os.environ.get("SORA_API_KEY") or os.environ["ISAAK_NEW_OPENAI_API_KEY"]

# â”€â”€ Paths â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
PIPELINE_DIR  = Path(__file__).parent
OUTPUT_DIR    = PIPELINE_DIR / "output"
HTML_DEMO_DIR = REPO_ROOT / "apps/holded/public/demo"

# â”€â”€ Holded API â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
HOLDED_BASE_URL = "https://api.holded.com/api"

# â”€â”€ Sora / OpenAI â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
SORA_MODEL      = "sora-1.0-hd"
VIDEO_DURATION  = 10   # seconds per background clip

# â”€â”€ Video output formats â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
FORMATS = {
    "16x9": {"width": 1920, "height": 1080, "label": "YouTube_LinkedIn"},
    "9x16": {"width": 1080, "height": 1920, "label": "Reels_TikTok"},
    "1x1":  {"width": 1080, "height": 1080, "label": "Instagram"},
}

# â”€â”€ Scene definitions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# file: HTML filename prefix, topic: used for Q&A generation and Sora prompts
SCENES = [
    {"id": 0, "file": "scene-0-intro",       "topic": "intro",       "sora_bg": True,  "duration_s": 8},
    {"id": 1, "file": "scene-1-pyg",         "topic": "pyg",         "sora_bg": False, "duration_s": 22},
    {"id": 2, "file": "scene-2-clientes",    "topic": "clientes",    "sora_bg": False, "duration_s": 22},
    {"id": 3, "file": "scene-3-facturas",    "topic": "facturas",    "sora_bg": False, "duration_s": 22},
    {"id": 4, "file": "scene-4-dashboard",   "topic": "dashboard",   "sora_bg": False, "duration_s": 22},
    {"id": 5, "file": "scene-5-borrador",    "topic": "borrador",    "sora_bg": False, "duration_s": 24},
    {"id": 6, "file": "scene-6-comparativa", "topic": "comparativa", "sora_bg": False, "duration_s": 24},
    {"id": 7, "file": "scene-7-outro",       "topic": "outro",       "sora_bg": True,  "duration_s": 10},
]

# â”€â”€ Sora prompts for backgrounds â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
SORA_PROMPTS = {
    "intro": (
        "Cinematic white studio background, warm amber and coral light particles "
        "floating slowly upward, soft bokeh, ultra-clean, 4K, 10 seconds loop. "
        "No text, no people, minimal and elegant."
    ),
    "outro": (
        "Cinematic white studio background, warm amber and coral light particles "
        "gently settling, soft focus, elegant closure feel, ultra-clean, 4K. "
        "No text, no people."
    ),
}

# â”€â”€ Connector themes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CONNECTORS = {
    "claude": {
        "label": "Claude",
        "accent": "#d97757",
        "badge_text": "Conector activo",
        "model_label": "Claude Â· claude-opus-4-5",
    },
    "chatgpt": {
        "label": "ChatGPT",
        "accent": "#10a37f",
        "badge_text": "Plugin activo",
        "model_label": "GPT-4o Â· Holded Plugin",
    },
}
