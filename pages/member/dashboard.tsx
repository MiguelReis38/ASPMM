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
import { CheckoutModal } from '../../components/CheckoutModal'

export default function MemberDashboard() {
  const { member } = useAuth()
  const [dependents, setDependents] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'carteirinha' | 'financeiro' | 'dependentes' | 'mural'>('carteirinha')
  
  // Checkout State
  const [checkoutPayment, setCheckoutPayment] = useState<any | null>(null)

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

    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handlePaymentSuccess = async () => {
    if (!checkoutPayment) return;
    await supabase.from('payments').update({ status: 'paid', paid_at: new Date().toISOString() }).eq('id', checkoutPayment.id)
    setCheckoutPayment(null)
    fetchDashboardData()
    alert('Pagamento processado com sucesso!')
  }

  if (!member || loading) return <Layout><div className="flex justify-center p-10">Carregando...</div></Layout>

  const navTabs = [
    { id: 'carteirinha', label: 'Minha Carteirinha' },
    { id: 'financeiro', label: 'Financeiro' },
    { id: 'dependentes', label: 'Dependentes' },
    { id: 'mural', label: 'Mural' },
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <section className="flex flex-col items-center">
            <DigitalCard member={member} />
          </section>
          
          <section className="flex flex-col items-center justify-center bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Acesso ao Clube</h3>
            <p className="text-sm text-gray-500 text-center mb-6 max-w-xs">Apresente este QR Code na portaria para registrar sua entrada.</p>
            <QRCodeDisplay memberId={member.id} />
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
                      <div className="text-left sm:text-right w-full sm:w-auto flex sm:flex-col justify-between items-center sm:items-end">
                        <p className="font-black text-2xl text-brand-red">{formatCurrency(pay.amount)}</p>
                        <Button onClick={() => setCheckoutPayment(pay)} className="mt-0 sm:mt-2 px-6 py-2 text-sm">
                          Pagar Agora
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      )}

      {/* Tab Content: Dependentes */}
      {activeTab === 'dependentes' && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <Card>
            <CardHeader className="flex items-center gap-2">
              <Users className="text-brand-blue" />
              <h3 className="font-semibold text-lg">Meus Dependentes</h3>
            </CardHeader>
            <CardBody>
              {dependents.length === 0 ? (
                <div className="text-center py-10 text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  <p>Nenhum dependente cadastrado até o momento.</p>
                  <p className="text-sm mt-2">O seu cadastro não possui dependentes vinculados. Para adicionar dependentes, contate a administração do clube.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {dependents.map(dep => {
                    const isExempt = isDependentExempt(dep.birth_date, dep.is_pcd)
                    return (
                      <div key={dep.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border rounded-xl border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-4 mb-3 sm:mb-0">
                           {dep.photo_url ? (
                             <img src={dep.photo_url} alt="Foto" className="w-12 h-12 rounded-full object-cover shadow-sm border border-gray-200" />
                           ) : (
                             <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                               <Users size={20} />
                             </div>
                           )}
                          <div>
                            <p className="font-bold text-gray-800">{dep.full_name}</p>
                            <p className="text-xs text-gray-500 font-mono mt-0.5">CÓDIGO: {dep.member_code}</p>
                          </div>
                        </div>
                        <div className="flex gap-2 items-center w-full sm:w-auto justify-end">
                          <span className={`text-[10px] uppercase font-bold px-3 py-1 rounded-full ${dep.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {dep.status === 'active' ? 'Ativo' : 'Inativo'}
                          </span>
                          <span className="text-[10px] uppercase font-bold px-3 py-1 rounded-full bg-brand-blueLight text-brand-blueDark border border-brand-blue/20">
                            {dep.category}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardBody>
          </Card>
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

      {checkoutPayment && (
        <CheckoutModal 
          paymentId={checkoutPayment.id}
          amount={checkoutPayment.amount}
          dueDate={checkoutPayment.due_date}
          onClose={() => setCheckoutPayment(null)}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </Layout>
  )
}
