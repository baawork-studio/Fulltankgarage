import type { ChangeEvent, FormEvent } from 'react'
import fulltankGarageLogo from '../assets/fulltank-garage-logo.jpg'
import type { NoticeTone, RegistrationForm } from '../types/registration'
import {
  getInputClass,
  onlyEnglishLettersAndDigits,
} from '../utils/registration'

export function RegistrationGateSkeleton() {
  return (
    <section className="rounded-[1.5rem] border border-[#2d2d2d] bg-[#181818] p-[clamp(1rem,2.2dvh,1.25rem)] shadow-[0_0_30px_rgba(255,24,20,0.2)]">
      <div className="flex w-full flex-col gap-[clamp(0.9rem,1.8dvh,1.15rem)]">
        <div className="mx-auto aspect-square w-[clamp(8.75rem,22dvh,12.5rem)] max-w-[58%] rounded-xl skeleton-shimmer" />
        <div className="space-y-[clamp(0.8rem,1.55dvh,1rem)]">
          <div className="mx-auto h-8 w-4/5 rounded-xl skeleton-shimmer sm:h-9" />
          <div className="h-12 w-full rounded-xl border border-white/14 bg-[#0e0e0e] skeleton-shimmer" />
          <div className="flex items-center gap-2.5">
            <div className="size-5 shrink-0 rounded border border-white/20 skeleton-shimmer" />
            <div className="h-5 min-w-0 flex-1 rounded-xl skeleton-shimmer" />
          </div>
          <div className="h-12 w-full rounded-xl skeleton-shimmer" />
        </div>
      </div>
    </section>
  )
}

