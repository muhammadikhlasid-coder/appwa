from fastapi import FastAPI, BackgroundTasks
import time
import random
import httpx

app = FastAPI(title="Safe WA Gateway API")

# Konfigurasi Evolution (Sesuaikan dengan server Evolution Anda)
EVO_URL = "http://localhost:8080" 
EVO_INSTANCE = "wagateway1"
EVO_APIKEY = "YOUR_API_KEY"

def obfuscate_and_send(phone: str, message: str):
    """
    Simulasi Middleware: Menambahkan ZWC dan Delay sebelum mengirim ke Evolution API asli.
    """
    # 1. Jeda Antrean (Queue Simulation)
    time.sleep(random.uniform(2.0, 5.0))
    
    # 2. ZWC Injection
    zero_width_chars = ["\u200B", "\u200C", "\u200D", "\uFEFF"]
    words = message.split(" ")
    obfuscated = "".join([w + "".join(random.choices(zero_width_chars, k=random.randint(1, 2))) + " " for w in words]).strip()
    
    # 3. Payload ke Evolution API Asli
    payload = {
        "number": phone,
        "text": obfuscated,
        "delay": random.randint(3000, 7000), # Status Typing
        "linkPreview": False
    }
    
    # 4. Kirim (Jika server jalan)
    # response = httpx.post(f"{EVO_URL}/message/sendText/{EVO_INSTANCE}", json=payload, headers={"apikey": EVO_APIKEY})
    # print(response.json())
    print(f"✅ Pesan aman telah dikirim ke {phone} (ZWC Injected)")

@app.post("/send_safe_message")
async def send_safe_message(phone: str, message: str, background_tasks: BackgroundTasks):
    """
    Endpoint Gateway: Menerima request dari ITSM, tapi memprosesnya di Background Task (Queue).
    Sehingga ITSM tidak perlu menunggu lama, dan server WA tidak di-spam.
    """
    # Masukkan ke antrean proses belakang layar
    background_tasks.add_task(obfuscate_and_send, phone, message)
    
    return {
        "status": "success",
        "message": "Pesan telah masuk antrean Safe Gateway dan akan diproses secara aman."
    }

