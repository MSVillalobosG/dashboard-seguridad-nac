from __future__ import annotations

import re
import time
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Iterable, Optional

try:
    import pywintypes  # type: ignore
    import win32com.client  # type: ignore
except Exception:  # pragma: no cover
    pywintypes = None
    win32com = None


RPC_E_CALL_REJECTED = -2147418111


def _is_call_rejected(err: Exception) -> bool:
    if pywintypes is None:
        return False
    if isinstance(err, pywintypes.com_error):
        try:
            return err.args and err.args[0] == RPC_E_CALL_REJECTED
        except Exception:
            return False
    return False


def _retry_com(fn, retries: int = 30, delay: float = 0.2):
    last = None
    for _ in range(retries):
        try:
            return fn()
        except Exception as e:
            last = e
            if _is_call_rejected(e):
                time.sleep(delay)
                continue
            raise
    raise last  # type: ignore[misc]


def _to_naive(dt):
    if dt is None:
        return None
    try:
        if getattr(dt, "tzinfo", None) is not None:
            return dt.replace(tzinfo=None)
    except Exception:
        pass
    return dt


def _normalizar_mac(mac: str) -> str:
    m = (mac or "").strip().upper()
    return re.sub(r"[^0-9A-F]", "", m)


def _is_locally_administered_mac(mac_hex: str) -> bool:
    """
    Bit 1 del primer octeto indica 'locally administered' (randomized MAC).
    Ej: 56:AA:... -> 0x56 tiene el bit 0x02 encendido.
    """

    m = (mac_hex or "").strip().upper()
    if len(m) < 2:
        return False
    try:
        first = int(m[:2], 16)
    except Exception:
        return False
    return (first & 0x02) != 0


def _extraer_hostname(cuerpo: str) -> str:
    patrones = [
        r"Hostname\s*[:=]\s*([^\r\n]+)",
        r"Computer Name\s*[:=]\s*([^\r\n]+)",
    ]
    for p in patrones:
        m = re.search(p, cuerpo or "", re.IGNORECASE)
        if m:
            val = m.group(1).strip()
            if "/" in val:
                val = val.split("/")[-1]
            return val.strip().upper()
    return ""


def _extraer_ip(cuerpo: str) -> str:
    patrones = [
        r"IPv4\s*[:=]\s*(\S+)",
        r"IP Address\s*[:=]\s*(\S+)",
    ]
    for p in patrones:
        m = re.search(p, cuerpo or "", re.IGNORECASE)
        if m:
            return m.group(1).strip()
    return ""


def _extraer_mac(cuerpo: str) -> str:
    m = re.search(r"MAC\s*[:=]\s*(\S+)", cuerpo or "", re.IGNORECASE)
    return m.group(1).strip() if m else ""


def _extraer_usuario(cuerpo: str) -> str:
    patrones = [
        r"User Name\s*[:=]\s*(\S+)",
        r"User\s*[:=]\s*(\S+)",
        r"GlobalProtect User\s*[:=]\s*(\S+)",
    ]
    for p in patrones:
        m = re.search(p, cuerpo or "", re.IGNORECASE)
        if m:
            return m.group(1).strip()
    return "User"


def _extraer_segmento(cuerpo: str) -> str:
    patrones = [
        r"Segment Name\s*[:=]\s*([^\r\n]+)",
        r"Segment\s*[:=]\s*([^\r\n]+)",
    ]
    for p in patrones:
        m = re.search(p, cuerpo or "", re.IGNORECASE)
        if m:
            return m.group(1).strip()
    return ""


def _extraer_os(cuerpo: str) -> str:
    m = re.search(r"OS\s*[:=]\s*([^\r\n]+)", cuerpo or "", re.IGNORECASE)
    return m.group(1).strip() if m else ""


def _extraer_nic_vendor(cuerpo: str) -> str:
    m = re.search(r"NIC Vendor\s*[:=]\s*([^\r\n]+)", cuerpo or "", re.IGNORECASE)
    return m.group(1).strip() if m else ""


