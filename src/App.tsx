import { Route, Routes } from "react-router-dom";
import "./App.css";
import Navbar from "./components/Pages/Shared/Navbar";
import Admin from "./components/Pages/Admin";
import Home from "./components/Pages/Home";
import Contact from "./components/Pages/Contact";
import Footer from "./components/Pages/Shared/Footer";
import Login from "./components/Pages/Shared/login";
import Register from "./components/Pages/Shared/register";
import Verification from "./components/Pages/Verification";
import ProtectedAdminRoute from "./ProtectedAdminRoute";

function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verification" element={<Verification />} />

        {/* 🔒 защищённая админка */}
        <Route
          path="/admin"
          element={
            <ProtectedAdminRoute>
              <Admin />
            </ProtectedAdminRoute>
          }
        />
      </Routes>
      <Footer />
    </>
  );
}

export default App;
