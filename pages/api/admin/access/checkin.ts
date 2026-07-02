import type { NextApiRequest, NextApiResponse } from 'next'
import { getServiceSupabase } from '../../../../lib/supabase'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { memberId } = req.body

  if (!memberId) {
    return res.status(400).json({ error: 'memberId is required' })
  }

  try {
    const supabaseAdmin = getServiceSupabase()

    // Verifique se já existe um check-in em aberto (sem exit_time) hoje
    const { data: openAccess } = await supabaseAdmin
      .from('access_logs')
      .select('*')
      .eq('member_id', memberId)
      .is('exit_time', null)
      .order('entry_time', { ascending: false })
      .limit(1)
      .single()

    if (openAccess) {
      return res.status(400).json({ error: 'Sócio já está com entrada registrada (sem saída).' })
    }

    const { error } = await supabaseAdmin
      .from('access_logs')
      .insert({ member_id: memberId })

    if (error) throw error

    res.status(200).json({ success: true, message: 'Entrada registrada com sucesso!' })
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal Server Error' })
  }
}
