import { ConversationsFeed } from '@/components/conversations/ConversationsFeed'

export default function ConversationsPage() {
  return (
    <div className="flex flex-col h-full">
      <div className="border-b px-6 py-4 flex-shrink-0">
        <h1 className="text-xl font-semibold">Conversations</h1>
        <p className="text-sm text-muted-foreground mt-1">
          High-leverage conversations to contribute to today
        </p>
      </div>
      <ConversationsFeed />
    </div>
  )
}
