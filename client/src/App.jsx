import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import HighCourt from "./pages/HighCourt";
import HighCourts from "./pages/HighCourts";
import SupremeCourt from "./pages/SupremeCourt";
import Articles from "./pages/Articles";
import ArticleListing from "./pages/ArticleListing";
import ArticleCategory from "./pages/ArticleCategory";
import ArticleDetail from "./pages/ArticleDetail";
import LegalContentArticle from "./pages/LegalContentArticle";
import EditorialDashboard from "./pages/EditorialDashboard";
import EditorialArticle from "./pages/EditorialArticle";
import Contact from "./pages/Contact";
import LegalNews from "./pages/LegalNews";
import Judgments from "./pages/Judgments";
import ConstitutionalLaw from "./pages/ConstitutionalLaw";

function App() {

  return (

    <BrowserRouter>

      <Routes>

        <Route path="/" element={<Home/>} />

        <Route path="/highcourts" element={<HighCourts/>} />

        <Route path="/highcourt/:slug" element={<HighCourt/>} />

        <Route path="/supreme-court" element={<SupremeCourt/>} />

        <Route path="/supreme-court/:slug" element={<SupremeCourt/>} />

        <Route path="/judgments" element={<Judgments/>} />

        <Route path="/legal-news" element={<LegalNews/>} />

        <Route path="/constitutional-law" element={<ConstitutionalLaw/>} />

        <Route path="/articles" element={<ArticleListing/>} />

        <Route path="/articles/submit" element={<Articles/>} />

        <Route path="/articles/:categorySlug" element={<ArticleCategory/>} />

        <Route path="/articles/:categorySlug/:articleId" element={<ArticleDetail/>} />

        <Route path="/article/:slug" element={<LegalContentArticle/>} />

        <Route path="/contact" element={<Contact/>} />

        <Route path="/admin/editorial" element={<EditorialDashboard/>} />

        <Route path="/admin/editorial/articles/:articleId" element={<EditorialArticle/>} />

      </Routes>

    </BrowserRouter>

  );

}

export default App;
