import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const supabaseAuth = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { buyer_id, seller_id, lock_amount } = body

    if (!buyer_id || !seller_id || !lock_amount) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: authData } = await supabaseAuth.auth.getUser(token)

    if (!authData?.user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const brokerId = authData.user.id

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', brokerId)
      .single()

    if (profile?.role !== 'broker') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data, error } = await supabaseAdmin
      .from('deals')
      .insert({
        buyer_id,
        seller_id,
        broker_id: brokerId,
        lock_amount,
        status: 'created'
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}