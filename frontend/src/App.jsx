import { useEffect, useState } from "react"

function App() {
  const [products, setProducts] = useState([])
  const [cart, setCart] = useState([])
  const [barcodeInput, setBarcodeInput] = useState("")
  const [cash, setCash] = useState("")
  const [clientPhone, setClientPhone] = useState("")
  const [sendWhatsapp, setSendWhatsapp] = useState(false)
  const [showChange, setShowChange] = useState(false)
  const [lastSale, setLastSale] = useState(null)

  const IVA_RATE = 0.19
  
  // Usamos la variable de entorno de Vite o localhost por defecto
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000"

  // Función para cargar productos (la separamos para reusarla)
  const fetchProducts = () => {
    fetch(`${API_URL}/products`)
      .then(res => res.json())
      .then(data => setProducts(data))
      .catch(err => console.error("Error cargando productos:", err))
  }

  useEffect(() => {
    fetchProducts()
  }, [])

  const addToCart = (product) => {
    const existing = cart.find(item => item.id === product.id)
    if (existing) {
      setCart(cart.map(item =>
        item.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ))
    } else {
      setCart([...cart, { ...product, quantity: 1 }])
    }
  }

  const handleScan = () => {
    const product = products.find(p => p.barcode === barcodeInput)
    if (product) {
      addToCart(product)
    } else {
      alert("Producto no encontrado")
    }
    setBarcodeInput("")
  }

  const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0)
  const iva = subtotal * IVA_RATE
  const total = subtotal + iva
  const change = cash ? parseFloat(cash) - total : 0

  const handleSell = async () => {
    if (cart.length === 0) return alert("Carrito vacío")
    if (!cash || parseFloat(cash) < total) return alert("Dinero insuficiente")
    if (sendWhatsapp && !clientPhone) return alert("Ingrese teléfono del cliente")

    try {
      const response = await fetch(`${API_URL}/sales`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map(item => ({
            product_id: item.id,
            quantity: item.quantity
          })),
          subtotal,
          iva,
          total,
          client_phone: sendWhatsapp ? clientPhone : null
        })
      })

      const data = await response.json()

      if (response.ok) {
        setLastSale(data)
        setShowChange(true)
        fetchProducts() // 🔥 Refrescamos el stock inmediatamente
      } else {
        alert("Error en la venta: " + (data.error || "Desconocido"))
      }
    } catch (error) {
      console.error("Error en la petición:", error)
      alert("Error de conexión con el servidor")
    }
  }

  const closeChange = () => {
    setShowChange(false)
    if (lastSale) {
      if (lastSale.invoice_url) window.open(lastSale.invoice_url)
      if (sendWhatsapp && lastSale.whatsapp_link) window.open(lastSale.whatsapp_link)
    }
    setCart([])
    setCash("")
    setClientPhone("")
    setSendWhatsapp(false)
    setLastSale(null)
  }

  return (
    <div className="p-6 bg-gray-900 min-h-screen text-white grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* SECCIÓN PRODUCTOS */}
      <div className="col-span-2">
        <h1 className="text-3xl font-bold mb-4 text-blue-400">POS PRO 🚀</h1>
        <input
          type="text"
          value={barcodeInput}
          onChange={(e) => setBarcodeInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleScan()}
          placeholder="Escanear código de barras..."
          className="mb-6 p-4 w-full text-black rounded-lg shadow-lg focus:ring-2 focus:ring-blue-500 outline-none"
          autoFocus
        />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {products.map(product => (
            <div
              key={product.id}
              className="bg-white p-3 rounded-xl shadow-md cursor-pointer hover:bg-gray-100 transition text-gray-800"
              onClick={() => addToCart(product)}
            >
              <img
                src={product.image || "https://via.placeholder.com/150"}
                alt={product.name}
                className="w-full h-28 object-cover rounded-md mb-2"
              />
              <h2 className="font-bold text-sm truncate">{product.name}</h2>
              <p className="text-green-600 font-extrabold">${Number(product.price).toLocaleString()}</p>
              <p className={`text-xs font-semibold ${product.stock < 5 ? "text-red-500" : "text-gray-500"}`}>
                Stock: {product.stock}
              </p>
              <button className="mt-3 w-full bg-blue-600 text-white py-1 rounded-md text-sm hover:bg-blue-700">
                + Agregar
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* SECCIÓN CARRITO Y PAGO */}
      <div className="bg-gray-800 p-5 rounded-xl shadow-xl h-fit border border-gray-700">
        <h2 className="text-xl font-bold mb-4 border-b border-gray-600 pb-2">Carrito de Compras</h2>
        <div className="max-h-80 overflow-y-auto mb-4">
          {cart.map(item => (
            <div key={item.id} className="flex justify-between items-center mb-3 bg-gray-700 p-3 rounded-lg">
              <div className="flex-1">
                <p className="font-bold text-sm">{item.name}</p>
                <p className="text-xs text-gray-400">${Number(item.price).toLocaleString()} x {item.quantity}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => {
                  if (item.quantity === 1) setCart(cart.filter(p => p.id !== item.id))
                  else setCart(cart.map(p => p.id === item.id ? { ...p, quantity: p.quantity - 1 } : p))
                }} className="bg-orange-500 w-6 h-6 flex items-center justify-center rounded-full text-xs">-</button>
                <span className="text-sm font-bold">{item.quantity}</span>
                <button onClick={() => setCart(cart.map(p => p.id === item.id ? { ...p, quantity: p.quantity + 1 } : p))}
                  className="bg-green-500 w-6 h-6 flex items-center justify-center rounded-full text-xs">+</button>
                <button onClick={() => setCart(cart.filter(p => p.id !== item.id))}
                  className="bg-red-500 ml-2 text-xs p-1 rounded">X</button>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-2 text-right border-t border-gray-600 pt-4">
          <p className="text-sm">Subtotal: <span className="font-mono">${subtotal.toFixed(2)}</span></p>
          <p className="text-sm">IVA (19%): <span className="font-mono">${iva.toFixed(2)}</span></p>
          <p className="text-2xl font-bold text-blue-400">Total: ${total.toFixed(2)}</p>
        </div>

        <div className="mt-6 space-y-4">
          <label className="flex items-center gap-3 cursor-pointer p-2 hover:bg-gray-700 rounded-lg">
            <input
              type="checkbox"
              className="w-5 h-5 rounded"
              checked={sendWhatsapp}
              onChange={(e) => setSendWhatsapp(e.target.checked)}
            />
            <span className="text-sm">¿Enviar ticket por WhatsApp?</span>
          </label>

          {sendWhatsapp && (
            <input
              type="text"
              placeholder="Ej: 3001234567"
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
              className="p-3 w-full text-black rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
            />
          )}

          <div className="bg-gray-900 p-3 rounded-lg border border-gray-600">
            <p className="text-xs text-gray-400 mb-1">Pago en efectivo:</p>
            <input
              type="number"
              placeholder="0.00"
              value={cash}
              onChange={(e) => setCash(e.target.value)}
              className="p-2 w-full text-2xl font-bold bg-transparent text-white border-none focus:outline-none"
            />
          </div>

          <button
            onClick={handleSell}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-xl shadow-lg transition transform active:scale-95"
          >
            REALIZAR VENTA ✅
          </button>
        </div>
      </div>

      {/* MODAL DE CAMBIO */}
      {showChange && (
        <div className="fixed inset-0 bg-black bg-opacity-80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white text-black p-8 rounded-2xl shadow-2xl text-center max-w-sm w-full mx-4">
            <h2 className="text-xl font-bold text-gray-500 uppercase tracking-widest mb-2">Cambio a entregar</h2>
            <p className="text-6xl font-black text-green-600 mb-8">
              ${change.toFixed(0)}
            </p>
            <button
              onClick={closeChange}
              className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 transition"
            >
              NUEVA VENTA
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default App