from rest_framework import status, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAdminUser
from rest_framework.response import Response
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from .models import FeedbackCategory, Feedback, AudioFile
from .serializers import (
    FeedbackCategorySerializer,
    FeedbackListSerializer, FeedbackDetailSerializer, FeedbackCreateSerializer,
    AudioFileSerializer, AudioUploadSerializer
)
from hospitals.models import Department, QRCode
import uuid


def auto_analyze(feedback):
    """Automatically analyze feedback after submission."""
    try:
        from ai_analysis.views import simulate_ai_analysis, analyze_with_openai
        from ai_analysis.models import FeedbackAnalysis
        import json

        # Try OpenAI first, fallback to simulate
        result = analyze_with_openai(feedback.text) or simulate_ai_analysis(feedback.text)

        FeedbackAnalysis.objects.update_or_create(
            feedback=feedback,
            defaults={
                'risk_score': result.get('risk_score', 20),
                'risk_level': result.get('risk_level', 'low'),
                'predicted_category': result.get('predicted_category', 'other'),
                'spam_probability': result.get('spam_probability', 0.1),
                'sentiment': result.get('sentiment', 'neutral'),
                'sentiment_score': result.get('sentiment_score', 0.0),
                'key_issues': result.get('key_issues', '[]'),
                'suggestions': result.get('suggestions', ''),
            }
        )
        feedback.status = 'analyzed'
        feedback.is_spam = result.get('spam_probability', 0.1) > 0.7
        feedback.save()
    except Exception as e:
        print(f"Auto-analyze error: {e}")


class FeedbackCategoryViewSet(viewsets.ModelViewSet):
    """ViewSet for FeedbackCategory CRUD operations."""

    queryset = FeedbackCategory.objects.all()
    serializer_class = FeedbackCategorySerializer
    permission_classes = [IsAuthenticated]
    ordering_fields = ['name']


class FeedbackViewSet(viewsets.ModelViewSet):
    """ViewSet for Feedback operations."""

    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'is_spam', 'category', 'department', 'department__hospital']
    search_fields = ['uuid', 'text']
    ordering_fields = ['created_at', 'updated_at']

    def get_serializer_class(self):
        if self.action == 'list':
            return FeedbackListSerializer
        elif self.action == 'retrieve':
            return FeedbackDetailSerializer
        return FeedbackDetailSerializer

    def get_queryset(self):
        """Filter feedback based on user role."""
        user = self.request.user

        if user.is_superuser:
            return Feedback.objects.all()

        # Hospital admins can only see feedback from their hospital
        if hasattr(user, 'hospital_admin_profile'):
            hospital = user.hospital_admin_profile.hospital
            return Feedback.objects.filter(department__hospital=hospital)

        return Feedback.objects.none()


@api_view(['POST'])
@permission_classes([AllowAny])
def submit_feedback(request):
    """Submit anonymous feedback."""
    serializer = FeedbackCreateSerializer(data=request.data)
    if serializer.is_valid():
        feedback = serializer.save()
        auto_analyze(feedback)
        return Response({
            'message': 'Feedback submitted successfully',
            'uuid': str(feedback.uuid),
            'status': feedback.status
        }, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([AllowAny])
def get_feedback_form(request, department_uuid):
    """Get feedback form for a specific department."""
    try:
        department = Department.objects.get(uuid=department_uuid)
        if department.hospital.status != 'active':
            return Response(
                {'error': 'This hospital is not accepting feedback'},
                status=status.HTTP_400_BAD_REQUEST
            )
    except Department.DoesNotExist:
        return Response({'error': 'Department not found'}, status=status.HTTP_404_NOT_FOUND)

    categories = FeedbackCategory.objects.all()
    return Response({
        'department': {
            'id': str(department.id),
            'name': department.name,
            'hospital': department.hospital.name
        },
        'categories': FeedbackCategorySerializer(categories, many=True).data
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def get_feedback_by_uuid(request, uuid):
    """Get feedback by UUID (for anonymous access)."""
    try:
        feedback = Feedback.objects.get(uuid=uuid)
    except Feedback.DoesNotExist:
        return Response({'error': 'Feedback not found'}, status=status.HTTP_404_NOT_FOUND)

    # Only return basic info for anonymous users
    return Response({
        'uuid': str(feedback.uuid),
        'status': feedback.status,
        'created_at': feedback.created_at,
        'department': feedback.department.name,
        'hospital': feedback.department.hospital.name,
    })


class AudioFileViewSet(viewsets.ModelViewSet):
    """ViewSet for AudioFile operations."""

    queryset = AudioFile.objects.all()
    serializer_class = AudioFileSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['transcription_status']
    ordering_fields = ['created_at']


@api_view(['POST'])
@permission_classes([AllowAny])
def upload_audio(request):
    """Upload audio feedback."""
    serializer = AudioUploadSerializer(data=request.data)
    if serializer.is_valid():
        audio_file = request.FILES.get('audio')
        department_uuid = serializer.validated_data['department_uuid']

        try:
            department = Department.objects.get(uuid=department_uuid)
        except Department.DoesNotExist:
            return Response({'error': 'Department not found'}, status=status.HTTP_404_NOT_FOUND)

        # Create feedback with audio
        feedback = Feedback.objects.create(
            department=department,
            text='[Audio feedback]'
        )

        # Save audio file
        audio_instance = AudioFile.objects.create(
            feedback=feedback,
            file=audio_file
        )

        return Response({
            'message': 'Audio feedback submitted successfully',
            'feedback_uuid': str(feedback.uuid),
            'audio_id': audio_instance.id
        }, status=status.HTTP_201_CREATED)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def trigger_transcription(request, audio_id):
    """Trigger transcription for an audio file."""
    try:
        audio = AudioFile.objects.get(id=audio_id)
    except AudioFile.DoesNotExist:
        return Response({'error': 'Audio file not found'}, status=status.HTTP_404_NOT_FOUND)

    # Update status to processing
    audio.transcription_status = 'processing'
    audio.save()

    # In production, this would trigger a Celery task
    # For now, return a message
    return Response({
        'message': 'Transcription started',
        'audio_id': audio.id,
        'status': 'processing'
    })