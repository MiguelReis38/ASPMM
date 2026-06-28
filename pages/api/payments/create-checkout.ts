import type { NextApiRequest, NextApiResponse } from 'next'
import { getServiceSupabase } from '../../../lib/supabase'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { paymentId } = req.body

  if (!paymentId) {
    return res.status(400).json({ error: 'paymentId is required' })
  }

  const email = process.env.PAGSEGURO_EMAIL
  const token = process.env.PAGSEGURO_TOKEN

  if (!email || !token) {
    return res.status(500).json({ error: 'PagSeguro credentials not configured on server' })
  }

  try {
    const supabaseAdmin = getServiceSupabase()

    // 1. Get Payment & Member Details
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('payments')
      .select('*, members(full_name, email)')
      .eq('id', paymentId)
      .single()

    if (paymentError || !payment) {
      throw new Error('Payment not found')
    }

    if (payment.status === 'paid') {
      return res.status(400).json({ error: 'Payment is already paid' })
    }

    const memberName = payment.members?.full_name || 'Associado ASPMM'
    const memberEmail = payment.members?.email || email // fallback to admin email if member has none
    const amountStr = Number(payment.amount).toFixed(2)

    // 2. Request PagSeguro Checkout Code
    const params = new URLSearchParams()
    params.append('currency', 'BRL')
    params.append('itemId1', 'MENSALIDADE')
    params.append('itemDescription1', 'Mensalidade ASPMM')
    params.append('itemAmount1', amountStr)
    params.append('itemQuantity1', '1')
    params.append('reference', paymentId)
    params.append('senderName', memberName)
    // Only send email if it's a valid format, otherwise PagSeguro blocks it.
    if (memberEmail.includes('@')) {
       params.append('senderEmail', memberEmail)
    }

    const pagSeguroUrl = `https://ws.pagseguro.uol.com.br/v2/checkout?email=${email}&token=${token}`
    
    const psResponse = await fetch(pagSeguroUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
      },
      body: params.toString()
    })

    const text = await psResponse.text()

    if (!psResponse.ok) {
       console.error("PagSeguro Error:", text)
       throw new Error('Falha ao comunicar com PagSeguro')
    }

    // Parse the XML response to extract the checkout code
    const match = text.match(/<code>(.*?)<\/code>/)
    if (match && match[1]) {
      const code = match[1]
      const checkoutUrl = `https://pagseguro.uol.com.br/v2/checkout/payment.html?code=${code}`
      return res.status(200).json({ checkoutUrl })
    } else {
      console.error("No code found in PagSeguro response:", text)
      throw new Error('Código de pagamento não recebido')
    }

  } catch (error: any) {
    console.error(error)
    res.status(500).json({ error: error.message || 'Internal Server Error' })
  }
}
