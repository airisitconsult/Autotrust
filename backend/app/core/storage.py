"""Where uploaded files live.

Two backends behind the same four functions (`save_image`, `delete_image`,
`public_url`, `detect_image_type`); nothing else in the app touches either:

* **Cloudinary** — used whenever CLOUDINARY_CLOUD_NAME / _API_KEY / _API_SECRET
  are all set. Images are stored on their CDN and served resized and
  re-encoded per request (WebP/AVIF where the browser supports it).
* **Local disk** (backend/uploads, served by the /uploads static mount) —
  the fallback for development when Cloudinary isn't configured. Not suitable
  for production: most hosts wipe local disk on every deploy.

The database stores only a storage *key* per photo, never image bytes.
Cloudinary keys carry a "cld:" prefix, so each photo is resolved by its own key
and photos from either backend keep working side by side if you switch.
"""

import io
import logging
import uuid
from pathlib import Path
from urllib.parse import quote

import cloudinary
import cloudinary.uploader

from app.core.config import settings

logger = logging.getLogger(__name__)

# Anchored to the backend folder, not the process working directory, so it
# resolves the same no matter where uvicorn was launched from.
UPLOAD_DIR = Path(__file__).resolve().parents[2] / "uploads"

MAX_IMAGE_BYTES = 5 * 1024 * 1024  # 5 MB

CLOUDINARY_PREFIX = "cld:"
_CLOUDINARY_ROOT_FOLDER = "autotrust"
_CLOUDINARY_TIMEOUT_SECONDS = 30

# Delivery transformations, applied by Cloudinary when the image is requested:
#   full  — at most 1600px wide, never upscaled
#   thumb — 640x480 crop around the interesting part (for cards and thumbnails)
# f_auto/q_auto: pick the best format and quality for each browser.
_VARIANTS = {
    "full": "c_limit,f_auto,q_auto,w_1600",
    "thumb": "c_fill,f_auto,g_auto,h_480,q_auto,w_640",
}

# Detected from the file's own leading bytes ("magic numbers"), never from the
# client-supplied filename or Content-Type — both are trivially spoofable.
_EXTENSION_BY_TYPE = {"jpeg": "jpg", "png": "png", "webp": "webp"}


class StorageError(Exception):
    """The storage backend couldn't save the image (e.g. Cloudinary is down
    or rejected the credentials)."""


def cloudinary_configured() -> bool:
    return all(
        value and not value.startswith("replace-with")
        for value in (
            settings.CLOUDINARY_CLOUD_NAME,
            settings.CLOUDINARY_API_KEY,
            settings.CLOUDINARY_API_SECRET,
        )
    )


def backend_name() -> str:
    return "cloudinary" if cloudinary_configured() else "local"


def detect_image_type(data: bytes) -> str | None:
    if data.startswith(b"\xff\xd8\xff"):
        return "jpeg"
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "webp"
    return None


def _configure_cloudinary() -> None:
    cloudinary.config(
        cloud_name=settings.CLOUDINARY_CLOUD_NAME,
        api_key=settings.CLOUDINARY_API_KEY,
        api_secret=settings.CLOUDINARY_API_SECRET,
        secure=True,
    )


def save_image(folder: str, data: bytes, image_type: str) -> str:
    """Store the image and return its storage key. The name is a fresh UUID —
    nothing from the client's filename is ever used, which rules out
    path-traversal and overwrite tricks."""
    if cloudinary_configured():
        _configure_cloudinary()
        try:
            result = cloudinary.uploader.upload(
                io.BytesIO(data),
                folder=f"{_CLOUDINARY_ROOT_FOLDER}/{folder}",
                public_id=str(uuid.uuid4()),
                resource_type="image",
                overwrite=False,
                # Cloudinary re-checks the format on its side too.
                allowed_formats=list(_EXTENSION_BY_TYPE.values()),
                timeout=_CLOUDINARY_TIMEOUT_SECONDS,
            )
            return f"{CLOUDINARY_PREFIX}{result['public_id']}"
        except Exception as exc:
            logger.warning("Cloudinary upload failed", exc_info=True)
            raise StorageError("Cloudinary upload failed") from exc

    key = f"{folder}/{uuid.uuid4()}.{_EXTENSION_BY_TYPE[image_type]}"
    path = UPLOAD_DIR / key
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)
    return key


def delete_image(key: str) -> None:
    """Best effort: failing to remove the file shouldn't block removing the DB
    row (worst case is an orphaned file, which is logged)."""
    if key.startswith(CLOUDINARY_PREFIX):
        if not cloudinary_configured():
            logger.warning("Cannot delete %s: Cloudinary is not configured", key)
            return
        _configure_cloudinary()
        try:
            cloudinary.uploader.destroy(
                key.removeprefix(CLOUDINARY_PREFIX),
                resource_type="image",
                invalidate=True,
                timeout=_CLOUDINARY_TIMEOUT_SECONDS,
            )
        except Exception:
            logger.warning("Cloudinary delete failed for %s", key, exc_info=True)
        return
    (UPLOAD_DIR / key).unlink(missing_ok=True)


def public_url(key: str, variant: str = "full") -> str:
    """URL the browser loads the image from. `variant` is "full" or "thumb";
    local files have only one size, so both return the same URL."""
    if key.startswith(CLOUDINARY_PREFIX):
        cloud = settings.CLOUDINARY_CLOUD_NAME
        if not cloud:
            return ""  # photo was uploaded to Cloudinary, but the cloud name is no longer set
        public_id = quote(key.removeprefix(CLOUDINARY_PREFIX), safe="/")
        return f"https://res.cloudinary.com/{cloud}/image/upload/{_VARIANTS[variant]}/{public_id}"
    return f"/uploads/{key}"
