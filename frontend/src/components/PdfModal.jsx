export default function PdfModal({ show, onClose, invoiceUrl }) {
    if (!show) return null;
  
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
  
        <div className="bg-white text-black p-6 rounded-2xl w-80 text-center">
  
          <h2 className="text-xl font-black mb-4">
            ¿Descargar factura PDF?
          </h2>
  
          <div className="flex gap-3 justify-center">
  
            <button
              onClick={() => {
                window.open(invoiceUrl, "_blank");
                onClose();
              }}
              className="bg-green-600 text-white px-4 py-2 rounded-xl font-bold"
            >
              Descargar
            </button>
  
            <button
              onClick={onClose}
              className="bg-gray-400 text-black px-4 py-2 rounded-xl font-bold"
            >
              Cancelar
            </button>
  
          </div>
        </div>
      </div>
    );
  }