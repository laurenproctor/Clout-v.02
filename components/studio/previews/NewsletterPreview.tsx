interface NewsletterPreviewProps {
  subject: string
  senderName: string
  body: string
}

export function NewsletterPreview({ subject, senderName, body }: NewsletterPreviewProps) {
  return (
    <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden max-w-[560px] shadow-sm font-sans">
      {/* Email header */}
      <div className="bg-zinc-50 border-b border-zinc-100 px-5 py-3">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] text-zinc-400 w-12">From</span>
          <span className="text-[11px] font-semibold text-zinc-700">{senderName}</span>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-[10px] text-zinc-400 w-12 pt-0.5">Subject</span>
          <span className="text-[13px] font-bold text-zinc-900">
            {subject || 'Your newsletter subject...'}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="px-6 py-5">
        <p className="text-[13px] text-zinc-700 leading-relaxed whitespace-pre-wrap">
          {body || <span className="text-zinc-300">Write your newsletter content...</span>}
        </p>
      </div>

      {/* Footer */}
      <div className="bg-zinc-50 border-t border-zinc-100 px-5 py-3 text-center">
        <p className="text-[10px] text-zinc-400">
          Unsubscribe · View in browser · {senderName}
        </p>
      </div>
    </div>
  )
}
