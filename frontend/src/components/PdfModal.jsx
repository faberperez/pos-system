export default function PdfModal({ show, onClose, invoiceUrl }) {
  if (!show) return null;

  // IMPORTANTE: Asegúrate de configurar VITE_API_URL en el .env del frontend
  const API_URL = import.meta.env.VITE_API_URL || "https://tu-backend-en-render.onrender.com";

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-white text-black p-6 rounded-2xl w-80 text-center">
        <h2 className="text-xl font-black mb-4">¿Descargar factura PDF?</h2>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => {
              // Creamos la URL absoluta para que el navegador salga de React
              const fullUrl = invoiceUrl.startsWith('http') 
                ? invoiceUrl 
                : `${API_URL}${invoiceUrl}`;
              
              window.open(fullUrl, "_blank");
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