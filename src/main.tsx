import React from "react";
import ReactDOM from "react-dom/client";
import ParkingApp from "./App";
import "./style.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found. Pastikan ada <div id=\"root\"></div> di index.html");
}

ReactDOM.createRoot(rootElement as HTMLElement).render(
  <React.StrictMode>
    <ParkingApp />
  </React.StrictMode>
);
