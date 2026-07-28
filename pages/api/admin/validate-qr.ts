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
    
    const requiresPayment = (member.category || '').toLowerCase().includes('amarela') || (member.category || '').toLowerCase().includes('verde');

    if (requiresPayment) {
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
    }

    // 4. Salvar log de acesso
    // 4. Salvar log de acesso com ENTRADA/SAÍDA
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const { data: lastLog } = await supabaseAdmin
       .from('access_logs')
       .select('reason')
       .eq('member_id', member.id)
       .gte('created_at', startOfDay.toISOString())
       .order('created_at', { ascending: false })
       .limit(1)
       .single();

    let actionText = 'ENTRADA';
    if (lastLog && lastLog.reason === 'ENTRADA') {
       actionText = 'SAÍDA';
    }

    const { error: insertError } = await supabaseAdmin
      .from('access_logs')
      .insert({ 
        member_id: member.id, 
        status: 'success',
        reason: actionText
      })
      
    if (insertError) console.error("Erro ao registrar acesso:", insertError)

    // Se passou por tudo, está liberado
    return res.status(200).json({ allowed: true, message: `LIBERADO (${actionText})`, member, actionText })

  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erro interno ao validar' })
  }
}
