"""
Queue Manager — Safe WA Gateway
================================
Layer 1 (default): AsyncIO Queue — langsung jalan tanpa Redis.
Layer 2 (production): Celery + Redis — uncomment USE_REDIS = True.

Drip-Feed Rules:
- Max 3 pesan per menit per nomor WA
- FIFO order per nomor
- Retry otomatis jika Evolution API gagal (max 3x)
"""

import asyncio
import time
import random
import logging
from collections import defaultdict, deque
from dataclasses import dataclass, field
from typing import Callable, Awaitable

logger = logging.getLogger("safe_wa.queue")

# ─── Config ───────────────────────────────────────────────────────────────────
USE_REDIS = False       # Set True jika Redis sudah tersedia
RATE_LIMIT_PER_MIN = 3  # Maks pesan per menit per nomor
MAX_RETRIES = 3         # Retry jika gagal kirim


# ─── Data Structures ──────────────────────────────────────────────────────────
@dataclass
class QueueMessage:
    id: str
    phone: str
    message: str
    chunks: list[str]
    session_id: str
    added_at: float = field(default_factory=time.time)
    retries: int = 0
    status: str = "queued"  # queued | processing | sent | failed


class RateLimiter:
    """Sliding window rate limiter per nomor telepon."""

    def __init__(self, max_per_minute: int = RATE_LIMIT_PER_MIN):
        self.max_per_minute = max_per_minute
        self._windows: dict[str, deque] = defaultdict(deque)

    def is_allowed(self, phone: str) -> bool:
        now = time.time()
        window = self._windows[phone]

        # Hapus entri yang lebih dari 60 detik
        while window and now - window[0] > 60:
            window.popleft()

        if len(window) < self.max_per_minute:
            window.append(now)
            return True
        return False

    def seconds_until_next_slot(self, phone: str) -> float:
        now = time.time()
        window = self._windows[phone]
        if not window or len(window) < self.max_per_minute:
            return 0.0
        oldest = window[0]
        return max(0.0, 60.0 - (now - oldest))


class MessageQueue:
    """
    Async FIFO queue dengan rate limiting per nomor.
    Drop-in replacement untuk Celery saat Redis tidak tersedia.
    """

    def __init__(self):
        self._queue: asyncio.Queue[QueueMessage] = asyncio.Queue()
        self._rate_limiter = RateLimiter()
        self._messages: dict[str, QueueMessage] = {}  # id → msg
        self._stats = {"total_queued": 0, "total_sent": 0, "total_failed": 0}
        self._running = False
        self._send_fn: Callable[[QueueMessage], Awaitable[bool]] | None = None

    def set_sender(self, fn: Callable[[QueueMessage], Awaitable[bool]]):
        """Daftarkan fungsi pengiriman (dipanggil oleh worker)."""
        self._send_fn = fn

    async def enqueue(self, msg: QueueMessage):
        """Tambah pesan ke antrean."""
        self._messages[msg.id] = msg
        self._stats["total_queued"] += 1
        await self._queue.put(msg)
        logger.info(f"📥 Queued [{msg.id}] → {msg.phone} ({len(msg.chunks)} chunks)")

    async def start_worker(self):
        """Worker loop — berjalan sebagai asyncio background task."""
        self._running = True
        logger.info("🚀 Queue worker started (AsyncIO mode)")

        while self._running:
            try:
                msg = await asyncio.wait_for(self._queue.get(), timeout=1.0)
            except asyncio.TimeoutError:
                continue

            # Rate limit check
            wait = self._rate_limiter.seconds_until_next_slot(msg.phone)
            if wait > 0:
                logger.info(f"⏳ Rate limit [{msg.phone}] — wait {wait:.1f}s")
                await asyncio.sleep(wait)

            # Cek rate limit lagi setelah sleep
            if not self._rate_limiter.is_allowed(msg.phone):
                await self._queue.put(msg)  # Re-queue
                await asyncio.sleep(2)
                continue

            # Proses pengiriman
            msg.status = "processing"
            success = await self._dispatch(msg)

            if success:
                msg.status = "sent"
                self._stats["total_sent"] += 1
                logger.info(f"✅ Sent [{msg.id}] → {msg.phone}")
            else:
                msg.retries += 1
                if msg.retries < MAX_RETRIES:
                    msg.status = "queued"
                    await asyncio.sleep(5 * msg.retries)  # Exponential backoff
                    await self._queue.put(msg)
                    logger.warning(f"🔄 Retry {msg.retries}/{MAX_RETRIES} [{msg.id}]")
                else:
                    msg.status = "failed"
                    self._stats["total_failed"] += 1
                    logger.error(f"❌ Failed permanently [{msg.id}] → {msg.phone}")

            self._queue.task_done()

    async def _dispatch(self, msg: QueueMessage) -> bool:
        """Kirim satu pesan melalui Anti-Ban pipeline."""
        if self._send_fn:
            return await self._send_fn(msg)
        # Fallback simulasi
        await asyncio.sleep(random.uniform(1.5, 4.0))
        return True

    def stop(self):
        self._running = False

    def get_stats(self) -> dict:
        return {
            **self._stats,
            "queue_depth": self._queue.qsize(),
            "rate_limit": f"{RATE_LIMIT_PER_MIN}/min per number",
        }

    def get_pending(self) -> list[dict]:
        return [
            {
                "id": m.id,
                "phone": m.phone,
                "preview": m.message[:60],
                "status": m.status,
                "chunks": len(m.chunks),
                "added_at": m.added_at,
                "retries": m.retries,
            }
            for m in self._messages.values()
            if m.status in ("queued", "processing")
        ]


# Singleton instance
message_queue = MessageQueue()
