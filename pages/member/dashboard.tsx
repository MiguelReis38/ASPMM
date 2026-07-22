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

  useEffect(() => {
    if (member) {
      fetchDashboardData()
    }
  }, [member])

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

      // Fetch Access Logs
      const { data: logsData } = await supabase
        .from('access_logs')
        .select('*')
        .eq('member_id', member?.id)
        .order('entry_time', { ascending: false })
        .limit(20)
      
      if (logsData) setAccessLogs(logsData)

    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
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
                <div className="space-y-6">
                  {announcements.map(ann => (
                    <div key={ann.id} className="p-0 rounded-2xl bg-white border border-gray-200 shadow-sm relative overflow-hidden flex flex-col">
                      <div className="absolute top-0 left-0 w-1 h-full bg-brand-blue z-10"></div>
                      {ann.image_url && (
                        <div className="w-full h-48 sm:h-64 bg-gray-100 overflow-hidden relative">
                           <img src={ann.image_url} alt="Capa do Comunicado" className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="p-6">
                        <h4 className="font-bold text-xl text-gray-800 mb-3">{ann.title}</h4>
                        <p className="text-gray-600 mb-4 whitespace-pre-wrap leading-relaxed">{ann.content}</p>
                        <p className="text-xs text-gray-400 font-medium">{new Date(ann.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
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
            <CardHeader className="flex items-center gap-2">
              <Users className="text-brand-blue" />
              <h3 className="font-semibold text-lg">Meu Histórico de Acessos</h3>
            </CardHeader>
            <CardBody>
              {accessLogs.length === 0 ? (
                <div className="text-center py-10 text-gray-500">
                  <p>Você não possui registros de acesso recentes.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {accessLogs.map(log => (
                    <div key={log.id} className="flex flex-col sm:flex-row justify-between p-4 border rounded-xl border-gray-100 bg-white">
                       <div className="font-medium text-gray-800">
                          Data: {new Date(log.entry_time).toLocaleDateString('pt-BR')}
                       </div>
                       <div className="flex gap-6 mt-2 sm:mt-0">
                          <div>
                            <p className="text-[10px] text-gray-400 font-bold uppercase">Entrada</p>
                            <p className="font-bold text-green-600">{new Date(log.entry_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-400 font-bold uppercase">Saída</p>
                            <p className="font-bold text-orange-500">{log.exit_time ? new Date(log.exit_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}</p>
                          </div>
                       </div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      )}
    </Layout>
  )
}
