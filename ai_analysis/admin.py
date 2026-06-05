from django.contrib import admin
from .models import FeedbackAnalysis, RiskIndex, Statistics


@admin.register(FeedbackAnalysis)
class FeedbackAnalysisAdmin(admin.ModelAdmin):
    list_display = ('feedback', 'risk_level', 'risk_score', 'sentiment', 'predicted_category', 'analyzed_at')
    list_filter = ('risk_level', 'sentiment', 'predicted_category')
    search_fields = ('feedback__uuid', 'feedback__text')
    readonly_fields = ('feedback', 'analyzed_at')
    ordering = ('-analyzed_at',)


@admin.register(RiskIndex)
class RiskIndexAdmin(admin.ModelAdmin):
    list_display = ('hospital', 'department', 'date', 'risk_index', 'total_feedback_count', 'critical_feedback_count')
    list_filter = ('hospital', 'date')
    search_fields = ('hospital__name', 'department__name')
    readonly_fields = ('created_at',)
    ordering = ('-date', '-risk_index')


@admin.register(Statistics)
class StatisticsAdmin(admin.ModelAdmin):
    list_display = ('hospital', 'date', 'period_type', 'total_feedback', 'analyzed_feedback', 'spam_feedback')
    list_filter = ('period_type', 'date')
    search_fields = ('hospital__name',)
    readonly_fields = ('created_at',)
    ordering = ('-date',)