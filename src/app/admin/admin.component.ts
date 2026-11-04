import { CommonModule } from '@angular/common';
import { Component, HostListener, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';

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

/** Extensions de photos acceptées par le serveur (upload_asset.php). */
const PHOTO_EXT = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'heic', 'heif'];

/** Photo choisie pour la galerie, en attente d'envoi. */
interface PendingPhoto {
  id: number;
  file: File;
  url: string; // aperçu local (blob:)
  status: 'wait' | 'sending' | 'ok' | 'error';
  error?: string;
  retry?: boolean; // l'erreur peut-elle se régler en réessayant ?
  noPreview?: boolean; // aperçu impossible (ex. HEIC sur ordinateur)
}

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
  imports: [CommonModule, FormsModule, DragDropModule],
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

  // ----------------------------------------------------------------
  //  Galerie : réorganisation par glisser-déposer (souris + tactile)
  // ----------------------------------------------------------------
  /** État de l'enregistrement automatique de l'ordre des photos. */
  orderStatus: '' | 'saving' | 'ok' | 'error' = '';
  private orderSaveTimer: any = null;

  /** Une photo a été lâchée : on déplace l'élément dans le tableau puis on enregistre. */
  dropPhoto(event: CdkDragDrop<any[]>) {
    if (event.previousIndex === event.currentIndex) return;
    // Modification en place : la galerie publique utilise le même tableau.
    moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    this.scheduleOrderSave();
  }

  // ----- Ajout de plusieurs photos (sélection multiple ou glisser depuis l'ordinateur) -----
  /** Photos choisies, en attente d'envoi, par galerie ('portfolio' / 'topportfolio'). */
  pending: { [folder: string]: PendingPhoto[] } = { portfolio: [], topportfolio: [] };
  /** Galerie en cours d'envoi (un seul envoi à la fois). */
  sendingFolder: string | null = null;
  sendDone = 0;
  sendTotal = 0;
  /** Bilan du dernier envoi, par galerie. */
  sendSummary: { [folder: string]: string } = {};
  /** Galerie survolée par des fichiers glissés depuis l'ordinateur. */
  dragOverFolder: string | null = null;
  private pendingSeq = 0;

  pickPhotos(folder: string, ev: Event) {
    const input = ev.target as HTMLInputElement;
    const files = input.files ? Array.from(input.files) : [];
    input.value = '';
    this.queueFiles(folder, files);
  }

  private hasFiles(ev: DragEvent): boolean {
    const types = ev.dataTransfer ? Array.from(ev.dataTransfer.types || []) : [];
    return types.indexOf('Files') >= 0;
  }

  onFilesDragOver(folder: string, ev: DragEvent) {
    if (!this.hasFiles(ev) || this.sendingFolder) return;
    ev.preventDefault();
    if (ev.dataTransfer) ev.dataTransfer.dropEffect = 'copy';
    this.dragOverFolder = folder;
  }

  onFilesDragLeave(folder: string, ev: DragEvent) {
    const zone = ev.currentTarget as HTMLElement;
    const to = ev.relatedTarget as Node | null;
    if (to && zone && zone.contains(to)) return; // on reste dans la zone
    if (this.dragOverFolder === folder) this.dragOverFolder = null;
  }

  onFilesDrop(folder: string, ev: DragEvent) {
    ev.preventDefault();
    this.dragOverFolder = null;
    if (this.sendingFolder) return;
    const files = ev.dataTransfer ? Array.from(ev.dataTransfer.files || []) : [];
    this.queueFiles(folder, files);
  }

  /**
   * Fichier lâché à côté de la zone d'ajout : on empêche le navigateur
   * d'ouvrir la photo à la place du site (ce qui fermerait l'admin).
   */
  @HostListener('window:dragover', ['$event'])
  @HostListener('window:drop', ['$event'])
  preventFileOpen(ev: DragEvent) {
    if (this.open && this.authed && this.hasFiles(ev)) ev.preventDefault();
  }

  private queueFiles(folder: string, files: File[]) {
    if (!files.length || this.sendingFolder) return;
    const list = this.pending[folder] || (this.pending[folder] = []);
    this.sendSummary[folder] = '';
    for (const file of files) {
      const ext = (file.name.split('.').pop() || '').toLowerCase();
      const isImage = file.type.startsWith('image/') || PHOTO_EXT.indexOf(ext) >= 0;
      const item: PendingPhoto = {
        id: ++this.pendingSeq,
        file,
        url: isImage ? URL.createObjectURL(file) : '',
        status: 'wait',
        noPreview: !isImage,
      };
      if (!isImage) {
        item.status = 'error';
        item.error = "Format non accepté : ce fichier n'est pas une photo (JPG, PNG, WEBP, HEIC…).";
      }
      list.push(item);
    }
  }

  removePending(folder: string, item: PendingPhoto) {
    const list = this.pending[folder];
    const i = list.indexOf(item);
    if (i >= 0) list.splice(i, 1);
    if (item.url) URL.revokeObjectURL(item.url);
    if (!list.length) this.sendSummary[folder] = '';
  }

  clearPending(folder: string) {
    for (const p of this.pending[folder] || []) if (p.url) URL.revokeObjectURL(p.url);
    this.pending[folder] = [];
    this.sendSummary[folder] = '';
  }

  countPending(folder: string, status: PendingPhoto['status']): number {
    return (this.pending[folder] || []).filter((p) => p.status === status).length;
  }

  canRetry(folder: string): boolean {
    return (this.pending[folder] || []).some((p) => p.status === 'error' && p.retry);
  }

  retryFailed(folder: string) {
    for (const p of this.pending[folder] || []) {
      if (p.status === 'error' && p.retry) {
        p.status = 'wait';
        p.error = '';
      }
    }
    this.sendSummary[folder] = '';
  }

  /**
   * Envoie les photos en attente une par une (dans l'ordre affiché), puis les
   * place TOUTES AU DÉBUT de la galerie, dans ce même ordre. Les photos déjà
   * présentes gardent exactement leur ordre (elles sont seulement décalées).
   * Une photo en erreur n'empêche pas l'envoi des suivantes.
   */
  async sendPending(arr: any[], folder: string) {
    const list = this.pending[folder] || [];
    const toSend = list.filter((p) => p.status === 'wait');
    if (!arr || !toSend.length || this.sendingFolder) return;
    this.sendingFolder = folder;
    this.sendDone = 0;
    this.sendTotal = toSend.length;
    this.sendSummary[folder] = '';
    const names: string[] = [];
    let forbidden = false;
    try {
      for (const item of toSend) {
        item.status = 'sending';
        const res = await this.uploadQuiet(item.file, folder);
        if (res.name) {
          item.status = 'ok';
          names.push(res.name);
        } else {
          item.status = 'error';
          item.error = res.error;
          item.retry = !!res.retry; // utile seulement pour un souci de connexion / serveur
          if (res.forbidden) {
            forbidden = true;
            break;
          }
        }
        this.sendDone++;
      }
    } finally {
      this.sendingFolder = null;
    }
    // Les photos envoyées quittent la liste d'attente (elles sont dans la galerie).
    for (const p of list.filter((x) => x.status === 'ok')) this.removePending(folder, p);
    for (const p of list) if (p.status === 'sending') p.status = 'wait';
    const failed = this.countPending(folder, 'error');
    const ok = names.length;
    const parts: string[] = [];
    if (ok) parts.push(`✔ ${ok} photo${ok > 1 ? 's' : ''} ajoutée${ok > 1 ? 's' : ''} au début de la galerie`);
    if (failed) parts.push(`✖ ${failed} photo${failed > 1 ? 's' : ''} non envoyée${failed > 1 ? 's' : ''} (voir ci-dessous)`);
    this.sendSummary[folder] = parts.join(' · ');
    if (ok) {
      // Insertion en tête, en un seul bloc. Même tableau que la galerie publique.
      arr.unshift(...names);
      if (!forbidden) this.scheduleOrderSave();
    }
    if (forbidden) this.handleForbidden();
  }

  /** Enregistre l'ordre peu après le dernier déplacement (évite les envois en rafale). */
  private scheduleOrderSave() {
    this.orderStatus = 'saving';
    clearTimeout(this.orderSaveTimer);
    this.orderSaveTimer = setTimeout(() => {
      if (this.saving) {
        // Un enregistrement est déjà en cours : on réessaie juste après.
        this.scheduleOrderSave();
        return;
      }
      this.save((ok) => {
        this.orderStatus = ok ? 'ok' : 'error';
        if (ok) setTimeout(() => (this.orderStatus === 'ok' ? (this.orderStatus = '') : null), 3000);
      });
    }, 600);
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

  /** Envoie une photo sans fenêtre d'alerte ; renvoie le nom du fichier ou un message clair. */
  private uploadQuiet(
    file: File,
    folder: string,
  ): Promise<{ name?: string; error?: string; forbidden?: boolean; retry?: boolean }> {
    const friendly = (msg: string): string => {
      if (/type|format/i.test(msg)) {
        return 'Format non accepté par le serveur (formats acceptés : JPG, PNG, WEBP, GIF, AVIF, HEIC).';
      }
      if (/volumineux|size/i.test(msg)) return 'Photo trop lourde pour le serveur.';
      return 'Refusée par le serveur : ' + msg;
    };
    return this.prepareUpload(file).then(
      (prepared) =>
        new Promise((resolve) => {
          const form = new FormData();
          form.append('file', prepared, prepared.name);
          form.append('folder', folder);
          form.append('password', this.adminPassword);
          this.http.post<any>(this.apiBase + 'upload_asset.php', form).subscribe({
            next: (res) => {
              if (res && res.status === 'ok' && res.filename) resolve({ name: res.filename });
              else resolve({ error: friendly((res && res.message) || 'erreur inconnue') });
            },
            error: (err) => {
              const status = err ? err.status : 0;
              const msg = err && err.error && err.error.message;
              if (status === 403) {
                resolve({ forbidden: true, error: 'Session expirée : reconnectez-vous puis réessayez.' });
              } else if (status === 413) {
                resolve({ error: 'Photo trop lourde pour le serveur, même après compression.' });
              } else if (msg) {
                resolve({ error: friendly(msg) });
              } else if (!status) {
                resolve({ error: 'Connexion perdue pendant l’envoi. Vérifiez internet puis réessayez.', retry: true });
              } else {
                resolve({ error: `Erreur du serveur (code ${status}). Réessayez.`, retry: true });
              }
            },
          });
        }),
    );
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
  save(done?: (ok: boolean) => void) {
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
        if (done) done(true);
      },
      error: (err) => {
        this.saving = false;
        this.saveStatus = 'error';
        if (err && err.status === 403) this.handleForbidden();
        console.error(err);
        if (done) done(false);
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
