import { useState } from "react";

export const AdminSelector = ({ disponibles, seleccionadas, onToggle }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      style={{
        padding: "0 20px 20px 20px",
        borderTop: "1px solid #f1f5f9",
        marginTop: "10px",
      }}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: "none",
          border: "none",
          color: "#475569",
          cursor: "pointer",
          fontWeight: "600",
          padding: "15px 0 5px 0",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          fontSize: "0.9rem",
        }}
      >
        {isOpen ? "🔼 Ocultar Selector" : "⚙️ Configurar Columnas del Reporte"}
      </button>

      {isOpen && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "12px",
            marginTop: "10px",
            background: "#f8fafc",
            padding: "15px",
            borderRadius: "8px",
            border: "1px solid #e2e8f0",
          }}
        >
          {disponibles.map((col) => (
            <label
              key={col.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "0.85rem",
                cursor: "pointer",
                padding: "4px 8px",
                borderRadius: "4px",
                backgroundColor: seleccionadas.includes(col.id)
                  ? "#eff6ff"
                  : "transparent",
              }}
            >
              <input
                type="checkbox"
                checked={seleccionadas.includes(col.id)}
                onChange={() => onToggle(col.id)}
                style={{ cursor: "pointer" }}
              />
              {col.id === "operario" ? (
                <span style={{ color: "#2563eb", fontWeight: "bold" }}>
                  {col.label}
                </span>
              ) : (
                <span style={{ color: "#334155" }}>{col.label}</span>
              )}
            </label>
          ))}
        </div>
      )}
    </div>
  );
};
