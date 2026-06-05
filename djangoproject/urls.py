from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from core.views import CustomTokenObtainPairView, register_user, list_users, user_detail, current_user
from hospitals.views import HospitalViewSet, DepartmentViewSet, QRCodeViewSet, HospitalAdminProfileViewSet, hospital_statistics
from feedback.views import (
    FeedbackCategoryViewSet, FeedbackViewSet, AudioFileViewSet,
    submit_feedback, get_feedback_form, get_feedback_by_uuid, upload_audio, trigger_transcription
)
from feedback.views_web import submit_feedback_page
from ai_analysis.views import (
    FeedbackAnalysisViewSet, RiskIndexViewSet, StatisticsViewSet,
    analyze_feedback, analyze_all_pending, calculate_risk_index,
    dashboard_statistics, hospital_dashboard
)

# API Router
router = DefaultRouter()

# Hospital endpoints
router.register(r'hospitals', HospitalViewSet, basename='hospital')
router.register(r'departments', DepartmentViewSet, basename='department')
router.register(r'qrcodes', QRCodeViewSet, basename='qrcode')
router.register(r'hospital-admins', HospitalAdminProfileViewSet, basename='hospital-admin')

# Feedback endpoints
router.register(r'feedback-categories', FeedbackCategoryViewSet, basename='feedback-category')
router.register(r'feedback', FeedbackViewSet, basename='feedback')
router.register(r'audio-files', AudioFileViewSet, basename='audio-file')

# AI Analysis endpoints
router.register(r'analysis', FeedbackAnalysisViewSet, basename='analysis')
router.register(r'risk-index', RiskIndexViewSet, basename='risk-index')
router.register(r'statistics', StatisticsViewSet, basename='statistics')

urlpatterns = [
    # Admin
    path('admin/', admin.site.urls),
    
    # Public feedback page (QR code landing page)
    path('f/<uuid:qr_uuid>/', submit_feedback_page, name='feedback-page'),
    
    # API endpoints
    path('api/', include([
        # Authentication
        path('auth/login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
        path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
        path('auth/register/', register_user, name='register'),
        path('auth/me/', current_user, name='current_user'),
        
        # User management (admin only)
        path('users/', list_users, name='user-list'),
        path('users/<int:pk>/', user_detail, name='user-detail'),
        
        # Public feedback endpoints
        path('feedback/submit/', submit_feedback, name='feedback-submit'),
        path('feedback/form/<uuid:department_uuid>/', get_feedback_form, name='feedback-form'),
        path('feedback/<uuid:uuid>/', get_feedback_by_uuid, name='feedback-detail'),
        path('feedback/audio/upload/', upload_audio, name='audio-upload'),
        path('feedback/audio/<int:audio_id>/transcribe/', trigger_transcription, name='audio-transcribe'),
        
        # AI Analysis
        path('analysis/analyze/', analyze_feedback, name='analyze-feedback'),
        path('analysis/analyze-all/', analyze_all_pending, name='analyze-all-pending'),
        path('analysis/risk-index/<int:hospital_id>/', calculate_risk_index, name='calculate-risk-index'),
        
        # Dashboard
        path('dashboard/', dashboard_statistics, name='dashboard-statistics'),
        path('dashboard/hospital/<int:hospital_id>/', hospital_dashboard, name='hospital-dashboard'),
        path('hospitals/<int:hospital_id>/statistics/', hospital_statistics, name='hospital-statistics'),
        
        # ViewSet endpoints
        path('', include(router.urls)),
    ])),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)