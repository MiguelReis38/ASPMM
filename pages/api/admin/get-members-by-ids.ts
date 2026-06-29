import { NextApiRequest, NextApiResponse } from 'next'
import { getServiceSupabase } from '../../../lib/supabase'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' })
  }

  const { ids } = req.query
  if (!ids || typeof ids !== 'string') {
    return res.status(400).json({ error: 'IDs não fornecidos' })
  }

  const idArray = ids.split(',')

  try {
    const supabaseAdmin = getServiceSupabase()
    
    // Fetch members matching the provided IDs
    const { data: members, error } = await supabaseAdmin
      .from('members')
      .select('*')
      .in('id', idArray)

    if (error) {
      throw error
    }

    return res.status(200).json({ members })
  } catch (error: any) {
    console.error('Erro ao buscar associados para impressão:', error)
    return res.status(500).json({ error: error.message })
  }
}
