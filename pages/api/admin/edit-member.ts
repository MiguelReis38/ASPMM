import type { NextApiRequest, NextApiResponse } from 'next'
import { getServiceSupabase } from '../../../lib/supabase'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { id, fullName, cpf, workplace, birthDate, category, address, phone, validityDate, cardNumber, primaryMemberCode, photoUrl, matricula, created_at } = req.body

  try {
    const supabaseAdmin = getServiceSupabase()

    let primaryMemberId = null;
    const isDependentCategory = (category || '').toLowerCase().includes('dependente');
    if (isDependentCategory && primaryMemberCode) {
      const { data: primaryData, error: primaryError } = await supabaseAdmin
        .from('members')
        .select('id')
        .or(`member_code.eq."${primaryMemberCode}",full_name.ilike."%${primaryMemberCode}%"`)
        .single()
      
      if (primaryError || !primaryData) {
        throw new Error('Código do Sócio Titular inválido ou não encontrado.')
      }
      primaryMemberId = primaryData.id
    } else if (isDependentCategory && !primaryMemberCode) {
      throw new Error('Para salvar um dependente, é obrigatório informar o Código do Titular.')
    }

    const updates: any = {
      full_name: fullName,
      cpf: cpf,
      workplace: workplace || 'Não informado',
      birth_date: birthDate || null,
      category: category || 'Titular',
      address: address || null,
      phone: phone || null,
      validity_date: validityDate ? validityDate : null,
      card_number: cardNumber,
      is_dependent: isDependentCategory,
      primary_member_id: primaryMemberId,
      matricula: matricula || null
    }

    if (photoUrl) updates.photo_url = photoUrl;
    if (created_at) updates.created_at = new Date(created_at).toISOString();

    const { data, error: memberError } = await supabaseAdmin
      .from('members')
      .update(updates)
      .eq('id', id)

    if (memberError) {
      throw memberError
    }

    res.status(200).json({ success: true })
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal Server Error' })
  }
}
