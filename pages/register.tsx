import React, { useState } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import Link from 'next/link'

export default function Register() {
  const [formData, setFormData] = useState({
    fullName: '',
    cpf: '',
    email: '',
    password: '',
    workplace: '',
    birthDate: '',
    isPcd: false,
    isDependent: false,
    primaryMemberCode: ''
  })
  const [payslipFile, setPayslipFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // 1. Resolve primary member if dependent
      let primaryMemberId = null;
      if (formData.isDependent) {
        if (!formData.primaryMemberCode) throw new Error("Código do Sócio Titular é obrigatório para dependentes.")
        const { data: primaryData, error: primaryError } = await supabase
          .from('members')
          .select('id')
          .eq('member_code', formData.primaryMemberCode)
          .single()
        
        if (primaryError || !primaryData) throw new Error("Sócio Titular não encontrado pelo código informado.")
        primaryMemberId = primaryData.id
      } else {
        // If titular, workplace and payslip are required (or at least expected)
        if (!formData.workplace) throw new Error("Órgão Público é obrigatório para titulares.")
      }

      // 2. Upload Holerite if present
      let payslipUrl = null;
      if (payslipFile) {
        const fileExt = payslipFile.name.split('.').pop()
        const fileName = `${formData.cpf}-${Math.random()}.${fileExt}`
        const { error: uploadError } = await supabase.storage.from('documents').upload(fileName, payslipFile)
        if (uploadError) throw new Error("Erro ao enviar holerite: " + uploadError.message)
        
        const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(fileName)
        payslipUrl = publicUrl
      }

      // 3. Create Auth User
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      })

      if (authError) throw authError
      if (!authData.user) throw new Error("Falha ao criar usuário")

      // 4. Generate random Member Code
      const memberCode = Math.floor(100000 + Math.random() * 900000).toString()

      // 5. Create Member Profile
      const { error: profileError } = await supabase
        .from('members')
        .insert({
          user_id: authData.user.id,
          member_code: memberCode,
          full_name: formData.fullName,
          cpf: formData.cpf,
          workplace: formData.isDependent ? 'Dependente' : formData.workplace,
          birth_date: formData.birthDate,
          is_pcd: formData.isPcd,
          is_dependent: formData.isDependent,
          primary_member_id: primaryMemberId,
          payslip_url: payslipUrl,
          status: 'pending',
          role: 'member'
        })

      if (profileError) throw profileError

      setSuccess(true)
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro durante o cadastro.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-premium p-8 text-center border border-gray-100">
          <div className="w-16 h-16 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Cadastro Realizado!</h2>
          <p className="text-gray-600 mb-6">Sua conta foi criada com sucesso. Faça login para acessar o portal.</p>
          <Button onClick={() => router.push('/')} className="w-full">Ir para Login</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 py-12">
      <Head>
        <title>Cadastro | ASPMM</title>
      </Head>

      <div className="w-full max-w-xl bg-white rounded-2xl shadow-premium p-8 border border-gray-100">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-brand-blue mb-2">Novo Sócio</h1>
          <p className="text-gray-500">Preencha os dados para se associar à ASPMM</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-6 border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <Input label="Nome Completo" name="fullName" value={formData.fullName} onChange={handleChange} required />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="CPF" name="cpf" value={formData.cpf} onChange={handleChange} required placeholder="Apenas números" />
            <Input label="Data de Nascimento" type="date" name="birthDate" value={formData.birthDate} onChange={handleChange} required />
          </div>
          
          <div className="flex gap-4 mb-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" name="isDependent" checked={formData.isDependent} onChange={handleChange} className="w-4 h-4 text-brand-blue" />
              Sou Dependente
            </label>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" name="isPcd" checked={formData.isPcd} onChange={handleChange} className="w-4 h-4 text-brand-blue" />
              Sou PcD
            </label>
          </div>

          {formData.isDependent ? (
            <Input label="Código do Sócio Titular" name="primaryMemberCode" value={formData.primaryMemberCode} onChange={handleChange} required placeholder="Ex: 849302" />
          ) : (
            <>
              <Input label="Órgão Público (Local de Trabalho)" name="workplace" value={formData.workplace} onChange={handleChange} required />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Anexar Holerite (Opcional/Comprovante)</label>
                <input type="file" accept=".pdf,image/*" onChange={(e) => setPayslipFile(e.target.files?.[0] || null)} className="w-full px-4 py-2 border rounded-lg text-sm" />
              </div>
            </>
          )}

          <hr className="my-6 border-gray-100" />

          <Input label="E-mail" type="email" name="email" value={formData.email} onChange={handleChange} required />
          <Input label="Senha" type="password" name="password" value={formData.password} onChange={handleChange} required />

          <div className="pt-4">
            <Button type="submit" className="w-full" isLoading={loading}>
              Finalizar Cadastro
            </Button>
          </div>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          Já é sócio?{' '}
          <Link href="/" className="text-brand-blue font-semibold hover:underline">
            Faça Login
          </Link>
        </div>
      </div>
    </div>
  )
}
