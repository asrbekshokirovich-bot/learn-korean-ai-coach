-- Update default price per lesson to $16.67 ($20/hour for 50-min lessons)
ALTER TABLE lesson_packages 
ALTER COLUMN price_per_lesson SET DEFAULT 16.67;