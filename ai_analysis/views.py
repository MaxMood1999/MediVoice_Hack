from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from rest_framework import viewsets
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from django.db.models import Count, Avg, Q, Sum
from django.conf import settings
from datetime import datetime, timedelta
import json
import os

from .models import FeedbackAnalysis, RiskIndex, Statistics
from .serializers import (
    FeedbackAnalysisSerializer, FeedbackAnalysisCreateSerializer,
    RiskIndexSerializer, RiskIndexListSerializer,
    StatisticsSerializer, DashboardStatisticsSerializer
)
from feedback.models import Feedback
from hospitals.models import Hospital, Department, QRCode

# OpenAI integration
try:
    from openai import OpenAI

    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False


class FeedbackAnalysisViewSet(viewsets.ModelViewSet):
    """ViewSet for FeedbackAnalysis operations."""

    queryset = FeedbackAnalysis.objects.all()
    serializer_class = FeedbackAnalysisSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['risk_level', 'sentiment', 'predicted_category']
    search_fields = ['feedback__uuid', 'feedback__text']
    ordering_fields = ['analyzed_at', 'risk_score']

    def get_queryset(self):
        """Filter analysis based on user role."""
        user = self.request.user

        if user.is_superuser:
            return FeedbackAnalysis.objects.all()

        # Hospital admins can only see analysis for their hospital
        if hasattr(user, 'hospital_admin_profile'):
            hospital = user.hospital_admin_profile.hospital
            return FeedbackAnalysis.objects.filter(feedback__department__hospital=hospital)

        return FeedbackAnalysis.objects.none()


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def analyze_feedback(request):
    """Analyze a single feedback using AI."""
    serializer = FeedbackAnalysisCreateSerializer(data=request.data)
    if serializer.is_valid():
        feedback_id = serializer.validated_data['feedback_id']
        text = serializer.validated_data['text']

        try:
            feedback = Feedback.objects.get(id=feedback_id)
        except Feedback.DoesNotExist:
            return Response({'error': 'Feedback not found'}, status=status.HTTP_404_NOT_FOUND)

        # Check if already analyzed
        if hasattr(feedback, 'analysis'):
            return Response({
                'message': 'Feedback already analyzed',
                'analysis': FeedbackAnalysisSerializer(feedback.analysis).data
            })

        # In production, this would call OpenAI API
        # For now, simulate AI analysis
        analysis_data = simulate_ai_analysis(text)

        # Create analysis
        analysis = FeedbackAnalysis.objects.create(
            feedback=feedback,
            **analysis_data
        )

        # Update feedback status
        feedback.status = 'analyzed'
        feedback.save()

        return Response(FeedbackAnalysisSerializer(analysis).data, status=status.HTTP_201_CREATED)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


def analyze_with_openai(text):
    """Analyze feedback using OpenAI API."""
    print(f"\n[OpenAI] analyze_with_openai chaqirildi. Matn: '{text[:60]}'")

    if not OPENAI_AVAILABLE:
        print("[OpenAI] openai kutubxonasi o'rnatilmagan!")
        return None

    api_key = os.getenv('OPENAI_API_KEY') or settings.OPENAI_API_KEY
    if not api_key:
        print("[OpenAI] API key topilmadi!")
        return None

    print(f"[OpenAI] API key topildi: {api_key[:15]}...")

    try:
        client = OpenAI(api_key=api_key)

        prompt = f"""Analyze the following patient feedback from a hospital. Provide your analysis in JSON format.

Feedback text: "{text}"

Please analyze and provide:
1. risk_score: A number from 0-100 indicating the severity of the issue
2. risk_level: One of 'low', 'medium', 'high', 'critical'
3. predicted_category: One of 'cleanliness', 'staff', 'queue', 'conditions', 'treatment', 'food', 'other'
4. spam_probability: A number from 0-1 indicating likelihood of spam
5. sentiment: One of 'positive', 'neutral', 'negative'
6. sentiment_score: A number from -1 to 1
7. key_issues: A JSON array of key issues in Uzbek language
8. suggestions: Improvement suggestions in Uzbek language

Respond ONLY with a valid JSON object. No markdown, no extra text."""

        print("[OpenAI] GPT-4o-mini ga so'rov yuborilmoqda...")

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system",
                 "content": "You are a healthcare feedback analyst. Always write key_issues and suggestions in Uzbek language."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            max_tokens=500
        )

        raw = response.choices[0].message.content
        print(f"[OpenAI] GPT javobi: {raw}")

        result = json.loads(raw)
        print(
            f"[OpenAI] Tahlil muvaffaqiyatli: risk_level={result.get('risk_level')}, category={result.get('predicted_category')}")
        return result

    except json.JSONDecodeError as e:
        print(f"[OpenAI] JSON parse xatosi: {e}")
        return None
    except Exception as e:
        print(f"[OpenAI] Xato: {type(e).__name__}: {e}")
        return None


