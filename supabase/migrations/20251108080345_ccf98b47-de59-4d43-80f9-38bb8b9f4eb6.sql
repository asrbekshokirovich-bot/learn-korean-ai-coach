-- Update default price per lesson to $20 per 50-min lesson
ALTER TABLE lesson_packages 
ALTER COLUMN price_per_lesson SET DEFAULT 20.00;