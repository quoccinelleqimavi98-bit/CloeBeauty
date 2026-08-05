import { CommonModule } from '@angular/common';
import { Component, HostListener, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

/**
 * ====================================================================
 *  MODE ADMIN — Cloe Chaudron Beauty
 * --------------------------------------------------------------------
 *  Permet de modifier tout le contenu du site (textes + images) puis
 *  de l'enregistrer dans la base de données via l'API PHP.
 *
 *  Ouverture du mode admin : appuyer sur la touche  F11.
 *
 *  🔒 Le mot de passe n'est PAS stocké dans ce code : il est saisi par
 *  l'utilisateur puis vérifié côté serveur (adminlogin.php / configsite.php).
 *  Voir ADMIN.md.
 * ====================================================================
 */
const ASSET_BASE = 'https://cloechaudronbeauty.com/backend/assets/';
// URL relative = même origine que le site → aucun problème CORS (le site et
// /backend/ sont servis par le même domaine).
const API_BASE = '/backend/api/';

interface PartnerType {
  key: string; // clé dans data (domains, weddings...)
  folder: string; // dossier des images
  ext: string; // extension des images
  tradPrefix: string; // préfixe des clés de description (domain, wedding...)
  label: string;
}

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.scss',
})
export class AdminComponent {
  /** Références vivantes vers toutes les données du site (modifiées en place). */
  @Input() data: any;

  assetBase = ASSET_BASE;
  apiBase = API_BASE;

  open = false;
  authed = false;
  passwordInput = '';
  loginError = '';
  loggingIn = false;
  /** Mot de passe saisi (gardé en mémoire pour la session, jamais codé en dur). */
  private adminPassword = '';

  lang: 'fr' | 'en' = 'fr';
  activeTab = 'menu';

  tabs = [
    { id: 'menu', label: 'Menu' },
    { id: 'home', label: 'Accueil' },
    { id: 'gallery', label: 'Galerie' },
    { id: 'avis', label: 'Avis' },
    { id: 'services', label: 'Prestations' },
    { id: 'faq', label: 'FAQ' },
    { id: 'partners', label: 'Partenaires' },
    { id: 'footer', label: 'Pied de page' },
    { id: 'form', label: 'Formulaire' },
    { id: 'images', label: 'Images du site' },
    { id: 'settings', label: 'Réglages' },
    { id: 'texts', label: 'Tous les textes' },
  ];

  /**
   * Images "en dur" du gabarit, rendues modifiables via la table d'override
   * `data.images` (clé -> nom de fichier). Tant qu'une clé est vide, l'image
   * d'origine `def` est utilisée.
   */
  siteImages: { key: string; label: string; def: string; video?: boolean }[] = [
    { key: 'logo_main', label: 'Logo (en-tête)', def: 'newlogo.png' },
    { key: 'logo_footer', label: 'Logo (pied de page)', def: 'newmono.png' },
    { key: 'home_intro', label: 'Accueil — photo d’introduction', def: '0.jpg' },
    { key: 'about_main', label: 'À propos — photo principale', def: '26.jpg' },
    { key: 'about_vision', label: 'À propos — photo « Ma vision »', def: '27.jpg' },
    { key: 'products', label: 'À propos — photo « Produits »', def: 'produits2.jpg' },
    { key: 'services_main', label: 'Prestations — photo', def: '30.jpg' },
    { key: 'contact_main', label: 'Contact — photo', def: '29.jpg' },
    { key: 'hero_video_landscape', label: 'Accueil — vidéo (ordinateur)', def: 'vid1.mp4', video: true },
    { key: 'hero_video_portrait', label: 'Accueil — vidéo (mobile)', def: 'vid2.mp4', video: true },
  ];

  partnerTypes: PartnerType[] = [
    { key: 'domains', folder: 'domains', ext: 'jpg', tradPrefix: 'domain', label: 'Domaines' },
    { key: 'weddings', folder: 'weddings', ext: 'png', tradPrefix: 'wedding', label: 'Robes / Créateurs' },
    { key: 'photographers', folder: 'photographers', ext: 'jpg', tradPrefix: 'photographer', label: 'Photographes' },
    { key: 'decos', folder: 'decos', ext: 'jpg', tradPrefix: 'deco', label: 'Décoration' },
  ];

