import { v4 as uuidv4 } from 'uuid'; // install this package if you don't have it yet
import AgentView from './views/AgentView';
import CustomerView from './views/CustomerView';

function App() {
  const query = new URLSearchParams(window.location.search);
  const role = query.get('role');
  let session = query.get('session');

  // Generate and redirect if session is missing
  if (!session) {
    session = uuidv4();
    const newUrl = `${window.location.pathname}?role=${role}&session=${session}`;
    window.location.replace(newUrl);
    return null; // prevent rendering during redirect
  }

  if (role === 'agent') return <AgentView />;
  if (role === 'customer') return <CustomerView />;
  return <p>Invalid role. Use ?role=agent or ?role=customer</p>;
}

export default App;
