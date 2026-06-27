import React, { useEffect, useState, useRef } from 'react'
import Head from 'next/head'
import { Layout } from '../../components/Layout'
import { useAuth } from '../../lib/AuthContext'
import { supabase } from '../../lib/supabase'
import { Card, CardHeader, CardBody } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import Papa from 'papaparse'
import { formatCurrency } from '../../utils'

import { AccessControl } from '../../components/AccessControl'

export default function AdminDashboard() {
  const { member } = useAuth()
  const [members, setMembers] = useState<any[]>([])
  const router = useRouter()
  const [payments, setPayments] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'associados' | 'cadastros' | 'financeiro' | 'comunicacao' | 'acessos'>('associados')
  
  useEffect(() => {
    if (router.query.tab) {
      setActiveTab(router.query.tab as any)
    }
  }, [router.query.tab])

  // Search
  const [searchTerm, setSearchTerm] = useState('')

  // Announcements State
  const [announcementTitle, setAnnouncementTitle] = useState('')
  const [announcementContent, setAnnouncementContent] = useState('')
  const [announcementImage, setAnnouncementImage] = useState<File | null>(null)
  
  // New Member Form State
  const [newMember, setNewMember] = useState({
    fullName: '', cpf: '', email: '', password: '', workplace: '', birthDate: '', 
    category: '', address: '', phone: '', validityDate: '', cardNumber: '', primaryMemberCode: ''
  })
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  
  // Edit Modal State
  const [editingMember, setEditingMember] = useState<any | null>(null)

  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const SITUACAO_OPTIONS = [
    "Titular", "Dependente", "Dep. Não Pagante Menor", "Dep. Não Pagante Maior", 
    "Branca Carterinha", "Amarela Carterinha", "Verde Carterinha", "Isento"
  ]

  const ORGAO_OPTIONS = ["CAMARA", "CODEMAR", "DAEM", "IPREM", "PREFEITURA"]

  useEffect(() => {
    if (member?.role === 'admin' || member?.role === 'president') {
      fetchMembers()
      if (member?.role === 'president') {
        fetchPayments()
      }
    }
  }, [member])

  const fetchMembers = async () => {
    const { data } = await supabase.from('members').select('*').order('created_at', { ascending: false })
    if (data) setMembers(data)
  }

  const fetchPayments = async () => {
    const { data } = await supabase.from('payments').select('*, members(full_name, member_code)').order('created_at', { ascending: false })
    if (data) setPayments(data)
  }

  const handlePostAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      let imageUrl = null;
      if (announcementImage) {
        const fileExt = announcementImage.name.split('.').pop()
        const fileName = `announcement-${Math.random()}.${fileExt}`
        const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, announcementImage)
        if (uploadError) throw new Error("Erro ao enviar imagem do comunicado: " + uploadError.message)
        const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName)
        imageUrl = publicUrl
      }

      const { error } = await supabase.from('announcements').insert({
        title: announcementTitle,
        content: announcementContent,
        image_url: imageUrl,
        author_id: member?.id
      })
      if (error) throw error

      setAnnouncementTitle('')
      setAnnouncementContent('')
      setAnnouncementImage(null)
      alert('Comunicado publicado com sucesso!')
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleMarkAsPaid = async (paymentId: string) => {
    if (!window.confirm('Confirmar o recebimento manual desta mensalidade?')) return;
    setLoading(true)
    try {
      const { error } = await supabase.from('payments').update({
        status: 'paid',
        paid_at: new Date().toISOString()
      }).eq('id', paymentId)
      
      if (error) throw error
      alert('Baixa efetuada com sucesso!')
      fetchPayments()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleNewMemberChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setNewMember(prev => ({ ...prev, [name]: value }))
  }

  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      let photoUrl = null;
      if (photoFile) {
        const fileExt = photoFile.name.split('.').pop()
        const fileName = `${newMember.cpf}-${Math.random()}.${fileExt}`
        const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, photoFile)
        if (uploadError) throw new Error("Erro ao enviar foto: " + uploadError.message)
        const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName)
        photoUrl = publicUrl
      }

      const payload = { ...newMember, photoUrl }

      const response = await fetch('/api/admin/create-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Erro ao criar sócio')
      
      alert(`Sócio cadastrado com sucesso! Código gerado: ${result.member.member_code}`)
      setNewMember({ fullName: '', cpf: '', email: '', password: '', workplace: '', birthDate: '', category: '', address: '', phone: '', validityDate: '', cardNumber: '', primaryMemberCode: '' })
      setPhotoFile(null)
      fetchMembers()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleEditMemberChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setEditingMember((prev: any) => ({ ...prev, [name]: value }))
  }

  const handleSaveEditMember = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      let photoUrl = editingMember.photo_url;
      if (photoFile) {
        const fileExt = photoFile.name.split('.').pop()
        const fileName = `${editingMember.cpf}-${Math.random()}.${fileExt}`
        const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, photoFile)
        if (uploadError) throw new Error("Erro ao enviar foto: " + uploadError.message)
        const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName)
        photoUrl = publicUrl
      }

      const payload = { 
        id: editingMember.id,
        fullName: editingMember.full_name,
        cpf: editingMember.cpf,
        workplace: editingMember.workplace,
        birthDate: editingMember.birth_date,
        category: editingMember.category,
        address: editingMember.address,
        phone: editingMember.phone,
        validityDate: editingMember.validity_date,
        cardNumber: editingMember.card_number,
        primaryMemberCode: editingMember.primaryMemberCode || '', // Only used if dependent
        photoUrl: photoUrl
      }

      const response = await fetch('/api/admin/edit-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Erro ao editar sócio')
      
      alert('Cadastro atualizado com sucesso!')
      setEditingMember(null)
      setPhotoFile(null)
      fetchMembers()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteMember = async (id: string, name: string) => {
    if (!window.confirm(`Tem certeza que deseja EXCLUIR o associado ${name}? Esta ação não pode ser desfeita.`)) return;
    
    setLoading(true)
    try {
      const response = await fetch('/api/admin/delete-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Erro ao excluir sócio')
      
      alert('Sócio excluído com sucesso!')
      fetchMembers()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async function(results) {
        setLoading(true)
        const data = results.data as any[]
        
        for (const row of data) {
          try {
             const payload = {
                member_code: Math.floor(100000 + Math.random() * 900000).toString(),
                full_name: row.Nome,
                cpf: row.CPF,
                status: 'active',
                category: row.Situacao || 'Titular',
                is_dependent: (row.Situacao || '').toLowerCase().includes('dependente'),
                workplace: row.Orgao || 'Não informado',
                birth_date: row.DataNascimento || '1990-01-01',
                address: row.Endereco || '',
                phone: row.Telefone || '',
                validity_date: row.DataValidade || null,
                card_number: row.Carterinha || '',
                role: 'member'
             }
             await supabase.from('members').insert(payload)
          } catch (err) {
            console.error("Erro ao importar linha", row, err)
          }
        }
        
        setLoading(false)
        fetchMembers()
        alert('Importação concluída!')
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
    })
  }

  if (member?.role !== 'admin' && member?.role !== 'president') return <Layout><div className="p-10 text-center">Acesso Negado</div></Layout>



  const filteredMembers = members.filter(m => 
    m.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    m.member_code.includes(searchTerm)
  )

  const titularMembers = filteredMembers.filter(m => !m.is_dependent && !m.category?.toLowerCase().includes('dependente'))

  // Finance calculations
  const totalArrecadado = payments.filter(p => p.status === 'paid').reduce((acc, curr) => acc + Number(curr.amount), 0)
  const totalReceber = payments.filter(p => p.status === 'pending').reduce((acc, curr) => acc + Number(curr.amount), 0)

  return (
    <Layout>
      <Head>
        <title>Admin | ASPMM</title>
      </Head>

      <div className="mb-2"></div>



      {activeTab === 'associados' && (
        <Card className="h-full animate-in fade-in slide-in-from-bottom-2 duration-300">
          <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h3 className="font-semibold text-lg">Lista Geral de Associados</h3>
            <input 
              type="text" 
              placeholder="Buscar por Nome ou Código..." 
              className="w-full sm:w-64 px-4 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-blue"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </CardHeader>
          <CardBody className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-600 border-b">
                    <th className="px-6 py-3 font-medium w-12">Foto</th>
                    <th className="px-6 py-3 font-medium">Sócio (Titular)</th>
                    <th className="px-6 py-3 font-medium">Código</th>
                    <th className="px-6 py-3 font-medium">Situação / Categoria</th>
                    <th className="px-6 py-3 font-medium">Dependentes</th>
                    <th className="px-6 py-3 font-medium text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {titularMembers.map(m => {
                    const deps = members.filter(d => d.primary_member_id === m.id)
                    return (
                      <React.Fragment key={m.id}>
                        <tr className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            {m.photo_url ? (
                              <img src={m.photo_url} alt="Foto" className="w-10 h-10 rounded-full object-cover shadow-sm border border-gray-200" />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 text-xs">Sem Foto</div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <p className="font-medium text-gray-800">{m.full_name}</p>
                            <p className="text-xs text-gray-500">CPF: {m.cpf}</p>
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-mono bg-gray-100 px-2 py-1 rounded text-gray-700 font-bold">{m.member_code}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded-full text-[10px] uppercase font-bold bg-brand-blueLight text-brand-blueDark`}>
                              {m.category || 'Titular'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-bold text-gray-700">{deps.length} dependentes</span>
                          </td>
                          <td className="px-6 py-4 text-right flex justify-end gap-2">
                            <Button variant="outline" className="text-xs py-1 px-3" onClick={() => setEditingMember(m)}>Editar</Button>
                            <Button variant="danger" className="text-xs py-1 px-3 bg-red-100 text-red-600 hover:bg-red-200 shadow-none border-none" onClick={() => handleDeleteMember(m.id, m.full_name)}>Excluir</Button>
                          </td>
                        </tr>
                        {/* Render Dependents beneath */}
                        {deps.length > 0 && (
                          <tr className="border-b bg-gray-50/50">
                            <td colSpan={6} className="px-12 py-3">
                              <div className="space-y-2 border-l-2 border-brand-blue/30 pl-4">
                                {deps.map(d => (
                                  <div key={d.id} className="flex justify-between items-center text-xs">
                                    <div className="flex items-center gap-3">
                                      {d.photo_url ? (
                                        <img src={d.photo_url} alt="Foto" className="w-6 h-6 rounded-full object-cover" />
                                      ) : (
                                        <div className="w-6 h-6 rounded-full bg-gray-200" />
                                      )}
                                      <span className="font-medium text-gray-700">{d.full_name}</span>
                                      <span className="text-gray-400 font-mono">({d.member_code})</span>
                                    </div>
                                    <div className="flex gap-4 items-center">
                                      <span className="text-brand-blue">{d.category}</span>
                                      <button onClick={() => setEditingMember(d)} className="text-gray-500 hover:text-brand-blue underline">Editar</button>
                                      <button onClick={() => handleDeleteMember(d.id, d.full_name)} className="text-red-400 hover:text-red-600 underline">Excluir</button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    )
                  })}
                </tbody>
              </table>
              {titularMembers.length === 0 && <p className="text-center py-6 text-gray-500">Nenhum associado titular encontrado.</p>}
            </div>
          </CardBody>
        </Card>
      )}

      {activeTab === 'cadastros' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <Card>
            <CardHeader>
              <h3 className="font-semibold text-lg">Cadastrar Sócio (Manual)</h3>
            </CardHeader>
            <CardBody>
              <form onSubmit={handleCreateMember} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input label="Nome Associado" name="fullName" value={newMember.fullName} onChange={handleNewMemberChange} required />
                  <Input label="E-mail (Para Login)" type="email" name="email" value={newMember.email} onChange={handleNewMemberChange} required />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Situação</label>
                    <select name="category" value={newMember.category} onChange={handleNewMemberChange} required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-brand-blue outline-none">
                      <option value="">Escolha</option>
                      {SITUACAO_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                  <Input label="Endereço" name="address" value={newMember.address} onChange={handleNewMemberChange} required />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Órgão</label>
                    <select name="workplace" value={newMember.workplace} onChange={handleNewMemberChange} required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-brand-blue outline-none">
                      <option value="">Escolha</option>
                      {ORGAO_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                  <Input label="Data de Validade" type="date" name="validityDate" value={newMember.validityDate} onChange={handleNewMemberChange} />
                </div>

                <div className="grid grid-cols-1 gap-4">
                   <Input label="Data de Nascimento (Usada como Senha)" type="date" name="birthDate" value={newMember.birthDate} onChange={handleNewMemberChange} required />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input label="Telefone" name="phone" placeholder="0__ - ___" value={newMember.phone} onChange={handleNewMemberChange} />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Foto</label>
                    <input type="file" accept="image/*" onChange={(e) => setPhotoFile(e.target.files?.[0] || null)} className="w-full text-sm border p-1 rounded bg-gray-50" />
                  </div>
                </div>

                <Input label="Titular (Código)" name="primaryMemberCode" value={newMember.primaryMemberCode} onChange={handleNewMemberChange} placeholder="Ex: 849302 (Se for dependente)" />
                <Input label="CPF (Sistema Interno)" name="cpf" value={newMember.cpf} onChange={handleNewMemberChange} required />

                <Button type="submit" className="w-full bg-blue-500 hover:bg-blue-600 text-white" isLoading={loading}>+ Salvar Associado</Button>
              </form>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="font-semibold text-lg">Importar Associados (CSV)</h3>
            </CardHeader>
            <CardBody>
              <p className="text-sm text-gray-500 mb-4">Envie um arquivo CSV contendo os cadastros em massa.</p>
              <div className="p-8 border-2 border-dashed border-gray-200 rounded-xl text-center bg-gray-50">
                <input type="file" accept=".csv" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
                <Button variant="outline" className="border-brand-blue text-brand-blue mx-auto" onClick={() => fileInputRef.current?.click()} isLoading={loading}>
                  Selecionar Arquivo .CSV
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {activeTab === 'financeiro' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm flex flex-col justify-center">
              <p className="text-sm text-gray-500 uppercase font-bold tracking-wider mb-2">Total Arrecadado</p>
              <p className="text-4xl font-black text-green-600">{formatCurrency(totalArrecadado)}</p>
            </div>
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm flex flex-col justify-center">
              <p className="text-sm text-gray-500 uppercase font-bold tracking-wider mb-2">Total a Receber</p>
              <p className="text-4xl font-black text-red-500">{formatCurrency(totalReceber)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1">
              <CardHeader>
                <h3 className="font-semibold text-lg">Geração Automática</h3>
              </CardHeader>
              <CardBody>
                <p className="text-sm text-gray-500 mb-6">Gera a mensalidade de R$ 50,00 para associados com Categoria Amarela ou Verde no sistema. Os demais são isentos de cobrança online.</p>
                <Button 
                  className="w-full bg-brand-blue hover:bg-brand-blueDark text-white" 
                  onClick={async () => {
                    setLoading(true)
                    try {
                      const res = await fetch('/api/admin/generate-monthly-fees', { method: 'POST' })
                      const data = await res.json()
                      alert(data.message || data.error)
                      fetchPayments()
                    } catch(e: any) {
                      alert('Erro: ' + e.message)
                    } finally {
                      setLoading(false)
                    }
                  }} 
                  isLoading={loading}
                >
                  Gerar Mensalidades do Mês
                </Button>
              </CardBody>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <h3 className="font-semibold text-lg">Histórico de Cobranças</h3>
              </CardHeader>
              <CardBody className="p-0">
                <div className="max-h-[400px] overflow-y-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-gray-600 border-b sticky top-0">
                        <th className="px-6 py-3 font-medium">Sócio</th>
                        <th className="px-6 py-3 font-medium">Vencimento</th>
                        <th className="px-6 py-3 font-medium">Valor</th>
                        <th className="px-6 py-3 font-medium">Status</th>
                        <th className="px-6 py-3 font-medium text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map(p => (
                        <tr key={p.id} className="border-b last:border-0 hover:bg-gray-50">
                          <td className="px-6 py-3 font-medium text-gray-800">
                            {p.members?.full_name} <br/>
                            <span className="text-xs text-gray-400 font-mono">({p.members?.member_code})</span>
                          </td>
                          <td className="px-6 py-3">{new Date(p.due_date).toLocaleDateString('pt-BR')}</td>
                          <td className="px-6 py-3 font-bold">{formatCurrency(p.amount)}</td>
                          <td className="px-6 py-3">
                            <span className={`px-2 py-1 rounded-full text-[10px] uppercase font-bold ${p.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                              {p.status === 'paid' ? 'Pago' : 'Pendente'}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-right">
                            {p.status === 'pending' && (
                              <Button variant="outline" className="text-xs py-1" onClick={() => handleMarkAsPaid(p.id)} isLoading={loading}>Dar Baixa</Button>
                            )}
                          </td>
                        </tr>
                      ))}
                      {payments.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-6 py-6 text-center text-gray-500">Nenhuma cobrança registrada.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'comunicacao' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <Card>
            <CardHeader>
              <h3 className="font-semibold text-lg">Publicar Comunicado</h3>
            </CardHeader>
            <CardBody>
              <form onSubmit={handlePostAnnouncement} className="space-y-4">
                <Input label="Título do Comunicado" value={announcementTitle} onChange={(e) => setAnnouncementTitle(e.target.value)} required />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mensagem (Aviso aos associados)</label>
                  <textarea 
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-blue outline-none min-h-[150px]"
                    placeholder="Sua mensagem principal..."
                    value={announcementContent}
                    onChange={(e) => setAnnouncementContent(e.target.value)}
                    required
                  ></textarea>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Imagem / Banner (Opcional)</label>
                  <input type="file" accept="image/*" onChange={(e) => setAnnouncementImage(e.target.files?.[0] || null)} className="w-full text-sm border p-2 rounded bg-gray-50" />
                </div>
                <Button type="submit" className="w-full" isLoading={loading}>Publicar no Mural</Button>
              </form>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Edit Modal */}
      {editingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl p-6 mt-10 mb-10">
            <h3 className="text-xl font-bold mb-4">Editar Associado</h3>
            <form onSubmit={handleSaveEditMember} className="space-y-4">
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input label="Nome Associado" name="full_name" value={editingMember.full_name || ''} onChange={handleEditMemberChange} required />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Situação</label>
                    <select name="category" value={editingMember.category || ''} onChange={handleEditMemberChange} required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-brand-blue outline-none">
                      <option value="">Escolha</option>
                      {SITUACAO_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input label="Endereço" name="address" value={editingMember.address || ''} onChange={handleEditMemberChange} />
                  <Input label="Data de Nascimento" type="date" name="birth_date" value={editingMember.birth_date || ''} onChange={handleEditMemberChange} required />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Órgão</label>
                    <select name="workplace" value={editingMember.workplace || ''} onChange={handleEditMemberChange} required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-brand-blue outline-none">
                      <option value="">Escolha</option>
                      {ORGAO_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                  <Input label="Data de Validade" type="date" name="validity_date" value={editingMember.validity_date || ''} onChange={handleEditMemberChange} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Input label="Carterinha" name="card_number" value={editingMember.card_number || ''} onChange={handleEditMemberChange} />
                  <Input label="Telefone" name="phone" value={editingMember.phone || ''} onChange={handleEditMemberChange} />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Substituir Foto</label>
                    <input type="file" accept="image/*" onChange={(e) => setPhotoFile(e.target.files?.[0] || null)} className="w-full text-sm border p-1 rounded bg-gray-50" />
                  </div>
                </div>

                <Input label="CPF" name="cpf" value={editingMember.cpf || ''} onChange={handleEditMemberChange} required />

                <div className="flex gap-4 pt-4 border-t">
                  <Button type="submit" className="flex-1" isLoading={loading}>Salvar Alterações</Button>
                  <Button variant="outline" className="flex-1" onClick={() => setEditingMember(null)}>Cancelar</Button>
                </div>
            </form>
          </div>
        </div>
      )}

    </Layout>
  )
}