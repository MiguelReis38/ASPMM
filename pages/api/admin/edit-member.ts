import type { NextApiRequest, NextApiResponse } from 'next'
import { getServiceSupabase } from '../../../lib/supabase'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { id, fullName, cpf, workplace, birthDate, category, address, phone, validityDate, cardNumber, primaryMemberCode, photoUrl, matricula, createdAt, email, password } = req.body

  try {
    const supabaseAdmin = getServiceSupabase()

    // Retrieve current member to get user_id
    const { data: currentMember, error: fetchError } = await supabaseAdmin
      .from('members')
      .select('user_id')
      .eq('id', id)
      .single()
      
    if (fetchError || !currentMember) {
      throw new Error('Associado não encontrado.')
    }

    let primaryMemberId = null;
    const isDependentCategory = (category || '').toLowerCase().includes('dep');
    if (isDependentCategory && primaryMemberCode) {
      const { data: primaryData, error: primaryError } = await supabaseAdmin
        .from('members')
        .select('id')
        .or(`member_code.eq."${primaryMemberCode}",full_name.ilike."%${primaryMemberCode}%"`)
        .single()
      
      if (primaryError || !primaryData) {
        throw new Error('Titular não encontrado. Verifique o código ou o nome.')
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
    
    if (email) updates.email = email.trim();

    if (photoUrl) updates.photo_url = photoUrl;
    if (createdAt) updates.created_at = new Date(createdAt).toISOString();

    // UPDATE AUTH USER
    if (email && currentMember.user_id) {
       // Update existing user
       const authUpdates: any = { email: email.trim() }
       if (password && password.trim() !== '') {
          authUpdates.password = password
       }
       const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(currentMember.user_id, authUpdates)
       if (authError) throw new Error('Erro ao atualizar e-mail/senha de acesso: ' + authError.message)
    } else if (email && password && !currentMember.user_id) {
       // Create new auth user for member
       const { data: newAuthData, error: newAuthError } = await supabaseAdmin.auth.admin.createUser({
          email: email.trim(),
          password: password,
          email_confirm: true,
          user_metadata: { full_name: fullName }
       })
       if (newAuthError || !newAuthData.user) throw new Error('Erro ao criar conta de acesso: ' + newAuthError?.message)
       updates.user_id = newAuthData.user.id
    }

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
