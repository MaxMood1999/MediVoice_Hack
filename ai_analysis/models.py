from django.db import models
from feedback.models import Feedback


class FeedbackAnalysis(models.Model):
    """AI analysis results for feedback."""
    
    RISK_LEVEL_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    ]
    
    feedback = models.OneToOneField(
        Feedback,
        on_delete=models.CASCADE,
        related_name='analysis'
    )
    
    # AI Analysis results
    risk_score = models.FloatField(help_text="Risk score from 0 to 100")
    risk_level = models.CharField(
        max_length=20,
        choices=RISK_LEVEL_CHOICES,
        default='low'
    )
    
    # Categorization
    predicted_category = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text="AI predicted category"
    )
    
    # Spam detection
    spam_probability = models.FloatField(
        default=0.0,
        help_text="Probability of being spam (0-1)"
    )
    
    # Sentiment analysis
    sentiment = models.CharField(
        max_length=20,
        choices=[
            ('positive', 'Positive'),
            ('neutral', 'Neutral'),
            ('negative', 'Negative'),
        ],
        default='neutral'
    )
    sentiment_score = models.FloatField(default=0.0)
    
    # Key issues extracted
    key_issues = models.TextField(blank=True, help_text="JSON list of key issues")
    
    # Suggestions for improvement
    suggestions = models.TextField(blank=True, help_text="AI-generated suggestions")
    
    # Raw AI response for debugging
    raw_response = models.TextField(blank=True)
    
    analyzed_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'Feedback Analysis'
        verbose_name_plural = 'Feedback Analyses'
        ordering = ['-analyzed_at']
    
    def __str__(self):
        return f"Analysis for {self.feedback} - Risk: {self.risk_level}"


class RiskIndex(models.Model):
    """Aggregated risk metrics for hospitals/departments."""
    
    hospital = models.ForeignKey(
        'hospitals.Hospital',
        on_delete=models.CASCADE,
        related_name='risk_indices'
    )
    department = models.ForeignKey(
        'hospitals.Department',
        on_delete=models.CASCADE,
        related_name='risk_indices',
        null=True,
        blank=True
    )
    
    # Metrics
    total_feedback_count = models.IntegerField(default=0)
    negative_feedback_count = models.IntegerField(default=0)
    critical_feedback_count = models.IntegerField(default=0)
    repeat_issue_count = models.IntegerField(default=0)
    
    # Calculated risk index (0-100)
    risk_index = models.FloatField(default=0.0)
    
    # Period
    date = models.DateField()
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'Risk Index'
        verbose_name_plural = 'Risk Indices'
        ordering = ['-date']
        unique_together = ['hospital', 'department', 'date']
    
    def __str__(self):
        dept_str = f" - {self.department}" if self.department else ""
        return f"{self.hospital}{dept_str} - {self.date} (Risk: {self.risk_index:.1f})"


class Statistics(models.Model):
    """Daily statistics aggregation."""
    
    hospital = models.ForeignKey(
        'hospitals.Hospital',
        on_delete=models.CASCADE,
        related_name='statistics',
        null=True,
        blank=True
    )
    
    # Counts
    total_feedback = models.IntegerField(default=0)
    analyzed_feedback = models.IntegerField(default=0)
    spam_feedback = models.IntegerField(default=0)
    
    # Category breakdown (stored as JSON)
    category_breakdown = models.TextField(blank=True, help_text="JSON of category counts")
    
    # Risk distribution
    low_risk_count = models.IntegerField(default=0)
    medium_risk_count = models.IntegerField(default=0)
    high_risk_count = models.IntegerField(default=0)
    critical_risk_count = models.IntegerField(default=0)
    
    # Period
    date = models.DateField()
    period_type = models.CharField(
        max_length=20,
        choices=[
            ('daily', 'Daily'),
            ('weekly', 'Weekly'),
            ('monthly', 'Monthly'),
        ]
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'Statistics'
        verbose_name_plural = 'Statistics'
        ordering = ['-date']
    
    def __str__(self):
        return f"{self.hospital or 'System'} - {self.period_type} - {self.date}"