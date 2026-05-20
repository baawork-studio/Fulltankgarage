import axios from 'axios'
import type { ChangeEvent, FormEvent } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  getEntryView,
  getLineIdentity,
  isLiffLoginRedirectError,
} from './lib/liff'
import {
  getRegisteredMember,
  type RegisteredMember,
} from './services/authService'
import {
  checkSerialNumber,
  getWarrantyRegistrations,
  linkWarrantyBySerial,
  registerWarranty,
  type WarrantyRegistration,
} from './services/warrantyService'
import type { LineIdentity } from './lib/liff'
import {
  CompanyFooter,
  Notice,
  RegistrationGateSkeleton,
  SerialGate,
  SuccessCard,
  WarrantyForm,
} from './components/RegistrationFlow'
import {
  RegistrationStatusPage,
  WarrantyStatusPage,
  WarrantyStatusSkeleton,
} from './components/WarrantyStatus'
import type {
  NoticeTone,
  Phase,
  RegistrationForm,
} from './types/registration'
import {
  getApiErrorMessage,
  getInitialSerialFromUrl,
  onlyDigits,
  onlyEnglishLettersAndDigits,
} from './utils/registration'

const initialForm: RegistrationForm = {
  serialNumber: '',
  customerName: '',
  phone: '',
  carModel: '',
  licensePlate: '',
  filmBrand: '',
  filmModel: '',
  installDate: '',
  branch: '',
  installerName: '',
  receiptFile: null,
  remarks: '',
}

