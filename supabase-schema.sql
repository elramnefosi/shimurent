-- Settings (once per agent)
CREATE TABLE settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name text DEFAULT '',
  agent_email text DEFAULT '',
  referent_email text DEFAULT '',
  updated_at timestamptz DEFAULT now()
);
INSERT INTO settings (agent_name, agent_email, referent_email) VALUES ('', '', '');

-- Clients / Families
CREATE TABLE clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text DEFAULT '',
  email text DEFAULT '',
  id_number text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Policies
CREATE TABLE policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  file_url text DEFAULT '',
  file_name text DEFAULT '',
  policy_number text DEFAULT '',
  company text DEFAULT '',
  policy_type text DEFAULT '',
  insured_names text[] DEFAULT '{}',
  current_price numeric DEFAULT 0,
  increases jsonb DEFAULT '[]',
  notes text DEFAULT '',
  extracted_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Alerts
CREATE TABLE alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id uuid REFERENCES policies(id) ON DELETE CASCADE,
  increase_date date NOT NULL,
  new_price numeric DEFAULT 0,
  percent_change numeric DEFAULT 0,
  status text DEFAULT 'pending',
  agent_email_sent_at timestamptz,
  client_email_sent_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS (disable for local dev)
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

-- Simple open policies for single-agent use
CREATE POLICY "allow all" ON settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow all" ON clients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow all" ON policies FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow all" ON alerts FOR ALL USING (true) WITH CHECK (true);
