export default function Cart({
  cart,
  setCart,
  cash,
  setCash,
  sendWhatsapp,
  setSendWhatsapp,
  clientPhone,
  setClientPhone,
  subtotal,
  iva,
  total,
  handleSell
}) {

  const safeCart = Array.isArray(cart) ? cart : [];

  const cashValue = Number(cash || 0);
  const change = cashValue - total;

  return (
    <div className="bg-gray-800 p-6 rounded-3xl shadow-2xl h-fit border border-gray-700 sticky top-6">

      <h2 className="text-2xl font-black mb-6 border-b border-gray-700 pb-4">
        Carrito
      </h2>

      {/* LISTA PRODUCTOS */}
      <div className="max-h-[40vh] overflow-y-auto mb-6 pr-2">

        {safeCart.length === 0 && (
          <p className="text-gray-500 text-center py-10 italic">
            Selecciona productos
          </p>
        )}

        {safeCart.map(item => (
          <div
            key={item.id}
            className="flex justify-between items-center mb-4 bg-gray-700/50 p-4 rounded-2xl border border-gray-600"
          >
            <div className="flex-1">
              <p className="font-bold text-sm mb-1">{item.name}</p>
              <p className="text-xs text-blue-400 font-mono">
                ${Number(item.price || 0).toLocaleString()} x {item.quantity}
              </p>
            </div>

            <div className="flex items-center gap-3">

              <button
                onClick={() => {
                  if (item.quantity === 1) {
                    setCart(safeCart.filter(p => p.id !== item.id));
                  } else {
                    setCart(safeCart.map(p =>
                      p.id === item.id
                        ? { ...p, quantity: p.quantity - 1 }
                        : p
                    ));
                  }
                }}
                className="bg-gray-600 hover:bg-red-500 w-8 h-8 rounded-xl font-bold"
              >
                -
              </button>

              <span className="font-black">{item.quantity}</span>

              <button
                onClick={() =>
                  setCart(safeCart.map(p =>
                    p.id === item.id
                      ? { ...p, quantity: p.quantity + 1 }
                      : p
                  ))
                }
                className="bg-gray-600 hover:bg-green-500 w-8 h-8 rounded-xl font-bold"
              >
                +
              </button>

            </div>
          </div>
        ))}
      </div>

      {/* TOTALES */}
      <div className="text-right border-t border-gray-700 pt-6 space-y-1">

        <p>Subtotal: ${subtotal.toLocaleString()}</p>
        <p>IVA: ${iva.toLocaleString()}</p>

        <p className="text-3xl font-black text-blue-400">
          Total: ${total.toLocaleString()}
        </p>

        <p className={`font-bold ${change >= 0 ? "text-green-400" : "text-red-400"}`}>
          Cambio: ${change.toLocaleString()}
        </p>

      </div>

      {/* PAGO */}
      <div className="mt-6 space-y-4">

        <div className="bg-black p-4 rounded-2xl border border-gray-700">
          <p className="text-xs text-gray-500 mb-1 font-bold uppercase">
            Pago recibido
          </p>

          <input
            type="number"
            value={cash}
            onChange={(e) => setCash(e.target.value)}
            className="w-full text-3xl font-black bg-transparent text-white outline-none"
            placeholder="0"
          />
        </div>

        <label className="flex items-center gap-4 cursor-pointer p-4 bg-gray-900 rounded-2xl border border-gray-700">
          <input
            type="checkbox"
            className="w-6 h-6 accent-green-500"
            checked={sendWhatsapp}
            onChange={(e) => setSendWhatsapp(e.target.checked)}
          />

          <div className="flex flex-col">
            <span className="text-sm font-bold">Enviar WhatsApp</span>
            <span className="text-xs text-gray-500">Ticket digital</span>
          </div>
        </label>

        {sendWhatsapp && (
          <input
            type="text"
            placeholder="Número de celular"
            value={clientPhone}
            onChange={(e) => setClientPhone(e.target.value)}
            className="p-4 w-full text-black rounded-xl text-lg font-bold outline-none"
          />
        )}

        <button
          onClick={handleSell}
          className="w-full bg-green-600 hover:bg-green-500 text-white font-black py-5 rounded-2xl text-xl"
        >
          CONFIRMAR VENTA ✅
        </button>

      </div>
    </div>
  );
}