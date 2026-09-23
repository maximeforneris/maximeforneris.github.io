/* ═══════════════════════════════════════════════════════════════════════
   KIT WEB — sommaire actif, replis, quiz et outils de calcul.
   Inline dans chaque page par webseance.py. Un outil s'appelle depuis le
   markdown par   ::: {.outil data-outil="paroi"}   :::
   Ajouter un outil = ajouter une entree dans OUTILS, rien d'autre.
   ═══════════════════════════════════════════════════════════════════════ */
(function(){
"use strict";

/* ───────────────────────────────── formatage francais */
function fr(x,n){
  if(!isFinite(x))return "—";
  var s=Math.abs(x)<Math.pow(10,-n)/2?0:x;
  return s.toFixed(n).replace(".",",").replace(/\B(?=(\d{3})+(?!\d))/g," ");
}
function frs(x,n){
  if(!isFinite(x))return "—";
  return (Math.abs(x)<Math.pow(10,-n)/2?0:x).toFixed(n).replace(".",",");
}
function E(t,a,h){var e=document.createElement(t);
  for(var k in a)e.setAttribute(k,a[k]);
  if(h!==undefined)e.innerHTML=h;return e;}

/* État partagé : les outils se chaînent comme les séances.
   L'enchaînement est EXPLICITE et ordonné — paroi donne U, bilan donne GV,
   energie consomme GV. Un mécanisme d'abonnement se rappellerait lui-même. */
var ETAT={u_mur:0.30, gv:0, surface:0, phi:0};
function suivant(nom){var o=OUTILS[nom];if(o&&o._recalc)o._recalc();}

/* ───────────────────────────────── sommaire actif */
var liens=[].slice.call(document.querySelectorAll("nav.somm a"));
if(liens.length&&"IntersectionObserver" in window){
  var cibles=liens.map(function(a){return document.getElementById(a.getAttribute("href").slice(1));})
                  .filter(Boolean);
  var io=new IntersectionObserver(function(es){
    es.forEach(function(e){
      if(!e.isIntersecting)return;
      liens.forEach(function(a){
        a.classList.toggle("on",a.getAttribute("href")==="#"+e.target.id);});
    });
  },{rootMargin:"-45% 0px -50% 0px"});
  cibles.forEach(function(c){io.observe(c);});
}

/* ───────────────────────────────── quiz */
[].forEach.call(document.querySelectorAll(".quiz"),function(q){
  var items=[].slice.call(q.querySelectorAll("li"));
  var total=items.length, faits=0, justes=0;
  var chap=E("p",{"class":"chapeau"},"Vérifiez-vous — "+total+" questions");
  q.insertBefore(chap,q.firstChild);
  var score=E("p",{"class":"score"},"");
  items.forEach(function(li){
    /* « énoncé : bonne / mauvaise / mauvaise »  — le gras marque la bonne */
    var html=li.innerHTML;
    /* separateurs : " : " avant les reponses, " | " entre elles.
       Ni l'un ni l'autre n'apparait dans un enonce ou une reponse — ce que
       « / » ne garantissait pas : il coupait dans </strong> et dans R = 1 / U. */
    var coupe=html.lastIndexOf(" : ");
    var enonce=coupe>0?html.slice(0,coupe):html;
    var reps=(coupe>0?html.slice(coupe+3):"").split(/\s*\|\s*/);
    var bloc=E("div",{"class":"qq"});
    bloc.appendChild(E("p",{},enonce.trim()));
    var ch=E("div",{"class":"choix"});
    var repondu=false;
    reps.forEach(function(r){
      var juste=/<strong>/.test(r);
      var txt=r.replace(/<\/?strong>/g,"").trim();
      if(!txt)return;
      var b=E("button",{type:"button"},txt);
      b.addEventListener("click",function(){
        if(repondu)return;
        repondu=true;faits++;if(juste)justes++;
        [].forEach.call(ch.children,function(o){o.disabled=true;});
        b.classList.add(juste?"juste":"faux");
        if(!juste)[].forEach.call(ch.children,function(o,i){
          if(/<strong>/.test(reps[i]))o.classList.add("juste");});
        score.textContent=justes+" / "+faits+" — "+
          (faits<total?(total-faits)+" restantes":"terminé");
      });
      ch.appendChild(b);
    });
    bloc.appendChild(ch);
    q.appendChild(bloc);
  });
  var ul=q.querySelector("ul");if(ul)ul.remove();
  q.appendChild(score);
});

/* ───────────────────────────────── exercices
   L'exercice DIT SI C'EST JUSTE et rappelle la methode. Il ne donne jamais la
   valeur attendue ni la redaction : le corrige reste au polycopie. Voir
   GUIDE-WEB.md. La reponse voyage obscurcie dans data-a — de quoi ne pas
   tomber dessus en survolant la page, rien de plus. */
var socleExo=document.querySelector("[data-site]");
var CLE_EXO="fed."+(socleExo?socleExo.getAttribute("data-site"):"autonome")+".exo";
function exoLu(){try{return JSON.parse(localStorage.getItem(CLE_EXO)||"{}")||{};}
                 catch(e){return {};}}
/* L'evenement annonce aussi CE QUI A ETE TAPE et le genre du bloc. Le kit
   n'en fait rien ; comptes.js, charge sur un site a comptes, l'ecoute pour
   le recopier dans la base. Sans lui, ces deux champs ne vont nulle part. */
function exoNote(id,etat,valeur,genre){var t=exoLu();t[id]=etat;
  try{localStorage.setItem(CLE_EXO,JSON.stringify(t));}catch(e){}
  document.dispatchEvent(new CustomEvent("exo",{detail:{id:id,etat:etat,
    valeur:valeur===undefined?null:valeur,genre:genre||"exercice"}}));}
function aplat(s){
  return (s.normalize?s.normalize("NFD").replace(/[\u0300-\u036f]/g,""):s)
         .toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
}
function memeTexte(a,b){
  /* « 1,5 m », « 1,5m » et « 1.5 m » sont la meme reponse : l'eleve tape vite,
     et l'espace avant l'unite n'est pas ce qu'on evalue. */
  var x=aplat(a),y=aplat(b);
  return x===y||x.replace(/ /g,"")===y.replace(/ /g,"");
}
function aplatSignes(s){
  /* Comme aplat(), mais on GARDE les symboles qui portent le sens :
     + - * / ^ ( ) [ ] ; < > = et le point decimal. Sans eux, « 5x - 5 »
     et « 5x + 5 » deviennent la meme reponse, et « [0 ; 10[ » vaut
     « ]0 ; 10] ». Les variantes typographiques sont ramenees a la touche
     du clavier : moins, fois, divise, virgule decimale. */
  return (s.normalize?s.normalize("NFD").replace(/[\u0300-\u036f]/g,""):s)
         .toLowerCase()
         .replace(/[\u2212\u2013\u2014]/g,"-")
         .replace(/[\u00d7\u22c5\u2217]/g,"*")
         .replace(/[\u00f7\u2215]/g,"/")
         .replace(/,/g,".")
         .replace(/[^a-z0-9+\-*\/^()\[\];<>=.]+/g," ").trim();
}
function memeSignes(a,b){
  var x=aplatSignes(a),y=aplatSignes(b);
  return x===y||x.replace(/ /g,"")===y.replace(/ /g,"");
}
function nombre(s){
  /* « 1 376 » et « 1,38 » et « 1.38e3 » : l'eleve tape comme il veut */
  /* le moins typographique d'un clavier de tablette vaut le tiret du clavier */
  var t=s.replace(/\s/g,"").replace(",",".").replace(/[−–]/g,"-");   /* \s couvre U+00A0 et U+202F */
  return t===""?NaN:parseFloat(t);
}
[].forEach.call(document.querySelectorAll(".exo"),function(ex){
  var sec;try{sec=JSON.parse(atob(ex.getAttribute("data-a")).split("").map(
    function(c){return String.fromCharCode(c.charCodeAt(0)^0x5A);}).join(""));}
  catch(e){return;}
  var id=ex.getAttribute("data-exo"), typ=sec.t;
  var indice=ex.querySelector(".indice"), liste=ex.querySelector(".verifier");
  var zone=E("div",{"class":"reponse"}), verdict=E("p",{"class":"verdict"},"");
  var champ, valider;

  if(typ==="justification"){
    champ=E("textarea",{rows:"4","aria-label":"Votre justification",
      placeholder:"Rédigez votre réponse, puis comparez-la aux points à vérifier."});
    valider=E("button",{type:"button","class":"btn"},"J’ai répondu");
  }else{
    champ=E("input",{type:"text",autocomplete:"off","aria-label":"Votre réponse",
      inputmode:typ==="calcul"?"decimal":"text",
      placeholder:typ==="calcul"?"Votre valeur":"Votre réponse"});
    valider=E("button",{type:"button","class":"btn"},"Vérifier");
  }
  var ligne=E("div",{"class":"saisie"});
  ligne.appendChild(champ);
  if(typ==="calcul"&&sec.u)ligne.appendChild(E("span",{"class":"unite"},sec.u));
  ligne.appendChild(valider);
  if(indice){
    var bi=E("button",{type:"button","class":"btn creux"},"Voir l’indice");
    bi.addEventListener("click",function(){
      indice.hidden=!indice.hidden;
      bi.textContent=indice.hidden?"Voir l’indice":"Masquer l’indice";
    });
    ligne.appendChild(bi);
  }
  zone.appendChild(ligne);zone.appendChild(verdict);
  ex.appendChild(zone);
  if(indice)ex.appendChild(indice);

  function juge(){
    if(typ==="justification"){
      /* rien a corriger automatiquement : on rend les points a verifier, et
         l'eleve se juge lui-meme. Les points disent QUOI verifier, pas la
         reponse. */
      if(!champ.value.trim()){verdict.className="verdict";
        verdict.textContent="Rédigez d’abord votre réponse.";return;}
      if(liste&&liste.hidden){
        liste.hidden=false;
        [].forEach.call(liste.children,function(li){
          var b=E("input",{type:"checkbox"});
          b.addEventListener("change",compte);
          li.insertBefore(b,li.firstChild);
        });
        ex.appendChild(liste);
        valider.textContent="Relire ma réponse";
      }
      compte();
      return;
    }
    var ok;
    if(typ==="calcul"){
      var v=nombre(champ.value);
      if(isNaN(v)){verdict.className="verdict";
        verdict.textContent="Entrez une valeur numérique.";return;}
      ok=sec.v!==null&&Math.abs(v-sec.v)<=Math.abs(sec.v)*(sec.tol/100);
    }else{
      var r=aplat(champ.value);
      ok=!!r&&(sec.a||[]).some(function(a){return aplat(a)===r;});
    }
    verdict.className="verdict "+(ok?"juste":"faux");
    verdict.textContent=ok?"C’est juste."
      :(typ==="calcul"?"Ce n’est pas la valeur attendue. Reprenez la méthode."
                      :"Ce n’est pas la réponse attendue.");
    exoNote(id,ok?"juste":"faux",champ.value,"exercice");
    if(!ok&&indice)indice.hidden=false;
  }
  function compte(){
    var b=liste?[].slice.call(liste.querySelectorAll("input")):[];
    var n=b.filter(function(x){return x.checked;}).length;
    verdict.className="verdict "+(n===b.length&&b.length?"juste":"");
    verdict.textContent=n+" point"+(n>1?"s":"")+" sur "+b.length+
      (n===b.length&&b.length?" — votre réponse est complète.":" à vérifier dans votre réponse.");
    exoNote(id,n===b.length&&b.length?"juste":"vu",champ.value,"justification");
  }
  valider.addEventListener("click",juge);
  champ.addEventListener("keydown",function(e){
    if(e.key==="Enter"&&typ!=="justification"){e.preventDefault();juge();}
  });
  var fait=exoLu()[id];
  if(fait==="juste"){ex.classList.add("fait");
    verdict.className="verdict deja";verdict.textContent="Déjà réussi.";}
});



/* ───────────────────────────────── series d'entrainement
   Le pendant web du tableau a remplir du polycopie : une case par item, on
   remplit, on verifie tout d'un coup. Meme regle que l'exercice — la page dit
   juste ou faux et rappelle la methode, elle ne donne jamais la reponse.
   Une case fausse GARDE ce qui a ete tape : on corrige, on ne recommence pas. */
[].forEach.call(document.querySelectorAll(".serie"),function(se){
  var sec;try{sec=JSON.parse(atob(se.getAttribute("data-a")).split("").map(
    function(c){return String.fromCharCode(c.charCodeAt(0)^0x5A);}).join(""));}
  catch(e){return;}
  var id=se.getAttribute("data-serie");
  var items=[].slice.call(se.querySelectorAll("ol.items > li"));
  var indice=se.querySelector(".indice"), cases=[];

  items.forEach(function(li,i){
    var d=(sec.i||[])[i]||{};
    var rep=E("span",{"class":"rep"});
    var inp=E("input",{type:"text",autocomplete:"off",
      inputmode:d.v!==undefined?"decimal":"text",
      "class":d.v!==undefined?"":"texte",
      "aria-label":"Réponse"});
    rep.appendChild(inp);
    if(sec.u)rep.appendChild(E("span",{"class":"unite"},sec.u));
    var mq=E("span",{"class":"marque"},"");
    rep.appendChild(mq);
    li.appendChild(rep);
    cases.push({e:inp,m:mq,d:d,li:li});
    inp.addEventListener("input",function(){
      li.classList.remove("juste","faux");mq.textContent="";
    });
    inp.addEventListener("keydown",function(ev){
      if(ev.key!=="Enter")return;
      ev.preventDefault();
      if(i+1<cases.length)cases[i+1].e.focus();else juger();
    });
  });

  function juste(d,txt){
    if(!txt.trim())return null;                    /* non traite */
    if(d.v!==undefined){
      var v=nombre(txt);
      if(isNaN(v))return false;
      return Math.abs(v-d.v)<=Math.abs(d.v)*(sec.tol/100)+1e-9;
    }
    var cmp=(sec.m==="signes")?memeSignes:memeTexte;
    return !!txt.trim()&&(d.a||[]).some(function(a){return cmp(a,txt);});
  }

  var verdict=E("p",{"class":"verdict"},"");
  var valider=E("button",{type:"button","class":"btn"},"Vérifier la série");
  var barre=E("div",{"class":"barre"});
  barre.appendChild(valider);
  if(indice){
    var bi=E("button",{type:"button","class":"btn creux"},"Voir l’indice");
    bi.addEventListener("click",function(){
      indice.hidden=!indice.hidden;
      bi.textContent=indice.hidden?"Voir l’indice":"Masquer l’indice";
    });
    barre.appendChild(bi);
  }
  se.appendChild(barre);se.appendChild(verdict);
  if(indice)se.appendChild(indice);

  function juger(){
    var bons=0,faux=0,vides=0;
    cases.forEach(function(c){
      var r=juste(c.d,c.e.value);
      c.li.classList.remove("juste","faux");
      if(r===null){vides++;c.m.textContent="";return;}
      if(r){bons++;c.li.classList.add("juste");c.m.textContent="✓";}
      else {faux++;c.li.classList.add("faux");c.m.textContent="✗";}
    });
    var tout=bons===cases.length;
    verdict.className="verdict "+(tout?"juste":(faux?"faux":""));
    var reste=[];
    if(faux)reste.push(faux+" à reprendre");
    if(vides)reste.push(vides+(vides>1?" non traitées":" non traitée"));
    verdict.textContent=tout
      ?"La série entière est juste."
      :bons+" sur "+cases.length+(reste.length?" — "+reste.join(", "):"")+".";
    if(tout)se.classList.add("fait");else se.classList.remove("fait");
    exoNote(id,tout?"juste":(faux?"faux":"vu"),
      bons+"/"+cases.length+" : "+cases.map(function(c){return c.e.value.trim()||"·";}).join(" | "),
      "serie");
    if(faux&&indice)indice.hidden=false;
  }
  valider.addEventListener("click",juger);

  if(exoLu()[id]==="juste"){
    se.classList.add("fait");
    verdict.className="verdict deja";verdict.textContent="Déjà réussie.";
  }
});

/* ═══════════════════════════════════════════════════ PSYCHROMETRIE
   Une seule implementation pour tout le depot. Pression atmospherique
   normale ; au-dela de 100 degres l'air ne sature plus, d'ou le garde-fou
   de rDe qui renverrait sinon une humidite absolue negative. */
var PATM=101325;
function pvs(t){return 610.94*Math.exp(17.625*t/(t+243.04));}      /* Pa */
function rDe(t,hr){                                                /* g/kg as */
  var p=hr/100*pvs(t);
  if(p>=PATM*0.999)return 1e4;
  return 622*p/(PATM-p);
}
function hrDe(t,r){var p=PATM*r/(622+r);return Math.min(100,100*p/pvs(t));}
function enth(t,r){return 1.006*t+r/1000*(2501+1.83*t);}           /* kJ/kg as */
function rosee(t,hr){
  var a=17.625,b=243.04,g=Math.log(Math.max(hr,0.01)/100)+a*t/(b+t);
  return b*g/(a-g);
}
function volSpec(t,r){return 287.06*(t+273.15)*(1+1.6078*r/1000)/PATM;}
function bulbeH(t,r){                                              /* dichotomie */
  var lo=-30,hi=t,m,i;
  for(i=0;i<60;i++){
    m=(lo+hi)/2;
    var rs=rDe(m,100)/1000;                                        /* kg/kg */
    var rc=(rs*(2501-2.326*m)-1.006*(t-m))/(2501+1.86*t-4.186*m);
    if(rc*1000>r)hi=m;else lo=m;
  }
  return m;
}
function tDeH(h,r){return (h-2.501*r)/(1.006+0.00183*r);}          /* adiabatique */

/* ═══════════════════════════════════════════════════ LA REMISE
   « ::: {.remise} » — l'eleve tape l'identifiant donne en classe et produit un
   FICHIER TEXTE de ses reponses. Tout se fabrique dans le navigateur : rien
   n'est envoye, rien n'est enregistre. Le fichier atterrit dans ses
   telechargements, et c'est lui qui le remet.

   Ce qui est collecte : les series et les exercices qui se trouvent entre le
   dernier titre de niveau 1 AVANT le bloc, et le bloc lui-meme. Un bilan pose
   sous « # Exercices bilan de sequence » ne ramasse donc pas les exercices de
   la seance qui le precede. */
[].forEach.call(document.querySelectorAll(".remise"),function(bl){

  /* --- la portee : du dernier h1 qui precede, jusqu'ici --- */
  function portee(){
    var tous=[].slice.call(document.querySelectorAll("h1, .serie, .exo"));
    var fin=tous.indexOf(bl), debut=0;
    if(fin<0){
      /* le bloc n'est pas dans la liste : on se repere sur sa position */
      fin=tous.length;
      for(var k=0;k<tous.length;k++){
        if(bl.compareDocumentPosition(tous[k])&Node.DOCUMENT_POSITION_PRECEDING)continue;
        fin=k;break;
      }
    }
    for(var i=fin-1;i>=0;i--){ if(tous[i].tagName==="H1"){debut=i+1;break;} }
    return tous.slice(debut,fin).filter(function(n){return n.tagName!=="H1";});
  }

  function titreDe(n){
    /* le titre d'un exercice et celui d'une serie sont des h4 ; le repli sur
       un <strong> attrapait le premier mot gras de l'enonce. */
    var t=n.querySelector("h3, h4, .titre-exo");
    return t?t.textContent.trim():"(sans titre)";
  }

  function lignesSerie(se){
    var out=["SÉRIE — "+titreDe(se),""];
    [].forEach.call(se.querySelectorAll("ol.items > li"),function(li,i){
      var inp=li.querySelector("input");
      var lib=li.cloneNode(true);
      var rep=lib.querySelector(".rep"); if(rep)rep.parentNode.removeChild(rep);
      var etat=li.classList.contains("juste")?"juste"
              :li.classList.contains("faux") ?"faux":"non vérifié";
      out.push("  "+(i+1)+". "+lib.textContent.replace(/\s+/g," ").trim());
      out.push("     réponse : "+((inp&&inp.value.trim())||"(vide)")+"   ["+etat+"]");
    });
    out.push("");
    return out;
  }

  function lignesExo(ex){
    var out=["EXERCICE — "+titreDe(ex),""];
    var champ=ex.querySelector("textarea, .saisie input");
    out.push("  réponse : "+((champ&&champ.value.trim())||"(vide)"));
    var liste=ex.querySelector(".verifier");
    if(liste&&!liste.hidden){
      var pts=[].slice.call(liste.children), n=0;
      pts.forEach(function(li){
        var cb=li.querySelector("input[type=checkbox]");
        var coche=cb&&cb.checked; if(coche)n++;
        var txt=li.cloneNode(true);
        var c=txt.querySelector("input"); if(c)c.parentNode.removeChild(c);
        out.push("     ["+(coche?"x":" ")+"] "+txt.textContent.replace(/\s+/g," ").trim());
      });
      out.splice(2,0,"  points retrouvés : "+n+" sur "+pts.length);
    }
    var v=ex.querySelector(".verdict");
    if(v&&v.textContent.trim())out.push("  verdict : "+v.textContent.trim());
    out.push("");
    return out;
  }

  function fabriquer(id){
    var titre=(document.querySelector("h1")||{textContent:"Bilan"}).textContent.trim();
    var onglet=document.title||titre;
    var d=new Date(), deux=function(n){return (n<10?"0":"")+n;};
    var out=["BILAN DE SÉQUENCE",
             "Page       : "+onglet,
             "Identifiant: "+id,
             "Date       : "+deux(d.getDate())+"/"+deux(d.getMonth()+1)+"/"+d.getFullYear()
                            +" à "+deux(d.getHours())+"h"+deux(d.getMinutes()),
             new Array(64).join("="), ""];
    var n=0;
    portee().forEach(function(el){
      if(el.classList.contains("serie")){out=out.concat(lignesSerie(el));n++;}
      else if(el.classList.contains("exo")){out=out.concat(lignesExo(el));n++;}
    });
    if(!n)out.push("(aucune réponse trouvée sur cette page)","");
    out.push(new Array(64).join("-"));
    out.push("Fichier produit dans le navigateur de l'élève.");
    out.push("Rien n'a été envoyé, rien n'a été enregistré ailleurs.");
    return out.join("\r\n");
  }

  function nettoie(s){
    return (s.normalize?s.normalize("NFD").replace(/[̀-ͯ]/g,""):s)
           .replace(/[^A-Za-z0-9]+/g,"-").replace(/^-|-$/g,"").toLowerCase()
           || "sans-identifiant";
  }

  /* --- l'interface --- */
  bl.appendChild(E("p",{"class":"remise-quoi"},
    "Tapez l’<b>identifiant donné en classe</b>, puis produisez le fichier. "+
    "Il se fabrique <b>dans votre navigateur</b> : rien n’est envoyé, rien n’est "+
    "enregistré. Le fichier part dans vos téléchargements, et c’est vous qui le remettez."));
  var ligne=E("div",{"class":"saisie"});
  var ident=E("input",{type:"text",autocomplete:"off","aria-label":"Identifiant",
    placeholder:"identifiant donné en classe"});
  var bouton=E("button",{type:"button","class":"btn"},"Produire mon fichier");
  var dit=E("p",{"class":"verdict"},"");
  ligne.appendChild(ident);ligne.appendChild(bouton);
  bl.appendChild(ligne);bl.appendChild(dit);

  bouton.addEventListener("click",function(){
    var id=ident.value.trim();
    if(!id){dit.className="verdict";dit.textContent="Tapez d’abord votre identifiant.";
      ident.focus();return;}
    var texte=fabriquer(id);
    try{
      var b=new Blob([texte],{type:"text/plain;charset=utf-8"});
      var u=URL.createObjectURL(b), a=E("a",{href:u,download:"bilan-"+nettoie(id)+".txt"});
      document.body.appendChild(a);a.click();
      document.body.removeChild(a);setTimeout(function(){URL.revokeObjectURL(u);},2000);
      dit.className="verdict juste";
      dit.textContent="Fichier produit : bilan-"+nettoie(id)+".txt";
    }catch(e){
      dit.className="verdict faux";
      dit.textContent="Le navigateur a refusé le téléchargement. Recopiez vos réponses à la main.";
    }
  });
  ident.addEventListener("keydown",function(ev){
    if(ev.key==="Enter"){ev.preventDefault();bouton.click();}
  });
});



/* ═══════════════════════════════════════════════════ SCHEMAS
   Dessines ici, pas repris du polycopie : vectoriels, ils suivent le theme
   sombre, et « paroi-coupe » se redessine avec le composeur de paroi. */
var SCHEMAS={}, SCHEMA_MAJ=[];
/* declare ici : le schema des degres-jours s'en sert autant que l'outil */
var VILLES=[["Nice",1100],["Marseille",1300],["Bordeaux",1700],["Lyon",2200],
            ["Paris",2300],["Rouen",2400],["Strasbourg",2700],["Briançon",3800]];
var NS="http://www.w3.org/2000/svg";
function S(t,a,txt){
  var e=document.createElementNS(NS,t);
  for(var k in a)e.setAttribute(k,a[k]);
  if(txt!==undefined)e.textContent=txt;
  return e;
}
function V(c){return "var(--"+c+")";}

/* ─────────── coupe de paroi, avec le profil de temperature ─────────── */


/* ─────────── l'echelle des conductivites ─────────── */



/* ─────────── les trois modes de transfert ─────────── */


/* ─────────── les degres-jours, ville par ville ─────────── */



/* ─────────── la double etiquette du DPE ─────────── */
/* Seuils : arrete du 31 mars 2021, cas general. La classe retenue est la plus
   mauvaise des deux — c'est tout l'objet de ce schema. */
var DPE=[
 {c:"A",cep:70, ges:6,  e:"#2e8b3d",g:"#ece9f4"},
 {c:"B",cep:110,ges:11, e:"#6bb43a",g:"#d5cee8"},
 {c:"C",cep:180,ges:30, e:"#b5cf3c",g:"#bab0da"},
 {c:"D",cep:250,ges:50, e:"#f2d81f",g:"#8878c4"},
 {c:"E",cep:330,ges:70, e:"#f0a52a",g:"#6f5ab4"},
 {c:"F",cep:420,ges:100,e:"#e6702c",g:"#57409f"},
 {c:"G",cep:1e9,ges:1e9,e:"#d02b20",g:"#3d2a80"}
];


/* ─────────── chaine d'energie et chaine d'information ─────────── */



/* ─────────── topologies d'une ligne, et les trois longueurs ─────────── */


/* ─────────── les trois couches, quatre protocoles ─────────── */


/* ─────────── perimetrique, volumetrique, zonage ─────────── */


/* ─────────── les deux situations de CCF de l'epreuve E5 ─────────── */


/* ─────────── la monotone de puissance et la puissance souscrite ───────────
   Les points sont ceux de l'exercice du cours : au-dela de 36 kVA, seule la
   duree du depassement se paie, pas son ampleur. */


/* ─────────── trois courants, et ce qui revient par le neutre ─────────── */


/* ─────────── le batiment en ecorche ─────────── */



/* ─────────── le diagramme de l'air humide ─────────── */



/* --------- dispersion : deux series de meme moyenne ---------
   Ajoute le 3 septembre 2026 pour la sequence 1 de maths-PC. Aucun schema du
   kit ne montrait une dispersion, et c'est tout le propos de la sequence :
   deux installations de meme moyenne, l'une reglee, l'autre qui oscille. */


/* ═══════════════════════════════════════════════════ OUTILS */
var OUTILS={};

/* ─────────── 1. convertisseur d'unités ─────────── */


/* ─────────── le diviseur de tension et la resistance de LED ───────────
   Premier outil ecrit pour une classe de bac pro CIEL. Il ne remplace aucun
   calcul : il permet d'en essayer dix en dix secondes, ce qu'une feuille ne
   permet pas — et de VOIR que la tension se partage proportionnellement aux
   resistances, au lieu de le lire. */


/* ─────────── 2. puissance transportée ─────────── */


/* ─────────── 3. composeur de paroi ─────────── */
var MAT=[
 ["Enduit ciment",1.15],["Enduit plâtre",0.25],["Plaque de plâtre BA13",0.25],
 ["Béton",1.65],["Béton armé",2.50],["Parpaing creux",1.05],["Brique creuse",0.45],
 ["Brique pleine",0.85],["Pierre calcaire",1.40],["Bois massif",0.15],
 ["Laine minérale",0.038],["Laine de bois",0.040],["Ouate de cellulose",0.039],
 ["Polystyrène expansé",0.035],["Polystyrène extrudé",0.030],["Polyuréthane",0.025],
 ["Verre",1.00],["Acier",50],["Lame d'air non ventilée",null]
];


/* ─────────── 4. bilan de déperditions ─────────── */
OUTILS.bilan={
  titre:"Bilan de déperditions",
  intro:"Un bâtiment de plain-pied. Entrez le relevé de votre local : le classement des "+
        "postes se refait à chaque changement.",
  chaine:"le U des murs vient du composeur de paroi",
  monte:function(d){
    var P={L:12,l:7,h:2.7,ti:19,te:-7,tu:8,ren:0.5,sf:14,uf:1.3,ut:0.20,up:0.30,
           psi:0.45,psim:0.10};
    var maj=[];
    var g=E("div",{"class":"g2"}),c1=E("div"),c2=E("div");
    function ch(par,lab,cle,min,max,pas,dec,unite){
      var c=E("div",{"class":"champ"});
      c.appendChild(E("label",{},lab));
      var v=E("span",{"class":"v"},"");c.appendChild(v);
      var i=E("input",{type:"range",min:min,max:max,step:pas,value:P[cle]});
      i.addEventListener("input",function(){P[cle]=parseFloat(this.value);calc();});
      c.appendChild(i);par.appendChild(c);
      maj.push(function(){v.textContent=frs(P[cle],dec).replace("-","−")+unite;});
    }
    ch(c1,"Longueur","L",4,40,0.5,1," m");
    ch(c1,"Largeur","l",3,25,0.5,1," m");
    ch(c1,"Hauteur sous plafond","h",2.2,6,0.1,1," m");
    ch(c1,"Température intérieure","ti",15,24,0.5,1," °C");
    ch(c1,"Extérieure de base","te",-15,5,0.5,1," °C");
    ch(c1,"Local sous le plancher","tu",-15,19,0.5,1," °C");
    ch(c1,"Renouvellement d'air","ren",0,2,0.05,2," vol/h");
    ch(c2,"Surface de fenêtres","sf",0,60,1,0," m²");
    ch(c2,"U des fenêtres","uf",0.7,5,0.05,2,"");
    ch(c2,"U de la toiture","ut",0.08,2.5,0.01,2,"");
    ch(c2,"U du plancher","up",0.08,2.5,0.01,2,"");
    ch(c2,"Ψ plancher / façade","psi",0,1.2,0.01,2,"");
    ch(c2,"Ψ des menuiseries (30 m)","psim",0,0.4,0.01,2,"");
    g.appendChild(c1);g.appendChild(c2);d.appendChild(g);
    var res=E("div",{"class":"res",style:"margin-top:18px"});
    var barres=E("div",{"class":"barres",style:"margin-top:14px"});
    d.appendChild(res);d.appendChild(barres);
    function calc(){
      maj.forEach(function(f){f();});
      var sol=P.L*P.l, per=2*(P.L+P.l), vol=sol*P.h;
      var smur=Math.max(0,per*P.h-P.sf), dte=P.ti-P.te, dtu=P.ti-P.tu;
      var q=vol*P.ren;
      var A=[["Murs",ETAT.u_mur*smur*dte],["Fenêtres",P.uf*P.sf*dte],
             ["Toiture",P.ut*sol*dte],["Plancher",P.up*sol*dtu],
             ["Pont thermique plancher",P.psi*per*dte],
             ["Ponts de menuiseries",P.psim*30*dte],["Air neuf",0.34*q*dte]];
      var tot=A.reduce(function(a,b){return a+b[1];},0);
      ETAT.phi=tot;ETAT.surface=sol;ETAT.gv=dte>0?tot/dte:0;
      ETAT.postes=A;
      SCHEMA_MAJ.forEach(function(f){f();});
      var r=tot/sol;
      res.innerHTML="<div class='gros'>"+
        "<span><b>Déperditions</b><span>"+fr(tot,0)+" W</span></span>"+
        "<span><b>À installer × 1,15</b><span>"+fr(tot*1.15,0)+" W</span></span>"+
        "<span><b>Ratio</b><span>"+frs(r,1)+" W/m²</span></span>"+
        "<span><b>GV</b><span>"+frs(ETAT.gv,1)+" W/K</span></span></div>"+
        "<p>Sol "+frs(sol,0)+" m², périmètre "+frs(per,0)+" m, murs "+frs(smur,0)+
        " m², air neuf "+fr(q,0)+" m³/h. "+
        (r>80?"<b>Au-delà de 80 W/m² : bâtiment ancien non isolé.</b>"
         :r>40?"Entre 40 et 80 W/m² : isolation partielle."
         :"<b>Sous 40 W/m² : niveau d'une construction récente.</b>")+"</p>";
      var s=A.slice().sort(function(a,b){return b[1]-a[1];}), mx=s[0][1]||1;
      barres.innerHTML=s.map(function(p){
        return '<div class="barre"><span class="l">'+p[0]+'</span><span class="b" style="width:'+
          (100*p[1]/mx)+'%"></span><span class="p">'+fr(p[1],0)+' W · '+
          fr(100*p[1]/tot,0)+' %</span></div>';}).join("");
      suivant("energie");
    }
    OUTILS.bilan._recalc=calc;
    calc();

  }
};

/* ─────────── 5. besoin annuel et temps de retour ─────────── */



/* ─────────── lire une unite ─────────── */
var UNITES=[
 {k:"W",u:"W",n:"Le watt — une puissance",
  lit:"watt",
  m:"Ce que la machine fait <b>à chaque instant</b>. Elle ne s'accumule pas : "+
    "à l'arrêt, elle vaut zéro.",
  f:"Un radiateur <b>appelle</b> 1 500 W. Il ne « consomme » pas 1 500 W.",
  o:"radiateur 1 à 2 kW · chaudière de maison 20 à 25 kW"},
 {k:"kWh",u:"kWh",n:"Le kilowattheure — une énergie",
  lit:"kilowatt-heure",
  m:"Une puissance <b>multipliée par une durée</b>. C'est ce qui est facturé.",
  f:"L'unité contient sa formule : kW × h, donc <b>E = P × t</b>.",
  o:"1 kWh = 3 600 kJ · un radiateur de 1 kW pendant 1 h"},
 {k:"K",u:"K",n:"Le kelvin — un écart de température",
  lit:"kelvin",
  m:"Un <b>écart</b>, jamais une température absolue dans nos formules.",
  f:"Un écart de 20 °C vaut 20 K. <b>On n'ajoute pas 273.</b>",
  o:"régime 70/50 → 20 K · plancher chauffant 45/35 → 10 K"},
 {k:"m3h",u:"m³/h",n:"Le mètre cube par heure — un débit",
  lit:"mètre cube par heure",
  m:"Un <b>volume par unité de temps</b>. Le « par heure » est ce qui piège : "+
    "les fiches constructeur donnent souvent des L/s.",
  f:"1 L/s = 3,6 m³/h. 1 m³/h = 1 000 L/h.",
  o:"air neuf 25 à 30 m³/h par personne · réseau d'immeuble 2 m³/h"},
 {k:"lambda",u:"W/(m·K)",p:"W/(m·K)  λ",n:"λ — la conductivité du matériau",
  lit:"watts par mètre et par kelvin",
  m:"Ce qui traverse <b>un mètre d'épaisseur</b> du matériau, par kelvin d'écart. "+
    "Propriété du matériau seul.",
  f:"On la <b>divise</b> par une longueur, on ne la multiplie pas : <b>R = e / λ</b>.",
  o:"isolant < 0,05 · béton 1,65 · acier 50"},
 {k:"R",u:"m²·K/W",n:"R — la résistance thermique",
  lit:"mètres carrés-kelvin par watt",
  m:"L'inverse d'un flux : combien de <b>kelvins d'écart</b> il faut pour faire "+
    "passer un watt par mètre carré.",
  f:"C'est l'unité de U retournée. <b>U = 1 / R</b>.",
  o:"10 cm de laine 2,6 · Rsi 0,13 · Rse 0,04"},
 {k:"U",u:"W/(m²·K)",n:"U — le coefficient de transmission",
  lit:"watts par mètre carré et par kelvin",
  m:"Ce qui traverse <b>un mètre carré de paroi complète</b> pour un kelvin d'écart. "+
    "Il englobe déjà la conduction, la convection et le rayonnement.",
  f:"Il manque des m² et des K : <b>Φ = U × S × ΔT</b>.",
  o:"mur neuf 0,20 · double vitrage 1,4 · mur non isolé 2,5"},
 {k:"psi",u:"W/(m·K)",p:"W/(m·K)  Ψ",n:"Ψ — le coefficient linéique d'un pont thermique",
  lit:"watts par mètre et par kelvin",
  m:"Ce qui fuit par <b>un mètre de liaison</b>, par kelvin d'écart. Une liaison "+
    "est une ligne, pas une surface.",
  f:"Il manque des <b>mètres</b> et des K : <b>Φ = Ψ × L × ΔT</b>. "+
    "<b>Même unité que λ, rôle opposé</b> : λ se divise, Ψ se multiplie.",
  o:"ITE 0,05 à 0,15 · ITI plancher traversant 0,60 à 0,90"},
 {k:"GV",u:"W/K",n:"GV — la signature du bâtiment",
  lit:"watts par kelvin",
  m:"Ce que le bâtiment perd <b>par kelvin d'écart</b>, tous postes confondus. "+
    "Il ne dépend pas de la météo.",
  f:"Il manque des K : <b>Φ = GV × ΔT</b>, donc <b>GV = Φ / ΔT</b>.",
  o:"petit bureau 130 W/K · maison rénovée 80 à 150 W/K"},
 {k:"DJU",u:"DJU",n:"Le degré-jour unifié",
  lit:"degré-jour unifié",
  m:"La somme, sur toute la saison, des <b>degrés manquants sous 18 °C</b>. "+
    "Un jour à 13 °C de moyenne apporte 5 DJU.",
  f:"Des kelvins × des jours. Avec le GV : <b>besoin = GV × DJU × 24 / 1 000</b>.",
  o:"Nice 1 100 · Paris 2 300 · Strasbourg 2 700"},
 {k:"ratio",u:"kWh/(m²·an)",n:"Le ratio de consommation",
  lit:"kilowattheures par mètre carré et par an",
  m:"L'énergie d'une année ramenée au <b>mètre carré chauffé</b>. C'est ce qui "+
    "permet de comparer deux bâtiments de tailles différentes.",
  f:"Précisez toujours <b>lequel</b> : utile, final ou primaire. Les trois "+
    "peuvent varier du simple au triple.",
  o:"passif 15 · EnerPHit 25 · bâtiment 1970 non rénové 200 et plus"}
];



/* ═══════════════════════════════════════════════════ HYDRAULIQUE
   Eau a 60 degres : masse volumique 983 kg/m3, viscosite 0,474e-6 m2/s.
   Blasius vaut pour un tube lisse — cuivre, PER, multicouche — et pour un
   Reynolds compris entre 4 000 et 100 000, ce qui couvre tout le chauffage. */
var RHO_EAU=983, NU_EAU=0.474e-6;
var TUBES=[["14 × 1",12],["16 × 1",14],["18 × 1",16],["20 × 1",18],
           ["22 × 1",20],["26 × 1",24],["28 × 1,5",25]];
function debit(pkW,dt){return pkW*1000/(1163*dt);}          /* m3/h */
function vitesse(Q,dmm){                                     /* m/s */
  var S=Math.PI*Math.pow(dmm/1000,2)/4;
  return (Q/3600)/S;
}
function lineique(Q,dmm){                                    /* Pa/m */
  var d=dmm/1000, v=vitesse(Q,dmm);
  if(v<=0)return 0;
  var Re=v*d/NU_EAU;
  var lam=Re<2000?64/Math.max(Re,1):0.3164/Math.pow(Re,0.25);
  return lam*RHO_EAU*v*v/(2*d);
}
var SINGU=[["Coude à 90°",0.065],["Té de passage",0.035],["Vanne d'arrêt",0.020],
           ["Robinet thermostatique",0.250],["Radiateur",0.125]];
/* longueur equivalente = coefficient x diametre interieur en mm, formule
   d'atelier qui redonne les valeurs du tableau de la seance 8 */

/* ─────────── 1. pertes de charge ─────────── */


/* ─────────── 2. point de fonctionnement ─────────── */
var POMPES=[["Vitesse I",2.0,1.8],["Vitesse II",3.0,2.2],["Vitesse III",4.0,2.6]];


/* ─────────── 3. eau chaude sanitaire ─────────── */
/* litres puises par heure, internat de 40 eleves — total 1 632 L par jour */
var PROFIL=[0,0,0,0,0,32,128,224,160,64,32,32,48,32,32,32,48,96,192,256,128,64,32,0];


/* Saturation du R134a, valeurs arrondies : T, p bar, h liquide, h vapeur */
var SAT134=[[-30,0.84,160,380],[-20,1.33,173,386],[-10,2.01,186,392],[0,2.93,200,399],
  [10,4.15,213,404],[20,5.72,227,409],[30,7.70,241,414],[40,10.17,256,419],
  [50,13.18,271,423],[60,16.82,287,426],[70,21.17,304,428]];
function sat134(t){
  var i=0;while(i<SAT134.length-2&&SAT134[i+1][0]<t)i++;
  var a=SAT134[i],b=SAT134[i+1],f=(t-a[0])/(b[0]-a[0]);
  return {p:Math.exp(Math.log(a[1])+f*(Math.log(b[1])-Math.log(a[1]))),
          hl:a[2]+f*(b[2]-a[2]), hv:a[3]+f*(b[3]-a[3])};
}












/* ─── la sous-station a ballon primaire : les cinq reseaux ─── */
var SS_RESEAUX=[
  {k:"urbain",   c:"chaud",  n:"Réseau de chauffage urbain",
   d:"Le primaire. Il appartient au fournisseur : c'est son compteur qui facture."},
  {k:"chauffage",c:"tiede",  n:"Chauffage du bâtiment",
   d:"Départ régulé par V21 en loi d'eau, circulateur à vitesse variable."},
  {k:"charge",   c:"vert",   n:"Charge du ballon primaire",
   d:"P22 remplit la réserve d'énergie par le haut ; le bas repart vers l'échangeur."},
  {k:"primecs",  c:"violet", n:"Primaire de production ECS",
   d:"P23 puise en haut du ballon ; V22 dose pour tenir la température distribuée."},
  {k:"sanitaire",c:"froid",  n:"Réseaux sanitaires",
   d:"Eau froide et bouclage entrent, l'eau chaude sanitaire sort. Aucun stockage."}
];



/* ─────────── sous-station : puissance souscrite et abonnement ─────────── */


/* ─── pompe a chaleur : ce qui entre, ce qui sort, a l'echelle ─── */


/* ─── batterie froide : l'ADP et le facteur de bipasse ─── */


/* ─── les barres du calibrage U41 : une mesure, une teinte, un accent ─── */
function barres(el,opt){
  /* opt : {titre, source, lignes:[{n, v, unite, detail, accent}], max} */
  var W=880, HL=46, H=64+opt.lignes.length*HL+40;
  var X0=300, X1=770;                       /* la zone tracee */
  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img","aria-label":opt.titre});
  svg.appendChild(S("text",{x:24,y:26,"class":"s-tit"},opt.titre.toUpperCase()));
  var mx=opt.max||Math.max.apply(null,opt.lignes.map(function(l){return l.v;}));
  var carte=E("p",{"class":"leg-schema"},opt.source||"");
  var barres=[];

  opt.lignes.forEach(function(l,i){
    var y=64+i*HL, h=24;
    var w=Math.max(3,(X1-X0)*l.v/mx);
    /* le libelle, en encre — jamais dans la couleur de la barre */
    svg.appendChild(S("text",{x:X0-14,y:y+17,"text-anchor":"end","class":"s-nom"},l.n));
    var r=S("rect",{x:X0,y:y,width:w,height:h,rx:4,
      fill:V(l.accent?"chaud":"froid"),opacity:l.accent?"0.9":"0.62"});
    svg.appendChild(r);
    /* etiquette directe : la valeur au bout de la barre, le detail en retrait.
       Un seul <text> avec deux <tspan> : le decalage est mesure par le moteur
       de rendu, jamais estime au nombre de caracteres. */
    var et=S("text",{x:X0+w+12,y:y+17,"class":"s-lab"});
    et.appendChild(S("tspan",{},l.v+(l.unite||"")));
    if(l.detail)et.appendChild(S("tspan",{dx:"10","class":"s-pet"},l.detail));
    svg.appendChild(et);
    /* zone de survol plus large que la barre */
    var z=S("rect",{x:0,y:y-8,width:W,height:h+16,fill:"transparent"});
    svg.appendChild(z);
    barres.push({r:r,l:l});
    z.addEventListener("mouseenter",function(){
      barres.forEach(function(b){b.r.setAttribute("opacity",b.r===r?"1":"0.22");});
      carte.innerHTML="<b>"+l.n+"</b> — "+(l.aide||l.detail||"");});
    z.addEventListener("mouseleave",function(){
      barres.forEach(function(b){
        b.r.setAttribute("opacity",b.l.accent?"0.9":"0.62");});
      carte.textContent=opt.source||"";});
  });
  el.appendChild(svg);
  (el.parentNode||el).appendChild(carte);
}





/* ═══════════════════════════════════════════════════ SCHEMAS — CAP
   Consolidation maths. Rien de thermique ici : ce sont les six images qui
   manquaient aux fiches, et qu'aucun polycopie ne portait. Elles servent
   plusieurs fiches chacune — la barre des fractions revient en proportion,
   la droite graduee en lecture de graphique. */

/* ─────────── le tableau des rangs, et la virgule qui glisse ─────────── */


/* ─────────── poser : les virgules l'une sous l'autre ─────────── */


/* ─────────── decomposer un produit : le rectangle ─────────── */


/* ─────────── la barre des fractions ─────────── */


/* ─────────── la droite graduee : 0,75 contre 0,8 ─────────── */


/* ─────────── arrondir : trois sens, une seule regle du 5 ─────────── */


/* ─────────── priorites : les memes touches, deux resultats ─────────── */


/* ─────────── B · milli, unité, kilo ─────────── */


/* ─────────── B · l'escalier des longueurs ─────────── */


/* ─────────── B · le mètre carré, découpé pour de vrai ─────────── */


/* ─────────── B · le mètre cube et le litre ─────────── */


/* ─────────── B · l'heure, en minutes et en décimal ─────────── */


/* ─────────── B · des km/h aux m/s ─────────── */


/* ─────────── C · le tableau de proportionnalité et son coefficient ─────────── */


/* ─────────── C · forfait plus part variable ─────────── */


/* ─────────── C · une remise puis une TVA ─────────── */


/* ─────────── C · ce que pèse un mètre cube ─────────── */


/* ─────────── D · croiser une ligne et une colonne ─────────── */


/* ─────────── D · l'échelle d'un plan ─────────── */


/* ─────────── E · défaire les opérations dans l'ordre inverse ─────────── */


/* ─────────── F · les trois morceaux d'une réponse ─────────── */







/* ─── PAC : le point de bivalence, et le piege de la puissance ─── */


/* ─── echangeur : co-courant contre contre-courant, et le DTLM ─── */


/* ─── les quatre domaines du site, pour l'en-tete de l'accueil ─── */


/* ═══════════════════════════════════════════════ LA MACHINE FRIGORIFIQUE
   Six fluides, leurs tables de saturation, et quatre outils qui s'en servent.

   Les enthalpies ne sont pas tabulees : elles se calculent, avec la reference
   internationale h liquide = 200 kJ/kg a 0 °C, commune a tous les fluides pour
   que deux cycles se comparent.

     hl(t) = 200 + cpl x t
     Lv(t) = Lv0 x ((Tc - T) / (Tc - 273,15))^0,38      formule de Watson
     hv(t) = hl(t) + Lv(t)

   Verifie sur R134a contre la table du kit : ecart sous 1,5 kJ/kg de -20 a
   +40 °C. Ne pas remplacer par une interpolation lineaire de Lv, qui derive de
   10 % pres du point critique. */

var FLUIDES = {
  "R134a": {M:102, chim:"tétrafluoroéthane", gwp:1430, classe:"A1", lp:0.25,
    tc:101.1, lv0:198.6, cpl:1.34, cpv:0.90, gam:1.12, coul:"froid",
    ou:"climatisation, pompes à chaleur anciennes, transport",
    p:[[-40,0.51],[-30,0.85],[-20,1.33],[-10,2.01],[0,2.93],[10,4.15],[20,5.72],
       [30,7.70],[40,10.17],[50,13.18],[60,16.82],[70,21.17]]},
  "R410A": {M:72.6, chim:"mélange R32 + R125", gwp:2088, classe:"A1", lp:0.44,
    tc:71.4, lv0:221.4, cpl:1.52, cpv:1.05, gam:1.16, coul:"violet",
    ou:"climatisation split, le parc installé des vingt dernières années",
    p:[[-40,1.75],[-30,2.72],[-20,4.00],[-10,5.73],[0,7.98],[10,10.87],[20,14.50],
       [30,19.00],[40,24.50],[50,31.16],[60,39.10]]},
  "R32": {M:52, chim:"difluorométhane", gwp:675, classe:"A2L", lp:0.061,
    tc:78.1, lv0:315.3, cpl:1.85, cpv:1.15, gam:1.20, coul:"tiede",
    ou:"climatisation neuve : il remplace le R410A",
    p:[[-40,1.79],[-30,2.79],[-20,4.06],[-10,5.81],[0,8.13],[10,11.12],[20,14.90],
       [30,19.60],[40,25.30],[50,32.30],[60,40.60]]},
  "R290": {M:44.1, chim:"propane", gwp:3, classe:"A3", lp:0.008,
    tc:96.7, lv0:374.5, cpl:2.42, cpv:1.72, gam:1.13, coul:"vert",
    ou:"pompes à chaleur récentes, vitrines, petites charges",
    p:[[-40,1.11],[-30,1.67],[-20,2.45],[-10,3.45],[0,4.74],[10,6.37],[20,8.36],
       [30,10.79],[40,13.70],[50,17.13],[60,21.20]]},
  "R717": {M:17, chim:"ammoniac", gwp:0, classe:"B2L", lp:0.00035,
    tc:132.3, lv0:1262, cpl:4.61, cpv:2.65, gam:1.31, coul:"chaud",
    ou:"grand froid industriel, patinoires, agroalimentaire",
    p:[[-40,0.72],[-30,1.20],[-20,1.90],[-10,2.91],[0,4.29],[10,6.15],[20,8.57],
       [30,11.67],[40,15.55],[50,20.33],[60,26.10]]},
  "R744": {M:44, chim:"dioxyde de carbone", gwp:1, classe:"A1", lp:0.10,
    tc:31.0, lv0:230.9, cpl:2.42, cpv:1.30, gam:1.29, coul:"encre2",
    ou:"froid commercial, ECS en pompe à chaleur",
    p:[[-40,10.05],[-30,14.28],[-20,19.70],[-10,26.49],[0,34.85],[10,45.02],
       [20,57.29],[30,72.14]]}
};
var NOMS_FLUIDES = ["R134a","R410A","R32","R290","R717","R744"];

/* pression de saturation, interpolee en logarithme : la courbe est
   exponentielle, une interpolation lineaire y perdrait 3 % au milieu du pas */
function psatF(nom, t) {
  var T = FLUIDES[nom].p, i = 0;
  if (t <= T[0][0]) return T[0][1];
  if (t >= T[T.length-1][0]) return T[T.length-1][1];
  while (i < T.length-2 && T[i+1][0] < t) i++;
  var a = T[i], b = T[i+1], f = (t-a[0])/(b[0]-a[0]);
  return Math.exp(Math.log(a[1]) + f*(Math.log(b[1])-Math.log(a[1])));
}
function lvF(nom, t) {
  var f = FLUIDES[nom], Tc = f.tc + 273.15, T = t + 273.15;
  if (T >= Tc) return 0;
  return f.lv0 * Math.pow((Tc-T)/(Tc-273.15), 0.38);
}
function satF(nom, t) {
  var f = FLUIDES[nom], hl = 200 + f.cpl*t;
  return {p:psatF(nom,t), hl:hl, hv:hl + lvF(nom,t)};
}
/* un menu de fluides, monte partout pareil */
function choixFluide(par, etat, cle, calc, libelle) {
  var c = E("div",{"class":"champ"});
  c.appendChild(E("label",{},libelle||"Fluide frigorigène"));
  var v = E("span",{"class":"v"},"");
  c.appendChild(v);
  var s = E("select",{}, NOMS_FLUIDES.map(function(n){
    return '<option value="'+n+'"'+(n===etat[cle]?" selected":"")+'>'+n+
           " — "+FLUIDES[n].chim+"</option>";}).join(""));
  s.addEventListener("change", function(){etat[cle]=this.value;calc();});
  c.appendChild(s);
  par.appendChild(c);
  return function(){v.textContent = FLUIDES[etat[cle]].classe;};
}
/* un curseur, meme geste que partout ailleurs dans le kit */
function curseur(par, maj, etat, lab, cle, min, max, pas, dec, unite, calc, reg) {
  var c = E("div",{"class":"champ"});
  c.appendChild(E("label",{},lab));
  var v = E("span",{"class":"v"},"");
  c.appendChild(v);
  var i = E("input",{type:"range",min:min,max:max,step:pas,value:etat[cle]});
  i.addEventListener("input", function(){etat[cle]=parseFloat(this.value);calc();});
  c.appendChild(i);
  par.appendChild(c);
  /* le registre permet a un scenario de reposer le curseur */
  if (reg) reg[cle] = i;
  maj.push(function(){v.textContent = frs(etat[cle],dec)+unite;});
}

/* ─────────── ce qu'un kilogramme transporte ─────────── */


/* ─────────── une pression, une temperature ─────────── */


/* ─────────── le cycle, en le deformant ─────────── */


/* ─────────── la charge, le local, et la limite ─────────── */


/* ─────────── le circuit et ses organes annexes ─────────── */



/* ─────────── l'embleme d'en-tete : la boucle en petit ─────────── */


/* ═══════════════════════════════════════════ LE FROID, NIVEAU 3 (option B)
   Quatre savoirs que le referentiel place a 0 ou 1 pour l'option C et a 3
   pour l'option FCA : les denrees, les huiles, les cycles, l'impact
   environnemental. Un outil par savoir, plus le protocole de refroidissement.

   Tout s'appuie sur la table FLUIDES deja posee plus haut. Les masses
   molaires y ont ete ajoutees pour le calcul de masse volumique de vapeur,
   dont le retour d'huile depend. */

var DENREES = {
  "Fruits et légumes": {cp1:3.8, cp2:1.9, lf:290, tc:-1.0, resp:45},
  "Viande fraîche":    {cp1:3.2, cp2:1.7, lf:250, tc:-1.7, resp:0},
  "Poisson":           {cp1:3.4, cp2:1.8, lf:275, tc:-2.0, resp:0},
  "Produits laitiers": {cp1:3.3, cp2:1.8, lf:270, tc:-1.5, resp:0},
  "Boissons et eau":   {cp1:4.1, cp2:2.0, lf:330, tc: 0.0, resp:0},
  "Produits secs":     {cp1:1.9, cp2:1.5, lf:0,   tc:-5.0, resp:0}
};
var NOMS_DENREES = ["Fruits et légumes","Viande fraîche","Poisson",
                    "Produits laitiers","Boissons et eau","Produits secs"];

/* un menu quelconque, sur le modele de choixFluide */
function choixListe(par, etat, cle, noms, libelle, calc, legende, reg) {
  var c = E("div",{"class":"champ"});
  c.appendChild(E("label",{},libelle));
  var v = E("span",{"class":"v"},"");
  c.appendChild(v);
  var s = E("select",{}, noms.map(function(n){
    return '<option value="'+n+'"'+(n===etat[cle]?" selected":"")+'>'+n+
           "</option>";}).join(""));
  s.addEventListener("change", function(){etat[cle]=this.value;calc();});
  c.appendChild(s);
  par.appendChild(c);
  if (reg) reg[cle] = s;
  return function(){v.textContent = legende ? legende(etat[cle]) : "";};
}
/* l'air humide, en trois lignes : la chambre froide en a besoin pour son
   poste de renouvellement, et le kit ne l'expose pas ailleurs */
function pvsAir(t){return 610.78*Math.exp(17.27*t/(t+237.3));}
function hAir(t, hr){
  var pv = hr*pvsAir(t), r = 622*pv/(101325-pv);
  return 1.006*t + (r/1000)*(2501+1.83*t);
}

/* ─────────── le bilan d'une chambre froide : sept postes ─────────── */


/* ─────────── le cycle bi-etage, contre le mono-etage ─────────── */


/* ─────────── TEWI : ce que la machine pese vraiment ─────────── */


/* ─────────── le protocole de refroidissement ─────────── */


/* ─────────── le retour d'huile dans une colonne montante ─────────── */


/* ─────────── la chambre froide et ses apports ─────────── */



/* ═══════════════════════════════════════════ LE FROID EN MOUVEMENT
   Deux objets que le site n'avait pas : du temps, et un jeu.

   Tout ce qui precede calcule un regime etabli. Une chambre froide n'y est
   jamais : sa porte s'ouvre, une livraison entre tiede a sept heures, le
   groupe s'arrete pour degivrer. Le premier outil joue une journee en une
   minute, sur un modele a deux noeuds — l'air, qui reagit vite, et la
   marchandise, qui reagit lentement. Le second retourne le diagnostic : au
   lieu de lire une panne, on la devine sur quatre nombres, et l'outil dit
   juste ou faux sans jamais la nommer. */

/* ─────────── une journee de chambre froide ─────────── */


/* ─────────── lire la machine : quatre nombres, une panne ─────────── */
var PANNES=[
  {n:"Machine saine", d:[0,0,0,0],
   lire:"Tout est dans la plage : BP et HP au régime, surchauffe de 5 à 8 K, "+
        "sous-refroidissement de 3 à 6 K."},
  {n:"Manque de fluide", d:[-6,-4,16,-3.5],
   lire:"Peu de liquide au condenseur : le sous-refroidissement disparaît. Peu de "+
        "liquide à l'évaporateur : il s'évapore trop tôt, la surchauffe explose. "+
        "Les deux pressions baissent."},
  {n:"Excès de fluide", d:[1,4,-2,9],
   lire:"Le condenseur se remplit de liquide : le sous-refroidissement grimpe et la "+
        "HP monte. L'évaporateur est mieux alimenté, la surchauffe baisse un peu."},
  {n:"Condenseur encrassé", d:[1,12,0,-2],
   lire:"La chaleur ne part plus : la HP monte fort, le liquide sort à peine "+
        "sous-refroidi, le refoulement chauffe. La BP suit légèrement."},
  {n:"Évaporateur givré", d:[-7,-2,-4,0],
   lire:"L'air ne passe plus : peu de chaleur entre, la BP chute et la surchauffe "+
        "s'effondre. Le liquide menace d'atteindre le compresseur."},
  {n:"Détendeur bloqué ouvert", d:[4,1,-6,0],
   lire:"Trop de fluide envoyé : l'évaporateur est noyé, la surchauffe tombe à zéro "+
        "et la BP monte. Coups de liquide en vue."},
  {n:"Détendeur bouché", d:[-10,-3,18,3],
   lire:"Presque plus de fluide envoyé : la BP s'effondre, la surchauffe explose, et "+
        "le liquide s'accumule au condenseur, sous-refroidissement en hausse."},
  {n:"Incondensables", d:[0,8,0,5],
   lire:"De l'air est pris dans le circuit : il gonfle la HP sans rien condenser. Le "+
        "sous-refroidissement paraît élevé, parce que la température de condensation "+
        "lue sur la pression est fausse."}
];



/* ─────────── l'embleme d'en-tete : vingt-quatre heures ─────────── */



/* ═══════════════════════════════════════════ LA CTA EN MOUVEMENT
   La salle polyvalente du DS n° 8 — 240 m², 960 m³, jusqu'a cent personnes —
   servie par sa double flux : 1,80 kg/s souffles, 0,80 kg/s d'air neuf au
   plus, un recuperateur a plaques, une batterie chaude, une batterie froide,
   un humidificateur a vapeur. Une journee en une minute.

   Le local est un seul noeud thermique, plus une teneur en eau et un CO2. La
   centrale regule sa temperature de soufflage en proportionnel sur l'ambiance,
   module son air neuf sur le CO2, et passe en free-cooling quand l'exterieur
   le permet. Ce qui est paye et ce qui est gratuit sont comptes a part. */

function rsatAir(t){var p=pvsAir(t);return 622*p/(101325-p);}
function rAir(t,hr){var p=hr*pvsAir(t);return 622*p/(101325-p);}
function hAirR(t,r){return 1.006*t+(r/1000)*(2501+1.83*t);}
function hrAir(t,r){return 100*(101325*r/(622+r))/pvsAir(t);}



/* ─────────── lire la centrale : cinq temperatures, une panne ─────────── */
var PANNES_CTA=[
  {n:"Centrale saine", r:[-5,9.4,14.7,29,30,100,120,850],
   lire:"L'air neuf gagne 14 K au récupérateur, le mélange est entre les deux, la "+
        "batterie porte à 29 et le ventilateur ajoute son kelvin. Débit, filtre et CO₂ "+
        "dans la plage."},
  {n:"Filtre colmaté", r:[-5,9.4,14.7,33,34,70,270,850],
   lire:"La perte de charge du filtre a doublé et le débit est tombé. À eau égale, "+
        "la batterie chauffe davantage le peu d'air qui passe : la température monte "+
        "alors que la puissance baisse."},
  {n:"Récupérateur givré ou bipasse ouvert", r:[-5,-4,8.3,29,30,90,120,850],
   lire:"L'air neuf ressort du récupérateur presque à sa température d'entrée : rien "+
        "n'est récupéré. Le mélange est plus froid, la batterie compense, et la "+
        "facture aussi."},
  {n:"Registre d'air neuf bloqué fermé", r:[-5,9.4,19,29,30,100,120,1900],
   lire:"Le mélange est à la température de reprise : tout est recyclé. Le CO₂ monte "+
        "sans que rien ne l'arrête. C'est la panne qu'on ne voit pas au thermomètre "+
        "et que les occupants sentent."},
  {n:"Registre d'air neuf bloqué ouvert", r:[-5,9.4,9.4,29,30,100,120,520],
   lire:"Le mélange est à la température de sortie du récupérateur : tout air neuf, "+
        "aucun recyclage. Le CO₂ est très bas, et la batterie chauffe deux fois plus "+
        "d'air neuf qu'il n'en faut."},
  {n:"Vanne de batterie chaude bloquée fermée", r:[-5,9.4,14.7,14.7,15.7,100,120,850],
   lire:"L'air sort de la batterie comme il y est entré. Le seul écart qui reste est "+
        "le kelvin du ventilateur : la salle se refroidit, régulateur en pleine demande."},
  {n:"Courroie de ventilateur cassée", r:[-5,11,16,16,16,0,0,1600],
   lire:"Plus de débit, plus de perte de charge au filtre. Les sondes lisent un air "+
        "immobile qui s'homogénéise, et le CO₂ grimpe puisque rien n'entre."}
];



/* ─────────── l'embleme d'en-tete : la journee de la salle ─────────── */



/* ═══════════════════════════════════════════ LA CHAUFFERIE EN MOUVEMENT
   Le batiment du fil rouge : une aile de college, 1 500 m², 75 kW de
   radiateurs en 80/60 a la base, une chaudiere a condensation de 90 kW qui
   module, un ballon d'ECS de 1 500 L avec sa boucle, une loi d'eau, un reduit
   de nuit. Une journee en une minute.

   Le batiment est un seul noeud thermique. Les radiateurs emettent en
   puissance 1,3 de l'ecart moyen eau-air ; le retour se deduit du debit,
   constant. Le rendement de la chaudiere depend de la temperature de l'eau
   qui LUI revient — et un bipasse peut la rechauffer, ce qui tue la
   condensation. L'ECS a priorite sur le chauffage. */



/* ─────────── lire la chaufferie : six cadrans, une panne ─────────── */
var PANNES_CH=[
  {n:"Chaufferie saine", r:[0,66,48,19.5,1.6,58],
   lire:"Départ à la loi d'eau, retour 18 K plus bas, bâtiment à la consigne, pression "+
        "à froid dans la plage, ballon chaud. Rien à signaler."},
  {n:"Circulateur de chauffage arrêté", r:[0,68,66,15,1.6,58],
   lire:"Le départ et le retour se rejoignent : rien ne circule. L'eau stagne chaude "+
        "dans la chaudière et le bâtiment refroidit, alors que tout paraît chaud en "+
        "chaufferie."},
  {n:"Vanne trois voies bloquée côté retour", r:[0,34,31,14,1.6,58],
   lire:"Le départ est à peine plus chaud que le retour : la vanne ne prend plus d'eau "+
        "chaude. Le bâtiment refroidit, la chaudière chauffe pour rien."},
  {n:"Sonde extérieure au soleil", r:[8,46,36,17.5,1.6,58],
   lire:"La sonde lit 8 °C par 0 °C réel : la loi d'eau baisse le départ de 20 K, et "+
        "le bâtiment reste 1,5 K sous la consigne tout l'après-midi. Tout fonctionne, "+
        "sur une mesure fausse."},
  {n:"Circuit emboué", r:[0,66,30,16.5,1.6,58],
   lire:"Le débit s'effondre : l'eau met longtemps à traverser les radiateurs et revient "+
        "très froide. Grand écart et bâtiment froid, c'est le contraire d'une bonne "+
        "nouvelle."},
  {n:"Thermostatiques tous fermés", r:[0,66,33,21.5,1.6,58],
   lire:"Même grand écart, mais le bâtiment est chaud : les robinets ont fermé parce "+
        "qu'il y a des apports. Ce n'est pas une panne, c'est la loi d'eau qui est "+
        "trop haute."},
  {n:"Manque d'eau, chaudière en sécurité", r:[0,45,44,16,0.4,58],
   lire:"La pression est tombée sous le bar : le pressostat a coupé le brûleur. Départ "+
        "et retour se refroidissent ensemble, et le bâtiment suit."},
  {n:"Échangeur d'ECS entartré", r:[0,66,48,19.5,1.6,31],
   lire:"Le chauffage est parfait, mais le ballon ne remonte plus : l'échangeur ne passe "+
        "plus la puissance. Les douches du matin finissent froides."}
];



/* ─────────── l'embleme d'en-tete : la journee de la chaufferie ─────────── */


/* ═══════════════════════════════════════════ LE PRODUCTIBLE PHOTOVOLTAIQUE
   Seance 22. Quatre nombres suffisent a un productible, trois de plus a ce
   qu'il vaut : la puissance crete, l'irradiation du plan, le ratio de
   performance, puis la consommation, la part autoconsommee et les deux prix.
   L'outil ne connait pas la courbe horaire : la part autoconsommee est un
   curseur, et c'est voulu — c'est elle que le cours discute. */


/* ═══════════════════════════════════════════ ÉCLAIRER UNE SALLE
   Seance 23. La methode du facteur d'utilisation, telle qu'elle se fait a
   la main : le flux a installer, le nombre de luminaires, la puissance au
   metre carre, et ce que la gestion en retire sur l'annee. */


/* ═══════════════════════════════════════════ DIX MINUTES, CHRONO
   Les automatismes se travaillent en temps limite : c'est la contrainte qui
   fait l'automatisme, pas la difficulte. Le decompte est celui de la classe —
   dix minutes en debut d'heure —, et il se lit de loin pour pouvoir etre
   projete. Rien n'est enregistre : fermer l'onglet remet tout a zero. */


/* ═══════════════════════════════════════════ QUINZE MINUTES DE LECTURE
   Fiche FICHE-LECTURE-DOSSIER. L'epreuve commence par quinze a vingt
   minutes de lecture, et 40 % de ses points sont de l'extraction. Le jeu
   entraine le geste sans le contenu : trois dossiers fictifs, un groupe
   scolaire, une piscine, un immeuble de bureaux, douze consignes chacun, et
   pour chaque consigne deux choix, OU chercher, et QUELLE FORME de reponse
   le verbe demande. Le chronometre tourne. Le retour dit juste ou faux et
   rappelle la methode ; il ne donne jamais de reponse de fond, il n'y en a
   pas. Un menu choisit le dossier, « au hasard » en premier : le hasard
   empeche de refaire toujours le meme, le menu permet d'en imposer un en
   classe. */
var FORMES_LECTURE = [
  "un mot, ou une valeur avec son unité",
  "trois lignes : la donnée, la règle, la conclusion",
  "l'ordre des étapes, numérotées",
  "la formule, les valeurs, le résultat souligné avec son unité",
  "sur le document réponse, au crayon"
];
/* chaque consigne : [texte, document, forme, ce que rappelle le retour] */
var DOSSIERS_LECTURE = [
 {nom:"Groupe scolaire",
  titre:"Groupe scolaire des Terrasses, extension et rénovation énergétique",
  docs:[
    ["DT 1","Présentation du projet, plan de masse, sources d'énergie"],
    ["DT 2","Schéma de principe de la chaufferie, régimes d'eau"],
    ["DT 3","Fiche technique de la chaudière à condensation"],
    ["DT 4","Schéma de la CTA de la salle polyvalente, occupation, débits"],
    ["DT 5","Diagramme de l'air humide"],
    ["DT 6","Extrait de catalogue : sondes de CO₂"],
    ["DT 7","Tableau de points et programme horaire de la GTB"],
    ["DT 8","Index des compteurs et facture annuelle"],
    ["DR 1","Schéma hydraulique à surligner"],
    ["DR 2","Graphe de régulation de la batterie chaude à compléter"]
  ],
  questions:[
    ["Indiquer la puissance nominale de la chaudière et son rendement sur PCI.",2,0,
     "« Indiquer » et une fiche technique : on relève, on n'explique pas."],
    ["Justifier le choix d'une chaudière à condensation au regard du régime d'eau des radiateurs.",1,1,
     "Le régime d'eau est sur le schéma de principe ; « justifier » demande la donnée, la règle et la conclusion."],
    ["Surligner le circuit primaire sur le schéma hydraulique.",8,4,
     "« Surligner » se fait sur le DR, jamais sur la copie."],
    ["Déterminer le débit d'air neuf de la salle polyvalente pour l'occupation prévue.",3,3,
     "L'occupation est une donnée du schéma de la CTA ; « déterminer » est un calcul, avec l'unité."],
    ["Placer le point de soufflage sur le diagramme et lire sa teneur en eau.",4,4,
     "Un point se place sur le diagramme fourni, qui est un document réponse de fait."],
    ["Expliquer pourquoi la sonde de CO₂ est installée sur la reprise et non sur le soufflage.",3,1,
     "« Expliquer » : trois lignes, et la donnée est la position de la sonde sur le schéma de la CTA."],
    ["Choisir la sonde de CO₂ adaptée et relever sa plage de mesure et son signal de sortie.",5,0,
     "Un extrait de catalogue se lit ; « relever » donne des valeurs, pas des phrases."],
    ["Compléter le tableau de points : la nature de chaque point de la CTA.",6,4,
     "Un tableau à compléter est un document réponse, même s'il est dans un DT."],
    ["Calculer la consommation de chauffage de l'année à partir des index.",7,3,
     "Deux index, une différence, une unité : c'est un calcul, et il s'écrit."],
    ["Compléter le graphe de régulation de la batterie chaude avec les valeurs manquantes.",9,4,
     "Un graphe se complète sur le DR, au crayon d'abord."],
    ["Décrire, dans l'ordre, ce que fait la GTB à la relance de 6 h.",6,2,
     "« Décrire » demande un ordre ; le programme horaire est dans le tableau de points de la GTB."],
    ["Citer les deux sources d'énergie du groupe scolaire.",0,0,
     "« Citer » : deux mots, pris dans la présentation du projet."]
  ]},
 {nom:"Piscine",
  titre:"Centre aquatique des Oliviers, construction neuve",
  docs:[
    ["DT 1","Présentation du centre : bassins, fréquentation, températures, énergies"],
    ["DT 2","Schéma de principe de la chaufferie et de la PAC sur air extrait"],
    ["DT 3","Schéma de la CTA de déshumidification du hall, points de fonctionnement"],
    ["DT 4","Diagramme de l'air humide"],
    ["DT 5","Schéma de l'ECS avec récupérateur sur eaux grises"],
    ["DT 6","Extrait de catalogue : vannes trois voies et servomoteurs"],
    ["DT 7","Programme de régulation des deux batteries chaudes"],
    ["DT 8","Consommations mensuelles d'eau et d'énergie, fréquentation"],
    ["DR 1","Schéma de l'ECS à surligner"],
    ["DR 2","Graphe de régulation des deux vannes à compléter"]
  ],
  questions:[
    ["Indiquer la température de l'eau des bassins et celle de l'air du hall.",0,0,
     "« Indiquer » : deux valeurs relevées dans la présentation, avec leur unité."],
    ["Expliquer pourquoi l'air du hall est maintenu deux degrés au-dessus de l'eau des bassins.",0,1,
     "Les deux températures sont dans la présentation ; la règle est l'évaporation des bassins, et « expliquer » veut trois lignes."],
    ["Citer les deux générateurs de la chaufferie.",1,0,
     "« Citer » : deux noms, lus sur le schéma de principe."],
    ["Justifier le choix d'une PAC sur air extrait plutôt qu'un rejet direct de l'air du hall.",1,1,
     "La PAC figure sur le schéma de la chaufferie ; « justifier » demande la donnée, la règle et la conclusion."],
    ["Déterminer la puissance de la batterie froide à partir des enthalpies d'entrée et de sortie.",2,3,
     "Les points de fonctionnement sont sur le schéma de la CTA ; « déterminer » est un calcul, qm × Δh, avec l'unité."],
    ["Placer le point de l'air du hall sur le diagramme et lire son humidité absolue.",3,4,
     "Un point se place sur le diagramme fourni, qui est un document réponse de fait."],
    ["Expliquer l'intérêt du récupérateur sur eaux grises.",4,1,
     "Le récupérateur est sur le schéma de l'ECS ; trois lignes, la donnée, la règle, la conclusion."],
    ["Surligner le parcours de l'eau froide sanitaire, du compteur au ballon, à travers le récupérateur.",8,4,
     "« Surligner » se fait sur le DR, jamais sur la copie."],
    ["Relever le signal de commande et le temps de course du servomoteur retenu.",5,0,
     "Un extrait de catalogue se lit ; « relever » donne des valeurs, pas des phrases."],
    ["Décrire, dans l'ordre, l'enclenchement des deux batteries chaudes quand la température de soufflage baisse.",6,2,
     "« Décrire » demande un ordre ; il est dans le programme de régulation."],
    ["Compléter le graphe de régulation des deux vannes en séquence.",9,4,
     "Un graphe se complète sur le DR, au crayon d'abord."],
    ["Calculer la consommation d'eau par baigneur au mois de juillet.",7,3,
     "La consommation et la fréquentation sont dans le même tableau ; une division, avec son unité."]
  ]},
 {nom:"Immeuble de bureaux",
  titre:"Immeuble Le Belvédère, rénovation lourde de bureaux",
  docs:[
    ["DT 1","Présentation du projet : surfaces, effectif, calendrier des travaux"],
    ["DT 2","Coupe de la façade avant et après isolation par l'extérieur"],
    ["DT 3","Fiches techniques des isolants : conductivité, épaisseur, prix"],
    ["DT 4","Schéma de principe de la sous-station de chauffage urbain"],
    ["DT 5","Contrat de réseau de chaleur : abonnement et prix du kWh"],
    ["DT 6","Implantation des modules photovoltaïques en toiture"],
    ["DT 7","Synoptique de raccordement du photovoltaïque au TGBT"],
    ["DT 8","Index des compteurs de production, d'injection et de soutirage"],
    ["DR 1","Tableau de calcul du coefficient U de la façade"],
    ["DR 2","Synoptique du raccordement à surligner"]
  ],
  questions:[
    ["Indiquer la surface de plancher et l'effectif du bâtiment.",0,0,
     "« Indiquer » : deux valeurs de la présentation, avec leur unité."],
    ["Calculer la résistance thermique du nouvel isolant, à partir de son épaisseur et de sa conductivité.",2,3,
     "L'épaisseur et la conductivité sont sur la fiche de l'isolant ; R = e / λ, avec l'unité."],
    ["Compléter le tableau de calcul du coefficient U de la façade isolée.",8,4,
     "Un tableau à compléter est un document réponse."],
    ["Expliquer pourquoi l'isolation par l'extérieur supprime le pont thermique du plancher.",1,1,
     "La coupe avant et après montre le plancher ; trois lignes, la donnée, la règle, la conclusion."],
    ["Nommer les éléments repérés 1 à 4 sur la sous-station.",3,0,
     "« Nommer » : un mot par repère, lu sur le schéma de principe."],
    ["Décrire le parcours de l'eau du réseau primaire, de l'arrivée au retour.",3,2,
     "« Décrire » demande un ordre ; on suit le schéma dans le sens de l'eau."],
    ["Calculer la part fixe annuelle de la facture de chaleur.",4,3,
     "L'abonnement est dans le contrat ; une multiplication par la puissance souscrite, avec l'unité."],
    ["Relever la puissance crête installée et le nombre d'onduleurs.",5,0,
     "« Relever » : deux valeurs, lues sur l'implantation en toiture."],
    ["Justifier l'orientation est-ouest retenue pour les modules.",5,1,
     "L'orientation est sur l'implantation ; la règle est la forme de la courbe de production sur la journée."],
    ["Expliquer pourquoi l'onduleur s'arrête lors d'une coupure du réseau.",6,1,
     "Le synoptique montre la protection de découplage ; trois lignes, la donnée, la règle, la conclusion."],
    ["Surligner le parcours de l'énergie produite quand la production dépasse la consommation.",9,4,
     "« Surligner » se fait sur le DR, jamais sur la copie."],
    ["Calculer le taux d'autoconsommation du mois de mai à partir des index.",7,3,
     "Trois index, deux différences, un quotient : c'est un calcul, et il s'écrit."]
  ]}
];



/* ═══════════════════════════════════════════ LA CARTE DES PREREQUIS
   Page d'essai. Le site ecrit prerequis.js, la carte des pages publiees et
   des pages que chacune suppose lues. L'outil la dessine en colonnes, une par
   sequence, et la croise avec les marques « lu » du navigateur : on choisit
   la page qu'on va lire, et la carte dit ce qu'il faut avoir lu avant, et ce
   qui ne l'est pas encore. Tout reste dans le navigateur, rien ne sort. */


/* ═══════════════════════════════════════════ UNE SAISON DE POMPE A CHALEUR
   Page d'essai. Une journee ne dit rien d'une pompe a chaleur : son COP
   change avec l'exterieur et avec la temperature qu'on lui demande, sa
   puissance tombe quand il fait froid, et l'appoint prend le relais sous le
   point de bivalence. Il faut une saison, jour par jour, du 1er octobre au
   30 avril. Le batiment est celui du fil rouge : G kW/K, une consigne, des
   apports gratuits qui valent 3 K. La PAC est definie a +7/35 et suit une loi
   simple : la puissance perd 3 % par kelvin sous +7, le COP vaut la moitie de
   Carnot avec un givrage entre -3 et +5 °C. */
var CLIMATS = {
  "Fréjus":     {tm:[17,12,9,8,9,11,14],  base:-5,  amp:7},
  "Lyon":       {tm:[13,7,4,3,4,8,11],    base:-10, amp:9},
  "Lille":      {tm:[12,7,4,3,4,7,10],    base:-9,  amp:8},
  "Strasbourg": {tm:[11,5,2,1,2,6,10],    base:-15, amp:10}
};
var NOMS_CLIMATS = ["Fréjus","Lyon","Lille","Strasbourg"];
var EMETTEURS = {
  "Plancher chauffant 35/28":  {tbase:35, pente:0.67},
  "Radiateurs basse T 55/45":  {tbase:55, pente:1.5},
  "Radiateurs existants 65/55":{tbase:65, pente:1.9}
};
var NOMS_EMETTEURS = ["Plancher chauffant 35/28","Radiateurs basse T 55/45","Radiateurs existants 65/55"];
var MOIS_SAISON = ["oct.","nov.","déc.","janv.","févr.","mars","avr."];
var JOURS_MOIS = [31,30,31,31,28,31,30];



/* ═══════════════════════════════════════════ CE QUE CONTIENT UN KILO D'AIR
   Fiche enthalpie. Deux airs, A et B, chacun par sa temperature et son
   humidite relative. Pour chacun, h en trois morceaux : l'air sec (1,006 θ),
   la vaporisation de son eau (2 501 r), et la vapeur rechauffee (1,83 θ r).
   Puis la difference, ce qu'elle vaut en puissance pour un debit, et ce que
   le thermometre seul en aurait dit : c'est tout l'argument de la fiche. */




/* ─────────── ou passent les 100 unites de combustible ─────────── */


/* ─────────── la loi d'emission, et la droite qu'on croit suivre ─────────── */


/* ─────────── simple flux et double flux ─────────── */


/* ─────────── boucle ouverte et boucle fermee ─────────── */


/* ─────────── bitube, monotube, pieuvre ─────────── */


/* ─────────── retour direct contre retour inverse ─────────── */



/* ═══════════════════════════════════════════════════ SYMBOLES HYDRAULIQUES
   Chaque symbole se dessine dans un cadre 64 x 44, trait de 2. Les
   conventions suivies sont celles des schemas de principe des sujets. */
function symbole(nom, coul){
  var s=S("svg",{viewBox:"0 0 64 44","class":"sym"});
  var c=coul||"encre";
  function L(x1,y1,x2,y2,ep){s.appendChild(S("line",{x1:x1,y1:y1,x2:x2,y2:y2,
    stroke:V(c),"stroke-width":ep||2,"stroke-linecap":"round"}));}
  function P(d,fill){s.appendChild(S("path",{d:d,fill:fill?V(c):"none",
    stroke:V(c),"stroke-width":2,"stroke-linejoin":"round"}));}
  function C2(cx,cy,r,fill){s.appendChild(S("circle",{cx:cx,cy:cy,r:r,
    fill:fill?V(c):V("carte"),stroke:V(c),"stroke-width":2}));}
  function R2(x,y,l,h,fill){s.appendChild(S("rect",{x:x,y:y,width:l,height:h,
    fill:fill?V(c):V("carte"),stroke:V(c),"stroke-width":2}));}
  function T2(x,y,txt,t2){s.appendChild(S("text",{x:x,y:y,"text-anchor":"middle",
    "class":"s-sym"},txt));}
  var noeud=22;                                   /* demi-largeur du papillon */
  function papillon(){P("M10,10L10,34L32,22Z");P("M54,10L54,34L32,22Z");}
  var d={
   "arret":function(){L(0,22,10,22);L(54,22,64,22);papillon();L(32,22,32,8);L(24,8,40,8);},
   "reglage":function(){L(0,22,10,22);L(54,22,64,22);papillon();L(32,22,32,8);
     L(24,8,40,8);L(20,34,44,6,2);},
   "v2v":function(){L(0,22,10,22);L(54,22,64,22);papillon();L(32,22,32,14);
     R2(22,2,20,12);},
   "v3v":function(){L(0,22,10,22);L(54,22,64,22);L(32,44,32,34);
     P("M10,10L10,34L30,22Z");P("M54,10L54,34L34,22Z");
     P("M22,44L42,44L32,32Z");R2(22,0,20,12);L(32,12,32,18);},
   "clapet":function(){L(0,22,10,22);L(54,22,64,22);P("M10,10L10,34L32,22Z",true);
     L(32,8,32,36,2.5);},
   "soupape":function(){L(0,22,10,22);L(32,22,32,10);L(20,10,44,10);
     P("M10,10L10,34L32,22Z");L(32,10,44,2);L(38,4,46,8);L(54,22,64,22);
     P("M54,10L54,34L32,22Z");},
   "pompe":function(){L(0,22,8,22);L(56,22,64,22);C2(32,22,15);
     P("M25,13L45,22L25,31Z",true);},
   "echangeur":function(){R2(10,6,44,32);
     P("M16,10L26,22L16,34");P("M28,10L38,22L28,34");P("M40,10L50,22L40,34");},
   "vase":function(){L(32,44,32,34);P("M12,34L12,16A20,10 0 0 1 52,16L52,34Z");
     L(12,25,52,25,2);},
   "mano":function(){L(32,44,32,36);C2(32,22,14);T2(32,28,"P");},
   "sonde":function(){L(32,44,32,36);C2(32,22,14);T2(32,28,"T");},
   "filtre":function(){L(0,22,14,22);L(50,22,64,22);R2(14,10,36,24);
     L(20,10,20,34,1.5);L(26,10,26,34,1.5);L(32,10,32,34,1.5);L(38,10,38,34,1.5);
     L(44,10,44,34,1.5);},
   "purgeur":function(){L(32,44,32,30);C2(32,20,11);L(32,9,32,3);L(26,3,38,3);},
   "compteur":function(){L(0,22,12,22);L(52,22,64,22);R2(12,8,40,28);
     T2(32,28,"kWh");},
   "disconnecteur":function(){L(0,22,8,22);L(56,22,64,22);R2(8,10,48,24);
     L(24,10,24,34,1.5);L(40,10,40,34,1.5);T2(16,28,"B");T2(48,28,"A");}
  };
  (d[nom]||function(){})();
  return s;
}

var ORGANES_HYDRO=[
 {k:"echangeur",n:"Échangeur à plaques",rep:1,
  r:"Il transfère la chaleur du réseau urbain au circuit du bâtiment <b>sans que "+
    "les deux eaux se mélangent</b>. C'est la frontière entre le primaire, qui "+
    "appartient au fournisseur, et le secondaire, qui appartient au bâtiment.",
  ou:"Au cœur de la sous-station, entre primaire et secondaire.",
  ep:"Calculer sa puissance, tracer les deux circuits sur un DR, ou justifier "+
     "pourquoi les fluides ne se mélangent pas."},
 {k:"pompe",n:"Circulateur",rep:2,
  r:"Il met l'eau en mouvement et <b>fournit la pression que le réseau consomme</b> "+
    "en pertes de charge. Il ne crée pas de chaleur : il transporte.",
  ou:"Sur le départ ou le retour du secondaire, un par circuit.",
  ep:"Lire une courbe caractéristique, choisir une vitesse, trouver le point de "+
     "fonctionnement."},
 {k:"v3v",n:"Vanne 3 voies motorisée",rep:3,
  r:"Elle <b>mélange</b> deux eaux à températures différentes, ou <b>répartit</b> "+
    "un débit entre deux branches. C'est l'organe de régulation du départ : "+
    "l'automate lui donne un ordre, elle agit sur l'énergie.",
  ou:"En sortie de production, sur le départ du circuit de chauffage.",
  ep:"Identifier sa fonction — mélange ou répartition —, la placer sur un schéma, "+
     "expliquer le rôle du moteur."},
 {k:"v2v",n:"Vanne 2 voies motorisée",rep:4,
  r:"Elle <b>étrangle</b> un débit sans le dériver. En se fermant, elle augmente "+
    "la résistance du circuit et fait remonter la pression ailleurs — d'où la "+
    "nécessité d'un circulateur à pression variable.",
  ou:"Sur un émetteur, un aérotherme, une batterie de CTA.",
  ep:"La distinguer de la V3V, et en déduire l'effet sur le débit total."},
 {k:"arret",n:"Vanne d'arrêt",rep:5,
  r:"Elle isole une portion du circuit pour l'intervention. <b>Elle ne règle "+
    "rien</b> : elle est ouverte ou fermée.",
  ou:"De part et d'autre de tout organe démontable.",
  ep:"La repérer, et justifier pourquoi on en place deux autour d'une pompe."},
 {k:"reglage",n:"Vanne d'équilibrage",rep:6,
  r:"Elle ajoute <b>volontairement</b> de la perte de charge à une branche trop "+
    "favorisée, pour que chaque émetteur reçoive son débit. Elle porte une "+
    "graduation et se règle une fois pour toutes.",
  ou:"Sur le retour de chaque branche, ou de chaque colonne.",
  ep:"Expliquer l'équilibrage, lire un procès-verbal de réglage."},
 {k:"clapet",n:"Clapet anti-retour",rep:7,
  r:"Il ne laisse passer l'eau que <b>dans un sens</b>. Il empêche une pompe à "+
    "l'arrêt d'être traversée à l'envers par une pompe voisine.",
  ou:"En aval d'un circulateur, ou sur un remplissage.",
  ep:"Repérer le sens de circulation qu'il impose."},
 {k:"soupape",n:"Soupape de sécurité",rep:8,
  r:"Elle <b>s'ouvre toute seule</b> si la pression dépasse son tarage — 3 bar en "+
    "chauffage — et évacue de l'eau jusqu'à ce que la pression redescende. C'est "+
    "un organe de sécurité, jamais de régulation.",
  ou:"Sur la production, sans aucune vanne entre elle et le générateur.",
  ep:"Justifier son tarage, expliquer pourquoi rien ne doit pouvoir l'isoler."},
 {k:"vase",n:"Vase d'expansion",rep:9,
  r:"L'eau se dilate en chauffant. Le vase <b>absorbe ce volume</b> dans une "+
    "membrane comprimant un coussin d'azote. Sans lui, la pression monterait "+
    "jusqu'au déclenchement de la soupape à chaque chauffe.",
  ou:"Sur le retour, au plus près du générateur.",
  ep:"Calculer son volume à partir de la dilatation, ou expliquer son rôle."},
 {k:"mano",n:"Manomètre",rep:10,
  r:"Il indique la pression du circuit. Une pression qui baisse lentement signale "+
    "une fuite ; une pression qui monte à chaud signale un vase hors service.",
  ou:"Sur la production, près du remplissage.",
  ep:"Lire une valeur et la comparer à une consigne."},
 {k:"sonde",n:"Sonde de température",rep:11,
  r:"Elle <b>acquiert</b> l'information dont la régulation a besoin. Elle "+
    "appartient à la chaîne d'information, pas à la chaîne d'énergie.",
  ou:"Sur le départ, le retour, en ambiance, et en extérieur.",
  ep:"La placer dans la bonne chaîne, ou justifier son emplacement."},
 {k:"filtre",n:"Filtre — pot à boue",rep:12,
  r:"Il retient les particules qui useraient la pompe et boucheraient les "+
    "émetteurs. <b>Il s'encrasse, donc il se nettoie</b> : un filtre colmaté "+
    "ajoute une perte de charge considérable.",
  ou:"En amont du circulateur et de l'échangeur.",
  ep:"Expliquer sa présence, ou l'effet de son encrassement sur le débit."},
 {k:"purgeur",n:"Purgeur d'air",rep:13,
  r:"L'air dissous se rassemble aux points hauts et <b>bloque la circulation</b>. "+
    "Le purgeur l'évacue automatiquement.",
  ou:"À chaque point haut du réseau.",
  ep:"Justifier son emplacement — c'est presque toujours « au point haut »."},
 {k:"compteur",n:"Compteur d'énergie",rep:14,
  r:"Il mesure le débit et l'écart de température, et en déduit l'énergie "+
    "livrée. C'est lui qui fait la facture du réseau de chaleur.",
  ou:"Sur le primaire, côté fournisseur.",
  ep:"Retrouver l'énergie à partir de P = Q × 1 163 × ΔT."},
 {k:"disconnecteur",n:"Disconnecteur",rep:15,
  r:"Il empêche l'eau du circuit de chauffage de <b>revenir dans le réseau "+
    "d'eau potable</b>. C'est une obligation sanitaire sur tout remplissage.",
  ou:"Sur la conduite de remplissage, entre l'eau de ville et le circuit.",
  ep:"Le nommer et donner sa fonction sanitaire."}
];



/* ─────────── le schema de principe d'une sous-station ─────────── */
/* ─────────────────────────────────────────────── le cycle sur le diagramme
   enthalpique (log p, h) — dit « diagramme de Mollier » en froid.
   La courbe de saturation est SCHEMATIQUE : elle a la forme d'un vrai
   diagramme — liquide raide, vapeur presque plate, point critique au
   sommet — mais elle n'est celle d'aucun fluide. Les enthalpies portees
   sont celles de l'exemple traite dans la page, et elles bouclent :
   qk = qo + w. Un schema qui ne bouclerait pas apprendrait a ne pas
   verifier. */
/* Deux noms, un seul dessin. « cycle-mollier » porte les valeurs lues ;
   « cycle-mollier-muet » ne porte que les symboles — c'est la version
   qui accompagne une question, ou le diagramme donnerait la reponse. */
function dessineMollier(el,chiffre){
  var W=740,H=440,X0=64,X1=690,Y0=44,Y1=336;
  var HMIN=190,HMAX=500,PMIN=1,PMAX=60;          /* kJ/kg et bar absolus */
  var H1=425,H2=460,H3=270,BP=9.3,HP=30;         /* l'exemple de la page */

  var svg=S("svg",{viewBox:"0 0 "+W+" "+H,role:"img",
    "aria-label":"Cycle frigorifique sur le diagramme enthalpique"});
  el.appendChild(svg);

  function px(h){return X0+(h-HMIN)/(HMAX-HMIN)*(X1-X0);}
  function u(p){return (Math.log(p)-Math.log(PMIN))/(Math.log(PMAX)-Math.log(PMIN));}
  function py(p){return Y1-u(p)*(Y1-Y0);}         /* l'axe des pressions est LOG */
  /* La cloche est SCHEMATIQUE — forme d'un vrai diagramme, fluide d'aucun.
     Les exposants sont cales pour que les quatre points du cycle tombent
     dans la bonne zone : 3 en liquide sous-refroidi, 4 sous la cloche,
     1 et 2 en vapeur surchauffee. Un schema ou le point 3 serait dans le
     melange enseignerait le contraire de ce que dit le texte. */
  function hL(p){return 200+140*Math.pow(u(p),2.692);}
  function hV(p){return 430- 90*Math.pow(u(p),2.952);}

  /* -- la grille */
  [1,2,3,5,10,20,30,60].forEach(function(p){
    svg.appendChild(S("line",{x1:X0,y1:py(p),x2:X1,y2:py(p),stroke:V("trait2"),
      "stroke-width":"1"}));
    svg.appendChild(S("text",{x:X0-9,y:py(p)+4,"text-anchor":"end","class":"s-pet"},
      String(p)));
  });
  for(var h=200;h<=HMAX;h+=50){
    svg.appendChild(S("line",{x1:px(h),y1:Y0,x2:px(h),y2:Y1,stroke:V("trait2"),
      "stroke-width":"1"}));
    svg.appendChild(S("text",{x:px(h),y:Y1+18,"text-anchor":"middle","class":"s-pet"},
      String(h)));
  }
  svg.appendChild(S("text",{x:(X0+X1)/2,y:Y1+60,"text-anchor":"middle","class":"s-pet"},
    "enthalpie massique h  (kJ/kg)"));
  var lab=S("text",{x:0,y:0,"text-anchor":"middle","class":"s-pet",
    transform:"translate(17,"+((Y0+Y1)/2)+") rotate(-90)"});
  lab.textContent="pression absolue p  (bar, échelle log)";
  svg.appendChild(lab);

  /* -- la courbe de saturation, en une seule cloche */
  var d="",p,k=0;
  for(p=PMIN;p<=PMAX;p*=1.05) d+=(k++?"L":"M")+px(hL(p)).toFixed(1)+","+py(p).toFixed(1);
  d+="L"+px(340).toFixed(1)+","+py(PMAX).toFixed(1);
  for(p=PMAX;p>=PMIN;p/=1.05) d+="L"+px(hV(p)).toFixed(1)+","+py(p).toFixed(1);
  svg.appendChild(S("path",{d:d,fill:"none",stroke:V("froid"),"stroke-width":"2.5"}));
  svg.appendChild(S("circle",{cx:px(340),cy:py(PMAX),r:4,fill:V("froid")}));
  svg.appendChild(S("text",{x:px(340),y:py(PMAX)-12,"text-anchor":"middle",
    "class":"s-pet",fill:V("froid")},"point critique"));

  /* -- les trois zones : la premiere lecture a savoir faire */
  [[224,2.4,"liquide"],[330,2.4,"mélange liquide + vapeur"],[458,2.4,"vapeur surchauffée"]]
    .forEach(function(z){
      svg.appendChild(S("text",{x:px(z[0]),y:py(z[1]),"text-anchor":"middle",
        "class":"s-pet",fill:V("encre2")},z[2]));
    });

  /* -- le cycle : 1 aspiration, 2 refoulement, 3 liquide, 4 apres detente */
  var P1=[px(H1),py(BP)],P2=[px(H2),py(HP)],P3=[px(H3),py(HP)],P4=[px(H3),py(BP)];
  function trait(a,b,coul){
    svg.appendChild(S("line",{x1:a[0],y1:a[1],x2:b[0],y2:b[1],stroke:V(coul),
      "stroke-width":"3.5","stroke-linecap":"round"}));
  }
  trait(P4,P1,"froid");            /* evaporation  */
  trait(P1,P2,"chaud");            /* compression  */
  trait(P2,P3,"chaud");            /* condensation */
  trait(P3,P4,"encre");            /* detente      */

  /* Chaque point porte SON enthalpie. Ce n'est pas une reponse — les
     questions demandent des differences et des rapports — et sans elle on ne
     lit qu'a la graduation de 50 kJ/kg, ce qui interdit tout calcul juste. */
  [[P1,"1",9,16,H1,10,34],[P2,"2",9,-9,H2,10,-26],
   [P3,"3",-16,-9,H3,-18,20],[P4,"4",-16,16,H3,-18,34]].forEach(function(q){
    svg.appendChild(S("circle",{cx:q[0][0],cy:q[0][1],r:5.5,fill:V("carte"),
      stroke:V("encre"),"stroke-width":"2.5"}));
    svg.appendChild(S("text",{x:q[0][0]+q[2],y:q[0][1]+q[3],"class":"s-nom"},q[1]));
    svg.appendChild(S("text",{x:q[0][0]+q[5],y:q[0][1]+q[6],"class":"s-pet",
      "text-anchor":q[5]<0?"end":"start",fill:V("encre2")},q[4]+" kJ/kg"));
  });

  /* -- ce que chaque segment vaut. Les deux mesures horizontales sont posees
        LOIN l'une de l'autre : cote a cote, elles se chevauchaient. */
  function mesure(x1,x2,y,texte,coul,dessous){
    svg.appendChild(S("line",{x1:x1,y1:y,x2:x2,y2:y,stroke:V(coul),"stroke-width":"1.5",
      "stroke-dasharray":"5 4"}));
    svg.appendChild(S("text",{x:(x1+x2)/2,y:y+(dessous?15:-7),"text-anchor":"middle",
      "class":"s-pet",fill:V(coul)},texte));
  }
  mesure(px(H3),px(H1),Y1-16,chiffre?"qo = h1 − h4 = 155 kJ/kg":"qo","froid",false);
  mesure(px(H3),px(H2),py(HP)-26,chiffre?"qk = h2 − h3 = 190 kJ/kg":"qk","chaud",false);
  svg.appendChild(S("text",{x:(P1[0]+P2[0])/2+30,y:(P1[1]+P2[1])/2,"class":"s-pet",
    fill:V("chaud")},chiffre?"w = h2 − h1 = 35":"w"));

  /* -- la detente est VERTICALE : c'est la lecture qui surprend le plus */
  svg.appendChild(S("text",{x:px(H3)-12,y:(py(BP)+py(HP))/2-4,"text-anchor":"end",
    "class":"s-pet",fill:V("encre2")},"détente"));
  if(chiffre)svg.appendChild(S("text",{x:px(H3)-12,y:(py(BP)+py(HP))/2+12,
    "text-anchor":"end","class":"s-pet",fill:V("encre2")},"h constante"));

  if(!chiffre)return;
  var lect=E("div",{"class":"res",style:"margin-top:12px"});
  lect.innerHTML="<strong>qk = qo + w</strong> — 190 = 155 + 35. Le condenseur évacue "+
    "tout ce que l'évaporateur a pris, <em>plus</em> le travail du compresseur. "+
    "Un relevé qui ne boucle pas est un relevé faux.<br>"+
    "<strong>EER = qo / w = 4,43</strong> et <strong>COP = qk / w = 5,43</strong> : "+
    "exactement une unité d'écart, et c'est la même relation que Q<sub>chaud</sub> = "+
    "Q<sub>froid</sub> + W, lue sur le diagramme.";
  el.appendChild(lect);
}





/* ═══════ Quatre schemas pour les fiches d'automatismes de la 2de ═══════
   Ajoutes le 9 septembre 2026. Comme les vingt et un precedents, ils ne
   parlent d'aucun metier : c'est ce qui les rend reutilisables ailleurs. */

/* ─────────── un repere orthogonal, et quatre points a lire ─────────── */


/* ─────────── lire une image, puis un antecedent, sur la meme courbe ─────────── */


/* ─────────── les quatre crochets, sur la meme portion de droite ─────────── */


/* ─────────── reconnaitre Pythagore, reconnaitre Thales ─────────── */


/* ─────────── la pile zinc-cuivre, et le chemin des electrons ───────────
   Ajoute le 18 septembre 2026 pour la Tle CTRM, sequence 2. Il sert aussi
   en sequence 9 : la corrosion est la meme reaction, sans le fil. */


/* ─────────── ce que pese l'energie, pour un meme besoin ───────────
   Une seule mesure, donc une seule teinte, plus l'accent sur la ligne qui
   porte le message. Les barres sont A L'ECHELLE : celle du gazole est
   presque invisible, et c'est exactement ce qu'il faut voir. */


/* ─────────── le banc de l'activite 2, dans les deux sens ───────────
   L'accumulateur est A LA MEME PLACE dans les deux panneaux — montant de
   droite. Seule la fleche change, et c'est tout le propos de la seance.
   Les valeurs sont celles d'un NiMH format AA : 1,2 V nominal, 2 000 mA·h. */


/* ─────────── la decharge complete, d'ou sortent Q et E ───────────
   Le prolongement du banc de la seance 2, a courant constant. Les nombres
   sont ceux de l'accumulateur AA, JAMAIS ceux des tableaux i) et j) du
   polycopie : la fiche montre comment on lit, elle ne rend pas la copie. */


/* ─────────── peser l'accumulateur, puis remonter au camion ───────────
   Une manip de trente secondes qui ancre la table de l'activite 4 : le
   W·h/kg cesse d'etre un nombre lu quelque part. */


/* ══════════════════════════════════ SCHEMAS — Tle CTRM, sequence 3
   Vecteurs dans l'espace. La convention d'axes est celle de la figure du
   polycopie, fig3-espace : x longueur vers la DROITE, y largeur en fuyante
   vers le haut-droit, z hauteur vers le HAUT. Un schema web qui inverserait
   deux axes ferait douter de la feuille, pas de lui-meme. */

/* ─────────── la caisse, et trois nombres pour un point ─────────── */


/* ─────────── les deux sangles, et pourquoi 2 + 2 ne font pas 4 ───────────
   A, B et S ont tous x = 4 : la figure est PLANE, et ce dessin en (y ; z)
   n'est donc pas une projection, c'est la vraie forme. */


/* ─────────── colineaires : la meme droite, pas le meme sens ─────────── */


/* ─────────── ce que dit la troisieme coordonnee ───────────
   Les deux panneaux sont vus DE COTE, et c'est indispensable : une vue de
   dessus ne peut pas montrer que z vaut zero, puisque tout y parait
   horizontal. Le premier essai la prenait, et ne demontrait rien. */


/* ══════════════════════════════ SCHEMAS — Tle CTRM, sequence 1
   Ajustement d'un nuage. Ce sont des GRAPHIQUES, pas des dessins, et deux
   regles les tiennent :

   — deux teintes de serie au maximum par graphique, « chaud » et « froid ».
     Eprouve au validateur : ecart 24,3 en vision normale et 18,7 en
     protanopie. « encre2 » est un GRIS — chroma 0,007, ecart 12,8 de
     « froid » — il ne peut donc pas porter une troisieme courbe. C'est la
     raison pour laquelle le comparatif a quatre modeles est fait en petits
     multiples : un seul trace par panneau, et le probleme disparait.

   — l'identite ne repose jamais sur la seule couleur : chaque courbe porte
     son nom en bout de trace, et le modele retenu porte le mot RETENU. */

/* nuage + courbe : helpers communs aux quatre */
function _pts(svg,X,Y,fx,fy,r){
  X.forEach(function(x,i){
    svg.appendChild(S("circle",{cx:fx(x),cy:fy(Y[i]),r:r||"3.6",fill:V("encre")}));
  });
}
function _courbe(svg,f,x0,x1,fx,fy,coul,ep,ymin,ymax,tirets){
  var d="",n=90,dessus=false;
  for(var k=0;k<=n;k++){
    var x=x0+(x1-x0)*k/n, y=f(x);
    if(y<ymin||y>ymax){ dessus=false; continue; }
    d+=(dessus?" L ":" M ")+fx(x).toFixed(1)+" "+fy(y).toFixed(1);
    dessus=true;
  }
  var at={d:d,fill:"none",stroke:V(coul),"stroke-width":ep,"stroke-linecap":"round"};
  if(tirets)at["stroke-dasharray"]=tirets;
  svg.appendChild(S("path",at));
}

/* ─────────── le meme nuage, les quatre modeles ─────────── */


/* ─────────── deux modeles que le R2 ne separe pas ─────────── */


/* ─────────── jusqu'ou les modeles restent d'accord ─────────── */


/* ─────────── le cafe : deux R2 excellents, une reponse absurde ─────────── */






/* ─────────── CAP · ce qu'une multiprise accepte ─────────── */


/* ─────────── CAP · l'ordre dans lequel les choses arrivent ─────────── */


/* ─────────── CAP · un chemin ou plusieurs ─────────── */


/* ─────────── CAP · ou se branchent les deux appareils ─────────── */


/* ─────────── CAP · la droite U-I et le quotient qui ne bouge pas ─────────── */




/* ─────────── CAP · ce qui rentre encore quand le radiateur tourne ─────────── */


/* ─────────── CAP · trouver l'ampoule grillee au voltmetre ─────────── */


/* ─────────── CAP · faire le tour ou couvrir la surface ─────────── */


/* ─────────── CAP · la diagonale, et les pouces ─────────── */


/* ─────────── CAP · ce que fait le courant selon son intensite ─────────── */


/* ─────────── CAP · la conversion decide du resultat ─────────── */




/* ─────────── CAP · deux appareils, deux protections ─────────── */


/* ─────────── CAP · un chiffre plutot qu'un adjectif ─────────── */


/* ─────────── CAP · c'est le plus faible qui fixe la limite ─────────── */


/* ─────────── CAP · proportionnel, ou pas ─────────── */


/* ─────────── CAP · le meme tableau, deux metiers ─────────── */


/* ─────────── CAP · decouper un local en rectangles ─────────── */


/* ─────────── CAP · l'angle droit au metre ruban ─────────── */




/* ─────────── 2DE CIEL · le facteur huit entre bits et octets ─────────── */


/* ─────────── 2DE CIEL · qui protege qui ─────────── */


/* ─────────── 2DE CIEL · jusqu'ou va la TBTS ─────────── */


/* ─────────── 2DE CIEL · la tension se partage ─────────── */


/* ─────────── 2DE CIEL · la resistance de la LED ─────────── */



/* ─────────── CAP · la puissance ne suffit pas ─────────── */


/* ─────────── CAP · deux offres qui se croisent ─────────── */


/* ─────────── TLE · les pertes en ligne, sous deux tensions ─────────── */


/* ─────────── TLE · le transformateur et ses deux bobines ─────────── */


/* ─────────── TLE · par ou la chaleur entre dans la remorque ─────────── */


/* ─────────── TLE · la caisse qui se rechauffe : droite ou courbe ─────────── */


/* ─────────── TLE · retirer toujours pareil, ou multiplier toujours pareil ─────────── */


/* ─────────── TLE · moins 20 %, puis plus 20 % ─────────── */


/* ─────────── TLE · le verre, piege a infrarouge ─────────── */


/* ─────────── TLE · du gazole au CO2, en quatre etapes ─────────── */


/* ─────────── TLE · la suite ne connait que les annees, la fonction tous les instants ─────────── */


/* ─────────── TLE · l'echelle de pH, un facteur dix par unite ─────────── */


/* ─────────── TLE · qui donne ses electrons a qui ─────────── */


/* ─────────── TLE · passivation ou rouille ─────────── */


/* ─────────── TLE · de la tole au bac ─────────── */


/* ─────────── TLE · le signe de la derivee, et le maximum ─────────── */


/* ─────────── TLE · poids et poussee ─────────── */


/* ─────────── TLE · l'arbre de la tournee ─────────── */


/* ─────────── TLE · au moins une fois ─────────── */


/* ─────────── TLE · la reflexion totale dans une fibre ─────────── */


/* ─────────── TLE · repartir son temps selon les points ─────────── */


/* ─────────── 2DE CIEL · une equation est une balance ─────────── */


/* ─────────── 2DE CIEL · de l'inequation a la reponse concrete ─────────── */


/* ─────────── 2DE CIEL · detecteurs piece par piece ─────────── */


/* ─────────── 2DE CIEL · la marge du generateur de brouillard ─────────── */


/* ─────────── 2DE CIEL · trois capteurs, trois formes de courbe ─────────── */


/* ─────────── 2DE CIEL · le transmetteur 4-20 mA ─────────── */


/* ─────────── 2DE CIEL · deux abonnements, un point de croisement ─────────── */


/* ─────────── 2DE CIEL · f(x) + k : monter, jamais glisser ─────────── */


/* ─────────── 2DE CIEL · plexiglas vers air : trois incidences ─────────── */


/* ─────────── 2DE CIEL · le spectre, du visible a la fibre ─────────── */


/* ─────────── 2DE CIEL · periode courte, son aigu ─────────── */


/* ─────────── 2DE CIEL · l'echelle des decibels ─────────── */


/* ─────────── 2DE CIEL · trois reglages, un poids ─────────── */


/* ─────────── 2DE CIEL · lire un enregistrement de positions ─────────── */


/* ─────────── 2DE CIEL · la vitesse du bord d'une pale ─────────── */


/* ─────────── 2DE CIEL · deux forces qui s'equilibrent ─────────── */


/* ─────────── 2DE CIEL · la dilution au dixieme ─────────── */


/* ─────────── 2DE CIEL · le pH qui monte vers 7 ─────────── */


/* ─────────── 2DE CIEL · trois tubes, deux couleurs ─────────── */


/* ─────────── 2DE CIEL · deux fournisseurs, meme moyenne ─────────── */


/* ─────────── 2DE CIEL · deux pourcentages, deux denominateurs ─────────── */


/* ─────────── 2DE CIEL · la fluctuation selon la taille ─────────── */


/* ─────────── 2DE CIEL · deux bornes, meme moyenne, deux ecarts types ─────────── */


/* ─────────── 2DE CIEL · regrouper, c'est remplacer par le centre ─────────── */


/* ─────────── CAP · la même eau sucrée dans trois récipients ─────────── */


/* ─────────── CAP · diluer, c'est completer jusqu'au trait ─────────── */


/* ─────────── CAP · comparer des newtons a des newtons ─────────── */


/* ─────────── CAP · repartir la charge sur deux tablettes ─────────── */


/* ─────────── CAP · la fluctuation, 60 lancers contre 600 ─────────── */


/* ─────────── CAP · la machine a pinces, sur cent parties ─────────── */


/* ─────────── CAP co-intervention · la verrerie de la paillasse ─────────── */


/* ─────────── CAP co-intervention · des grammes par litre ─────────── */


/* ─────────── CAP co-intervention · repos ou mouvement ─────────── */


/* ─────────── CAP co-intervention · deux forces, trois conditions ─────────── */


/* ─────────── CAP co-intervention · l'echelle des chances ─────────── */


/* ─────────── CAP co-intervention · le garage et sa goulotte ─────────── */


/* ═══════════ CAP · cours V2, séquences 5, 6 et 7 — lot A ═══════════ */

/* ─────────── CAP · deux échelles de température ─────────── */


/* ─────────── CAP · la chaleur va du chaud vers le froid ─────────── */


/* ─────────── CAP · isoler ralentit la perte ─────────── */


/* ─────────── CAP · les angles depuis la normale ─────────── */


/* ─────────── CAP · un pas de côté ─────────── */


/* ─────────── CAP · réflexion ou réfraction ─────────── */


/* ─────────── CAP · grave ou aigu, fort ou faible ─────────── */


/* ─────────── CAP · trois décibels de plus, la moitié du temps ─────────── */


/* ─────────── CAP · le casque fermé dans le métro ─────────── */


/* ═══════════════════════════════════════════════════════════════════
   CAP · co-intervention, sequences 4 a 7 (creneaux J11 a J20)
   Lot de schemas a verser dans kit.js, apres les schemas CAP existants.
   ═══════════════════════════════════════════════════════════════════ */

/* ─────────── CAP co-int · S4 · la tension est le coefficient ─────────── */


/* ─────────── CAP co-int · S4 · une question, trois reponses ─────────── */


/* ─────────── CAP co-int · S5 · l'infrarouge lit une surface ─────────── */


/* ─────────── CAP co-int · S5 · deux temperatures qui se rejoignent ─────────── */


/* ─────────── CAP co-int · S5 · image ou antecedent : le geste ─────────── */


/* ─────────── CAP co-int · S6 · le rayon qui rebondit, le rayon qui plie ─────────── */


/* ─────────── CAP co-int · S6 · le spectre et ses deux voisins invisibles ─────────── */


/* ─────────── CAP co-int · S6 · trois lampes sur un ecran ─────────── */


/* ─────────── CAP co-int · S7 · grave ou aigu : compter les vibrations ─────────── */


/* ─────────── CAP co-int · S7 · ou agit chaque protection ─────────── */


/* ─────────── CAP co-int · S7 · la moyenne egalise ─────────── */


/* --------- dispersion d'une serie de releves ---------
   Ajoute le 3 septembre 2026, sequence 1 de maths-PC. C'est la statistique
   descriptive du CCF de mathematiques, sur des donnees de chaufferie. */


/* ═══════════════════════════════════════════════════ montage */
/* ═══════════ OUTILS DE DOMOTIQUE, 1re année (16 septembre 2026) ═══════════
   Chaque outil ci-dessous suit le patron du kit : OUTILS["nom"]={titre, intro,
   monte(d)}. Les deux repères qui suivent servent d'ancres d'insertion. */
/* ═══════════ réseau et bus : quatre outils de domotique 1re année ═══════════
   ligne-knx (A1, A4, A5, B4), adresses-groupe (A11), plan-ip (A6) et
   budget-poe (A6, A8). Les aides communes sont préfixées rb pour ne pas entrer
   en collision avec le reste du kit. Même patron que partout : titre, intro,
   monte(d). Rien n'est enregistré, rien n'est chargé. */
function rbChapeau(txt){
  return E("div",{style:"font-family:'Bricolage Grotesque',sans-serif;font-size:11px;"+
    "font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--encre2);"+
    "margin:12px 0 6px"},txt);
}
/* ok vaut true, false, ou null quand la règle ne peut pas être tranchée */
function rbVerdict(ok,txt){
  var c=ok===null?"encre2":(ok?"vert":"chaud");
  var m=ok===null?"à vérifier":(ok?"conforme":"non conforme");
  return "<span style='color:var(--"+c+");font-weight:600;white-space:nowrap'>"+m+"</span>"+
    (txt?"<br><span style='font-size:13px;color:var(--encre2)'>"+txt+"</span>":"");
}
/* lignes : [règle, valeur, limite, ok, pourquoi] */
function rbTable(lignes){
  var h="<table style='margin:12px 0 0;font-size:14px'><thead><tr><th>Règle</th><th>Valeur</th>"+
        "<th>Limite</th><th>Verdict</th></tr></thead><tbody>";
  lignes.forEach(function(l){
    h+="<tr><td>"+l[0]+"</td><td class='mono' style='white-space:nowrap'>"+l[1]+
       "</td><td style='white-space:nowrap'>"+l[2]+"</td><td>"+rbVerdict(l[3],l[4]||"")+"</td></tr>";});
  return h+"</tbody></table>";
}
/* une rangée de boutons dont un seul est enfoncé : .bt, et .p pour l'actif */
function rbBoutons(par,opts,etat,cle,calc){
  var w=E("div",{style:"display:flex;flex-wrap:wrap;gap:6px;margin:0 0 10px"}),bs=[];
  opts.forEach(function(o){
    var b=E("button",{type:"button","class":"bt"+(etat[cle]===o[0]?" p":"")},o[1]);
    b.addEventListener("click",function(){
      etat[cle]=o[0];
      bs.forEach(function(x,i){x.className="bt"+(opts[i][0]===o[0]?" p":"");});
      calc();});
    bs.push(b);w.appendChild(b);
  });
  par.appendChild(w);return w;
}
function rbNombre(par,lab,etat,cle,min,max,pas,unite,calc){
  var w=E("div",{"class":"champ"});
  w.appendChild(E("label",{},lab));
  var s=E("span",{"class":"v"});
  var i=E("input",{type:"number",min:min,max:max,step:pas,value:etat[cle]});
  i.addEventListener("input",function(){
    var v=parseFloat(String(this.value).replace(",","."));
    if(isFinite(v)){etat[cle]=v;calc();}});
  s.appendChild(i);
  if(unite)s.appendChild(E("span",{style:"margin-left:6px;color:var(--encre2);font-size:13px;"+
    "font-weight:400"},unite));
  w.appendChild(s);par.appendChild(w);return i;
}
function rbTexte(par,lab,etat,cle,calc,largeur){
  var w=E("div",{"class":"champ"});
  w.appendChild(E("label",{},lab));
  var s=E("span",{"class":"v"});
  var i=E("input",{type:"text",value:etat[cle],spellcheck:"false",autocomplete:"off",
    inputmode:"decimal",
    style:"font-family:'IBM Plex Mono',monospace;font-size:14px;padding:5px 7px;"+
          "border:1px solid var(--trait);border-radius:var(--r);background:var(--carte);"+
          "color:var(--encre);width:"+(largeur||150)+"px;text-align:right"});
  i.addEventListener("input",function(){etat[cle]=this.value;calc();});
  s.appendChild(i);w.appendChild(s);par.appendChild(w);return i;
}
var rbSel="width:100%;font:inherit;font-size:14px;padding:7px;border-radius:var(--r);"+
          "border:1px solid var(--trait);background:var(--carte);color:var(--encre)";

/* ─────────── 1. une ligne KNX TP1 ───────────
   Les trois longueurs, les 64 participants, le calibre, et la chute de tension
   du cours : ΔU = ½ r I L pour des participants répartis. La ligne se décrit
   soit par ses trois longueurs, soit tronçon par tronçon en ligne droite. */


/* ─────────── 2. le mini-projet KNX d'une salle : adresses de groupe ───────────
   Six participants, sept adresses. On émet, on regarde qui réagit. Le
   pré-actionneur renvoie l'état de sa sortie, le variateur la valeur atteinte :
   la commande et l'état sont deux adresses, et c'est ce que l'outil fait voir. */


/* ─────────── 3. adresse IPv4 et masque ───────────
   Tout est fait en entiers non signés (>>> 0) : les opérateurs binaires de
   JavaScript travaillent en 32 bits signés, et 192.x.x.x est négatif sans cela. */


/* ─────────── 4. le budget PoE d'un commutateur ───────────
   Deux vérifications, port par port puis au total, et la chute dans le câble :
   la puissance demandée au port est celle de l'appareil plus la perte Joule,
   avec le courant qui laisse cette puissance à l'appareil. */

/* === OUTILS DOMOTIQUE : réseau et bus === */

/* ═══════════════════════════════════════════ LE BILAN D'UNE LIAISON OPTIQUE
   Seances A4 et A8. Le budget d'un module est l'ecart entre sa puissance emise
   minimale et la sensibilite de son recepteur ; les pertes de la liaison
   s'additionnent, et ce qui reste est la marge. Les valeurs sont celles du
   polycopie : OM3 3,5 dB/km, OS2 0,4 dB/km, 0,75 dB par connexion, 0,3 dB par
   epissure — et la liaison du gymnase, 380 m, deux connexions, deux epissures.
   Les budgets typiques sont ceux des modules IEEE 802.3 : SX 7,5 dB, LX 8 dB,
   10G-SR 2,6 dB, 10G-LR 6,2 dB. */


/* ═══════════════════════════════════════ CE QUE PESE UN APPEL, ET COMBIEN EN PASSENT
   Seance A9. Bloc 1 : le debit d'un appel dans un sens, D = R + 8·H/T — le
   codec, la duree du paquet, et le niveau ou l'on compte les en-tetes (40 o
   pour IP+UDP+RTP, 58 o avec la trame Ethernet, 62 o avec l'etiquette VLAN).
   Bloc 2 : la loi d'Erlang B, la probabilite qu'un appel trouve tous les
   canaux occupes, par la recurrence B(0)=1, B(k)=A·B(k-1)/(k+A·B(k-1)).
   Verifie en Python : A = 4,8 E et N = 11 donnent B = 0,645 %. */
function erlangB(A,N){
  var B=1;
  for(var k=1;k<=N;k++)B=A*B/(k+A*B);
  return B;
}
function canauxPour(A,cible){
  for(var n=1;n<=400;n++)if(erlangB(A,n)<=cible)return n;
  return NaN;
}


/* ═══════════════════════════════════════════ LA CHAINE FONCTIONNELLE
   Seances A1, A3 et B3. Deux jeux. Le premier range douze constituants tires
   au sort dans six familles ; il dit juste ou faux et rappelle la regle de la
   famille choisie, jamais la bonne case. Le second fait construire les deux
   chaines d'une fonction — acquerir, traiter, communiquer ; alimenter,
   distribuer, convertir, transmettre — et dit ou elles se rencontrent.
   Le vocabulaire est celui du referentiel et du corrige de la seance A3 :
   un module de sortie est un PRE-actionneur, le programme d'application
   traite, le bus communique, le feu clignotant du portail communique aussi.
   L'alimentation du bus est rangee dans « reseau » : le polycopie de la
   semaine 1, qui n'a pas cette case, la met dans « aucune ». */
var FAMILLES_CHAINE=[
  ["capteur","Capteur ou organe de commande",
   "Un capteur ou un organe de commande <b>acquiert</b> : il produit une information, "+
   "grandeur mesurée ou ordre donné par l'occupant, et ne commute aucune puissance."],
  ["pre","Pré-actionneur",
   "Le pré-actionneur reçoit un ordre en petite puissance et établit ou coupe la puissance : "+
   "<b>il est traversé par la puissance sans produire d'effet</b> dans le bâtiment."],
  ["act","Actionneur",
   "L'actionneur <b>convertit l'énergie en effet</b> dans le bâtiment : lumière, mouvement, "+
   "chaleur, ouverture, son."],
  ["centrale","Centrale",
   "La centrale <b>traite</b> : elle reçoit les informations, décide et envoie les ordres. "+
   "En KNX, aucun appareil ne porte ce nom : la fonction traiter est répartie dans les participants."],
  ["reseau","Réseau",
   "Le réseau <b>relie et transporte</b> : la ligne et son alimentation, les coupleurs, les "+
   "commutateurs, les passerelles. Il ne décide de rien et ne fait rien agir."],
  ["super","Supervision",
   "La supervision <b>regarde l'ensemble</b> : elle affiche les états, archive et alarme, "+
   "depuis un poste, un serveur ou une application. Elle ne fait pas agir directement."]
];
var BANQUE_CONSTITUANTS=[
  ["Détecteur de présence","capteur"],
  ["Télérupteur","pre"],
  ["Luminaire LED","act"],
  ["Poussoir bus","capteur","Il donne un ordre : un organe de commande, raccordé au bus."],
  ["Contacteur de chauffage","pre"],
  ["Moteur de volet roulant","act"],
  ["Sonde de température d'ambiance","capteur"],
  ["Variateur universel","pre","Il règle la puissance qui le traverse ; la lumière, c'est le luminaire qui la produit."],
  ["Alimentation bus 640 mA","reseau","Elle n'alimente aucun actionneur : elle appartient à l'infrastructure du bus, avec la ligne et ses coupleurs. Sur le polycopié de la semaine 1, sans case « réseau », elle allait dans « aucune »."],
  ["Lecteur de badge","capteur","Il acquiert une identité et la transmet ; il ne décide pas d'ouvrir."],
  ["Gâche électrique","act"],
  ["Coupleur de ligne","reseau"],
  ["Écran tactile mural","capteur","Il donne des ordres depuis la pièce ; il affiche aussi des états, mais il ne surveille pas le bâtiment."],
  ["Passerelle KNX/IP","reseau"],
  ["Caméra IP","capteur","Elle acquiert une image : un capteur, même raccordé en IP."],
  ["Sirène","act"],
  ["Centrale d'alarme intrusion","centrale"],
  ["Compteur d'énergie communicant","capteur","Il mesure une énergie et la communique : un capteur."],
  ["Commutateur Ethernet","reseau"],
  ["Automate de GTB","centrale"],
  ["Poste de supervision GTB","super"],
  ["Module de sortie KNX 4 relais","pre","Le fabricant l'appelle « actionneur » ; le référentiel, non : l'actionneur est le luminaire ou le moteur qu'il commande."],
  ["Interrupteur crépusculaire","capteur"],
  ["Anémomètre","capteur"],
  ["Tête thermoélectrique de radiateur","act","Elle ouvre la vanne : l'effet est un débit d'eau chaude dans le radiateur."],
  ["Relais 24 V","pre"],
  ["Routeur","reseau"],
  ["Application de pilotage sur smartphone","super"],
  ["Câble de bus TP1","reseau"],
  ["Contacteur jour-nuit","pre"],
  ["Moteur de portail","act"],
  ["Cellule photoélectrique","capteur"],
  ["Carte électronique du portail","centrale","Elle décide à partir des cellules et de la télécommande ; ses relais de puissance, eux, sont des pré-actionneurs."],
  ["Télécommande radio","capteur","Un organe de commande sans fil : elle donne l'ordre."],
  ["Serveur de visualisation KNX","super"],
  ["Détecteur de fumée","capteur"],
  ["Centrale SSI","centrale"],
  ["Enregistreur vidéo NVR","super","Il archive et affiche les images : supervision."],
  ["Électrovanne d'arrosage","act"]
];
var FONCTIONS_DEUX_CHAINES=[
  {nom:"Allumer l'estrade depuis un poussoir bus",
   info:["Poussoir bus","Programme d'application du module de sortie","Télégrammes sur le bus KNX"],
   energie:["Réseau 230 V et son disjoncteur","Relais du module de sortie","Luminaires LED"],
   effet:"l'estrade éclairée"},
  {nom:"Remonter les volets quand le vent forcit",
   info:["Anémomètre","Programme d'application du module volets","Télégrammes sur le bus KNX"],
   energie:["Réseau 230 V et son disjoncteur","Relais de montée et de descente du module volets",
            "Moteurs tubulaires","Réducteur et tube d'enroulement"],
   effet:"les volets remontés"},
  {nom:"Fermer le portail du parking",
   info:["Cellules photoélectriques","Carte électronique de commande","Feu clignotant"],
   energie:["Disjoncteur et arrivée 230 V","Relais de puissance de la carte","Moteur électrique",
            "Réducteur, pignon et crémaillère"],
   effet:"le portail fermé"}
];


/* ═══════════════════════════════════════════ LA CARTE DU REFERENTIEL
   Fiche referentiel du site de domotique. Le site ecrit referentiel.js :
   window.REFERENTIEL = { savoirs:[{code,intitule,niveau,famille}],
                          pages:[{id,url,titre,groupe,savoirs:[codes],
                                  exos:[{id,savoir,type}]}] }.
   L'outil le croise avec les marques du navigateur — fed.<site>.lu, un objet
   id de page → horodatage, et fed.<site>.exo, un objet id d'exercice →
   « juste » ou un autre etat — et rend une table par famille : niveau DBC,
   pages qui enseignent le savoir, exercices justes, couverture. Comme la
   carte des prerequis, il ne vit que sur le site : en page autonome, il le
   dit et s'arrete. Rien ne sort du navigateur. */


/* === OUTILS DOMOTIQUE : liaisons, mesures, référentiel === */

/* ───────────────────────────────── montage des outils */
[].forEach.call(document.querySelectorAll(".outil[data-outil]"),function(el){
  var o=OUTILS[el.getAttribute("data-outil")];
  if(!o){el.innerHTML="<div class='dedans'>Outil inconnu : "+
    el.getAttribute("data-outil")+"</div>";return;}
  el.innerHTML="";
  var t=E("div",{"class":"tete-outil"});
  t.appendChild(E("p",{"class":"k"},"Outil"));
  t.appendChild(E("h4",{},o.titre));
  if(o.chaine)t.appendChild(E("p",{"class":"chaine"},"↳ "+o.chaine));
  t.appendChild(E("p",{},o.intro));
  el.appendChild(t);
  var d=E("div",{"class":"dedans"});
  el.appendChild(d);
  o.monte(d, el);
});

/* les schemas se montent apres les outils : ils lisent l'etat partage */
[].forEach.call(document.querySelectorAll("[data-schema]"),function(el){
  var f=SCHEMAS[el.getAttribute("data-schema")];
  if(!f){el.innerHTML="Schéma inconnu : "+el.getAttribute("data-schema");return;}
  f(el);
});

/* ─────────────────────────────────────────────── le bilan d'une epreuve
   Sur une page qui se declare « epreuve: oui », un bandeau compte ce qui est
   fait. Il ne donne AUCUNE reponse — juste combien de questions ont ete
   validees et combien restent. Le compte se refait a chaque evenement « exo »
   emis par exoNote, et au chargement, car les reponses precedentes sont dans
   le localStorage de l'appareil.
   Rien ici ne remonte nulle part : c'est le meme stockage que le suivi de
   lecture, et il ne sort pas du navigateur. */
(function(){
  var page=document.querySelector('.page[data-epreuve]');
  if(!page)return;
  var exos=[].slice.call(document.querySelectorAll(".exo"));
  if(!exos.length)return;

  var bandeau=E("div",{"class":"bilan-epreuve",id:"bilan-epreuve"});
  var jauge=E("i",{}); jauge.appendChild(E("b",{}));
  var texte=E("span",{"class":"compte"},"");
  bandeau.appendChild(jauge); bandeau.appendChild(texte);

  /* pose juste avant le premier exercice : au-dessus du sujet, pas en tete
     de page ou il serait lu avant meme d'avoir vu une question */
  var premier=exos[0], hote=premier;
  while(hote.parentNode&&hote.parentNode!==page)hote=hote.parentNode;
  page.insertBefore(bandeau,hote);

  function refaire(){
    var t=exoLu(),justes=0,vus=0;
    exos.forEach(function(ex){
      var e=t[ex.getAttribute("data-exo")];
      if(e==="juste")justes++; else if(e)vus++;
    });
    var reste=exos.length-justes-vus;
    jauge.firstChild.style.width=Math.round(100*justes/exos.length)+"%";
    texte.textContent=exos.length+" questions · "+justes+" juste"+(justes>1?"s":"")
      +(vus?" · "+vus+" à revoir":"")+(reste?" · "+reste+" non traitée"
      +(reste>1?"s":""):" · terminé");
  }
  document.addEventListener("exo",refaire);
  refaire();
})();

/* le composeur de paroi peut être monté après le bilan : on repasse une fois */
if(OUTILS.bilan._recalc)OUTILS.bilan._recalc();
})();
