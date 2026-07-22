import type { NextApiRequest, NextApiResponse } from 'next'
import { getServiceSupabase } from '../../../lib/supabase'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { code } = req.body

  if (!code) {
    return res.status(400).json({ error: 'Código não fornecido' })
  }

  try {
    const supabaseAdmin = getServiceSupabase()

    // 1. Encontrar o associado pelo código
    const { data: member, error: memberError } = await supabaseAdmin
      .from('members')
      .select('*')
      .eq('member_code', code)
      .single()

    if (memberError || !member) {
      return res.status(404).json({ allowed: false, reason: 'NOT_FOUND', message: 'Código de associado não encontrado.' })
    }

    // 2. Verificar se está Inativo
    if (member.status === 'inactive') {
      return res.status(200).json({ allowed: false, reason: 'INACTIVE', message: 'Sócio Inativo / Bloqueado', member })
    }

    // 3. Verificar pagamentos em atraso
    // Busca pagamentos 'pending' com data de vencimento no passado
    const today = new Date().toISOString().split('T')[0]
    
    const { data: pendingPayments, error: paymentsError } = await supabaseAdmin
      .from('payments')
      .select('*')
      .eq('member_id', member.id)
      .eq('status', 'pending')
      .lt('due_date', today)

    if (paymentsError) {
      throw paymentsError
    }

    if (pendingPayments && pendingPayments.length > 0) {
      return res.status(200).json({ allowed: false, reason: 'DEBT', message: 'Mensalidade em Atraso', member, debts: pendingPayments })
    }

    // 4. Salvar log de acesso
    // Verifica se há uma entrada sem saída hoje
    const { data: openLog } = await supabaseAdmin
      .from('access_logs')
      .select('*')
      .eq('member_id', member.id)
      .is('exit_time', null)
      .order('entry_time', { ascending: false })
      .limit(1)
      .single()

    if (openLog) {
      // Registrar saída
      await supabaseAdmin
        .from('access_logs')
        .update({ exit_time: new Date().toISOString() })
        .eq('id', openLog.id)
    } else {
      // Registrar entrada
      await supabaseAdmin
        .from('access_logs')
        .insert({ 
          member_id: member.id, 
          entry_time: new Date().toISOString() 
        })
    }

    // Se passou por tudo, está liberado
    return res.status(200).json({ allowed: true, message: 'LIBERADO', member })

  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erro interno ao validar' })
  }
}
