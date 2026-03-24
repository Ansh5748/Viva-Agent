from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import uuid
from enum import Enum

def generate_id():
    return str(uuid.uuid4())

class UserRole(str, Enum):
    GLOBAL_ADMIN = "global_admin"
    COLLEGE_ADMIN = "college_admin"
    STUDENT = "student"

class SubscriptionStatus(str, Enum):
    PENDING = "pending"
    ACTIVE = "active"
    EXPIRED = "expired"
    CANCELLED = "cancelled"

class PaymentMethod(str, Enum):
    RAZORPAY = "razorpay"
    PAYPAL = "paypal"
    CUSTOM = "custom"

class DifficultyLevel(str, Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"

class ExamStatus(str, Enum):
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class User(BaseModel):
    id: str = Field(default_factory=generate_id)
    email: EmailStr
    password_hash: str
    role: UserRole
    full_name: str
    college_id: Optional[str] = None
    student_id: Optional[str] = None # For student users, links to their student_id in the college
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Config:
        json_schema_extra = {
            "example": {
                "id": "uuid-string",
                "email": "user@example.com",
                "password_hash": "hashedpassword",
                "role": "student",
                "full_name": "John Doe",
                "college_id": "college-uuid",
                "student_id": "S12345",
                "is_active": True,
                "created_at": "2023-01-01T12:00:00Z",
                "updated_at": "2023-01-01T12:00:00Z"
            }
        }

class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    role: UserRole
    full_name: str
    college_id: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: Dict[str, Any] # User model without password_hash

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(min_length=8)

class College(BaseModel):
    id: str = Field(default_factory=generate_id)
    name: str
    admin_id: str # User ID of the college admin
    admin_email: EmailStr # Stored for easy lookup
    subscription_status: SubscriptionStatus = SubscriptionStatus.PENDING
    subscription_plan: Optional[str] = None
    subscription_expires_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CollegeCreate(BaseModel):
    name: str
    admin_email: EmailStr
    admin_password: str = Field(min_length=8)
    admin_full_name: str

class Subscription(BaseModel):
    id: str = Field(default_factory=generate_id)
    college_id: str
    plan_name: str
    price: float
    payment_method: PaymentMethod
    custom_payment_details: Optional[str] = None # For UPI/Bank transfer details
    status: SubscriptionStatus = SubscriptionStatus.PENDING
    admin_approved: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    expires_at: Optional[datetime] = None

class SubscriptionCreate(BaseModel):
    college_id: str
    plan_name: str
    payment_method: PaymentMethod
    custom_payment_details: Optional[str] = None

class Student(BaseModel):
    id: str = Field(default_factory=generate_id)
    college_id: str
    student_id: str # College's internal student ID (e.g., "CSE101")
    user_id: str # Link to the User account
    full_name: str
    email: EmailStr
    phone_number: Optional[str] = None
    batch: Optional[str] = None
    password: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StudentBulkUpload(BaseModel):
    students: List[Dict[str, str]] # Expects list of dicts like {"student_id": "...", "full_name": "...", "email": "..."}

class Question(BaseModel):
    id: str = Field(default_factory=generate_id)
    college_id: str
    question_text: str
    difficulty_level: DifficultyLevel
    answer_key: str
    subject: Optional[str] = None
    topic: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class QuestionBankUpload(BaseModel):
    questions: List[Dict[str, str]] # Expects list of dicts like {"question_text": "...", "difficulty_level": "...", "answer_key": "..."}

class TopicRule(BaseModel):
    topic: str
    easy_count: int = 0
    medium_count: int = 0
    hard_count: int = 0

class ExamConfig(BaseModel):
    duration_minutes: int = 20
    mode: str = "global" # 'global' or 'topic_wise'
    # Global counts (used if mode is global)
    total_easy: int = 3
    total_medium: int = 4
    total_hard: int = 2
    # Topic specific rules
    topic_rules: List[TopicRule] = []

class ExamSet(BaseModel):
    id: str = Field(default_factory=generate_id)
    college_id: str
    name: str
    exam_config: ExamConfig
    selected_subject: Optional[str] = None
    selected_topics: List[str] = []
    student_ids: List[str] # List of student IDs (from Student model)
    start_time: datetime
    end_time: datetime # Grace period end time
    created_by: str # User ID of the college admin who created it
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ExamSetCreate(BaseModel):
    name: str
    exam_config: ExamConfig
    selected_subject: Optional[str] = None
    selected_topics: List[str] = []
    student_ids: List[str]
    start_time: datetime
    end_time: Optional[datetime] = None

class ExamSetUpdate(BaseModel):
    name: Optional[str] = None
    exam_config: Optional[ExamConfig] = None
    selected_subject: Optional[str] = None
    selected_topics: Optional[List[str]] = None
    student_ids: Optional[List[str]] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None

class VivaExam(BaseModel):
    id: str = Field(default_factory=generate_id)
    exam_set_id: str
    student_id: str # ID of the student taking the exam
    college_id: str
    status: ExamStatus = ExamStatus.SCHEDULED
    is_present: bool = False # Marked by admin
    selected_questions: List[str] = [] # IDs of questions selected for this specific exam
    total_score: float = 0.0
    max_score: float = 0.0
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class QARecord(BaseModel):
    id: str = Field(default_factory=generate_id)
    viva_exam_id: str
    question_id: str
    question_text: str
    student_answer: str
    answer_key: str
    score: float
    max_score: float
    transcript: Optional[str] = None # Raw ASR transcript
    audio_file_path: Optional[str] = None # Path to stored audio file
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AnswerSubmission(BaseModel):
    question_id: str
    audio_file: Optional[bytes] = None # Raw audio bytes
    transcript: Optional[str] = None # Pre-transcribed text if available

class VoiceInteraction(BaseModel):
    text: str
    language: str = "en"
    voice: str = "nova"

class TranscribeRequest(BaseModel):
    audio_file: bytes
    language: str = "en"