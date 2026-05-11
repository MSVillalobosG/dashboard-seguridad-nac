from __future__ import annotations

from datetime import date, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.dialects.sqlite import insert
from sqlalchemy.orm import Session

from app.models import Alert


def upsert_alert(
    db: Session,
    *,
    entry_id: str,
    folder: str,
    alert: str,
    severity_code: str,
    received_time: datetime,
    hostname: str,
    ip: str,
    mac: str,
    user: str,
    segment: str,
    os: str,
    nic_vendor: str,
    assigned_labels: str,
    raw_subject: str,
    raw_body_preview: str,
) -> tuple[bool, bool]:
    """
    Returns (inserted, updated).
    """
    stmt = insert(Alert).values(
        entry_id=entry_id,
        folder=folder,
        alert=alert,
        severity_code=severity_code,
        received_time=received_time,
        hostname=hostname,
        ip=ip,
        mac=mac,
        user=user,
        segment=segment,
        os=os,
        nic_vendor=nic_vendor,
        assigned_labels=assigned_labels,
        raw_subject=raw_subject,
        raw_body_preview=raw_body_preview,
    )

    do_update = stmt.on_conflict_do_update(
        index_elements=[Alert.entry_id],
        set_={
            "folder": folder,
            "alert": alert,
            "severity_code": severity_code,
            "received_time": received_time,
            "hostname": hostname,
            "ip": ip,
            "mac": mac,
            "user": user,
            "segment": segment,
            "os": os,
            "nic_vendor": nic_vendor,
            "assigned_labels": assigned_labels,
            "raw_subject": raw_subject,
            "raw_body_preview": raw_body_preview,
        },
    )
    res = db.execute(do_update)
    # SQLite doesn't tell insert vs update reliably via rowcount in upsert; do a cheap check.
    # We treat everything as updated unless it didn't exist before.
    existed = db.scalar(select(func.count()).select_from(Alert).where(Alert.entry_id == entry_id)) > 0
    if res.rowcount and not existed:
        return True, False
    return False, True if res.rowcount else (False, False)


def dashboard_total(db: Session) -> int:
    return int(db.scalar(select(func.count()).select_from(Alert)) or 0)


def dashboard_top_alerts(db: Session, limit: int = 10):
    rows = db.execute(
        select(Alert.alert, func.count().label("c")).group_by(Alert.alert).order_by(func.count().desc()).limit(limit)
    ).all()
    return [{"label": r[0], "count": int(r[1])} for r in rows]


def dashboard_top_reincidences(db: Session, limit: int = 10):
    rows = db.execute(
        select(Alert.hostname, func.count().label("c"))
        .where(Alert.hostname != "")
        .group_by(Alert.hostname)
        .order_by(func.count().desc())
        .limit(limit)
    ).all()
    return [{"label": r[0], "count": int(r[1])} for r in rows]


def dashboard_by_folder(db: Session):
    """
    Conteo por carpeta/severidad (MODERADA, BAJA, ALTA, CRITICA, EVENTO DE BLOQUEO).
    """
    rows = db.execute(
        select(Alert.folder, func.count().label("c")).group_by(Alert.folder).order_by(func.count().desc())
    ).all()
    return [{"label": r[0], "count": int(r[1])} for r in rows]


def dashboard_latest_blocks(db: Session, limit: int = 10):
    rows = db.execute(
        select(Alert)
        .where(Alert.folder == "EVENTO DE BLOQUEO")
        .order_by(Alert.received_time.desc())
        .limit(limit)
    ).scalars()
    return list(rows)


