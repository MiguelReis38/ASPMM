import React, { useEffect, useState, useRef } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { Layout } from '../../components/Layout'
import { useAuth } from '../../lib/AuthContext'
import { supabase } from '../../lib/supabase'
import { Card, CardHeader, CardBody } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import Papa from 'papaparse'
import { formatCurrency } from '../../utils'

import { AccessControl } from '../../components/AccessControl'
import { DigitalCard } from '../../components/DigitalCard'

export default function AdminDashboard() {
  const { user, member } = useAuth()
  const [members, setMembers] = useState<any[]>([])
  const router = useRouter()
  const [payments, setPayments] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'associados' | 'cadastros' | 'financeiro' | 'comunicacao' | 'acessos' | 'relatorios'>('associados')
  
  useEffect(() => {
    if (router.query.tab) {
      setActiveTab(router.query.tab as any)
    }
  }, [router.query.tab])

  // Search & Selection
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [expandedMembers, setExpandedMembers] = useState<string[]>([])

  // Finance State
  const [feeMonth, setFeeMonth] = useState(new Date().getMonth().toString())
  const [feeAmount, setFeeAmount] = useState('50.00')
  const [paymentSearchTerm, setPaymentSearchTerm] = useState('')

  // Announcements State
  const [announcementTitle, setAnnouncementTitle] = useState('')
  const [announcementContent, setAnnouncementContent] = useState('')
  const [announcementImage, setAnnouncementImage] = useState<File | null>(null)
  const [announcementsList, setAnnouncementsList] = useState<any[]>([])
  
  // New Member Form State
  const [newMember, setNewMember] = useState({
    full_name: '', cpf: '', email: '', password: '', workplace: '', birth_date: '', 
    category: 'Titular',
    address: '',
    phone: '',
    validity_date: '',
    primaryMemberCode: '',
    matricula: '',
    created_at: ''
  })
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  
  // Edit Modal State
  const [editingMember, setEditingMember] = useState<any | null>(null)
  const [previewingCardMember, setPreviewingCardMember] = useState<any | null>(null)

  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const ORGAO_OPTIONS = ["ASPMM", "CAMARA", "CODEMAR", "DAEM", "IPREM", "PREFEITURA"]

  const getSituacaoOptions = (workplace: string) => {
    return [
      "Titular", 
      "Dependente", 
      "Dep. Não Pagante Menor", 
      "Dep. Não Pagante Maior", 
      "Branca Carterinha",
      "Verde Carterinha",
      "Amarela Carterinha",
      "PCD",
      "Isento"
    ]
  }

  useEffect(() => {
    if (member?.role === 'admin' || member?.role === 'president') {
      fetchMembers()
      fetchAnnouncements()
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
    const { data } = await supabase.from('payments').select('*, members(full_name, member_code, category)').order('created_at', { ascending: false })
    if (data) setPayments(data)
  }

  const fetchAnnouncements = async () => {
    const { data } = await supabase.from('announcements').select('*').order('created_at', { ascending: false })
    if (data) setAnnouncementsList(data)
  }

  const handleDeleteAnnouncement = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este comunicado?')) return;
    setLoading(true)
    try {
      const { error } = await supabase.from('announcements').delete().eq('id', id)
      if (error) throw error
      alert('Comunicado excluído com sucesso!')
      fetchAnnouncements()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
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
      const fileInput = document.getElementById('announcement-image-input') as HTMLInputElement
      if (fileInput) fileInput.value = ''
      alert('Comunicado publicado com sucesso!')
      fetchAnnouncements()
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
      const response = await fetch('/api/admin/mark-payment-paid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId })
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Erro ao dar baixa')
      
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
    setNewMember(prev => {
      const updated = { ...prev, [name]: value }
      if (name === 'primaryMemberCode') {
        const primary = members.find(m => m.full_name?.toLowerCase() === value.toLowerCase() || m.member_code === value)
        if (primary && primary.matricula) {
          updated.matricula = primary.matricula
        }
      }
      return updated
    })
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

      const payload = { 
        fullName: newMember.full_name,
        cpf: newMember.cpf,
        email: newMember.email,
        password: newMember.password,
        workplace: newMember.workplace,
        birthDate: newMember.birth_date,
        category: newMember.category,
        address: newMember.address,
        phone: newMember.phone,
        validityDate: newMember.validity_date,
        primaryMemberCode: newMember.primaryMemberCode,
        matricula: newMember.matricula,
        createdAt: newMember.created_at,
        photoUrl 
      }
      const response = await fetch('/api/admin/create-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Erro ao criar sócio')
      
      alert(`Sócio cadastrado com sucesso! Código gerado: ${result.member.member_code}`)
      setNewMember({ full_name: '', cpf: '', email: '', password: '', workplace: '', birth_date: '', category: 'Titular', address: '', phone: '', validity_date: '', primaryMemberCode: '', matricula: '', created_at: '' })
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
    setEditingMember((prev: any) => {
      const updated = { ...prev, [name]: value }
      if (name === 'primaryMemberCode') {
        const primary = members.find(m => m.full_name?.toLowerCase() === value.toLowerCase() || m.member_code === value)
        if (primary && primary.matricula) {
          updated.matricula = primary.matricula
        }
      }
      return updated
    })
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
        primaryMemberCode: editingMember.primaryMemberCode || '',
        matricula: editingMember.matricula,
        createdAt: editingMember.created_at ? editingMember.created_at.split('T')[0] : '',
        email: editingMember.email || '',
        password: editingMember.password || '',
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

  const handleDeleteSelected = async () => {
    if (!window.confirm(`Tem certeza que deseja EXCLUIR os ${selectedMembers.length} associados selecionados? Esta ação não pode ser desfeita.`)) return;
    
    setLoading(true)
    try {
      await Promise.all(selectedMembers.map(id => fetch('/api/admin/delete-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      })))
      
      alert('Sócios excluídos com sucesso!')
      setSelectedMembers([])
      fetchMembers()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  const toggleSelectMember = (id: string) => {
    setSelectedMembers(prev => prev.includes(id) ? prev.filter(mId => mId !== id) : [...prev, id])
  }

  const toggleSelectAll = () => {
    if (selectedMembers.length === titularMembers.length) {
      setSelectedMembers([])
    } else {
      setSelectedMembers(titularMembers.map(m => m.id))
    }
  }

  const toggleExpandMember = (id: string) => {
    setExpandedMembers(prev => prev.includes(id) ? prev.filter(mId => mId !== id) : [...prev, id])
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: function(h) { return h.trim(); },
      complete: async function(results) {
        setLoading(true)
        const data = results.data as any[]
        
        const titulares = data.filter(r => !(r.Situacao || '').toLowerCase().includes('dependente'))
        const dependentes = data.filter(r => (r.Situacao || '').toLowerCase().includes('dependente'))

        // Pass 1: Import Titulares
        for (const row of titulares) {
          try {
             const payload = {
                member_code: Math.floor(100000 + Math.random() * 900000).toString(),
                full_name: row.Nome,
                cpf: row.CPF ? String(row.CPF).trim() : Math.floor(10000000000 + Math.random() * 90000000000).toString(),
                status: 'active',
                category: row.Situacao || 'Titular',
                is_dependent: false,
                workplace: row.Orgao || 'Não informado',
                birth_date: row.DataNascimento || '1990-01-01',
                address: row.Endereco || '',
                phone: row.Telefone || '',
                validity_date: row.DataValidade || null,
                card_number: row.Carterinha || '',
                matricula: row.Matricula || null,
                created_at: row.DataCriacao || undefined,
                role: 'member'
             }
             await supabase.from('members').insert(payload)
          } catch (err: any) {
            console.error("Erro ao importar titular", row, err)
            alert(err.message)
          }
        }

        // Pass 2: Import Dependentes and link them
        for (const row of dependentes) {
          try {
             let primaryId = null;
             const titularRef = row.Titular; // Column 'Titular' can be Name or Code
             if (titularRef) {
               const { data: tData } = await supabase.from('members')
                 .select('id')
                 .or(`member_code.eq."${titularRef}",full_name.ilike."%${titularRef}%"`)
                 .single()
               if (tData) primaryId = tData.id;
             }

             const payload = {
                member_code: Math.floor(100000 + Math.random() * 900000).toString(),
                full_name: row.Nome,
                cpf: row.CPF ? String(row.CPF).trim() : Math.floor(10000000000 + Math.random() * 90000000000).toString(),
                status: 'active',
                category: row.Situacao || 'Dependente',
                is_dependent: true,
                primary_member_id: primaryId,
                workplace: row.Orgao || 'Não informado',
                birth_date: row.DataNascimento || '1990-01-01',
                address: row.Endereco || '',
                phone: row.Telefone || '',
                validity_date: row.DataValidade || null,
                card_number: row.Carterinha || '',
                matricula: row.Matricula || null,
                created_at: row.DataCriacao || undefined,
                role: 'member'
             }
             await supabase.from('members').insert(payload)
          } catch (err: any) {
            console.error("Erro ao importar dependente", row, err)
            alert(err.message)
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
  const currentYear = new Date().getFullYear();
  const currentMonthPayments = payments.filter(p => {
    if (!p.due_date) return false;
    const d = new Date(p.due_date);
    const category = p.members?.category;
    const isVerdeOuAmarela = category === 'Verde Carterinha' || category === 'Amarela Carterinha';
    return d.getMonth().toString() === feeMonth && d.getFullYear() === currentYear && isVerdeOuAmarela;
  });

  const totalArrecadado = currentMonthPayments.filter(p => p.status === 'paid').reduce((acc, curr) => acc + Number(curr.amount), 0)
  const totalReceber = currentMonthPayments.filter(p => p.status === 'pending').reduce((acc, curr) => acc + Number(curr.amount), 0)

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
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <input 
                type="text" 
                placeholder="Pesquisar associado..." 
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-blue w-full sm:w-64"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {selectedMembers.length > 0 && (
                <Button 
                  variant="danger" 
                  className="bg-red-500 hover:bg-red-600 text-white w-full sm:w-auto px-4 py-2 text-sm font-semibold"
                  onClick={handleDeleteSelected}
                  isLoading={loading}
                >
                  Excluir Selecionados ({selectedMembers.length})
                </Button>
              )}
            </div>
          </CardHeader>
          <CardBody className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-600 border-b">
                    <th className="px-3 py-3 font-medium w-10 text-center">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 text-brand-blue border-gray-300 rounded focus:ring-brand-blue"
                        checked={titularMembers.length > 0 && selectedMembers.length === titularMembers.length}
                        onChange={toggleSelectAll}
                      />
                    </th>
                    <th className="px-3 py-3 font-medium w-12 text-center">Foto</th>
                    <th className="px-3 py-3 font-medium min-w-[200px]">Sócio (Titular)</th>
                    <th className="px-3 py-3 font-medium whitespace-nowrap">Nascimento</th>
                    <th className="px-3 py-3 font-medium whitespace-nowrap">Matrícula</th>
                    <th className="px-3 py-3 font-medium whitespace-nowrap">Código</th>
                    <th className="px-3 py-3 font-medium whitespace-nowrap">Situação / Categoria</th>
                    <th className="px-3 py-3 font-medium whitespace-nowrap">Dependentes</th>
                    <th className="px-3 py-3 font-medium text-right whitespace-nowrap">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {titularMembers.map(m => {
                    const deps = members.filter(d => d.primary_member_id === m.id)
                    return (
                      <React.Fragment key={m.id}>
                        <tr className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                          <td className="px-3 py-3 text-center">
                            <input 
                              type="checkbox" 
                              className="w-4 h-4 text-brand-blue border-gray-300 rounded focus:ring-brand-blue"
                              checked={selectedMembers.includes(m.id)}
                              onChange={() => toggleSelectMember(m.id)}
                            />
                          </td>
                          <td className="px-3 py-3 flex justify-center items-center">
                            {m.photo_url ? (
                              <img src={m.photo_url} alt="Foto" className="w-9 h-9 rounded-full object-cover shadow-sm border border-gray-200" />
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 text-[10px]">Foto</div>
                            )}
                          </td>
                          <td className="px-3 py-3">
                            <p className="font-medium text-gray-800 leading-tight">{m.full_name}</p>
                            <p className="text-[11px] text-gray-500 mt-0.5">CPF: {m.cpf || '-'}</p>
                          </td>
                          <td className="px-3 py-3 text-gray-600 text-xs whitespace-nowrap">
                            {m.birth_date ? new Date(m.birth_date).toLocaleDateString('pt-BR') : '-'}
                          </td>
                          <td className="px-3 py-3 text-gray-600 font-mono text-xs whitespace-nowrap">
                            {m.matricula || '-'}
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            <span className="font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-700 font-bold text-xs">{m.member_code}</span>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            <div className="flex flex-col gap-1 items-start">
                               <span className={`px-2 py-0.5 rounded-full text-[9px] uppercase font-bold ${m.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                 {m.status === 'active' ? 'Ativo' : 'Inativo'}
                               </span>
                               <span className="px-2 py-0.5 rounded-full text-[9px] uppercase font-bold bg-brand-blueLight text-brand-blueDark">
                                 {m.category || 'Titular'}
                               </span>
                            </div>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            {deps.length > 0 ? (
                              <button onClick={() => toggleExpandMember(m.id)} className="font-bold text-brand-blue hover:underline flex items-center gap-1 text-xs">
                                {deps.length} dep. {expandedMembers.includes(m.id) ? '▲' : '▼'}
                              </button>
                            ) : (
                              <span className="font-bold text-gray-400 text-xs">0 dep.</span>
                            )}
                          </td>
                          <td className="px-3 py-3 text-right whitespace-nowrap">
                            <div className="flex justify-end gap-1">
                               <Button variant="outline" className="text-[11px] py-1 px-2 border-brand-blue text-brand-blue" onClick={() => setPreviewingCardMember(m)}>Ver</Button>
                               <Button variant="outline" className="text-[11px] py-1 px-2" onClick={() => setEditingMember(m)}>Editar</Button>
                               <Button variant="danger" className="text-[11px] py-1 px-2 bg-red-100 text-red-600 hover:bg-red-200 shadow-none border-none" onClick={() => handleDeleteMember(m.id, m.full_name)}>Excluir</Button>
                            </div>
                          </td>
                        </tr>
                        {deps.length > 0 && expandedMembers.includes(m.id) && (
                          <tr className="border-b bg-gray-50/50">
                            <td colSpan={8} className="px-12 py-3">
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
                                      <button onClick={() => setPreviewingCardMember(d)} className="text-brand-blue font-semibold hover:underline">Ver Carteirinha</button>
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
                  <Input label="Nome Associado" name="full_name" value={newMember.full_name} onChange={handleNewMemberChange} required />
                  <Input label="E-mail (Para Login)" type="email" name="email" value={newMember.email} onChange={handleNewMemberChange} placeholder="Opcional" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input label="Senha (Para Login)" type="text" name="password" value={newMember.password || ''} onChange={handleNewMemberChange} placeholder="Padrão: DDMMAAAA" />
                  <Input label="Endereço" name="address" value={newMember.address} onChange={handleNewMemberChange} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Situação</label>
                    <select name="category" value={newMember.category} onChange={handleNewMemberChange} required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-brand-blue outline-none disabled:bg-gray-100">
                      <option value="">Escolha</option>
                      {getSituacaoOptions(newMember.workplace).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Órgão</label>
                    <select name="workplace" value={newMember.workplace} onChange={handleNewMemberChange} required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-brand-blue outline-none">
                      <option value="">Escolha</option>
                      {ORGAO_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input type="date" label="Data de Nascimento" name="birth_date" value={newMember.birth_date} onChange={handleNewMemberChange} required />
                  <Input label="Data de Validade" type="date" name="validity_date" value={newMember.validity_date} onChange={handleNewMemberChange} />
                </div>

                {(newMember.category || '').toLowerCase().includes('dep') && (
                  <Input label="Titular (Nome ou Código)" name="primaryMemberCode" value={newMember.primaryMemberCode} onChange={handleNewMemberChange} placeholder="Ex: João da Silva ou 123456" />
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input label="Matrícula (Holerite/Prefeitura)" name="matricula" value={newMember.matricula} onChange={handleNewMemberChange} placeholder="Ex: 12345-6" />
                  <Input label="CPF (Apenas números)" name="cpf" value={newMember.cpf} onChange={handleNewMemberChange} placeholder="Ex: 12345678900" />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input label="Telefone" name="phone" placeholder="14999999999" value={newMember.phone} onChange={handleNewMemberChange} />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Foto</label>
                    <input type="file" accept="image/*" onChange={(e) => setPhotoFile(e.target.files?.[0] || null)} className="w-full text-sm border p-1 rounded bg-gray-50" />
                  </div>
                </div>

                <Input label="Data de Cadastro" type="date" name="created_at" value={newMember.created_at} onChange={handleNewMemberChange} />

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
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-5 rounded-2xl border border-gray-200 shadow-sm gap-4">
            <div>
              <h3 className="font-semibold text-lg text-gray-800">Resumo Financeiro</h3>
              <p className="text-sm text-gray-500">Valores referentes a Carteirinhas Verde e Amarela do mês selecionado.</p>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <label className="text-sm font-medium text-gray-600 whitespace-nowrap">Mês de Referência:</label>
              <select 
                value={feeMonth} 
                onChange={(e) => setFeeMonth(e.target.value)} 
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-gray-50 focus:ring-2 focus:ring-brand-blue outline-none font-medium w-full sm:w-auto"
              >
                {['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'].map((m, i) => (
                  <option key={i} value={i}>{m}</option>
                ))}
              </select>
            </div>
          </div>

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
                <p className="text-sm text-gray-500 mb-6">Gera a mensalidade para os associados com Categoria Amarela ou Verde referente ao mês selecionado acima.</p>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valor da Mensalidade (R$)</label>
                  <input type="number" step="0.01" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-blue" value={feeAmount} onChange={(e) => setFeeAmount(e.target.value)} />
                </div>
                <Button 
                  className="w-full bg-brand-blue hover:bg-brand-blueDark text-white disabled:opacity-50" 
                  disabled={user?.email === 'aspmmarilia@gmail.com'}
                  onClick={async () => {
                    if (user?.email === 'aspmmarilia@gmail.com') return;
                    setLoading(true)
                    try {
                      const res = await fetch('/api/admin/generate-monthly-fees', { 
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ month: feeMonth, amount: feeAmount })
                      })
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
                {user?.email === 'aspmmarilia@gmail.com' && <p className="text-xs text-red-500 mt-2 text-center">Seu perfil apenas visualiza esta tela.</p>}
              </CardBody>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h3 className="font-semibold text-lg">Histórico de Cobranças</h3>
                <input 
                  type="text" 
                  placeholder="Pesquisar Sócio ou Código..." 
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-blue w-full sm:w-64"
                  value={paymentSearchTerm}
                  onChange={(e) => setPaymentSearchTerm(e.target.value)}
                />
              </CardHeader>
              <CardBody className="p-0">
                <div className="max-h-[400px] overflow-y-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-gray-600 border-b sticky top-0">
                        <th className="px-6 py-3 font-medium">Sócio</th>
                        <th className="px-6 py-3 font-medium">Vencimento</th>
                        <th className="px-6 py-3 font-medium">Valor</th>
                        <th className="px-6 py-3 font-medium text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.filter(p => {
                        if (!paymentSearchTerm) return true;
                        const term = paymentSearchTerm.toLowerCase();
                        return p.members?.full_name?.toLowerCase().includes(term) || p.members?.member_code?.toLowerCase().includes(term);
                      }).map(p => (
                        <tr key={p.id} className="border-b last:border-0 hover:bg-gray-50">
                          <td className="px-6 py-3 font-medium text-gray-800">
                            {p.members?.full_name} <br/>
                            <span className="text-xs text-gray-400 font-mono">({p.members?.member_code})</span>
                          </td>
                          <td className="px-6 py-3">{new Date(p.due_date).toLocaleDateString('pt-BR')}</td>
                          <td className="px-6 py-3 font-bold">{formatCurrency(p.amount)}</td>
                          <td className="px-6 py-3 text-right">
                            {p.status === 'pending' && (
                              <Button 
                                variant="outline" 
                                className="text-xs py-1 disabled:opacity-50" 
                                disabled={user?.email === 'aspmmarilia@gmail.com'}
                                onClick={() => {
                                  if (user?.email === 'aspmmarilia@gmail.com') return;
                                  handleMarkAsPaid(p.id);
                                }} 
                                isLoading={loading}
                              >
                                Dar Baixa
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
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
                <textarea 
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-blue outline-none min-h-[300px]"
                  placeholder="Sua mensagem principal..."
                  value={announcementContent}
                  onChange={(e) => setAnnouncementContent(e.target.value)}
                  required
                ></textarea>
                <input id="announcement-image-input" type="file" accept="image/*" onChange={(e) => setAnnouncementImage(e.target.files?.[0] || null)} className="w-full text-sm border p-2 rounded bg-gray-50" />
                <Button type="submit" className="w-full bg-brand-blue hover:bg-brand-blueDark text-white" isLoading={loading}>Publicar no Mural</Button>
              </form>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="font-semibold text-lg">Comunicados Publicados</h3>
            </CardHeader>
            <CardBody className="max-h-[500px] overflow-y-auto">
              <div className="space-y-4">
                {announcementsList.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-8">Nenhum comunicado publicado.</p>
                ) : (
                  announcementsList.map(ann => (
                    <div key={ann.id} className="p-4 border rounded-xl bg-gray-50 flex flex-col gap-2">
                      <div className="flex justify-between items-start gap-2">
                        <h4 className="font-bold text-gray-800">{ann.title}</h4>
                        <button onClick={() => handleDeleteAnnouncement(ann.id)} className="text-red-500 hover:text-red-700 text-sm font-semibold shrink-0" disabled={loading}>
                          Excluir
                        </button>
                      </div>
                      <p className="text-sm text-gray-600 whitespace-pre-wrap">{ann.content}</p>
                      {ann.image_url && (
                        <div className="mt-2">
                          <img src={ann.image_url} alt="Comunicado" className="max-h-40 object-cover rounded-lg border" />
                        </div>
                      )}
                      <span className="text-xs text-gray-400 mt-2 block">
                        Publicado em {new Date(ann.created_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {activeTab === 'acessos' && <AccessControl />}

      {activeTab === 'relatorios' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <Card>
            <CardHeader><h3 className="font-semibold text-lg">Relatórios Gerais</h3></CardHeader>
            <CardBody>
              <Button onClick={() => {
                  const csv = Papa.unparse(members.map(m => ({ Nome: m.full_name, CPF: m.cpf, Situacao: m.category })))
                  const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' })
                  const link = document.createElement("a")
                  link.href = URL.createObjectURL(blob)
                  link.setAttribute("download", `associados_${new Date().toLocaleDateString()}.csv`)
                  link.click()
                }}>Exportar Associados (CSV)</Button>
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
              <Input label="Nome" name="full_name" value={editingMember.full_name || ''} onChange={handleEditMemberChange} required />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="CPF" name="cpf" value={editingMember.cpf || ''} onChange={handleEditMemberChange} />
                <Input label="Matrícula" name="matricula" value={editingMember.matricula || ''} onChange={handleEditMemberChange} />
              </div>
              <div className="flex gap-4 pt-4 border-t">
                <Button type="submit" className="flex-1" isLoading={loading}>Salvar Alterações</Button>
                <Button variant="outline" onClick={() => { setEditingMember(null); setPhotoFile(null) }} className="flex-1">Cancelar</Button>
              </div>
            </form>
          </div>
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
                      {getSituacaoOptions(editingMember.workplace).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input label="Endereço" name="address" value={editingMember.address || ''} onChange={handleEditMemberChange} />
                  <Input type="date" label="Data de Nascimento" name="birth_date" value={editingMember.birth_date || ''} onChange={handleEditMemberChange} />
                  <Input type="date" label="Data de Cadastro" name="created_at" value={editingMember.created_at ? editingMember.created_at.split('T')[0] : ''} onChange={handleEditMemberChange} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Situação / Empresa</label>
                    <select name="workplace" value={editingMember.workplace || ''} onChange={handleEditMemberChange} required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-brand-blue outline-none">
                      <option value="">Escolha</option>
                      {ORGAO_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                  <Input label="Data de Validade" type="date" name="validity_date" value={editingMember.validity_date || ''} onChange={handleEditMemberChange} />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <Input label="E-mail de Login" type="email" name="email" value={editingMember.email || ''} onChange={handleEditMemberChange} placeholder="Atualizar e-mail (opcional)" />
                  <Input label="Nova Senha" type="text" name="password" value={editingMember.password || ''} onChange={handleEditMemberChange} placeholder="Deixe em branco para não alterar" />
                </div>

                {(editingMember.category || '').toLowerCase().includes('dep') && (
                   <div className="grid grid-cols-1 gap-4">
                     <Input label="Código do Associado Titular" name="primaryMemberCode" value={editingMember.primaryMemberCode || ''} onChange={handleEditMemberChange} placeholder="Obrigatório para dependentes" />
                   </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                  <Input label="Telefone" name="phone" value={editingMember.phone || ''} onChange={handleEditMemberChange} />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Alterar Foto do Associado</label>
                    <input type="file" accept="image/*" onChange={(e) => setPhotoFile(e.target.files?.[0] || null)} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-blueLight file:text-brand-blue hover:file:bg-brand-blue/20" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input label="CPF" name="cpf" value={editingMember.cpf || ''} onChange={handleEditMemberChange} />
                  <Input label="Matrícula" name="matricula" value={editingMember.matricula || ''} onChange={handleEditMemberChange} />
                </div>

                <div className="flex gap-4 pt-4 border-t">
                  <Button type="submit" className="flex-1" isLoading={loading}>Salvar Alterações</Button>
                  <Button variant="outline" onClick={() => { setEditingMember(null); setPhotoFile(null) }} className="flex-1">Cancelar</Button>
                </div>
              </form>
            </div>
          </div>
      )}

      {/* Digital Card Preview Modal */}
      {previewingCardMember && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-gray-100 rounded-2xl w-full max-w-md shadow-2xl p-6 relative my-10">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-800">Preview da Carteirinha</h3>
              <button onClick={() => setPreviewingCardMember(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">✕</button>
            </div>
            
            <div id="printable-card" className="flex justify-center mb-6">
               <DigitalCard member={previewingCardMember} />
            </div>

            <div className="flex gap-4 border-t border-gray-200 pt-4">
              <Button onClick={() => window.print()} className="flex-1 bg-brand-blue text-white shadow-md hover:bg-brand-blueDark">Imprimir Carteirinha</Button>
            </div>
            
            <style>{`
              @media print {
                html, body, #__next { height: 100vh !important; overflow: hidden !important; margin: 0 !important; padding: 0 !important; }
                body * { visibility: hidden; }
                #printable-card, #printable-card * { visibility: visible !important; }
                #printable-card { position: fixed; left: 0; top: 0; width: 100vw; height: 100vh; display: flex; justify-content: center; align-items: center; margin: 0; padding: 0; z-index: 99999; }
              }
              @page { size: auto; margin: 0; }
            `}</style>
          </div>
        </div>
      )}
    </Layout>
  )
}