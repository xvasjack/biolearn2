"""Email notification utilities."""
import logging
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

logger = logging.getLogger(__name__)

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
FROM_EMAIL = os.getenv("FROM_EMAIL", "") or SMTP_USER
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://biolearn.cloud")


def send_email(to_email: str, subject: str, html_body: str) -> bool:
    """Send an email via SMTP. Returns True on success."""
    if not SMTP_USER or not SMTP_PASSWORD:
        logger.warning("SMTP not configured, skipping email to %s", to_email)
        return False

    msg = MIMEMultipart("alternative")
    msg["From"] = f"BioLearn <{FROM_EMAIL}>"
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.attach(MIMEText(html_body, "html"))

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(FROM_EMAIL, to_email, msg.as_string())
        logger.info("Email sent to %s: %s", to_email, subject)
        return True
    except Exception as e:
        logger.error("Failed to send email to %s: %s", to_email, e)
        return False


def send_expiry_warning(to_email: str, username: str, days_remaining: int, expiry_date: str):
    """Send a subscription expiry warning email."""
    if days_remaining == 1:
        subject = "Your BioLearn Pro access expires tomorrow"
        urgency = "expires <strong>tomorrow</strong>"
    else:
        subject = f"Your BioLearn Pro access expires in {days_remaining} days"
        urgency = f"expires in <strong>{days_remaining} days</strong>"

    html = f"""
    <div style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px; color: #1e293b;">
        <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #0f172a; font-size: 24px; margin: 0;">BioLearn</h1>
        </div>
        <p>Hi {username},</p>
        <p>Your BioLearn Pro subscription {urgency} (on {expiry_date}).</p>
        <p>After expiry, you will no longer be able to access WGS Bacteria, Amplicon Bacteria, and other Pro modules.
           Your account and progress will be preserved.</p>
        <div style="text-align: center; margin: 32px 0;">
            <a href="{FRONTEND_URL}"
               style="background: #059669; color: white; padding: 12px 32px; border-radius: 8px;
                      text-decoration: none; font-weight: 600; display: inline-block;">
                Renew Subscription
            </a>
        </div>
        <p style="color: #64748b; font-size: 13px;">
            If you have any questions, reply to this email. Thank you for learning with BioLearn!
        </p>
    </div>
    """
    send_email(to_email, subject, html)
