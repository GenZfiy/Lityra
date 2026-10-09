"""Institution domain models (schema: lms_institution)."""
from __future__ import annotations

from datetime import date, datetime, timezone

from sqlalchemy import CheckConstraint, Date, DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from lare_common.db import Base
from lare_common.security import new_id


def _uuid() -> str:
    return new_id()


def _utcnow() -> datetime:
    return datetime.now(tz=timezone.utc)


class College(Base):
    __tablename__ = "colleges"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    tenant_id: Mapped[str] = mapped_column(String(64), default="lare", index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    address: Mapped[str | None] = mapped_column(String(512))
    timezone: Mapped[str] = mapped_column(String(64), default="Asia/Kolkata")
    mou_ref: Mapped[str | None] = mapped_column(String(128))
    status: Mapped[str] = mapped_column(String(32), default="active")
    coordinator_user_id: Mapped[str | None] = mapped_column(String(64))
    passing_threshold: Mapped[int] = mapped_column(Integer, default=60)
    min_cohort_size: Mapped[int] = mapped_column(Integer, default=30)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    branches: Mapped[list["Branch"]] = relationship(
        back_populates="college", cascade="all, delete-orphan"
    )


class TrainingCenter(Base):
    """An upskilling provider using the same institution-scoped role bindings."""
    __tablename__ = "training_centers"
    __table_args__ = (UniqueConstraint("code", name="uq_training_center_code"),)

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    tenant_id: Mapped[str] = mapped_column(String(64), default="lare", index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    code: Mapped[str] = mapped_column(String(32), nullable=False)
    city: Mapped[str | None] = mapped_column(String(128))
    address: Mapped[str | None] = mapped_column(String(512))
    focus: Mapped[str | None] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(String(16), default="active")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)


class TrainingProgram(Base):
    __tablename__ = "training_programs"
    __table_args__ = (
        UniqueConstraint("center_id", "code", name="uq_training_program_code"),
        CheckConstraint("duration_months IN (2, 3, 6)", name="ck_training_program_duration"),
        CheckConstraint("audience IN ('students', 'corporate', 'both')", name="ck_training_program_audience"),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    center_id: Mapped[str] = mapped_column(ForeignKey("training_centers.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    code: Mapped[str] = mapped_column(String(32), nullable=False)
    summary: Mapped[str | None] = mapped_column(String(2000))
    duration_months: Mapped[int] = mapped_column(Integer, nullable=False)
    audience: Mapped[str] = mapped_column(String(16), default="both", nullable=False)
    delivery_mode: Mapped[str] = mapped_column(String(16), default="hybrid", nullable=False)
    status: Mapped[str] = mapped_column(String(16), default="active")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)


class TrainingBatch(Base):
    __tablename__ = "training_batches"
    __table_args__ = (UniqueConstraint("center_id", "code", name="uq_training_batch_code"),)

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    center_id: Mapped[str] = mapped_column(ForeignKey("training_centers.id", ondelete="CASCADE"), index=True)
    program_id: Mapped[str] = mapped_column(ForeignKey("training_programs.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    code: Mapped[str] = mapped_column(String(32), nullable=False)
    starts_on: Mapped[date] = mapped_column(Date, nullable=False)
    ends_on: Mapped[date] = mapped_column(Date, nullable=False)
    capacity: Mapped[int] = mapped_column(Integer, default=30)
    audience: Mapped[str] = mapped_column(String(16), default="students", nullable=False)
    organization_name: Mapped[str | None] = mapped_column(String(255))
    trainer_user_id: Mapped[str | None] = mapped_column(String(64))
    status: Mapped[str] = mapped_column(String(16), default="enrolling")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)


class TrainingParticipant(Base):
    __tablename__ = "training_participants"
    __table_args__ = (UniqueConstraint("batch_id", "email", name="uq_training_participant_email"),)

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    batch_id: Mapped[str] = mapped_column(ForeignKey("training_batches.id", ondelete="CASCADE"), index=True)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    participant_type: Mapped[str] = mapped_column(String(24), nullable=False)
    organization_name: Mapped[str | None] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(String(16), default="enrolled")
    enrolled_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)


class Branch(Base):
    __tablename__ = "branches"
    __table_args__ = (UniqueConstraint("college_id", "code", name="uq_branch_code"),)

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    college_id: Mapped[str] = mapped_column(ForeignKey("colleges.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    code: Mapped[str] = mapped_column(String(32), nullable=False)
    # category drives odd/even scheduling: cse_allied (odd) vs core (even)
    category: Mapped[str] = mapped_column(String(16), default="cse_allied")

    college: Mapped[College] = relationship(back_populates="branches")


class AcademicYear(Base):
    __tablename__ = "academic_years"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    college_id: Mapped[str] = mapped_column(ForeignKey("colleges.id", ondelete="CASCADE"), index=True)
    year_no: Mapped[int] = mapped_column(Integer)  # 1..4
    start: Mapped[date | None] = mapped_column(Date)
    end: Mapped[date | None] = mapped_column(Date)

    semesters: Mapped[list["Semester"]] = relationship(
        back_populates="academic_year", cascade="all, delete-orphan"
    )


class Semester(Base):
    __tablename__ = "semesters"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    academic_year_id: Mapped[str] = mapped_column(
        ForeignKey("academic_years.id", ondelete="CASCADE"), index=True
    )
    type: Mapped[str] = mapped_column(String(8))  # odd | even
    start: Mapped[date | None] = mapped_column(Date)
    end: Mapped[date | None] = mapped_column(Date)

    academic_year: Mapped[AcademicYear] = relationship(back_populates="semesters")


class Cohort(Base):
    __tablename__ = "cohorts"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    college_id: Mapped[str] = mapped_column(ForeignKey("colleges.id", ondelete="CASCADE"), index=True)
    branch_id: Mapped[str] = mapped_column(ForeignKey("branches.id", ondelete="CASCADE"))
    academic_year_id: Mapped[str | None] = mapped_column(String)
    section: Mapped[str | None] = mapped_column(String(16))
    year_no: Mapped[int] = mapped_column(Integer, default=1)
    size: Mapped[int] = mapped_column(Integer, default=0)


class ScheduleSlot(Base):
    __tablename__ = "schedule_slots"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    semester_id: Mapped[str] = mapped_column(ForeignKey("semesters.id", ondelete="CASCADE"), index=True)
    branch_id: Mapped[str] = mapped_column(ForeignKey("branches.id", ondelete="CASCADE"))
    week_no: Mapped[int] = mapped_column(Integer)
    module_ref: Mapped[str | None] = mapped_column(String(128))
    start: Mapped[date | None] = mapped_column(Date)
    end: Mapped[date | None] = mapped_column(Date)
    trainer_user_id: Mapped[str | None] = mapped_column(String(64))


class Assignment(Base):
    __tablename__ = "assignments"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    college_id: Mapped[str] = mapped_column(ForeignKey("colleges.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[str] = mapped_column(String(64))
    role: Mapped[str] = mapped_column(String(32))  # trainer | mentor | coordinator
    scope: Mapped[str | None] = mapped_column(String(64))


class AccessCode(Base):
    """A secure, admin-managed code that gates entry to ONE cohort (College →
    Year → Branch → Section). A student must present a valid code every login;
    it resolves to this cohort and scopes their LMS session to it."""
    __tablename__ = "access_codes"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    tenant_id: Mapped[str] = mapped_column(String(64), default="lare", index=True)
    code: Mapped[str] = mapped_column(String(40), unique=True, index=True, nullable=False)
    cohort_id: Mapped[str] = mapped_column(ForeignKey("cohorts.id", ondelete="CASCADE"), index=True)
    # denormalised for fast display / validation response
    college_id: Mapped[str] = mapped_column(String(64), index=True)
    branch_id: Mapped[str | None] = mapped_column(String(64))
    year_no: Mapped[int] = mapped_column(Integer, default=1)
    section: Mapped[str | None] = mapped_column(String(16))
    label: Mapped[str | None] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(String(16), default="active")  # active | inactive
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    used_count: Mapped[int] = mapped_column(Integer, default=0)
    created_by: Mapped[str | None] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)


class AccessSession(Base):
    """Records that a user passed the Access Gate this session and to which
    cohort. Short-lived; re-created on every login. LMS reads it to scope data
    and to enforce that the gate was passed."""
    __tablename__ = "access_sessions"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(String(64), index=True)
    cohort_id: Mapped[str] = mapped_column(String(64), index=True)
    code_id: Mapped[str | None] = mapped_column(String(64))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
