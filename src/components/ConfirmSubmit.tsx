'use client'

type Props = {
  message: string
  children: React.ReactNode
  className?: string
  title?: string
  ariaLabel?: string
  formAction?: (formData: FormData) => void | Promise<void>
}

export default function ConfirmSubmit({ message, children, className, title, ariaLabel, formAction }: Props) {
  return (
    <button
      type="submit"
      formAction={formAction}
      className={className}
      title={title}
      aria-label={ariaLabel}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault()
      }}
    >
      {children}
    </button>
  )
}