from __future__ import annotations

from datetime import datetime, timedelta
from threading import Thread

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app import crud
from app.db import engine, ensure_sqlite_schema, get_db
from app.etl.outlook_import import iter_outlook_alerts
from app.jobs import get_job, new_job, update_job
from app.models import Alert, Base
from app.schema import (
    AlertOut,
    BlockOut,
    DashboardResponse,
    OpsDashboardResponse,
    OpsDataQuality,
    OpsKpis,
    OpsBlockItem,
    ReincidenceResponse,
    SearchResponse,
    UpdateRunResponse,
    UpdateStatusResponse,
)
from app.settings import settings


app = FastAPI(title="NAC Dashboard API", version="0.1.0")

origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def _startup():
    Base.metadata.create_all(bind=engine)
    ensure_sqlite_schema()

    # Hilo de importación continua desde Outlook hacia SQLite.
    # Corre cada 60 segundos y trae correos recientes; es idempotente por EntryID.
    def _continuous_import_loop():
        while True:
            try:
                from app.db import SessionLocal

                try:
                    import pythoncom  # type: ignore

                    pythoncom.CoInitialize()
                except Exception:
                    pythoncom = None  # type: ignore[assignment]

                db = SessionLocal()
                inserted = 0
                updated = 0
                processed = 0
                try:
                    folders = [f.strip() for f in settings.outlook_folders.split(",") if f.strip()]
                    # Traer siempre últimas 8 semanas; EntryID evita duplicados.
                    since = datetime.now() - timedelta(days=56)
                    for a in iter_outlook_alerts(
                        outlook_account=settings.outlook_account,
                        folders=folders,
                        since=since,
                    ):
                        processed += 1
                        ins, upd = crud.upsert_alert(
                            db,
                            entry_id=a.entry_id,
                            folder=a.folder,
                            alert=a.alert,
                            severity_code=a.severity_code,
                            received_time=a.received_time,
                            hostname=a.hostname,
                            ip=a.ip,
                            mac=a.mac,
                            user=a.user,
                            segment=a.segment,
                            os=a.os,
                            nic_vendor=a.nic_vendor,
                            assigned_labels=getattr(a, "assigned_labels", "") or "",
                            raw_subject=a.raw_subject,
                            raw_body_preview=a.raw_body_preview,
                        )
                        if ins:
                            inserted += 1
                        elif upd:
                            updated += 1
                    db.commit()
                    if processed:
                        print(
                            f"[NAC] Background import: processed={processed}, "
                            f"inserted={inserted}, updated={updated}"
                        )
                finally:
                    db.close()
                    try:
                        import pythoncom  # type: ignore

                        pythoncom.CoUninitialize()
                    except Exception:
                        pass
            except Exception as e:  # pragma: no cover - solo logging
                import traceback

                print(f"[NAC] Background import failed: {e}")
                traceback.print_exc()
            # Espera antes de la siguiente iteración
            import time as _time

            _time.sleep(60)

    Thread(target=_continuous_import_loop, daemon=True).start()


def _parse_extra_fields(body: str):
    import re as _re

    def m(p: str):
        r = _re.search(p, body or "", _re.IGNORECASE)
        return r.group(1).strip() if r else None

    policy = m(r"Policy Name:\s*([^\r\n]+)")
    domain = m(r"Domain:\s*([^\r\n]+)")
    gateway = m(r"GlobalProtect Gateway:\s*([^\r\n]+)")
    return policy, domain, gateway


def _to_alert_out(a: Alert) -> AlertOut:
    policy, domain, gateway = _parse_extra_fields(getattr(a, "raw_body_preview", "") or "")
    return AlertOut(
        id=a.id,
        received_time=a.received_time,
        folder=a.folder,
        alert=a.alert,
        hostname=a.hostname,
        ip=a.ip,
        mac=a.mac,
        user=a.user,
        segment=a.segment,
        os=getattr(a, "os", "") or "",
        nic_vendor=getattr(a, "nic_vendor", "") or "",
        policy_name=policy,
        domain=domain,
        gateway=gateway,
        recurrence=None,
    )


def _to_block_out(a: Alert) -> BlockOut:
    policy, domain, gateway = _parse_extra_fields(getattr(a, "raw_body_preview", "") or "")
    return BlockOut(
        id=a.id,
        received_time=a.received_time,
        folder=a.folder,
        alert=a.alert,
        hostname=a.hostname,
        ip=a.ip,
        mac=a.mac,
        user=a.user,
        segment=a.segment,
        os=getattr(a, "os", "") or "",
        nic_vendor=getattr(a, "nic_vendor", "") or "",
        policy_name=policy,
        domain=domain,
        gateway=gateway,
        recurrence=None,
    )


