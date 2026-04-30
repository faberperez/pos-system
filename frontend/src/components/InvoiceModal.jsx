export default function InvoiceModal({
  show,
  onClose,
  lastSale,
}) {
  if (!show || !lastSale) return null;

  const total = lastSale.total || 0;
  const cash = lastSale.pago_con || 0;
  const change = lastSale.cambio || 0;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4">

      <div className="bg-white text-black p-8 rounded-3xl shadow-2xl max-w-sm w-full font-mono relative overflow-hidden">

        {/* decoración tipo ticket */}
        <div
          className="absolute top-0 left-0 w-full h-2 bg-gray-200"
          style={{
            clipPath:
              "polygon(0% 0%, 5% 100%, 10% 0%, 15% 100%, 20% 0%, 25% 100%, 30% 0%, 35% 100%, 40% 0%, 45% 100%, 50% 0%, 55% 100%, 60% 0%, 65% 100%, 70% 0%, 75% 100%, 80% 0%, 85% 100%, 90% 0%, 95% 100%, 100% 0%)"
          }}
        />

        <div className="text-center mb-6 pt-4">
          <h2 className="text-2xl font-black">POS PRO 🚀</h2>
          <p className="text-[10px] text-gray-500">Ticket de venta</p>
          
          <p className="text-sm font-bold text-black mt-2">
            Ticket #{lastSale.id}
          </p>
          
          <p className="text-[10px] text-gray-500">
            Fecha: {lastSale?.fecha} | Hora: {lastSale?.hora}
          </p>
        </div>

        <div className="border-b border-dashed my-4" />

        {/* ITEMS */}
        <div className="space-y-2 mb-6">
          {lastSale?.itemsGuardados?.map((item, idx) => (
            <div key={idx} className="flex justify-between text-xs">
              <span>
                {item.quantity}x {item.name.substring(0, 18)}
              </span>
              <span>
                ${(Number(item.price || 0) * item.quantity).toLocaleString()}
              </span>
            </div>
          ))}
        </div>

        {/* TOTALES */}
        <div className="border-t-2 border-black pt-4 space-y-1">
          <div className="flex justify-between font-black text-lg">
            <span>TOTAL:</span>
            <span>${total.toLocaleString()}</span>
          </div>

          <div className="flex justify-between text-sm">
            <span>EFECTIVO:</span>
            <span>${cash.toLocaleString()}</span>
          </div>

          <div className="flex justify-between font-bold text-green-700">
            <span>CAMBIO:</span>
            <span>${change.toLocaleString()}</span>
          </div>
        </div>

        {/* BOTÓN */}
        <div className="mt-8 text-center">
          <button
            onClick={onClose}
            className="w-full bg-black text-white font-black py-4 rounded-2xl hover:bg-gray-800 transition"
          >
            Cerrar recibo
          </button>
        </div>
      </div>
    </div>
  );
}