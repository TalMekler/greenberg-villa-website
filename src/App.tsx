import { useEffect } from "react";
import { Route, Routes } from "react-router-dom";
import Admin from "./pages/Admin";
import PublicSite from "./pages/PublicSite";

export default function App() {
  /*
    Takes away the cover index.html paints, once React has something on screen.

    It happens here rather than in the Loader because the admin has no Loader,
    and would otherwise stay covered for good. An effect runs after the paint,
    so on the public site the Loader is already drawn — and it is identical, so
    the swap cannot be seen.
  */
  useEffect(() => {
    document.getElementById("boot-loader")?.remove();
  }, []);

  return (
    <Routes>
      <Route path="/" element={<PublicSite />} />
      <Route path="/admin" element={<Admin />} />
      {/* Anything else falls back to the marketing site. */}
      <Route path="*" element={<PublicSite />} />
    </Routes>
  );
}
