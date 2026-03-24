import os
import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
import logging

logger = logging.getLogger(__name__)

EMAIL_SERVICE = os.environ.get("EMAIL_SERVICE", "gmail")
EMAIL_USER = os.environ.get("EMAIL_USER")
EMAIL_PASSWORD = os.environ.get("EMAIL_PASSWORD")
RESEND_API_KEY = os.environ.get("RESEND_API_KEY")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:5173")


async def send_email_smtp(to_email: str, subject: str, html_content: str) -> bool:
    try:
        message = MIMEMultipart("alternative")
        message["From"] = EMAIL_USER
        message["To"] = to_email
        message["Subject"] = subject
        
        html_part = MIMEText(html_content, "html")
        message.attach(html_part)
        
        if EMAIL_SERVICE == "gmail":
            await aiosmtplib.send(
                message,
                hostname="smtp.gmail.com",
                port=587,
                start_tls=True,
                username=EMAIL_USER,
                password=EMAIL_PASSWORD,
            )
        else:
            await aiosmtplib.send(
                message,
                hostname="smtp.gmail.com",
                port=587,
                start_tls=True,
                username=EMAIL_USER,
                password=EMAIL_PASSWORD,
            )
        
        logger.info(f"Email sent successfully to {to_email} via SMTP")
        return True
    except Exception as e:
        logger.error(f"SMTP email failed: {str(e)}")
        return False


async def send_email_resend(to_email: str, subject: str, html_content: str) -> bool:
    try:
        import httpx
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {RESEND_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "from": f"Viva Platform <{EMAIL_USER}>",
                    "to": [to_email],
                    "subject": subject,
                    "html": html_content
                }
            )
            
            if response.status_code == 200:
                logger.info(f"Email sent successfully to {to_email} via Resend")
                return True
            else:
                logger.error(f"Resend API failed: {response.text}")
                return False
    except Exception as e:
        logger.error(f"Resend email failed: {str(e)}")
        return False


async def send_email(to_email: str, subject: str, html_content: str) -> bool:
    smtp_success = await send_email_smtp(to_email, subject, html_content)
    
    if smtp_success:
        return True
    
    logger.info("SMTP failed, trying Resend fallback...")
    return await send_email_resend(to_email, subject, html_content)


async def send_password_reset_email(to_email: str, reset_token: str) -> bool:
    reset_link = f"{FRONTEND_URL}/reset-password?token={reset_token}"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
            .button {{ display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
            .footer {{ text-align: center; margin-top: 20px; color: #666; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Password Reset Request</h1>
            </div>
            <div class="content">
                <p>Hi there,</p>
                <p>We received a request to reset your password for your Viva Platform account.</p>
                <p>Click the button below to reset your password:</p>
                <a href="{reset_link}" class="button">Reset Password</a>
                <p>Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #667eea;">{reset_link}</p>
                <p>This link will expire in 1 hour.</p>
                <p>If you didn't request this, please ignore this email.</p>
            </div>
            <div class="footer">
                <p>&copy; 2024 Viva Platform. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    return await send_email(to_email, "Reset Your Password - Viva Platform", html_content)


async def send_welcome_email(to_email: str, full_name: str, role: str) -> bool:
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
            .button {{ display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Welcome to Viva Platform!</h1>
            </div>
            <div class="content">
                <p>Hi {full_name},</p>
                <p>Welcome to Viva Platform! Your account has been successfully created as a <strong>{role}</strong>.</p>
                <p>You can now log in and start using the platform.</p>
                <a href="{FRONTEND_URL}/login" class="button">Go to Login</a>
                <p>If you have any questions, feel free to reach out to our support team.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    return await send_email(to_email, "Welcome to Viva Platform!", html_content)