import type { NextApiRequest, NextApiResponse } from 'next'
import { getServiceSupabase } from '../../../lib/supabase'

// Function duplicated from utils because API routes don't always import ES modules correctly if not configured
function getTenthBusinessDay(year: number, month: number): Date {
  let businessDays = 0;
  let currentDate = new Date(year, month, 1);
  
  while (businessDays < 10) {
    const dayOfWeek = currentDate.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      businessDays++;
    }
    if (businessDays < 10) {
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }
  
  return currentDate;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { month, amount } = req.body;
  const feeAmount = parseFloat(amount) || 50.00;

  try {
    const supabaseAdmin = getServiceSupabase()
    
    // Get all active members with Amarela or Verde categories
    const { data: members, error: membersError } = await supabaseAdmin
      .from('members')
      .select('id')
      .eq('status', 'active')
      .in('category', ['Amarela Carterinha', 'Verde Carterinha'])

    if (membersError) throw membersError
    if (!members || members.length === 0) {
      return res.status(200).json({ success: true, message: 'Nenhum associado da categoria Verde ou Amarela encontrado.', generated: 0 })
    }

    const today = new Date()
    const currentYear = today.getFullYear()
    const targetMonth = month !== undefined ? parseInt(month) : today.getMonth()
    
    // Calcula 10º dia útil do mês selecionado
    const dueDate = getTenthBusinessDay(currentYear, targetMonth).toISOString().split('T')[0] // YYYY-MM-DD

    // For each member, check if payment already exists for this due date to avoid duplicates
    let generated = 0
    for (const member of members) {
      const { data: existing } = await supabaseAdmin
        .from('payments')
        .select('id')
        .eq('member_id', member.id)
        .eq('due_date', dueDate)
        .single()
      
      if (!existing) {
        // Create charge with dynamic amount
        const { error: insertError } = await supabaseAdmin
          .from('payments')
          .insert({
            member_id: member.id,
            amount: feeAmount,
            due_date: dueDate,
            status: 'pending'
          })
        if (!insertError) generated++
      }
    }

    res.status(200).json({ success: true, message: `${generated} mensalidades de R$ ${feeAmount.toFixed(2)} geradas para o dia ${dueDate}.`, generated })
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal Server Error' })
  }
}
