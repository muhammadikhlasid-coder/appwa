"""
Warm-Up Bot — Safe WA Gateway
===============================
AI-powered bot-to-bot chatter untuk menaikkan Trust Score
nomor WA baru selama 7 hari pertama.

Engine: Google Gemini API (gemini-2.0-flash — gratis tier)
Strategi:
  - Hari 1–2: 3–5 pesan/hari, topik ringan
  - Hari 3–4: 6–8 pesan/hari, variasi topik
  - Hari 5–7: 10–15 pesan/hari, panjang + emoji

Cara pakai:
  1. Set GEMINI_API_KEY di .env
  2. Daftarkan nomor → warmup_manager.register(phone, session_id)
  3. Jalankan scheduler (Celery Beat atau APScheduler)
"""

import asyncio
import random
import logging
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional

logger = logging.getLogger("safe_wa.warmup")

# ── Topik percakapan warm-up ───────────────────────────────────────────────────
CHAT_TOPICS = [
    "cuaca hari ini",
    "makanan favorit",
    "film atau serial yang sedang ditonton",
    "rencana akhir pekan",
    "hobi terbaru",
    "rekomendasi tempat makan",
    "tips produktivitas",
    "olahraga favorit",
    "musik yang sedang didengarkan",
    "buku yang sedang dibaca",
    "rencana liburan",
    "update berita ringan hari ini",
]

CASUAL_OPENERS = [
    "Hei, apa kabar? 😊",
    "Hai! Lagi ngapain nih?",
    "Wah udah siang aja, gimana harimu?",
    "Btw, udah makan belum?",
    "Eh, kamu tau nggak...",
    "Halo! Sibuk nggak sekarang?",
    "Semangat pagi! ☀️",
    "Eh, numpang nanya dong...",
]


class WarmupPhase(str, Enum):
    SEED = "seed"          # Hari 1–2: pelan banget
    GROW = "grow"          # Hari 3–4: mulai agak ramai
    BLOOM = "bloom"        # Hari 5–7: hampir normal
    GRADUATED = "graduated"  # Selesai — siap broadcast


