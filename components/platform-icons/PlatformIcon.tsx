import type { ChannelPlatform } from '@/types/domain'
import { cn } from '@/lib/utils'

interface PlatformIconProps {
  platform: ChannelPlatform
  size?: number
  className?: string
}

const PLATFORM_STYLES: Record<
  string,
  { bg: string; label: string; textClass: string }
> = {
  linkedin:              { bg: '#0077B5', label: 'in', textClass: 'font-black text-[9px]' },
  x:                     { bg: '#000000', label: 'X',  textClass: 'font-black text-[9px]' },
  twitter:               { bg: '#000000', label: 'X',  textClass: 'font-black text-[9px]' },
  threads:               { bg: '#000000', label: '',   textClass: '' },
  instagram:             { bg: 'gradient', label: '◻', textClass: 'font-black text-[9px]' },
  facebook:              { bg: '#1877F2', label: 'f',  textClass: 'font-black text-[10px]' },
  tiktok:                { bg: '#010101', label: 'TT', textClass: 'font-black text-[7px]' },
  newsletter:            { bg: '#FF6314', label: '✉',  textClass: 'text-[10px]' },
  wordpress:             { bg: '#21759B', label: 'W',  textClass: 'font-black text-[10px]' },
  shopify:               { bg: '#96BF48', label: 'S',  textClass: 'font-black text-[9px]' },
  google_business_profile: { bg: '#4285F4', label: 'G', textClass: 'font-black text-[9px]' },
}

const ThreadsIcon = ({ size }: { size: number }) => (
  <svg
    viewBox="0 0 192 192"
    width={size * 0.6}
    height={size * 0.6}
    fill="white"
  >
    <path d="M141.537 88.988a66.667 66.667 0 0 0-2.518-1.143c-1.482-27.307-16.403-42.94-41.457-43.1h-.34c-14.986 0-27.449 6.396-35.12 18.036l13.779 9.452c5.73-8.695 14.724-10.548 21.348-10.548h.229c8.249.053 14.474 2.452 18.503 7.129 2.932 3.405 4.893 8.111 5.864 14.05-7.314-1.243-15.224-1.626-23.68-1.141-23.82 1.371-39.134 15.264-38.105 34.568.522 9.792 5.4 18.216 13.735 23.719 7.047 4.652 16.124 6.927 25.557 6.412 12.458-.683 22.231-5.436 29.049-14.127 5.178-6.6 8.453-15.153 9.899-25.93 5.937 3.583 10.337 8.298 12.767 13.966 4.132 9.635 4.373 25.468-8.546 38.376-11.319 11.308-24.925 16.2-45.488 16.351-22.809-.169-40.06-7.484-51.275-21.742C35.236 139.966 29.808 120.682 29.605 96c.203-24.682 5.63-43.966 16.133-57.317C56.954 25.425 74.204 18.11 97.013 17.942c22.976.17 40.526 7.52 52.171 21.847 5.71 7.026 10.015 15.86 12.853 26.162l16.147-4.308c-3.44-12.68-8.853-23.606-16.219-32.668C147.036 9.607 125.202.195 97.07 0h-.113C68.882.194 47.292 9.642 32.788 28.08 19.882 44.485 13.224 67.315 13.001 95.932L13 96v.067c.224 28.617 6.882 51.447 19.788 67.854C47.292 182.358 68.882 191.806 96.957 192h.113c24.96-.173 42.554-6.708 57.048-21.189 18.963-18.945 18.392-42.692 12.142-57.27-4.484-10.454-13.033-18.945-24.723-24.553zm-55.958 55.089c-10.421.586-21.264-4.086-27.041-11.819-3.525-4.734-5.714-10.959-5.495-17.546.371-11.285 8.914-19.876 23.684-20.717 3.641-.209 7.227-.307 10.76-.307 4.969 0 9.82.367 14.474 1.094-1.691 20.734-10.923 48.028-16.382 49.295z" />
  </svg>
)

const XIcon = ({ size }: { size: number }) => (
  <svg viewBox="0 0 24 24" width={size * 0.6} height={size * 0.6} fill="white">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
)

export function PlatformIcon({
  platform,
  size = 16,
  className,
}: PlatformIconProps) {
  const config = PLATFORM_STYLES[platform] ?? {
    bg: '#71717a',
    label: '?',
    textClass: 'font-bold text-[9px]',
  }

  const borderRadius = Math.round(size * 0.25)

  const containerStyle: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius,
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background:
      config.bg === 'gradient'
        ? 'linear-gradient(135deg, #f9ce34, #ee2a7b, #6228d7)'
        : config.bg,
  }

  return (
    <span
      style={containerStyle}
      className={cn('text-white leading-none', className)}
    >
      {platform === 'threads' ? (
        <ThreadsIcon size={size} />
      ) : platform === 'x' || platform === 'twitter' ? (
        <XIcon size={size} />
      ) : (
        <span className={config.textClass}>{config.label}</span>
      )}
    </span>
  )
}
