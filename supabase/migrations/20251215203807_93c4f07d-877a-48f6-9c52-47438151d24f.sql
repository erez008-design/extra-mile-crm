-- Convert parking_type from text to text array
ALTER TABLE property_extended_details 
ALTER COLUMN parking_type TYPE text[] 
USING CASE 
  WHEN parking_type IS NULL THEN NULL
  WHEN parking_type = '' THEN NULL
  ELSE ARRAY[parking_type]
END;