@dataclass
class WarmupSession:
    phone: str
    session_id: str
    start_day: int = field(default_factory=lambda: int(time.time() // 86400))
    chats_today: int = 0
    total_chats: int = 0
    trust_score: int = 10
    phase: WarmupPhase = WarmupPhase.SEED
    last_chat_ts: float = 0.0
    partner_phones: list[str] = field(default_factory=list)

    @property
    def day_number(self) -> int:
        today = int(time.time() // 86400)
        return today - self.start_day + 1

    @property
    def is_graduated(self) -> bool:
        return self.day_number > 7 or self.phase == WarmupPhase.GRADUATED

    def max_chats_today(self) -> int:
        day = self.day_number
        if day <= 2:
            return random.randint(3, 5)
        elif day <= 4:
            return random.randint(6, 8)
        else:
            return random.randint(10, 15)

    def min_gap_minutes(self) -> int:
        """Jeda minimum antar chat (menit)."""
        day = self.day_number
        if day <= 2:
            return random.randint(60, 180)
        elif day <= 4:
            return random.randint(30, 90)
        else:
            return random.randint(15, 60)

    def update_phase(self):
        day = self.day_number
        if day <= 2:
            self.phase = WarmupPhase.SEED
        elif day <= 4:
            self.phase = WarmupPhase.GROW
        elif day <= 7:
            self.phase = WarmupPhase.BLOOM
        else:
            self.phase = WarmupPhase.GRADUATED


class GeminiChatEngine:
    """
    Wrapper tipis untuk Gemini API — generate percakapan casual Indonesia.
    Gunakan gemini-2.0-flash (gratis, cepat, ringan).
    """

    def __init__(self, api_key: str):
        self.api_key = api_key
        self._base = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"

    async def generate_chat(self, topic: str, context: str = "", day: int = 1) -> str:
        """
        Generate satu pesan chat casual bahasa Indonesia.
        Makin lama warm-up, makin panjang & natural pesannya.
        """
        import httpx

        max_words = 8 + (day * 3)  # Hari 1: ~11 kata, Hari 7: ~29 kata

        prompt = f"""Kamu adalah orang Indonesia biasa yang sedang chatting santai di WhatsApp.
Topik: {topic}
{f'Konteks: {context}' if context else ''}
Tulis SATU pesan chat singkat (maks {max_words} kata), casual, gunakan bahasa sehari-hari Indonesia.
Boleh pakai singkatan (btw, nggak, lagi, dll) dan emoji 1-2 buah sesekali.
HANYA tulis pesan itu saja, tanpa label apapun."""

        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.9,
                "maxOutputTokens": 100,
                "topP": 0.95,
            },
        }

        try:
            async with httpx.AsyncClient(timeout=10) as client:
                r = await client.post(
                    f"{self._base}?key={self.api_key}",
                    json=payload,
                )
                r.raise_for_status()
                data = r.json()
                text = data["candidates"][0]["content"]["parts"][0]["text"]
                return text.strip().strip('"')
        except Exception as e:
            logger.warning(f"Gemini error: {e} — using fallback")
            return self._fallback_message(topic)

    @staticmethod
    def _fallback_message(topic: str) -> str:
        """Fallback jika Gemini API tidak tersedia."""
        fallbacks = {
            "cuaca hari ini": "Panas banget ya hari ini 😅",
            "makanan favorit": "Eh btw, tadi makan apa? Aku lagi pengen mie ayam nih 😄",
            "film atau serial yang sedang ditonton": "Lagi nonton apa sekarang? Ada rekomendasi nggak?",
            "default": random.choice([
                "Hehe iya bener banget 😂",
                "Wah seru tuh! Cerita dong lebih 😊",
                "Nah iya, aku juga mikir gitu",
                "Beneran? Lucu banget 😄",
                "Hahaha iya deh, setuju!",
            ])
        }
        return fallbacks.get(topic, fallbacks["default"])


class WarmupManager:
    """
    Manajer warm-up: schedule, monitor, dan jalankan chat per sesi.
    """

    def __init__(self, gemini_key: Optional[str] = None):
        self._sessions: dict[str, WarmupSession] = {}
        self._engine = GeminiChatEngine(gemini_key) if gemini_key else None
        self._send_fn = None  # Akan di-inject oleh main.py

    def set_sender(self, fn):
        """Inject fungsi kirim pesan dari evolution client."""
        self._send_fn = fn

    def register(self, phone: str, session_id: str, partner_pool: list[str] = None) -> WarmupSession:
        """Daftarkan nomor baru ke program warm-up."""
        session = WarmupSession(
            phone=phone,
            session_id=session_id,
            partner_phones=partner_pool or [],
        )
        self._sessions[phone] = session
        logger.info(f"🔥 Warm-up registered: {phone} (Day 1)")
        return session

    def get_status(self, phone: str) -> Optional[dict]:
        s = self._sessions.get(phone)
        if not s:
            return None
        return {
            "phone": s.phone,
            "day": s.day_number,
            "phase": s.phase.value,
            "chats_today": s.chats_today,
            "max_today": s.max_chats_today(),
            "total_chats": s.total_chats,
            "trust_score": s.trust_score,
            "is_graduated": s.is_graduated,
        }

    def get_all_status(self) -> list[dict]:
        return [self.get_status(p) for p in self._sessions]

    async def run_chat_cycle(self, phone: str) -> bool:
        """
        Jalankan satu siklus chat untuk nomor tertentu.
        Dipanggil oleh Celery Beat atau APScheduler.
        """
        session = self._sessions.get(phone)
        if not session:
            logger.warning(f"No warmup session for {phone}")
            return False

        session.update_phase()

        if session.is_graduated:
            logger.info(f"🎓 {phone} sudah lulus warm-up!")
            return False

        # Cek apakah sudah cukup chat hari ini
        if session.chats_today >= session.max_chats_today():
            logger.info(f"⏸️  {phone} sudah max chat hari ini ({session.chats_today})")
            return False

        # Cek gap minimum antar chat
        now = time.time()
        gap_needed = session.min_gap_minutes() * 60
        if now - session.last_chat_ts < gap_needed:
            wait = int((gap_needed - (now - session.last_chat_ts)) / 60)
            logger.info(f"⏳ {phone} — next chat in {wait} min")
            return False

        # Generate pesan via Gemini
        topic = random.choice(CHAT_TOPICS)
        opener = random.choice(CASUAL_OPENERS)

        if self._engine and self._engine.api_key:
            message = await self._engine.generate_chat(topic, opener, session.day_number)
        else:
            message = GeminiChatEngine._fallback_message(topic)

        # Kirim ke partner (bot lain dalam pool)
        if session.partner_phones and self._send_fn:
            partner = random.choice(session.partner_phones)
            await self._send_fn(partner, message)
            logger.info(f"💬 Warm-up [{phone}→{partner}] Day {session.day_number}: '{message[:40]}...'")

        # Update stats
        session.chats_today += 1
        session.total_chats += 1
        session.last_chat_ts = now

        # Naikan trust score secara bertahap
        trust_gain = random.uniform(0.5, 2.0)
        session.trust_score = min(100, int(session.trust_score + trust_gain))

        return True

    async def run_all(self):
        """Jalankan semua sesi warm-up yang aktif. Dipanggil periodik."""
        active = [p for p, s in self._sessions.items() if not s.is_graduated]
        if not active:
            return

        logger.info(f"🔥 Running warm-up for {len(active)} sessions...")
        tasks = [self.run_chat_cycle(phone) for phone in active]
        await asyncio.gather(*tasks, return_exceptions=True)


# Singleton
warmup_manager = WarmupManager()