function App() {
  const isCardEntry = getEntryView() === 'card'
  const [phase, setPhase] = useState<Phase>('serial')
  const [serialInput, setSerialInput] = useState(getInitialSerialFromUrl)
  const [isConsentAccepted, setIsConsentAccepted] = useState(false)
  const [form, setForm] = useState<RegistrationForm>(initialForm)
  const [registeredMember, setRegisteredMember] =
    useState<RegisteredMember | null>(null)
  const [warrantyRegistration, setWarrantyRegistration] =
    useState<WarrantyRegistration | null>(null)
  const [warrantyRegistrations, setWarrantyRegistrations] = useState<
    WarrantyRegistration[]
  >([])
  const [lineIdentity, setLineIdentity] = useState<LineIdentity | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [notice, setNotice] = useState('')
  const [noticeTone, setNoticeTone] = useState<NoticeTone>('info')
  const [noticeKey, setNoticeKey] = useState(0)
  const [isCheckingMember, setIsCheckingMember] = useState(isCardEntry)
  const [isCheckingSerial, setIsCheckingSerial] = useState(false)
  const [isCheckingWalletSerial, setIsCheckingWalletSerial] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const noticeTimerRef = useRef<ReturnType<typeof window.setTimeout> | null>(
    null,
  )

  const normalizedSerial = useMemo(
    () => serialInput.trim().toUpperCase(),
    [serialInput],
  )

  const showNotice = (message: string, tone: NoticeTone = 'info') => {
    if (noticeTimerRef.current) {
      window.clearTimeout(noticeTimerRef.current)
    }

    setNotice(message)
    setNoticeTone(tone)
    setNoticeKey((current) => current + 1)
    noticeTimerRef.current = window.setTimeout(() => {
      setNotice('')
      noticeTimerRef.current = null
    }, 3200)
  }

  useEffect(() => {
    return () => {
      if (noticeTimerRef.current) {
        window.clearTimeout(noticeTimerRef.current)
      }
    }
  }, [])

  const loadRegistrationStatus = useCallback(async () => {
    try {
      setIsCheckingMember(isCardEntry)
      const identity = await getLineIdentity()
      setLineIdentity(identity)

      if (!identity.lineUserId && !identity.lineIdToken) {
        return
      }

      try {
        const warranties = await getWarrantyRegistrations(identity)
        if (warranties.length > 0) {
          setWarrantyRegistrations(warranties)
          setWarrantyRegistration(warranties[0])
          setPhase('warranty-status')
          setNotice('')
          return
        }
      } catch (error) {
        if (!axios.isAxiosError(error) || error.response?.status !== 404) {
          throw error
        }
      }

      const member = await getRegisteredMember(identity)
      if (member.id) {
        setRegisteredMember(member)
        setPhase('status')
        setNotice('')
      }
    } catch (error) {
      if (isLiffLoginRedirectError(error)) {
        return
      }
    } finally {
      setIsCheckingMember(false)
    }
  }, [isCardEntry])

  useEffect(() => {
    void Promise.resolve().then(loadRegistrationStatus)
  }, [loadRegistrationStatus])

  const handleSerialSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrors({})

    if (!normalizedSerial) {
      showNotice('กรุณากรอก Serial Number', 'error')
      return
    }

    if (!isConsentAccepted) {
      showNotice('กรุณายืนยันการเก็บข้อมูลเพื่อรับประกันสินค้า', 'error')
      return
    }

    try {
      setIsCheckingSerial(true)
      setNotice('')
      const result = await checkSerialNumber(normalizedSerial)

      if (result.status !== 'available') {
        if (result.status === 'used') {
          const identity = await getLineIdentity()
          const linked = await linkWarrantyBySerial(normalizedSerial, identity)
          if (linked?.data) {
            const warranties = await getWarrantyRegistrations(identity)
            setLineIdentity(identity)
            setWarrantyRegistration(linked.data)
            setWarrantyRegistrations(warranties.length > 0 ? warranties : [linked.data])
            setPhase('warranty-status')
            showNotice('พบข้อมูลเดิมและผูกบัตรรับประกันกับ LINE นี้แล้ว', 'success')
            return
          }
        }

        showNotice(
          result.status === 'used'
            ? 'Serial Number นี้ถูกลงทะเบียนรับประกันแล้ว'
            : 'ไม่พบ Serial Number นี้ กรุณาตรวจสอบหมายเลขอีกครั้ง',
          'error',
        )
        return
      }

      setForm((current) => ({ ...current, serialNumber: normalizedSerial }))
      setPhase('form')
      showNotice('ตรวจสอบหมายเลขสำเร็จ กรุณากรอกข้อมูลลูกค้า', 'success')
    } catch (error) {
      showNotice(getApiErrorMessage(error), 'error')
    } finally {
      setIsCheckingSerial(false)
    }
  }

  const handleWalletSerialSubmit = async (serialNumber: string) => {
    const normalizedWalletSerial = onlyEnglishLettersAndDigits(serialNumber)
      .trim()
      .toUpperCase()
    if (!normalizedWalletSerial) {
      showNotice('กรุณากรอก Serial Number', 'error')
      return
    }

    try {
      setIsCheckingWalletSerial(true)
      setNotice('')
      const result = await checkSerialNumber(normalizedWalletSerial)

      if (result.status !== 'available') {
        if (result.status === 'used') {
          const identity = await getLineIdentity()
          const linked = await linkWarrantyBySerial(normalizedWalletSerial, identity)
          if (linked?.data) {
            const warranties = await getWarrantyRegistrations(identity)
            setLineIdentity(identity)
            setWarrantyRegistrations(warranties.length > 0 ? warranties : [linked.data])
            setWarrantyRegistration(linked.data)
            setPhase('warranty-status')
            showNotice('พบบัตรเดิมและอัปเดตรายการให้แล้ว', 'success')
            return
          }
        }

        showNotice(
          result.status === 'used'
            ? 'Serial Number นี้ถูกลงทะเบียนรับประกันแล้ว'
            : 'ไม่พบ Serial Number นี้ กรุณาตรวจสอบหมายเลขอีกครั้ง',
          'error',
        )
        return
      }

      const latestWarranty = warrantyRegistrations[0] ?? warrantyRegistration
      setForm({
        ...initialForm,
        serialNumber: normalizedWalletSerial,
        customerName: latestWarranty?.customerName ?? '',
        phone: latestWarranty?.phone ?? '',
        branch: latestWarranty?.branch ?? '',
      })
      setPhase('form')
      showNotice('ตรวจสอบหมายเลขสำเร็จ กรุณากรอกข้อมูลรถ/ฟิล์ม', 'success')
    } catch (error) {
      if (isLiffLoginRedirectError(error)) {
        return
      }

      showNotice(getApiErrorMessage(error), 'error')
    } finally {
      setIsCheckingWalletSerial(false)
    }
  }

  const handleFormChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const target = event.currentTarget
    const field = target.name as keyof RegistrationForm

    if (target instanceof HTMLInputElement && target.type === 'file') {
      setForm((current) => ({
        ...current,
        receiptFile: target.files?.[0] ?? null,
      }))
      setErrors((current) => ({ ...current, receiptFile: '' }))
      return
    }

    const value =
      field === 'phone' ? onlyDigits(target.value) : target.value

    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: '' }))
    setNotice('')
  }

  const validateRegistration = () => {
    const nextErrors: Record<string, string> = {}

    if (!form.customerName.trim()) {
      nextErrors.customerName = 'กรุณากรอกชื่อลูกค้า'
    }
    if (!/^\d{9,10}$/.test(form.phone.trim())) {
      nextErrors.phone = 'กรุณากรอกเบอร์โทร 9-10 หลัก'
    }
    if (!form.carModel.trim()) {
      nextErrors.carModel = 'กรุณากรอกรุ่นรถ'
    }
    if (!form.licensePlate.trim()) {
      nextErrors.licensePlate = 'กรุณากรอกทะเบียนรถ'
    }
    if (!form.filmBrand.trim()) {
      nextErrors.filmBrand = 'กรุณากรอกแบรนด์ฟิล์ม'
    }
    if (!form.filmModel.trim()) {
      nextErrors.filmModel = 'กรุณากรอกรุ่นฟิล์ม'
    }
    if (!form.installDate.trim()) {
      nextErrors.installDate = 'กรุณาเลือกวันที่ติดตั้ง'
    }
    if (!form.branch.trim()) {
      nextErrors.branch = 'กรุณากรอกสาขาที่ติดตั้ง'
    }

    return nextErrors
  }

  const handleRegisterSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextErrors = validateRegistration()
    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      showNotice('กรุณาตรวจสอบข้อมูลที่จำเป็นให้ครบถ้วน', 'error')
      return
    }

    try {
      setIsSubmitting(true)
      setNotice('')
      const lineIdentity = await getLineIdentity()
      const result = await registerWarranty({
        ...form,
        phone: onlyDigits(form.phone),
        ...lineIdentity,
      })
      setWarrantyRegistration(result.data)
      setWarrantyRegistrations((current) => [
        result.data,
        ...current.filter((item) => item.id !== result.data.id),
      ])
      setPhase('warranty-status')
      showNotice('ลงทะเบียนรับประกันสินค้าเรียบร้อยแล้ว', 'success')
    } catch (error) {
      if (isLiffLoginRedirectError(error)) {
        return
      }

      showNotice(getApiErrorMessage(error), 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const isWarrantyStatusPhase = phase === 'warranty-status'
  const isWarrantySurface =
    isWarrantyStatusPhase || (isCheckingMember && isCardEntry)

  return (
    <main
      className={[
        'min-h-dvh bg-[#070707] text-white',
        isWarrantySurface ? 'p-0' : 'p-3',
      ].join(' ')}
    >
      <div
        className={[
          'mx-auto flex w-full max-w-xl flex-col gap-2',
          isWarrantySurface
            ? 'min-h-dvh'
            : 'min-h-[calc(100dvh-1.5rem)]',
        ].join(' ')}
      >
        {isCheckingMember ? (
          isCardEntry ? <WarrantyStatusSkeleton /> : <RegistrationGateSkeleton />
        ) : phase === 'warranty-status' && warrantyRegistration ? (
          <WarrantyStatusPage
            isCheckingSerial={isCheckingWalletSerial}
            key={warrantyRegistration.id}
            lineIdentity={lineIdentity}
            onAddSerial={handleWalletSerialSubmit}
            registrations={warrantyRegistrations}
            selectedRegistration={warrantyRegistration}
          />
        ) : phase === 'status' && registeredMember ? (
          <RegistrationStatusPage
            lineIdentity={lineIdentity}
            member={registeredMember}
            onRefresh={loadRegistrationStatus}
          />
        ) : phase === 'serial' ? (
          <SerialGate
            isChecking={isCheckingSerial}
            isConsentAccepted={isConsentAccepted}
            onConsentChange={setIsConsentAccepted}
            onSerialChange={setSerialInput}
            onSubmit={handleSerialSubmit}
            serialNumber={serialInput}
          />
        ) : phase === 'form' ? (
          <WarrantyForm
            errors={errors}
            form={form}
            isSubmitting={isSubmitting}
            onBack={() => {
              setPhase('serial')
              setNotice('')
            }}
            onChange={handleFormChange}
            onSubmit={handleRegisterSubmit}
          />
        ) : (
          <SuccessCard
            serialNumber={form.serialNumber}
            onRestart={() => {
              setPhase('serial')
              setSerialInput('')
              setForm(initialForm)
              setIsConsentAccepted(false)
              setNotice('')
            }}
          />
        )}

        {notice ? (
          <Notice key={noticeKey} message={notice} tone={noticeTone} />
        ) : null}
        {phase === 'warranty-status' ? null : (
          <CompanyFooter fillAvailable={phase === 'serial'} />
        )}
      </div>
    </main>
  )
}

export default App
