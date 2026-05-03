type UsersRow = {
  id: string
  name: string
  apartment: string
  tower: string
  phone: string
  input_mode: 'have' | 'need'
  display_key: string
  created_at: string
}

type UserStickersRow = {
  id: string
  user_id: string
  sticker_id: number
}

export type Database = {
  public: {
    Tables: {
      users: {
        Row: UsersRow
        Insert: Omit<UsersRow, 'id' | 'created_at'> & { id?: string; created_at?: string }
        Update: Partial<Omit<UsersRow, 'id'>>
        Relationships: []
      }
      user_stickers: {
        Row: UserStickersRow
        Insert: Omit<UserStickersRow, 'id'> & { id?: string }
        Update: Partial<Omit<UserStickersRow, 'id'>>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
