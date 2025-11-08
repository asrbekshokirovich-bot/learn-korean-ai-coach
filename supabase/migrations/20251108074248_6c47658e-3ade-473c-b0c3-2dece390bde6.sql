-- Create lesson packages table to track student credits
CREATE TABLE lesson_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES auth.users(id) NOT NULL,
  lessons_purchased integer NOT NULL,
  lessons_remaining integer NOT NULL,
  lessons_used integer NOT NULL DEFAULT 0,
  price_per_lesson numeric NOT NULL DEFAULT 30.00,
  total_amount_paid numeric NOT NULL,
  purchase_date timestamp with time zone NOT NULL DEFAULT now(),
  month_period date NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create monthly payments table
CREATE TABLE monthly_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES auth.users(id) NOT NULL,
  package_id uuid REFERENCES lesson_packages(id),
  amount_paid numeric NOT NULL,
  payment_method text,
  payment_status text NOT NULL DEFAULT 'completed',
  payment_date timestamp with time zone NOT NULL DEFAULT now(),
  month_period date NOT NULL,
  transaction_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create finance tracking table for admin
CREATE TABLE finance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_type text NOT NULL, -- 'student_payment', 'teacher_payout', 'platform_revenue'
  amount numeric NOT NULL,
  student_id uuid REFERENCES auth.users(id),
  teacher_id uuid REFERENCES auth.users(id),
  lesson_id uuid REFERENCES lessons(id),
  payment_id uuid REFERENCES monthly_payments(id),
  description text,
  record_date timestamp with time zone NOT NULL DEFAULT now(),
  month_period date NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add package_id to lessons table
ALTER TABLE lessons ADD COLUMN package_id uuid REFERENCES lesson_packages(id);

-- Enable RLS
ALTER TABLE lesson_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_records ENABLE ROW LEVEL SECURITY;

-- RLS Policies for lesson_packages
CREATE POLICY "Students can view their own packages"
ON lesson_packages FOR SELECT
USING (auth.uid() = student_id);

CREATE POLICY "Students can insert their own packages"
ON lesson_packages FOR INSERT
WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Admins can manage all packages"
ON lesson_packages FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for monthly_payments
CREATE POLICY "Students can view their own payments"
ON monthly_payments FOR SELECT
USING (auth.uid() = student_id);

CREATE POLICY "Students can insert their own payments"
ON monthly_payments FOR INSERT
WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Admins can manage all payments"
ON monthly_payments FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for finance_records
CREATE POLICY "Admins can manage all finance records"
ON finance_records FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers can view their own payouts"
ON finance_records FOR SELECT
USING (auth.uid() = teacher_id AND record_type = 'teacher_payout');

-- Create trigger to update lesson package when lesson is completed
CREATE OR REPLACE FUNCTION update_package_on_lesson_complete()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' AND NEW.package_id IS NOT NULL THEN
    UPDATE lesson_packages
    SET 
      lessons_used = lessons_used + 1,
      lessons_remaining = lessons_remaining - 1,
      updated_at = now()
    WHERE id = NEW.package_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_lesson_completed
AFTER UPDATE ON lessons
FOR EACH ROW
EXECUTE FUNCTION update_package_on_lesson_complete();

-- Create function to rollover unused lessons
CREATE OR REPLACE FUNCTION rollover_unused_lessons(_student_id uuid, _old_month date, _new_month date)
RETURNS uuid AS $$
DECLARE
  _old_package lesson_packages;
  _new_package_id uuid;
BEGIN
  -- Get the old package
  SELECT * INTO _old_package
  FROM lesson_packages
  WHERE student_id = _student_id 
    AND month_period = _old_month
    AND status = 'active'
  LIMIT 1;

  IF _old_package.lessons_remaining > 0 THEN
    -- Mark old package as rolled over
    UPDATE lesson_packages
    SET status = 'rolled_over', updated_at = now()
    WHERE id = _old_package.id;

    -- Create rollover record
    INSERT INTO lesson_packages (
      student_id,
      lessons_purchased,
      lessons_remaining,
      lessons_used,
      price_per_lesson,
      total_amount_paid,
      month_period,
      status
    ) VALUES (
      _student_id,
      _old_package.lessons_remaining,
      _old_package.lessons_remaining,
      0,
      _old_package.price_per_lesson,
      0, -- No payment for rollover
      _new_month,
      'rollover'
    ) RETURNING id INTO _new_package_id;

    RETURN _new_package_id;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;