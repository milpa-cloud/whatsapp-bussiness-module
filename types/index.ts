export type ContactType = 'lead' | 'cliente' | 'proveedor'

export type ConversationStatus = 'active' | 'archived'

export type ConversationMode = 'bot' | 'human'

export type MessageDirection = 'inbound' | 'outbound'

export type ProjectStatus =
  | 'cotizacion'
  | 'aprobado'
  | 'produccion'
  | 'entrega'
  | 'completado'

export type UserRole = 'owner' | 'admin' | 'taller' | 'atencion'

export interface Contact {
  id: string
  phone: string
  name: string | null
  type: ContactType
  created_at: string
}

export interface Conversation {
  id: string
  contact_id: string
  project_id: string | null
  status: ConversationStatus
  mode: ConversationMode
  last_message_at: string | null
  created_at: string
  contact?: Contact
}

export interface Message {
  id: string
  conversation_id: string
  direction: MessageDirection
  content: string
  media_url: string | null
  wa_message_id: string | null
  created_at: string
  read_at: string | null
}

export interface InternalNote {
  id: string
  conversation_id: string
  user_id: string
  content: string
  created_at: string
}

export interface Project {
  id: string
  contact_id: string
  title: string
  description: string
  status: ProjectStatus
  estimated_delivery: string | null
  created_at: string
  contact?: Contact
}

export interface UserProfile {
  id: string
  name: string
  role: UserRole
}

export interface WhatsAppWebhookPayload {
  object: string
  entry: WhatsAppEntry[]
}

export interface WhatsAppEntry {
  id: string
  changes: WhatsAppChange[]
}

export interface WhatsAppChange {
  value: WhatsAppValue
  field: string
}

export interface WhatsAppValue {
  messaging_product: string
  metadata: {
    display_phone_number: string
    phone_number_id: string
  }
  contacts?: Array<{ profile: { name: string }; wa_id: string }>
  messages?: WhatsAppInboundMessage[]
  statuses?: WhatsAppStatus[]
}

export interface WhatsAppInboundMessage {
  from: string
  id: string
  timestamp: string
  type: 'text' | 'image' | 'video' | 'audio' | 'document'
  text?: { body: string }
}

export interface WhatsAppStatus {
  id: string
  status: 'sent' | 'delivered' | 'read' | 'failed'
  timestamp: string
  recipient_id: string
}
