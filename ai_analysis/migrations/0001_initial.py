import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('feedback', '0001_initial'),
        ('hospitals', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='FeedbackAnalysis',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('risk_score', models.FloatField(help_text='Risk score from 0 to 100')),
                ('risk_level', models.CharField(choices=[('low', 'Low'), ('medium', 'Medium'), ('high', 'High'), ('critical', 'Critical')], default='low', max_length=20)),
                ('predicted_category', models.CharField(blank=True, help_text='AI predicted category', max_length=100, null=True)),
                ('spam_probability', models.FloatField(default=0.0, help_text='Probability of being spam (0-1)')),
                ('sentiment', models.CharField(choices=[('positive', 'Positive'), ('neutral', 'Neutral'), ('negative', 'Negative')], default='neutral', max_length=20)),
                ('sentiment_score', models.FloatField(default=0.0)),
                ('key_issues', models.TextField(blank=True, help_text='JSON list of key issues')),
                ('suggestions', models.TextField(blank=True, help_text='AI-generated suggestions')),
                ('raw_response', models.TextField(blank=True)),
                ('analyzed_at', models.DateTimeField(auto_now_add=True)),
                ('feedback', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='analysis', to='feedback.feedback')),
            ],
            options={
                'verbose_name': 'Feedback Analysis',
                'verbose_name_plural': 'Feedback Analyses',
                'ordering': ['-analyzed_at'],
            },
        ),
        migrations.CreateModel(
            name='RiskIndex',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('total_feedback_count', models.IntegerField(default=0)),
                ('negative_feedback_count', models.IntegerField(default=0)),
                ('critical_feedback_count', models.IntegerField(default=0)),
                ('repeat_issue_count', models.IntegerField(default=0)),
                ('risk_index', models.FloatField(default=0.0)),
                ('date', models.DateField()),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('hospital', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='risk_indices', to='hospitals.hospital')),
                ('department', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='risk_indices', to='hospitals.department')),
            ],
            options={
                'verbose_name': 'Risk Index',
                'verbose_name_plural': 'Risk Indices',
                'ordering': ['-date'],
                'unique_together': {('hospital', 'department', 'date')},
            },
        ),
        migrations.CreateModel(
            name='Statistics',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('total_feedback', models.IntegerField(default=0)),
                ('analyzed_feedback', models.IntegerField(default=0)),
                ('spam_feedback', models.IntegerField(default=0)),
                ('category_breakdown', models.TextField(blank=True, help_text='JSON of category counts')),
                ('low_risk_count', models.IntegerField(default=0)),
                ('medium_risk_count', models.IntegerField(default=0)),
                ('high_risk_count', models.IntegerField(default=0)),
                ('critical_risk_count', models.IntegerField(default=0)),
                ('date', models.DateField()),
                ('period_type', models.CharField(choices=[('daily', 'Daily'), ('weekly', 'Weekly'), ('monthly', 'Monthly')], max_length=20)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('hospital', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='statistics', to='hospitals.hospital')),
            ],
            options={
                'verbose_name': 'Statistics',
                'verbose_name_plural': 'Statistics',
                'ordering': ['-date'],
            },
        ),
    ]
