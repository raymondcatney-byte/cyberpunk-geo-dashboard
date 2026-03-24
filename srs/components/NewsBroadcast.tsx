import { useState, useRef, useCallback } from 'react';
import { Volume2, VolumeX, Radio } from 'lucide-react';

interface NewsChannel {
  id: string;
  name: string;
  type: 'youtube' | 'hls';
  url: string;
}

const NEWS_CHANNELS: NewsChannel[] = [
  { id: 'skynews', name: 'Sky News', type: 'youtube', url: 'https://www.youtube.com/embed/yTyEJCGZHlo?autoplay=1&mute=1&controls=0&rel=0&modestbranding=1' },
  { id: 'bloomberg', name: 'Bloomberg', type: 'hls', url: 'https://bloomberg.com/media-manifest/streams/us.m3u8' },
  { id: 'cnn', name: 'CNN', type: 'hls', url: 'https://turnerlive.warnermediacdn.com/hls/live/586495/cnngo/cnn_slate/VIDEO_0_3564000.m3u8' },
  { id: 'dw', name: 'DW', type: 'hls', url: 'https://dwamdstream103.akamaized.net/hls/live/2015526/dwstream103/master.m3u8' },
  { id: 'france24', name: 'France 24', type: 'hls', url: 'https://amg00106-france24-france24-samsunguk-qvpp8.amagi.tv/playlist/amg00106-france24-france24-samsunguk/playlist.m3u8' },
];

export function NewsBroadcast() {
  const [activeChannel, setActiveChannel] = useState<NewsChannel>(NEWS_CHANNELS[0]);
  const [isMuted, setIsMuted] = useState(true);
  const [volume, setVolume] = useState(50);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleChannelChange = useCallback((channel: NewsChannel) => {
    setActiveChannel(channel);
    // Reset video element when switching from HLS to another HLS
    if (channel.type === 'hls' && videoRef.current) {
      videoRef.current.load();
    }
  }, []);

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseInt(e.target.value, 10);
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume / 100;
    }
  };

  return (
    <div className="border border-nerv-brown bg-nerv-void-panel">
      {/* Header */}
      <div className="border-b border-nerv-brown bg-nerv-void-panel px-3 py-2">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-nerv-orange" />
          <span className="text-[12px] font-medium text-nerv-orange uppercase tracking-wider">Live News</span>
        </div>
      </div>

      {/* Channel Selector */}
      <div className="border-b border-nerv-brown overflow-x-auto">
        <div className="flex gap-1 p-2 min-w-max">
          {NEWS_CHANNELS.map((channel) => (
            <button
              key={channel.id}
              onClick={() => handleChannelChange(channel)}
              className={`px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider transition-all whitespace-nowrap ${
                activeChannel.id === channel.id
                  ? 'bg-nerv-orange/20 text-nerv-orange border border-nerv-orange/50'
                  : 'bg-nerv-void text-nerv-rust border border-nerv-brown hover:border-nerv-orange/30 hover:text-nerv-amber'
              }`}
            >
              {channel.name}
            </button>
          ))}
        </div>
      </div>

      {/* Video Player */}
      <div className="relative bg-black aspect-video">
        {activeChannel.type === 'youtube' ? (
          <iframe
            src={activeChannel.url}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={activeChannel.name}
          />
        ) : (
          <video
            ref={videoRef}
            src={activeChannel.url}
            className="w-full h-full"
            autoPlay
            muted={isMuted}
            controls={false}
            playsInline
          />
        )}
        
        {/* LIVE Badge */}
        <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/70 px-2 py-1">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-[10px] font-mono text-white uppercase tracking-wider">Live</span>
        </div>
      </div>

      {/* Controls */}
      <div className="border-t border-nerv-brown px-3 py-2">
        <div className="flex items-center justify-between">
          {/* Status */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-nerv-orange animate-pulse" />
              <span className="text-[10px] text-nerv-rust uppercase">{activeChannel.name}</span>
            </div>
          </div>

          {/* Volume Control */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleMute}
              className="p-1 text-nerv-rust hover:text-nerv-orange transition-colors"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={handleVolumeChange}
              className="w-20 h-1 bg-nerv-brown rounded-lg appearance-none cursor-pointer accent-nerv-orange"
            />
            <span className="text-[9px] text-nerv-rust font-mono w-6 text-right">{volume}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
