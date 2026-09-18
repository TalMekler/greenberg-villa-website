import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useLanguage } from "./i18n";
import { legalPages, legalPath, type LegalPage as Page } from "./legal";
import Admin from "./pages/Admin";
import LegalPage from "./pages/LegalPage";
import PublicSite from "./pages/PublicSite";

/** /privacy with no language opens it in the visitor's own. */
function ToLegalPage({ page }: { page: Page }) {
  const { language } = useLanguage();
  return <Navigate to={legalPath(language, page)} replace />;
}

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
      {/* Legal pages carry their language in the path: /en/privacy, /he/terms, /el/accessibility. */}
      {legalPages.map((page) => (
        <Route key={page} path={`/:lang/${page}`} element={<LegalPage page={page} />} />
      ))}
      {legalPages.map((page) => (
        <Route key={`${page}-bare`} path={`/${page}`} element={<ToLegalPage page={page} />} />
      ))}
      {/* Anything else falls back to the marketing site. */}
      <Route path="*" element={<PublicSite />} />
    </Routes>
  );
}