export function SerialGate({
  isChecking,
  isConsentAccepted,
  onConsentChange,
  onSerialChange,
  onSubmit,
  serialNumber,
}: {
  isChecking: boolean
  isConsentAccepted: boolean
  onConsentChange: (checked: boolean) => void
  onSerialChange: (value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  serialNumber: string
}) {
  return (
    <section className="rounded-[1.5rem] border border-[#2d2d2d] bg-[#181818] p-[clamp(1rem,2.2dvh,1.25rem)] shadow-[0_0_30px_rgba(255,24,20,0.2)]">
      <form
        className="flex w-full flex-col gap-[clamp(0.9rem,1.8dvh,1.15rem)]"
        onSubmit={onSubmit}
      >
        <img
          alt="FULLTANK Garage"
          className="mx-auto aspect-square w-[clamp(8.75rem,22dvh,12.5rem)] max-w-[58%] rounded-xl object-cover shadow-[0_12px_32px_rgba(0,0,0,0.38)]"
          src={fulltankGarageLogo}
        />

        <div className="space-y-[clamp(0.8rem,1.55dvh,1rem)]">
          <h1 className="text-center text-2xl font-black leading-tight text-[#ff3838] sm:text-3xl">
            ลงทะเบียนรับประกันสินค้า
          </h1>

          <input
            autoComplete="off"
            className="h-12 w-full rounded-xl border border-white/14 bg-[#0e0e0e] px-4 text-base font-semibold uppercase tracking-wide text-white outline-none transition placeholder:normal-case placeholder:tracking-normal placeholder:text-white/45 focus:border-[#ff3a35] focus:ring-4 focus:ring-[#ff3a35]/16"
            inputMode="text"
            onChange={(event) =>
              onSerialChange(onlyEnglishLettersAndDigits(event.target.value))
            }
            pattern="[A-Za-z0-9]*"
            placeholder="กรอก Serial Number"
            value={serialNumber}
          />

          <label className="flex items-center gap-2.5 text-[clamp(0.78rem,3.45vw,1rem)] font-semibold leading-6 text-white">
            <input
              checked={isConsentAccepted}
              className="size-5 shrink-0 rounded border-white/35 accent-[#ff2f2b]"
              onChange={(event) => onConsentChange(event.target.checked)}
              type="checkbox"
            />
            <span className="whitespace-nowrap">
              ข้าพเจ้ายินยอมให้เก็บข้อมูลเพื่อการรับประกันสินค้า
            </span>
          </label>

          <button
            className="h-12 w-full rounded-xl bg-gradient-to-r from-[#ff3b3b] to-[#d91605] text-base font-black text-white shadow-[0_14px_28px_rgba(232,26,13,0.2)] transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-65"
            disabled={isChecking}
            type="submit"
          >
            {isChecking ? 'กำลังตรวจสอบ...' : 'ลงทะเบียนรับประกัน'}
          </button>
        </div>
      </form>
    </section>
  )
}

export function WarrantyForm({
  errors,
  form,
  isSubmitting,
  onBack,
  onChange,
  onSubmit,
}: {
  errors: Record<string, string>
  form: RegistrationForm
  isSubmitting: boolean
  onBack: () => void
  onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}) {
  return (
    <section className="rounded-[1.5rem] border border-white/12 bg-[#151515] p-4 shadow-[0_0_34px_rgba(255,30,26,0.18)]">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#ff4a45]">
            Serial {form.serialNumber}
          </p>
          <h1 className="mt-1 text-2xl font-black text-white">
            ข้อมูลลงทะเบียนลูกค้า
          </h1>
        </div>
        <button
          className="rounded-xl border border-white/14 px-3 py-2 text-sm font-bold text-white/80"
          onClick={onBack}
          type="button"
        >
          ย้อนกลับ
        </button>
      </div>

      <form className="space-y-4" onSubmit={onSubmit} noValidate>
        <Field
          error={errors.customerName}
          label="ชื่อลูกค้า"
          name="customerName"
          onChange={onChange}
          placeholder="ชื่อ-นามสกุล"
          value={form.customerName}
        />
        <Field
          error={errors.phone}
          inputMode="tel"
          label="เบอร์โทร"
          maxLength={10}
          name="phone"
          onChange={onChange}
          placeholder="0814452949"
          value={form.phone}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            error={errors.carModel}
            label="รุ่นรถ"
            name="carModel"
            onChange={onChange}
            placeholder="Toyota Camry"
            value={form.carModel}
          />
          <Field
            error={errors.licensePlate}
            label="ทะเบียนรถ"
            name="licensePlate"
            onChange={onChange}
            placeholder="1กก 1234"
            value={form.licensePlate}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            error={errors.filmBrand}
            label="แบรนด์ฟิล์ม"
            name="filmBrand"
            onChange={onChange}
            placeholder="FULLTANK"
            value={form.filmBrand}
          />
          <Field
            error={errors.filmModel}
            label="รุ่นฟิล์ม"
            name="filmModel"
            onChange={onChange}
            placeholder="Ceramic Black"
            value={form.filmModel}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            error={errors.installDate}
            label="วันที่ติดตั้ง"
            name="installDate"
            onChange={onChange}
            type="date"
            value={form.installDate}
          />
          <Field
            error={errors.branch}
            label="สาขา"
            name="branch"
            onChange={onChange}
            placeholder="บางแค"
            value={form.branch}
          />
        </div>

        <Field
          error={errors.installerName}
          label="ชื่อช่างติดตั้ง"
          name="installerName"
          onChange={onChange}
          placeholder="ชื่อช่าง"
          value={form.installerName}
        />

        <label className="block text-sm font-bold text-white/86">
          รูปใบเสร็จ/หลักฐาน
          <input
            accept="image/*,.pdf"
            className="mt-2 block w-full rounded-xl border border-white/14 bg-[#101010] px-3 py-3 text-sm text-white file:mr-3 file:rounded-lg file:border-0 file:bg-[#ff332f] file:px-3 file:py-2 file:text-sm file:font-bold file:text-white"
            name="receiptFile"
            onChange={onChange}
            type="file"
          />
        </label>

        <label className="block text-sm font-bold text-white/86">
          หมายเหตุ
          <textarea
            className="mt-2 min-h-24 w-full rounded-xl border border-white/14 bg-[#101010] px-4 py-3 text-base text-white outline-none placeholder:text-white/38 focus:border-[#ff3a35] focus:ring-4 focus:ring-[#ff3a35]/16"
            name="remarks"
            onChange={onChange}
            placeholder="ข้อมูลเพิ่มเติม"
            value={form.remarks}
          />
        </label>

        <button
          className="h-14 w-full rounded-xl bg-gradient-to-r from-[#ff3b3b] to-[#d91605] text-lg font-black text-white transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-65"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? 'กำลังบันทึก...' : 'ลงทะเบียนรับประกัน'}
        </button>
      </form>
    </section>
  )
}

