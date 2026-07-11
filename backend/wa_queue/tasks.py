"""
Celery Tasks — Safe WA Gateway
=================================
Diaktifkan otomatis saat USE_REDIS = True.
"""

import time
import random
import logging
from .celery_app import celery_app

logger = logging.getLogger("safe_wa.tasks")


def inject_zwc(text: str) -> str:
    zwc_pool = ["\u200B", "\u200C", "\u200D", "\uFEFF", "\u200E", "\u200F"]
    words = text.split()
    result = []
    for word in words:
        result.append(word)
        if random.random() > 0.15:
            result.append("".join(random.choices(zwc_pool, k=random.randint(1, 3))))
    return " ".join(result).strip()


def auto_chunk(text: str) -> list[str]:
    return [text]


@celery_app.task(
    bind=True,
    name="wa_queue.tasks.send_message_task",
    max_retries=3,
    default_retry_delay=10,
    rate_limit="3/m",
)
def send_message_task(self, phone: str, message: str, evo_url: str, evo_instance: str, evo_apikey: str):
    """
    Celery Task: Anti-Ban pipeline via Redis queue.
    Rate limited to 3/min via Celery rate_limit annotation.
    """
    import httpx

    chunks = auto_chunk(message)

    for i, chunk in enumerate(chunks):
        try:
            # ZWC Injection
            obfuscated = inject_zwc(chunk)

            # Typing delay
            typing_delay = max(2.5, len(chunk) / random.uniform(5.0, 10.0) + random.uniform(0.5, 2.5))
            typing_delay = min(typing_delay, 45.0)
            time.sleep(typing_delay)

            # Send to Evolution
            payload = {
                "number": phone,
                "text": obfuscated,
                "delay": int(typing_delay * 1000),
                "linkPreview": False,
            }

            response = httpx.post(
                f"{evo_url}/message/sendText/{evo_instance}",
                json=payload,
                headers={"apikey": evo_apikey},
                timeout=60.0,
            )
            response.raise_for_status()
            logger.info(f"✅ Chunk {i+1}/{len(chunks)} → {phone}")

            # Gap antar chunk (natural typing pause)
            if i < len(chunks) - 1:
                time.sleep(random.uniform(3, 7))

        except Exception as exc:
            logger.error(f"❌ Chunk {i+1} error: {exc}")
            raise self.retry(exc=exc, countdown=5 * (self.request.retries + 1))

    return {"status": "sent", "phone": phone, "chunks": len(chunks)}


@celery_app.task(name="wa_queue.tasks.warmup_chat_task")
def warmup_chat_task():
    """
    Celery Beat Task: Kirim pesan warm-up otomatis via AI.
    Dijalankan setiap jam oleh Celery Beat scheduler.
    """
    # TODO: Integrasikan Gemini API untuk generate percakapan
    logger.info("🔥 Warm-up chatter task triggered (TODO: Gemini integration)")
    return {"status": "ok"}
