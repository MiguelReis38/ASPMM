import { NextApiRequest, NextApiResponse } from 'next'
import { getServiceSupabase } from '../../../lib/supabase'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { memberId, email, password } = req.body

  if (!memberId || !email || !password) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios.' })
  }

  try {
    const supabaseAdmin = getServiceSupabase()

    // 1. Verify member
    const { data: member, error: memberError } = await supabaseAdmin
      .from('members')
      .select('id, user_id, full_name')
      .eq('id', memberId)
      .single()

    if (memberError || !member) {
      return res.status(404).json({ error: 'Associado não encontrado.' })
    }

    if (member.user_id) {
      return res.status(400).json({ error: 'Este associado já possui uma conta configurada.' })
    }

    // 2. Create the Auth User
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim(),
      password: password,
      email_confirm: true, // Auto-confirm so they can login immediately
      user_metadata: {
        full_name: member.full_name
      }
    })

    if (authError || !authData.user) {
      // Check if email already exists
      if (authError?.message.includes('already registered')) {
         throw new Error('Este e-mail já está sendo usado por outra conta.')
      }
      throw new Error(authError?.message || 'Falha ao criar credenciais de acesso.')
    }

    // 3. Update the member record with the new user_id
    const { error: updateError } = await supabaseAdmin
      .from('members')
      .update({ user_id: authData.user.id, email: email.trim() })
      .eq('id', member.id)
      
    if (updateError) {
       // Cleanup if failed
       await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
       throw new Error('Falha ao vincular a conta ao associado.')
    }

    return res.status(200).json({ success: true })

  } catch (error: any) {
    console.error('Setup account error:', error)
    return res.status(500).json({ error: error.message || 'Erro interno no servidor' })
  }
}
