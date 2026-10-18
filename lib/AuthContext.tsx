import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'

export interface AuthUser {
  id: string
  email?: string
  user_metadata?: Record<string, any>
}

export interface AuthSession {
  user: AuthUser
  access_token?: string
}

interface MemberData {
  id: string
  member_code: string
  role: 'admin' | 'member' | 'president'
  full_name: string
  cpf: string
  status: string
  is_dependent: boolean
  primary_member_id?: string
  photo_url?: string
  category?: string
}

type AuthContextType = {
  session: AuthSession | null
  user: AuthUser | null
  member: MemberData | null
  loading: boolean
}

const AuthContext = createContext<AuthContextType>({ session: null, user: null, member: null, loading: true })

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<AuthSession | null>(null)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [member, setMember] = useState<MemberData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchMemberData = async (userId: string) => {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .eq('user_id', userId)
        .single()
      
      if (data && !error) {
        setMember(data as MemberData)
      } else {
        setMember(null)
      }
      setLoading(false)
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchMemberData(session.user.id)
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        setLoading(true)
        fetchMemberData(session.user.id)
      } else {
        setMember(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ session, user, member, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  return useContext(AuthContext)
}
