from rest_framework import serializers
from .models import FeedbackCategory, Feedback, AudioFile


class FeedbackCategorySerializer(serializers.ModelSerializer):
    """Serializer for FeedbackCategory model."""

    display_name = serializers.CharField(source='get_category_display', read_only=True)

    class Meta:
        model = FeedbackCategory
        fields = ['id', 'name', 'display_name', 'description', 'created_at']
        read_only_fields = ['id', 'created_at']


class FeedbackListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for listing feedback."""

    department_name = serializers.CharField(source='department.name', read_only=True)
    hospital_name = serializers.CharField(source='department.hospital.name', read_only=True)
    category_display = serializers.CharField(source='category.get_category_display', read_only=True)
    risk_level = serializers.CharField(source='analysis.risk_level', read_only=True)

    class Meta:
        model = Feedback
        fields = ['id', 'uuid', 'department_name', 'hospital_name', 'category',
                  'category_display', 'status', 'is_spam', 'risk_level', 'created_at']


class FeedbackDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for feedback."""

    department_name = serializers.CharField(source='department.name', read_only=True)
    hospital_name = serializers.CharField(source='department.hospital.name', read_only=True)
    category_display = serializers.CharField(source='category.get_category_display', read_only=True)
    analysis = serializers.SerializerMethodField()

    class Meta:
        model = Feedback
        fields = ['id', 'uuid', 'department', 'department_name', 'hospital_name',
                  'category', 'category_display', 'text', 'status', 'is_spam',
                  'analysis', 'created_at', 'updated_at']
        read_only_fields = ['id', 'uuid', 'created_at', 'updated_at']

    def get_analysis(self, obj):
        if hasattr(obj, 'analysis'):
            return {
                'risk_score': obj.analysis.risk_score,
                'risk_level': obj.analysis.risk_level,
                'sentiment': obj.analysis.sentiment,
                'predicted_category': obj.analysis.predicted_category,
                'key_issues': obj.analysis.key_issues,
                'suggestions': obj.analysis.suggestions,
            }
        return None


class FeedbackCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating feedback (anonymous)."""

    department_uuid = serializers.UUIDField(write_only=True)

    class Meta:
        model = Feedback
        fields = ['department_uuid', 'text']

    def validate_department_uuid(self, value):
        from hospitals.models import Department
        try:
            department = Department.objects.get(uuid=value)
            if department.hospital.status != 'active':
                raise serializers.ValidationError("This hospital is not accepting feedback.")
            return department
        except Department.DoesNotExist:
            raise serializers.ValidationError("Invalid department UUID.")

    def create(self, validated_data):
        department = validated_data.pop('department_uuid')
        text = validated_data.pop('text')
        feedback = Feedback.objects.create(department=department, text=text)
        return feedback


class AudioFileSerializer(serializers.ModelSerializer):
    """Serializer for AudioFile model."""

    feedback_uuid = serializers.CharField(source='feedback.uuid', read_only=True)

    class Meta:
        model = AudioFile
        fields = ['id', 'feedback_uuid', 'file', 'transcription',
                  'transcription_status', 'duration', 'created_at']
        read_only_fields = ['id', 'transcription', 'transcription_status', 'duration', 'created_at']


class AudioUploadSerializer(serializers.Serializer):
    """Serializer for uploading audio files."""

    audio = serializers.FileField()
    department_uuid = serializers.UUIDField()

    def validate_department_uuid(self, value):
        from hospitals.models import Department
        try:
            department = Department.objects.get(uuid=value)
            if department.hospital.status != 'active':
                raise serializers.ValidationError("This hospital is not accepting feedback.")
            return department
        except Department.DoesNotExist:
            raise serializers.ValidationError("Invalid department UUID.")