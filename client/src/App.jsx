import React from 'react';
import { ThemeProvider } from './components/ThemeProvider';

const App = () => {
  return (
    <ThemeProvider>
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <h1 className="text-display font-bold">app</h1>
      </div>
    </ThemeProvider>
  );
};

export default App;