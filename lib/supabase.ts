import { db, auth, firebaseConfig } from './firebase'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
} from 'firebase/firestore'
import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth'

// Helper to generate UUID v4 compatible IDs
function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

function sanitizeForFirestore(obj: Record<string, any>): Record<string, any> {
  const clean: Record<string, any> = {}
  for (const [k, v] of Object.entries(obj)) {
    clean[k] = v === undefined ? null : v
  }
  return clean
}

function mapUser(u: FirebaseUser) {
  return {
    id: u.uid,
    email: u.email || '',
    user_metadata: { full_name: u.displayName || '' },
  }
}

function mapSession(u: FirebaseUser) {
  return {
    user: mapUser(u),
    access_token: 'firebase-session',
  }
}

// In-memory store for uploaded files (Data URLs) before getPublicUrl is called
const uploadedFilesMap = new Map<string, string>()

async function fileToDataUrl(file: File | Blob): Promise<string> {
  if (typeof window !== 'undefined' && typeof document !== 'undefined' && file.type.startsWith('image/')) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          const maxDim = 600
          let width = img.width
          let height = img.height
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width)
              width = maxDim
            } else {
              width = Math.round((width * maxDim) / height)
              height = maxDim
            }
          }
          const canvas = document.createElement('canvas')
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height)
            resolve(canvas.toDataURL('image/jpeg', 0.82))
          } else {
            resolve(e.target?.result as string)
          }
        }
        img.onerror = () => resolve(e.target?.result as string)
        img.src = e.target?.result as string
      }
      reader.onerror = (err) => reject(err)
      reader.readAsDataURL(file)
    })
  }

  // Fallback for non-browser or non-image
  if (typeof Buffer !== 'undefined' && typeof (file as any).arrayBuffer === 'function') {
    const ab = await (file as any).arrayBuffer()
    const b64 = Buffer.from(ab).toString('base64')
    return `data:${file.type || 'application/octet-stream'};base64,${b64}`
  }

  return ''
}

type FilterFn = (row: any) => boolean

class FirestoreQueryBuilder implements PromiseLike<{ data: any; error: any }> {
  private tableName: string
  private op: 'select' | 'insert' | 'update' | 'delete' = 'select'
  private selectColumns: string = '*'
  private filters: FilterFn[] = []
  private eqHint: { field: string; value: any } | null = null
  private orderField: string | null = null
  private orderAsc: boolean = true
  private limitCount: number | null = null
  private isSingle: boolean = false
  private payload: any = null

  constructor(tableName: string) {
    this.tableName = tableName
  }

  select(columns: string = '*') {
    if (this.op === 'select') {
      this.selectColumns = columns
    } else {
      this.selectColumns = columns
    }
    return this
  }

  insert(values: any) {
    this.op = 'insert'
    this.payload = values
    return this
  }

  update(values: any) {
    this.op = 'update'
    this.payload = values
    return this
  }

  delete() {
    this.op = 'delete'
    return this
  }

  eq(field: string, value: any) {
    if (!this.eqHint && field !== 'id') {
      this.eqHint = { field, value }
    } else if (field === 'id') {
      this.eqHint = { field: 'id', value }
    }
    this.filters.push((row) => row[field] === value)
    return this
  }

  in(field: string, values: any[]) {
    const set = new Set(values)
    this.filters.push((row) => set.has(row[field]))
    return this
  }

  is(field: string, value: any) {
    if (value === null) {
      this.filters.push((row) => row[field] === null || row[field] === undefined)
    } else {
      this.filters.push((row) => row[field] === value)
    }
    return this
  }

  lt(field: string, value: any) {
    this.filters.push((row) => row[field] !== null && row[field] !== undefined && row[field] < value)
    return this
  }

  gte(field: string, value: any) {
    this.filters.push((row) => row[field] !== null && row[field] !== undefined && row[field] >= value)
    return this
  }

  lte(field: string, value: any) {
    this.filters.push((row) => row[field] !== null && row[field] !== undefined && row[field] <= value)
    return this
  }

