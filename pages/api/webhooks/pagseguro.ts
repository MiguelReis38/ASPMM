import type { NextApiRequest, NextApiResponse } from 'next'
import { getServiceSupabase } from '../../../lib/supabase'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).send('Method not allowed')

  // PagSeguro sends form-urlencoded data to webhooks
  const notificationCode = req.body.notificationCode
  const notificationType = req.body.notificationType

  if (!notificationCode || notificationType !== 'transaction') {
    return res.status(200).send('Ignored')
  }

  const email = process.env.PAGSEGURO_EMAIL
  const token = process.env.PAGSEGURO_TOKEN

  if (!email || !token) {
    console.error('PagSeguro credentials missing')
    return res.status(500).send('Internal Error')
  }

  try {
    const psUrl = `https://ws.pagseguro.uol.com.br/v3/transactions/notifications/${notificationCode}?email=${email}&token=${token}`
    
    const psResponse = await fetch(psUrl, { method: 'GET' })
    const text = await psResponse.text()

    if (!psResponse.ok) {
      console.error('Failed to fetch transaction details:', text)
      return res.status(400).send('Bad Request to PS')
    }

    // Very simple XML parsing to get <status> and <reference>
    const statusMatch = text.match(/<status>(\d+)<\/status>/)
    const referenceMatch = text.match(/<reference>(.*?)<\/reference>/)

    if (statusMatch && referenceMatch) {
      const status = parseInt(statusMatch[1], 10)
      const paymentId = referenceMatch[1]

      // Status 3 = Pago, Status 4 = Disponível
      if (status === 3 || status === 4) {
        const supabaseAdmin = getServiceSupabase()
        
        // Update payment to paid
        const { error } = await supabaseAdmin
          .from('payments')
          .update({ 
            status: 'paid', 
            paid_at: new Date().toISOString() 
          })
          .eq('id', paymentId)

        if (error) {
          console.error('Failed to update payment in DB:', error)
        } else {
          console.log(`Payment ${paymentId} successfully marked as PAID via webhook`)
        }
      }
    }

    // Always return 200 OK to PagSeguro so it stops retrying
    res.status(200).send('OK')

  } catch (error) {
    console.error('Webhook error:', error)
    res.status(500).send('Internal Server Error')
  }
}
