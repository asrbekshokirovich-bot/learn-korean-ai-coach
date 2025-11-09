-- Update default price per lesson to 10000 KRW
ALTER TABLE lesson_packages 
ALTER COLUMN price_per_lesson SET DEFAULT 10000.00;