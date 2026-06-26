import React, { useState, useEffect } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import Link from 'next/link'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const { session, member, loading: authLoading } = useAuth()

  useEffect(() => {
    if (session) {
      if (member) {
        if (member.role === 'admin') {
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

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    }
    // If successful, the AuthContext will catch the session change and redirect
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
            label="E-mail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="seu@email.com"
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

        <div className="mt-6 text-center text-sm text-gray-500">
          Não é sócio?{' '}
          <Link href="/register" className="text-brand-blue font-semibold hover:underline">
            Associe-se agora
          </Link>
        </div>
      </div>
    </div>
  )
}
