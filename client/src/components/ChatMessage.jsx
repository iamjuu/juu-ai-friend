export default function ChatMessage({ message }) {
  const isUser = message.role === 'user'
  const time = message.timestamp
    ? new Date(message.timestamp).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : ''

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-3xl px-4 py-3 shadow-sm ${
          isUser
            ? 'rounded-br-md bg-orange-600 text-orange-50'
            : 'rounded-bl-md bg-white/80 text-stone-800 dark:bg-stone-900/80 dark:text-orange-50'
        }`}
      >
        <p className="whitespace-pre-wrap text-[1.05rem] leading-relaxed">{message.text}</p>
        <p className={`mt-1 text-[11px] ${isUser ? 'text-orange-100/80' : 'text-stone-500 dark:text-orange-200/50'}`}>
          {isUser ? 'Juu' : 'Juu Pennu'} {time ? `· ${time}` : ''}
        </p>
      </div>
    </div>
  )
}
