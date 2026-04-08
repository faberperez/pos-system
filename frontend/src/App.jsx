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

  const IVA = 0.19

  useEffect(() => {
    fetch("http://localhost:3000/products")
      .then(res => res.json())
      .then(data => setProducts(data))
      .catch(err => console.error(err))
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
  const iva = subtotal * IVA
  const total = subtotal + iva
  const change = cash ? parseFloat(cash) - total : 0

  const handleSell = async () => {
    if (cart.length === 0) return alert("Carrito vacío")
    if (parseFloat(cash) < total) return alert("Dinero insuficiente")

    try {
      const response = await fetch("http://localhost:3000/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map(item => ({
            product_id: item.id,
            quantity: item.quantity
          })),
          client_phone: sendWhatsapp ? clientPhone : null
        })
      })

      const data = await response.json()

      if (response.ok) {
        setLastSale(data)
        setShowChange(true)
      }

    } catch (error) {
      console.error(error)
    }
  }

  const closeChange = () => {
    setShowChange(false)

    if (lastSale) {
      window.open(lastSale.invoice_url)

      if (sendWhatsapp && lastSale.whatsapp_link) {
        window.open(lastSale.whatsapp_link)
      }
    }

    setCart([])
    setCash("")
    setClientPhone("")
    setSendWhatsapp(false)
    setLastSale(null)
  }

  return (
    <div className="p-6 bg-gray-900 min-h-screen text-white grid grid-cols-3 gap-6">

      {/* PRODUCTOS */}
      <div className="col-span-2">
        <h1 className="text-3xl font-bold mb-4">POS PRO 🚀</h1>

        <input
          type="text"
          value={barcodeInput}
          onChange={(e) => setBarcodeInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleScan()}
          placeholder="Escanear código..."
          className="mb-4 p-3 w-full text-black rounded"
        />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {products.map(product => (
            <div
              key={product.id}
              className="bg-white p-3 rounded-xl shadow cursor-pointer hover:scale-105 transition"
              onClick={() => addToCart(product)}
            >
              <img
                src={product.image || "https://via.placeholder.com/150"}
                alt={product.name}
                className="w-full h-28 object-cover rounded"
              />

              <h2 className="text-black font-bold mt-2 text-sm">
                {product.name}
              </h2>

              <p className="text-green-600 font-bold">
                ${product.price}
              </p>

              {/* 🔥 AQUÍ ESTABA EL PROBLEMA → ESTO FALTABA */}
              <p className={`text-xs ${product.stock < 5 ? "text-red-600" : "text-gray-600"}`}>
                Stock: {product.stock}
              </p>

              <p className="text-gray-500 text-xs">
                Código: {product.barcode}
              </p>

              <button
                onClick={(e) => {
                  e.stopPropagation()
                  addToCart(product)
                }}
                className="mt-2 w-full bg-blue-500 text-white p-2 rounded"
              >
                Agregar
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* CARRITO */}
      <div className="bg-gray-800 p-4 rounded">
        <h2 className="text-xl mb-4">Carrito</h2>

        {cart.map(item => (
          <div key={item.id} className="flex justify-between items-center mb-2 bg-gray-700 p-2 rounded">

            <div>
              <p className="font-bold">{item.name}</p>
              <p className="text-sm text-gray-300">
                ${item.price} x {item.quantity}
              </p>
            </div>

            <div className="flex items-center gap-2">

              <button
                onClick={() => {
                  if (item.quantity === 1) {
                    setCart(cart.filter(p => p.id !== item.id))
                  } else {
                    setCart(cart.map(p =>
                      p.id === item.id
                        ? { ...p, quantity: p.quantity - 1 }
                        : p
                    ))
                  }
                }}
                className="bg-yellow-500 px-2 rounded"
              >
                -
              </button>

              <span>{item.quantity}</span>

              <button
                onClick={() => {
                  setCart(cart.map(p =>
                    p.id === item.id
                      ? { ...p, quantity: p.quantity + 1 }
                      : p
                  ))
                }}
                className="bg-green-500 px-2 rounded"
              >
                +
              </button>

              <button
                onClick={() => {
                  setCart(cart.filter(p => p.id !== item.id))
                }}
                className="bg-red-600 px-2 rounded"
              >
                X
              </button>

            </div>
          </div>
        ))}

        <button
          onClick={() => setCart([])}
          className="mt-2 w-full bg-red-700 p-2 rounded"
        >
          Vaciar carrito
        </button>

        <p className="mt-4">Subtotal: ${subtotal.toFixed(2)}</p>
        <p>IVA: ${iva.toFixed(2)}</p>
        <p className="text-xl font-bold">Total: ${total.toFixed(2)}</p>

        <div className="mt-3">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={sendWhatsapp}
              onChange={(e) => setSendWhatsapp(e.target.checked)}
            />
            Enviar factura por WhatsApp
          </label>

          {sendWhatsapp && (
            <input
              type="text"
              placeholder="Teléfono cliente"
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
              className="mt-2 p-2 w-full text-black rounded"
            />
          )}
        </div>

        <input
          type="number"
          placeholder="¿Con cuánto paga?"
          value={cash}
          onChange={(e) => setCash(e.target.value)}
          className="mt-3 p-2 w-full text-black rounded"
        />

        <button
          onClick={handleSell}
          className="mt-4 w-full bg-green-600 p-3 rounded"
        >
          VENDER
        </button>
      </div>

      {/* MODAL */}
      {showChange && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center">
          <div className="bg-white text-black p-10 rounded text-center">
            <h2 className="text-3xl mb-4">CAMBIO</h2>
            <p className="text-5xl font-bold text-green-600">
              ${change.toFixed(2)}
            </p>

            <button
              onClick={closeChange}
              className="mt-6 bg-blue-500 text-white px-6 py-3 rounded"
            >
              CONFIRMAR
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default App