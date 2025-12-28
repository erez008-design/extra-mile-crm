-- Add whatsapp_sent to the activity_action_type enum
ALTER TYPE public.activity_action_type ADD VALUE IF NOT EXISTS 'whatsapp_sent';