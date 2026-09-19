/* La porte commune : elle retient la classe choisie, pour la proposer a la
   visite suivante. Le choix vit dans le navigateur de l'appareil et n'en sort
   pas : ni compte, ni cookie envoye, ni requete. Voir GUIDE-SITE.md. */
(function () {
  "use strict";
  var CLE = "cours.classe";
  var lire = function () {
    try { return JSON.parse(localStorage.getItem(CLE) || "null"); } catch (e) { return null; }
  };
  var ecrire = function (v) {
    try { localStorage.setItem(CLE, JSON.stringify(v)); } catch (e) {}
  };

  document.addEventListener("DOMContentLoaded", function () {
    var cartes = [].slice.call(document.querySelectorAll("a.classe"));
    if (!cartes.length) return;

    cartes.forEach(function (a) {
      a.addEventListener("click", function () {
        ecrire({ href: a.getAttribute("href"), titre: a.getAttribute("data-classe") });
      });
    });

    var vu = lire();
    if (!vu || !vu.href) return;
    var carte = cartes.filter(function (a) { return a.getAttribute("href") === vu.href; })[0];
    if (!carte) return;                       /* une classe retiree du portail */
    carte.classList.add("deja");

    var p = document.querySelector(".reprise");
    if (!p) return;
    p.hidden = false;
    p.innerHTML = 'La dernière fois, vous êtes allé en <a href="' + vu.href + '">'
                + (carte.querySelector(".k").textContent || carte.querySelector(".t").textContent) + '</a>.'
                + ' <button type="button" class="oublier">Ce n\'est pas ma classe</button>';
    p.querySelector(".oublier").addEventListener("click", function () {
      try { localStorage.removeItem(CLE); } catch (e) {}
      carte.classList.remove("deja");
      p.hidden = true;
    });
  });
})();
