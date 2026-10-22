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
        className={`max-w-[85%] rounded-3xl px-4 py-3 shadow-lg ${
          isUser
            ? 'rounded-br-md bg-gradient-to-br from-emerald-500 to-teal-600 text-emerald-50'
            : 'rounded-bl-md glass-panel text-stone-800 dark:text-emerald-50'
        }`}
      >
        <p className="whitespace-pre-wrap text-[1.05rem] leading-relaxed">{message.text}</p>
        <p className={`mt-1 text-[11px] ${isUser ? 'text-emerald-100/80' : 'text-stone-500 dark:text-emerald-200/50'}`}>
          {isUser ? 'Aju' : 'Juu Pennu'} {time ? `· ${time}` : ''}
        </p>
      </div>
    </div>
  )
}
