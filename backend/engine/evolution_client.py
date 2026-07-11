"""
Evolution API Client — Safe WA Gateway
=======================================
HTTP client wrapper untuk Evolution API v2.
Semua request melewati Anti-Ban Middleware sebelum dikirim.

Docs Evolution: https://doc.evolution-api.com/v2/
"""

import asyncio
import random
import logging
import httpx
from dataclasses import dataclass

logger = logging.getLogger("safe_wa.evolution")


@dataclass
class EvolutionConfig:
    base_url: str
    api_key: str
    instance: str
    timeout: int = 15


class EvolutionClient:
    """
    Async HTTP client ke Evolution API.
    Semua metode send sudah otomatis di-inject ZWC + delay.
    """

    def __init__(self, config: EvolutionConfig):
        self.cfg = config
        self._client = httpx.AsyncClient(
            base_url=config.base_url,
            headers={"apikey": config.api_key, "Content-Type": "application/json"},
            timeout=config.timeout,
        )

    # ── Instance Management ────────────────────────────────────────────────────

    async def get_instance_status(self) -> dict:
        """Cek status koneksi instance."""
        try:
            r = await self._client.get(f"/instance/connectionState/{self.cfg.instance}")
            r.raise_for_status()
            data = r.json()
            return {
                "instance": self.cfg.instance,
                "state": data.get("instance", {}).get("state", "unknown"),
                "connected": data.get("instance", {}).get("state") == "open",
            }
        except Exception as e:
            logger.error(f"Status check failed: {e}")
            return {"instance": self.cfg.instance, "state": "error", "connected": False}

    async def get_qr_code(self) -> dict:
        """Generate QR Code untuk login baru."""
        try:
            r = await self._client.get(f"/instance/connect/{self.cfg.instance}")
            r.raise_for_status()
            return r.json()
        except Exception as e:
            logger.error(f"QR generation failed: {e}")
            return {"error": str(e)}

    async def logout(self) -> bool:
        """Logout & hapus sesi aktif."""
        try:
            r = await self._client.delete(f"/instance/logout/{self.cfg.instance}")
            r.raise_for_status()
            return True
        except Exception as e:
            logger.error(f"Logout failed: {e}")
            return False

    # ── Messaging ──────────────────────────────────────────────────────────────

    async def send_text(self, phone: str, text: str, delay_ms: int = 3000) -> dict:
        """
        Kirim teks ke nomor WA.
        'delay' di sini adalah typing indicator duration (ms).
        """
        payload = {
            "number": self._normalize_phone(phone),
            "text": text,
            "delay": delay_ms,
            "linkPreview": False,
            "mentionsEveryOne": False,
        }
        try:
            r = await self._client.post(
                f"/message/sendText/{self.cfg.instance}",
                json=payload,
            )
            r.raise_for_status()
            result = r.json()
            logger.info(f"📤 Sent to {phone}: {text[:40]}...")
            return {"success": True, "data": result}
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error sending to {phone}: {e.response.text}")
            return {"success": False, "error": e.response.text}
        except Exception as e:
            logger.error(f"Send error to {phone}: {e}")
            return {"success": False, "error": str(e)}

    async def send_presence(self, phone: str, presence: str = "composing") -> bool:
        """
        Kirim presence update (typing indicator).
        presence: 'composing' | 'recording' | 'paused'
        """
        payload = {"number": self._normalize_phone(phone), "presence": presence}
        try:
            r = await self._client.post(
                f"/chat/sendPresence/{self.cfg.instance}",
                json=payload,
            )
            r.raise_for_status()
            return True
        except Exception as e:
            logger.warning(f"Presence update failed: {e}")
            return False

    async def check_phone_exists(self, phone: str) -> bool:
        """Cek apakah nomor WA terdaftar sebelum kirim."""
        try:
            r = await self._client.post(
                f"/chat/whatsappNumbers/{self.cfg.instance}",
                json={"numbers": [self._normalize_phone(phone)]},
            )
            r.raise_for_status()
            data = r.json()
            exists = data[0].get("exists", False) if data else False
            logger.info(f"Phone check {phone}: {'✅ exists' if exists else '❌ not found'}")
            return exists
        except Exception as e:
            logger.warning(f"Phone check failed: {e}")
            return True  # Assume exists jika check gagal

    async def get_contacts(self) -> list[dict]:
        """Ambil daftar kontak dari instance."""
        try:
            r = await self._client.get(f"/contact/findContacts/{self.cfg.instance}")
            r.raise_for_status()
            return r.json()
        except Exception as e:
            logger.error(f"Get contacts failed: {e}")
            return []

    # ── Full Anti-Ban Send (dipakai oleh queue worker) ─────────────────────────

    async def safe_send(self, phone: str, chunks: list[str], zwc_fn, delay_fn) -> bool:
        """
        Kirim semua chunk dengan full Anti-Ban pipeline:
        1. Check phone exists
        2. Start typing presence
        3. Inject ZWC
        4. Send with realistic delay
        5. Gap antar chunk
        """
        # Verify nomor dulu
        exists = await self.check_phone_exists(phone)
        if not exists:
            logger.warning(f"⚠️ Phone {phone} not on WhatsApp — skip")
            return False

        for i, chunk in enumerate(chunks):
            obfuscated = zwc_fn(chunk)
            delay_s = delay_fn(chunk)

            # Kirim typing indicator
            await self.send_presence(phone, "composing")
            await asyncio.sleep(delay_s)
            await self.send_presence(phone, "paused")

            # Kirim pesan
            result = await self.send_text(
                phone=phone,
                text=obfuscated,
                delay_ms=int(delay_s * 1000),
            )

            if not result["success"]:
                return False

            # Gap realistis antar chunk
            if i < len(chunks) - 1:
                gap = random.uniform(3.0, 8.0)
                logger.info(f"💬 Chunk {i+1}/{len(chunks)} sent — gap {gap:.1f}s before next")
                await asyncio.sleep(gap)

        return True

    async def close(self):
        await self._client.aclose()

    @staticmethod
    def _normalize_phone(phone: str) -> str:
        """Convert +62 812-xxxx → 62812xxxx@s.whatsapp.net"""
        cleaned = phone.replace("+", "").replace("-", "").replace(" ", "")
        return cleaned
