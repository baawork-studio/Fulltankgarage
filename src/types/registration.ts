import type { WarrantyRegisterPayload } from '../services/warrantyService'

export type Phase = 'serial' | 'form' | 'success' | 'status' | 'warranty-status'
export type NoticeTone = 'info' | 'success' | 'error'
export type StatusTone = 'approved' | 'pending' | 'rejected'

export type RegistrationForm = Omit<
  WarrantyRegisterPayload,
  'lineDisplayName' | 'lineIdToken' | 'linePictureUrl' | 'lineUserId'
>
