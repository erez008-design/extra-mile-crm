-- Add privacy columns to buyer_uploads
ALTER TABLE buyer_uploads 
ADD COLUMN IF NOT EXISTS is_private boolean DEFAULT true NOT NULL;

ALTER TABLE buyer_uploads 
ADD COLUMN IF NOT EXISTS shared_with_agent boolean DEFAULT false NOT NULL;

COMMENT ON COLUMN buyer_uploads.is_private IS 'If true, only the buyer can see this upload. Agents see only activity logs.';
COMMENT ON COLUMN buyer_uploads.shared_with_agent IS 'If true, the buyer explicitly shared this file with the agent.';

-- Add sharing flag to buyer_properties for insights
ALTER TABLE buyer_properties 
ADD COLUMN IF NOT EXISTS share_insights_with_agent boolean DEFAULT false NOT NULL;

COMMENT ON COLUMN buyer_properties.share_insights_with_agent IS 'If true, liked_text and disliked_text are visible to the agent.';