@app.get("/api/health")
def health():
    return {"ok": True, "ts": datetime.utcnow().isoformat()}


@app.get("/api/dashboard", response_model=DashboardResponse)
def dashboard(db: Session = Depends(get_db)):
    total = crud.dashboard_total(db)
    top_alerts = crud.dashboard_top_alerts(db, limit=12)
    top_reinc = crud.dashboard_top_reincidences(db, limit=10)
    severity = crud.dashboard_by_folder(db)
    latest_blocks = [_to_block_out(a) for a in crud.dashboard_latest_blocks(db, limit=12)]
    alerts_by_day = crud.dashboard_alerts_by_day(db, days=7)
    blocks_by_day = crud.dashboard_blocks_by_day(db, days=7)
    hosts_with_reincidence = crud.dashboard_hosts_with_reincidence(db, min_alerts=2)
    return DashboardResponse(
        total_alerts=total,
        top_alerts=top_alerts,
        top_reincidences=top_reinc,
        severity_breakdown=severity,
        latest_blocks=latest_blocks,
        alerts_by_day=alerts_by_day,
        blocks_by_day=blocks_by_day,
        hosts_with_reincidence=hosts_with_reincidence,
    )


@app.get("/api/dashboard/ops", response_model=OpsDashboardResponse)
def dashboard_ops(days: int = 7, pending_hours: int = 48, limit: int = 100, db: Session = Depends(get_db)):
    """
    Dashboard operativo para soporte NAC:
    - Lista priorizada de bloqueos sin confirmación (últimas `pending_hours` horas)
    - KPIs de cumplimiento y tiempo a confirmación en ventana `days`
    - Top segmentos con backlog
    - Calidad de datos
    """

    now = datetime.now()
    days = min(max(int(days), 1), 56)
    pending_hours = min(max(int(pending_hours), 1), 168)
    limit = min(max(int(limit), 1), 500)

    since_window = now - timedelta(days=days)
    since_pending = now - timedelta(hours=pending_hours)
    since_24h = now - timedelta(hours=24)
    since_48h = now - timedelta(hours=48)

    def identity(a: Alert) -> str:
        return (a.mac or a.ip or a.hostname or "").upper()

    # Traer confirmaciones (ventana days) y quedarnos con la última por identidad
    confirm_rows = (
        db.query(Alert)
        .filter(Alert.received_time >= since_window)
        .filter(Alert.folder == "CONFIRMACION DE CUMPLIMIENTO")
        .all()
    )
    confirmation_times: dict[str, datetime] = {}
    for a in confirm_rows:
        k = identity(a)
        if not k:
            continue
        prev = confirmation_times.get(k)
        if prev is None or a.received_time > prev:
            confirmation_times[k] = a.received_time

    # Bloqueos en ventana days (para KPIs) y en ventana pending (para bandeja)
    block_rows_window = (
        db.query(Alert)
        .filter(Alert.received_time >= since_window)
        .filter(Alert.folder == "EVENTO DE BLOQUEO")
        .order_by(Alert.received_time.desc())
        .all()
    )

    # KPIs: confirmados vs total en ventana
    total_blocks_window = len(block_rows_window)
    confirmed_blocks_window = 0
    time_to_confirm_minutes: list[int] = []

    for b in block_rows_window:
        k = identity(b)
        if not k:
            continue
        ct = confirmation_times.get(k)
        if ct and ct >= b.received_time:
            confirmed_blocks_window += 1
            dt = ct - b.received_time
            time_to_confirm_minutes.append(max(0, int(dt.total_seconds() // 60)))

    confirm_rate = (confirmed_blocks_window / total_blocks_window) if total_blocks_window else 0.0

    def percentile(sorted_vals: list[int], p: float) -> int | None:
        if not sorted_vals:
            return None
        p = min(max(p, 0.0), 1.0)
        idx = int(round((len(sorted_vals) - 1) * p))
        return sorted_vals[idx]

    time_to_confirm_minutes.sort()
    p50 = percentile(time_to_confirm_minutes, 0.50)
    p90 = percentile(time_to_confirm_minutes, 0.90)

    # Backlog: sin confirmación (dos cortes: 24h/48h y "pending window")
    backlog_pending = 0
    backlog_over_24h = 0
    backlog_over_48h = 0

    # Bandeja priorizada: agrupar por identidad dentro de pending_hours, sumar reincidencia y tomar el último evento
    pending_rows = [b for b in block_rows_window if b.received_time >= since_pending]

    grouped: dict[str, dict] = {}
    for b in pending_rows:
        k = identity(b)
        if not k:
            k = f"__EVENT_{b.id}"

        ct = confirmation_times.get(k)
        has_conf = bool(ct and ct >= b.received_time)

        # conteos de backlog (sin confirmación)
        if not has_conf:
            backlog_pending += 1
            if b.received_time < since_24h:
                backlog_over_24h += 1
            if b.received_time < since_48h:
                backlog_over_48h += 1

        g = grouped.get(k)
        if g is None:
            policy, _, gateway = _parse_extra_fields(getattr(b, "raw_body_preview", "") or "")
            grouped[k] = {
                "recurrence": 1,
                "received_time": b.received_time,
                "ip": b.ip,
                "mac": b.mac,
                "hostname": b.hostname,
                "segment": b.segment,
                "policy_name": policy,
                "gateway": gateway,
                "os": getattr(b, "os", "") or "",
                "nic_vendor": getattr(b, "nic_vendor", "") or "",
                "has_confirmation": has_conf,
            }
        else:
            g["recurrence"] += 1
            # Mantener el evento más reciente como "cabecera"
            if b.received_time > g["received_time"]:
                policy, _, gateway = _parse_extra_fields(getattr(b, "raw_body_preview", "") or "")
                g["received_time"] = b.received_time
                g["ip"] = b.ip or g["ip"]
                g["mac"] = b.mac or g["mac"]
                g["hostname"] = b.hostname or g["hostname"]
                g["segment"] = b.segment or g["segment"]
                g["policy_name"] = policy or g.get("policy_name")
                g["gateway"] = gateway or g.get("gateway")
                g["os"] = getattr(b, "os", "") or g.get("os", "")
                g["nic_vendor"] = getattr(b, "nic_vendor", "") or g.get("nic_vendor", "")

            # Si aún no hay OS/NIC Vendor, completar con algún evento
            if not g.get("os"):
                g["os"] = getattr(b, "os", "") or ""
            if not g.get("nic_vendor"):
                g["nic_vendor"] = getattr(b, "nic_vendor", "") or ""

            g["has_confirmation"] = g["has_confirmation"] or has_conf

    pending_items: list[OpsBlockItem] = []
    top_segments: dict[str, int] = {}

    for g in grouped.values():
        if g.get("has_confirmation"):
            continue
        seg = (g.get("segment") or "").strip() or "(Sin segmento)"
        top_segments[seg] = top_segments.get(seg, 0) + 1

        age_minutes = max(0, int((now - g["received_time"]).total_seconds() // 60))
        pending_items.append(
            OpsBlockItem(
                received_time=g["received_time"],
                age_minutes=age_minutes,
                recurrence=int(g.get("recurrence") or 1),
                ip=g.get("ip") or "",
                mac=g.get("mac") or "",
                hostname=g.get("hostname") or "",
                segment=g.get("segment") or "",
                policy_name=g.get("policy_name"),
                os=g.get("os") or "",
                nic_vendor=g.get("nic_vendor") or "",
                gateway=g.get("gateway"),
            )
        )

    # Prioridad: más antiguos primero, luego mayor reincidencia
    pending_items.sort(key=lambda x: (x.age_minutes, x.recurrence), reverse=True)
    pending_items = pending_items[:limit]

    top_segments_pending = [{"label": k, "count": v} for k, v in sorted(top_segments.items(), key=lambda kv: kv[1], reverse=True)[:10]]

    # Calidad de datos en ventana days (excluye confirmaciones para no sesgar)
    data_rows = (
        db.query(Alert)
        .filter(Alert.received_time >= since_window)
        .filter(Alert.folder != "CONFIRMACION DE CUMPLIMIENTO")
        .all()
    )
    total_rows = len(data_rows)

    def pct(pred) -> float:
        if not total_rows:
            return 0.0
        return sum(1 for r in data_rows if pred(r)) / total_rows

    dq = OpsDataQuality(
        window_days=days,
        total_rows=total_rows,
        pct_with_segment=pct(lambda r: bool((r.segment or "").strip())),
        pct_with_hostname=pct(lambda r: bool((r.hostname or "").strip())),
        pct_with_ip=pct(lambda r: bool((r.ip or "").strip())),
        pct_with_mac=pct(lambda r: bool((r.mac or "").strip())),
        pct_with_os=pct(lambda r: bool((getattr(r, "os", "") or "").strip())),
        pct_with_nic_vendor=pct(lambda r: bool((getattr(r, "nic_vendor", "") or "").strip())),
    )

    kpis = OpsKpis(
        window_days=days,
        pending_hours=pending_hours,
        total_blocks_window=total_blocks_window,
        confirmed_blocks_window=confirmed_blocks_window,
        confirm_rate_window=confirm_rate,
        backlog_pending=backlog_pending,
        backlog_over_24h=backlog_over_24h,
        backlog_over_48h=backlog_over_48h,
        p50_time_to_confirm_minutes=p50,
        p90_time_to_confirm_minutes=p90,
    )

    return OpsDashboardResponse(
        kpis=kpis,
        top_segments_pending=top_segments_pending,
        pending_blocks=pending_items,
        data_quality=dq,
    )


@app.get("/api/alerts/search", response_model=SearchResponse)
def search(
    ip: str | None = None,
    mac: str | None = None,
    hostname: str | None = None,
    user: str | None = None,
    days: int = 7,
    limit: int = 200,
    offset: int = 0,
    db: Session = Depends(get_db),
):
    total, items = crud.search_alerts(
        db,
        ip=ip,
        mac=mac,
        hostname=hostname,
        user=user,
        days=days,
        limit=min(max(limit, 1), 1000),
        offset=max(offset, 0),
    )

    # marcar si cada alerta ya tiene confirmación de cumplimiento asociada
    since = datetime.now() - timedelta(days=max(1, days))
    confirm_rows = (
        db.query(Alert)
        .filter(Alert.received_time >= since)
        .filter(Alert.folder == "CONFIRMACION DE CUMPLIMIENTO")
        .all()
    )

    def identity(a: Alert) -> str:
        return (a.mac or a.ip or a.hostname or "").upper()

    # última hora de confirmación por identidad
    confirmation_times: dict[str, datetime] = {}
    for a in confirm_rows:
        k = identity(a)
        if not k:
            continue
        prev = confirmation_times.get(k)
        if prev is None or a.received_time > prev:
            confirmation_times[k] = a.received_time

    out_items: list[AlertOut] = []
    for a in items:
        ao = _to_alert_out(a)
        ao.recurrence = None
        key = identity(a)
        ao.has_confirmation = key in confirmation_times
        ao.confirmation_time = confirmation_times.get(key)
        out_items.append(ao)

    return SearchResponse(total=total, items=out_items)


@app.get("/api/reincidences", response_model=ReincidenceResponse)
def reincidences(days: int = 2, db: Session = Depends(get_db)):
    """
    Hoja de reincidencias: agrupar como en Bloqueos.
    - Ventana: últimos `days` días (por defecto 2).
    - Agrupación: identidad por equipo (MAC -> IP -> Hostname) y se suma la cantidad total de alertas.
    - Se conserva el último evento (más reciente) como referencia.
    """

    since = datetime.now() - timedelta(days=max(1, days))
    q = (
        db.query(Alert)
        .filter(Alert.received_time >= since)
        # Excluir bloqueos (CCC Event Block) de esta hoja
        .filter(Alert.folder != "EVENTO DE BLOQUEO")
        # Excluir confirmaciones de cumplimiento (solo se usan como estado)
        .filter(Alert.folder != "CONFIRMACION DE CUMPLIMIENTO")
    )
    rows = q.all()

    def identity(a: Alert) -> str:
        return (a.mac or a.ip or a.hostname or "").upper()

    def is_placeholder_hostname(name: str | None) -> bool:
        if not name:
            return True
        n = name.strip().upper()
        return n in {"IRRESOLVABLE", "UNKNOWN", "DESCONOCIDO"}

    grouped: dict[str, dict] = {}
    for a in rows:
        key = identity(a)
        if not key:
            key = f"__EVENT_{a.id}"

        g = grouped.get(key)
        if g is None:
            grouped[key] = {
                "count": 1,
                "last_seen": a.received_time,
                "hostname": a.hostname,
                "ip": a.ip,
                "mac": a.mac,
                "user": a.user,
                "segment": a.segment,
                "alert": a.alert,
                "assigned_labels": getattr(a, "assigned_labels", "") or "",
            }
        else:
            g["count"] += 1
            if a.received_time > g["last_seen"]:
                g["last_seen"] = a.received_time
                g["ip"] = a.ip or g["ip"]
                g["mac"] = a.mac or g["mac"]
                g["segment"] = a.segment or g["segment"]
                g["user"] = a.user or g["user"]
                g["alert"] = a.alert or g["alert"]
                g["assigned_labels"] = getattr(a, "assigned_labels", "") or g.get("assigned_labels", "")
            else:
                # Si el último evento no tenía labels, completar con alguno anterior.
                if not g.get("assigned_labels"):
                    g["assigned_labels"] = getattr(a, "assigned_labels", "") or ""

            if is_placeholder_hostname(g["hostname"]) and not is_placeholder_hostname(a.hostname):
                g["hostname"] = a.hostname

    # Obtener confirmaciones de cumplimiento en la misma ventana
    confirm_rows = (
        db.query(Alert)
        .filter(Alert.received_time >= since)
        .filter(Alert.folder == "CONFIRMACION DE CUMPLIMIENTO")
        .all()
    )

    confirmation_times: dict[str, datetime] = {}
    for a in confirm_rows:
        k = identity(a)
        if not k:
            continue
        prev = confirmation_times.get(k)
        if prev is None or a.received_time > prev:
            confirmation_times[k] = a.received_time

    from app.schema import ReincidenceItem  # local import to avoid circular issues

    items = [
        ReincidenceItem(
            hostname=v["hostname"] or "",
            ip=v["ip"] or "",
            user=v["user"] or "User",
            mac=v["mac"] or "",
            segment=v["segment"] or "",
            alert=v["alert"] or "",
            alert_count=v["count"],
            assigned_labels=v.get("assigned_labels") or None,
            last_seen=v["last_seen"],
            has_confirmation=identity_key in confirmation_times,
            confirmation_time=confirmation_times.get(identity_key),
        )
        for identity_key, v in grouped.items()
    ]

    # Ordenar por hora de reporte (más reciente primero). Desempate por reincidencia.
    items.sort(key=lambda x: (x.last_seen, x.alert_count), reverse=True)
    return ReincidenceResponse(items=items)


@app.get("/api/blocks/today", response_model=list[BlockOut])
def blocks_today(db: Session = Depends(get_db)):
    today = datetime.now().date()
    start = datetime.combine(today, datetime.min.time())
    q = (
        db.query(Alert)
        .filter(Alert.folder == "EVENTO DE BLOQUEO")
        .filter(Alert.received_time >= start)
        .order_by(Alert.received_time.desc())
    )

    rows = q.all()

    # Agrupar por identidad (MAC si existe, si no IP, si no hostname)
    grouped: dict[str, dict] = {}

    def identity(a: Alert) -> str:
        return (a.mac or a.ip or a.hostname or "").upper()

    def is_placeholder_hostname(name: str | None) -> bool:
        if not name:
            return True
        n = name.strip().upper()
        return n in {"IRRESOLVABLE", "UNKNOWN", "DESCONOCIDO"}

    for a in rows:
        key = identity(a)
        if not key:
            # Si no hay ninguna identidad clara, cada evento cuenta aparte
            key = f"__EVENT_{a.id}"

        g = grouped.get(key)
        if g is None:
            policy, domain, gateway = _parse_extra_fields(getattr(a, "raw_body_preview", "") or "")
            grouped[key] = {
                "count": 1,
                "received_time": a.received_time,
                "folder": a.folder,
                "alert": a.alert,
                "hostname": a.hostname,
                "ip": a.ip,
                "mac": a.mac,
                "user": a.user,
                "segment": a.segment,
                "os": getattr(a, "os", "") or "",
                "nic_vendor": getattr(a, "nic_vendor", "") or "",
                "policy_name": policy,
                "domain": domain,
                "gateway": gateway,
            }
        else:
            g["count"] += 1
            # Mantener siempre la fecha/hora más reciente
            if a.received_time > g["received_time"]:
                g["received_time"] = a.received_time
                g["folder"] = a.folder
                g["alert"] = a.alert
                g["ip"] = a.ip or g["ip"]
                g["mac"] = a.mac or g["mac"]
                g["segment"] = a.segment or g["segment"]
                g["user"] = a.user or g["user"]
                g["os"] = getattr(a, "os", "") or g.get("os", "")
                g["nic_vendor"] = getattr(a, "nic_vendor", "") or g.get("nic_vendor", "")
                policy, domain, gateway = _parse_extra_fields(getattr(a, "raw_body_preview", "") or "")
                g["policy_name"] = policy or g.get("policy_name")
                g["domain"] = domain or g.get("domain")
                g["gateway"] = gateway or g.get("gateway")
            else:
                # Si el más reciente no trae OS/NIC Vendor pero uno anterior sí, completar.
                if not g.get("os"):
                    g["os"] = getattr(a, "os", "") or ""
                if not g.get("nic_vendor"):
                    g["nic_vendor"] = getattr(a, "nic_vendor", "") or ""

            # Si el hostname anterior era "IRRESOLVABLE"/placeholder y este trae un nombre real, actualizarlo
            if is_placeholder_hostname(g["hostname"]) and not is_placeholder_hostname(a.hostname):
                g["hostname"] = a.hostname

    out: list[BlockOut] = []
    for g in grouped.values():
        out.append(
            BlockOut(
                id=0,  # no importa para esta vista agregada
                received_time=g["received_time"],
                folder=g["folder"],
                alert=g["alert"],
                hostname=g["hostname"] or "",
                ip=g["ip"] or "",
                mac=g["mac"] or "",
                user=g["user"] or "User",
                segment=g["segment"] or "",
                os=g.get("os") or "",
                nic_vendor=g.get("nic_vendor") or "",
                policy_name=g.get("policy_name"),
                domain=g.get("domain"),
                gateway=g.get("gateway"),
                recurrence=g["count"],
            )
        )

    # Ordenar de nuevo por fecha de evento más reciente (desc)
    out.sort(key=lambda x: x.received_time, reverse=True)
    return out


def _run_import_job(job_id: str, since_days: int):
    update_job(job_id, status="running")
    inserted = 0
    updated = 0
    processed = 0
    try:
        try:
            import pythoncom  # type: ignore

            pythoncom.CoInitialize()
        except Exception:
            pythoncom = None  # type: ignore[assignment]

        from app.db import SessionLocal

        db = SessionLocal()
        try:
            folders = [f.strip() for f in settings.outlook_folders.split(",") if f.strip()]
            since = datetime.now() - timedelta(days=max(1, since_days))
            for a in iter_outlook_alerts(outlook_account=settings.outlook_account, folders=folders, since=since):
                processed += 1
                ins, upd = crud.upsert_alert(
                    db,
                    entry_id=a.entry_id,
                    folder=a.folder,
                        alert=a.alert,
                        severity_code=a.severity_code,
                    received_time=a.received_time,
                    hostname=a.hostname,
                    ip=a.ip,
                    mac=a.mac,
                    user=a.user,
                    segment=a.segment,
                    os=a.os,
                    nic_vendor=a.nic_vendor,
                    raw_subject=a.raw_subject,
                    raw_body_preview=a.raw_body_preview,
                )
                if ins:
                    inserted += 1
                elif upd:
                    updated += 1
            db.commit()
            print(f"[NAC] Import job {job_id}: processed={processed}, inserted={inserted}, updated={updated}")
        finally:
            db.close()

        update_job(
            job_id,
            status="done",
            finished_at=datetime.utcnow(),
            inserted=inserted,
            updated=updated,
        )
    except Exception as e:
        import traceback

        print(f"[NAC] Import job {job_id} failed: {e}")
        traceback.print_exc()
        update_job(job_id, status="error", finished_at=datetime.utcnow(), error=str(e))
    finally:
        try:
            import pythoncom  # type: ignore

            pythoncom.CoUninitialize()
        except Exception:
            pass


@app.post("/api/update/run", response_model=UpdateRunResponse)
def update_run(since_days: int = 7):
    st = new_job()
    t = Thread(target=_run_import_job, args=(st.job_id, since_days), daemon=True)
    t.start()
    return UpdateRunResponse(job_id=st.job_id, started_at=st.started_at)


@app.get("/api/update/status/{job_id}", response_model=UpdateStatusResponse)
def update_status(job_id: str):
    st = get_job(job_id)
    if not st:
        raise HTTPException(status_code=404, detail="job not found")
    return UpdateStatusResponse(
        job_id=st.job_id,
        status=st.status,
        started_at=st.started_at,
        finished_at=st.finished_at,
        inserted=st.inserted,
        updated=st.updated,
        error=st.error,
    )

