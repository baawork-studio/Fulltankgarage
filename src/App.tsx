import axios from 'axios'
import type { ChangeEvent, FormEvent } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  getEntryView,
  getLineIdentity,
  isLiffLoginRedirectError,
  openProfileLiff,
} from './lib/liff'
import fulltankGarageLogo from './assets/fulltank-garage-logo.jpg'
import warrantyCardBackground from './assets/warranty-card-bg.png'
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
import type {
  NoticeTone,
  Phase,
  RegistrationForm,
  StatusTone,
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
  const [isCheckingMember, setIsCheckingMember] = useState(true)
  const [isCheckingSerial, setIsCheckingSerial] = useState(false)
  const [isCheckingWalletSerial, setIsCheckingWalletSerial] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isCardEntry = getEntryView() === 'card'

  const normalizedSerial = useMemo(
    () => serialInput.trim().toUpperCase(),
    [serialInput],
  )

  const showNotice = (message: string, tone: NoticeTone = 'info') => {
    setNotice(message)
    setNoticeTone(tone)
  }

  const loadRegistrationStatus = useCallback(async () => {
    try {
      setIsCheckingMember(true)
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
  }, [])

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

        {notice ? <Notice message={notice} tone={noticeTone} /> : null}
        {phase === 'warranty-status' ? null : (
          <CompanyFooter fillAvailable={phase === 'serial'} />
        )}
      </div>
    </main>
  )
}

const getStatusTone = (status?: string): StatusTone => {
  if (status === 'approved') {
    return 'approved'
  }
  if (status === 'rejected') {
    return 'rejected'
  }

  return 'pending'
}

