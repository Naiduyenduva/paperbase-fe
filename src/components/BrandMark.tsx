type BrandMarkProps = {
  compact?: boolean
}

export default function BrandMark({ compact = false }: BrandMarkProps) {
  return (
    <a className={`brand${compact ? ' brand--compact' : ''}`} href="/" aria-label="Paperbase home">
      <span className="brand__icon" aria-hidden="true">
        <svg viewBox="0 0 32 32" fill="none">
          <path d="M8 5.5h11l5 5V26H8V5.5Z" />
          <path d="M19 5.5v5h5M12 15h8M12 19h8M12 23h5" />
        </svg>
      </span>
      <span>paperbase</span>
    </a>
  )
}
