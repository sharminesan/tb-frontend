import React, { createContext, useContext, useState, useEffect } from "react";

const BackendContext = createContext();

export function useBackend() {
  const context = useContext(BackendContext);
  if (!context) {
    throw new Error("useBackend must be used within a BackendProvider");
  }
  return context;
}

export function BackendProvider({ children }) {
  const [backendUrl, setBackendUrl] = useState(() => {
    // Priority: 1. localStorage (user settings), 2. env variable, 3. default
    const savedUrl = localStorage.getItem("turtlebot_backend_url");
    return (
      savedUrl || import.meta.env.VITE_BACKEND_URL || "http://localhost:4000"
    );
  });

  // Save to localStorage whenever the URL changes
  useEffect(() => {
    localStorage.setItem("turtlebot_backend_url", backendUrl);
  }, [backendUrl]);

  const updateBackendUrl = (newUrl) => {
    setBackendUrl(newUrl);
  };

  const resetToDefault = () => {
    const defaultUrl =
      import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";
    setBackendUrl(defaultUrl);
    localStorage.removeItem("turtlebot_backend_url");
  };

  const value = {
    backendUrl,
    updateBackendUrl,
    resetToDefault,
  };

  return (
    <BackendContext.Provider value={value}>{children}</BackendContext.Provider>
  );
}