const getStatusMeta = (status?: string) => {
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

const getDisplayValue = (value?: string) => value?.trim() || '-'

const formatThaiDate = (value?: string | null) => {
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

function WarrantyStatusSkeleton() {
  return (
    <section className="flex min-h-dvh flex-col bg-[#111] text-white shadow-[0_18px_50px_rgba(0,0,0,0.35)]">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0a0a0a]/95 px-4 py-3 pt-[calc(env(safe-area-inset-top)+12px)] backdrop-blur">
        <div className="flex min-h-14 items-center justify-center gap-3">
          <img
            alt=""
            className="size-11 shrink-0 rounded-xl border border-white/12 object-cover"
            src={fulltankGarageLogo}
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[#ff4038]">
              FULLTANK GARAGE
            </p>
            <h1 className="truncate text-lg font-bold">
              บัตรรับประกันสินค้า
            </h1>
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-3 px-4 py-5 pb-[calc(env(safe-area-inset-bottom)+18px)]">
        <div className="overflow-hidden rounded-2xl border border-[#ff3a35]/35 bg-[#080808] shadow-[0_16px_38px_rgba(255,42,35,0.16)]">
          <div className="relative flex aspect-[667/374] min-h-[12.5rem] w-full overflow-hidden bg-[#080808] p-4">
            <img
              alt=""
              className="absolute inset-0 size-full object-fill opacity-40"
              src={warrantyCardBackground}
            />
            <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(0,0,0,0.82),rgba(0,0,0,0.42)_52%,rgba(0,0,0,0.78))]" />

            <div className="relative flex min-h-0 flex-1 flex-col justify-between">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <img
                    alt=""
                    className="size-10 shrink-0 rounded-lg border border-white/12 object-cover"
                    src={fulltankGarageLogo}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-xs font-black uppercase tracking-normal text-white/58">
                      FULLTANK Garage
                    </p>
                    <h2 className="mt-1 truncate text-xl font-black leading-tight text-white">
                      บัตรรับประกันสินค้า
                    </h2>
                  </div>
                </div>
                <span className="shrink-0 rounded-full bg-[#00d695] px-3 py-1 text-xs font-black text-white">
                  ใช้งานได้
                </span>
              </div>

              <div className="min-w-0 space-y-3">
                <div>
                  <div className="h-6 w-48 max-w-full rounded-xl skeleton-shimmer" />
                  <div className="mt-2 h-4 w-32 rounded-xl skeleton-shimmer" />
                </div>
                <div>
                  <p className="text-[0.65rem] font-black uppercase tracking-normal text-white/45">
                    Serial Number
                  </p>
                  <div className="mt-2 h-5 w-40 max-w-full rounded-xl skeleton-shimmer" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-dashed border-[#ff4038]/45 bg-[#090909] shadow-[0_16px_38px_rgba(255,42,35,0.12)]">
          <div className="relative flex aspect-[667/374] min-h-[12.5rem] w-full overflow-hidden p-5 text-center">
            <img
              alt=""
              className="absolute inset-0 size-full object-fill opacity-30"
              src={warrantyCardBackground}
            />
            <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(0,0,0,0.86),rgba(0,0,0,0.5)_52%,rgba(0,0,0,0.86))]" />
            <div className="relative flex flex-1 flex-col items-center justify-center gap-2">
              <span className="grid size-12 place-items-center rounded-2xl border border-[#ff4038]/45 bg-[#ff4038]/12 text-3xl font-black text-[#ff625d]">
                +
              </span>
              <span className="text-xl font-black text-white">
                เพิ่มบัตรรับประกัน
              </span>
              <span className="text-sm font-bold text-white/54">
                กรอก Serial Number สำหรับรถคันใหม่
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function WarrantyStatusPage({
  isCheckingSerial,
  lineIdentity,
  onAddSerial,
  registrations,
  selectedRegistration,
}: {
  isCheckingSerial: boolean
  lineIdentity: LineIdentity | null
  onAddSerial: (serialNumber: string) => Promise<void>
  registrations: WarrantyRegistration[]
  selectedRegistration: WarrantyRegistration
}) {
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set())
  const [isAddingSerial, setIsAddingSerial] = useState(false)
  const [walletSerialInput, setWalletSerialInput] = useState('')
  const visibleRegistrations =
    registrations.length > 0 ? registrations : [selectedRegistration]
  const displayNameFallback =
    lineIdentity?.lineDisplayName ||
    'FULLTANK Customer'

  const toggleExpanded = (id: number) => {
    setExpandedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleAddSerial = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await onAddSerial(walletSerialInput)
    setWalletSerialInput('')
    setIsAddingSerial(false)
  }

  return (
    <section className="flex min-h-dvh flex-col bg-[#111] text-white shadow-[0_18px_50px_rgba(0,0,0,0.35)]">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0a0a0a]/95 px-4 py-3 pt-[calc(env(safe-area-inset-top)+12px)] backdrop-blur">
        <div className="flex min-h-14 items-center justify-center gap-3">
          <img
            alt=""
            className="size-11 shrink-0 rounded-xl border border-white/12 object-cover"
            src={lineIdentity?.linePictureUrl || fulltankGarageLogo}
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[#ff4038]">
              FULLTANK GARAGE
            </p>
            <h1 className="truncate text-lg font-bold">
              บัตรรับประกันสินค้า
            </h1>
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-3 px-4 py-5 pb-[calc(env(safe-area-inset-bottom)+18px)]">
        {visibleRegistrations.map((registration, index) => (
          <WarrantyVehicleCard
            displayNameFallback={displayNameFallback}
            index={index}
            isExpanded={expandedIds.has(registration.id)}
            key={registration.id}
            onToggle={() => toggleExpanded(registration.id)}
            registration={registration}
          />
        ))}

        <div className="overflow-hidden rounded-2xl border border-dashed border-[#ff4038]/45 bg-[#090909] shadow-[0_16px_38px_rgba(255,42,35,0.12)]">
          <button
            className="relative flex aspect-[667/374] min-h-[12.5rem] w-full overflow-hidden p-5 text-center transition active:scale-[0.99]"
            onClick={() => setIsAddingSerial((current) => !current)}
            type="button"
          >
            <img
              alt=""
              className="absolute inset-0 size-full object-fill opacity-50"
              src={warrantyCardBackground}
            />
            <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(0,0,0,0.82),rgba(0,0,0,0.46)_52%,rgba(0,0,0,0.82))]" />
            <div className="relative flex flex-1 flex-col items-center justify-center gap-2">
              <span className="grid size-12 place-items-center rounded-2xl border border-[#ff4038]/45 bg-[#ff4038]/12 text-3xl font-black text-[#ff625d]">
                +
              </span>
              <span className="text-xl font-black text-white">
                เพิ่มบัตรรับประกัน
              </span>
              <span className="text-sm font-bold text-white/54">
                กรอก Serial Number สำหรับรถคันใหม่
              </span>
            </div>
          </button>

          {isAddingSerial ? (
            <form
              className="relative grid gap-2 bg-black/32 p-4 backdrop-blur-[2px]"
              onSubmit={handleAddSerial}
            >
              <input
                autoComplete="off"
                className="h-11 w-full rounded-xl border border-white/14 bg-[#0e0e0e] px-3 text-base font-bold uppercase tracking-wide text-white outline-none transition placeholder:normal-case placeholder:tracking-normal placeholder:text-white/42 focus:border-[#ff3a35] focus:ring-4 focus:ring-[#ff3a35]/16"
                inputMode="text"
                onChange={(event) =>
                  setWalletSerialInput(
                    onlyEnglishLettersAndDigits(event.target.value),
                  )
                }
                pattern="[A-Za-z0-9]*"
                placeholder="กรอก Serial Number เพิ่ม"
                value={walletSerialInput}
              />
              <button
                className="h-11 rounded-xl bg-gradient-to-r from-[#ff4038] to-[#df160d] text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-65"
                disabled={isCheckingSerial}
                type="submit"
              >
                {isCheckingSerial ? 'กำลังตรวจสอบ...' : 'ตรวจสอบและเพิ่มบัตร'}
              </button>
            </form>
          ) : null}
        </div>

      </div>
    </section>
  )
}

