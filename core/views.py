from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from .serializers import UserSerializer, UserCreateSerializer, UserListSerializer
from .models import User
from hospitals.models import Hospital, HospitalAdminProfile


class CustomTokenObtainPairView(TokenObtainPairView):
    """Login — JWT token + user ma'lumotlarini qaytaradi."""

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            user = User.objects.get(username=request.data.get('username'))
            response.data['user'] = UserSerializer(user).data
        return response


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def register_user(request):
    """
    Yangi admin yaratish.
    Faqat super_admin bajara oladi.
    hospital_admin yaratilganda hospital_id ham talab qilinadi.
    """
    # Faqat super_admin yangi foydalanuvchi yarata oladi
    if not request.user.is_superuser and request.user.role != 'super_admin':
        return Response(
            {'error': 'Faqat super admin yangi foydalanuvchi yarata oladi'},
            status=status.HTTP_403_FORBIDDEN
        )

    serializer = UserCreateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    user = serializer.save()

    # Agar hospital_admin yaratilayotgan bo'lsa — shifoxonaga biriktirish
    if user.role == 'hospital_admin':
        hospital_id = request.data.get('hospital_id')
        if not hospital_id:
            user.delete()
            return Response(
                {'error': 'hospital_admin uchun hospital_id majburiy'},
                status=status.HTTP_400_BAD_REQUEST
            )
        try:
            hospital = Hospital.objects.get(id=hospital_id)
        except Hospital.DoesNotExist:
            user.delete()
            return Response(
                {'error': 'Shifoxona topilmadi'},
                status=status.HTTP_404_NOT_FOUND
            )
        HospitalAdminProfile.objects.create(
            user=user,
            hospital=hospital,
            position=request.data.get('position', '')
        )

    return Response({
        'message': 'Foydalanuvchi muvaffaqiyatli yaratildi',
        'user': UserSerializer(user).data
    }, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_users(request):
    """
    Barcha foydalanuvchilar ro'yxati.
    super_admin — hammani ko'radi.
    hospital_admin — faqat o'z shifoxonasining adminlarini ko'radi.
    """
    user = request.user

    if user.is_superuser or user.role == 'super_admin':
        users = User.objects.all().order_by('-created_at')
    elif hasattr(user, 'hospital_admin_profile'):
        hospital = user.hospital_admin_profile.hospital
        hospital_user_ids = HospitalAdminProfile.objects.filter(
            hospital=hospital
        ).values_list('user_id', flat=True)
        users = User.objects.filter(id__in=hospital_user_ids)
    else:
        return Response({'error': 'Ruxsat yo\'q'}, status=status.HTTP_403_FORBIDDEN)

    serializer = UserListSerializer(users, many=True)
    return Response(serializer.data)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def user_detail(request, pk):
    """Foydalanuvchini ko'rish, tahrirlash yoki o'chirish."""
    try:
        user = User.objects.get(pk=pk)
    except User.DoesNotExist:
        return Response({'error': 'Foydalanuvchi topilmadi'}, status=status.HTTP_404_NOT_FOUND)

    # Faqat super_admin o'zgartira va o'chira oladi
    if request.method in ['PUT', 'DELETE']:
        if not request.user.is_superuser and request.user.role != 'super_admin':
            return Response({'error': 'Ruxsat yo\'q'}, status=status.HTTP_403_FORBIDDEN)

    if request.method == 'GET':
        return Response(UserSerializer(user).data)

    elif request.method == 'PUT':
        serializer = UserSerializer(user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == 'DELETE':
        # O'zini o'chira olmaydi
        if user == request.user:
            return Response(
                {'error': 'O\'zingizni o\'chira olmaysiz'},
                status=status.HTTP_400_BAD_REQUEST
            )
        user.delete()
        return Response({'message': 'Foydalanuvchi o\'chirildi'}, status=status.HTTP_204_NO_CONTENT)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def current_user(request):
    """Joriy foydalanuvchi ma'lumotlari."""
    return Response(UserSerializer(request.user).data)
