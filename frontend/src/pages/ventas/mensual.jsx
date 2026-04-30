import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Mensual() {
  const navigate = useNavigate();

  const [ventas, setVentas] = useState([]);
  const [resumen, setResumen] = useState(null);

  const API_URL =
    import.meta.env.VITE_API_URL || "http://localhost:3000";

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`${API_URL}/reports?type=monthly`);

        if (!res.ok) {
          const text = await res.text();
          console.error("ERROR BACKEND:", text);
          return;
        }

        const data = await res.json();

        // ✅ ventas reales
        setVentas(data.sales || []);

        // ✅ resumen calculado
        const totalVentas = data.sales?.length || 0;
        const totalDinero = data.sales?.reduce(
          (acc, v) => acc + Number(v.total),
          0
        );

        setResumen({
          total_ventas: totalVentas,
          total_dinero: totalDinero,
        });

      } catch (err) {
        console.error("Error cargando reportes:", err);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">

      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">

        <h1 className="text-2xl font-black text-indigo-400">
          📆 Ventas Mensuales
        </h1>

        <div className="flex gap-3">
          <button
            onClick={() => navigate("/dashboard")}
            className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-xl font-bold"
          >
            🔙 Dashboard
          </button>

          <button
            onClick={() => navigate("/")}
            className="bg-green-600 hover:bg-green-500 px-4 py-2 rounded-xl font-bold"
          >
            🏠 POS
          </button>
        </div>
      </div>

      {/* RESUMEN */}
      {resumen && (
        <div className="bg-gray-800 p-4 rounded-xl mb-6 border border-gray-700">
          <p className="text-gray-400">
            Total ventas:{" "}
            <span className="text-white font-bold">
              {resumen.total_ventas}
            </span>
          </p>
          <p className="text-gray-400">
            Total dinero:{" "}
            <span className="text-green-400 font-bold">
              ${Number(resumen.total_dinero).toLocaleString()}
            </span>
          </p>
        </div>
      )}

      {/* TABLA */}
      <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
        {ventas.length === 0 ? (
          <p className="text-gray-500 text-center py-6">
            No hay ventas este mes
          </p>
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
              {ventas.map(v => (
                <tr key={v.id} className="border-b border-gray-700">
                  <td className="py-2">{v.id}</td>
                  <td>
                    {new Date(v.date).toLocaleString()}
                  </td>
                  <td className="text-green-400 font-bold">
                    ${Number(v.total).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* PDF */}
      <div className="mt-6 flex justify-end">
        <button
          onClick={() => alert("PDF no implementado en backend")}
          className="bg-red-600 hover:bg-red-500 px-6 py-3 rounded-xl font-bold"
        >
          📄 Descargar PDF
        </button>
      </div>

    </div>
  );
}