from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc, func
from typing import List, Optional, Dict
from datetime import datetime, timedelta
from . import models
from . import schemas
from .schemas import development as dev_schemas

# User CRUD operations (legacy - mantener por compatibilidad)
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

# Communication CRUD operations (legacy - mantener por compatibilidad)
def get_communication(db: Session, communication_id: int):
    return db.query(models.Communication).filter(models.Communication.id == communication_id).first()

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

# Project CRUD operations (legacy - mantener por compatibilidad)
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

# Development CRUD operations
def get_development(db: Session, development_id: str):
    return db.query(models.Development).filter(models.Development.id == development_id).first()

def get_developments(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Development).offset(skip).limit(limit).all()

def create_development(db: Session, development: dev_schemas.DevelopmentCreate):
    db_development = models.Development(**development.dict())
    db.add(db_development)
    db.commit()
    db.refresh(db_development)
    return db_development

def create_developments_bulk(db: Session, developments: List[dev_schemas.DevelopmentCreate]):
    """Create multiple developments in bulk, updating state for existing ones"""
    created_developments = []
    updated_developments = []
    skipped_developments = []
    
    for dev_data in developments:
        # Validar que el ID tenga formato válido de Remedy
        if not dev_data.id or not dev_data.id.startswith('INC') or not dev_data.id[3:].isdigit():
            skipped_developments.append({
                "id": dev_data.id,
                "reason": "ID inválido - no es formato Remedy"
            })
            continue
        # Verificar si el desarrollo ya existe
        existing_dev = db.query(models.Development).filter(
            models.Development.id == dev_data.id
        ).first()
        
        if existing_dev:
            # Verificar si el estado es diferente
            if existing_dev.general_status != dev_data.general_status:
                # Actualizar solo el estado del desarrollo existente
                existing_dev.general_status = dev_data.general_status
                existing_dev.updated_at = datetime.utcnow()
                updated_developments.append({
                    "id": existing_dev.id,
                    "old_status": existing_dev.general_status,
                    "new_status": dev_data.general_status,
                    "development": existing_dev
                })
            else:
                # Estado igual, no hacer nada
                skipped_developments.append({
                    "id": existing_dev.id,
                    "status": existing_dev.general_status,
                    "reason": "Estado igual"
                })
        else:
            # Crear nuevo desarrollo
            new_dev = models.Development(**dev_data.dict())
            db.add(new_dev)
            created_developments.append(new_dev)
    
    try:
        db.commit()
        
        # Refresh todos los objetos
        for dev in created_developments:
            db.refresh(dev)
        for update_info in updated_developments:
            db.refresh(update_info["development"])
        
        return {
            "created": created_developments,
            "updated": updated_developments,
            "skipped": skipped_developments,
            "summary": {
                "total_processed": len(developments),
                "created": len(created_developments),
                "updated": len(updated_developments),
                "skipped": len(skipped_developments)
            }
        }
    except Exception as e:
        db.rollback()
        raise e

def update_development(db: Session, development_id: str, development_update: dev_schemas.DevelopmentUpdate):
    db_development = get_development(db, development_id)
    if db_development:
        update_data = development_update.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_development, field, value)
        db_development.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(db_development)
    return db_development

def delete_development(db: Session, development_id: str):
    db_development = get_development(db, development_id)
    if db_development:
        db.delete(db_development)
        db.commit()
    return db_development

def get_developments_by_status(db: Session, status: str, skip: int = 0, limit: int = 100):
    return db.query(models.Development).filter(models.Development.general_status == status).offset(skip).limit(limit).all()

def get_developments_by_provider(db: Session, provider: str, skip: int = 0, limit: int = 100):
    return db.query(models.Development).filter(models.Development.provider == provider).offset(skip).limit(limit).all()

# Dashboard CRUD functions
def get_dashboard_metrics(db: Session):
    """Get dashboard metrics from developments"""
    from sqlalchemy import func, case
    
    # Get development counts by status
    dev_status_counts = db.query(
        models.Development.general_status,
        func.count(models.Development.id).label('count')
    ).group_by(models.Development.general_status).all()
    
    # Calculate metrics
    pending = sum(count for status, count in dev_status_counts if status == 'Pendiente')
    in_progress = sum(count for status, count in dev_status_counts if status == 'En curso')
    completed = sum(count for status, count in dev_status_counts if status == 'Completado')
    
    # Calculate average SLA (simplified)
    avg_sla_days = 2.5  # This would be calculated from actual data
    
    return {
        "pending": pending,
        "inProgress": in_progress,
        "completed": completed,
        "avgSLA": f"{avg_sla_days}d"
    }

