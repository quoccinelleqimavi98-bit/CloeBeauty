# CLAUDE.md — CloeBeauty (site principal)

Guide de référence pour travailler sur ce dépôt (lu en priorité par Claude, et
utile à toute personne qui reprend le projet).

## C'est quoi ce projet ?

Le **site vitrine principal** de Cloé Chaudron Beauty :
**https://www.cloechaudronbeauty.com** (domaine dans `CNAME.txt`).
Application **Angular 19**, bilingüe FR/EN, avec un **mode admin** qui permet de
modifier tout le contenu (textes + images) depuis le site lui-même
(voir `ADMIN.md`).

### Où vit quoi sur le serveur OVH

Tout est sur le **même hébergement OVH**, sous `/public_html/` :

| Chemin serveur            | Contenu                                            |
|---------------------------|----------------------------------------------------|
| `/public_html/`           | **Ce site** (front Angular)                        |
| `/public_html/backend/`   | L'**API PHP** + base de données (contenu, images)  |
| `/public_html/intraccb/`  | L'outil interne (dépôt **IntraCCB2**)              |
| `/public_html/adminccb/`  | (autre espace existant)                            |

➡️ Le déploiement de ce site **ne touche jamais** à `backend/`, `intraccb/` ni
`adminccb/`. Ils sont protégés (liste `exclude` du workflow).

## Développement local

```bash
npm install        # une fois
npm start          # http://localhost:4200
npm run build      # build de production dans dist/cloe-chaudron-beauty
```

## 🤖 Règle : aller jusqu'à la mise en ligne, sans demander

Quand la propriétaire (Cloé) demande une modification, elle veut le résultat
**en ligne**, tout de suite. Elle ne crée pas et ne fusionne pas de Pull Request
elle-même. Donc, pour toute demande de sa part :

1. Fais la modification et commit.
2. **Fais-la arriver sur `main`** — c'est `main` qui déclenche la mise en ligne
   automatique. Deux façons acceptables (`main` n'est pas protégée) :
   - pousser directement sur `main` ; **ou**
   - si l'environnement impose une branche de travail, ouvrir la Pull Request
     **puis la fusionner toi-même** dans `main` dans la foulée (aucune revue
     n'est requise).
3. **Ne t'arrête pas pour demander « veux-tu que je crée / fusionne la PR ?».**
   Va jusqu'au bout : la modif doit se retrouver sur `main` sans action de Cloé.
4. À la fin, dis-lui simplement que c'est en ligne (ou le sera dans ~2 min).

> Seule exception : une modification du **backend PHP** (`backend/`) ne se
> déploie pas toute seule (envoi FTP manuel, cf. plus bas). Dans ce cas, écris le
> code mais **préviens** au lieu de publier.

## 🚀 Mettre en ligne (déploiement)

**Le plus simple, et sans rien installer : passer par GitHub.**

1. Faire la modification (ou demander à Claude de la faire).
2. La faire arriver sur la branche `main` (Claude : commit + push, ou fusion de
   la Pull Request).
3. **C'est tout.** Le workflow « Déploiement FTP (OVH) » build le site et
   l'envoie en FTP sur OVH tout seul. En ligne en ~2 minutes.

À la main : onglet **Actions** → « Déploiement FTP (OVH) » → **Run workflow**.

### ⚙️ Réglage à faire UNE SEULE FOIS sur GitHub

1. Dépôt **CloeBeauty** → **Settings** → **Secrets and variables** → **Actions**
   → **New repository secret**.
2. Name : `FTP_PASSWORD` — Secret : le mot de passe FTP OVH.
3. Enregistrer. Terminé.

*(Hôte `ftp.chcl8760.odns.fr` et utilisateur `chcl8760` par défaut. Pour les
changer : variables `FTP_HOST` / `FTP_USER` / `FTP_REMOTE_PATH`.)*

### Déploiement depuis un PC (solution de secours)

```bash
cp deploy.config.example.json deploy.config.json   # y mettre les identifiants
npm run deploy
```

> ⚠️ **Le FTP ne marche PAS depuis Claude sur le web** (port 21 bloqué dans le
> cloud). Depuis Claude, on déploie via GitHub uniquement.

## ⚠️ Le contenu et les images sont dans la BASE DE DONNÉES, pas dans le code

Les textes, photos, avis, partenaires… sont stockés côté serveur (API PHP + base)
et modifiés via le **mode admin** du site (voir `ADMIN.md`). Ils ne sont donc
**pas** dans ce dépôt. Redéployer le site n'efface pas le contenu (la base n'est
pas touchée).

## 🌿 Le backend PHP (dossier `backend/`)

- Le vrai fichier de config `backend/api/configsite.php` (identifiants base +
  mot de passe admin) est **ignoré par git** — modèle : `configsite.example.php`.
- Toute modification d'un fichier `backend/api/*.php` doit être remontée **par
  FTP manuel** dans `/public_html/backend/api/` : le workflow ci-dessus ne
  déploie **que** le front et ne touche pas au backend.

## Pour Cloé (en clair)

Pour changer un texte, une photo, un avis… : **utilise le mode admin du site**
(F11 sur ordi, 5 tapes sur le logo sur mobile, ou `#admin` dans l'adresse —
détails dans `ADMIN.md`). Pas besoin de Claude pour ça.

Pour changer le site lui-même (mise en page, nouvelles sections, corrections) :
**demande à Claude.** Une fois validé et poussé sur `main`, le site se met à
jour tout seul. Le seul réglage à faire une fois : ajouter le secret
`FTP_PASSWORD` sur GitHub.
