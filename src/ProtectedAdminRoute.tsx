import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";

function ProtectedAdminRoute({ children }: { children: JSX.Element }) {
  const [isAllowed, setIsAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setIsAllowed(false);
      return;
    }

    fetch("http://localhost:5000/api/check-admin", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => setIsAllowed(res.ok))
      .catch(() => setIsAllowed(false));
  }, []);

  if (isAllowed === null) {
    return (
      <div className="">
        <div className="flex justify-center items-center min-h-[60vh] text-lg">
          Проверка прав администратора...
        </div>
          <div className="flex flex-row justify-center gap-2">
            <div className="w-4 h-4 rounded-full bg-black dark:bg-white animate-bounce"></div>
            <div
              className="w-4 h-4 rounded-full bg-black dark:bg-white animate-bounce [animation-delay:-.3s]"
            ></div>
            <div
              className="w-4 h-4 rounded-full bg-black dark:bg-white animate-bounce [animation-delay:-.5s]"
            ></div>
          </div>
      </div>

    );
  }

  return isAllowed ? children : <Navigate to="/" replace />;
}

export default ProtectedAdminRoute;
