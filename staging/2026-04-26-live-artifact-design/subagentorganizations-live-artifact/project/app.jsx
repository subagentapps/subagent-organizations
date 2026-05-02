/* App root + hash router */

const App = () => {
  const [route, setRoute] = React.useState(() => {
    const h = window.location.hash.replace("#/", "") || "dashboard";
    return h.split("/")[0];
  });

  React.useEffect(() => {
    const onHash = () => {
      const h = window.location.hash.replace("#/", "") || "dashboard";
      setRoute(h.split("/")[0]);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const navigate = (id) => { window.location.hash = `#/${id}`; };

  return (
    <div className="app">
      <window.TopBar route={route} onRoute={navigate} />
      {route === "dashboard" && <window.Dashboard />}
      {route === "plugins"   && <window.PluginsRoute />}
      {route === "adr"       && <window.AdrRoute />}
      {route === "changelog" && <window.ChangelogRoute />}
    </div>
  );
};

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
