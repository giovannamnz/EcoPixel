// Language switcher for the EcoPixel book.
//
// Adds a language drop-down to the menu bar. It works when the books are built into
// site/en and site/pt-br (see build.sh / build.ps1): every page has the same file name in
// each language, so switching language just swaps the language folder in the address.
//
// Keep this file identical in every book folder.
(function () {
  "use strict";

  var LANGS = [
    { code: "en", label: "English" },
    { code: "pt-br", label: "Português (Brasil)" }
  ];
  var STORAGE_KEY = "ecopixel-lang";

  function isLang(segment) {
    return LANGS.some(function (lang) { return lang.code === segment; });
  }

  // Find the language folder in the current address, e.g. /docs/en/api.html
  var segments = location.pathname.split("/");
  var langIndex = -1;
  for (var i = segments.length - 1; i >= 0; i--) {
    if (isLang(segments[i])) { langIndex = i; break; }
  }
  // Served as a single book (for example with `mdbook serve`): nothing to switch.
  if (langIndex === -1) { return; }

  var current = segments[langIndex];

  function pathFor(code) {
    var copy = segments.slice();
    copy[langIndex] = code;
    return copy.join("/");
  }

  function remember(code) {
    try { localStorage.setItem(STORAGE_KEY, code); } catch (e) { /* storage may be blocked */ }
  }

  function build() {
    var bar = document.querySelector(".right-buttons");
    if (!bar) { return; }

    var style = document.createElement("style");
    style.textContent =
      "#ecopixel-lang {" +
      "  align-self: center; margin: 0 8px; padding: 2px 6px; font: inherit; font-size: 1.4rem;" +
      "  color: var(--icons); background: transparent; border: 1px solid var(--icons);" +
      "  border-radius: 4px; cursor: pointer; }" +
      "#ecopixel-lang:hover { color: var(--icons-hover); border-color: var(--icons-hover); }" +
      "#ecopixel-lang option { color: var(--fg); background: var(--bg); }";
    document.head.appendChild(style);

    var select = document.createElement("select");
    select.id = "ecopixel-lang";
    select.setAttribute("aria-label", "Language / Idioma");
    select.title = "Language / Idioma";

    LANGS.forEach(function (lang) {
      var option = document.createElement("option");
      option.value = lang.code;
      option.textContent = lang.label;
      option.selected = lang.code === current;
      select.appendChild(option);

      // Tell search engines about the translations.
      var link = document.createElement("link");
      link.rel = "alternate";
      link.hreflang = lang.code;
      link.href = new URL(pathFor(lang.code), location.href).href;
      document.head.appendChild(link);
    });

    select.addEventListener("change", function () {
      remember(select.value);
      location.href = pathFor(select.value);
    });

    bar.insertBefore(select, bar.firstChild);
    remember(current);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", build);
  } else {
    build();
  }
})();
