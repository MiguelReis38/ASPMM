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
  
  // Setup State
  const [requireSetup, setRequireSetup] = useState(false)
  const [setupData, setSetupData] = useState<any>(null)
  const [setupEmail, setSetupEmail] = useState('')
  const [setupEmailConfirm, setSetupEmailConfirm] = useState('')
  const [setupPassword, setSetupPassword] = useState('')

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

        if (data.requireSetup) {
          setRequireSetup(true)
          setSetupData(data)
          setLoading(false)
          return
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

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (setupEmail !== setupEmailConfirm) {
       setError('Os e-mails não coincidem.')
       return
    }
    if (setupPassword.length < 6) {
       setError('A senha deve ter no mínimo 6 caracteres.')
       return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/setup-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
           memberId: setupData.memberId, 
           email: setupEmail, 
           password: setupPassword 
        })
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao configurar conta.')
      }

      // Automatically login after setup
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: setupEmail.trim(),
        password: setupPassword,
      })

      if (signInError) {
        throw signInError
      }

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

        {!requireSetup ? (
          <>
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

            <div className="mt-8 pt-6 border-t border-gray-100 text-center">
              <p className="text-sm text-gray-500 mb-3">Acesse pelo celular de forma nativa:</p>
              <a 
                href="/aspmm.apk" 
                download
                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-semibold rounded-lg hover:bg-gray-800 transition-colors w-full"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Baixar Aplicativo (Android)
              </a>
            </div>
          </>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
             <div className="bg-brand-blueLight/20 border border-brand-blue/20 rounded-xl p-4 mb-6 text-sm text-brand-blueDark">
               <p>Olá, <strong>{setupData.fullName}</strong>!</p>
               <p className="mt-1">Este é o seu primeiro acesso. Para maior segurança, por favor cadastre um e-mail e uma nova senha para acessar o seu painel a partir de agora.</p>
             </div>
             
             <form onSubmit={handleSetup} className="space-y-5">
              <Input
                label="Seu E-mail"
                type="email"
                value={setupEmail}
                onChange={(e) => setSetupEmail(e.target.value)}
                required
                placeholder="seu.email@exemplo.com"
              />
              <Input
                label="Confirme seu E-mail"
                type="email"
                value={setupEmailConfirm}
                onChange={(e) => setSetupEmailConfirm(e.target.value)}
                required
                placeholder="seu.email@exemplo.com"
              />
              <Input
                label="Nova Senha"
                type="password"
                value={setupPassword}
                onChange={(e) => setSetupPassword(e.target.value)}
                required
                placeholder="Mínimo 6 caracteres"
              />
              <Button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white" isLoading={loading}>
                Salvar e Entrar
              </Button>
              <button 
                 type="button" 
                 onClick={() => { setRequireSetup(false); setError(''); }}
                 className="w-full text-sm text-gray-500 hover:text-gray-800 mt-4 underline"
              >
                 Voltar
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
