import { useSocket } from '../hooks/useSocket';

const CustomerView = () => {
  const sessionId = new URLSearchParams(window.location.search).get('session');
  const socket = useSocket(sessionId || 'default');

  return <h1>Customer View (session: {sessionId})</h1>;
};

export default CustomerView;
