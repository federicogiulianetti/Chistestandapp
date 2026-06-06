'use client'

type Props = {
  message: string
  children: React.ReactNode
  className?: string
  formAction?: (formData: FormData) => void | Promise<void>
}

export default function ConfirmSubmit({ message, children, className, formAction }: Props) {
  return (
    <button
      type="submit"
      formAction={formAction}
      className={className}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault()
      }}
    >
      {children}
    </button>
  )
}