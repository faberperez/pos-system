import { useNavigate } from "react-router-dom";

export default function InformesButton() {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate("/dashboard")}
      className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl font-bold shadow-lg"
    >
      📊 Informes
    </button>
  );
}