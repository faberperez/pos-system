import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">

      {/* HEADER */}
      <div className="flex justify-between items-center mb-10">

        <h1 className="text-3xl font-black text-blue-400">
          📊 Dashboard POS PRO
        </h1>

        <div className="flex gap-2">

          {/* 🏠 VOLVER AL POS */}
          <button
            onClick={() => navigate("/")}
            className="bg-green-600 hover:bg-green-500 px-4 py-2 rounded-xl font-bold"
          >
            🏠 POS
          </button>

          {/* 🔄 REFRESH DASHBOARD */}
          <button
            onClick={() => navigate("/dashboard")}
            className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-xl font-bold"
          >
            📊 Inicio
          </button>

        </div>
      </div>

      {/* ================= VENTAS ================= */}
      <h2 className="text-xl font-bold mb-4 text-gray-300">📈 Ventas</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">

        <button
          onClick={() => navigate("/dashboard/ventas/diario")}
          className="bg-blue-600 hover:bg-blue-500 p-5 rounded-2xl font-bold"
        >
          📅 Diario
        </button>

        <button
          onClick={() => navigate("/dashboard/ventas/mensual")}
          className="bg-indigo-600 hover:bg-indigo-500 p-5 rounded-2xl font-bold"
        >
          📆 Mensual
        </button>

        <button
          onClick={() => navigate("/dashboard/ventas/anual")}
          className="bg-purple-600 hover:bg-purple-500 p-5 rounded-2xl font-bold"
        >
          📊 Anual
        </button>

      </div>

      {/* ================= PRODUCTOS ================= */}
      <h2 className="text-xl font-bold mb-4 text-gray-300">
        📦 Productos
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        <button
          onClick={() => navigate("/dashboard/productos/crear")}
          className="bg-green-600 hover:bg-green-500 p-5 rounded-2xl font-bold"
        >
          ➕ Crear
        </button>

        <button
          onClick={() => navigate("/dashboard/productos/actualizar")}
          className="bg-yellow-600 hover:bg-yellow-500 p-5 rounded-2xl font-bold"
        >
          ✏️ Actualizar
        </button>

        <button
          onClick={() => navigate("/dashboard/productos/eliminar")}
          className="bg-red-600 hover:bg-red-500 p-5 rounded-2xl font-bold"
        >
          🗑️ Eliminar
        </button>

      </div>

    </div>
  );
}