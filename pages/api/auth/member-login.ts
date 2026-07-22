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

      // Instead of creating a dummy email, we tell the frontend to show the setup screen
      return res.status(200).json({ 
        requireSetup: true, 
        memberId: member.id, 
        memberCode: member.member_code,
        fullName: member.full_name 
      })
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
