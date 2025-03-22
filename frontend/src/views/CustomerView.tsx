import { useEffect, useRef, useState } from 'react';
import { useSocket } from '../hooks/useSocket';

const CustomerView = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionId = new URLSearchParams(window.location.search).get('session') || 'default';
  const socket = useSocket(sessionId);

  useEffect(() => {
    if (!socket) return;

    console.log('CustomerView: Socket connected with ID', socket.id);

    const handleAnswer = async (data: { sdp: string; type: 'answer' }) => {
      console.log('CustomerView: Received WebRTC answer', data);
      const peer = peerRef.current;
      if (!peer) {
        console.error('CustomerView: Received answer but peer connection does not exist');
        return;
      }
      
      try {
        await peer.setRemoteDescription(new RTCSessionDescription(data));
        console.log('CustomerView: Remote description set successfully');
      } catch (err: unknown) {
        console.error('CustomerView: Error setting remote description:', err);
        setError(`Failed to set remote description: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    };

    const handleCandidate = async ({ candidate }: { candidate: RTCIceCandidateInit }) => {
      const peer = peerRef.current;
      if (!peer) {
        console.error('CustomerView: Received ICE candidate but peer connection does not exist');
        return;
      }
      
      try {
        console.log('CustomerView: Adding ICE candidate', candidate);
        await peer.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err: unknown) {
        console.error('CustomerView: Error adding ICE candidate:', err);
        setError(`Failed to add ICE candidate: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    };

    socket.on('webrtc-answer', handleAnswer);
    socket.on('webrtc-ice-candidate', handleCandidate);

    return () => {
      console.log('CustomerView: Cleaning up socket listeners');
      socket.off('webrtc-answer', handleAnswer);
      socket.off('webrtc-ice-candidate', handleCandidate);
    };
  }, [socket, sessionId]);

  const startCamera = async () => {
    try {
      setError(null);
      
      if (peerRef.current) {
        peerRef.current.close();
        peerRef.current = null;
      }
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      
      console.log('CustomerView: Requesting camera access...');
      const media = await navigator.mediaDevices.getUserMedia({ 
        video: true,
        audio: false
      });
      
      streamRef.current = media;
      
      if (videoRef.current) {
        videoRef.current.srcObject = media;
        console.log('CustomerView: Local video preview set');
      }
      
      setCameraOn(true);

      const peer = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' }
        ]
      });
      peerRef.current = peer;

      console.log('CustomerView: Adding tracks to peer connection');
      media.getTracks().forEach(track => {
        console.log('CustomerView: Adding track', track.kind, track.id);
        peer.addTrack(track, media);
      });

      peer.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('CustomerView: Generated ICE candidate', event.candidate);
          socket?.emit('webrtc-ice-candidate', {
            sessionId,
            candidate: event.candidate,
          });
        }
      };
      
      peer.oniceconnectionstatechange = () => {
        console.log('CustomerView: ICE connection state changed to', peer.iceConnectionState);
        if (peer.iceConnectionState === 'failed' || peer.iceConnectionState === 'disconnected') {
          console.error('CustomerView: ICE connection failed or disconnected');
          setError(`Connection issue: ${peer.iceConnectionState}`);
        }
      };

      try {
        console.log('CustomerView: Creating offer...');
        const offer = await peer.createOffer({
          offerToReceiveVideo: false,
          offerToReceiveAudio: false
        });
        
        console.log('CustomerView: Setting local description...');
        await peer.setLocalDescription(offer);
        
        console.log('CustomerView: Sending offer to server...');
        socket?.emit('webrtc-offer', {
          sessionId,
          sdp: offer.sdp,
          type: offer.type,
        });
      } catch (err: unknown) {
        console.error('CustomerView: Error creating/sending offer:', err);
        setError(`Failed to create connection: ${err instanceof Error ? err.message : 'Unknown error'}`);
        stopCamera();
      }
    } catch (err: unknown) {
      console.error('CustomerView: Error starting camera:', err);
      setError(`Failed to access camera: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setCameraOn(false);
    }
  };

  const stopCamera = () => {
    console.log('CustomerView: Stopping camera...');
    
    if (peerRef.current) {
      peerRef.current.close();
      peerRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        console.log('CustomerView: Stopping track', track.kind, track.id);
        track.stop();
      });
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setCameraOn(false);
  };

  return (
    <div>
      <h1>Customer View (session: {sessionId})</h1>
      <div style={{ position: 'relative' }}>
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted 
          style={{ 
            width: '100%', 
            maxWidth: 600, 
            background: '#333',
            minHeight: 450,
            border: '1px solid #666'
          }} 
        />
        
        {error && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            background: 'rgba(0,0,0,0.7)'
          }}>
            <p>Error: {error}</p>
          </div>
        )}
      </div>
      
      <div style={{ marginTop: '16px' }}>
        <button 
          onClick={cameraOn ? stopCamera : startCamera} 
          style={{ 
            padding: '8px 16px',
            background: cameraOn ? '#e74c3c' : '#2ecc71',
            border: 'none',
            borderRadius: '4px',
            color: 'white',
            cursor: 'pointer'
          }}
        >
          {cameraOn ? 'Turn Camera Off' : 'Turn Camera On'}
        </button>
        
        <p style={{ marginTop: '8px' }}>
          Socket ID: {socket?.id || 'Not connected'}
        </p>
        
        <p>Camera Status: {cameraOn ? 'On' : 'Off'}</p>
      </div>
    </div>
  );
};

export default CustomerView;