  or(expr: string) {
    // Example: member_code.eq."123",full_name.ilike."%Joao%"
    const parts = expr.split(',')
    const subFilters: FilterFn[] = []

    for (const part of parts) {
      const eqMatch = part.match(/^([a-zA-Z0-9_]+)\.eq\."?([^"]*)"?$/)
      if (eqMatch) {
        const [, col, val] = eqMatch
        subFilters.push((row) => String(row[col] || '').toLowerCase() === val.toLowerCase())
        continue
      }
      const ilikeMatch = part.match(/^([a-zA-Z0-9_]+)\.ilike\."?%?([^%"]*)%?"?$/)
      if (ilikeMatch) {
        const [, col, val] = ilikeMatch
        subFilters.push((row) =>
          String(row[col] || '')
            .toLowerCase()
            .includes(val.toLowerCase())
        )
        continue
      }
    }

    if (subFilters.length > 0) {
      this.filters.push((row) => subFilters.some((fn) => fn(row)))
    }
    return this
  }

  order(field: string, opts?: { ascending?: boolean }) {
    this.orderField = field
    this.orderAsc = opts?.ascending !== undefined ? opts.ascending : true
    return this
  }

  limit(count: number) {
    this.limitCount = count
    return this
  }

  single() {
    this.isSingle = true
    this.limitCount = 1
    return this
  }

  private async fetchMatchingDocs(): Promise<any[]> {
    const colRef = collection(db, this.tableName)
    let rawDocs: any[] = []

    if (this.eqHint && this.eqHint.field === 'id' && this.eqHint.value) {
      const snap = await getDoc(doc(db, this.tableName, String(this.eqHint.value)))
      if (snap.exists()) {
        rawDocs = [{ id: snap.id, ...snap.data() }]
      }
    } else if (this.eqHint && this.eqHint.value !== undefined) {
      const q = query(colRef, where(this.eqHint.field, '==', this.eqHint.value))
      const snap = await getDocs(q)
      rawDocs = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    } else {
      const snap = await getDocs(colRef)
      rawDocs = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    }

    let filtered = rawDocs.filter((row) => this.filters.every((fn) => fn(row)))

    if (this.orderField) {
      const f = this.orderField
      const dir = this.orderAsc ? 1 : -1
      filtered.sort((a, b) => {
        const va = a[f] ?? ''
        const vb = b[f] ?? ''
        if (va < vb) return -1 * dir
        if (va > vb) return 1 * dir
        return 0
      })
    }

    if (this.limitCount !== null) {
      filtered = filtered.slice(0, this.limitCount)
    }

    return filtered
  }

  private async execute(): Promise<{ data: any; error: any }> {
    try {
      if (this.op === 'insert') {
        const items = Array.isArray(this.payload) ? this.payload : [this.payload]
        const inserted: any[] = []
        const nowIso = new Date().toISOString()

        for (const item of items) {
          const id = item.id || generateId()
          const record: Record<string, any> = {
            ...item,
            id,
            created_at: item.created_at || nowIso,
          }

          if (this.tableName === 'members') {
            record.status = record.status || 'active'
            record.role = record.role || 'member'
            record.is_dependent = Boolean(record.is_dependent)
            record.full_name = record.full_name || 'Sem Nome'
          } else if (this.tableName === 'access_logs') {
            record.entry_time = record.entry_time || nowIso
          } else if (this.tableName === 'payments') {
            record.status = record.status || 'pending'
          }

          const cleanRecord = sanitizeForFirestore(record)
          await setDoc(doc(db, this.tableName, id), cleanRecord)
          inserted.push(cleanRecord)
        }

        if (this.isSingle) {
          return { data: inserted[0] || null, error: null }
        }
        return { data: inserted, error: null }
      }

      if (this.op === 'update') {
        const docsToUpdate = await this.fetchMatchingDocs()
        const cleanUpdates = sanitizeForFirestore(this.payload)
        const updated: any[] = []

        for (const d of docsToUpdate) {
          await updateDoc(doc(db, this.tableName, d.id), cleanUpdates)
          updated.push({ ...d, ...cleanUpdates })
        }

        if (this.isSingle) {
          return { data: updated[0] || null, error: null }
        }
        return { data: updated, error: null }
      }

      if (this.op === 'delete') {
        const docsToDelete = await this.fetchMatchingDocs()

        if (this.tableName === 'members') {
          for (const d of docsToDelete) {
            const depSnap = await getDocs(
              query(collection(db, 'members'), where('primary_member_id', '==', d.id))
            )
            if (!depSnap.empty) {
              return {
                data: null,
                error: {
                  code: '23503',
                  message:
                    'Não é possível excluir este titular pois existem dependentes vinculados a ele. Exclua os dependentes primeiro.',
                },
              }
            }
          }
        }

        for (const d of docsToDelete) {
          await deleteDoc(doc(db, this.tableName, d.id))
        }

        return { data: docsToDelete, error: null }
      }

      // SELECT operation
      const rows = await this.fetchMatchingDocs()

      // Check if relational join on members(...) is requested
      if (this.selectColumns.includes('members') && rows.length > 0) {
        const memberIds = Array.from(new Set(rows.map((r) => r.member_id).filter(Boolean)))
        const membersById = new Map<string, any>()

        for (const mId of memberIds) {
          const mSnap = await getDoc(doc(db, 'members', String(mId)))
          if (mSnap.exists()) {
            membersById.set(String(mId), { id: mSnap.id, ...mSnap.data() })
          }
        }

        for (const row of rows) {
          row.members = membersById.get(String(row.member_id)) || null
        }
      }

      if (this.isSingle) {
        if (rows.length === 0) {
          return {
            data: null,
            error: { message: 'Registro não encontrado.', code: 'PGRST116' },
          }
        }
        return { data: rows[0], error: null }
      }

      return { data: rows, error: null }
    } catch (error: any) {
      console.error(`Firestore [${this.tableName}] ${this.op} error:`, error)
      return { data: null, error: { message: error.message || 'Database error' } }
    }
  }

  then<TResult1 = { data: any; error: any }, TResult2 = never>(
    onfulfilled?: ((value: { data: any; error: any }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected)
  }
}

