from django.contrib import admin
from .models import FeedbackCategory, Feedback, AudioFile


@admin.register(FeedbackCategory)
class FeedbackCategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'display_category', 'created_at')
    ordering = ('name',)
    
    def display_category(self, obj):
        return obj.get_category_display()
    display_category.short_description = 'Category'


@admin.register(Feedback)
class FeedbackAdmin(admin.ModelAdmin):
    list_display = ('uuid', 'department', 'category', 'status', 'is_spam', 'created_at')
    list_filter = ('status', 'is_spam', 'category', 'department__hospital')
    search_fields = ('uuid', 'text', 'department__name')
    readonly_fields = ('uuid', 'created_at', 'updated_at')
    ordering = ('-created_at',)
    
    actions = ['mark_as_spam', 'mark_as_reviewed']
    
    def mark_as_spam(self, request, queryset):
        queryset.update(is_spam=True, status='reviewed')
    mark_as_spam.short_description = "Mark selected as spam"
    
    def mark_as_reviewed(self, request, queryset):
        queryset.update(status='reviewed')
    mark_as_reviewed.short_description = "Mark selected as reviewed"


@admin.register(AudioFile)
class AudioFileAdmin(admin.ModelAdmin):
    list_display = ('id', 'feedback', 'transcription_status', 'duration', 'created_at')
    list_filter = ('transcription_status',)
    search_fields = ('feedback__uuid', 'transcription')
    readonly_fields = ('created_at',)
    ordering = ('-created_at',)