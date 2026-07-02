import type { NextApiRequest, NextApiResponse } from 'next'
import { getServiceSupabase } from '../../../lib/supabase'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const token = process.env.PAGSEGURO_TOKEN
  const email = process.env.PAGSEGURO_EMAIL
  const env = process.env.PAGSEGURO_ENV || 'sandbox'

  if (!token) return res.status(500).json({ error: 'No token' })

  const supabaseAdmin = getServiceSupabase()

  try {
    // 1. Check if it's V2 Webhook (notificationCode in body)
    if (req.body.notificationCode && req.body.notificationType === 'transaction') {
      const code = req.body.notificationCode
      const isSandbox = env === 'sandbox'
      const v2Url = isSandbox
        ? `https://ws.sandbox.pagseguro.uol.com.br/v2/transactions/notifications/${code}?email=${email}&token=${token}`
        : `https://ws.pagseguro.uol.com.br/v2/transactions/notifications/${code}?email=${email}&token=${token}`
      
      const psRes = await fetch(v2Url)
      const text = await psRes.text()
      
      // Parse XML simply for reference and status
      const refMatch = text.match(/<reference>(.*?)<\/reference>/)
      const statusMatch = text.match(/<status>(.*?)<\/status>/)
      
      if (refMatch && statusMatch) {
        const paymentId = refMatch[1]
        const status = statusMatch[1] // 3 = Paga, 4 = Disponível

        if (status === '3' || status === '4') {
          await supabaseAdmin
            .from('payments')
            .update({ status: 'paid', paid_at: new Date().toISOString() })
            .eq('id', paymentId)
        }
      }
      return res.status(200).send('OK')
    }

    // 2. Check if it's V4 Webhook (JSON payload)
    if (req.body.charges && req.body.charges.length > 0) {
      const charge = req.body.charges[0]
      const paymentId = req.body.reference_id
      const status = charge.status // 'PAID', 'DECLINED', etc.

      if (paymentId && status === 'PAID') {
        await supabaseAdmin
          .from('payments')
          .update({ status: 'paid', paid_at: new Date().toISOString() })
          .eq('id', paymentId)
      }
      return res.status(200).send('OK')
    }

    return res.status(200).send('OK (Ignored)')
  } catch (error) {
    console.error('Webhook error:', error)
    return res.status(500).send('Internal Error')
  }
}
