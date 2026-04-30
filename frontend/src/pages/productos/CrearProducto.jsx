import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function CrearProducto() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [barcode, setBarcode] = useState("");
  const [image, setImage] = useState("");

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

  const handleCreate = async () => {
    if (!name || !price) {
      return alert("Nombre y precio son obligatorios");
    }

    try {
      const res = await fetch(`${API_URL}/products`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name,
          price: Number(price),
          stock: Number(stock) || 0,
          barcode: barcode || null,
          image: image || null
        })
      });

      const data = await res.json();

      if (res.ok) {
        alert("✅ Producto creado correctamente");
        navigate("/dashboard");
      } else {
        alert("❌ Error al crear producto");
        console.log(data);
      }

    } catch (error) {
      console.error(error);
      alert("Error de conexión");
    }
  };

  return (
    <div className="p-6 text-white bg-gray-900 min-h-screen">

      {/* HEADER */}
      <button
        onClick={() => navigate("/dashboard")}
        className="mb-6 bg-gray-700 px-4 py-2 rounded-xl"
      >
        ⬅ Volver
      </button>

      <h1 className="text-2xl font-bold mb-6">
        ➕ Crear Producto
      </h1>

      <div className="grid gap-4 max-w-md">

        <input
          placeholder="Nombre"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="p-3 rounded bg-gray-800"
        />

        <input
          placeholder="Precio"
          type="number"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="p-3 rounded bg-gray-800"
        />

        <input
          placeholder="Stock"
          type="number"
          value={stock}
          onChange={(e) => setStock(e.target.value)}
          className="p-3 rounded bg-gray-800"
        />

        <input
          placeholder="Código de barras"
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
          className="p-3 rounded bg-gray-800"
        />

        <input
          placeholder="URL de imagen"
          value={image}
          onChange={(e) => setImage(e.target.value)}
          className="p-3 rounded bg-gray-800"
        />

        {/* PREVIEW IMAGEN */}
        {image && (
          <img
            src={image}
            alt="preview"
            className="w-32 rounded border"
          />
        )}

        <button
          onClick={handleCreate}
          className="bg-green-600 p-3 rounded-xl font-bold"
        >
          💾 Guardar Producto
        </button>

      </div>
    </div>
  );
}