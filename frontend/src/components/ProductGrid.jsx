export default function ProductGrid({ products, addToCart }) {
    return (
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
                onError={(e) => {
                  e.target.src = "https://via.placeholder.com/150";
                }}
              />
  
              <h2 className="font-bold text-lg leading-tight mb-1">
                {product.name}
              </h2>
  
              <p className="text-blue-600 font-black text-xl">
                ${Number(product.price).toLocaleString()}
              </p>
  
              <div className="mt-2 p-1 bg-gray-100 rounded border border-dashed border-gray-400 flex items-center justify-center">
                <span className="text-[10px] text-gray-500 font-mono font-bold">
                  || {product.barcode} ||
                </span>
              </div>
            </div>
  
            <div className="mt-4">
              <span
                className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase ${
                  product.stock < 5
                    ? "bg-red-100 text-red-600"
                    : "bg-green-100 text-green-600"
                }`}
              >
                Stock: {product.stock}
              </span>
  
              <button className="w-full mt-3 bg-blue-600 text-white py-2 rounded-xl font-bold hover:bg-blue-700 uppercase text-xs">
                + AGREGAR
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  }