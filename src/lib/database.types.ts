// Hand-authored from docs/schema-migration.sql — do not run supabase gen types
// Regenerate manually whenever a new migration is applied.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '14.5'
  }
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          name: string
          plan_type: string | null
          contract_lives: number | null
          created_at: string | null
        }
        Insert: {
          id?: string
          name: string
          plan_type?: string | null
          contract_lives?: number | null
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          plan_type?: string | null
          contract_lives?: number | null
          created_at?: string | null
        }
      }
      providers: {
        Row: {
          id: string
          full_name: string
          specialty: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          full_name: string
          specialty?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          full_name?: string
          specialty?: string | null
          created_at?: string | null
        }
      }
      members: {
        Row: {
          id: string
          org_id: string | null
          full_name: string
          phone: string | null
          dob: string | null
          gender: string | null
          preferred_language: string | null
          risk_tier: Database['public']['Enums']['risk_tier']
          risk_drivers: Json
          risk_score: number | null
          drop_segment: Database['public']['Enums']['drop_segment']
          wallet_balance: number | null
          is_chronic: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string
          org_id?: string | null
          full_name: string
          phone?: string | null
          dob?: string | null
          gender?: string | null
          preferred_language?: string | null
          risk_tier?: Database['public']['Enums']['risk_tier']
          risk_drivers?: Json
          risk_score?: number | null
          drop_segment?: Database['public']['Enums']['drop_segment']
          wallet_balance?: number | null
          is_chronic?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: string
          org_id?: string | null
          full_name?: string
          phone?: string | null
          dob?: string | null
          gender?: string | null
          preferred_language?: string | null
          risk_tier?: Database['public']['Enums']['risk_tier']
          risk_drivers?: Json
          risk_score?: number | null
          drop_segment?: Database['public']['Enums']['drop_segment']
          wallet_balance?: number | null
          is_chronic?: boolean | null
          created_at?: string | null
        }
      }
      profiles: {
        Row: {
          id: string
          role: Database['public']['Enums']['user_role']
          full_name: string | null
          member_id: string | null
          org_id: string | null
          provider_id: string | null
          created_at: string | null
        }
        Insert: {
          id: string
          role?: Database['public']['Enums']['user_role']
          full_name?: string | null
          member_id?: string | null
          org_id?: string | null
          provider_id?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          role?: Database['public']['Enums']['user_role']
          full_name?: string | null
          member_id?: string | null
          org_id?: string | null
          provider_id?: string | null
          created_at?: string | null
        }
      }
      consultations: {
        Row: {
          id: string
          member_id: string | null
          provider_id: string | null
          consulted_at: string | null
          mode: Database['public']['Enums']['consult_mode']
          chief_complaint: string | null
          summary: string | null
        }
        Insert: {
          id?: string
          member_id?: string | null
          provider_id?: string | null
          consulted_at?: string | null
          mode?: Database['public']['Enums']['consult_mode']
          chief_complaint?: string | null
          summary?: string | null
        }
        Update: {
          id?: string
          member_id?: string | null
          provider_id?: string | null
          consulted_at?: string | null
          mode?: Database['public']['Enums']['consult_mode']
          chief_complaint?: string | null
          summary?: string | null
        }
      }
      care_plans: {
        Row: {
          id: string
          consultation_id: string | null
          member_id: string | null
          status: Database['public']['Enums']['plan_status']
          created_by: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          consultation_id?: string | null
          member_id?: string | null
          status?: Database['public']['Enums']['plan_status']
          created_by?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          consultation_id?: string | null
          member_id?: string | null
          status?: Database['public']['Enums']['plan_status']
          created_by?: string | null
          created_at?: string | null
        }
      }
      care_plan_actions: {
        Row: {
          id: string
          care_plan_id: string | null
          member_id: string | null
          action_type: Database['public']['Enums']['action_type']
          title: string
          why_plain: string | null
          clinical_priority: Database['public']['Enums']['clinical_priority']
          provenance: Database['public']['Enums']['action_provenance']
          due_date: string | null
          status: Database['public']['Enums']['action_status']
          decline_reason: string | null
          completed_via_event_id: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          care_plan_id?: string | null
          member_id?: string | null
          action_type: Database['public']['Enums']['action_type']
          title: string
          why_plain?: string | null
          clinical_priority?: Database['public']['Enums']['clinical_priority']
          provenance?: Database['public']['Enums']['action_provenance']
          due_date?: string | null
          status?: Database['public']['Enums']['action_status']
          decline_reason?: string | null
          completed_via_event_id?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          care_plan_id?: string | null
          member_id?: string | null
          action_type?: Database['public']['Enums']['action_type']
          title?: string
          why_plain?: string | null
          clinical_priority?: Database['public']['Enums']['clinical_priority']
          provenance?: Database['public']['Enums']['action_provenance']
          due_date?: string | null
          status?: Database['public']['Enums']['action_status']
          decline_reason?: string | null
          completed_via_event_id?: string | null
          created_at?: string | null
        }
      }
      nudges: {
        Row: {
          id: string
          action_id: string | null
          member_id: string | null
          channel: Database['public']['Enums']['nudge_channel']
          template_key: string | null
          status: Database['public']['Enums']['nudge_status']
          suppression_reason: string | null
          response_text: string | null
          sent_at: string | null
        }
        Insert: {
          id?: string
          action_id?: string | null
          member_id?: string | null
          channel?: Database['public']['Enums']['nudge_channel']
          template_key?: string | null
          status?: Database['public']['Enums']['nudge_status']
          suppression_reason?: string | null
          response_text?: string | null
          sent_at?: string | null
        }
        Update: {
          id?: string
          action_id?: string | null
          member_id?: string | null
          channel?: Database['public']['Enums']['nudge_channel']
          template_key?: string | null
          status?: Database['public']['Enums']['nudge_status']
          suppression_reason?: string | null
          response_text?: string | null
          sent_at?: string | null
        }
      }
      messages: {
        Row: {
          id: string
          member_id: string | null
          sender: Database['public']['Enums']['msg_sender']
          channel: Database['public']['Enums']['msg_channel']
          body: string
          created_at: string | null
        }
        Insert: {
          id?: string
          member_id?: string | null
          sender: Database['public']['Enums']['msg_sender']
          channel?: Database['public']['Enums']['msg_channel']
          body: string
          created_at?: string | null
        }
        Update: {
          id?: string
          member_id?: string | null
          sender?: Database['public']['Enums']['msg_sender']
          channel?: Database['public']['Enums']['msg_channel']
          body?: string
          created_at?: string | null
        }
      }
      clinical_events: {
        Row: {
          id: string
          member_id: string | null
          event_type: Database['public']['Enums']['clinical_event_type']
          source: Database['public']['Enums']['event_source']
          linked_action_id: string | null
          occurred_at: string | null
          payload: Json
        }
        Insert: {
          id?: string
          member_id?: string | null
          event_type: Database['public']['Enums']['clinical_event_type']
          source: Database['public']['Enums']['event_source']
          linked_action_id?: string | null
          occurred_at?: string | null
          payload?: Json
        }
        Update: {
          id?: string
          member_id?: string | null
          event_type?: Database['public']['Enums']['clinical_event_type']
          source?: Database['public']['Enums']['event_source']
          linked_action_id?: string | null
          occurred_at?: string | null
          payload?: Json
        }
      }
      navigator_tasks: {
        Row: {
          id: string
          member_id: string | null
          navigator_id: string | null
          trigger_reason: Database['public']['Enums']['task_reason']
          priority: Database['public']['Enums']['task_priority']
          status: Database['public']['Enums']['task_status']
          notes: string | null
          created_at: string | null
          resolved_at: string | null
        }
        Insert: {
          id?: string
          member_id?: string | null
          navigator_id?: string | null
          trigger_reason: Database['public']['Enums']['task_reason']
          priority?: Database['public']['Enums']['task_priority']
          status?: Database['public']['Enums']['task_status']
          notes?: string | null
          created_at?: string | null
          resolved_at?: string | null
        }
        Update: {
          id?: string
          member_id?: string | null
          navigator_id?: string | null
          trigger_reason?: Database['public']['Enums']['task_reason']
          priority?: Database['public']['Enums']['task_priority']
          status?: Database['public']['Enums']['task_status']
          notes?: string | null
          created_at?: string | null
          resolved_at?: string | null
        }
      }
      sim_state: {
        Row: {
          id: number
          current_day: string
          updated_at: string | null
        }
        Insert: {
          id?: number
          current_day: string
          updated_at?: string | null
        }
        Update: {
          id?: number
          current_day?: string
          updated_at?: string | null
        }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      user_role: 'patient' | 'navigator' | 'clinician' | 'employer_admin' | 'admin'
      risk_tier: 'low' | 'medium' | 'high'
      drop_segment:
        | 'forgot'
        | 'cost'
        | 'feels_better'
        | 'logistics'
        | 'lost_thread'
        | 'trust'
        | 'avoidance'
        | 'none'
      consult_mode: 'tele' | 'in_person'
      plan_status: 'active' | 'completed' | 'abandoned'
      action_type:
        | 'lab_test'
        | 'follow_up_consult'
        | 'medication'
        | 'vaccination'
        | 'lifestyle'
        | 'imaging'
      clinical_priority: 'mandatory' | 'recommended' | 'optional'
      action_provenance: 'clinician_authored' | 'clinician_confirmed' | 'system_suggested'
      action_status: 'pending' | 'scheduled' | 'completed' | 'snoozed' | 'declined' | 'overdue'
      nudge_channel: 'whatsapp' | 'app' | 'sms' | 'call'
      nudge_status: 'queued' | 'sent' | 'delivered' | 'read' | 'responded' | 'suppressed'
      msg_sender: 'system' | 'member' | 'navigator' | 'clinician'
      msg_channel: 'whatsapp' | 'app'
      clinical_event_type:
        | 'appointment_booked'
        | 'appointment_attended'
        | 'diagnostic_completed'
        | 'pharmacy_fulfilled'
        | 'er_visit'
        | 'home_collection_scheduled'
      event_source: 'diagnostics' | 'pharmacy' | 'clinic' | 'ambulance' | 'app'
      task_reason:
        | 'post_er_72h'
        | 'declined_mandatory'
        | 'repeat_dropper'
        | 'abnormal_result'
        | 'high_risk_overdue'
        | 'structural_barrier'
      task_priority: 'p1' | 'p2' | 'p3'
      task_status: 'open' | 'in_progress' | 'resolved' | 'snoozed'
    }
    CompositeTypes: Record<string, never>
  }
}

// ---- Simple row / insert / update helpers ----
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']

export type Enums<T extends keyof Database['public']['Enums']> =
  Database['public']['Enums'][T]
