import { useNavigate } from "react-router-dom";

function StockManagerDashboard() {
  const navigate = useNavigate();

  const dashboardCards = [
    {
      id: 1,
      title: "HOME",
      description: "Overview & actions",
      onClick: () => window.scrollTo({ top: 0, behavior: "smooth" }),
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
      onClick: () => navigate("/bills"),
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
    <div className="min-h-screen w-full bg-white flex items-center justify-center px-16">
      <div className="grid grid-cols-3 grid-rows-2 gap-10 w-full max-w-6xl h-[65vh]">
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
        relative p-10 flex flex-col justify-between
        bg-white border border-gray-200
        transition-all duration-300
        ${
          disabled
            ? "opacity-40 cursor-not-allowed"
            : "hover:border-[rgb(0,100,55)] hover:shadow-[0_12px_30px_rgba(0,100,55,0.12)]"
        }
      `}
    >
      {/* TOP — SECTION TITLE */}
      <div>
        <p className="text-[11px] tracking-[0.35em] text-gray-400 font-medium mb-3">
          {title}
        </p>
        <p className="text-lg font-medium text-gray-900">
          {description}
        </p>
      </div>

      {/* BOTTOM — ACTION */}
      {!disabled && (
        <div className="mt-10">
          <span className="text-[11px] tracking-widest font-semibold text-[rgb(0,100,55)]">
            OPEN →
          </span>
        </div>
      )}
    </button>
  );
}

export default StockManagerDashboard;
