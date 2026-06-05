from rest_framework import serializers
from .models import Hospital, Department, QRCode, HospitalAdminProfile


class HospitalSerializer(serializers.ModelSerializer):
    """Serializer for Hospital model."""
    
    departments_count = serializers.IntegerField(read_only=True)
    active_qr_codes_count = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = Hospital
        fields = ['id', 'name', 'region', 'district', 'address', 'phone', 'status', 
                  'departments_count', 'active_qr_codes_count', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class HospitalListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for listing hospitals."""
    
    class Meta:
        model = Hospital
        fields = ['id', 'name', 'region', 'district', 'status', 'created_at']


class HospitalDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for hospital with nested data."""
    
    departments = serializers.SerializerMethodField()
    
    class Meta:
        model = Hospital
        fields = ['id', 'name', 'region', 'district', 'address', 'phone', 'status', 
                  'departments', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_departments(self, obj):
        departments = obj.departments.all()
        return [{'id': d.id, 'name': d.name} for d in departments]


class DepartmentSerializer(serializers.ModelSerializer):
    """Serializer for Department model."""
    
    hospital_name = serializers.CharField(source='hospital.name', read_only=True)
    qrcodes_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Department
        fields = ['id', 'hospital', 'hospital_name', 'name', 'qrcodes_count', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_qrcodes_count(self, obj):
        return obj.qrcodes.filter(status='active').count()


class DepartmentListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for listing departments."""
    
    hospital_name = serializers.CharField(source='hospital.name', read_only=True)
    
    class Meta:
        model = Department
        fields = ['id', 'hospital', 'hospital_name', 'name', 'created_at']


class QRCodeSerializer(serializers.ModelSerializer):
    """Serializer for QRCode model."""
    
    feedback_url = serializers.CharField(read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)
    hospital_name = serializers.CharField(source='hospital.name', read_only=True)
    
    class Meta:
        model = QRCode
        fields = ['id', 'uuid', 'department', 'department_name', 'hospital_name', 
                  'status', 'feedback_url', 'pdf_file', 'scan_count', 
                  'last_scanned_at', 'created_at', 'updated_at']
        read_only_fields = ['id', 'uuid', 'last_scanned_at', 'created_at', 'updated_at']


class QRCodeListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for listing QR codes."""
    
    department_name = serializers.CharField(source='department.name', read_only=True)
    hospital_name = serializers.CharField(source='hospital.name', read_only=True)
    
    class Meta:
        model = QRCode
        fields = ['id', 'uuid', 'department_name', 'hospital_name', 'status', 
                  'feedback_url', 'scan_count', 'created_at']


class HospitalAdminProfileSerializer(serializers.ModelSerializer):
    """Serializer for HospitalAdminProfile model."""
    
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_name = serializers.SerializerMethodField()
    hospital_name = serializers.CharField(source='hospital.name', read_only=True)
    
    class Meta:
        model = HospitalAdminProfile
        fields = ['id', 'user', 'user_email', 'user_name', 'hospital', 'hospital_name', 
                  'position', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_user_name(self, obj):
        return obj.user.get_full_name() or obj.user.username