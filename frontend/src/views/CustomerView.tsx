import { useRef, useState } from 'react';
import { useSocket } from '../hooks/useSocket';

const CustomerView = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const sessionId = new URLSearchParams(window.location.search).get('session') || 'default';
  const socket = useSocket(sessionId);

  const startCamera = async () => {
    try {
      const media = await navigator.mediaDevices.getUserMedia({ video: true });
      setStream(media);
      if (videoRef.current) {
        videoRef.current.srcObject = media;
      }
      setCameraOn(true);
    } catch (err) {
      console.error('Could not access camera', err);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      setStream(null);
      setCameraOn(false);
    }
  };

  return (
    <div>
      <h1>Customer View (session: {sessionId})</h1>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        style={{ width: '100%', maxWidth: 600, background: '#000' }}
      />
      <div style={{ marginTop: '1rem' }}>
        {cameraOn ? (
          <button onClick={stopCamera}>Turn Camera Off</button>
        ) : (
          <button onClick={startCamera}>Turn Camera On</button>
        )}
      </div>
    </div>
  );
};

export default CustomerView;
