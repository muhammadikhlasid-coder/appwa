import hashlib
import hmac
import base64
import json
import time
import os
import secrets

SECRET_KEY = os.getenv("SECRET_KEY", "super_secret_key_12345_safe_wa_api")

def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    key = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, 100000)
    return base64.b64encode(salt).decode('utf-8') + "$" + base64.b64encode(key).decode('utf-8')

def verify_password(password: str, password_hash: str) -> bool:
    try:
        salt_b64, key_b64 = password_hash.split("$")
        salt = base64.b64decode(salt_b64)
        expected_key = base64.b64decode(key_b64)
        key = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, 100000)
        return hmac.compare_digest(key, expected_key)
    except Exception:
        return False

def b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b'=').decode('utf-8')

def create_jwt(payload: dict, expires_delta_hours: int = 24) -> str:
    header = {"alg": "HS256", "typ": "JWT"}
    # Clone to avoid mutating the original dict
    jwt_payload = payload.copy()
    jwt_payload["exp"] = int(time.time()) + (expires_delta_hours * 3600)
    
    encoded_header = b64url_encode(json.dumps(header).encode('utf-8'))
    encoded_payload = b64url_encode(json.dumps(jwt_payload).encode('utf-8'))
    
    signature_input = f"{encoded_header}.{encoded_payload}".encode('utf-8')
    signature = hmac.new(SECRET_KEY.encode('utf-8'), signature_input, hashlib.sha256).digest()
    encoded_signature = b64url_encode(signature)
    
    return f"{encoded_header}.{encoded_payload}.{encoded_signature}"

def verify_jwt(token: str) -> dict | None:
    try:
        header_b64, payload_b64, signature_b64 = token.split(".")
        signature_input = f"{header_b64}.{payload_b64}".encode('utf-8')
        expected_signature = hmac.new(SECRET_KEY.encode('utf-8'), signature_input, hashlib.sha256).digest()
        
        # fix padding
        signature = base64.urlsafe_b64decode(signature_b64 + "=" * ((4 - len(signature_b64) % 4) % 4))
        
        if not hmac.compare_digest(signature, expected_signature):
            return None
            
        payload_json = base64.urlsafe_b64decode(payload_b64 + "=" * ((4 - len(payload_b64) % 4) % 4)).decode('utf-8')
        payload = json.loads(payload_json)
        
        if payload.get("exp", 0) < time.time():
            return None # Expired
            
        return payload
    except Exception:
        return None
