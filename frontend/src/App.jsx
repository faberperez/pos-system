import { useEffect, useState } from "react";
import { Routes, Route } from "react-router-dom";

import ProductGrid from "./components/ProductGrid";
import Cart from "./components/Cart";
import InvoiceModal from "./components/InvoiceModal";
import PdfModal from "./components/PdfModal";
import InformesButton from "./components/InformesButton";

import Dashboard from "./pages/Dashboard.jsx";
import Diario from "./pages/ventas/diario.jsx";
import Mensual from "./pages/ventas/mensual.jsx";
import Anual from "./pages/ventas/anual.jsx";

import Crear from "./pages/productos/CrearProducto.jsx";
import Actualizar from "./pages/productos/ActualizarProducto.jsx";
import Eliminar from "./pages/productos/EliminarProducto.jsx";

function App() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [cash, setCash] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [sendWhatsapp, setSendWhatsapp] = useState(false);

  const [showChange, setShowChange] = useState(false);
  const [lastSale, setLastSale] = useState(null);

  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);

  const IVA_RATE = 0.19;

  const API_URL =
    import.meta.env.VITE_API_URL ||
    "https://pos-backend-73yp.onrender.com";

  // =========================
  // PRODUCTOS
  // =========================
  const fetchProducts = async () => {
    try {
      const res = await fetch(`${API_URL}/products`);
      const data = await res.json();

      if (!Array.isArray(data)) {
        setProducts([]);
        return;
      }

      setProducts(data);
    } catch (err) {
      console.error("❌ ERROR PRODUCTOS:", err);
      setProducts([]);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // =========================
  // CARRITO
  // =========================
  const addToCart = (product) => {
    const existing = cart.find(p => p.id === product.id);

    if (existing) {
      setCart(cart.map(p =>
        p.id === product.id
          ? { ...p, quantity: p.quantity + 1 }
          : p
      ));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };

  // =========================
  // LIMPIEZA DE PRECIO
  // =========================
  const parsePrice = (value) => {
    return Number(
      String(value ?? 0)
        .replace(/\$/g, "")
        .replace(/\./g, "")
        .replace(/,/g, "")
        .trim()
    ) || 0;
  };

  // =========================
  // CÁLCULOS
  // =========================
  const subtotal = cart.reduce((acc, item) => {
    const price = parsePrice(item.price);
    const qty = Number(item.quantity || 1);
    return acc + (price * qty);
  }, 0);

  const iva = subtotal * IVA_RATE;
  const total = subtotal + iva;

  // =========================
  // VENTA
  // =========================
  const handleSell = async () => {
    if (cart.length === 0) return alert("Carrito vacío");
    if (!cash || Number(cash) < total)
      return alert("Dinero insuficiente");

    const now = new Date();

    // 🔥 GUARDAR DATOS ANTES DE LIMPIAR
    const ventaTotal = total;
    const ventaEfectivo = Number(cash);
    const ventaCambio = ventaEfectivo - ventaTotal;

    // 🔥 LIMPIAR PRECIOS ANTES DE ENVIAR AL BACKEND
    const itemsLimpios = cart.map(item => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      price: parsePrice(item.price), // ← Número limpio, sin $ ni puntos ni comas
    }));

    try {
      const res = await fetch(`${API_URL}/sales`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: itemsLimpios,
          subtotal,
          iva,
          total: ventaTotal,
          pago_con: ventaEfectivo,
          cambio: ventaCambio,
          client_phone: sendWhatsapp ? clientPhone : null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error("❌ ERROR VENTA:", data);
        return alert("Error en la venta");
      }

      // 🔥 GUARDAR TODO EN lastSale PARA EL MODAL
      setLastSale({
        id: data.id,
        invoice_url: data.invoice_url,
        fecha: now.toLocaleDateString(),
        hora: now.toLocaleTimeString(),
        itemsGuardados: itemsLimpios,
        total: ventaTotal,
        pago_con: ventaEfectivo,
        cambio: ventaCambio,
      });

      setPdfUrl(data.invoice_url || null);
      setShowChange(true);

      // Limpiar DESPUÉS de guardar todo
      setCart([]);
      setCash("");

    } catch (err) {
      console.error("❌ ERROR CONEXIÓN:", err);
      alert("Error de conexión");
    }
  };

  // =========================
  // UI
  // =========================
  return (
    <Routes>

      {/* POS */}
      <Route
        path="/"
        element={
          <div className="p-6 bg-gray-900 min-h-screen text-white grid grid-cols-1 md:grid-cols-3 gap-6">

            <div className="col-span-2">
              <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-black text-blue-400">
                  POS PRO 🚀
                </h1>

                <InformesButton />
              </div>

              <ProductGrid
                products={products}
                addToCart={addToCart}
              />
            </div>

            <Cart
              cart={cart}
              setCart={setCart}
              cash={cash}
              setCash={setCash}
              sendWhatsapp={sendWhatsapp}
              setSendWhatsapp={setSendWhatsapp}
              clientPhone={clientPhone}
              setClientPhone={setClientPhone}
              subtotal={subtotal}
              iva={iva}
              total={total}
              handleSell={handleSell}
            />

            <InvoiceModal
              show={showChange}
              lastSale={lastSale}
              onClose={() => {
                setShowChange(false);
                setShowPdfModal(true);
              }}
            />

            <PdfModal
              show={showPdfModal}
              invoiceUrl={pdfUrl}
              onClose={() => {
                setShowPdfModal(false);
                setCart([]);
                setCash("");
                setClientPhone("");
                setSendWhatsapp(false);
                setLastSale(null);
                setPdfUrl(null);
              }}
            />
          </div>
        }
      />

      {/* DASHBOARD */}
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/dashboard/ventas/diario" element={<Diario />} />
      <Route path="/dashboard/ventas/mensual" element={<Mensual />} />
      <Route path="/dashboard/ventas/anual" element={<Anual />} />

      {/* PRODUCTOS */}
      <Route path="/dashboard/productos/crear" element={<Crear />} />
      <Route path="/dashboard/productos/actualizar" element={<Actualizar />} />
      <Route path="/dashboard/productos/eliminar" element={<Eliminar />} />

    </Routes>
  );
}

export default App;