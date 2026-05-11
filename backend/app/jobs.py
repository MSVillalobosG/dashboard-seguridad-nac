from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from threading import Lock
from uuid import uuid4


@dataclass
class JobState:
    job_id: str
    status: str  # queued|running|done|error
    started_at: datetime
    finished_at: datetime | None = None
    inserted: int = 0
    updated: int = 0
    error: str | None = None


_lock = Lock()
_jobs: dict[str, JobState] = {}


def new_job() -> JobState:
    with _lock:
        jid = str(uuid4())
        st = JobState(job_id=jid, status="queued", started_at=datetime.utcnow())
        _jobs[jid] = st
        return st


def get_job(job_id: str) -> JobState | None:
    with _lock:
        return _jobs.get(job_id)


def update_job(job_id: str, **kwargs) -> None:
    with _lock:
        st = _jobs.get(job_id)
        if not st:
            return
        for k, v in kwargs.items():
            setattr(st, k, v)

