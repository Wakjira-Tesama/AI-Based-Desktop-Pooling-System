import { useNavigate } from "react-router-dom";
import { BuildingLibraryIcon } from "@heroicons/react/24/outline";

export default function LibrarySelection() {
  const navigate = useNavigate();

  const handleSelect = (library) => {
    localStorage.setItem("selectedLibrary", library);
    navigate("/dashboard");
  };

  return (
    <div className="astu-shell flex min-h-screen items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="astu-content w-full max-w-2xl space-y-8 astu-card p-8 astu-anim-in">
        <div className="text-center">
          <div className="mx-auto mt-4 h-16 w-16 text-blue-500 flex items-center justify-center rounded-full bg-blue-500/10">
            <BuildingLibraryIcon className="h-8 w-8" />
          </div>
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-white astu-title">
            Select a Library
          </h2>
          <p className="mt-2 text-sm astu-subtitle">
            Choose which library branch you want to pool a desktop from.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <button
            onClick={() => handleSelect("applied")}
            className="group relative flex flex-col items-center p-8 rounded-xl bg-gray-800/50 border border-gray-700 hover:border-blue-500 hover:bg-gray-800 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <div className="h-16 w-16 bg-blue-500/20 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <BuildingLibraryIcon className="h-8 w-8 text-blue-400 group-hover:text-blue-300" />
            </div>
            <h3 className="text-xl font-semibold text-white">Applied Library</h3>
            <p className="mt-2 text-sm text-gray-400 text-center">
              Access the high-performance engineering & design workstations.
            </p>
          </button>

          <button
            onClick={() => handleSelect("central")}
            className="group relative flex flex-col items-center p-8 rounded-xl bg-gray-800/50 border border-gray-700 hover:border-purple-500 hover:bg-gray-800 transition-all focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <div className="h-16 w-16 bg-purple-500/20 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <BuildingLibraryIcon className="h-8 w-8 text-purple-400 group-hover:text-purple-300" />
            </div>
            <h3 className="text-xl font-semibold text-white">Central Library</h3>
            <p className="mt-2 text-sm text-gray-400 text-center">
              Access standard workstations for research and writing.
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}
