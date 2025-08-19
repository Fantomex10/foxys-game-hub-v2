import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect, useState } from "react";
import Login from "@/pages/login";
import MainHub from "@/pages/main-hub";
import GameLobby from "@/pages/game-lobby";
import GameRoom from "@/pages/game-room";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Login} />
      <Route path="/hub" component={MainHub} />
      <Route path="/lobby/:roomId" component={GameLobby} />
      <Route path="/game/:roomId" component={GameRoom} />
      <Route>
        <div className="min-h-screen gradient-bg flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white mb-4">Page Not Found</h1>
            <p className="text-gray-400">The page you're looking for doesn't exist.</p>
          </div>
        </div>
      </Route>
    </Switch>
  );
}

function App() {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
