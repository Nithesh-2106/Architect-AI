"""SSE event publisher. Each session gets an asyncio.Queue."""
import asyncio
import time
import uuid
from typing import Any

# Global per-session event queues
_session_queues: dict[str, asyncio.Queue] = {}


def create_session_queue(session_id: str) -> asyncio.Queue:
    q = asyncio.Queue(maxsize=5000)
    _session_queues[session_id] = q
    return q


def get_session_queue(session_id: str) -> asyncio.Queue | None:
    return _session_queues.get(session_id)


def remove_session_queue(session_id: str):
    _session_queues.pop(session_id, None)


class SSEPublisher:
    def __init__(self, session_id: str, db_writer=None):
        self.session_id = session_id
        self.db_writer = db_writer  # optional callable to persist to DB
        self._seq = 0

    async def emit(self, event_type: str, payload: Any):
        self._seq += 1
        event = {
            "id": f"{int(time.time() * 1000)}-{uuid.uuid4().hex[:6]}",
            "type": event_type,
            "payload": payload,
            "session_id": self.session_id,
            "seq": self._seq,
            "ts": time.time(),
        }
        q = _session_queues.get(self.session_id)
        if q:
            try:
                q.put_nowait(event)
            except asyncio.QueueFull:
                pass  # drop event if queue is full

        if self.db_writer:
            try:
                await self.db_writer(event)
            except Exception:
                pass
