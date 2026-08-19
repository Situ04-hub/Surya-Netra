import { NavLink } from "react-router-dom";
import { Sun } from "lucide-react";
import { APP, NAV_ITEMS } from "../../constants";

export default function Sidebar() {
  return (
    <aside className="app-sidebar">
      <div className="sidebar-logo" title={`${APP.name} — ${APP.mission}`}>
        <Sun size={20} strokeWidth={2} />
      </div>

      <nav className="nav-list" aria-label="Primary navigation">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.key}
              to={item.to}
              end={item.to === "/"}
              aria-label={item.label}
              title={item.label}
              className={({ isActive }) => `nav-item tooltip-wrap ${isActive ? "active" : ""}`}
            >
              {({ isActive }) => (
                <>
                  {isActive ? <span className="nav-glow" aria-hidden="true" /> : null}
                  <Icon size={19} strokeWidth={1.9} aria-hidden="true" />
                  <span className="tooltip" aria-hidden="true">{item.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <span className="sidebar-version">{APP.version}</span>
      </div>
    </aside>
  );
}
