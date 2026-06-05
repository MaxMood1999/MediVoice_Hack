import uuid
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('hospitals', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='FeedbackCategory',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(choices=[('cleanliness', 'Tozalik'), ('staff', 'Xodimlar'), ('queue', 'Navbat'), ('conditions', 'Sharoit'), ('treatment', 'Davolash'), ('food', 'Ovqat'), ('other', 'Boshqa')], max_length=50, unique=True)),
                ('description', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'verbose_name': 'Feedback Category',
                'verbose_name_plural': 'Feedback Categories',
                'ordering': ['name'],
            },
        ),
        migrations.CreateModel(
            name='Feedback',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('uuid', models.UUIDField(default=uuid.uuid4, editable=False, unique=True)),
                ('text', models.TextField()),
                ('status', models.CharField(choices=[('pending', 'Pending'), ('analyzed', 'Analyzed'), ('reviewed', 'Reviewed'), ('resolved', 'Resolved')], default='pending', max_length=20)),
                ('is_spam', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('department', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='feedbacks', to='hospitals.department')),
                ('category', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='feedbacks', to='feedback.feedbackcategory')),
            ],
            options={
                'verbose_name': 'Feedback',
                'verbose_name_plural': 'Feedbacks',
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='AudioFile',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('file', models.FileField(upload_to='audio_feedback/')),
                ('transcription', models.TextField(blank=True, null=True)),
                ('transcription_status', models.CharField(choices=[('pending', 'Pending'), ('processing', 'Processing'), ('completed', 'Completed'), ('failed', 'Failed')], default='pending', max_length=20)),
                ('duration', models.FloatField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('feedback', models.OneToOneField(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='audio_file', to='feedback.feedback')),
            ],
            options={
                'verbose_name': 'Audio File',
                'verbose_name_plural': 'Audio Files',
            },
        ),
    ]
