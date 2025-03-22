import { useEffect, useRef, useState } from 'react';
import { useSocket } from '../hooks/useSocket';

type WebRTCOfferPayload = {
  sdp: string;
  type: 'offer';
};

const AgentView = () => {
  const sessionId = new URLSearchParams(window.location.search).get('session') || 'default';
  const socket = useSocket(sessionId);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsManualPlay, setNeedsManualPlay] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);

  useEffect(() => {
    if (!socket) return;

    const handleOffer = async (data: WebRTCOfferPayload) => {
      console.log('Received WebRTC offer', data);
      
      if (peerRef.current) {
        peerRef.current.close();
      }
      
      const peer = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' }
        ]
      });
      peerRef.current = peer;

      peer.ontrack = (event) => {
        console.log('Received track', event);
        console.log('Track settings:', event.track.getSettings());
        console.log('Track constraints:', event.track.getConstraints());
        console.log('Track state:', event.track.readyState);
        console.log('Stream has tracks:', event.streams[0]?.getTracks().length);
        
        event.track.onended = () => {
          console.log('Remote track ended');
          setCameraActive(false);
        };
        
        event.track.onmute = () => {
          console.log('Remote track muted');
          setCameraActive(false);
        };
        
        event.track.onunmute = () => {
          console.log('Remote track unmuted');
          setCameraActive(true);
        };
        
        if (videoRef.current && event.streams[0]) {
          videoRef.current.srcObject = event.streams[0];
          setCameraActive(true);
          
          setConnected(true);
          
          const playPromise = videoRef.current.play();
          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                console.log('Video playback started successfully');
                setNeedsManualPlay(false);
              })
              .catch((err: Error) => {
                console.log('Autoplay prevented due to browser policy:', err.message);
                setNeedsManualPlay(true);
              });
          }
        } else {
          console.error('Video element or stream not available');
          if (!videoRef.current) {
            setError('Video element not available');
          } else if (!event.streams[0]) {
            setError('No stream received');
          }
        }
      };

      peer.oniceconnectionstatechange = () => {
        console.log('ICE connection state:', peer.iceConnectionState);
        if (peer.iceConnectionState === 'connected' || peer.iceConnectionState === 'completed') {
          console.log('ICE connection established');
        } else if (peer.iceConnectionState === 'failed') {
          console.error('ICE connection failed');
          setError(`ICE connection state: ${peer.iceConnectionState}`);
          setCameraActive(false);
        } else if (peer.iceConnectionState === 'disconnected') {
          console.log('ICE connection disconnected - might reconnect');
          setCameraActive(false);
        }
      };

      peer.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('Sending ICE candidate from agent', event.candidate);
          socket.emit('webrtc-ice-candidate', {
            sessionId,
            candidate: event.candidate,
          });
        }
      };

      try {
        await peer.setRemoteDescription(new RTCSessionDescription(data));
        console.log('Set remote description successfully');

        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        console.log('Created and set local answer', answer);

        socket.emit('webrtc-answer', {
          sessionId,
          sdp: answer.sdp,
          type: answer.type,
        });
      } catch (err: unknown) {
        console.error('Error in WebRTC connection setup:', err);
        setError(`WebRTC setup error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    };

    const handleCandidate = async ({ candidate }: { candidate: RTCIceCandidateInit }) => {
      const peer = peerRef.current;
      if (!peer) {
        console.error('Received ICE candidate but peer connection does not exist');
        return;
      }
      
      try {
        console.log('Adding ICE candidate on agent', candidate);
        await peer.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err: unknown) {
        console.error('Error adding ICE candidate on agent:', err);
        setError(`ICE candidate error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    };

    console.log('Setting up socket listeners for session:', sessionId);
    socket.on('webrtc-offer', handleOffer);
    socket.on('webrtc-ice-candidate', handleCandidate);

    return () => {
      console.log('Cleaning up WebRTC connection');
      socket.off('webrtc-offer', handleOffer);
      socket.off('webrtc-ice-candidate', handleCandidate);
      if (peerRef.current) {
        peerRef.current.close();
        peerRef.current = null;
      }
    };
  }, [socket, sessionId]);

  const retryConnection = () => {
    setError(null);
    if (peerRef.current) {
      peerRef.current.close();
      peerRef.current = null;
    }
    
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    
    setConnected(false);
    setNeedsManualPlay(false);
    setCameraActive(false);
    
    socket?.disconnect();
    socket?.connect();
  };
  
  const handleManualPlay = () => {
    if (videoRef.current) {
      videoRef.current.play()
        .then(() => {
          setNeedsManualPlay(false);
          console.log('Manual play successful');
        })
        .catch((err: Error) => {
          console.error('Manual play failed:', err);
          setError(`Failed to play video: ${err.message}`);
        });
    }
  };

  return (
    <div>
      <h1>Agent View (session: {sessionId})</h1>
      <div style={{ position: 'relative' }}>
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          style={{ 
            width: '100%', 
            maxWidth: 600, 
            backgroundColor: '#333',
            minHeight: 450,
            border: '1px solid #666'
          }} 
        />
        {!connected && !error && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            background: 'rgba(0,0,0,0.7)'
          }}>
            Waiting for customer to start camera...
          </div>
        )}
        
        {connected && !cameraActive && !needsManualPlay && !error && (
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
            <p>Customer camera has been turned off</p>
          </div>
        )}
        
        {connected && needsManualPlay && !error && (
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
            <p>Camera is connected but browser blocked autoplay</p>
            <button 
              onClick={handleManualPlay}
              style={{
                marginTop: '10px',
                padding: '8px 16px',
                background: '#4a90e2',
                border: 'none',
                borderRadius: '4px',
                color: 'white',
                cursor: 'pointer'
              }}
            >
              Click to Play Video
            </button>
          </div>
        )}
        
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
            <button 
              onClick={retryConnection}
              style={{
                marginTop: '10px',
                padding: '8px 16px',
                background: '#4a90e2',
                border: 'none',
                borderRadius: '4px',
                color: 'white',
                cursor: 'pointer'
              }}
            >
              Retry Connection
            </button>
          </div>
        )}
      </div>
      
      <div style={{ marginTop: '16px' }}>
        <p>Connection status: {connected ? 'Connected' : 'Disconnected'}</p>
        <p>Camera status: {cameraActive ? 'Active' : 'Inactive'}</p>
        <p>Socket ID: {socket?.id || 'Not connected'}</p>
      </div>
    </div>
  );
};

export default AgentView;