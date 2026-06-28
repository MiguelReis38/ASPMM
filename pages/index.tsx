import React, { useState, useEffect } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import Link from 'next/link'

export default function Login() {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const { session, member, loading: authLoading } = useAuth()

  useEffect(() => {
    if (session) {
      if (member) {
        if (member.role === 'admin' || member.role === 'president') {
          router.push('/admin/dashboard')
        } else {
          router.push('/member/dashboard')
        }
      } else if (!authLoading) {
        setLoading(false)
        setError("Perfil não encontrado ou sem permissão. Tente relogar ou verifique seu cadastro.")
      }
    }
  }, [session, member, router, authLoading])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      let finalEmail = identifier.trim();

      // If it's not an email (e.g. member code), resolve it using the smart login API
      if (!finalEmail.includes('@')) {
        const res = await fetch('/api/auth/member-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier: finalEmail, password })
        })
        const data = await res.json()
        if (!res.ok) {
          throw new Error(data.error || 'Erro ao validar código.')
        }
        finalEmail = data.email
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: finalEmail,
        password,
      })

      if (signInError) {
        throw signInError
      }
      
      // If successful, the AuthContext will catch the session change and redirect
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50">Carregando...</div>
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Head>
        <title>Login | ASPMM</title>
      </Head>

      <div className="w-full max-w-md bg-white rounded-2xl shadow-premium p-8 border border-gray-100">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-brand-blue mb-2">ASPMM</h1>
          <p className="text-gray-500">Portal do Associado</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-6 border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <Input
            label="Código do Associado ou E-mail"
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
            placeholder="Ex: 123456 ou seu@email.com"
          />
          <Input
            label="Senha"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="••••••••"
          />
          <Button type="submit" className="w-full" isLoading={loading}>
            Entrar
          </Button>
        </form>


      </div>
    </div>
  )
}
