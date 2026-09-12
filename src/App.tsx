import { Route, Routes } from "react-router-dom";
import Admin from "./pages/Admin";
import PublicSite from "./pages/PublicSite";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<PublicSite />} />
      <Route path="/admin" element={<Admin />} />
      {/* Anything else falls back to the marketing site. */}
      <Route path="*" element={<PublicSite />} />
    </Routes>
  );
}
