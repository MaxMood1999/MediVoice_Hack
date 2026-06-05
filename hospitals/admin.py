from django.contrib import admin
from .models import Hospital, Department, QRCode, HospitalAdminProfile


@admin.register(Hospital)
class HospitalAdminList(admin.ModelAdmin):
    list_display = ('name', 'region', 'district', 'status', 'created_at')
    list_filter = ('status', 'region')
    search_fields = ('name', 'address', 'phone')
    ordering = ('name',)


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ('name', 'hospital', 'created_at')
    list_filter = ('hospital',)
    search_fields = ('name', 'hospital__name')
    ordering = ('hospital', 'name')


@admin.register(QRCode)
class QRCodeAdmin(admin.ModelAdmin):
    list_display = ('uuid', 'department', 'hospital', 'status', 'scan_count', 'created_at')
    list_filter = ('status', 'department__hospital')
    search_fields = ('uuid', 'department__name')
    readonly_fields = ('uuid', 'feedback_url', 'created_at', 'updated_at')
    ordering = ('-created_at',)
    
    def hospital(self, obj):
        return obj.hospital.name
    hospital.short_description = 'Hospital'


@admin.register(HospitalAdminProfile)
class HospitalAdminProfileAdminList(admin.ModelAdmin):
    list_display = ('user', 'hospital', 'position', 'created_at')
    list_filter = ('hospital',)
    search_fields = ('user__email', 'user__first_name', 'user__last_name', 'hospital__name')
    ordering = ('-created_at',)