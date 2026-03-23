interface Props {
  isLive: boolean;
}

export function LiveIndicator({ isLive }: Props) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className={`w-2 h-2 rounded-full ${isLive ? 'bg-live live-pulse' : 'bg-unsold'}`}
      />
      <span className={`text-xs font-medium ${isLive ? 'text-live' : 'text-unsold'}`}>
        {isLive ? 'LIVE' : 'Reconnecting...'}
      </span>
    </div>
  );
}
