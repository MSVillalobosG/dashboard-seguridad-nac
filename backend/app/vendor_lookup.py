from __future__ import annotations

import json
import time
import urllib.error
import urllib.request
from dataclasses import dataclass


@dataclass
class _CacheEntry:
    value: str
    ts: float


# Cache en memoria: OUI (6 hex) -> vendor
_CACHE: dict[str, _CacheEntry] = {}


def _normalize_oui_from_mac(mac_hex: str) -> str | None:
    m = (mac_hex or "").strip().upper()
    # Espera mac como "A864F1F3F084" (solo hex)
    if len(m) < 6:
        return None
    return m[:6]


def lookup_nic_vendor_online(mac_hex: str, *, timeout_s: float = 2.5, ttl_s: float = 60 * 60 * 24 * 30) -> str | None:
    """
    Busca vendor por MAC usando un servicio online.
    - mac_hex: MAC normalizada (solo hex, ej "A864F1F3F084")
    - cache: por OUI (primeros 6 hex)
    - retorna None si no se pudo determinar
    """

    oui = _normalize_oui_from_mac(mac_hex)
    if not oui:
        return None

    now = time.time()
    cached = _CACHE.get(oui)
    if cached and (now - cached.ts) <= ttl_s:
        return cached.value or None

    # API simple por MAC completa: `https://api.macvendors.com/<mac>`
    # Nota: este endpoint puede rate-limit. Manejamos errores y cacheamos negativos.
    # Enviar con separadores suele ser más robusto.
    mac_hex = (mac_hex or "").strip().upper()
    mac_colon = ":".join(mac_hex[i : i + 2] for i in range(0, min(len(mac_hex), 12), 2))
    url = f"https://api.macvendors.com/{mac_colon}"
    try:
        req = urllib.request.Request(
            url,
            headers={
                "User-Agent": "NAC-Dashboard/1.0",
                "Accept": "text/plain",
            },
            method="GET",
        )
        with urllib.request.urlopen(req, timeout=timeout_s) as resp:
            body = resp.read().decode("utf-8", errors="ignore").strip()
            # Cuando no hay vendor, suele devolver texto vacío o error.
            val = body if body else ""
            _CACHE[oui] = _CacheEntry(value=val, ts=now)
            return val or None
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, ValueError):
        # Cache negativo corto para evitar martillar el API
        _CACHE[oui] = _CacheEntry(value="", ts=now)
        return None

