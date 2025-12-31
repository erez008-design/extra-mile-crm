-- Add WhatsApp auto-notify and Follow-up columns to buyers table
ALTER TABLE public.buyers 
ADD COLUMN IF NOT EXISTS whatsapp_auto_notify boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS follow_up_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS follow_up_note text,
ADD COLUMN IF NOT EXISTS last_contact_date timestamp with time zone;