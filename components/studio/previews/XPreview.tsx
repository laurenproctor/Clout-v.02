const X_CHAR_LIMIT = 280

interface XPreviewProps {
  handle: string
  displayName: string
  body: string
  avatarUrl?: string
}

export function XPreview({ handle, displayName, body, avatarUrl }: XPreviewProps) {
  const charCount = body.length
  const overLimit = charCount > X_CHAR_LIMIT
  const displayBody = overLimit ? body.slice(0, X_CHAR_LIMIT) : body

  return (
    <div className="bg-white border border-zinc-200 rounded-xl p-4 max-w-[480px] shadow-sm font-sans">
      <div className="flex gap-3">
        <div className="w-9 h-9 rounded-full bg-zinc-200 flex-shrink-0 overflow-hidden">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-zinc-900 flex items-center justify-center text-white text-[12px] font-bold">
              {displayName.charAt(0)}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-1 mb-1">
            <span className="text-[13px] font-bold text-zinc-900">{displayName}</span>
            <span className="text-[12px] text-zinc-500">{handle}</span>
            <span className="text-[12px] text-zinc-400">· now</span>
          </div>
          <p className="text-[13px] text-zinc-800 leading-relaxed whitespace-pre-wrap mb-3">
            {displayBody || <span className="text-zinc-300">Write your post...</span>}
            {overLimit && (
              <span className="text-red-500"> [truncated at {X_CHAR_LIMIT} chars]</span>
            )}
          </p>
          <div className="flex items-center gap-5">
            {['💬', '🔁', '♥', '📊', '📤'].map((icon) => (
              <span key={icon} className="text-zinc-400 text-[14px] cursor-pointer hover:text-zinc-600">
                {icon}
              </span>
            ))}
            <span
              className={`text-[11px] font-bold ml-auto ${
                overLimit ? 'text-red-500' : charCount > 240 ? 'text-amber-500' : 'text-zinc-400'
              }`}
            >
              {X_CHAR_LIMIT - charCount}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
