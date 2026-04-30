import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Actualizar() {
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

  const [products, setProducts] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [form, setForm] = useState({
    name: "",
    price: "",
    stock: "",
    barcode: "",
    image: ""
  });

  const fetchProducts = () => {
    fetch(`${API_URL}/products`)
      .then(res => res.json())
      .then(data => setProducts(data));
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleSelect = (id) => {
    const product = products.find(p => p.id == id);
    setSelectedId(id);
    setForm({
      name: product.name,
      price: product.price,
      stock: product.stock,
      barcode: product.barcode || "",
      image: product.image || ""
    });
  };

  const handleUpdate = async () => {
    if (!selectedId) return alert("Selecciona un producto");

    await fetch(`${API_URL}/products/${selectedId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });

    alert("Producto actualizado ✅");
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

      <h1 className="text-2xl font-bold mb-4">✏️ Actualizar Producto</h1>

      <select
        onChange={(e) => handleSelect(e.target.value)}
        className="mb-4 p-2 text-black"
      >
        <option value="">Selecciona producto</option>
        {products.map(p => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>

      {selectedId && (
        <div className="grid gap-3 max-w-md">

          <input
            placeholder="Nombre"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            className="p-2 text-black"
          />

          <input
            placeholder="Precio"
            value={form.price}
            onChange={e => setForm({ ...form, price: e.target.value })}
            className="p-2 text-black"
          />

          <input
            placeholder="Stock"
            value={form.stock}
            onChange={e => setForm({ ...form, stock: e.target.value })}
            className="p-2 text-black"
          />

          <input
            placeholder="Código de barras"
            value={form.barcode}
            onChange={e => setForm({ ...form, barcode: e.target.value })}
            className="p-2 text-black"
          />

          <input
            placeholder="URL Imagen"
            value={form.image}
            onChange={e => setForm({ ...form, image: e.target.value })}
            className="p-2 text-black"
          />

          <button
            onClick={handleUpdate}
            className="bg-yellow-600 p-3 rounded font-bold"
          >
            Guardar cambios
          </button>

        </div>
      )}
    </div>
  );
}