function WarrantyVehicleCard({
  displayNameFallback,
  index,
  isExpanded,
  onToggle,
  registration,
}: {
  displayNameFallback: string
  index: number
  isExpanded: boolean
  onToggle: () => void
  registration: WarrantyRegistration
}) {
  const displayName = registration.customerName || displayNameFallback
  const vehicleTitle =
    registration.licensePlate || registration.carModel || `คันที่ ${index + 1}`
  const fields = [
    { label: 'เบอร์โทร', value: registration.phone },
    { label: 'รุ่นรถ', value: registration.carModel },
    { label: 'ทะเบียนรถ', value: registration.licensePlate },
    {
      label: 'ฟิล์ม',
      value: [registration.filmBrand, registration.filmModel]
        .filter(Boolean)
        .join(' '),
    },
    {
      label: 'วันที่ติดตั้ง',
      value: formatThaiDate(registration.installDate),
    },
    { label: 'สาขาที่ติดตั้ง', value: registration.branch },
    { label: 'ผู้ติดตั้ง', value: registration.installerName },
  ]

  return (
    <article className="overflow-hidden rounded-2xl border border-[#ff3a35]/35 bg-[#080808] shadow-[0_16px_38px_rgba(255,42,35,0.16)]">
      <button
        aria-expanded={isExpanded}
        className="relative flex aspect-[667/374] min-h-[12.5rem] w-full overflow-hidden bg-[#080808] p-4 text-left transition active:scale-[0.99]"
        onClick={onToggle}
        type="button"
      >
        <img
          alt=""
          className="absolute inset-0 size-full object-fill"
          src={warrantyCardBackground}
        />
        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(0,0,0,0.76),rgba(0,0,0,0.2)_52%,rgba(0,0,0,0.72))]" />

        <div className="relative flex min-h-0 flex-1 flex-col justify-between">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <img
                alt=""
                className="size-10 shrink-0 rounded-lg border border-white/12 object-cover"
                src={fulltankGarageLogo}
              />
              <div className="min-w-0">
                <p className="truncate text-xs font-black uppercase tracking-normal text-white/58">
                  FULLTANK Garage
                </p>
                <h2 className="mt-1 truncate text-xl font-black leading-tight text-white">
                  บัตรรับประกันสินค้า
                </h2>
              </div>
            </div>
            <span className="shrink-0 rounded-full bg-[#00d695] px-3 py-1 text-xs font-black text-white">
              ใช้งานได้
            </span>
          </div>

          <div className="min-w-0 space-y-3">
            <div>
              <p className="truncate text-xl font-black text-white">
                {displayName}
              </p>
              <p className="mt-1 truncate text-sm font-bold text-white/62">
                {vehicleTitle}
              </p>
            </div>

            <div className="min-w-0">
              <div className="min-w-0">
                <p className="text-[0.65rem] font-black uppercase tracking-normal text-white/45">
                  Serial Number
                </p>
                <p className="truncate text-base font-black tracking-normal text-white">
                  {registration.serialNumber}
                </p>
              </div>
            </div>
          </div>
        </div>
      </button>

      <div
        className={[
          'relative grid transition-[grid-template-rows] duration-300 ease-out',
          isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        ].join(' ')}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="grid grid-cols-2 gap-2 bg-[#080808] p-4">
            {fields.map((field) => (
              <WarrantyCardField
                key={field.label}
                label={field.label}
                value={field.value}
              />
            ))}

            {registration.remarks ? (
              <div className="col-span-2">
                <WarrantyCardField
                  label="หมายเหตุ"
                  value={registration.remarks}
                />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  )
}

function WarrantyCardField({
  label,
  value,
}: {
  label: string
  value?: string
}) {
  return (
    <div className="min-w-0 rounded-xl border border-white/10 bg-black/24 px-3 py-2 backdrop-blur-[2px]">
      <p className="truncate text-[0.66rem] font-black text-white/42">{label}</p>
      <p className="mt-1 break-words text-sm font-black leading-5 text-white">
        {getDisplayValue(value)}
      </p>
    </div>
  )
}

