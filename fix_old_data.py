from ai_analysis.models import FeedbackAnalysis
from feedback.models import FeedbackCategory

fixed = 0
for analysis in FeedbackAnalysis.objects.select_related('feedback').all():
    pc = analysis.predicted_category
    if pc and analysis.feedback.category is None:
        cat, _ = FeedbackCategory.objects.get_or_create(name=pc)
        analysis.feedback.category = cat
        analysis.feedback.save(update_fields=['category'])
        fixed += 1

print(f"Tugadi — {fixed} ta feedback category tuzatildi.")