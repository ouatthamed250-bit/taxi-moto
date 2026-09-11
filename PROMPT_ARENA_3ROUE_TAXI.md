# PROMPT ARENA — 3ROUE TAXI 🇨🇮 (version consolidée V1)

> À copier-coller tel quel dans Arena / un générateur d'UI mobile.
> Ce prompt fusionne la spécification initiale et toutes les modifications validées.

---

## 0. RÉSUMÉ EXÉCUTIF

Conçois **3ROUE TAXI**, une **APPLICATION MOBILE de transport de passagers de proximité** pensée pour smartphone **Android et iOS**, écrans **verticaux 9:16**, navigation tactile, plein écran, expérience comparable à **Uber / Bolt / Yango**.

**Ce n'est PAS :** un site internet, une web app de bureau, un dashboard desktop présenté dans un écran d'ordinateur, un mockup de navigateur.

**Modèle V1 :** le **prix est proposé par le conducteur**, le passager **choisit parmi plusieurs offres** (place de marché du transport local). Pas de grille tarifaire figée au lancement.

**Mission unique :** transport de passagers en **moto** 🏍️ et **tricycle** 🛺.
PAS de livraison · PAS de colis · PAS de restaurant · PAS de marketplace produits.

---

## 1. IDENTITÉ

- **Nom :** 3ROUE TAXI
- **Slogan :** « Le transport de proximité, simplement. »
- **Marché initial :** Côte d'Ivoire 🇨🇮 (puis toute l'Afrique de l'Ouest)
- **Concept :** mise en relation **passagers ↔ conducteurs** de deux véhicules :
  1. 🛺 **TRICYCLE** (3 roues)
  2. 🏍️ **MOTO** (2 roues)
- **Positionnement :** transport de proximité dans les **quartiers et zones** où les taxis classiques sont peu pratiques ou absents.

---

## 2. TYPES D'UTILISATEURS (3 espaces)

| Espace | Usage | Optimisation |
|---|---|---|
| **A. PASSAGER** | Commander une course | MOBILE-FIRST |
| **B. CONDUCTEUR** | Recevoir / effectuer des courses | MOBILE-FIRST |
| **C. ADMINISTRATEUR** | Superviser toute la plateforme | Desktop / Tablette |

---

## 3. IDENTITÉ VISUELLE

**Style :** premium + moderne + dynamique + africain + technologique. Très attractif mais **simple**. Ne jamais ressembler à un ancien logiciel administratif.

**Inspirations :** cartes arrondies, grandes zones tactiles, boutons modernes, ombres douces et diffuses, dégradés subtils, icônes propres (Lucide), micro-animations, transitions fluides, carte géographique plein écran avec éléments flottants par-dessus.

**Palette :**
- NAVY `#062B67`
- BLEU `#0B5FFF`
- ORANGE `#FF7A00`
- JAUNE/ORANGE `#FFB000`
- BLANC `#FFFFFF`
- VERT CÔTE D'IVOIRE `#009E60`

**Règle couleur :** orange et bleu = dominants. Vert et blanc = **touches** rappelant la Côte d'Ivoire (jamais un drapeau omniprésent).

**Arrière-plans :** blanc ou bleu très clair. **Ombres douces uniquement** (jamais d'ombres noires lourdes). **Coins très arrondis.** Typographie sans-serif moderne, lisible sur smartphone.

---

## 4. LOGO / ICÔNE D'APPLICATION

Icône **carrée à coins fortement arrondis** (vraie icône Android/iOS, jamais un logo de site web) représentant :
- un tricycle
- une moto
- une localisation GPS
- une référence visuelle à la Côte d'Ivoire
- couleurs navy / orange / jaune / vert

---

## 5. CARTE & COUVERTURE GÉOGRAPHIQUE

La carte est un élément **CENTRAL**. Carte réelle de la Côte d'Ivoire.
**Technologie :** MapLibre + OpenStreetMap (ou fournisseur compatible).

Doit couvrir : **Abidjan, Bouaké, Yamoussoukro, Korhogo, Daloa, San-Pédro, Man** et toutes les autres villes/zones.

**Règle de disponibilité (essentielle) :** l'app ne suppose **jamais** qu'il existe des conducteurs partout. La disponibilité dépend des conducteurs **réellement inscrits**.

- **Zone avec conducteurs :** afficher les conducteurs disponibles.
- **Zone avec peu de conducteurs :** afficher une disponibilité **réduite**.
- **Zone sans conducteur :** afficher clairement :
  > « Aucun conducteur disponible dans cette zone pour le moment. »
  > Bouton : **« M'avertir lorsque le service sera disponible »**

Le système doit visualiser les **zones couvertes et non couvertes**.

---

## 6. CAPACITÉ DES VÉHICULES (règle clé)

**Séparer le « nombre de passagers » du « type de véhicule ».** Le passager n'a pas à réfléchir au véhicule adapté : il indique combien ils sont, et l'app propose les véhicules **compatibles**.

- 🛺 **TRICYCLE : jusqu'à 4 passagers** → le passager choisit **1 / 2 / 3 / 4**
- 🏍️ **MOTO : jusqu'à 2 passagers** (dans l'application) → le passager choisit **1 / 2**