function RegistrationStatusPage({
  lineIdentity,
  member,
  onRefresh,
}: {
  lineIdentity: LineIdentity | null
  member: RegisteredMember
  onRefresh: () => Promise<void>
}) {
  const statusMeta = getStatusMeta(member.status)
  const fullName = [member.firstName, member.lastName]
    .filter(Boolean)
    .join(' ')
  const displayName =
    fullName || lineIdentity?.lineDisplayName || member.nickname || 'FULLTANK Member'
  const avatarUrl = lineIdentity?.linePictureUrl
  const storefrontImage = member.storefrontImageUrl || member.storefrontImage
  const fields = [
    { label: 'ชื่อ', value: member.firstName },
    { label: 'นามสกุล', value: member.lastName },
    { label: 'ชื่อเล่น', value: member.nickname },
    { label: 'เบอร์โทร', value: member.phone },
    { label: 'ลิงก์ร้าน/เพจ', value: member.shopPageUrl, href: member.shopPageUrl },
  ]

  return (
    <section className="min-h-[calc(100dvh-2.5rem)] overflow-hidden rounded-[1.5rem] bg-[#fbf7f0] text-[#4b3527] shadow-[0_18px_46px_rgba(0,0,0,0.18)]">
      <header className="sticky top-0 z-10 border-b border-[#ead8c4] bg-[#fffaf3]/95 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+14px)] backdrop-blur">
        <div className="flex items-center gap-3">
          <img
            alt=""
            className="size-11 shrink-0 rounded-full border border-[#ead8c4] object-cover shadow-sm"
            src={avatarUrl || fulltankGarageLogo}
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-[#8a705b]">
              FULLTANK Garage
            </p>
            <h1 className="truncate text-lg font-semibold text-[#4b3527]">
              สถานะการลงทะเบียน
            </h1>
          </div>
        </div>
      </header>

      <div className="space-y-4 px-4 py-5 pb-[calc(env(safe-area-inset-bottom)+24px)]">
        <div className="rounded-2xl border border-[#ead8c4] bg-[#fffaf3] p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-xl font-bold text-[#4b3527]">
                {displayName}
              </p>
              <p className="mt-1 text-sm leading-6 text-[#8a705b]">
                เปิดจาก LINE Rich menu แล้วพบข้อมูลเดิมของคุณ
              </p>
            </div>
            <span
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${statusMeta.badgeClassName}`}
            >
              {statusMeta.label}
            </span>
          </div>
        </div>

        <div className={`rounded-2xl border px-4 py-5 text-center ${statusMeta.panelClassName}`}>
          <p className="text-base font-semibold text-[#4b3527]">
            {statusMeta.title}
          </p>
          <p className="mt-2 text-sm leading-6 text-[#8a705b]">
            {statusMeta.description}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {fields.slice(0, 2).map((field) => (
            <StatusField key={field.label} label={field.label} value={field.value} />
          ))}
        </div>

        {fields.slice(2).map((field) => (
          <StatusField
            href={field.href}
            key={field.label}
            label={field.label}
            value={field.value}
          />
        ))}

        <div className="block text-sm font-medium text-[#4b3527]">
          รูปหน้าร้าน
          <div className="mt-1.5 rounded-2xl border border-[#ead8c4] bg-[#fffaf3] p-3">
            {storefrontImage ? (
              <img
                alt="รูปหน้าร้าน"
                className="aspect-[4/3] w-full rounded-xl object-cover"
                src={storefrontImage}
              />
            ) : (
              <div className="grid aspect-[4/3] w-full place-items-center rounded-xl bg-[#f7e9d8] px-5 text-center text-sm leading-6 text-[#8a705b]">
                ยังไม่มีรูปหน้าร้าน
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            className="h-12 rounded-xl border border-[#ead8c4] bg-[#fffaf3] text-sm font-bold text-[#765236]"
            onClick={() => void onRefresh()}
            type="button"
          >
            อัปเดตสถานะ
          </button>
          <button
            className="h-12 rounded-xl bg-[#765236] text-sm font-bold text-white"
            onClick={openProfileLiff}
            type="button"
          >
            เปิดหน้าโปรไฟล์
          </button>
        </div>
      </div>
    </section>
  )
}

function StatusField({
  href,
  label,
  value,
}: {
  href?: string
  label: string
  value?: string
}) {
  return (
    <div className="block text-sm font-medium text-[#4b3527]">
      {label}
      <div className="mt-1.5 flex min-h-12 w-full items-center rounded-xl border border-[#ead8c4] bg-[#fffaf3] px-4 text-base text-[#4b3527]">
        {href && value ? (
          <a
            className="break-all text-[#765236] underline decoration-[#9a704d]/35 underline-offset-4"
            href={href}
            rel="noreferrer"
            target="_blank"
          >
            {value}
          </a>
        ) : (
          <span className="break-words">{getDisplayValue(value)}</span>
        )}
      </div>
    </div>
  )
}

export default App
