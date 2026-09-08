// Around forty pages, so the whole index is one fetch and the match is a
// substring scan. No Lunr, no index build step, no dependency to keep current.
(function () {
    var input = document.getElementById("search-input");
    var panel = document.getElementById("search-results");
    if (!input || !panel) return;

    var index = null;
    var loading = null;
    var active = -1;

    function load() {
        if (index) return Promise.resolve(index);
        if (loading) return loading;
        loading = fetch(input.dataset.searchIndex)
            .then(function (r) { return r.json(); })
            .then(function (data) { index = data; return index; })
            .catch(function () { index = []; return index; });
        return loading;
    }

    function score(page, terms) {
        var title = page.title.toLowerCase();
        var section = (page.section || "").toLowerCase();
        var body = page.body.toLowerCase();
        var total = 0;
        for (var i = 0; i < terms.length; i++) {
            var t = terms[i];
            if (title.indexOf(t) === 0) total += 100;
            else if (title.indexOf(t) !== -1) total += 60;
            else if (section.indexOf(t) !== -1) total += 25;
            else if (body.indexOf(t) !== -1) total += 10;
            else return 0;
        }
        return total;
    }

    function render(results) {
        active = -1;
        if (!results.length) {
            panel.innerHTML = input.value.trim()
                ? '<a href="#" data-empty="true">Nothing matches that.</a>'
                : "";
            return;
        }
        panel.innerHTML = results.map(function (p) {
            return '<a href="' + p.url + '" role="option">' +
                   "<strong>" + p.title + "</strong>" +
                   "<small>" + (p.section || "W#") + "</small></a>";
        }).join("");
    }

    function run() {
        var q = input.value.trim().toLowerCase();
        if (q.length < 2) { panel.innerHTML = ""; return; }
        load().then(function (pages) {
            var terms = q.split(/\s+/);
            var hits = [];
            for (var i = 0; i < pages.length; i++) {
                var s = score(pages[i], terms);
                if (s > 0) hits.push({ page: pages[i], score: s });
            }
            hits.sort(function (a, b) { return b.score - a.score; });
            render(hits.slice(0, 8).map(function (h) { return h.page; }));
        });
    }

    function move(step) {
        var items = panel.querySelectorAll("a:not([data-empty])");
        if (!items.length) return;
        if (active >= 0) items[active].removeAttribute("data-active");
        active = (active + step + items.length) % items.length;
        items[active].setAttribute("data-active", "true");
        items[active].scrollIntoView({ block: "nearest" });
    }

    input.addEventListener("input", run);
    input.addEventListener("focus", load);

    input.addEventListener("keydown", function (e) {
        if (e.key === "ArrowDown") { e.preventDefault(); move(1); }
        else if (e.key === "ArrowUp") { e.preventDefault(); move(-1); }
        else if (e.key === "Enter") {
            var items = panel.querySelectorAll("a:not([data-empty])");
            var target = active >= 0 ? items[active] : items[0];
            if (target) { e.preventDefault(); window.location = target.href; }
        } else if (e.key === "Escape") {
            input.value = ""; panel.innerHTML = ""; input.blur();
        }
    });

    document.addEventListener("click", function (e) {
        if (!panel.contains(e.target) && e.target !== input) panel.innerHTML = "";
    });

    document.addEventListener("keydown", function (e) {
        if (e.key === "/" && document.activeElement !== input &&
            !/^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName)) {
            e.preventDefault();
            input.focus();
        }
    });
})();