Règles :
- L'application **ne dit jamais** qu'une moto transporte obligatoirement 3 personnes ; la capacité autorisée dépend des **règles locales** et du **conducteur/véhicule**.
- Le **nombre de passagers est TOUJOURS transmis au conducteur AVANT qu'il accepte**. Exemple affiché : « 🏍️ Moto — **2 passagers** ».
- Le conducteur **accepte ou refuse** selon la capacité de son véhicule, les règles de sa zone et ses propres conditions.
- **Ne jamais attribuer automatiquement** une course à un véhicule dont la capacité déclarée est insuffisante.
- Si aucune moto ne peut prendre 2 passagers, l'app peut **élargir la recherche** à d'autres conducteurs ayant déclaré accepter 2 passagers, toujours dans le respect des règles de sécurité et de capacité applicables.
- Le passager peut **annuler** tant qu'aucun conducteur n'a accepté.

Libellés d'accueil (nouveaux) :
- **Tricycle — Jusqu'à 4 passagers**
- **Moto — 1 à 2 passagers**

---

## 7. MODÈLE DE PRIX V1 — « TARIF PROPOSÉ PAR LE CHAUFFEUR »

**Décision stratégique :** au lancement, on **n'invente PAS** de grille tarifaire nationale (elle serait fausse d'une ville à l'autre). **Le terrain donne les vrais prix.**

### 7.1 Principe
- Le **conducteur fixe le prix** de la course **avant de l'accepter**.
- **Prix minimum : 1 000 FCFA.**
- Il peut proposer librement : 1 000, 1 500, 2 000, 2 500… selon la distance, l'état de la route et la disponibilité.

