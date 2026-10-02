"""Check that image storage works end to end.

    cd backend
    .venv\\Scripts\\python.exe -m app.scripts.check_storage

Uploads a tiny test image, confirms it can be fetched back from its public
URL, then deletes it. Run it after adding your CLOUDINARY_* values to .env.
"""

import struct
import sys
import zlib

import httpx

from app.core import storage


def _tiny_png() -> bytes:
    def chunk(kind: bytes, body: bytes) -> bytes:
        crc = zlib.crc32(kind + body) & 0xFFFFFFFF
        return struct.pack(">I", len(body)) + kind + body + struct.pack(">I", crc)

    row = b"\x00" + bytes([30, 90, 200]) * 8
    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">IIBBBBB", 8, 8, 8, 2, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(row * 8))
        + chunk(b"IEND", b"")
    )


def main() -> int:
    backend = storage.backend_name()
    print(f"Storage backend: {backend}")
    if backend == "local":
        print(
            "Cloudinary is not configured (set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and "
            "CLOUDINARY_API_SECRET in backend/.env). Photos would be saved to local disk."
        )

    try:
        key = storage.save_image("healthcheck", _tiny_png(), "png")
    except storage.StorageError as exc:
        print(f"FAILED to upload: {exc.__cause__ or exc}")
        return 1
    print(f"Uploaded: {key}")

    ok = True
    if backend == "cloudinary":
        for variant in ("full", "thumb"):
            url = storage.public_url(key, variant)
            response = httpx.get(url, follow_redirects=True, timeout=20)
            print(f"  {variant}: {response.status_code} {url}")
            ok = ok and response.status_code == 200

    storage.delete_image(key)
    print("Deleted the test image.")
    print("OK" if ok else "FAILED: the uploaded image could not be fetched back.")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
