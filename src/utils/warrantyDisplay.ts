import type { StatusTone } from '../types/registration'

export const getStatusTone = (status?: string): StatusTone => {
  if (status === 'approved') {
    return 'approved'
  }
  if (status === 'rejected') {
    return 'rejected'
  }

  return 'pending'
}

export const getStatusMeta = (status?: string) => {
  const tone = getStatusTone(status)

  if (tone === 'approved') {
    return {
      label: 'ลงทะเบียนแล้ว',
      title: 'ข้อมูลของคุณได้รับการอนุมัติแล้ว',
      description: 'สามารถใช้งานเมนูสมาชิกและตรวจสอบสิทธิ์จาก Rich menu ได้ทันที',
      badgeClassName: 'bg-emerald-100 text-emerald-700',
      panelClassName: 'border-emerald-200 bg-emerald-50',
    }
  }

  if (tone === 'rejected') {
    return {
      label: 'ต้องแก้ไขข้อมูล',
      title: 'ข้อมูลยังไม่ผ่านการตรวจสอบ',
      description: 'กรุณาติดต่อร้านผ่าน LINE เพื่อสอบถามรายละเอียดและแก้ไขข้อมูล',
      badgeClassName: 'bg-[#fff1eb] text-[#b4543b]',
      panelClassName: 'border-[#f0c8bb] bg-[#fff1eb]',
    }
  }

  return {
    label: 'รอตรวจสอบ',
    title: 'ร้านได้รับข้อมูลการลงทะเบียนแล้ว',
    description: 'กรุณารอตรวจสอบข้อมูล ระบบจะอัปเดตสถานะให้อัตโนมัติหลังร้านตรวจเสร็จ',
    badgeClassName: 'bg-[#f7e9d8] text-[#765236]',
    panelClassName: 'border-[#ead8c4] bg-[#fffaf3]',
  }
}

export const getDisplayValue = (value?: string) => value?.trim() || '-'

export const formatThaiDate = (value?: string | null) => {
  if (!value) {
    return '-'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

export const formatWarrantyPeriod = (
  installDate?: string | null,
  warrantyExpiresAt?: string | null,
) => {
  const warrantyStatus = getWarrantyStatus(installDate, warrantyExpiresAt)

  if (!warrantyStatus.expiryDate) {
    return '-'
  }

  return warrantyStatus.isExpired
    ? `หมดอายุเมื่อ ${formatThaiDate(warrantyStatus.expiryDate)}`
    : `7 ปี ถึง ${formatThaiDate(warrantyStatus.expiryDate)}`
}

export const getWarrantyStatus = (
  installDate?: string | null,
  warrantyExpiresAt?: string | null,
) => {
  const expiryDate = warrantyExpiresAt || getWarrantyExpiryFromInstallDate(installDate)
  if (!expiryDate) {
    return { expiryDate: null, isExpired: false }
  }

  const expiry = new Date(expiryDate)
  if (Number.isNaN(expiry.getTime())) {
    return { expiryDate: null, isExpired: false }
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  expiry.setHours(0, 0, 0, 0)

  return { expiryDate, isExpired: today > expiry }
}

const getWarrantyExpiryFromInstallDate = (installDate?: string | null) => {
  if (!installDate) {
    return null
  }

  const date = new Date(installDate)
  if (Number.isNaN(date.getTime())) {
    return null
  }

  date.setFullYear(date.getFullYear() + 7)
  return date.toISOString()
}
