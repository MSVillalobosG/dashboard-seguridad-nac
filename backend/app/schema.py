from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class AlertOut(BaseModel):
    id: int
    received_time: datetime
    folder: str
    alert: str
    hostname: str
    ip: str
    mac: str
    user: str
    segment: str
    os: str | None = None
    nic_vendor: str | None = None
    policy_name: str | None = None
    domain: str | None = None
    gateway: str | None = None
    recurrence: int | None = None
    has_confirmation: bool | None = None
    confirmation_time: datetime | None = None


class BlockOut(BaseModel):
    id: int
    received_time: datetime
    folder: str
    alert: str
    hostname: str
    ip: str
    mac: str
    user: str
    segment: str
    os: str
    nic_vendor: str
    policy_name: str | None = None
    domain: str | None = None
    gateway: str | None = None
    recurrence: int | None = None


class DashboardTopItem(BaseModel):
    label: str
    count: int


class DashboardResponse(BaseModel):
    total_alerts: int
    top_alerts: list[DashboardTopItem]
    top_reincidences: list[DashboardTopItem]  # hostname -> count
    severity_breakdown: list[DashboardTopItem]  # folder -> count
    latest_blocks: list[BlockOut]
    # Series reales por día calendario (últimos N días, conteos en SQLite)
    alerts_by_day: list[DashboardTopItem]  # label=YYYY-MM-DD
    blocks_by_day: list[DashboardTopItem]  # solo carpeta EVENTO DE BLOQUEO
    hosts_with_reincidence: int  # hostnames distintos con ≥2 alertas


class SearchResponse(BaseModel):
    total: int
    items: list[AlertOut]


class ReincidenceItem(BaseModel):
    hostname: str
    ip: str
    user: str
    mac: str
    segment: str
    alert: str
    alert_count: int
    assigned_labels: str | None = None
    last_seen: datetime
    has_confirmation: bool = False
    confirmation_time: datetime | None = None


class ReincidenceResponse(BaseModel):
    items: list[ReincidenceItem]


class UpdateRunResponse(BaseModel):
    job_id: str
    started_at: datetime


class UpdateStatusResponse(BaseModel):
    job_id: str
    status: str = Field(description="queued|running|done|error")
    started_at: datetime
    finished_at: Optional[datetime] = None
    inserted: int = 0
    updated: int = 0
    error: Optional[str] = None


class OpsKpis(BaseModel):
    window_days: int
    pending_hours: int

    total_blocks_window: int
    confirmed_blocks_window: int
    confirm_rate_window: float = Field(description="0..1")

    backlog_pending: int = Field(description="bloqueos sin confirmación dentro de pending_hours")
    backlog_over_24h: int
    backlog_over_48h: int

    p50_time_to_confirm_minutes: int | None = None
    p90_time_to_confirm_minutes: int | None = None


class OpsDataQuality(BaseModel):
    window_days: int
    total_rows: int
    pct_with_segment: float = Field(description="0..1")
    pct_with_hostname: float = Field(description="0..1")
    pct_with_ip: float = Field(description="0..1")
    pct_with_mac: float = Field(description="0..1")
    pct_with_os: float = Field(description="0..1")
    pct_with_nic_vendor: float = Field(description="0..1")


class OpsBlockItem(BaseModel):
    received_time: datetime
    age_minutes: int
    recurrence: int

    ip: str
    mac: str
    hostname: str
    segment: str
    policy_name: str | None = None
    os: str
    nic_vendor: str
    gateway: str | None = None


class OpsDashboardResponse(BaseModel):
    kpis: OpsKpis
    top_segments_pending: list[DashboardTopItem]
    pending_blocks: list[OpsBlockItem]
    data_quality: OpsDataQuality

