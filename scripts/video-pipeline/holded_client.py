"""Holded API client — fetches and caches data for Nova Gestión."""
import json
import time
import requests
from pathlib import Path
from config import HOLDED_API_KEY, HOLDED_BASE_URL, OUTPUT_DIR

CACHE_FILE = OUTPUT_DIR / "data" / "nova_gestion.json"
HEADERS = {"key": HOLDED_API_KEY, "Accept": "application/json"}


def _get(endpoint: str, params: dict | None = None) -> list | dict:
    url = f"{HOLDED_BASE_URL}/{endpoint}"
    r = requests.get(url, headers=HEADERS, params=params or {}, timeout=30)
    r.raise_for_status()
    return r.json()


def _safe_get(endpoint: str, params: dict | None = None) -> list | dict:
    try:
        return _get(endpoint, params)
    except Exception as e:
        print(f"  ⚠ {endpoint}: {e}")
        return []


def fetch_all(force: bool = False) -> dict:
    """Fetch all relevant data from Holded and cache to JSON."""
    if CACHE_FILE.exists() and not force:
        print(f"→ Loading cached Holded data from {CACHE_FILE.name}")
        return json.loads(CACHE_FILE.read_text(encoding="utf-8"))

    print("→ Fetching Nova Gestión data from Holded API…")

    data: dict = {}

    # Invoices & bills
    print("  • Documents (invoices)…")
    data["invoices"] = _safe_get("invoicing/v1/documents/invoice")
    time.sleep(0.3)

    print("  • Documents (bills)…")
    data["bills"] = _safe_get("invoicing/v1/documents/bill")
    time.sleep(0.3)

    # Contacts
    print("  • Contacts…")
    contacts_raw = _safe_get("crm/v1/contacts", {"type": "client"})
    # Limit to 30 to avoid huge payload
    data["contacts"] = contacts_raw[:30] if isinstance(contacts_raw, list) else contacts_raw
    time.sleep(0.3)

    # Products / services
    print("  • Products…")
    data["products"] = _safe_get("inventory/v1/products")
    time.sleep(0.3)

    # Journal (accounting)
    print("  • Journal…")
    data["journal"] = _safe_get("accounting/v1/dailyledger")
    time.sleep(0.3)

    # Projects
    print("  • Projects…")
    data["projects"] = _safe_get("projects/v1/projects")
    time.sleep(0.3)

    # Employees
    print("  • Employees…")
    data["employees"] = _safe_get("hr/v1/employees")

    CACHE_FILE.parent.mkdir(parents=True, exist_ok=True)
    CACHE_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"  ✓ Saved to {CACHE_FILE}")
    return data


def summarize(data: dict) -> dict:
    """Extract key financial KPIs from raw Holded data for script generation."""
    invoices = data.get("invoices", [])
    contacts = data.get("contacts", [])
    products = data.get("products", [])

    # Revenue by contact
    revenue_by_contact: dict[str, float] = {}
    total_revenue = 0.0
    pending_invoices = []

    for inv in invoices:
        amount = float(inv.get("total", 0) or 0)
        total_revenue += amount
        name = inv.get("contactName") or inv.get("contact", {}).get("name", "Desconocido")
        revenue_by_contact[name] = revenue_by_contact.get(name, 0) + amount

        status = inv.get("status", "")
        if status in ("pending", "overdue", "partial"):
            pending_invoices.append({
                "client": name,
                "amount": amount,
                "status": status,
                "due": inv.get("dueDate") or inv.get("date", ""),
                "concept": inv.get("desc") or inv.get("notes", "Servicios profesionales"),
            })

    top_clients = sorted(revenue_by_contact.items(), key=lambda x: x[1], reverse=True)[:6]

    # Revenue by month
    monthly: dict[str, float] = {}
    for inv in invoices:
        date = inv.get("date", "") or ""
        if len(date) >= 7:
            month = date[:7]  # YYYY-MM
            monthly[month] = monthly.get(month, 0) + float(inv.get("total", 0) or 0)

    # Products
    product_names = [p.get("name", "") for p in products[:8]]

    return {
        "total_revenue": total_revenue,
        "top_clients": [{"name": n, "total": t} for n, t in top_clients],
        "pending_invoices": pending_invoices[:5],
        "monthly_revenue": dict(sorted(monthly.items())[-6:]),  # last 6 months
        "product_names": product_names,
        "employee_count": len(data.get("employees", [])),
        "project_count": len(data.get("projects", [])),
    }


if __name__ == "__main__":
    d = fetch_all(force=True)
    s = summarize(d)
    print("\n── Summary ──")
    print(json.dumps(s, ensure_ascii=False, indent=2))
