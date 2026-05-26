import Navbar from "../components/Navbar";

import LandingPage from "../pages/LandingPage.jsx";
import PricingPage from "../pages/PricingPage.jsx";
import TermsPage from "../pages/TermsPage.jsx";
import Dashboard from "../pages/Dashboard.jsx";
import CreatePage from "../pages/Create.jsx";
import Studio from "../pages/Studio.jsx";

import ProjectsPage from "../pages/ProjectsPage.jsx";
import AffiliatePage from "../pages/AffiliatePage.jsx";
import Account from "../pages/Account.jsx";

import Login from "../components/Login.jsx";

function withLayout(Page) {
  return function Layout() {
    return (
      <>
        <Navbar />
        <Page />
      </>
    );
  };
}

export default {
  "/": withLayout(LandingPage),

  "/pricing": withLayout(PricingPage),

  "/terms": withLayout(TermsPage),

  "/dashboard": withLayout(Dashboard),

  "/projects": withLayout(ProjectsPage),

  "/studio": withLayout(Studio),
  "/campaign": withLayout(Studio),
  "/music": withLayout(Studio),
  "/create": withLayout(CreatePage),

  "/earn": withLayout(AffiliatePage),

  "/account": withLayout(Account),

  "/login": Login
};
