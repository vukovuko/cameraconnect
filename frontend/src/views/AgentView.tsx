import { useSocket } from '../hooks/useSocket';

const AgentView = () => {
  const sessionId = new URLSearchParams(window.location.search).get('session');
  const socket = useSocket(sessionId || 'default');

  return <h1>Agent View (session: {sessionId})</h1>;
};

export default AgentView;
