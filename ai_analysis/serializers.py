import json
from rest_framework import serializers
from .models import FeedbackAnalysis, RiskIndex, Statistics


class FeedbackAnalysisSerializer(serializers.ModelSerializer):

    feedback_uuid = serializers.CharField(source='feedback.uuid', read_only=True)
    feedback_text = serializers.CharField(source='feedback.text', read_only=True)

    # FIX 4: key_issues raw string emas, JSON list sifatida qaytariladi
    key_issues = serializers.SerializerMethodField()

    class Meta:
        model = FeedbackAnalysis
        fields = [
            'id', 'feedback', 'feedback_uuid', 'feedback_text',
            'risk_score', 'risk_level', 'predicted_category',
            'spam_probability', 'sentiment', 'sentiment_score',
            'key_issues', 'suggestions', 'analyzed_at',
        ]
        read_only_fields = ['id', 'analyzed_at']

    def get_key_issues(self, obj):
        try:
            return json.loads(obj.key_issues)
        except Exception:
            return []


class FeedbackAnalysisCreateSerializer(serializers.Serializer):

    feedback_id = serializers.IntegerField()
    text = serializers.CharField()

    # AI natijalari (ixtiyoriy, qo'lda tahlil uchun)
    risk_score = serializers.FloatField(required=False)
    risk_level = serializers.CharField(required=False)
    predicted_category = serializers.CharField(required=False)
    spam_probability = serializers.FloatField(required=False)
    sentiment = serializers.CharField(required=False)
    sentiment_score = serializers.FloatField(required=False)
    key_issues = serializers.CharField(required=False)
    suggestions = serializers.CharField(required=False)


class RiskIndexSerializer(serializers.ModelSerializer):

    hospital_name = serializers.CharField(source='hospital.name', read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)

    class Meta:
        model = RiskIndex
        fields = [
            'id', 'hospital', 'hospital_name', 'department', 'department_name',
            'total_feedback_count', 'negative_feedback_count', 'critical_feedback_count',
            'repeat_issue_count', 'risk_index', 'date', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class RiskIndexListSerializer(serializers.ModelSerializer):

    hospital_name = serializers.CharField(source='hospital.name', read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)

    class Meta:
        model = RiskIndex
        fields = [
            'id', 'hospital_name', 'department_name',
            'risk_index', 'total_feedback_count', 'critical_feedback_count', 'date',
        ]


class StatisticsSerializer(serializers.ModelSerializer):

    hospital_name = serializers.CharField(source='hospital.name', read_only=True)

    # category_breakdown ham JSON string — list sifatida qaytaramiz
    category_breakdown = serializers.SerializerMethodField()

    class Meta:
        model = Statistics
        fields = [
            'id', 'hospital', 'hospital_name', 'date', 'period_type',
            'total_feedback', 'analyzed_feedback', 'spam_feedback',
            'category_breakdown',
            'low_risk_count', 'medium_risk_count', 'high_risk_count', 'critical_risk_count',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']

    def get_category_breakdown(self, obj):
        try:
            return json.loads(obj.category_breakdown)
        except Exception:
            return {}


class DashboardStatisticsSerializer(serializers.Serializer):

    total_hospitals = serializers.IntegerField()
    total_departments = serializers.IntegerField()
    total_feedback_today = serializers.IntegerField()
    critical_feedback_today = serializers.IntegerField()

    low_risk_count = serializers.IntegerField()
    medium_risk_count = serializers.IntegerField()
    high_risk_count = serializers.IntegerField()
    critical_risk_count = serializers.IntegerField()

    category_breakdown = serializers.DictField(child=serializers.IntegerField())

    top_problematic = serializers.ListField()
    feedback_trend = serializers.ListField()