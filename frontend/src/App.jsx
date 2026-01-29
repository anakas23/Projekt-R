import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";

import Home from "./pages/Home";
import Restaurants from "./pages/Restaurants";
import Compare from "./pages/Compare";
import SubmitPrice from "./pages/SubmitPrice";
import Admin from "./pages/Admin";

export default function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/restaurants" element={<Restaurants />} />
        <Route path="/compare" element={<Compare />} />
        <Route path="/submit" element={<SubmitPrice />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </>
  );
}
