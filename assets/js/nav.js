// The sidebar is a disclosure below 1024px and always open above it.
(function () {
    var button = document.querySelector(".nav-toggle");
    var sidebar = document.getElementById("sidebar");
    if (!button || !sidebar) return;

    button.addEventListener("click", function () {
        var open = sidebar.getAttribute("data-open") === "true";
        sidebar.setAttribute("data-open", open ? "false" : "true");
        button.setAttribute("aria-expanded", open ? "false" : "true");
    });
})();

// W# has two type names Zig's lexer has never heard of. They are the whole
// point of the dispatch pages, so repaint them.
(function () {
    var abstract = { Number: 1, Integer: 1 };
    document.querySelectorAll('[data-lang="wsharp"] .chroma').forEach(function (block) {
        block.querySelectorAll("span").forEach(function (span) {
            if (span.children.length === 0 && abstract[span.textContent] === 1) {
                span.classList.add("kt");
            }
        });
    });
})();
