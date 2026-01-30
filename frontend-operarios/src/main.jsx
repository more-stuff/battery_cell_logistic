import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom"; // npm install react-router-dom

import { Carretillero } from "./components/Carretillero.jsx";
import { AdminDashboard } from "./components/AdminDashboard.jsx";
import Operario from "./components/Operario.jsx";
import OperarioDefectuoso from "./components/OperarioDefectuoso.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Operario />} />
        <Route path="/defectuosas" element={<OperarioDefectuoso />} />
        <Route path="/carretilla" element={<Carretillero />} />
        <Route path="/administrative" element={<AdminDashboard />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);
