from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.dashboard import DashboardSummary
from app.services import dashboard_service

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=DashboardSummary)
def dashboard_summary(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    """Numbers and charts for the logged-in user's dashboard. What's included
    depends on who's asking — see app/services/dashboard_service.py: staff get
    platform-wide figures, everyone else gets their own."""
    return dashboard_service.get_summary(db, current_user)
