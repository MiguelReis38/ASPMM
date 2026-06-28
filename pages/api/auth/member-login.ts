import { NextApiRequest, NextApiResponse } from 'next'
import { getServiceSupabase } from '../../../lib/supabase'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { identifier, password } = req.body

  if (!identifier || !password) {
    return res.status(400).json({ error: 'Identificador e senha são obrigatórios.' })
  }

  try {
    const supabaseAdmin = getServiceSupabase()

    // Find the member by their code
    const { data: member, error: memberError } = await supabaseAdmin
      .from('members')
      .select('id, member_code, birth_date, user_id, full_name')
      .eq('member_code', identifier)
      .single()

    if (memberError || !member) {
      return res.status(404).json({ error: 'Código do associado não encontrado.' })
    }

    // If the member doesn't have an auth account yet (e.g. CSV imported)
    if (!member.user_id) {
      // The default password is the birth_date in DDMMYYYY format
      const birthDate = member.birth_date // format: YYYY-MM-DD
      const [year, month, day] = birthDate.split('-')
      const expectedPassword = `${day}${month}${year}`

      if (password !== expectedPassword) {
        return res.status(401).json({ error: 'Senha incorreta. A senha padrão é sua data de nascimento (DDMMAAAA).' })
      }

      // Generate a dummy email
      const generatedEmail = `${member.member_code}@aspmm.com.br`

      // Create the Auth User
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: generatedEmail,
        password: password,
        email_confirm: true,
        user_metadata: {
          full_name: member.full_name
        }
      })

      if (authError || !authData.user) {
        throw new Error('Falha ao gerar credenciais de segurança para este código.')
      }

      // Update the member record with the new user_id
      await supabaseAdmin
        .from('members')
        .update({ user_id: authData.user.id })
        .eq('id', member.id)

      return res.status(200).json({ email: generatedEmail })
    } else {
      // Member already has an Auth Account, fetch their email
      const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(member.user_id)
      
      if (userError || !userData.user) {
        throw new Error('Conta de acesso corrompida. Contate o suporte.')
      }

      return res.status(200).json({ email: userData.user.email })
    }

  } catch (error: any) {
    console.error('Smart login error:', error)
    return res.status(500).json({ error: error.message || 'Erro interno no servidor' })
  }
}
