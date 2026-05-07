export type PolicyIncrease = {
  date: string
  new_price: number
  percent_change: number
}

export type Policy = {
  id: string
  client_id: string
  file_url: string
  file_name: string
  policy_number: string
  company: string
  policy_type: string
  insured_names: string[]
  current_price: number
  increases: PolicyIncrease[]
  notes: string
  extracted_at: string | null
  created_at: string
}

export type Client = {
  id: string
  name: string
  phone: string
  email: string
  id_number: string
  created_at: string
  policies?: Policy[]
}

export type Alert = {
  id: string
  policy_id: string
  increase_date: string
  new_price: number
  percent_change: number
  status: 'pending' | 'sent' | 'handled'
  agent_email_sent_at: string | null
  client_email_sent_at: string | null
  created_at: string
  policy?: Policy & { client?: Client }
}

export type Settings = {
  id: string
  agent_name: string
  agent_email: string
  referent_email: string
  updated_at: string
}