def _extraer_assigned_labels(cuerpo: str) -> str:
    m = re.search(r"Assigned Labels\s*[:=]\s*([^\r\n]+)", cuerpo or "", re.IGNORECASE)
    return m.group(1).strip() if m else ""


@dataclass(frozen=True)
class ImportedAlert:
    entry_id: str
    folder: str
    alert: str
    severity_code: str
    received_time: datetime
    hostname: str
    ip: str
    mac: str
    user: str
    segment: str
    os: str
    nic_vendor: str
    assigned_labels: str
    raw_subject: str
    raw_body_preview: str


def iter_outlook_alerts(
    *,
    outlook_account: str,
    folders: Iterable[str],
    since: Optional[datetime] = None,
    max_body_preview_chars: int = 500,
) -> Iterable[ImportedAlert]:
    if win32com is None:
        raise RuntimeError("pywin32 no está disponible. Este importador requiere Windows + pywin32.")

    if since is None:
        since = datetime.now() - timedelta(days=7)
    since = since.replace(tzinfo=None)

    outlook = _retry_com(lambda: win32com.client.Dispatch("Outlook.Application").GetNamespace("MAPI"))
    cuenta = _retry_com(lambda: outlook.Folders.Item(outlook_account))

    targets = {f.upper() for f in folders}
    map_folders = {}
    for f in _retry_com(lambda: cuenta.Folders):
        try:
            if f.Name.upper() in targets:
                map_folders[f.Name.upper()] = f
        except Exception:
            continue

    for folder_name in folders:
        carpeta = map_folders.get(folder_name.upper())
        if not carpeta:
            continue

        items = _retry_com(lambda: carpeta.Items)
        try:
            items.Sort("[ReceivedTime]", True)
        except Exception:
            pass

        for mail in items:
            try:
                try:
                    if mail.Class != 43:  # MailItem
                        continue
                except Exception:
                    continue

                rt = _to_naive(getattr(mail, "ReceivedTime", None))
                if rt is None:
                    continue

                if rt < since:
                    break

                entry_id = getattr(mail, "EntryID", None)
                if not entry_id:
                    continue

                subject = (getattr(mail, "Subject", "") or "").strip()
                body = getattr(mail, "Body", "") or ""

                host = _extraer_hostname(body)
                ip = _extraer_ip(body)
                mac = _extraer_mac(body)
                user = _extraer_usuario(body)
                seg = _extraer_segmento(body)
                os_ = _extraer_os(body)
                nic_vendor = _extraer_nic_vendor(body)
                assigned_labels = _extraer_assigned_labels(body)

                # Si el correo no trae NIC Vendor, inferirlo por MAC (lookup online por OUI)
                norm_mac = _normalizar_mac(mac)
                # Algunos correos traen "Locally Administered MAC Address" (no es vendor útil).
                if nic_vendor and nic_vendor.strip().lower() == "locally administered mac address":
                    nic_vendor = ""

                # Si la MAC es local/random (LAA), no tiene sentido buscar vendor por OUI.
                if not nic_vendor and norm_mac and not _is_locally_administered_mac(norm_mac):
                    try:
                        from app.vendor_lookup import lookup_nic_vendor_online

                        nic_vendor = lookup_nic_vendor_online(norm_mac) or ""
                    except Exception:
                        pass

                preview = body.replace("\r", "\n")
                preview = re.sub(r"\n{3,}", "\n\n", preview).strip()
                if len(preview) > max_body_preview_chars:
                    preview = preview[: max_body_preview_chars - 3] + "..."

                sev = (subject[:3] or "").upper()

                yield ImportedAlert(
                    entry_id=str(entry_id),
                    folder=folder_name,
                    alert=subject,
                    severity_code=sev,
                    received_time=rt,
                    hostname=(host or ""),
                    ip=(ip or ""),
                    mac=norm_mac,
                    user=(user or "User"),
                    segment=(seg or ""),
                    os=os_ or "",
                    nic_vendor=nic_vendor or "",
                    assigned_labels=assigned_labels or "",
                    raw_subject=subject,
                    raw_body_preview=preview,
                )
            except Exception:
                continue

