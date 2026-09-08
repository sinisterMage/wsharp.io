// The toggle writes data-theme on <html>; head.html reads it back before the
// first paint. Without a stored preference the CSS media query decides.
(function () {
    var button = document.getElementById("theme-toggle");
    if (!button) return;

    function current() {
        var set = document.documentElement.getAttribute("data-theme");
        if (set) return set;
        return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }

    button.addEventListener("click", function () {
        var next = current() === "dark" ? "light" : "dark";
        document.documentElement.setAttribute("data-theme", next);
        try { localStorage.setItem("theme", next); } catch (e) {}
    });
})();
