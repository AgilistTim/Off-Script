import { RouterProvider } from 'react-router-dom';
import { router } from './routes';
import { AuthProvider } from './context/AuthContext';
import TestLoginButton from './components/TestLoginButton';
import './index.css';

function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
      <TestLoginButton />
    </AuthProvider>
  );
}

export default App;
