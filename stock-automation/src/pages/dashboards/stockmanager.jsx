import { useNavigate } from "react-router-dom";

function StockManagerDashboard() {
  const navigate = useNavigate();

  const dashboardCards = [
    {
      id: 1,
      title: "HOME",
      description: "Overview & daily actions",
      onClick: () => navigate("/stock/orders"),
    },
    {
      id: 2,
      title: "STOCK",
      description: "Inventory & availability",
      onClick: () => navigate("/stock"),
    },
    {
      id: 3,
      title: "BILLS",
      description: "Invoices & billing records",
      onClick: () => navigate("/stock/bills"),
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
      description: "Analytics coming soon",
      disabled: true,
    },
    {
      id: 6,
      title: "TEAM",
      description: "Team management coming soon",
      disabled: true,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white px-10 py-14">
      {/* HEADING */}
      <div className="max-w-6xl mx-auto mb-12">
        <h1 className="text-3xl font-bold text-gray-900">
          Stock Manager Dashboard
        </h1>
        <p className="text-sm text-gray-500 mt-2">
          Manage inventory, orders, and billing from one place
        </p>
      </div>

      {/* DASHBOARD CARDS */}
      <div className="flex justify-center">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 w-full max-w-6xl">
          {dashboardCards.map((card) => (
            <DashboardCard key={card.id} {...card} />
          ))}
        </div>
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
        relative h-56 p-8 rounded-2xl
        text-left flex flex-col justify-between
        border transition-all duration-300
        ${
          disabled
            ? `
              bg-gray-100 border-gray-200
              text-gray-400 cursor-not-allowed
            `
            : `
              bg-white border-gray-200
              hover:border-emerald-700
              hover:-translate-y-1
              hover:shadow-[0_20px_50px_rgba(16,120,87,0.25)]
              active:scale-[0.98]
            `
        }
      `}
    >
      {!disabled && (
        <span className="absolute left-0 top-0 h-full w-[4px] bg-emerald-700 rounded-l-2xl" />
      )}

      <div>
        <p className="text-[11px] tracking-[0.4em] font-semibold text-gray-400 mb-3">
          {title}
        </p>
        <p className="text-xl font-semibold text-gray-900 leading-snug">
          {description}
        </p>
      </div>

      {!disabled && (
        <span className="text-xs font-bold tracking-widest text-emerald-700 opacity-80">
          OPEN →
        </span>
      )}

      {!disabled && (
        <div className="absolute inset-0 rounded-2xl ring-1 ring-transparent hover:ring-emerald-600/30 transition" />
      )}
    </button>
  );
}

export default StockManagerDashboard;
