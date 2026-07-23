import React, { useEffect, useState } from 'react'
import Head from 'next/head'
import { Layout } from '../../components/Layout'
import { useAuth } from '../../lib/AuthContext'
import { DigitalCard } from '../../components/DigitalCard'
import { QRCodeDisplay } from '../../components/QRCodeDisplay'
import { Card, CardHeader, CardBody } from '../../components/ui/Card'
import { supabase } from '../../lib/supabase'
import { formatCurrency, isDependentExempt } from '../../utils'
import { Button } from '../../components/ui/Button'
import { CreditCard, Users, Bell } from 'lucide-react'

export default function MemberDashboard() {
  const { member } = useAuth()
  const [dependents, setDependents] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [accessLogs, setAccessLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'carteirinha' | 'financeiro' | 'dependentes' | 'mural' | 'acessos'>('carteirinha')
  
  // Checkout State
  const [isProcessingPayment, setIsProcessingPayment] = useState<string | null>(null)
  const [pixQrCode, setPixQrCode] = useState<string | null>(null)
  
  // Announcement Modal State
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<any>(null)

  // Access Logs Date Filter State
  const [logStartDate, setLogStartDate] = useState(() => {
    const d = new Date()
    d.setMonth(d.getMonth() - 1)
    return d.toISOString().split('T')[0]
  })
  const [logEndDate, setLogEndDate] = useState(() => new Date().toISOString().split('T')[0])

  useEffect(() => {
    if (member) {
      fetchDashboardData()
    }
  }, [member])

  useEffect(() => {
    if (member) {
      fetchAccessLogs()
    }
  }, [member, logStartDate, logEndDate])

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      // Fetch Dependents
      const { data: depsData } = await supabase
        .from('members')
        .select('*')
        .eq('primary_member_id', member?.id)
      
      if (depsData) setDependents(depsData)

      // Fetch Payments (Pending)
      const { data: payData } = await supabase
        .from('payments')
        .select('*')
        .eq('member_id', member?.id)
        .eq('status', 'pending')
      
      if (payData) setPayments(payData)

      // Fetch Announcements
      const { data: annData } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5)
      if (annData) setAnnouncements(annData)

    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAccessLogs = async () => {
    try {
      const { data: depsDataForLogs } = await supabase
        .from('members')
        .select('id')
        .eq('primary_member_id', member?.id)
      
      const memberIds = [member?.id]
      if (depsDataForLogs) {
         depsDataForLogs.forEach(d => memberIds.push(d.id))
      }

      const { data: logsData } = await supabase
        .from('access_logs')
        .select('*, members!inner(full_name)')
        .in('member_id', memberIds)
        .gte('created_at', `${logStartDate}T00:00:00.000Z`)
        .lte('created_at', `${logEndDate}T23:59:59.999Z`)
        .order('created_at', { ascending: false })
      
      if (logsData) setAccessLogs(logsData)
    } catch (error) {
      console.error(error)
    }
  }

  const handlePay = async (paymentId: string, method: 'PIX' | 'CREDIT_CARD') => {
    setIsProcessingPayment(paymentId)
    setPixQrCode(null)
    try {
      const res = await fetch('/api/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId, method })
      })
      const data = await res.json()
      
      if (!res.ok) throw new Error(data.error || 'Erro ao gerar pagamento')
      
      if (method === 'CREDIT_CARD' && data.checkoutUrl) {
        window.location.href = data.checkoutUrl // Redireciona para o PagSeguro
      } else if (method === 'PIX' && data.qrCodeText) {
        setPixQrCode(data.qrCodeText)
      }
    } catch (err: any) {
      alert(err.message)
    } finally {
      setIsProcessingPayment(null)
    }
  }

  if (!member || loading) return <Layout><div className="flex justify-center p-10">Carregando...</div></Layout>

  const navTabs = [
    { id: 'carteirinha', label: 'Minha Carteirinha' },
    { id: 'financeiro', label: 'Financeiro' },
    { id: 'dependentes', label: 'Dependentes' },
    { id: 'mural', label: 'Mural' },
    { id: 'acessos', label: 'Meus Acessos' },
  ];

  const requiresPayment = member.category === 'Amarela Carterinha' || member.category === 'Verde Carterinha'

  return (
    <Layout>
      <Head>
        <title>Dashboard | ASPMM</title>
      </Head>

      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Olá, {member.full_name.split(' ')[0]}</h2>
        <p className="text-gray-500">Bem-vindo ao seu portal de associado.</p>
      </div>

      {/* Tabs Navigation */}
      <div className="flex overflow-x-auto border-b border-gray-200 mb-8 hide-scrollbar">
        {navTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`whitespace-nowrap py-3 px-6 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-brand-blue text-brand-blue'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content: Carteirinha */}
      {activeTab === 'carteirinha' && (
        <div className="max-w-md mx-auto animate-in fade-in slide-in-from-bottom-2 duration-300">
          <section className="flex flex-col items-center">
            <DigitalCard member={member} />
          </section>
        </div>
      )}

      {/* Tab Content: Financeiro */}
      {activeTab === 'financeiro' && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <Card>
            <CardHeader className="flex items-center gap-2">
              <CreditCard className="text-brand-blue" />
              <h3 className="font-semibold text-lg">Situação Financeira</h3>
            </CardHeader>
            <CardBody>
              {!requiresPayment ? (
                <div className="text-center py-12 text-gray-500">
                  <div className="w-16 h-16 bg-brand-blueLight text-brand-blue rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <p className="text-lg font-medium text-gray-800 mb-1">Pagamento Consignado</p>
                  <p>A sua categoria ({member.category}) é isenta de pagamento via portal. O desconto é efetuado diretamente no holerite (folha de pagamento).</p>
                </div>
              ) : payments.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <div className="w-16 h-16 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <p className="text-lg font-medium text-gray-800 mb-1">Tudo certo por aqui!</p>
                  <p>Você não possui mensalidades em aberto.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {payments.map(pay => (
                    <div key={pay.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-5 border rounded-xl border-brand-blue/20 bg-brand-blueLight/10">
                      <div className="mb-4 sm:mb-0">
                        <p className="font-bold text-gray-800 text-lg">Mensalidade - {new Date(pay.due_date).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</p>
                        <p className="text-sm text-red-600 font-medium">Vencimento: {new Date(pay.due_date).toLocaleDateString('pt-BR')}</p>
                      </div>
                      <div className="text-left sm:text-right w-full sm:w-auto flex sm:flex-col justify-between items-center sm:items-end gap-2">
                        <p className="font-black text-2xl text-brand-red">{formatCurrency(pay.amount)}</p>
                        <div className="flex gap-2">
                           <Button 
                             onClick={() => handlePay(pay.id, 'PIX')} 
                             isLoading={isProcessingPayment === pay.id}
                             className="mt-0 sm:mt-2 px-4 py-2 text-sm bg-green-600 hover:bg-green-700 text-white"
                           >
                             PIX
                           </Button>
                           <Button 
                             onClick={() => handlePay(pay.id, 'CREDIT_CARD')} 
                             isLoading={isProcessingPayment === pay.id}
                             className="mt-0 sm:mt-2 px-4 py-2 text-sm"
                           >
                             Cartão / Boleto
                           </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {pixQrCode && (
                     <div className="mt-4 p-6 bg-white border border-gray-200 rounded-xl text-center">
                        <h4 className="font-bold text-lg mb-2">Pague com PIX</h4>
                        <p className="text-sm text-gray-500 mb-4">Copie o código abaixo e cole no aplicativo do seu banco:</p>
                        <textarea className="w-full h-24 p-2 border rounded font-mono text-xs mb-2" readOnly value={pixQrCode} />
                        <Button onClick={() => navigator.clipboard.writeText(pixQrCode)}>Copiar Código PIX</Button>
                     </div>
                  )}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      )}

      {/* Tab Content: Dependentes */}
      {activeTab === 'dependentes' && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          {dependents.length === 0 ? (
            <Card>
              <CardHeader className="flex items-center gap-2">
                <Users className="text-brand-blue" />
                <h3 className="font-semibold text-lg">Meus Dependentes</h3>
              </CardHeader>
              <CardBody>
                <div className="text-center py-10 text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  <p>Nenhum dependente cadastrado até o momento.</p>
                  <p className="text-sm mt-2">O seu cadastro não possui dependentes vinculados. Para adicionar dependentes, contate a administração do clube.</p>
                </div>
              </CardBody>
            </Card>
          ) : (
            <div>
              <h3 className="font-semibold text-lg text-gray-800 mb-6 flex items-center gap-2">
                <Users className="text-brand-blue" /> Carteirinhas dos Dependentes
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {dependents.map(dep => (
                  <DigitalCard key={dep.id} member={dep} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab Content: Mural */}
      {activeTab === 'mural' && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <Card>
            <CardHeader className="flex items-center gap-2">
              <Bell className="text-brand-blue" />
              <h3 className="font-semibold text-lg">Mural de Comunicados</h3>
            </CardHeader>
            <CardBody>
              {announcements.length === 0 ? (
                <div className="text-center py-10 text-gray-500">
                  <p>Nenhum comunicado no momento.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {announcements.map(ann => (
                    <div 
                      key={ann.id} 
                      onClick={() => setSelectedAnnouncement(ann)}
                      className="p-0 rounded-2xl bg-white border border-gray-200 shadow-sm relative overflow-hidden flex flex-col cursor-pointer hover:shadow-md transition-all hover:-translate-y-1"
                    >
                      <div className="absolute top-0 left-0 w-1 h-full bg-brand-blue z-10"></div>
                      {ann.image_url && (
                        <div className="w-full h-32 bg-gray-100 overflow-hidden relative border-b border-gray-100">
                           <img src={ann.image_url} alt="Capa do Comunicado" className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="p-5 flex-1 flex flex-col">
                        <h4 className="font-bold text-lg text-gray-800 mb-2 line-clamp-2">{ann.title}</h4>
                        <p className="text-gray-500 mb-4 whitespace-pre-wrap leading-relaxed text-sm line-clamp-3 flex-1">{ann.content}</p>
                        <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wider">{new Date(ann.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      )}

      {/* Tab Content: Acessos */}
      {activeTab === 'acessos' && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-2">
                <Users className="text-brand-blue" />
                <h3 className="font-semibold text-lg">Meu Histórico de Acessos</h3>
              </div>
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <input 
                  type="date" 
                  value={logStartDate} 
                  onChange={(e) => setLogStartDate(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded text-sm bg-gray-50 flex-1 sm:flex-none"
                />
                <span className="text-gray-500 text-sm">até</span>
                <input 
                  type="date" 
                  value={logEndDate} 
                  onChange={(e) => setLogEndDate(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded text-sm bg-gray-50 flex-1 sm:flex-none"
                />
              </div>
            </CardHeader>
            <CardBody>
              {accessLogs.length === 0 ? (
                <div className="text-center py-10 text-gray-500">
                  <p>Nenhum registro de acesso encontrado neste período.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {accessLogs.map(log => (
                    <div key={log.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border rounded-xl border-gray-100 bg-white gap-2">
                       <div className="font-medium text-gray-800 flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-500 flex-shrink-0">
                             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-800">Acesso Liberado</p>
                            <p className="text-xs text-gray-500">{new Date(log.created_at).toLocaleDateString('pt-BR')} às {new Date(log.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                          </div>
                       </div>
                       <div className="text-xs bg-gray-50 px-2 py-1 rounded text-gray-600 border whitespace-nowrap">
                         {log.members?.full_name}
                       </div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      )}
      
      {/* Announcement Modal */}
      {selectedAnnouncement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setSelectedAnnouncement(null)}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-black/40 hover:bg-black/60 text-white rounded-full z-20 backdrop-blur-md transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            
            <div className="overflow-y-auto overflow-x-hidden flex-1">
              {selectedAnnouncement.image_url && (
                <div className="w-full bg-gray-100 relative">
                   <img src={selectedAnnouncement.image_url} alt="Capa do Comunicado" className="w-full h-auto max-h-80 object-contain" />
                </div>
              )}
              <div className="p-6 md:p-8">
                <p className="text-sm text-brand-blue font-bold tracking-wider uppercase mb-2">Comunicado Oficial</p>
                <h3 className="font-bold text-2xl md:text-3xl text-gray-900 mb-6 leading-tight">{selectedAnnouncement.title}</h3>
                <div className="prose prose-blue max-w-none text-gray-700 whitespace-pre-wrap text-base md:text-lg leading-relaxed">
                  {selectedAnnouncement.content}
                </div>
              </div>
            </div>
            
            <div className="p-4 md:px-8 border-t border-gray-100 bg-gray-50 flex justify-between items-center text-sm text-gray-500">
               <span>Publicado em {new Date(selectedAnnouncement.created_at).toLocaleDateString('pt-BR')}</span>
               <Button onClick={() => setSelectedAnnouncement(null)} className="px-6 py-2">Fechar</Button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
