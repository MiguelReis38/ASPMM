import type { NextApiRequest, NextApiResponse } from 'next'
import { getServiceSupabase } from '../../../lib/supabase'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { id } = req.body

  if (!id) {
    return res.status(400).json({ error: 'ID do membro é obrigatório' })
  }

  try {
    const supabaseAdmin = getServiceSupabase()

    // Retrieve the member to see if they have an associated auth user
    const { data: member, error: fetchError } = await supabaseAdmin
      .from('members')
      .select('user_id')
      .eq('id', id)
      .single()

    if (fetchError) throw fetchError

    // Note: If they have dependents, deleting the primary member might violate foreign key constraints
    // unless the foreign key has ON DELETE CASCADE.
    // Let's delete the member from the 'members' table.
    const { error: deleteError } = await supabaseAdmin
      .from('members')
      .delete()
      .eq('id', id)

    if (deleteError) {
      if (deleteError.code === '23503') { // Foreign key violation
        throw new Error('Não é possível excluir este titular pois existem dependentes vinculados a ele. Exclua os dependentes primeiro.')
      }
      throw deleteError
    }

    // Optionally delete the Auth user if it exists
    if (member && member.user_id) {
      await supabaseAdmin.auth.admin.deleteUser(member.user_id)
    }

    res.status(200).json({ success: true })
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erro ao excluir associado' })
  }
}
