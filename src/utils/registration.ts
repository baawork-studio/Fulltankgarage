import axios from 'axios'

export const onlyDigits = (value: string) => value.replace(/\D/g, '')

export const onlyEnglishLettersAndDigits = (value: string) =>
  value.replace(/[^a-zA-Z0-9]/g, '')

export const getInitialSerialFromUrl = () => {
  const params = new URLSearchParams(window.location.search)
  return onlyEnglishLettersAndDigits(params.get('serial') || '').toUpperCase()
}

export const getInputClass = (hasError?: boolean) =>
  [
    'block h-12 w-full min-w-0 max-w-full rounded-xl border bg-[#101010] px-4 text-base text-white outline-none transition',
    'placeholder:text-white/38 focus:border-[#C0392B] focus:ring-4 focus:ring-[#C0392B]/16',
    hasError ? 'border-[#C0392B]' : 'border-white/14',
  ].join(' ')

export const getApiErrorMessage = (error: unknown) => {
  if (axios.isAxiosError<{ message?: string }>(error)) {
    return (
      error.response?.data?.message ||
      'ระบบยังไม่สามารถทำรายการได้ กรุณาลองใหม่อีกครั้ง'
    )
  }

  return error instanceof Error
    ? error.message
    : 'ระบบยังไม่สามารถทำรายการได้ กรุณาลองใหม่อีกครั้ง'
}
