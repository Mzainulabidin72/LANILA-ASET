import { supabase } from '@/lib/supabase'
import { removePhotos, uploadAssetPhotoBlob } from '@/lib/storage'
import type { AssetCondition, AssetStatus } from '@/types/database'
import type { OpInput } from './db'

export interface AssetSavePayload { id: string; isNew: boolean; row: Record<string, unknown>; removePhoto: boolean; oldPhotoPath: string | null; userId: string | null }
export interface AssetStatusPayload { id: string; status: AssetStatus }
export interface LoanCreatePayload { id: string; asset_id: string; employee_id: string; loan_date: string; due_date: string | null; condition_out: AssetCondition; notes: string | null; created_by: string | null }
export interface LoanReturnPayload { id: string; return_date: string; condition_in: AssetCondition; notes: string | null }
export interface MaintSavePayload { id: string; isNew: boolean; asset_id: string; title: string; description: string | null; scheduled_date: string; interval_days: number | null; cost: number; performed_by: string | null; created_by: string | null }
export interface MaintCompletePayload { id: string; asset_id: string; title: string; description: string | null; interval_days: number | null; completed_date: string; cost: number; performed_by: string | null; schedule_next: boolean; nextId: string; nextDate: string | null; userId: string | null }
export interface MaintCancelPayload { id: string }

/** Insert yang sudah pernah berhasil (mis. respons hilang saat sinyal putus) dianggap sukses, bukan error. */
function isDuplicateKey(e: { code?: string; message?: string } | null): boolean {
  return e?.code === '23505' && /pkey/.test(e.message ?? '')
}

function check(error: { code?: string; message?: string } | null) {
  if (error) throw error
}

/** Jalankan satu operasi ke Supabase. Dipakai langsung saat online, atau oleh mesin sinkronisasi. */
export async function executeOp(op: Pick<OpInput, 'type' | 'payload' | 'photo'>): Promise<void> {
  switch (op.type) {
    case 'asset.save': {
      const p = op.payload as AssetSavePayload
      const body = p.row
      const newPath = op.photo ? await uploadAssetPhotoBlob(p.id, op.photo) : undefined

      if (p.isNew) {
        const { error } = await supabase.from('aset_assets').insert({ id: p.id, ...body, photo_path: newPath ?? null, created_by: p.userId })
        if (error && !isDuplicateKey(error)) {
          if (newPath) await removePhotos([newPath])
          throw error
        }
        if (error && newPath) await removePhotos([newPath])
        return
      }
      const photoChange = newPath !== undefined ? { photo_path: newPath } : p.removePhoto ? { photo_path: null } : {}
      const { error } = await supabase.from('aset_assets').update({ ...body, ...photoChange }).eq('id', p.id)
      if (error) {
        if (newPath) await removePhotos([newPath])
        throw error
      }
      if ((newPath || p.removePhoto) && p.oldPhotoPath) await removePhotos([p.oldPhotoPath])
      return
    }
    case 'asset.status': {
      const p = op.payload as AssetStatusPayload
      check((await supabase.from('aset_assets').update({ status: p.status }).eq('id', p.id)).error)
      return
    }
    case 'loan.create': {
      const p = op.payload as LoanCreatePayload
      const { error } = await supabase.from('aset_loans').insert(p)
      if (error && !isDuplicateKey(error)) throw error
      return
    }
    case 'loan.return': {
      const { id, ...rest } = op.payload as LoanReturnPayload
      check((await supabase.from('aset_loans').update(rest).eq('id', id)).error)
      return
    }
    case 'maint.save': {
      const { id, isNew, ...rest } = op.payload as MaintSavePayload
      if (isNew) {
        const { error } = await supabase.from('aset_maintenances').insert({ id, ...rest })
        if (error && !isDuplicateKey(error)) throw error
      } else {
        const { created_by: _ignored, ...updateBody } = rest
        void _ignored
        check((await supabase.from('aset_maintenances').update(updateBody).eq('id', id)).error)
      }
      return
    }
    case 'maint.complete': {
      const p = op.payload as MaintCompletePayload
      check(
        (await supabase
          .from('aset_maintenances')
          .update({ status: 'selesai', completed_date: p.completed_date, cost: p.cost, performed_by: p.performed_by })
          .eq('id', p.id)).error,
      )
      if (p.schedule_next && p.interval_days && p.nextDate) {
        const { error } = await supabase.from('aset_maintenances').insert({
          id: p.nextId,
          asset_id: p.asset_id,
          title: p.title,
          description: p.description,
          scheduled_date: p.nextDate,
          interval_days: p.interval_days,
          cost: 0,
          status: 'terjadwal',
          created_by: p.userId,
        })
        if (error && !isDuplicateKey(error)) throw error
      }
      return
    }
    case 'maint.cancel': {
      const p = op.payload as MaintCancelPayload
      check((await supabase.from('aset_maintenances').update({ status: 'dibatalkan' }).eq('id', p.id)).error)
      return
    }
  }
}