def get_priority_distribution(db: Session):
    """Get priority distribution from developments"""
    from sqlalchemy import func
    
    # For now, return mock data based on development status
    # In a real implementation, you'd have a priority field
    return [
        {"name": "Alta", "value": 30, "color": "#EF4444"},
        {"name": "Media", "value": 45, "color": "#F59E0B"},
        {"name": "Baja", "value": 25, "color": "#10B981"}
    ]

def get_upcoming_milestones(db: Session):
    """Get upcoming milestones from developments"""
    from datetime import datetime, timedelta
    
    # Get developments with upcoming estimated end dates
    upcoming_developments = db.query(models.Development).filter(
        models.Development.estimated_end_date.isnot(None),
        models.Development.estimated_end_date >= datetime.utcnow(),
        models.Development.estimated_end_date <= datetime.utcnow() + timedelta(days=30)
    ).limit(5).all()
    
    milestones = []
    for dev in upcoming_developments:
        # Determine status based on estimated vs current date
        days_until = (dev.estimated_end_date - datetime.utcnow()).days
        if days_until <= 7:
            status = 'at-risk'
        elif days_until <= 14:
            status = 'on-track'
        else:
            status = 'on-track'
            
        milestones.append({
            "id": dev.id,
            "title": dev.name,
            "date": dev.estimated_end_date.isoformat(),
            "status": status
        })
    
    return milestones

def get_weekly_progress(db: Session):
    """Get weekly progress data"""
    from datetime import datetime, timedelta
    from sqlalchemy import func, extract
    
    # Get last 7 days
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=7)
    
    # This is simplified - in reality you'd track daily progress
    weekly_data = []
    days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
    
    for i, day in enumerate(days):
        # Mock data for now - in reality you'd query actual daily progress
        weekly_data.append({
            "name": day,
            "completed": max(0, 2 + (i % 3)),  # Mock progression
            "created": max(0, 1 + (i % 2))     # Mock creation
        })
    
    return weekly_data

def get_indicators_kpis(db: Session):
    """Get KPI indicators from developments"""
    from sqlalchemy import func
    
    # Get development counts by status for compliance calculation
    dev_status_counts = db.query(
        models.Development.general_status,
        func.count(models.Development.id).label('count')
    ).group_by(models.Development.general_status).all()
    
    # Calculate global compliance (simplified)
    total_developments = sum(count for _, count in dev_status_counts)
    completed_developments = sum(count for status, count in dev_status_counts if status == 'Completado')
    global_compliance = (completed_developments / total_developments * 100) if total_developments > 0 else 0
    
    # Calculate other KPIs (simplified for now)
    return {
        "globalCompliance": {
            "value": round(global_compliance, 1),
            "change": {"value": 5.2, "type": "increase"}
        },
        "developmentComplianceDays": {
            "value": 2.3,
            "change": {"value": 0.5, "type": "decrease"}
        },
        "firstTimeQuality": {
            "value": 87.5,
            "change": {"value": 3.2, "type": "decrease"}
        },
        "failureResponseTime": {
            "value": 4.2,
            "change": {"value": 1.1, "type": "decrease"}
        },
        "defectsPerDelivery": {
            "value": 2.1,
            "change": {"value": 0.3, "type": "increase"}
        },
        "postProductionRework": {
            "value": 8.7,
            "change": {"value": 2.1, "type": "decrease"}
        }
    }

def get_provider_quality(db: Session):
    """Get provider quality metrics"""
    from sqlalchemy import func, case
    
    # Get developments by provider
    provider_counts = db.query(
        models.Development.provider,
        func.count(models.Development.id).label('total'),
        func.sum(case(
            (models.Development.general_status == 'Completado', 1),
            else_=0
        )).label('completed')
    ).group_by(models.Development.provider).all()
    
    provider_quality = []
    for provider, total, completed in provider_counts:
        quality_score = (completed / total * 100) if total > 0 else 0
        
        # Determine color based on quality score
        if quality_score >= 90:
            color = '#10B981'
        elif quality_score >= 80:
            color = '#F59E0B'
        else:
            color = '#EF4444'
            
        provider_quality.append({
            "name": provider or 'Sin Proveedor',
            "quality": round(quality_score, 1),
            "color": color
        })
    
    # If no data, return mock data
    if not provider_quality:
        provider_quality = [
            {"name": "Ingesoft", "quality": 95, "color": "#10B981"},
            {"name": "TI Interno", "quality": 88, "color": "#0066A5"},
            {"name": "ORACLE", "quality": 72, "color": "#EF4444"},
            {"name": "ITC", "quality": 91, "color": "#10B981"}
        ]
    
    return provider_quality