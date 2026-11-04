# Mode administration — Cloe Chaudron Beauty

Ce mode permet de modifier **tout le contenu du site** (textes et images) depuis
le site lui‑même, puis d'**enregistrer dans la base de données** d'un clic.

---

## 1. Ouvrir le mode admin

Trois façons d'ouvrir l'écran de connexion :

- **Ordinateur** : touche **F11**.
- **Téléphone / tablette** : **appuyer 5 fois de suite** sur le logo (en haut),
  rapidement.
- **Partout** : ajouter **`#admin`** à la fin de l'adresse du site
  (ex. `https://www.cloechaudronbeauty.com/#admin`).

Un écran de connexion s'affiche. Saisir le mot de passe → l'éditeur s'ouvre à
droite. Le site reste visible derrière : **les modifications s'affichent en
direct** pendant que vous tapez.

> 🔒 **Le mot de passe n'est pas dans le code du site.** Il est vérifié
> uniquement côté serveur (`adminlogin.php`). Pour le changer, modifier
> `CCB_ADMIN_PASSWORD` dans `backend/api/configsite.php` (valeur par défaut :
> `cloe2024`). C'est le **seul** endroit à modifier.

---

## 2. Ce que l'on peut modifier

Le panneau est organisé en onglets :

| Onglet | Contenu modifiable |
|---|---|
| **Menu** | Libellés FR/EN, visibilité et ordre des pages |
| **Accueil** | Phrase d'accroche, paragraphes, cartes « Découvrez » (texte + image + page) |
| **Galerie** | Photos du portfolio (haut + principal) : ajout, suppression, remplacement. **Ordre par glisser-déposer** (souris, ou au doigt : appui court puis glisser) — enregistré automatiquement |
| **Avis** | Témoignages (nom, texte FR, texte EN, photo) |
| **Prestations** | Forfaits Mariées/Invitées : **icône**, titres, description, « inclus », intro et note |
| **FAQ** | Thèmes et questions/réponses FR/EN |
| **Partenaires** | Domaines, créateurs, photographes, déco (nom, lien, ville, description, image) |
| **Pied de page** | Description, bouton, photos Instagram |
| **Formulaire** | Libellés et exemples des champs de contact |
| **Images du site** | Logos, photos d'accueil / à propos / contact, **vidéos** d'accueil |
| **Réglages** | **E-mail de contact**, lien/texte Instagram, **Mentions légales** (FR/EN) |
| **Tous les textes** | Liste complète des textes traduits (pour retrouver n'importe quel texte) |

Le sélecteur **FR / EN** en haut du panneau bascule la langue en cours d'édition.

### Images
Chaque image a un bouton **« Changer »** : choisissez un fichier sur votre
ordinateur, il est téléversé sur le serveur et l'image est remplacée
immédiatement. Cela vaut pour **toutes** les images : portfolio, avis,
partenaires, **icônes de prestations**, logos, photos de fond et vidéos.

> Les images des partenaires sont numérotées (`0.jpg`, `1.jpg`…) : le bouton les
> écrase à la bonne position. Les images « générales » (onglet *Images du site*)
> sont stockées dans une table d'équivalence `images` enregistrée avec le reste.

---

## 3. Enregistrer

Le bouton **💾 Enregistrer** envoie **toutes** les données au serveur
(`setccbdata.php`), qui insère une nouvelle ligne dans la table `ccb_data`.
Chaque sauvegarde crée donc une **nouvelle version** (l'historique est conservé).
Au prochain chargement, `getccbdata.php` renvoie la dernière version.

---

## 4. Installation côté serveur (PHP)

Les fichiers du dossier **`backend/api/`** de ce dépôt sont à déposer sur le
serveur dans `/backend/api/` (via FTP, comme le reste du backend) :

```
backend/api/configsite.example.php  ← MODÈLE : copier en configsite.php côté serveur
backend/api/adminlogin.php          ← vérifie le mot de passe (connexion)
backend/api/getccbdata.php          ← lecture (existe sans doute déjà)
backend/api/setccbdata.php          ← sauvegarde (bouton Enregistrer)
backend/api/upload_asset.php        ← téléversement des images
```

> ⚠️ **Identifiants jamais versionnés.** Le vrai `configsite.php` (identifiants
> BDD + mot de passe admin) est **ignoré par git**. Sur le serveur, copiez
> `configsite.example.php` en **`configsite.php`** et renseignez les vraies
> valeurs. Le nom `configsite.php` évite tout conflit avec un `config.php`
> existant.

> Le déploiement Angular (`docs/`) n'écrase **pas** le dossier `backend/`
> (voir `deploy.js`), ces fichiers sont donc gérés séparément.

### Table SQL attendue
```sql
CREATE TABLE IF NOT EXISTS ccb_data (
  id        INT AUTO_INCREMENT PRIMARY KEY,
  json_data LONGTEXT NOT NULL,
  created   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Dossier des images
`upload_asset.php` écrit dans `/backend/assets/` (et ses sous‑dossiers
`portfolio/`, `topportfolio/`, `domains/`, `weddings/`, `photographers/`,
`decos/`). Ce dossier doit être **accessible en écriture** par PHP.

---

## 5. Sécurité

- Le mot de passe est vérifié **côté serveur uniquement** ; il n'est jamais
  inclus dans le JavaScript public du site.
- Les endpoints d'écriture (`setccbdata.php`, `upload_asset.php`) exigent ce
  mot de passe tant que `CCB_ADMIN_PASSWORD` n'est pas vide.

Pour aller plus loin (recommandé sur le long terme) :

1. Protéger en plus le dossier `/backend/api/` par `.htaccess` (HTTP Basic Auth)
   ou une vraie session PHP.
2. Limiter l'accès par IP si possible.

> ⚠️ Le mot de passe transite entre le navigateur et le serveur lors de la
> connexion (à protéger par **HTTPS**, déjà en place) et reste en mémoire de
> l'onglet le temps de la session d'édition. Le mettre à jour régulièrement.

---

## 6. Notes techniques

- Le mode admin est le composant `src/app/admin/admin.component.*`. Il reçoit
  les **références** des données chargées par `AppComponent` (`adminData`) et
  les modifie en place, d'où l'aperçu en direct.
- Certains textes/images étaient « en dur » dans le gabarit. Ils ont été rendus
  modifiables :
  - **Textes** via `trads[trad].cle || « valeur par défaut »` (onglet *Tous les
    textes*).
  - **Images** via `siteImg('cle', 'fichier-par-defaut')` et la table `images`
    (onglet *Images du site*).
  - **Icônes de prestations** : un nom sans extension reçoit `.png`
    (compatibilité avec l'existant), un fichier téléversé garde son extension.
  Tant que rien n'est personnalisé, le contenu d'origine reste affiché.
- **Données personnelles** (mentions légales, e-mail de contact, Instagram) :
  retirées du code, désormais chargées depuis la BDD et éditables dans l'onglet
  *Réglages*. Voir la section 7.
- Reste non éditable depuis le panneau (rarement modifié) : les badges du
  carrousel. Ils peuvent être ajoutés au besoin sur le même principe.

---

## 7. Données personnelles & déploiement

Aucune donnée personnelle ni identifiant n'est versionné dans le dépôt. Les
informations vivent **en base de données** (contenu) ou dans des **fichiers
locaux ignorés** (identifiants) :

| Donnée | Où elle vit maintenant |
|---|---|
| Mentions légales (nom, adresse, tél., SIRET…) | BDD — onglet *Réglages* |
| E-mail de contact + Instagram | BDD — onglet *Réglages* |
| Avis clients, textes, images | BDD (déjà le cas) |
| Identifiants FTP | `deploy.config.json` (ignoré par git) |
| Identifiants BDD + mot de passe admin | `backend/api/configsite.php` (ignoré par git) |

### Première mise en place
1. **FTP** : copier `deploy.config.example.json` → **`deploy.config.json`** et y
   mettre vos identifiants FTP (ou définir `FTP_HOST`/`FTP_USER`/`FTP_PASSWORD`).
2. **Serveur** : copier `configsite.example.php` → **`configsite.php`** sur le
   serveur, avec les identifiants BDD et le mot de passe admin.
3. **Contenu** : ouvrir le mode admin (**F11**), onglet *Réglages*, et saisir
   l'e-mail de contact, l'Instagram et les **mentions légales** (FR puis EN),
   puis **Enregistrer**. Tant que ce n'est pas fait, ces zones sont vides.

### Déploiement
`npm run deploy` (ou `node deploy.js`) reconstruit `docs/` depuis les sources
**nettoyées** puis envoie le site en FTP. Le build régénère le bundle : l'ancien
`docs/main-*.js` (qui contenait encore les mentions légales compilées) est
remplacé par une version sans aucune donnée personnelle.

> L'**historique git** conserve les anciennes versions (non nettoyé, comme
> convenu). Si besoin un jour, `bfg-1.15.0.jar` (déjà dans le dépôt) permet de
> purger l'historique.