def _series_by_calendar_day(db: Session, *, since_day: date, num_days: int, folder: str | None = None):
    """
    Conteos agrupados por día local (SQLite strftime). Rellena días sin registros con 0.
    """
    since_dt = datetime.combine(since_day, datetime.min.time())
    q = (
        select(
            func.strftime("%Y-%m-%d", Alert.received_time).label("d"),
            func.count().label("c"),
        )
        .where(Alert.received_time >= since_dt)
        .group_by("d")
        .order_by("d")
    )
    if folder is not None:
        q = q.where(Alert.folder == folder)
    rows = db.execute(q).all()
    m = {str(r[0]): int(r[1]) for r in rows if r[0]}
    out: list[dict] = []
    for i in range(max(1, num_days)):
        d = since_day + timedelta(days=i)
        ds = d.isoformat()
        out.append({"label": ds, "count": m.get(ds, 0)})
    return out


def dashboard_alerts_by_day(db: Session, days: int = 7):
    days = max(1, min(int(days), 90))
    today = datetime.now().date()
    start = today - timedelta(days=days - 1)
    return _series_by_calendar_day(db, since_day=start, num_days=days, folder=None)


def dashboard_blocks_by_day(db: Session, days: int = 7):
    days = max(1, min(int(days), 90))
    today = datetime.now().date()
    start = today - timedelta(days=days - 1)
    return _series_by_calendar_day(db, since_day=start, num_days=days, folder="EVENTO DE BLOQUEO")


def dashboard_hosts_with_reincidence(db: Session, min_alerts: int = 2) -> int:
    """
    Cantidad de hostnames distintos (no vacíos) con al menos `min_alerts` filas en alerts.
    """
    min_alerts = max(2, int(min_alerts))
    subq = (
        select(Alert.hostname)
        .where(Alert.hostname != "")
        .group_by(Alert.hostname)
        .having(func.count() >= min_alerts)
        .subquery()
    )
    return int(db.scalar(select(func.count()).select_from(subq)) or 0)


def search_alerts(
    db: Session,
    *,
    ip: str | None = None,
    mac: str | None = None,
    hostname: str | None = None,
    user: str | None = None,
    days: int = 7,
    limit: int = 200,
    offset: int = 0,
):
    from sqlalchemy import or_

    since = datetime.now() - timedelta(days=max(1, days))

    q = select(Alert).where(Alert.received_time >= since)
    # Búsqueda flexible (LIKE, case-insensitive donde aplica)
    if ip:
        pattern = f"%{ip.strip()}%"
        q = q.where(Alert.ip.like(pattern))
    if mac:
        pattern = f"%{mac.strip().upper()}%"
        q = q.where(Alert.mac.like(pattern))
    if hostname:
        pattern = f"%{hostname.strip().upper()}%"
        q = q.where(Alert.hostname.like(pattern))
    if user:
        pattern = f"%{user.strip()}%"
        q = q.where(Alert.user.ilike(pattern))

    total = int(db.scalar(select(func.count()).select_from(q.subquery())) or 0)
    items = db.execute(q.order_by(Alert.received_time.desc()).limit(limit).offset(offset)).scalars().all()
    return total, items


def ranking_reincidences(db: Session, limit: int = 50):
    """
    Ranking detallado por equipo + alerta, similar a la hoja de Excel:
    Hostname, IP, Usuario, MAC, Ubicación, Alerta, Reincidencia, Hora de reporte.
    """
    rows = db.execute(
        select(
            Alert.hostname,
            Alert.ip,
            Alert.user,
            Alert.mac,
            Alert.segment,
            Alert.alert,
            func.count().label("c"),
            func.max(Alert.received_time).label("last_seen"),
        )
        .where(Alert.hostname != "")
        .group_by(Alert.hostname, Alert.ip, Alert.user, Alert.mac, Alert.segment, Alert.alert)
        .order_by(func.count().desc())
        .limit(limit)
    ).all()
    return [
        {
            "hostname": r[0],
            "ip": r[1] or "",
            "user": r[2] or "",
            "mac": r[3] or "",
            "segment": r[4] or "",
            "alert": r[5] or "",
            "alert_count": int(r[6]),
            "last_seen": r[7],
        }
        for r in rows
    ]

