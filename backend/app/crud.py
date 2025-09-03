from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc, func
from typing import List, Optional, Dict
from datetime import datetime, timedelta
from . import models, schemas

# User CRUD operations
def get_user(db: Session, user_id: int):
    return db.query(models.User).filter(models.User.id == user_id).first()

def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()

def get_users(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.User).offset(skip).limit(limit).all()

def create_user(db: Session, user: schemas.UserCreate):
    db_user = models.User(**user.dict())
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def update_user(db: Session, user_id: int, user_update: schemas.UserUpdate):
    db_user = get_user(db, user_id)
    if db_user:
        update_data = user_update.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_user, field, value)
        db_user.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(db_user)
    return db_user

# Requirement CRUD operations
def get_requirement(db: Session, requirement_id: int):
    return db.query(models.Requirement).filter(models.Requirement.id == requirement_id).first()

def get_requirement_by_external_id(db: Session, external_id: str):
    return db.query(models.Requirement).filter(models.Requirement.external_id == external_id).first()

def get_requirements(db: Session, skip: int = 0, limit: int = 100, 
                    status: Optional[str] = None, priority: Optional[str] = None,
                    assigned_user_id: Optional[int] = None):
    query = db.query(models.Requirement)
    
    if status:
        query = query.filter(models.Requirement.status == status)
    if priority:
        query = query.filter(models.Requirement.priority == priority)
    if assigned_user_id:
        query = query.filter(models.Requirement.assigned_user_id == assigned_user_id)
    
    return query.offset(skip).limit(limit).order_by(desc(models.Requirement.created_at)).all()

def create_requirement(db: Session, requirement: schemas.RequirementCreate):
    db_requirement = models.Requirement(**requirement.dict())
    db.add(db_requirement)
    db.commit()
    db.refresh(db_requirement)
    return db_requirement

def update_requirement(db: Session, requirement_id: int, requirement_update: schemas.RequirementUpdate):
    db_requirement = get_requirement(db, requirement_id)
    if db_requirement:
        update_data = requirement_update.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_requirement, field, value)
        db_requirement.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(db_requirement)
    return db_requirement

def delete_requirement(db: Session, requirement_id: int):
    db_requirement = get_requirement(db, requirement_id)
    if db_requirement:
        db.delete(db_requirement)
        db.commit()
        return True
    return False

# Communication CRUD operations
def get_communication(db: Session, communication_id: int):
    return db.query(models.Communication).filter(models.Communication.id == communication_id).first()

def get_communications_by_requirement(db: Session, requirement_id: int, skip: int = 0, limit: int = 100):
    return db.query(models.Communication).filter(
        models.Communication.requirement_id == requirement_id
    ).offset(skip).limit(limit).order_by(desc(models.Communication.sent_at)).all()

def create_communication(db: Session, communication: schemas.CommunicationCreate):
    db_communication = models.Communication(**communication.dict())
    db.add(db_communication)
    db.commit()
    db.refresh(db_communication)
    return db_communication

def update_communication(db: Session, communication_id: int, communication_update: schemas.CommunicationUpdate):
    db_communication = get_communication(db, communication_id)
    if db_communication:
        update_data = communication_update.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_communication, field, value)
        db.commit()
        db.refresh(db_communication)
    return db_communication

# Project CRUD operations
def get_project(db: Session, project_id: int):
    return db.query(models.Project).filter(models.Project.id == project_id).first()

def get_projects(db: Session, skip: int = 0, limit: int = 100, status: Optional[str] = None):
    query = db.query(models.Project)
    if status:
        query = query.filter(models.Project.status == status)
    return query.offset(skip).limit(limit).order_by(desc(models.Project.created_at)).all()

def create_project(db: Session, project: schemas.ProjectCreate):
    db_project = models.Project(**project.dict())
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    return db_project

def update_project(db: Session, project_id: int, project_update: schemas.ProjectUpdate):
    db_project = get_project(db, project_id)
    if db_project:
        update_data = project_update.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_project, field, value)
        db_project.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(db_project)
    return db_project

