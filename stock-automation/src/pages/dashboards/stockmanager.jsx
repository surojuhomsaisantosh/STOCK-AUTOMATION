import { useNavigate } from "react-router-dom";

function StockManagerDashboard() {
  const navigate = useNavigate();

  const dashboardCards = [
    {
      id: 1,
      title: "HOME",
      description: "Overview & actions",
      onClick: () => navigate("/stock/orders"),
    },
    {
      id: 2,
      title: "STOCK",
      description: "Inventory levels",
      onClick: () => navigate("/stock"),
    },
    {
      id: 3,
      title: "BILLS",
      description: "Invoices & billing",
      onClick: () => navigate("/stock/bills"), // ✅ FIXED ROUTE
    },
    {
      id: 4,
      title: "SETTINGS",
      description: "Account & security",
      onClick: () => navigate("/stock/settings"),
    },
    {
      id: 5,
      title: "REPORTS",
      description: "Coming soon",
      disabled: true,
    },
    {
      id: 6,
      title: "TEAM",
      description: "Coming soon",
      disabled: true,
    },
  ];

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-12">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10 w-full max-w-6xl">
        {dashboardCards.map((card) => (
          <DashboardCard key={card.id} {...card} />
        ))}
      </div>
    </div>
  );
}

function DashboardCard({ title, description, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        relative group h-56 p-9 text-left
        flex flex-col justify-between
        bg-white rounded-2xl
        border border-gray-200
        transition-all duration-300 ease-out
        ${
          disabled
            ? "opacity-40 cursor-not-allowed"
            : `
              hover:-translate-y-2 hover:scale-[1.02]
              hover:border-[#0b3d2e]
              hover:shadow-[0_25px_60px_rgba(11,61,46,0.25)]
            `
        }
      `}
    >
      {/* GLOW STRIP */}
      {!disabled && (
        <span className="absolute left-0 top-0 h-full w-[3px] bg-[#0b3d2e] opacity-0 group-hover:opacity-100 transition-all duration-300 rounded-l-2xl" />
      )}

      {/* CONTENT */}
      <div>
        <p className="text-[11px] tracking-[0.35em] text-gray-400 font-semibold mb-4">
          {title}
        </p>
        <p className="text-lg font-semibold text-black">
          {description}
        </p>
      </div>

      {/* ACTION */}
      {!disabled && (
        <span className="text-[11px] tracking-widest font-bold text-[#0b3d2e] opacity-70 group-hover:opacity-100 transition">
          OPEN →
        </span>
      )}
    </button>
  );
}

export default StockManagerDashboard;
