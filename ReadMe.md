# MediVoice

AI Feedback Med — bu shifoxonalarda bemorlarning anonim fikr va murojaatlarini QR kod orqali yig‘ish, sun’iy intellekt yordamida tahlil qilish va rahbariyatga real vaqt monitoringini taqdim etuvchi platforma.

## Asosiy imkoniyatlar

* Shifoxonalar uchun alohida admin panel
* Har bir bo‘lim uchun QR kod yaratish
* QR kod orqali anonim fikr yuborish
* AI yordamida sentiment tahlili
* Dashboard va statistika
* PDF formatida QR kodlarni yuklab olish
* Super Admin boshqaruv paneli
* Murojaatlar monitoringi
* Hisobotlar va analitika

---

## Texnologiyalar

### Backend

* Python 3.12+
* Django
* Django REST Framework
* PostgreSQL
* Celery
* Redis

### Frontend

* React
* Vite
* Tailwind CSS

### AI

* OpenAI API

---

## Loyihani ishga tushirish

### 1. Repository ni yuklab olish

```bash
git clone <repository_url>
cd AI-Feedback-Med
```

### 2. Virtual muhit yaratish

```bash
python -m venv .venv
```

### 3. Virtual muhitni aktivlashtirish

Windows:

```bash
.venv\Scripts\activate
```

Linux/macOS:

```bash
source .venv/bin/activate
```

### 4. Kutubxonalarni o‘rnatish

```bash
pip install -r requirements.txt
```

### 5. .env fayl yaratish

Misol:

```env
SECRET_KEY=your-secret-key
DEBUG=True

ALLOWED_HOSTS=localhost,127.0.0.1,172.20.10.3

OPENAI_API_KEY=your-openai-api-key

REDIS_URL=redis://localhost:6379/0
```

### 6. Migratsiyalarni bajarish

```bash
python manage.py makemigrations
python manage.py migrate
```

### 7. Superuser yaratish

```bash
python manage.py createsuperuser
```

### 8. Serverni ishga tushirish

Lokal:

```bash
python manage.py runserver
```

Tarmoq orqali:

```bash
python manage.py runserver 0.0.0.0:8000
```

---

## Admin Panel

Admin panel:

```
http://127.0.0.1:8000/admin
```

yoki

```
http://<server-ip>:8000/admin
```

---

## QR Kod Ishlatilishi

1. Admin yangi bo‘lim yaratadi.
2. Tizim QR kod generatsiya qiladi.
3. QR kod shifoxonaga joylashtiriladi.
4. Bemor QR kodni skanerlaydi.
5. Fikr yoki murojaat qoldiradi.
6. AI murojaatni tahlil qiladi.
7. Natijalar dashboardda ko‘rinadi.

---

## Ishlab chiqarish muhiti (Production)

Production uchun tavsiya etiladi:

* Nginx
* Gunicorn
* PostgreSQL
* Redis
* SSL sertifikat
* Linux Server (Ubuntu)

---

## Muallif
 
Tech Club Med Team