  /**
   * Textes "en dur" du gabarit qui ont été rendus modifiables.
   * Le gabarit utilise `trads[trad].cle || valeur-par-defaut`, on injecte
   * donc ici les valeurs actuelles pour qu'elles apparaissent à l'édition.
   */
  extraTextDefaults: { [key: string]: { fr: string; en: string; label: string } } = {
    hero: { fr: 'Là où beauté et élégance se rencontrent.', en: 'Where Beauty Meets Elegance.', label: 'Accueil — phrase d’accroche' },
    welcome: { fr: 'Bienvenue', en: 'Welcome', label: 'Accueil — bandeau "Bienvenue"' },
    my_approach: { fr: 'Ma vision', en: 'My approach', label: 'À propos — titre "Ma vision"' },
    services_btn: { fr: 'PRESTATIONS', en: 'SERVICES', label: 'À propos — bouton Prestations' },
    the_services: { fr: 'Les prestations', en: 'The services', label: 'Prestations — bandeau' },
    bridal_exp_title: { fr: "L'expérience de la mariée", en: 'The bridal experience', label: 'Prestations — titre expérience' },
    bridal_exp_sub1: { fr: 'Une communication personnalisée', en: 'A personalized communication', label: 'Prestations — sous-titre 1' },
    bridal_exp_sub2: { fr: "Une expérience beauté d'exception", en: 'An exceptional beauty experience', label: 'Prestations — sous-titre 2' },
    bridal_services_title: { fr: 'Mes Prestations Mariées', en: 'Bridal Services', label: 'Prestations — titre Mariées' },
    guest_services_title: { fr: 'Mes Prestations Invitées', en: 'Guest Services', label: 'Prestations — titre Invitées' },
    packages_note: {
      fr: "Tous les forfaits sont bien entendu disponibles pour toutes les mariées et invitées, quels que soient leur style, leur couple ou leur histoire. J’ai à cœur d’accompagner chaque femme avec douceur, écoute et respect.",
      en: 'All packages are of course available to all brides and guests, regardless of their style, partner, or story. I am deeply committed to supporting each woman with kindness, attentiveness, and respect.',
      label: 'Prestations — note bas de page',
    },
    faq_title: { fr: 'Questions & réponses', en: 'Questions & help', label: 'FAQ — titre' },
    get_in_touch: { fr: 'Prenez contact', en: 'Get in touch', label: 'Contact — bandeau' },
    shall_we_begin: { fr: 'On commence ?', en: 'Shall we begin ?', label: 'Contact — "On commence ?"' },
    required_field: { fr: 'CHAMP OBLIGATOIRE', en: 'REQUIRED FIELD', label: 'Contact — mention champ obligatoire' },
    submit_btn: { fr: 'ENVOYER', en: 'SUBMIT', label: 'Contact — bouton Envoyer' },
  };

  /** Libellés lisibles pour les clés de traduction connues. */
  tradLabels: { [key: string]: string } = {
    meet_the_artist: "Accueil — Rencontrez l'artiste",
    accueil_0_0: 'Accueil — paragraphe 1',
    accueil_0_1: 'Accueil — paragraphe 2',
    accueil_0_2: 'Accueil — paragraphe 3',
    accueil_0_3: 'Accueil — paragraphe 4',
    learn_more_approach: 'Accueil — lien "en savoir plus"',
    take_a_look_around: 'Accueil — bandeau galerie',
    explore_the_gallery: 'Portfolio — bandeau',
    behind_the_brush: 'À propos — bandeau',
    about_0: 'À propos — paragraphe 1',
    about_1: 'À propos — paragraphe 2',
    about_2: 'À propos — paragraphe 3',
    approach_0: 'Ma vision — paragraphe 1',
    approach_1: 'Ma vision — paragraphe 2',
    products: 'À propos — titre Produits',
    products_0: 'Produits — ligne 1',
    products_1: 'Produits — ligne 2',
    products_2: 'Produits — ligne 3',
    products_3: 'Produits — ligne 4',
    kind_words: 'Accueil — titre Avis',
    glow_avis: 'Avis — texte glow',
    bridal_0: 'Prestations — texte 1',
    bridal_1: 'Prestations — texte 2',
    contact_0: 'Contact — texte 1',
    contact_1: 'Contact — texte 2',
    footer: 'Pied de page — description',
    inquire: 'Pied de page — bouton',
    domains: 'Partenaires — titre Domaines',
    domains_0: 'Partenaires — intro Domaines',
    weddings: 'Partenaires — titre Créateurs',
    weddings_0: 'Partenaires — intro Créateurs',
    photographers: 'Partenaires — titre Photographes',
    photographers_0: 'Partenaires — intro Photographes',
    decos: 'Partenaires — titre Déco',
    decos_0: 'Partenaires — intro Déco',
  };

