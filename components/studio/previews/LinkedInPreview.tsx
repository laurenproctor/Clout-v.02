interface LinkedInPreviewProps {
  accountName: string
  handle: string
  body: string
  avatarUrl?: string
}

export function LinkedInPreview({
  accountName,
  handle,
  body,
  avatarUrl,
}: LinkedInPreviewProps) {
  return (
    <div className="bg-white border border-zinc-200 rounded-xl p-4 max-w-[520px] shadow-sm font-sans">
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-zinc-200 flex-shrink-0 overflow-hidden">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-zinc-300 flex items-center justify-center text-zinc-500 text-[13px] font-bold">
              {accountName.charAt(0)}
            </div>
          )}
        </div>
        <div>
          <p className="text-[13px] font-semibold text-zinc-900">{accountName}</p>
          <p className="text-[11px] text-zinc-500">{handle}</p>
          <p className="text-[11px] text-zinc-400">1st · Just now</p>
        </div>
        <div className="ml-auto">
          <div
            className="text-[12px] font-bold px-3 py-1 rounded-full border"
            style={{ color: '#0077B5', borderColor: '#0077B5' }}
          >
            + Follow
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="text-[13px] text-zinc-800 leading-relaxed whitespace-pre-wrap mb-3">
        {body || <span className="text-zinc-300">Write your post...</span>}
      </div>

      {/* Reaction bar */}
      <div className="border-t border-zinc-100 pt-2.5 flex gap-4">
        {['👍 Like', '💬 Comment', '🔁 Repost', '📤 Send'].map((action) => (
          <button
            key={action}
            className="text-[11px] text-zinc-500 font-semibold hover:text-zinc-700 transition-colors"
          >
            {action}
          </button>
        ))}
      </div>
    </div>
  )
}
