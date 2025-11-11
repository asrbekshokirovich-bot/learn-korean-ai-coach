-- Change day_of_week from single integer to array of integers
ALTER TABLE groups 
ALTER COLUMN day_of_week TYPE integer[] USING ARRAY[day_of_week];

-- Update the column to not null with default empty array for new records
ALTER TABLE groups 
ALTER COLUMN day_of_week SET DEFAULT '{}';

-- Add a check constraint to ensure valid day values (0-6)
ALTER TABLE groups
ADD CONSTRAINT valid_days_of_week CHECK (
  day_of_week <@ ARRAY[0,1,2,3,4,5,6]
);