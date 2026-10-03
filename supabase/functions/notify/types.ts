export type Row = {
    id: string
    kind: string
    channel: string
    recipient_user?: string | null
    recipient_email: string | null
    appointment_id: string | null
    payload: Record<string, unknown>
    attempts: number
    created_at?: string
}

export type Attachment = { filename: string; content: string; content_type: string }

export type Message = { from: string; to: string; subject: string; html: string; text: string; attachments?: Attachment[] }

export type Render = (row: Row) => Message | null