# Dashboard and Analytics functions
def get_dashboard_metrics(db: Session) -> Dict:
    """Get dashboard metrics for overview"""
    total_requirements = db.query(models.Requirement).count()
    pending_requirements = db.query(models.Requirement).filter(
        models.Requirement.status == "pending"
    ).count()
    in_progress_requirements = db.query(models.Requirement).filter(
        models.Requirement.status == "in_progress"
    ).count()
    completed_requirements = db.query(models.Requirement).filter(
        models.Requirement.status == "completed"
    ).count()
    
    # Calculate average SLA
    avg_sla_result = db.query(func.avg(models.Requirement.sla_hours)).scalar()
    avg_sla_hours = float(avg_sla_result) if avg_sla_result else 0.0
    
    # Count overdue requirements (assuming SLA is in hours)
    now = datetime.utcnow()
    overdue_requirements = db.query(models.Requirement).filter(
        and_(
            models.Requirement.status.in_(["pending", "in_progress"]),
            models.Requirement.created_at + func.cast(
                models.Requirement.sla_hours, models.Requirement.sla_hours
            ) < now
        )
    ).count()
    
    return {
        "total_requirements": total_requirements,
        "pending_requirements": pending_requirements,
        "in_progress_requirements": in_progress_requirements,
        "completed_requirements": completed_requirements,
        "avg_sla_hours": avg_sla_hours,
        "overdue_requirements": overdue_requirements
    }

def get_weekly_progress(db: Session, weeks: int = 4) -> List[Dict]:
    """Get weekly progress data for charts"""
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(weeks=weeks)
    
    # This is a simplified weekly aggregation
    # In production, you'd want more sophisticated date handling
    weekly_data = []
    
    for i in range(weeks):
        week_start = start_date + timedelta(weeks=i)
        week_end = week_start + timedelta(weeks=1)
        
        # Count requirements created in this week
        created_count = db.query(models.Requirement).filter(
            and_(
                models.Requirement.created_at >= week_start,
                models.Requirement.created_at < week_end
            )
        ).count()
        
        # Count requirements completed in this week
        completed_count = db.query(models.Requirement).filter(
            and_(
                models.Requirement.status == "completed",
                models.Requirement.updated_at >= week_start,
                models.Requirement.updated_at < week_end
            )
        ).count()
        
        weekly_data.append({
            "date": week_start.strftime("%Y-%m-%d"),
            "completed": completed_count,
            "created": created_count
        })
    
    return weekly_data

def get_priority_distribution(db: Session) -> List[Dict]:
    """Get priority distribution for pie chart"""
    priorities = ["low", "medium", "high", "critical"]
    distribution = []
    
    total = db.query(models.Requirement).count()
    
    for priority in priorities:
        count = db.query(models.Requirement).filter(
            models.Requirement.priority == priority
        ).count()
        
        percentage = (count / total * 100) if total > 0 else 0
        
        distribution.append({
            "priority": priority.capitalize(),
            "count": count,
            "percentage": round(percentage, 1)
        })
    
    return distribution

def get_requirements_by_status(db: Session) -> List[Dict]:
    """Get requirements grouped by status"""
    statuses = ["pending", "in_progress", "completed", "cancelled"]
    result = []
    
    for status in statuses:
        count = db.query(models.Requirement).filter(
            models.Requirement.status == status
        ).count()
        
        result.append({
            "status": status.replace("_", " ").title(),
            "count": count
        })
    
    return result

def search_requirements(db: Session, search_term: str, skip: int = 0, limit: int = 50) -> List[models.Requirement]:
    """Search requirements by title or description"""
    search_filter = or_(
        models.Requirement.title.ilike(f"%{search_term}%"),
        models.Requirement.description.ilike(f"%{search_term}%")
    )
    
    return db.query(models.Requirement).filter(search_filter).offset(skip).limit(limit).all()

def get_requirements_timeline(db: Session, days: int = 30) -> List[Dict]:
    """Get requirements timeline for the last N days"""
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)
    
    requirements = db.query(models.Requirement).filter(
        models.Requirement.created_at >= start_date
    ).order_by(models.Requirement.created_at).all()
    
    timeline = []
    for req in requirements:
        timeline.append({
            "id": req.id,
            "title": req.title,
            "status": req.status,
            "priority": req.priority,
            "created_at": req.created_at.isoformat(),
            "assigned_user": req.assigned_user.name if req.assigned_user else None
        })
    
    return timeline