### 7.2 Protection contre les abus (définie par l'admin)
- **Tarif minimum : 1 000 FCFA**
- **Tarif maximum conseillé : 5 000 FCFA** (⚠️ **pas** un plafond national définitif : selon la localité, la distance, l'état de la route et la disponibilité, une course peut coûter bien plus cher).
- Donc l'admin gère des **règles par zone** :

| Zone | Minimum | Tarif généralement observé |
|---|---|---|
| Quartier A | 1 000 | 1 000–1 500 |
| Quartier B | 1 000 | 1 500–2 500 |
| Ville X | 1 000 | 2 000–3 500 |
| Zone difficile | 1 000 | 3 000–5 000 |

*(Chiffres d'exemple, pas des tarifs imposés.)*

### 7.3 Apprentissage par les données (intelligence de l'app)
Pendant les premiers mois, **3ROUE TAXI collecte pour chaque course** : ville, quartier, départ, destination, distance, type de véhicule, nombre de passagers, **prix proposé**, **prix accepté**, course terminée ou annulée, heure, disponibilité des conducteurs, difficulté éventuelle de la zone.

Après quelques milliers de courses, l'admin voit, par trajet/zone :
```
Yopougon → Zone X
436 courses
Prix moyen  : 1 650 FCFA
Prix médian : 1 500 FCFA
80 % des courses : 1 500–2 000 FCFA
```
→ On obtient une **vraie base tarifaire ivoirienne issue du terrain**.

### 7.4 Estimation affichée au passager (progressive)
- **Au début :** « Prix : proposé par le chauffeur ».
- **Plus tard :** l'app affiche une **fourchette habituelle apprise** :

  > **Estimation 3ROUE TAXI** — 🟠 **1 500 – 2 000 FCFA**
  > Puis : *Chauffeur propose :* **1 800 FCFA** → le passager décide.

Transparence maximale.

### 7.5 Commission plateforme
Commission **fixe de 5 %** sur chaque course terminée.

- Course 1 000 F → Conducteur **950 F** / Plateforme **50 F**
- Course 2 000 F → Conducteur **1 900 F** / Plateforme **100 F**
- Course 5 000 F → Conducteur **4 750 F** / Plateforme **250 F**

Formules : `COMMISSION = PRIX × 5 %` puis `CONDUCTEUR = PRIX − COMMISSION`.
Le conducteur voit **toujours son revenu net réel**.

### 7.6 🔒 RÈGLE DU PRIX VERROUILLÉ (obligatoire)
Interdit de faire : « le client a accepté 2 000 F dans l'app, mais je réclame 3 000 F à l'arrivée ».
Le **prix accepté dans l'application est le prix de la course**, verrouillé. Toute modification doit passer **par l'application** et être **acceptée par le passager**. Protège le passager **et** 3ROUE TAXI.

### 7.7 Flux V1 « place de marché des offres »
1. Le passager indique : **départ + destination + nombre de personnes + Moto/Tricycle**.
2. La demande est envoyée aux **conducteurs compatibles**.
3. Les conducteurs voient la demande et **proposent leur tarif**.
4. Le passager voit les **propositions** :

   | Conducteur | Prix | Note |
   |---|---|---|
   | 🏍️ Conducteur A | 1 500 F | ⭐ 4,8 |
   | 🏍️ Conducteur B | 1 700 F | ⭐ 4,9 |
   | 🛺 Conducteur C | 2 000 F | ⭐ 4,7 |

5. Le passager **choisit son chauffeur**.

→ Crée un **marché de transport local** où 3ROUE TAXI reste l'intermédiaire et l'observateur des vrais prix.

---

## 8. PAGE D'ACCUEIL (MOBILE)

- **En haut :** logo 3ROUE TAXI + sélecteur **« Côte d'Ivoire 🇨🇮 »**
- **Hero visuel moderne :** tricycle jaune/orange, moto, environnement urbain ivoirien, ambiance Abidjan, route, ciel lumineux
- **Message :** « Votre déplacement, simplement. »
- **Sous-titre :** « Trouvez rapidement une moto ou un tricycle près de vous. »
- **Deux grandes cartes de choix :**
  - 🛺 **TRICYCLE** — « Jusqu'à 4 passagers »
  - 🏍️ **MOTO** — « 1 à 2 passagers »
- Puis :
  - « **Ma position actuelle** »
  - « **Où allez-vous ?** »
- Petits avantages : ✓ Conducteurs vérifiés · ✓ Rapide · ✓ Disponible selon votre zone · ✓ Assistance
- **Bas de page :** bouton principal **« Commander une course »** + bouton secondaire **« Devenir conducteur »**

---

## 9. ESPACE PASSAGER

**Dashboard MOBILE après connexion :**
- **Carte** occupant une grande partie de l'écran.
- **Position actuelle** = point bleu.
- **Conducteurs disponibles** = petits marqueurs (**🏍️** motos, **🛺** tricycles).
- **Bas de l'écran :** carte blanche arrondie :
  - « **Où allez-vous ?** »
  - Champs : 📍 **Position actuelle** · 🏁 **Destination**
  - Sélecteur 👥 **Combien êtes-vous ?** (− 2 +) → puis véhicules compatibles
  - Boutons : **« Moto »** / **« Tricycle »**
  - Estimation : **Distance · Durée · Prix (proposé par le chauffeur / fourchette estimée)**
  - Bouton principal : **« Commander »**

**Bottom Navigation passager :** 🏠 Accueil · 🗺️ Courses · 📜 Historique · 👤 Profil

---

## 10. FLUX COMPLET D'UNE COURSE

1. Position actuelle
2. Destination
3. Nombre de passagers
4. Choix du véhicule (Moto / Tricycle)
5. Affichage du prix (offres des conducteurs)
6. Confirmation
7. **Recherche d'un conducteur** → animation de recherche autour de la position du passager + texte « Recherche d'un conducteur… »
8. **Conducteur trouvé** / choix de l'offre
9. Conducteur en route
10. Conducteur arrivé
11. Course en cours
12. Course terminée
13. Notation du conducteur

**Quand un conducteur accepte (ou est choisi), afficher :** photo, nom, note, type de véhicule, numéro/identification du véhicule.
**Boutons :** **« Appeler »** · **« Annuler »**.

**Statuts officiels de course :**
EN ATTENTE · RECHERCHE CONDUCTEUR · CONDUCTEUR TROUVÉ · CONDUCTEUR EN ROUTE · CONDUCTEUR ARRIVÉ · COURSE EN COURS · TERMINÉE · ANNULÉE

---

## 11. ESPACE CONDUCTEUR

**Écran principal :**
- **Carte** plein écran.
- **En haut, statut :** 🟢 **DISPONIBLE** ou ⚪ **HORS LIGNE**, avec un **gros bouton** pour basculer.
- Bloc **« Aujourd'hui »** : Courses : **0** · Revenus : **0 FCFA** · Commission plateforme : **5 %** · **Revenu net calculé automatiquement**.

**Quand une demande arrive** — carte de demande en bas de l'écran :
- 📍 Départ · 🏁 Destination · Distance · **Prix (proposé par le conducteur)** · Type : Moto / Tricycle · **👥 Nombre de passagers**
- Champ **« Proposez votre tarif »** (ex. **1 500 FCFA**, minimum 1 000)
- Boutons : **« Accepter la course »** / **« Refuser »**

Exemple de carte :
```
🏍️ MOTO — 2 passagers
📍 Départ  : Yopougon…
🏁 Destination : …
📏 Distance estimée : 4,2 km
Proposez votre tarif
[ 1 500 FCFA ]
[ Accepter la course ]   [ Refuser ]
```

**Bottom Navigation conducteur :** 🏠 Accueil · 🚕 Courses · 💰 Revenus · 👤 Profil

---

## 12. INSCRIPTION CONDUCTEUR (différente du passager)

Étapes :
1. Nom complet
2. Numéro de téléphone
3. Photo
4. Type de véhicule — **Moto** / **Tricycle**
5. Marque / modèle
6. Immatriculation ou numéro d'identification si applicable
7. Informations demandées par l'administration
8. Documents nécessaires selon les règles applicables
9. **Validation par l'administrateur**

Statut affiché : **« Votre compte est en attente de validation. »**
L'administrateur peut **accepter ou refuser** l'inscription.

---

## 13. INSCRIPTION PASSAGER

Parcours simple : nom / téléphone (OTP) / photo optionnelle. Accès immédiat à l'espace passager.

---

## 14. ESPACE ADMINISTRATEUR (optimisé desktop/tablette)

**Dashboard :** Nombre de passagers · Nombre de conducteurs · Conducteurs en ligne · Courses aujourd'hui · Courses en cours · Courses terminées · Chiffre généré · **Commission plateforme**.

**Gestion des conducteurs :** voir, rechercher, filtrer **Moto / Tricycle**, voir les **conducteurs en ligne** et leur **position**, **valider** une inscription, **suspendre**, **réactiver**, consulter ses courses, ses revenus, ses évaluations.

**Gestion des passagers :** voir les utilisateurs, rechercher, consulter l'historique, voir les courses, voir les réclamations, **suspendre** un compte si nécessaire.

**Gestion des courses (temps réel)** — chaque course possède : **ID · Passager · Conducteur · Type de véhicule · Départ · Destination · Distance · Prix · Commission 5 % · Statut · Date · Heure**.

**Gestion de la tarification / des zones :** définir et modifier :
- tarif minimum (défaut **1 000 FCFA**)
- tarif maximum conseillé
- **règles par zone** (min + fourchette généralement observée)
- tarif moto / tarif tricycle
- suppléments éventuels et conditions particulières

Le système calcule automatiquement : **PRIX COURSE** → **COMMISSION = PRIX × 5 %** → **CONDUCTEUR = PRIX − COMMISSION**. Les règles exactes seront affinées avec les données réelles (voir §7.3).

**Analytics tarifaires :** au fil des courses, tableau par trajet/zone (nombre de courses, prix moyen, prix médian, fourchette 80 %).

---

## 15. SÉCURITÉ / CONFIANCE

Afficher les infos utiles du conducteur : **photo, nom, note, type de véhicule, identification**.
Permettre : **Appeler**, **Annuler**, **Signaler un problème**.
Après la course : **⭐ Noter le conducteur** + commentaire optionnel.

---

## 16. BACKEND (architecture cible)

**Front mobile :** React Native + Expo + TypeScript.
**Backend :** **Firebase** →
- Firebase **Authentication**
- **Firestore** (données + synchronisation **temps réel** des courses et positions)
- Firebase **Storage**
- Firebase **Cloud Functions** si nécessaire
- Firebase **Cloud Messaging** (notifications push)

Les **positions des conducteurs** et les **courses** doivent être **synchronisées en temps réel**.
Architecture propre, évolutive, prête à connecter Firebase et la cartographie.

---

## 17. DESIGN UX

L'expérience doit être **extrêmement simple**. À l'ouverture, l'utilisateur doit comprendre immédiatement : **« Je veux aller quelque part. »**

- Éviter les menus inutiles, les écrans trop chargés.
- **Priorité d'affichage :** CARTE → POSITION → DESTINATION → TYPE DE VÉHICULE → PRIX → COMMANDE.
- Boutons **assez grands pour le pouce** (hauteur tactile confortable).
- Animations **fluides mais discrètes**. Micro-interactions soignées.

---

## 18. RESPONSIVE MOBILE (CRITIQUE)

Tous les écrans **passager** et **conducteur** doivent être conçus pour **Android + iPhone**, **format portrait**.

Tailles cibles : **360 × 800 · 390 × 844 · 412 × 915**.

**NE PAS afficher :** barre de navigation de navigateur, URL, menu desktop, sidebar desktop, fenêtre de navigateur, écran de site internet, ordinateur, ou mockup posé dans un ordinateur.

Le rendu doit montrer **DIRECTEMENT l'interface d'une application mobile**, en plein écran, comme sur un vrai téléphone.

---

## 19. STYLE VISUEL FINAL

Impression à donner : 🇨🇮 Ivoirienne · 🚕 Mobilité · ⚡ Rapidité · 📍 Localisation · 🛡️ Confiance · 📱 Technologie · 💙 Professionnalisme.

**Beaucoup de blanc pour respirer.** Dégradés subtils, ombres douces, coins très arrondis.

- Principales : NAVY `#062B67` · BLUE `#0B5FFF` · ORANGE `#FF7A00` · YELLOW `#FFB000`
- Touches : WHITE `#FFFFFF` · GREEN `#009E60`

Résultat : **premium, moderne, chaleureux, immédiatement reconnaissable.**

---

## 20. PRIORITÉ DE DÉVELOPPEMENT

1. Splash screen
2. Page d'accueil
3. Connexion
4. Inscription passager
5. Inscription conducteur
6. Dashboard passager
7. Dashboard conducteur
8. Carte Côte d'Ivoire
9. Recherche de destination
10. Demande de course
11. Offres / acceptation par conducteur
12. Suivi en temps réel
13. Fin de course
14. Historique
15. Profil
16. Dashboard administrateur

**Ne pas ajouter** de livraison, de marketplace ni d'autres services.

---

## 21. CŒUR FONCTIONNEL (à ne jamais perdre de vue)

```
PASSAGER
  ↓
INDIQUE NOMBRE DE PASSAGERS + CHOISIT MOTO OU TRICYCLE
  ↓
INDIQUE DÉPART + DESTINATION
  ↓
LA DEMANDE PART AUX CONDUCTEURS COMPATIBLES
  ↓
CONDUCTEURS PROPOSENT LEUR PRIX (min 1 000 FCFA)
  ↓
LE PASSAGER CHOISIT SON OFFRE
  ↓
SUIVI GPS EN TEMPS RÉEL
  ↓
COURSE
  ↓
FIN DE COURSE (prix verrouillé sur le montant accepté)
  ↓
NOTE DU CONDUCTEUR
  ↓
5 % DE COMMISSION POUR LA PLATEFORME
```

---

## 22. ÉCRANS À GÉNÉRER (livrable attendu)

Produire, au format **mobile 9:16 plein écran**, au minimum :

1. **Splash screen** (logo 3ROUE TAXI sur fond navy/dégradé orange)
2. **Page d'accueil** (hero tricycle+moto, sélecteur Côte d'Ivoire, 2 cartes de choix, CTA « Commander une course » + « Devenir conducteur »)
3. **Connexion** (téléphone + OTP)
4. **Inscription passager**
5. **Inscription conducteur** (multi-étapes + écran « en attente de validation »)
6. **Dashboard passager** (carte + point bleu + marqueurs moto/tricycle + bloc « Où allez-vous ? » + sélecteur passagers + estimation)
7. **Écran de recherche de conducteur** (animation autour du point bleu)
8. **Liste des offres des conducteurs** (prix + note + choix)
9. **Conducteur trouvé / en route** (photo, nom, note, véhicule, identification, Appeler/Annuler)
10. **Dashboard conducteur** (statut 🟢/⚪, bloc « Aujourd'hui », revenus)
11. **Carte de demande de course côté conducteur** (nb passagers, départ, destination, distance, « Proposez votre tarif », Accepter/Refuser)
12. **Course terminée + notation ⭐**
13. **Historique des courses**
14. **Profil**
15. **Écran « Aucun conducteur disponible dans cette zone » + « M'avertir lorsque le service sera disponible »**
16. **Dashboard administrateur** (statistiques, commission 5 %) — le seul écran pouvant être en format desktop/tablette

---

## 23. RAPPEL FINAL

Il s'agit d'une **APPLICATION MOBILE DE TRANSPORT DE PASSAGERS**.
Le rendu visuel doit ressembler à une **vraie application Android/iOS moderne**, **pas à un site internet**.
Cœur métier : **PASSAGER → MOTO/TRICYCLE → DESTINATION → PRIX PROPOSÉ PAR LE CONDUCTEUR → CHOIX → SUIVI GPS → COURSE → NOTE → 5 % DE COMMISSION**.



