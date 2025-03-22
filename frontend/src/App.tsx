import AgentView from './views/AgentView';
import CustomerView from './views/CustomerView';

function App() {
  const query = new URLSearchParams(window.location.search);
  const role = query.get('role');

  if (role === 'agent') return <AgentView />;
  if (role === 'customer') return <CustomerView />;
  return <p>Invalid role. Use ?role=agent or ?role=customer</p>;
}

export default App;
