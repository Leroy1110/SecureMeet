from cryptography.hazmat.primitives.asymmetric.rsa import RSAPrivateKey, RSAPublicKey
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization
from pathlib import Path

KEY_DIR = Path(__file__).resolve().parent.parent.parent / ".keys"
PRIVATE_KEY_FILE = KEY_DIR / "rsa_private_key.pem"
PUBLIC_KEY_FILE = KEY_DIR / "rsa_public_key.pem"


def load_or_create_rsa_keypair() -> tuple[RSAPrivateKey, RSAPublicKey]:
    KEY_DIR.mkdir(parents=True, exist_ok=True)
    if PRIVATE_KEY_FILE.exists() and PUBLIC_KEY_FILE.exists():
        with PRIVATE_KEY_FILE.open("rb") as private_file:
            private_key = serialization.load_pem_private_key(
                private_file.read(),
                password=None
            )
        with PUBLIC_KEY_FILE.open("rb") as public_file:
            public_key = serialization.load_pem_public_key(
                public_file.read()
            )
    else:
        keypair = rsa.generate_private_key(
            public_exponent=65537,
            key_size=2048
        )

        private_pem_key = keypair.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption()
        )

        public_pem_key = keypair.public_key().public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo
        )

        with PRIVATE_KEY_FILE.open("wb") as private_file:
            private_file.write(private_pem_key)
       
        with PUBLIC_KEY_FILE.open("wb") as public_file:
            public_file.write(public_pem_key)
        
        private_key = keypair
        public_key = keypair.public_key()
    
    return private_key, public_key


"""
def encrypt_room_key(room_key: bytes) -> str:
    pass

def decrypt_room_key(encrypted_key: str) -> bytes:
    pass
"""