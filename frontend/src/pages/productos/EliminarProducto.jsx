import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Eliminar() {
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

  const [products, setProducts] = useState([]);

  const fetchProducts = () => {
    fetch(`${API_URL}/products`)
      .then(res => res.json())
      .then(data => setProducts(data));
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleDelete = async (id) => {
    const confirm = window.confirm("¿Eliminar producto?");
    if (!confirm) return;

    await fetch(`${API_URL}/products/${id}`, {
      method: "DELETE"
    });

    alert("Producto eliminado ✅");
    fetchProducts();
  };

  return (
    <div className="p-6 text-white bg-gray-900 min-h-screen">

      <button
        onClick={() => navigate("/dashboard")}
        className="mb-4 bg-gray-700 px-4 py-2 rounded"
      >
        ⬅️ Volver
      </button>

      <h1 className="text-2xl font-bold mb-4">🗑️ Eliminar Producto</h1>

      <div className="grid gap-3">

        {products.map(p => (
          <div
            key={p.id}
            className="bg-gray-800 p-4 rounded flex justify-between items-center"
          >
            <div>
              <p className="font-bold">{p.name}</p>
              <p>${p.price}</p>
            </div>

            <button
              onClick={() => handleDelete(p.id)}
              className="bg-red-600 px-4 py-2 rounded"
            >
              Eliminar
            </button>
          </div>
        ))}

      </div>
    </div>
  );
}