function Field({
  error,
  label,
  name,
  onChange,
  placeholder,
  value,
  type = 'text',
  inputMode,
  maxLength,
}: {
  error?: string
  label: string
  name: keyof RegistrationForm
  onChange: (event: ChangeEvent<HTMLInputElement>) => void
  placeholder?: string
  value?: string
  type?: string
  inputMode?: 'tel' | 'numeric'
  maxLength?: number
}) {
  return (
    <label className="block text-sm font-bold text-white/86">
      {label}
      <input
        aria-invalid={Boolean(error)}
        className={getInputClass(Boolean(error))}
        inputMode={inputMode}
        maxLength={maxLength}
        name={name}
        onChange={onChange}
        placeholder={placeholder}
        type={type}
        value={value}
      />
      {error ? <span className="mt-1 block text-xs text-[#ff625f]">{error}</span> : null}
    </label>
  )
}

export function SuccessCard({
  onRestart,
  serialNumber,
}: {
  onRestart: () => void
  serialNumber: string
}) {
  return (
    <section className="rounded-[1.5rem] border border-white/12 bg-[#151515] p-6 text-center shadow-[0_0_34px_rgba(255,30,26,0.18)]">
      <div className="mx-auto grid size-20 place-items-center rounded-full bg-[#ff332f] text-4xl font-black">
        ✓
      </div>
      <h1 className="mt-5 text-3xl font-black text-white">
        ลงทะเบียนเรียบร้อย
      </h1>
      <p className="mt-3 text-base leading-7 text-white/66">
        ระบบบันทึกการรับประกันของ Serial Number {serialNumber} แล้ว
      </p>
      <button
        className="mt-6 h-12 w-full rounded-xl border border-white/14 bg-white/8 text-base font-bold text-white"
        onClick={onRestart}
        type="button"
      >
        ลงทะเบียนหมายเลขอื่น
      </button>
    </section>
  )
}

export function Notice({ message, tone }: { message: string; tone: NoticeTone }) {
  return (
    <div
      className={[
        'rounded-xl border px-4 py-3 text-sm font-bold leading-6',
        tone === 'success'
          ? 'border-emerald-400/30 bg-emerald-500/12 text-emerald-100'
          : tone === 'error'
            ? 'border-[#ff3a35]/35 bg-[#ff3a35]/14 text-[#ffd7d5]'
            : 'border-white/14 bg-white/8 text-white/78',
      ].join(' ')}
      role="status"
    >
      {message}
    </div>
  )
}

export function CompanyFooter({ fillAvailable = false }: { fillAvailable?: boolean }) {
  return (
    <footer
      className={[
        'rounded-[1rem] border border-white/12 bg-[#101010] px-4 text-center text-white/74',
        fillAvailable
          ? 'flex flex-1 py-[clamp(1rem,3dvh,2rem)]'
          : 'py-3',
      ].join(' ')}
    >
      <div
        className={
          fillAvailable
            ? 'flex min-h-0 w-full flex-1 flex-col justify-evenly'
            : ''
        }
      >
        <p
          className={[
            'font-black text-white',
            fillAvailable
              ? 'text-[clamp(1.25rem,5.1vw,1.8rem)] leading-tight'
              : 'text-sm leading-5',
          ].join(' ')}
        >
          FULLTANK Garage Co., LTD
        </p>
        <p
          className={[
            'font-semibold',
            fillAvailable
              ? 'text-[clamp(0.9rem,3.75vw,1.18rem)] leading-[1.75]'
              : 'mt-1.5 text-xs leading-5',
          ].join(' ')}
        >
          1464/1 ซอยกาญจนาภิเษก 008 แขวงบางแค เขตบางแค กรุงเทพฯ 10160
        </p>
        <p
          className={[
            'font-semibold',
            fillAvailable
              ? 'text-[clamp(0.9rem,3.75vw,1.18rem)] leading-[1.75]'
              : 'text-xs leading-5',
          ].join(' ')}
        >
          โทรศัพท์: <a className="text-[#8fd1ff]" href="tel:0814452949">081 445 2949</a>
        </p>
        <p
          className={[
            'font-semibold',
            fillAvailable
              ? 'text-[clamp(0.9rem,3.75vw,1.18rem)] leading-[1.75]'
              : 'text-xs leading-5',
          ].join(' ')}
        >
          เวลาเปิดทำการ: เปิดทุกวัน (หยุดวันพฤหัสบดี) เวลา 10:00 - 20:00 น.
        </p>
      </div>
    </footer>
  )
}
