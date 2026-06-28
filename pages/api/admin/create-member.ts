import type { NextApiRequest, NextApiResponse } from 'next'
import { getServiceSupabase } from '../../../lib/supabase'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { fullName, cpf, email, workplace, birthDate, category, address, phone, validityDate, primaryMemberCode, photoUrl, matricula, createdAt } = req.body

  try {
    const supabaseAdmin = getServiceSupabase()

    // 1. Create the Auth User (if email is provided)
    let userId = null;
    if (email) {
      // Create password from birthdate (YYYY-MM-DD -> DDMMYYYY)
      const [year, month, day] = birthDate.split('-');
      const generatedPassword = `${day}${month}${year}`;

      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        password: generatedPassword,
        email_confirm: true
      })
      if (authError) throw authError
      userId = authData.user.id
    }

    // 2. Handle Dependent Linkage
    let primaryMemberId = null;
    const isDependentCategory = (category || '').toLowerCase().includes('dependente');
    if (isDependentCategory && primaryMemberCode) {
      const { data: primaryData, error: primaryError } = await supabaseAdmin
        .from('members')
        .select('id')
        .eq('member_code', primaryMemberCode)
        .single()
      
      if (primaryError || !primaryData) {
        throw new Error('Código do Sócio Titular inválido ou não encontrado.')
      }
      primaryMemberId = primaryData.id
    } else if (isDependentCategory && !primaryMemberCode) {
      throw new Error('Para cadastrar um dependente, é obrigatório informar o Código do Titular.')
    }

    // 3. Generate Unique Member Code and Card Number
    let memberCode = ''
    let isUnique = false
    while (!isUnique) {
      memberCode = Math.floor(100000 + Math.random() * 900000).toString()
      const { data: existingCode } = await supabaseAdmin
        .from('members')
        .select('id')
        .eq('member_code', memberCode)
        .single()
      if (!existingCode) isUnique = true
    }
    const generatedCardNumber = memberCode // Use the same for card number or generate another unique one. The user said "campo do numero da carteirinha", which might refer to card_number. We'll just make both the same for simplicity and uniqueness.

    // 4. Insert into members table
    const { data: memberData, error: memberError } = await supabaseAdmin
      .from('members')
      .insert({
        user_id: userId,
        member_code: memberCode,
        full_name: fullName,
        cpf: cpf,
        workplace: workplace || 'Não informado',
        birth_date: birthDate || null,
        category: category || 'Titular',
        address: address || null,
        phone: phone || null,
        validity_date: validityDate || null,
        card_number: generatedCardNumber,
        photo_url: photoUrl || null,
        is_dependent: isDependentCategory,
        primary_member_id: primaryMemberId,
        matricula: matricula || null,
        created_at: createdAt ? new Date(createdAt).toISOString() : undefined,
        status: 'active',
        role: 'member'
      })
      .select()
      .single()

    if (memberError) {
      throw memberError
    }

    res.status(200).json({ success: true, member: memberData })
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal Server Error' })
  }
}
