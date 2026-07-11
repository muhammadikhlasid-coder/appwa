"""
Celery App — Safe WA Gateway
==============================
Konfigurasi Celery untuk upgrade ke Redis/RabbitMQ.
Aktifkan jika USE_REDIS = True di queue/manager.py.

Setup:
  1. Install Redis: https://github.com/tporadowski/redis/releases (Windows)
     atau: choco install redis / docker run -p 6379:6379 redis
  2. pip install celery[redis]
  3. Set REDIS_URL di .env
  4. Jalankan worker: celery -A queue.celery_app worker --pool=solo -l info
"""

import os
from celery import Celery

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

celery_app = Celery(
    "safe_wa_gateway",
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=["wa_queue.tasks"],
)

celery_app.conf.update(
    # Serialization
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Jakarta",
    enable_utc=True,

    # Rate limiting global
    task_annotations={
        "queue.tasks.send_message_task": {"rate_limit": "3/m"},
    },

    # Retry policy default
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    task_max_retries=3,

    # Worker config (Windows: pakai --pool=solo)
    worker_prefetch_multiplier=1,
    worker_concurrency=4,

    # Result expiry
    result_expires=3600,  # 1 jam

    # Beat schedule (opsional — untuk warm-up scheduler)
    beat_schedule={
        "warmup-chatter-every-hour": {
            "task": "queue.tasks.warmup_chat_task",
            "schedule": 3600.0,  # setiap jam
        },
    },
)
