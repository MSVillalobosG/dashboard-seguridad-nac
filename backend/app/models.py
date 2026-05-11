from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Index, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class Alert(Base):
    __tablename__ = "alerts"
    __table_args__ = (
        UniqueConstraint("entry_id", name="uq_alerts_entry_id"),
        Index("ix_alerts_received_time", "received_time"),
        Index("ix_alerts_ip", "ip"),
        Index("ix_alerts_mac", "mac"),
        Index("ix_alerts_hostname", "hostname"),
        Index("ix_alerts_user", "user"),
        Index("ix_alerts_folder", "folder"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    entry_id: Mapped[str] = mapped_column(String(512), nullable=False)

    folder: Mapped[str] = mapped_column(String(64), nullable=False)  # MODERADA/BAJA/...
    alert: Mapped[str] = mapped_column(Text, nullable=False)  # Subject completo
    severity_code: Mapped[str] = mapped_column(String(8), nullable=False, default="")  # ALT/MOD/BAJ/CRI...

    received_time: Mapped[datetime] = mapped_column(DateTime, nullable=False)

    hostname: Mapped[str] = mapped_column(String(128), nullable=False, default="")
    ip: Mapped[str] = mapped_column(String(64), nullable=False, default="")
    mac: Mapped[str] = mapped_column(String(32), nullable=False, default="")
    user: Mapped[str] = mapped_column(String(128), nullable=False, default="")
    segment: Mapped[str] = mapped_column(String(256), nullable=False, default="")
    os: Mapped[str] = mapped_column(String(128), nullable=False, default="")
    nic_vendor: Mapped[str] = mapped_column(String(128), nullable=False, default="")
    assigned_labels: Mapped[str] = mapped_column(Text, nullable=False, default="")

    raw_subject: Mapped[str] = mapped_column(Text, nullable=False, default="")
    raw_body_preview: Mapped[str] = mapped_column(Text, nullable=False, default="")

