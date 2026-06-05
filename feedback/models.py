import uuid
from django.db import models
from hospitals.models import Department


class FeedbackCategory(models.Model):
    """Categories for classifying feedback."""
    
    CATEGORY_CHOICES = [
        ('cleanliness', 'Tozalik'),
        ('staff', 'Xodimlar'),
        ('queue', 'Navbat'),
        ('conditions', 'Sharoit'),
        ('treatment', 'Davolash'),
        ('food', 'Ovqat'),
        ('other', 'Boshqa'),
    ]
    
    name = models.CharField(max_length=50, choices=CATEGORY_CHOICES, unique=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'Feedback Category'
        verbose_name_plural = 'Feedback Categories'
        ordering = ['name']
    
    def __str__(self):
        return self.get_category_display()


class Feedback(models.Model):
    """Anonymous feedback from patients."""
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('analyzed', 'Analyzed'),
        ('reviewed', 'Reviewed'),
        ('resolved', 'Resolved'),
    ]
    
    uuid = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    department = models.ForeignKey(
        Department,
        on_delete=models.CASCADE,
        related_name='feedbacks'
    )
    category = models.ForeignKey(
        FeedbackCategory,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='feedbacks'
    )
    text = models.TextField()
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending'
    )
    is_spam = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Feedback'
        verbose_name_plural = 'Feedbacks'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Feedback #{self.uuid.hex[:8]} - {self.department}"
    
    @property
    def risk_score(self):
        """Get risk score from analysis if available."""
        if hasattr(self, 'analysis'):
            return self.analysis.risk_score
        return None


class AudioFile(models.Model):
    """Audio recordings from patients."""
    
    feedback = models.OneToOneField(
        Feedback,
        on_delete=models.CASCADE,
        related_name='audio_file',
        null=True,
        blank=True
    )
    file = models.FileField(upload_to='audio_feedback/')
    transcription = models.TextField(blank=True, null=True)
    transcription_status = models.CharField(
        max_length=20,
        choices=[
            ('pending', 'Pending'),
            ('processing', 'Processing'),
            ('completed', 'Completed'),
            ('failed', 'Failed'),
        ],
        default='pending'
    )
    duration = models.FloatField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'Audio File'
        verbose_name_plural = 'Audio Files'
    
    def __str__(self):
        return f"Audio for {self.feedback}" if self.feedback else f"Audio #{self.id}"