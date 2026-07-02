import type { NextApiRequest, NextApiResponse } from 'next'
import { getServiceSupabase } from '../../../lib/supabase'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { paymentId, method } = req.body // method can be 'PIX' or 'CREDIT_CARD'

  if (!paymentId || !method) {
    return res.status(400).json({ error: 'paymentId and method are required' })
  }

  const token = process.env.PAGSEGURO_TOKEN
  const env = process.env.PAGSEGURO_ENV || 'sandbox' // 'sandbox' ou 'production'

  if (!token) {
    return res.status(500).json({ error: 'PagSeguro credentials not configured on server' })
  }

  const isSandbox = env === 'sandbox'
  const baseUrl = isSandbox ? 'https://sandbox.api.pagseguro.com' : 'https://api.pagseguro.com'

  try {
    const supabaseAdmin = getServiceSupabase()

    // 1. Get Payment & Member Details
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('payments')
      .select('*, members(full_name, cpf)')
      .eq('id', paymentId)
      .single()

    if (paymentError || !payment) {
      throw new Error('Payment not found')
    }

    if (payment.status === 'paid') {
      return res.status(400).json({ error: 'Payment is already paid' })
    }

    const memberName = payment.members?.full_name || 'Associado ASPMM'
    // V4 needs raw CPF without punctuation
    const memberCpf = payment.members?.cpf?.replace(/\D/g, '') || '00000000000'
    const amountInCents = Math.round(Number(payment.amount) * 100)

    if (method === 'PIX') {
      // Create PIX Order using V4 API
      const orderBody = {
        reference_id: paymentId,
        customer: {
          name: memberName,
          email: process.env.PAGSEGURO_EMAIL || 'admin@aspmm.com.br',
          tax_id: memberCpf,
        },
        items: [
          {
            name: 'Mensalidade ASPMM',
            quantity: 1,
            unit_amount: amountInCents
          }
        ],
        qr_codes: [
          {
            amount: {
              value: amountInCents
            }
          }
        ],
        notification_urls: [
          `${process.env.NEXT_PUBLIC_SITE_URL || 'https://seusite.com.br'}/api/payments/webhook`
        ]
      }

      const psResponse = await fetch(`${baseUrl}/orders`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(orderBody)
      })

      const data = await psResponse.json()

      if (!psResponse.ok) {
        console.error("PagSeguro PIX Error:", data)
        throw new Error('Falha ao gerar PIX no PagSeguro')
      }

      const qrCodeData = data.qr_codes?.[0]
      if (qrCodeData) {
        return res.status(200).json({ 
          qrCode: qrCodeData.links.find((l: any) => l.media === 'image/png')?.href,
          qrCodeText: qrCodeData.text
        })
      }
      throw new Error('QR Code não retornado pelo PagSeguro')

    } else if (method === 'CREDIT_CARD') {
      // V2 Redirect Checkout for Credit Card
      const email = process.env.PAGSEGURO_EMAIL
      const amountStr = Number(payment.amount).toFixed(2)

      const params = new URLSearchParams()
      params.append('currency', 'BRL')
      params.append('itemId1', 'MENSALIDADE')
      params.append('itemDescription1', 'Mensalidade ASPMM')
      params.append('itemAmount1', amountStr)
      params.append('itemQuantity1', '1')
      params.append('reference', paymentId)
      params.append('senderName', memberName)

      const v2Url = isSandbox 
        ? `https://ws.sandbox.pagseguro.uol.com.br/v2/checkout?email=${email}&token=${token}`
        : `https://ws.pagseguro.uol.com.br/v2/checkout?email=${email}&token=${token}`

      const psResponse = await fetch(v2Url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
        },
        body: params.toString()
      })

      const text = await psResponse.text()

      if (!psResponse.ok) {
        console.error("PagSeguro CC Error:", text)
        throw new Error('Falha ao comunicar com PagSeguro')
      }

      const match = text.match(/<code>(.*?)<\/code>/)
      if (match && match[1]) {
        const code = match[1]
        const checkoutUrl = isSandbox
          ? `https://sandbox.pagseguro.uol.com.br/v2/checkout/payment.html?code=${code}`
          : `https://pagseguro.uol.com.br/v2/checkout/payment.html?code=${code}`
        return res.status(200).json({ checkoutUrl })
      } else {
        throw new Error('Código de pagamento não recebido')
      }
    } else {
      return res.status(400).json({ error: 'Unsupported method' })
    }

  } catch (error: any) {
    console.error(error)
    res.status(500).json({ error: error.message || 'Internal Server Error' })
  }
}
