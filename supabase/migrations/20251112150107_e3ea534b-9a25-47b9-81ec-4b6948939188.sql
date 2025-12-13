-- Create enum for user roles
CREATE TYPE user_role AS ENUM ('client', 'agent', 'admin');

-- Create profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  role user_role NOT NULL DEFAULT 'client',
  agent_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create properties table
CREATE TABLE properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  price DECIMAL(12, 2) NOT NULL,
  size_sqm INTEGER,
  rooms INTEGER,
  floor INTEGER,
  description TEXT,
  status TEXT DEFAULT 'available',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create property_images table
CREATE TABLE property_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create property_documents table
CREATE TABLE property_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  file_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create property_views table (tracks which properties a client has seen)
CREATE TABLE property_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(property_id, client_id)
);

-- Create property_notes table (personal notes by clients)
CREATE TABLE property_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(property_id, client_id)
);

-- Create property_ratings table
CREATE TABLE property_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  is_favorite BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(property_id, client_id)
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_ratings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Agents can view their clients"
  ON profiles FOR SELECT
  USING (agent_id = auth.uid());

-- RLS Policies for properties
CREATE POLICY "Agents can view all properties"
  ON properties FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('agent', 'admin')
    )
  );

CREATE POLICY "Clients can view properties they've seen"
  ON properties FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM property_views
      WHERE property_views.property_id = properties.id
      AND property_views.client_id = auth.uid()
    )
  );

CREATE POLICY "Agents can insert properties"
  ON properties FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('agent', 'admin')
    )
  );

CREATE POLICY "Agents can update properties"
  ON properties FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('agent', 'admin')
    )
  );

-- RLS Policies for property_images
CREATE POLICY "Users can view images of accessible properties"
  ON property_images FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = property_images.property_id
      AND (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role IN ('agent', 'admin')
        )
        OR EXISTS (
          SELECT 1 FROM property_views
          WHERE property_views.property_id = properties.id
          AND property_views.client_id = auth.uid()
        )
      )
    )
  );

-- RLS Policies for property_documents
CREATE POLICY "Users can view documents of accessible properties"
  ON property_documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = property_documents.property_id
      AND (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role IN ('agent', 'admin')
        )
        OR EXISTS (
          SELECT 1 FROM property_views
          WHERE property_views.property_id = properties.id
          AND property_views.client_id = auth.uid()
        )
      )
    )
  );

-- RLS Policies for property_views
CREATE POLICY "Users can view their own property views"
  ON property_views FOR SELECT
  USING (client_id = auth.uid());

CREATE POLICY "Agents can view all property views"
  ON property_views FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('agent', 'admin')
    )
  );

CREATE POLICY "Agents can insert property views"
  ON property_views FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('agent', 'admin')
    )
  );

-- RLS Policies for property_notes
CREATE POLICY "Users can manage their own notes"
  ON property_notes FOR ALL
  USING (client_id = auth.uid())
  WITH CHECK (client_id = auth.uid());

CREATE POLICY "Agents can view client notes"
  ON property_notes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p1
      JOIN profiles p2 ON p2.agent_id = p1.id
      WHERE p1.id = auth.uid()
      AND p1.role IN ('agent', 'admin')
      AND p2.id = property_notes.client_id
    )
  );

-- RLS Policies for property_ratings
CREATE POLICY "Users can manage their own ratings"
  ON property_ratings FOR ALL
  USING (client_id = auth.uid())
  WITH CHECK (client_id = auth.uid());

-- Create function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_properties_updated_at
  BEFORE UPDATE ON properties
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_property_notes_updated_at
  BEFORE UPDATE ON property_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_property_ratings_updated_at
  BEFORE UPDATE ON property_ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'client')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for new user
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();