import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Diario() {
  const navigate = useNavigate();
  const [ventas, setVentas] = useState([]);
  const [resumen, setResumen] = useState({ total_ventas: 0, total_dinero: 0 });
  const [loading, setLoading] = useState(true); // 🔥 Nuevo estado de carga

  // Verifica que esta URL sea la correcta (donde corre tu backend)
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const url = `${API_URL}/api/reports?type=daily`;
        console.log("🚀 Llamando a:", url); // 🔥 Mira esto en la consola del navegador
        
        const res = await fetch(url);
        const data = await res.json();
        
        console.log("📦 DATOS RECIBIDOS EN FRONTEND:", data); 
        
        setVentas(data.sales || []);
        setResumen({
          total_ventas: data.total_ventas || 0,
          total_dinero: data.total_dinero || 0,
        });
      } catch (err) {
        console.error("❌ Error conectando al backend:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-black text-blue-400">📅 Ventas Diarias</h1>
        <div className="flex gap-3">
          <button onClick={() => navigate("/dashboard")} className="bg-gray-700 px-4 py-2 rounded-xl font-bold">🔙 Dashboard</button>
          <button onClick={() => navigate("/")} className="bg-green-600 px-4 py-2 rounded-xl font-bold">🏠 POS</button>
        </div>
      </div>

      {/* RESUMEN */}
      <div className="bg-gray-800 p-6 rounded-2xl mb-6 border border-gray-700 shadow-xl">
        <p className="text-gray-400">Total ventas: <span className="text-white font-bold">{resumen.total_ventas}</span></p>
        <p className="text-gray-400">Total dinero: <span className="text-green-400 font-bold text-2xl">${Number(resumen.total_dinero).toLocaleString()}</span></p>
      </div>

      {/* TABLA */}
      <div className="bg-gray-800 p-4 rounded-2xl border border-gray-700">
        {loading ? (
          <p className="text-center py-10">Cargando datos...</p>
        ) : ventas.length === 0 ? (
          <p className="text-gray-500 text-center py-10">No hay ventas hoy</p>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="text-gray-400 border-b border-gray-700">
                <th className="py-2">ID</th>
                <th>Fecha</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {ventas.map((v) => (
                <tr key={v.id} className="border-b border-gray-700">
                  <td className="py-2">{v.id}</td>
                  <td>{v.date}</td>
                  <td className="text-green-400 font-bold">${Number(v.total).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* PDF */}
      <div className="mt-6 flex justify-end">
        <button 
          onClick={() => window.open(`${API_URL}/api/reports/download?type=daily`, "_blank")}
          className="bg-red-600 hover:bg-red-500 px-6 py-3 rounded-xl font-bold w-full"
        >
          📄 Descargar PDF
        </button>
      </div>
    </div>
  );
}