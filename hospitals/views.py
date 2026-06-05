from rest_framework import status, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from .models import Hospital, Department, QRCode, HospitalAdminProfile
from .serializers import (
    HospitalSerializer, HospitalListSerializer, HospitalDetailSerializer,
    DepartmentSerializer, DepartmentListSerializer,
    QRCodeSerializer, QRCodeListSerializer,
    HospitalAdminProfileSerializer
)
import qrcode
from io import BytesIO
from django.http import HttpResponse
from django.db import models as django_models


def is_super_admin(user):
    return user.is_superuser or user.role == 'super_admin'

def get_user_hospital(user):
    """Hospital admin uchun o'z shifoxonasini qaytaradi."""
    if hasattr(user, 'hospital_admin_profile'):
        return user.hospital_admin_profile.hospital
    return None


class HospitalViewSet(viewsets.ModelViewSet):
    """
    Super admin: barcha shifoxonalarni ko'radi, qo'shadi, o'zgartiradi.
    Hospital admin: FAQAT o'z shifoxonasini ko'radi. Qo'sha olmaydi.
    """
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'region']
    search_fields = ['name', 'address', 'phone']
    ordering_fields = ['name', 'created_at']

    def get_serializer_class(self):
        if self.action == 'list':
            return HospitalListSerializer
        elif self.action == 'retrieve':
            return HospitalDetailSerializer
        return HospitalSerializer

    def get_queryset(self):
        user = self.request.user
        if is_super_admin(user):
            return Hospital.objects.all()
        hospital = get_user_hospital(user)
        if hospital:
            return Hospital.objects.filter(id=hospital.id)
        return Hospital.objects.none()

    def create(self, request, *args, **kwargs):
        if not is_super_admin(request.user):
            return Response(
                {'error': 'Faqat super admin shifoxona qo\'sha oladi'},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        if not is_super_admin(request.user):
            return Response(
                {'error': 'Faqat super admin o\'zgartira oladi'},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        if not is_super_admin(request.user):
            return Response(
                {'error': 'Faqat super admin o\'chira oladi'},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().destroy(request, *args, **kwargs)


class DepartmentViewSet(viewsets.ModelViewSet):
    """
    Super admin: barcha departamentlarni boshqaradi.
    Hospital admin: FAQAT o'z shifoxonasining departamentlarini ko'radi.
    """
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['hospital']
    search_fields = ['name']
    ordering_fields = ['name', 'created_at']

    def get_serializer_class(self):
        if self.action == 'list':
            return DepartmentListSerializer
        return DepartmentSerializer

    def get_queryset(self):
        user = self.request.user
        if is_super_admin(user):
            return Department.objects.all()
        hospital = get_user_hospital(user)
        if hospital:
            return Department.objects.filter(hospital=hospital)
        return Department.objects.none()

    def create(self, request, *args, **kwargs):
        # Hospital admin faqat o'z shifoxonasiga departament qo'sha oladi
        if not is_super_admin(request.user):
            hospital = get_user_hospital(request.user)
            if not hospital:
                return Response({'error': 'Ruxsat yo\'q'}, status=status.HTTP_403_FORBIDDEN)
            # So'rovdagi hospital o'zinikimi tekshir
            hospital_id = request.data.get('hospital')
            if str(hospital.id) != str(hospital_id):
                return Response(
                    {'error': 'Faqat o\'z shifoxonangizga departament qo\'sha olasiz'},
                    status=status.HTTP_403_FORBIDDEN
                )
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        if not is_super_admin(request.user):
            hospital = get_user_hospital(request.user)
            dept = self.get_object()
            if not hospital or dept.hospital != hospital:
                return Response({'error': 'Ruxsat yo\'q'}, status=status.HTTP_403_FORBIDDEN)
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        if not is_super_admin(request.user):
            return Response(
                {'error': 'Faqat super admin o\'chira oladi'},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().destroy(request, *args, **kwargs)


class QRCodeViewSet(viewsets.ModelViewSet):
    """
    Super admin: barcha QR kodlarni boshqaradi.
    Hospital admin: faqat o'z shifoxonasining QR kodlari.
    """
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'department', 'department__hospital']
    search_fields = ['uuid']
    ordering_fields = ['created_at', 'scan_count']

    def get_serializer_class(self):
        if self.action == 'list':
            return QRCodeListSerializer
        return QRCodeSerializer

    def get_queryset(self):
        user = self.request.user
        if is_super_admin(user):
            return QRCode.objects.all()
        hospital = get_user_hospital(user)
        if hospital:
            return QRCode.objects.filter(department__hospital=hospital)
        return QRCode.objects.none()

    def perform_create(self, serializer):
        instance = serializer.save()
        self._generate_qr_image(instance)

    def _generate_qr_image(self, qr_code):
        qr_img = qrcode.make(qr_code.feedback_url)
        buffer = BytesIO()
        qr_img.save(buffer, format='PNG')
        buffer.seek(0)
        from django.core.files.base import ContentFile
        qr_code.pdf_file.save(
            f'qr_{qr_code.uuid.hex}.png',
            ContentFile(buffer.getvalue()),
            save=True
        )


class HospitalAdminProfileViewSet(viewsets.ModelViewSet):
    """Faqat super admin ko'ra va boshqara oladi."""
    permission_classes = [IsAuthenticated]
    serializer_class = HospitalAdminProfileSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter]
    filterset_fields = ['hospital', 'user']
    search_fields = ['user__email', 'user__first_name', 'user__last_name']

    def get_queryset(self):
        user = self.request.user
        if is_super_admin(user):
            return HospitalAdminProfile.objects.all()
        hospital = get_user_hospital(user)
        if hospital:
            return HospitalAdminProfile.objects.filter(hospital=hospital)
        return HospitalAdminProfile.objects.none()

    def create(self, request, *args, **kwargs):
        if not is_super_admin(request.user):
            return Response({'error': 'Ruxsat yo\'q'}, status=status.HTTP_403_FORBIDDEN)
        return super().create(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        if not is_super_admin(request.user):
            return Response({'error': 'Ruxsat yo\'q'}, status=status.HTTP_403_FORBIDDEN)
        return super().destroy(request, *args, **kwargs)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def hospital_statistics(request, hospital_id):
    """Shifoxona statistikasi."""
    try:
        hospital = Hospital.objects.get(id=hospital_id)
    except Hospital.DoesNotExist:
        return Response({'error': 'Shifoxona topilmadi'}, status=status.HTTP_404_NOT_FOUND)

    # Hospital admin faqat o'zinikini ko'ra oladi
    if not is_super_admin(request.user):
        user_hospital = get_user_hospital(request.user)
        if not user_hospital or user_hospital.id != hospital.id:
            return Response({'error': 'Ruxsat yo\'q'}, status=status.HTTP_403_FORBIDDEN)

    total_feedback = hospital.departments.aggregate(
        total=django_models.Count('feedbacks')
    )['total'] or 0

    critical_feedback = hospital.departments.aggregate(
        critical=django_models.Count(
            'feedbacks',
            filter=django_models.Q(feedbacks__analysis__risk_level='critical')
        )
    )['critical'] or 0

    avg_risk_score = hospital.departments.aggregate(
        avg=django_models.Avg('feedbacks__analysis__risk_score')
    )['avg'] or 0

    return Response({
        'hospital': HospitalSerializer(hospital).data,
        'total_feedback': total_feedback,
        'critical_feedback': critical_feedback,
        'avg_risk_score': round(avg_risk_score, 2),
    })
