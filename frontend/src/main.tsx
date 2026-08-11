import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AppRouter from "./routes/AppRouter";
// Suppress missing type declarations for CSS side-effect import
// @ts-ignore: Unable to find type declarations for './index.css'
import "./index.css";

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AppRouter />
    </QueryClientProvider>
  </React.StrictMode>,
);
