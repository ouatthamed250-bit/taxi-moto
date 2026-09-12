# Firebase — Taxi-Moto (mise en route)

## 1. Variables d'environnement

Copiez `.env.example` en `.env` (non commité) et remplissez les valeurs depuis
**Console Firebase → Paramètres du projet → Vos applications → Configuration du SDK**.

```
VITE_FIREBASE_API_KEY=…
VITE_FIREBASE_AUTH_DOMAIN=…
VITE_FIREBASE_PROJECT_ID=…
VITE_FIREBASE_STORAGE_BUCKET=…
VITE_FIREBASE_MESSAGING_SENDER_ID=…
VITE_FIREBASE_APP_ID=…
VITE_FIREBASE_DATABASE_URL=https://<projet>-default-rtdb.<région>.firebasedatabase.app
```

⚠️ Sans ces variables, l'application fonctionne en **mode local** (localStorage) :
tout reste sur l'appareil, rien n'est partagé.

## 2. Activer l'authentification ANONYME (obligatoire)

> Étape indispensable : l'application ouvre une session **Firebase anonyme** pour
> identifier chaque appareil (1 appareil = 1 uid).

**Console Firebase → Authentication → Sign-in method → Anonyme → Activer → Enregistrer**

Sans cette activation, l'API renvoie `ADMIN_ONLY_OPERATION` et l'application
bascule automatiquement en mode local (message dans la console du navigateur).

L'authentification par **téléphone (SMS)** — déjà activée — servira plus tard à
vérifier réellement le numéro (voir « Reste à faire »).

## 3. Coller les règles de sécurité

| Fichier local           | Où le coller |
|-------------------------|--------------|
| `firestore.rules`       | Console Firebase → **Firestore Database → Règles** → Publier |
| `database.rules.json`   | Console Firebase → **Realtime Database → Règles** → Publier |

Règle commune : lecture/écriture pour **tout utilisateur authentifié** (même
anonyme). ⚠️ La Realtime Database est actuellement **ouverte à tous** tant que
`database.rules.json` n'est pas publié — à faire sans attendre.

## 4. Structure des données

```
Firestore
  users/{uid}            → { role: 'passenger'|'driver', name, phone, password, createdAt, … }
  rides/{rideId}         → course terminée (passengerId, driverId, prix, commission…)
  rechargeRequests/{id}  → demande de recharge mobile money (+ capture base64)
  gifts/{id}             → cadeau de recharge offert par l'admin

Realtime Database
  positions/drivers/{uid}     → { latitude, longitude, updatedAt }
  positions/passengers/{uid}  → { latitude, longitude, updatedAt }
  online/drivers/{uid}        → { online: true|false, updatedAt }
  rideRequests/{id}           → demande de course en attente
  rideStatus/{rideId}         → statut partagé de la course (live)
  offers/{offerId}            → prix proposé par un conducteur (+ rounds, status)
  negotiations/{offerId}      → tours de négociation (rounds 1 à 3, max 3 tours)
```

⚠️ Pensez à **re-publier `database.rules.json`** après chaque ajout de nœud
(`rideStatus`, `offers`, `negotiations`) : sans cela, l'écriture est refusée
(`Permission denied`) et la fonctionnalité correspondante reste en mode dégradé.

## 5. Où vérifier dans la console Firebase

| Ce que vous testez | Écran de la console |
|---|---|
| Compte client créé | **Firestore Database → Data → users** (document avec `role: passenger`) |
| Compte conducteur créé | **Firestore Database → Data → users** (`role: driver`, `vehicle`, `plate`) |
| Position du conducteur | **Realtime Database → Data → positions → drivers → {uid}** |
| Statut en ligne | **Realtime Database → Data → online → drivers → {uid}** (`online: true`) |
| Demande de course | **Realtime Database → Data → rideRequests** |
| Recharges / cadeaux | **Firestore Database → Data → rechargeRequests** / **gifts** |
| Utilisation de l'API | **Authentication → Users**, **Realtime Database → Utilisation** |

Astuce : dans les deux écrans de données, laisse l'onglet ouvert — les
écritures apparaissent en direct pendant que vous utilisez l'application.

### 5.2 Flux NÉGOCIATION du prix (client ↔ chauffeur)

```
Chauffeur propose 1 500 F   → /offers/{id}.rounds = [ {driver, 1500} ]  status: pending   (Tour 1/3)
Client  « Négocier » 1 300  → rounds += {passenger, 1300}               status: negotiating (Tour 1/3)
    ⛔ RIEN ne démarre : aucune course, aucun `accepted`
    ⏳ Le client voit « Votre proposition : 1 300 F — En attente de la réponse du chauffeur… »
       (boutons Accepter / Négocier DÉSACTIVÉS)
Chauffeur CONTRE-PROPOSE    → rounds += {driver, 1400} → Tour 2/3 → le client voit 1 400 F
Client  « Négocier » 1 350  → rounds += {passenger, 1350}               (Tour 2/3)
Chauffeur CONTRE-PROPOSE    → rounds += {driver, 1380} → Tour 3/3 → le client voit 1 380 F
Client  « Négocier » 1 360  → 3ᵉ contre-offre client = LIMITE → status: expired
Chauffeur ACCEPTE           → status: accepted → il crée la course (Firestore) → le client suit
Client ACCEPTE              → status: accepted → le chauffeur crée la course
Chauffeur REFUSE            → status: rejected + offre retirée → le client voit
                              « Le chauffeur a refusé. Recherche d'un autre chauffeur… »
```

