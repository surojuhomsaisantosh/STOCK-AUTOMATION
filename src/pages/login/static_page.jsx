import React from "react";
import { useNavigate } from "react-router-dom";

const StaticPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 relative">
      <div className="absolute top-6 right-6">
        <button
          onClick={() => navigate("/login")}
          className="bg-[rgb(0,100,55)] text-white px-6 py-2 rounded-lg font-semibold hover:bg-[rgb(0,80,45)] transition-colors shadow-sm"
        >
          Login
        </button>
      </div>

      <div className="text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-[rgb(0,100,55)] mb-4">
          Coming Soon
        </h1>
        <p className="text-lg md:text-xl text-slate-600">
          We're working hard to bring you something amazing.
        </p>
      </div>
    </div>
  );
};

export default StaticPage;
