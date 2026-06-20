import logging
import os

logger = logging.getLogger(__name__)

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")


def send_password_reset_email(email: str, reset_token: str) -> None:
    reset_url = f"{FRONTEND_URL}/reset-password?token={reset_token}"

    smtp_host = os.getenv("SMTP_HOST")
    if smtp_host:
        # SMTP integration point — wire when credentials are configured.
        logger.info("Password reset email would be sent to %s (SMTP not fully wired).", email)
        logger.info("Reset URL: %s", reset_url)
        return

    logger.info(
        "[HIRELENS] Password reset for %s — configure SMTP to send email. Reset URL: %s",
        email,
        reset_url,
    )