def transcribe_with_whisper(audio_file_path):
    """Transcribe audio using OpenAI Whisper API."""
    if not OPENAI_AVAILABLE:
        return None

    api_key = os.getenv('OPENAI_API_KEY', settings.OPENAI_API_KEY)
    if not api_key or api_key == '':
        return None

    try:
        client = OpenAI(api_key=api_key)

        with open(audio_file_path, 'rb') as audio:
            transcription = client.audio.transcriptions.create(
                model="whisper-1",
                file=audio,
                language="uz"  # Uzbek language
            )

        return transcription.text

    except Exception as e:
        print(f"Whisper API error: {e}")
        return None


def simulate_ai_analysis(text):
    """Simulate AI analysis (fallback when OpenAI is not available)."""
    # Simple keyword-based analysis for demo
    negative_keywords = ['yomon', 'yaxshi emas', 'muammo', 'shikoyat', 'noqulay', 'kamchilik',
                         'nosoz', ' buzilgan', 'iflos', 'xunuk', 'qo\'pol', 'e\'tiborsiz']
    critical_keywords = ['jiddiy', 'xavf', 'xavfsizlik', 'o\'lim', 'o\'limgacha', 'tez yordam',
                         'shoshilinch', 'hayot', 'o\'lim']
    positive_keywords = ['yaxshi', 'rahmat', 'minnatdor', 'a\'lo', 'sifatli', 'yordamchi',
                         'mehribon', ' professional']

    text_lower = text.lower()

    # Calculate risk score
    negative_count = sum(1 for word in negative_keywords if word in text_lower)
    critical_count = sum(1 for word in critical_keywords if word in text_lower)
    positive_count = sum(1 for word in positive_keywords if word in text_lower)

    # Adjust risk score based on positive/negative balance
    base_score = 20
    risk_score = min(100, max(0, base_score + (negative_count * 15) + (critical_count * 30) - (positive_count * 10)))

    # Determine risk level
    if risk_score >= 80:
        risk_level = 'critical'
    elif risk_score >= 60:
        risk_level = 'high'
    elif risk_score >= 30:
        risk_level = 'medium'
    else:
        risk_level = 'low'

    # Sentiment analysis
    if negative_count > positive_count + 1:
        sentiment = 'negative'
        sentiment_score = min(-0.3, -0.5 - (negative_count * 0.1))
    elif positive_count > negative_count:
        sentiment = 'positive'
        sentiment_score = min(0.8, 0.3 + (positive_count * 0.15))
    else:
        sentiment = 'neutral'
        sentiment_score = 0.0

    # Spam probability (simple heuristic)
    spam_probability = 0.1 if len(text) > 15 else 0.5
    if len(text) < 5:
        spam_probability = 0.8

    # Simple category detection based on keywords
    category_keywords = {
        'cleanliness': ['toza', 'iflos', 'chiqindi', 'axlat', 'yuvish', 'dezinfeksiya'],
        'staff': ['shifokor', 'hamshira', 'xodim', 'munosabat', 'qo\'pol', 'madaniyat'],
        'queue': ['navbat', 'kutish', 'uzoq', 'ketma-ket', 'oldinga'],
        'conditions': ['sharoit', 'bino', 'ta\'mirlash', 'joy', 'xona'],
        'treatment': ['davolash', 'dori', 'retsept', 'tashxis', 'operatsiya'],
        'food': ['ovqat', 'taom', 'nonushta', 'tushlik', 'kechki ovqat', 'menyu']
    }

    predicted_category = 'other'
    max_matches = 0
    for category, keywords in category_keywords.items():
        matches = sum(1 for keyword in keywords if keyword in text_lower)
        if matches > max_matches:
            max_matches = matches
            predicted_category = category

    # Generate key issues
    key_issues = []
    if negative_count > 0:
        key_issues.append("Salbiy fikr-mulohaza mavjud")
    if critical_count > 0:
        key_issues.append("Jiddiy muammo aniqlandi")
    if "navbat" in text_lower:
        key_issues.append("Navbat muammosi")
    if "toza" in text_lower or "iflos" in text_lower:
        key_issues.append("Tozalik muammosi")

    # Generate suggestions
    suggestions = "Muammo ko\'rib chiqildi. Batafsil tahlil uchun mas\'ul xodimlarga murojaat qiling."
    if predicted_category == 'cleanliness':
        suggestions = "Tozalikni yaxshilash uchun qo\'shimcha dezinfeksiya ishlarini o\'tkazing."
    elif predicted_category == 'queue':
        suggestions = "Navbatni optimallashtirish uchun elektron navbat tizimini joriy eting."
    elif predicted_category == 'staff':
        suggestions = "Xodimlar uchun qo\'shimcha o\'qitish va malaka oshirish kurslarini tashkil eting."

    return {
        'risk_score': risk_score,
        'risk_level': risk_level,
        'predicted_category': predicted_category,
        'spam_probability': round(spam_probability, 2),
        'sentiment': sentiment,
        'sentiment_score': round(sentiment_score, 2),
        'key_issues': json.dumps(key_issues),
        'suggestions': suggestions,
    }


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def analyze_all_pending(request):
    """Analyze all pending feedback."""
    pending_feedback = Feedback.objects.filter(status='pending')

    # Check permissions
    user = request.user
    if hasattr(user, 'hospital_admin_profile'):
        hospital = user.hospital_admin_profile.hospital
        pending_feedback = pending_feedback.filter(department__hospital=hospital)
    elif not user.is_superuser:
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

    count = 0
    for feedback in pending_feedback:
        if not hasattr(feedback, 'analysis'):
            analysis_data = simulate_ai_analysis(feedback.text)
            FeedbackAnalysis.objects.create(feedback=feedback, **analysis_data)
            feedback.status = 'analyzed'
            feedback.save()
            count += 1

    return Response({'message': f'Analyzed {count} feedback items'})


