from django.shortcuts import render, get_object_or_404
from django.http import HttpResponseNotFound
from hospitals.models import Department, QRCode


def submit_feedback_page(request, qr_uuid):
    """Render the patient feedback submission page."""
    try:
        qr_code = QRCode.objects.get(uuid=qr_uuid, status='active')
        department = qr_code.department
        
        # Check if hospital is active
        if department.hospital.status != 'active':
            return HttpResponseNotFound('Bu shifoxona hozirda faol emas')
        
        # Increment scan count
        qr_code.scan_count += 1
        qr_code.save()
        
        context = {
            'department': department,
            'qr_code': qr_code,
        }
        
        return render(request, 'feedback/submit.html', context)
    
    except QRCode.DoesNotExist:
        return HttpResponseNotFound('QR kod topilmadi yoki faol emas')