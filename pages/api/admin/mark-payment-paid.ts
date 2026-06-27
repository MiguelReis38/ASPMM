import type { NextApiRequest, NextApiResponse } from 'next'
import { getServiceSupabase } from '../../../lib/supabase'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { paymentId } = req.body

  if (!paymentId) {
    return res.status(400).json({ error: 'paymentId is required' })
  }

  try {
    const supabaseAdmin = getServiceSupabase()

    const { error } = await supabaseAdmin
      .from('payments')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString()
      })
      .eq('id', paymentId)

    if (error) {
      throw error
    }

    res.status(200).json({ success: true })
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal Server Error' })
  }
}
