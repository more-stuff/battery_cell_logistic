/* import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
 */

import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom"; // npm install react-router-dom

import App from "./App.jsx";
import { Carretillero } from "./components/Carretillero.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* URL: http://.../  (PC Mesa) */}
        <Route path="/" element={<App />} />

        {/* URL: http://.../carretilla  (Tablet Carretilla) */}
        <Route path="/carretilla" element={<Carretillero />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);