class RiskIndexViewSet(viewsets.ModelViewSet):
    """ViewSet for RiskIndex operations."""

    queryset = RiskIndex.objects.all()
    serializer_class = RiskIndexListSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['hospital', 'date']
    ordering_fields = ['date', 'risk_index']


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def calculate_risk_index(request, hospital_id):
    """Calculate risk index for a hospital."""
    try:
        hospital = Hospital.objects.get(id=hospital_id)
    except Hospital.DoesNotExist:
        return Response({'error': 'Hospital not found'}, status=status.HTTP_404_NOT_FOUND)

    # Get feedback from last 30 days
    thirty_days_ago = timezone.now() - timedelta(days=30)
    feedbacks = Feedback.objects.filter(
        department__hospital=hospital,
        created_at__gte=thirty_days_ago
    )

    # Calculate metrics
    total_count = feedbacks.count()
    negative_count = feedbacks.filter(analysis__sentiment='negative').count()
    critical_count = feedbacks.filter(analysis__risk_level='critical').count()

    # Calculate risk index (0-100)
    if total_count == 0:
        risk_index = 0
    else:
        risk_index = min(100, (negative_count / total_count * 50) + (critical_count / total_count * 50))

    # Save or update risk index
    today = timezone.now().date()
    risk_obj, created = RiskIndex.objects.update_or_create(
        hospital=hospital,
        date=today,
        defaults={
            'total_feedback_count': total_count,
            'negative_feedback_count': negative_count,
            'critical_feedback_count': critical_count,
            'risk_index': round(risk_index, 2)
        }
    )

    return Response(RiskIndexSerializer(risk_obj).data)


