"""Sending email through any SMTP server (Gmail app password, Brevo, Mailgun
SMTP, Zoho, AWS SES SMTP, ...). Uses only the standard library.

Best effort by design: a failure to send never breaks the request that
triggered it (registration, an enquiry, ...). Callers get a bool back.
"""

import logging
import smtplib
from email.message import EmailMessage

from app.core.config import settings

logger = logging.getLogger("uvicorn.error")


def is_configured() -> bool:
    return bool(settings.SMTP_HOST)


def send_email(to: str, subject: str, text_body: str, html_body: str | None = None) -> bool:
    """Send one email. Returns True if the SMTP server accepted it."""
    if not is_configured():
        if settings.APP_ENV == "development":
            # No mail server in development: show the message in the server
            # console so links (e.g. email verification) can still be followed.
            logger.warning("EMAIL (not sent — SMTP not configured)\nTo: %s\nSubject: %s\n\n%s", to, subject, text_body)
        return False

    message = EmailMessage()
    message["From"] = settings.SMTP_FROM
    message["To"] = to
    message["Subject"] = subject
    message.set_content(text_body)
    if html_body:
        message.add_alternative(html_body, subtype="html")

    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as server:
            if settings.SMTP_USE_TLS:
                server.starttls()
            if settings.SMTP_USERNAME:
                server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            server.send_message(message)
        return True
    except Exception:
        logger.warning("Sending email to %s failed", to, exc_info=True)
        return False
