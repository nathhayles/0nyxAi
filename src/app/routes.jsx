import EditorPage from "../pages/EditorPage.jsx";
import SchedulerPage from "../pages/SchedulerPage.jsx";
import AffiliatePage from "../pages/AffiliatePage.jsx";
import AdminPage from "../pages/AdminPage.jsx";
import ProjectsPage from "../pages/ProjectsPage.jsx";
import PricingPage from "../pages/PricingPage.jsx";
import LandingPage from "../pages/LandingPage.jsx";
import EarnPage from "../pages/EarnPage.jsx";

export const routes = {
  "/": LandingPage,
  "/editor": EditorPage,

  /* Legacy scheduler lives on /app/* */
  "/scheduler": SchedulerPage,
  "/app": SchedulerPage,
  "/app/drafts": SchedulerPage,
  "/app/brands": SchedulerPage,
  "/app/publish": SchedulerPage,
  "/app/ai": SchedulerPage,
  "/app/accounts": SchedulerPage,

  "/projects": ProjectsPage,
  "/affiliate": AffiliatePage,
  "/pricing": PricingPage,
  "/earn": EarnPage,
  "/admin": AdminPage
};