⚠️ **Règles à ne pas casser** (bugs déjà corrigés) :

1. **Compteur de tours = échanges COMPLETS** (`currentRound`) : il avance à chaque
   réponse du chauffeur (« Tour 1/3 » → « Tour 2/3 » → « Tour 3/3 »). L'offre
   INITIALE du chauffeur ne compte pas comme contre-offre.
2. **Limites symétriques** (`canPassengerCounter` / `canDriverCounter`) : 3
   contre-offres MAXIMUM par camp → **6 messages au total**
   (`MAX_NEGOTIATION_MESSAGES`). La limite est vérifiée **AVANT** d'autoriser un
   nouveau tour ; quand elle est atteinte, le bouton de contre-proposition est
   **désactivé** (`3 tours atteints`) mais l'**acceptation reste possible** —
   avant, cliquer « Contre-proposer » au-delà de la limite **détruisait toute la
   négociation** (offre expirée) sans que le chauffeur puisse accepter.
3. **`sendCounterOffer` n'écrit QUE la proposition** (`status: 'negotiating'`) :
   jamais `accepted`, jamais de création de course.
4. **Chacun son tour** : `canPassengerAcceptOffer(rounds)` renvoie `false` tant
   que la dernière proposition vient du CLIENT (sinon le client « acceptait sa
   propre offre » et la course démarrait à son prix).
5. **REFUS toujours publié** : `rejectIncoming` (demande entrante **et** après une
   offre) écrit `status: 'rejected'` puis retire l'offre de la RTDB. Avant, le
   refus du chauffeur n'écrivait RIEN : le client attendait indéfiniment.
   La demande reste publiée pour les autres conducteurs, et le client est prévenu
   (`passengerNotice`) dès qu'une offre qu'il suivait disparaît.
6. **Le prix affiché côté client = dernière proposition DU CHAUFFEUR**
   (`lastDriverAmount`) ; « Votre proposition » vient de `lastPassengerAmount`.
7. **Acceptation résiliente** : la demande est résolue par `requestId` parmi les
   demandes publiées (`finalizeAcceptedOffer`), pour ne plus échouer pendant une
   négociation. En cas de solde insuffisant, l'offre est retirée proprement.
8. **Historique** : `describeRounds(rounds, fcfa, 'passenger' | 'driver')` →
   ses propres tours s'affichent « Vous » (« 1. Chauffeur : 1 500 F · 2. Vous : 1 300 F »).

### 5.3 Flux RECHARGE : conducteur → admin (à ne pas casser)

| Étape | Qui | Ce qui se passe |
|---|---|---|
| 1 | Conducteur | `submitRechargeRequest` → `createRechargeRequest` (docId `RC-xxxxxx`, `status: 'pending'`) |
| 2 | Admin | `subscribeToRechargeRequests` → `onSnapshot` sur **`rechargeRequests`** → page `/admin/deposits` |
| 3 | Admin | « Valider » → `updateRechargeRequest` (`status: 'approved'`) + `incrementDriverBalance` sur `users/{driverId}` |

⚠️ **Piège corrigé (à ne pas réintroduire)** :

1. Les abonnements Firestore **ne se réessaient pas tout seuls**. Un `onSnapshot`
   tombé en erreur (`permission-denied` le temps que la session anonyme se
   propage) restait mort **définitivement** : l'admin ne recevait plus rien.
   `watchCollection()` réessaie donc **sans limite** (back-off 1 s → 10 s).
2. Une écriture doit être **attendue** : `submitRechargeRequest` /
   `addDriverGift` renvoient `{ ok, error }` et l'UI ne confirme QUE si Firestore
   a répondu (`withWriteRetry` : 3 essais). Avant, un échec était invisible.
3. Le statut du canal est affiché sur `/admin/deposits`
   (**🟢 Temps réel actif** / **🔴 Temps réel interrompu**) : une page vide n'est
   jamais silencieuse.

Comparaison utile : un **cadeau** est créé ET affiché sur l'appareil de l'admin
(ajout local optimiste), il « marche » donc même sans Firestore ; une
**recharge** vient d'un AUTRE appareil, elle n'existe pour l'admin que si
l'écriture Firestore a réussi ET que son abonnement est vivant.

Logs à surveiller dans la console du navigateur :

```
[recharge] envoi… { id, driverId, amount, captureKo }
[recharge] ✅ demande RC-xxxxxx écrite dans Firestore (status=pending).
[recharge] snapshot reçu : 3 demande(s).
[firestore] abonnement « rechargeRequests » en erreur : permission-denied
[firestore] nouvelle tentative « rechargeRequests » (#1) dans 1 s…
```

## 6. Reste à faire (après cette étape)

- Vérification réelle du numéro par **SMS** (`signInWithPhoneNumber`) puis
  suppression du mot de passe stocké en clair dans Firestore.
- Moteur d'**offres** temps réel (le conducteur propose un prix, le client choisit).
- Durcissement des règles (accès `users/{uid}` limité au propriétaire, admin
  par custom claim).
