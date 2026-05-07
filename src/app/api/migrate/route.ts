import { NextResponse } from 'next/server'
import postgres from 'postgres'

export async function GET() {
  const connectionString = process.env.DATABASE_URL!

  try {
    const sql = postgres(connectionString, { ssl: 'require', max: 1 })

    await sql`
      CREATE TABLE IF NOT EXISTS family_members (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
        name text NOT NULL,
        id_number text DEFAULT '',
        relation text DEFAULT '',
        gender text DEFAULT '',
        birth_date date,
        created_at timestamptz DEFAULT now()
      )
    `
    await sql`ALTER TABLE family_members ENABLE ROW LEVEL SECURITY`
    await sql`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT FROM pg_policies WHERE tablename = 'family_members' AND policyname = 'allow all'
        ) THEN
          CREATE POLICY "allow all" ON family_members FOR ALL USING (true) WITH CHECK (true);
        END IF;
      END $$
    `
    await sql`ALTER TABLE policies ADD COLUMN IF NOT EXISTS member_id uuid REFERENCES family_members(id) ON DELETE SET NULL`

    await sql.end()
    return NextResponse.json({ ok: true, message: 'Migration completed' })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
