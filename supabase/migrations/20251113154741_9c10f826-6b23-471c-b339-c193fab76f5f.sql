-- Change rooms column from integer to numeric to support decimal values like 3.5, 4.5
ALTER TABLE public.properties 
ALTER COLUMN rooms TYPE numeric USING rooms::numeric;