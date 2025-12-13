-- Add agent_id column to properties table
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS agent_id uuid;

-- Add foreign key constraint
ALTER TABLE public.properties 
ADD CONSTRAINT fk_properties_agent 
FOREIGN KEY (agent_id) 
REFERENCES auth.users(id) 
ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_properties_agent_id 
ON public.properties(agent_id);