  saving = false;
  saveStatus: '' | 'ok' | 'error' = '';
  uploadingKey: string | null = null;
  cacheBust: { [path: string]: number } = {};

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    // Reprise de session : le mot de passe (déjà validé) est conservé le temps
    // de l'onglet pour pouvoir enregistrer sans redemander la connexion.
    try {
      const pw = sessionStorage.getItem('ccb_admin_pw');
      if (pw) {
        this.adminPassword = pw;
        this.authed = true;
      }
    } catch {}
    // Ouverture par l'URL (#admin) — pratique sur téléphone.
    if (typeof location !== 'undefined' && location.hash === '#admin') {
      this.open = true;
    }
  }

  // Les données arrivent de façon asynchrone : on initialise les textes
  // "en dur" dès qu'elles sont disponibles et que l'on est déjà connecté.
  ngOnChanges(): void {
    if (this.authed) this.seedExtraTexts();
  }

  // ----------------------------------------------------------------
  //  Ouverture / connexion
  //  - Ordinateur : touche F11
  //  - Téléphone : URL se terminant par #admin, ou 5 appuis sur le logo
  // ----------------------------------------------------------------
  @HostListener('window:keydown', ['$event'])
  onKey(event: KeyboardEvent) {
    if (event.key === 'F11') {
      event.preventDefault();
      this.open = true;
    }
  }

  @HostListener('window:hashchange')
  onHashChange() {
    if (typeof location !== 'undefined' && location.hash === '#admin') {
      this.open = true;
    }
  }

  /** Ouvre le panneau (appelé par le geste « 5 appuis sur le logo »). */
  openPanel() {
    this.open = true;
  }

  login() {
    const pw = this.passwordInput;
    if (!pw || this.loggingIn) return;
    this.loggingIn = true;
    this.loginError = '';
    // Le mot de passe est vérifié uniquement côté serveur.
    this.http.post<any>(this.apiBase + 'adminlogin.php', { password: pw }).subscribe({
      next: (res) => {
        this.loggingIn = false;
        if (res && res.status === 'ok') {
          this.adminPassword = pw;
          this.authed = true;
          this.passwordInput = '';
          this.seedExtraTexts();
          try {
            sessionStorage.setItem('ccb_admin_pw', pw);
          } catch {}
        } else {
          this.loginError = 'Mot de passe incorrect';
        }
      },
      error: (err) => {
        this.loggingIn = false;
        this.loginError =
          err && err.status === 403
            ? 'Mot de passe incorrect'
            : 'Connexion au serveur impossible';
      },
    });
  }

  logout() {
    this.authed = false;
    this.open = false;
    this.adminPassword = '';
    try {
      sessionStorage.removeItem('ccb_admin_pw');
    } catch {}
  }

  close() {
    this.open = false;
  }

  /** Ajoute les textes "en dur" dans trads s'ils n'existent pas encore. */
  seedExtraTexts() {
    if (!this.data) return;
    // Structures optionnelles : on s'assure qu'elles existent pour l'édition.
    if (!this.data.images) this.data.images = {};
    if (!this.data.settings) {
      this.data.settings = { contactEmail: '', instagramUrl: '', instagramHandle: '' };
    }
    if (!this.data.carousel) this.data.carousel = [];
    if (!this.data.trads) return;
    for (const key of Object.keys(this.extraTextDefaults)) {
      const def = this.extraTextDefaults[key];
      if (this.data.trads.fr[key] === undefined) this.data.trads.fr[key] = def.fr;
      if (this.data.trads.en[key] === undefined) this.data.trads.en[key] = def.en;
    }
  }

  // ----------------------------------------------------------------
  //  Helpers
  // ----------------------------------------------------------------
  asset(path: string): string {
    return this.assetBase + this.bust(path);
  }

  bust(path: string): string {
    const t = this.cacheBust[path];
    return t ? path + (path.indexOf('?') >= 0 ? '&' : '?') + 't=' + t : path;
  }

  pageOptions(): string[] {
    return this.data && this.data.topmenu ? this.data.topmenu.map((m: any) => m.en) : [];
  }

  // Icônes de prestations : un nom sans extension reçoit « .png » (compatibilité
  // avec l'existant) ; un fichier téléversé garde son extension.
  iconName(v: string): string {
    if (!v) return '';
    return v.indexOf('.') >= 0 ? v : v + '.png';
  }

  // Images "en dur" du site, surchargées via data.images (clé -> fichier).
  siteImgName(key: string, def: string): string {
    const v = this.data && this.data.images ? this.data.images[key] : '';
    return v && v.length ? v : def;
  }

  uploadSiteImage(key: string, ev: Event) {
    if (!this.data.images) this.data.images = {};
    this.uploadInto(this.data.images, key, '', ev, 'site_' + key);
  }

  // Carrousel de badges : le src est une URL complète (souvent externe), donc
  // après upload on stocke l'URL complète (base assets + nom de fichier).
  uploadCarousel(item: any, ev: Event, fieldId: string) {
    const input = ev.target as HTMLInputElement;
    const file = input.files && input.files[0];
    if (!file) return;
    this.doUpload(file, '', '', fieldId).then((name) => {
      if (name) item.src = this.assetBase + name;
      input.value = '';
    });
  }

  tradKeys(): string[] {
    if (!this.data || !this.data.trads) return [];
    return Object.keys(this.data.trads[this.lang]);
  }

  tradLabel(key: string): string {
    if (this.tradLabels[key]) return this.tradLabels[key];
    if (this.extraTextDefaults[key]) return this.extraTextDefaults[key].label;
    return key;
  }

  isLongText(key: string): boolean {
    const v = this.data?.trads?.[this.lang]?.[key];
    return typeof v === 'string' && v.length > 55;
  }

  // ----------------------------------------------------------------
  //  Gestion des listes (ajout / suppression / déplacement)
  // ----------------------------------------------------------------
  addItem(arr: any[], item: any) {
    if (arr) arr.push(item);
  }

  removeItem(arr: any[], i: number) {
    if (arr && confirm('Supprimer cet élément ?')) arr.splice(i, 1);
  }

  moveUp(arr: any[], i: number) {
    if (arr && i > 0) {
      const tmp = arr[i - 1];
      arr[i - 1] = arr[i];
      arr[i] = tmp;
    }
  }

  moveDown(arr: any[], i: number) {
    if (arr && i < arr.length - 1) {
      const tmp = arr[i + 1];
      arr[i + 1] = arr[i];
      arr[i] = tmp;
    }
  }

  // ----- Services (tableaux parallèles fr / en) -----
  addService(group: string) {
    const s = this.data.services[group];
    s.fr.push(['', 'Nouveau forfait', '', '', '']);
    s.en.push(['', 'New package', '', '', '']);
  }

  removeService(group: string, i: number) {
    if (!confirm('Supprimer ce forfait ?')) return;
    const s = this.data.services[group];
    s.fr.splice(i, 1);
    s.en.splice(i, 1);
  }

  moveService(group: string, i: number, dir: number) {
    const s = this.data.services[group];
    const j = i + dir;
    if (j < 0 || j >= s.fr.length) return;
    [s.fr[i], s.fr[j]] = [s.fr[j], s.fr[i]];
    [s.en[i], s.en[j]] = [s.en[j], s.en[i]];
  }

  // ----- Partenaires (image + description indexées) -----
  partnerDescKey(pt: PartnerType, i: number): string {
    return pt.tradPrefix + '_' + i;
  }

  addPartner(pt: PartnerType) {
    const arr = this.data[pt.key];
    const i = arr.length;
    arr.push({ nom: '', site: '', ville: '', city: '' });
    this.data.trads.fr[pt.tradPrefix + '_' + i] = '';
    this.data.trads.en[pt.tradPrefix + '_' + i] = '';
  }

  removeLastPartner(pt: PartnerType) {
    const arr = this.data[pt.key];
    if (!arr.length || !confirm('Supprimer le dernier partenaire ?')) return;
    const i = arr.length - 1;
    arr.splice(i, 1);
    delete this.data.trads.fr[pt.tradPrefix + '_' + i];
    delete this.data.trads.en[pt.tradPrefix + '_' + i];
  }

  // ----------------------------------------------------------------
  //  Upload d'images
  // ----------------------------------------------------------------
  /** Upload puis affecte obj[key] = nom de fichier renvoyé. */
  uploadInto(obj: any, key: string | number, folder: string, ev: Event, fieldId: string) {
    const input = ev.target as HTMLInputElement;
    const file = input.files && input.files[0];
    if (!file) return;
    this.doUpload(file, folder, '', fieldId).then((name) => {
      if (name) {
        obj[key] = name;
        this.cacheBust[(folder ? folder + '/' : '') + name] = Date.now();
      }
      input.value = '';
    });
  }

  /** Upload en écrasant un fichier précis (images indexées des partenaires). */
  uploadOverwrite(folder: string, filename: string, ev: Event, fieldId: string) {
    const input = ev.target as HTMLInputElement;
    const file = input.files && input.files[0];
    if (!file) return;
    this.doUpload(file, folder, filename, fieldId).then((name) => {
      if (name) this.cacheBust[(folder ? folder + '/' : '') + filename] = Date.now();
      input.value = '';
    });
  }

  /**
   * Redimensionne / compresse une image dans le navigateur AVANT l'upload.
   * Évite les échecs (erreurs "CORS" masquant en réalité un 413) dus aux
   * photos de téléphone trop lourdes. Les vidéos et GIF ne sont pas touchés.
   */
  private prepareUpload(file: File): Promise<File> {
    if (!file.type.startsWith('image/') || file.type === 'image/gif') {
      return Promise.resolve(file);
    }
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        const maxDim = 1920;
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;
        if (width > maxDim || height > maxDim) {
          const r = Math.min(maxDim / width, maxDim / height);
          width = Math.round(width * r);
          height = Math.round(height * r);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const png = file.type === 'image/png';
        const type = png ? 'image/png' : 'image/jpeg';
        const ext = png ? 'png' : 'jpg';
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }
            const base = file.name.replace(/\.[^.]+$/, '') || 'image';
            resolve(new File([blob], base + '.' + ext, { type }));
          },
          type,
          0.85,
        );
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(file); // format non décodable (ex: HEIC sur desktop) : on envoie tel quel
      };
      img.src = url;
    });
  }

  private doUpload(
    file: File,
    folder: string,
    filename: string,
    fieldId: string,
  ): Promise<string | null> {
    this.uploadingKey = fieldId;
    return this.prepareUpload(file).then(
      (prepared) =>
        new Promise<string | null>((resolve) => {
          const form = new FormData();
          form.append('file', prepared, prepared.name);
          form.append('folder', folder);
          if (filename) form.append('filename', filename);
          form.append('password', this.adminPassword);
          this.http.post<any>(this.apiBase + 'upload_asset.php', form).subscribe({
            next: (res) => {
              this.uploadingKey = null;
              if (res && res.status === 'ok') {
                resolve(res.filename || filename);
              } else {
                alert("Échec de l'upload : " + (res && res.message ? res.message : 'erreur'));
                resolve(null);
              }
            },
            error: (err) => {
              this.uploadingKey = null;
              if (err && err.status === 403) {
                this.handleForbidden();
              } else if (err && err.status === 413) {
                alert('Image trop volumineuse pour le serveur. Réessayez (elle est pourtant compressée) ou augmentez la limite (.user.ini).');
              } else {
                alert("Échec de l'upload de l'image (voir la console).");
                console.error(err);
              }
              resolve(null);
            },
          });
        }),
    );
  }

  // ----------------------------------------------------------------
  //  Sauvegarde
  // ----------------------------------------------------------------
  save() {
    if (this.saving) return;
    // On ne persiste pas ce que l'internaute aurait tapé dans le formulaire.
    if (this.data && this.data.fields) {
      this.data.fields.forEach((f: any) => (f.model = ''));
    }
    this.saving = true;
    this.saveStatus = '';
    const payload = { ...this.data, password: this.adminPassword };
    this.http.post<any>(this.apiBase + 'setccbdata.php', payload).subscribe({
      next: () => {
        this.saving = false;
        this.saveStatus = 'ok';
        setTimeout(() => (this.saveStatus = ''), 4000);
      },
      error: (err) => {
        this.saving = false;
        this.saveStatus = 'error';
        if (err && err.status === 403) this.handleForbidden();
        console.error(err);
      },
    });
  }

  /** Mot de passe refusé par le serveur : on redemande la connexion. */
  private handleForbidden() {
    alert('Accès refusé par le serveur. Merci de vous reconnecter.');
    this.logout();
    this.open = true;
  }
}