// Firebase Auth REST API helpers for Server/Admin operations
async function firebaseAuthRest(endpoint: string, body: Record<string, any>) {
  const apiKey = firebaseConfig.apiKey
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/${endpoint}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  return { ok: res.ok, data }
}

const firebaseAdminAuth = {
  async createUser({
    email,
    password,
    user_metadata,
  }: {
    email: string
    password?: string
    email_confirm?: boolean
    user_metadata?: { full_name?: string }
  }) {
    const cleanEmail = email.trim()
    const { ok, data } = await firebaseAuthRest('accounts:signUp', {
      email: cleanEmail,
      password: password || '123456',
      displayName: user_metadata?.full_name || '',
      returnSecureToken: true,
    })

    if (!ok) {
      const msg = data?.error?.message || 'AUTH_ERROR'
      if (msg.includes('EMAIL_EXISTS')) {
        // Try signing in with the password to get the UID if it matches
        if (password) {
          const signInRes = await firebaseAuthRest('accounts:signInWithPassword', {
            email: cleanEmail,
            password,
            returnSecureToken: true,
          })
          if (signInRes.ok && signInRes.data?.localId) {
            return {
              data: {
                user: {
                  id: signInRes.data.localId,
                  email: cleanEmail,
                },
              },
              error: null,
            }
          }
        }
        return {
          data: { user: null },
          error: { message: 'User already registered / already exists' },
        }
      }
      return {
        data: { user: null },
        error: { message: msg },
      }
    }

    return {
      data: {
        user: {
          id: data.localId,
          email: data.email || cleanEmail,
        },
      },
      error: null,
    }
  },

  async getUserById(userId: string) {
    // Look up member by user_id in Firestore
    const q = query(collection(db, 'members'), where('user_id', '==', userId))
    const snap = await getDocs(q)
    if (!snap.empty) {
      const memberData = snap.docs[0].data()
      if (memberData.email) {
        return {
          data: { user: { id: userId, email: memberData.email } },
          error: null,
        }
      }
    }
    return {
      data: { user: null },
      error: { message: 'Usuário não encontrado.' },
    }
  },

  async listUsers() {
    const snap = await getDocs(collection(db, 'members'))
    const users = snap.docs
      .map((d) => d.data())
      .filter((m) => m.user_id && m.email)
      .map((m) => ({ id: m.user_id, email: m.email }))
    return { data: { users }, error: null }
  },

  async updateUserById(userId: string, updates: { email?: string; password?: string }) {
    // Also update email on member document if present
    const q = query(collection(db, 'members'), where('user_id', '==', userId))
    const snap = await getDocs(q)
    for (const d of snap.docs) {
      if (updates.email) {
        await updateDoc(doc(db, 'members', d.id), { email: updates.email.trim() })
      }
    }
    return { data: { user: { id: userId, email: updates.email } }, error: null }
  },

  async deleteUser(_userId: string) {
    return { data: {}, error: null }
  },
}

export const supabase = {
  from(tableName: string) {
    return new FirestoreQueryBuilder(tableName)
  },

  auth: {
    async signInWithPassword({ email, password }: { email: string; password: string }) {
      try {
        const cred = await signInWithEmailAndPassword(auth, email.trim(), password)
        return {
          data: {
            user: mapUser(cred.user),
            session: mapSession(cred.user),
          },
          error: null,
        }
      } catch (err: any) {
        let friendlyMessage = 'E-mail ou senha incorretos.'
        if (err.code === 'auth/too-many-requests') {
          friendlyMessage = 'Muitas tentativas. Aguarde alguns instantes e tente novamente.'
        } else if (err.code === 'auth/invalid-email') {
          friendlyMessage = 'Formato de e-mail inválido.'
        }
        return {
          data: { user: null, session: null },
          error: new Error(friendlyMessage),
        }
      }
    },

    async signOut() {
      await firebaseSignOut(auth)
      return { error: null }
    },

    async getSession() {
      if (typeof (auth as any).authStateReady === 'function') {
        await (auth as any).authStateReady()
      }
      const current = auth.currentUser
      return {
        data: {
          session: current ? mapSession(current) : null,
        },
        error: null,
      }
    },

    onAuthStateChange(callback: (event: string, session: any) => void) {
      const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        const session = firebaseUser ? mapSession(firebaseUser) : null
        callback(firebaseUser ? 'SIGNED_IN' : 'SIGNED_OUT', session)
      })
      return {
        data: {
          subscription: { unsubscribe },
        },
      }
    },

    admin: firebaseAdminAuth,
  },

  storage: {
    from(_bucket: string) {
      return {
        async upload(path: string, file: File | Blob) {
          try {
            const dataUrl = await fileToDataUrl(file)
            uploadedFilesMap.set(path, dataUrl)
            return { data: { path }, error: null }
          } catch (err: any) {
            return { data: null, error: { message: err.message || 'Upload error' } }
          }
        },
        getPublicUrl(path: string) {
          const publicUrl = uploadedFilesMap.get(path) || path
          return { data: { publicUrl } }
        },
      }
    },
  },
}

export const getServiceSupabase = () => supabase