class StatisticsViewSet(viewsets.ModelViewSet):
    """ViewSet for Statistics operations."""

    queryset = Statistics.objects.all()
    serializer_class = StatisticsSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['hospital', 'date', 'period_type']
    ordering_fields = ['date']


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_statistics(request):
    """Get dashboard statistics for super admin."""
    user = request.user

    # Only super admins can see all statistics
    if not user.is_superuser:
        # Hospital admins see their hospital stats
        if hasattr(user, 'hospital_admin_profile'):
            hospital = user.hospital_admin_profile.hospital
            hospitals = Hospital.objects.filter(id=hospital.id)
        else:
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
    else:
        hospitals = Hospital.objects.all()

    today = timezone.now().date()
    today_feedback = Feedback.objects.filter(
        department__hospital__in=hospitals,
        created_at__date=today
    )

    # Get departments
    departments = Department.objects.filter(hospital__in=hospitals)

    # Calculate risk distribution
    today_analysis = FeedbackAnalysis.objects.filter(
        feedback__department__hospital__in=hospitals,
        analyzed_at__date=today
    )

    data = {
        'total_hospitals': hospitals.count(),
        'total_departments': departments.count(),
        'total_feedback_today': today_feedback.count(),
        'critical_feedback_today': today_feedback.filter(analysis__risk_level='critical').count(),
        'low_risk_count': today_analysis.filter(risk_level='low').count(),
        'medium_risk_count': today_analysis.filter(risk_level='medium').count(),
        'high_risk_count': today_analysis.filter(risk_level='high').count(),
        'critical_risk_count': today_analysis.filter(risk_level='critical').count(),
    }

    # Top problematic hospitals
    hospital_risks = []
    for h in hospitals:
        h_feedback = Feedback.objects.filter(department__hospital=h, created_at__date=today)
        h_critical = h_feedback.filter(analysis__risk_level='critical').count()
        if h_critical > 0:
            hospital_risks.append({
                'id': h.id,
                'name': h.name,
                'critical_count': h_critical,
                'total_count': h_feedback.count()
            })

    data['top_problematic'] = sorted(hospital_risks, key=lambda x: x['critical_count'], reverse=True)[:5]

    # Feedback trend (last 7 days)
    trend = []
    for i in range(7):
        date = today - timedelta(days=i)
        count = Feedback.objects.filter(
            department__hospital__in=hospitals,
            created_at__date=date
        ).count()
        trend.append({'date': date.isoformat(), 'count': count})

    data['feedback_trend'] = trend

    # Category breakdown (all time for this hospital)
    all_analysis = FeedbackAnalysis.objects.filter(
        feedback__department__hospital__in=hospitals
    )
    category_counts = {}
    category_labels = {
        'cleanliness': 'Tozalik',
        'staff': 'Xodimlar',
        'queue': 'Navbat',
        'conditions': 'Sharoit',
        'treatment': 'Davolash',
        'food': 'Ovqat',
        'other': 'Boshqa',
    }
    for cat_key, cat_label in category_labels.items():
        count = all_analysis.filter(predicted_category=cat_key).count()
        if count > 0:
            category_counts[cat_key] = {'label': cat_label, 'count': count}
    data['category_breakdown'] = category_counts

    # Recent critical feedbacks with key issues
    recent_critical = FeedbackAnalysis.objects.filter(
        feedback__department__hospital__in=hospitals,
        risk_level__in=['high', 'critical']
    ).select_related('feedback', 'feedback__department', 'feedback__department__hospital').order_by('-analyzed_at')[:10]

    recent_issues = []
    for a in recent_critical:
        recent_issues.append({
            'feedback_id': a.feedback.id,
            'text': a.feedback.text[:120],
            'department': a.feedback.department.name,
            'hospital': a.feedback.department.hospital.name,
            'risk_level': a.risk_level,
            'key_issues': a.key_issues,
            'predicted_category': category_labels.get(a.predicted_category, a.predicted_category),
            'created_at': a.feedback.created_at.isoformat(),
        })
    data['recent_issues'] = recent_issues

    return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def hospital_dashboard(request, hospital_id):
    """Get dashboard statistics for a specific hospital."""
    try:
        hospital = Hospital.objects.get(id=hospital_id)
    except Hospital.DoesNotExist:
        return Response({'error': 'Hospital not found'}, status=status.HTTP_404_NOT_FOUND)

    # Check permissions
    user = request.user
    if hasattr(user, 'hospital_admin_profile'):
        if user.hospital_admin_profile.hospital != hospital:
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
    elif not user.is_superuser:
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

    today = timezone.now().date()
    week_ago = today - timedelta(days=7)
    month_ago = today - timedelta(days=30)

    # Today's stats
    today_feedback = Feedback.objects.filter(
        department__hospital=hospital,
        created_at__date=today
    )

    # Week stats
    week_feedback = Feedback.objects.filter(
        department__hospital=hospital,
        created_at__date__gte=week_ago
    )

    # Month stats
    month_feedback = Feedback.objects.filter(
        department__hospital=hospital,
        created_at__date__gte=month_ago
    )

    data = {
        'hospital': {'id': hospital.id, 'name': hospital.name},
        'today': {
            'total': today_feedback.count(),
            'critical': today_feedback.filter(analysis__risk_level='critical').count(),
            'spam': today_feedback.filter(is_spam=True).count(),
        },
        'week': {
            'total': week_feedback.count(),
            'critical': week_feedback.filter(analysis__risk_level='critical').count(),
        },
        'month': {
            'total': month_feedback.count(),
            'critical': month_feedback.filter(analysis__risk_level='critical').count(),
        },
        'departments': {
            'total': hospital.departments.count(),
            'active_qr': QRCode.objects.filter(department__hospital=hospital, status='active').count(),
        }
    }

    return Response(data)