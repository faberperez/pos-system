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
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000"

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
        item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
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

    const now = new Date()
    const fechaActual = now.toLocaleDateString()
    const horaActual = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

    try {
      const response = await fetch(`${API_URL}/sales`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map(item => ({
            product_id: item.id,
            quantity: item.quantity,
            price: item.price,
            name: item.name
          })),
          subtotal,
          iva,
          total,
          pago_con: parseFloat(cash),
          cambio: parseFloat(cash) - total,
          fecha: fechaActual,
          hora: horaActual,
          client_phone: sendWhatsapp ? clientPhone : null
        })
      })

      const data = await response.json()

      if (response.ok) {
        // Mi toque: Guardamos todo lo necesario para que el recibo sea real
        setLastSale({
          ...data,
          fecha: fechaActual,
          hora: horaActual,
          itemsGuardados: [...cart] 
        })
        setShowChange(true)
        fetchProducts() 
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
    <div className="p-6 bg-gray-900 min-h-screen text-white grid grid-cols-1 md:grid-cols-3 gap-6 font-sans">
      
      {/* IZQUIERDA: VITRINERO */}
      <div className="col-span-2">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-black text-blue-400 tracking-tighter">POS PRO 🚀</h1>
          <div className="bg-gray-800 px-4 py-2 rounded-full border border-gray-700 text-[10px] text-gray-400 font-mono">
            Pereira - {new Date().toLocaleDateString()}
          </div>
        </div>

        <input
          type="text"
          value={barcodeInput}
          onChange={(e) => setBarcodeInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleScan()}
          placeholder="Escanear o buscar código manual..."
          className="mb-8 p-5 w-full text-black text-xl rounded-2xl shadow-2xl focus:ring-4 focus:ring-blue-500 outline-none transition-all"
          autoFocus
        />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map(product => (
            <div
              key={product.id}
              className="bg-white p-4 rounded-2xl shadow-xl cursor-pointer hover:scale-105 transition-all text-gray-800 flex flex-col justify-between"
              onClick={() => addToCart(product)}
            >
              <div>
                <img
                  src={product.image || "https://via.placeholder.com/150"}
                  alt={product.name}
                  className="w-full h-32 object-contain rounded-xl mb-4 bg-gray-50"
                  onError={(e) => { e.target.src = "https://via.placeholder.com/150" }}
                />
                <h2 className="font-bold text-lg leading-tight mb-1">{product.name}</h2>
                <p className="text-blue-600 font-black text-xl">${Number(product.price).toLocaleString()}</p>
                <div className="mt-2 p-1 bg-gray-100 rounded border border-dashed border-gray-400 flex items-center justify-center">
                   <span className="text-[10px] text-gray-500 font-mono font-bold">|| {product.barcode} ||</span>
                </div>
              </div>
              <div className="mt-4">
                <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase ${product.stock < 5 ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"}`}>
                  Stock: {product.stock}
                </span>
                <button className="w-full mt-3 bg-blue-600 text-white py-2 rounded-xl font-bold hover:bg-blue-700 uppercase text-xs">
                  + AGREGAR
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* DERECHA: PANEL DE VENTA */}
      <div className="bg-gray-800 p-6 rounded-3xl shadow-2xl h-fit border border-gray-700 sticky top-6">
        <h2 className="text-2xl font-black mb-6 border-b border-gray-700 pb-4">Carrito</h2>
        <div className="max-h-[40vh] overflow-y-auto mb-6 pr-2">
          {cart.length === 0 && <p className="text-gray-500 text-center py-10 italic">Selecciona productos</p>}
          {cart.map(item => (
            <div key={item.id} className="flex justify-between items-center mb-4 bg-gray-700/50 p-4 rounded-2xl border border-gray-600">
              <div className="flex-1">
                <p className="font-bold text-sm leading-none mb-1">{item.name}</p>
                <p className="text-xs text-blue-400 font-mono">${Number(item.price).toLocaleString()} x {item.quantity}</p>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={(e) => {
                  e.stopPropagation()
                  if (item.quantity === 1) setCart(cart.filter(p => p.id !== item.id))
                  else setCart(cart.map(p => p.id === item.id ? { ...p, quantity: p.quantity - 1 } : p))
                }} className="bg-gray-600 hover:bg-red-500 w-8 h-8 flex items-center justify-center rounded-xl font-bold transition-colors">-</button>
                <span className="text-lg font-black">{item.quantity}</span>
                <button onClick={(e) => {
                  e.stopPropagation()
                  setCart(cart.map(p => p.id === item.id ? { ...p, quantity: p.quantity + 1 } : p))
                }} className="bg-gray-600 hover:bg-green-500 w-8 h-8 flex items-center justify-center rounded-xl font-bold transition-colors">+</button>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-2 text-right border-t border-gray-700 pt-6">
          <p className="text-gray-400">Subtotal: <span className="text-white">${subtotal.toLocaleString()}</span></p>
          <p className="text-gray-400">IVA (19%): <span className="text-white">${iva.toLocaleString()}</span></p>
          <p className="text-4xl font-black text-blue-400 mt-2">Total: ${total.toLocaleString()}</p>
        </div>

        <div className="mt-8 space-y-4">
          <label className="flex items-center gap-4 cursor-pointer p-4 bg-gray-900 rounded-2xl border border-gray-700">
            <input type="checkbox" className="w-6 h-6 accent-green-500" checked={sendWhatsapp} onChange={(e) => setSendWhatsapp(e.target.checked)} />
            <div className="flex flex-col"><span className="text-sm font-bold">Enviar WhatsApp</span><span className="text-xs text-gray-500">Ticket digital</span></div>
          </label>

          {sendWhatsapp && <input type="text" placeholder="Número de celular" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} className="p-4 w-full text-black rounded-xl text-lg font-bold outline-none" />}

          <div className="bg-black p-4 rounded-2xl border border-gray-700">
            <p className="text-xs text-gray-500 mb-1 font-bold uppercase">Pago Recibido</p>
            <div className="flex items-center">
              <span className="text-2xl font-bold text-green-500 mr-2">$</span>
              <input type="number" placeholder="0" value={cash} onChange={(e) => setCash(e.target.value)} className="w-full text-3xl font-black bg-transparent text-white outline-none" />
            </div>
          </div>

          <button onClick={handleSell} className="w-full bg-green-600 hover:bg-green-500 text-white font-black py-5 rounded-2xl shadow-2xl transition-all active:scale-95 text-xl">CONFIRMAR VENTA ✅</button>
        </div>
      </div>

      {/* MI TOQUE PERSONAL: FACTURA ESTILO TÉRMICA */}
      {showChange && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white text-black p-8 rounded-3xl shadow-2xl max-w-sm w-full font-mono relative overflow-hidden">
            {/* Decoración superior de papel cortado */}
            <div className="absolute top-0 left-0 w-full h-2 bg-gray-200" style={{ clipPath: 'polygon(0% 0%, 5% 100%, 10% 0%, 15% 100%, 20% 0%, 25% 100%, 30% 0%, 35% 100%, 40% 0%, 45% 100%, 50% 0%, 55% 100%, 60% 0%, 65% 100%, 70% 0%, 75% 100%, 80% 0%, 85% 100%, 90% 0%, 95% 100%, 100% 0%)' }}></div>
            
            <div className="text-center mb-6 pt-4">
              <h2 className="text-2xl font-black tracking-tighter italic">POS PRO 🚀</h2>
              <p className="text-[10px] text-gray-500 uppercase mt-1">Pereira - Risaralda</p>
              <p className="text-[10px] text-gray-500">Fecha: {lastSale?.fecha} | Hora: {lastSale?.hora}</p>
            </div>

            <div className="border-b border-dashed border-gray-300 my-4"></div>

            <div className="space-y-2 mb-6">
              {lastSale?.itemsGuardados?.map((item, idx) => (
                <div key={idx} className="flex justify-between text-xs">
                  <span>{item.quantity}x {item.name.substring(0, 18)}</span>
                  <span>${(item.price * item.quantity).toLocaleString()}</span>
                </div>
              ))}
            </div>

            <div className="border-t-2 border-black pt-4 space-y-1">
              <div className="flex justify-between font-black text-xl">
                <span>TOTAL:</span>
                <span>${total.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm pt-2">
                <span>EFECTIVO:</span>
                <span>${Number(cash).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-lg font-bold text-green-700">
                <span>SU CAMBIO:</span>
                <span>${(Number(cash) - total).toLocaleString()}</span>
              </div>
            </div>

            <div className="text-center mt-8 space-y-4">
              <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">¡Gracias por su compra!</p>
              <button
                onClick={closeChange}
                className="w-full bg-black text-white font-black py-4 rounded-2xl hover:bg-gray-800 transition shadow-lg uppercase text-sm"
              >
                Cerrar Recibo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App