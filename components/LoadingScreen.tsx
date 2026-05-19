export default function LoadingScreen() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4">
      <img
        src="/icon-192.png"
        alt="YVY"
        className="w-20 h-20 rounded-2xl shadow-md animate-pulse"
      />
      <div className="flex gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-yvy-gold/70 animate-bounce [animation-delay:0ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-yvy-gold/70 animate-bounce [animation-delay:150ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-yvy-gold/70 animate-bounce [animation-delay:300ms]" />
      </div>
    </div>
  )
}
