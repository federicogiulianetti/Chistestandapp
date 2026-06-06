import { countryCode } from '@/lib/countries'

export default function CountryFlag({ country }: { country?: string | null }) {
  const code = countryCode(country)
  return (
    <span className="whitespace-nowrap">
      {code && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`https://flagcdn.com/24x18/${code}.png`}
          srcSet={`https://flagcdn.com/48x36/${code}.png 2x`}
          width={24}
          height={18}
          alt=""
          style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '8px', borderRadius: '2px' }}
        />
      )}
      <span style={{ verticalAlign: 'middle' }}>{country || '—'}</span>
    </span>
  )
}