interface ThreadsPreviewProps {
  handle: string
  body: string
  avatarUrl?: string
}

export function ThreadsPreview({ handle, body, avatarUrl }: ThreadsPreviewProps) {
  return (
    <div className="bg-white border border-zinc-200 rounded-xl p-4 max-w-[440px] shadow-sm font-sans">
      <div className="flex gap-3">
        <div className="flex flex-col items-center gap-1">
          <div className="w-8 h-8 rounded-full bg-zinc-200 overflow-hidden flex-shrink-0">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-white text-[11px] font-bold">
                {handle.charAt(1) ?? 'T'}
              </div>
            )}
          </div>
          <div className="w-px flex-1 bg-zinc-100 min-h-[20px]" />
        </div>
        <div className="flex-1 min-w-0 pb-3">
          <p className="text-[13px] font-bold text-zinc-900 mb-1">{handle}</p>
          <p className="text-[13px] text-zinc-800 leading-relaxed whitespace-pre-wrap">
            {body || <span className="text-zinc-300">Write your post...</span>}
          </p>
          <div className="flex gap-3 mt-3">
            {['♥', '💬', '🔁', '📤'].map((icon) => (
              <span key={icon} className="text-zinc-400 text-[14px] cursor-pointer hover:text-zinc-600">
                {icon}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
