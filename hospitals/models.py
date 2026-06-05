
import uuid
from django.db import models
from django.conf import settings


class Hospital(models.Model):

    """Hospital model representing medical facilities."""
    
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('suspended', 'Suspended'),
    ]
    
    name = models.CharField(max_length=255)
    region = models.CharField(max_length=100)  # viloyat
    district = models.CharField(max_length=100)  # tuman
    address = models.TextField()
    phone = models.CharField(max_length=20)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='active'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Hospital'
        verbose_name_plural = 'Hospitals'
        ordering = ['name']
    
    def __str__(self):
        return f"{self.name} ({self.region})"
    
    @property
    def departments_count(self):
        return self.departments.count()
    
    @property
    def active_qr_codes_count(self):
        # QRCode is defined later in this module - use lazy reference
        return self.departments.prefetch_related('qrcodes').aggregate(
            count=models.Sum(
                models.Case(
                    models.When(qrcodes__status='active', then=1),
                    default=0,
                    output_field=models.IntegerField()
                )
            )
        )['count'] or 0


class Department(models.Model):
    """Department model for hospital departments/wards."""
    
    uuid = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    hospital = models.ForeignKey(
        Hospital,
        on_delete=models.CASCADE,
        related_name='departments'
    )
    name = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Department'
        verbose_name_plural = 'Departments'
        ordering = ['name']
        unique_together = ['hospital', 'name']
    
    def __str__(self):
        return f"{self.hospital.name} - {self.name}"


class QRCode(models.Model):
    """QR Code for department feedback access."""
    
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('deactivated', 'Deactivated'),
    ]
    
    uuid = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    department = models.ForeignKey(
        Department,
        on_delete=models.CASCADE,
        related_name='qrcodes'
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='active'
    )
    pdf_file = models.FileField(upload_to='qr_pdfs/', blank=True, null=True)
    scan_count = models.IntegerField(default=0)
    last_scanned_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'QR Code'
        verbose_name_plural = 'QR Codes'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"QR {self.uuid.hex[:8]} - {self.department}"
    
    @property
    def feedback_url(self):
        """Generate the feedback URL for this QR code."""
        return f"http://172.20.10.3:8000/f/{self.uuid}"
    
    @property
    def hospital(self):
        """Get hospital from department."""
        return self.department.hospital


class HospitalAdminProfile(models.Model):
    """Profile for hospital administrators."""
    
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='hospital_admin_profile'
    )
    hospital = models.ForeignKey(
        Hospital,
        on_delete=models.CASCADE,
        related_name='admins'
    )
    position = models.CharField(max_length=100, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Hospital Admin'
        verbose_name_plural = 'Hospital Admins'
    
    def __str__(self):
        return f"{self.user.get_full_name() or self.user.email} - {self.hospital.name}"
