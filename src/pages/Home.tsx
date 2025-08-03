import React from 'react';
import LandingPage from '../components/LandingPage';
import { EnvironmentDebugger } from '../components/debug/EnvironmentDebugger';

const Home: React.FC = () => {
  return (
    <>
      <EnvironmentDebugger />
      <LandingPage />
    </>
  );
};

export default Home;
