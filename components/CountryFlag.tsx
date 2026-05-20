import Image from 'next/image'

type Size = 'sm' | 'md' | 'lg'

const SIZES: Record<Size, { width: number; height: number; srcWidth: number }> = {
  sm: { width: 24, height: 16, srcWidth: 40 },
  md: { width: 36, height: 24, srcWidth: 80 },
  lg: { width: 48, height: 32, srcWidth: 80 },
}

export function CountryFlag({
  code,
  name,
  size = 'md',
}: {
  code: string
  name: string
  size?: Size
}) {
  const { width, height, srcWidth } = SIZES[size]

  return (
    <Image
      src={`https://flagcdn.com/w${srcWidth}/${code}.png`}
      width={width}
      height={height}
      alt={name}
      className="rounded-sm shrink-0 object-cover"
      style={{ width, height, aspectRatio: '3/2' }}
    />
  )
}
