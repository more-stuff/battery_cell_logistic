import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom"; // npm install react-router-dom

import App from "./App.jsx";
import { Carretillero } from "./components/Carretillero.jsx";
import { AdminDashboard } from "./components/AdminDashboard.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* URL: http://.../  (PC Mesa) */}
        <Route path="/" element={<App />} />

        {/* URL: http://.../carretilla  (Tablet Carretilla) */}
        <Route path="/carretilla" element={<Carretillero />} />

        <Route path="/administrative" element={<AdminDashboard />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);
