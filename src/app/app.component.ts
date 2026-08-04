import { CommonModule } from '@angular/common';
import {
  Component,
  HostListener,
  isDevMode,
  Renderer2,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ScrollAppearDirective } from './scroll-appear.directive';
import { CalendarComponent } from './calendar/calendar.component';
import { AdminComponent } from './admin/admin.component';

@Component({
  selector: 'app-root',
  imports: [
    CommonModule,
    FormsModule,
    ScrollAppearDirective,
    CalendarComponent,
    AdminComponent,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  @ViewChild('calendar') calendar!: CalendarComponent;
  @ViewChild(AdminComponent) adminPanel?: AdminComponent;

  // Geste secret (mobile) : 5 appuis rapides sur le logo ouvrent le mode admin.
  private logoTaps = 0;
  private lastLogoTap = 0;

  // URL relative = même origine que le site (évite tout problème CORS).
  baseapi = '/backend/api/';
  topmenu: any;
  galleries: any;
  lists: any;
  fields: any;
  listeavis: any;
  services: any;
  faq: any;
  trads: any;
  domains: any;
  weddings: any;
  photographers: any;
  decos: any;
  images: any = {};
  // Réglages sensibles chargés depuis la BDD (jamais dans le code).
  settings: any = { contactEmail: '', instagramUrl: '', instagramHandle: '' };
  prestaopened = -1;

  // Références vers toutes les données du site, transmises au mode admin.
  adminData: any;

  onetoten = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  trad = 'fr';

  portfolio: any = [];
  topportfolio: any = [];
  page: any;

  successmail = false;
  avisClicked = 0;
  public innerWidth: any = window.outerWidth;
  public innerHeight: any = window.outerHeight;
  paysage = true;
  bigscreen = false;

  showMenu = false;
  userId: any;
  visibility = true;
  connected = 0;
  lastSentTime: number = 0;
  intervalTrack: any;
  isMobile: boolean = false;

  timeonapage = 0;
  nbmail = 0;
  datesArray: any = [];
  isAtStart = true;
  isAtEnd = false;

  constructor(
    private http: HttpClient,
    private renderer: Renderer2,
  ) {
    this.lastSentTime = Date.now();
    this.timeonapage = Date.now();
  }

  carouselItems = [
    {
      src: 'https://cloechaudronbeauty.com/backend/assets/vu01.png',
      alt: 'Badge 1',
      linkIndex: 0,
    },
    {
      src: 'https://cloechaudronbeauty.com/backend/assets/vu02.png',
      alt: 'Badge 2',
      linkIndex: 1,
    },
    {
      src: 'https://cloechaudronbeauty.com/backend/assets/vu03.png',
      alt: 'Badge 3',
      linkIndex: 2,
    },
    {
      src: 'https://wedvibes.media/wp-content/uploads/2025/01/WEDVIBES.MEDIA-community-badge-2025-6.png',
      alt: 'Badge 4',
      linkIndex: 3,
    },
    {
      src: 'https://cloechaudronbeauty.com/backend/assets/vu04.png',
      alt: 'Badge 5',
      linkIndex: 4,
    },
    {
      src: 'https://cdn1.mariages.net/img/badges/2026/badge-weddingawards_fr_FR.jpg',
      alt: 'Wedding Awards',
      linkIndex: 5,
    },
    {
      src: 'https://cloechaudronbeauty.com/backend/assets/vu10.jpg',
      alt: 'Albe EDITIONS',
      linkIndex: 6,
    },
  ];

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.innerHeight = event.target.innerHeight;
    this.innerWidth = event.target.innerWidth;

    if (
      event.target.innerHeight > event.target.innerWidth &&
      event.target.innerWidth < 600
    )
      this.paysage = false;
    else this.paysage = true;

    if (event.target.innerWidth > 1300) this.bigscreen = true;
    else this.bigscreen = false;
  }

  ngOnInit(): void {
    this.loadSiteData();
    this.isMobile = this.isMobileDevice();
    let int = setInterval(() => {
      this.innerWidth = window.innerWidth;
      this.innerHeight = window.innerHeight;
      if (isDevMode()) console.log(this.innerWidth, this.innerHeight);
      if (this.innerHeight > this.innerWidth && this.innerWidth < 600)
        this.paysage = false;

      if (this.innerWidth > 1300) this.bigscreen = true;
      else this.bigscreen = false;
      clearInterval(int);
    }, 500);

    this.http
      .get<any>(this.baseapi + 'cloeplanningsite.php?artiste=cloe')
      .subscribe((data) => {
        this.datesArray = data;
        console.log(this.datesArray);
      });
  }

  checkIfWrong(field: any) {
    field.wrong = false;
    let value = field.model;
    if (field.nom == this.fields[1].nom) {
      let rgx = /[a-z-A-Z0-9]+@[a-z-A-Z0-9]+/g;
      if (value.length > 0 && !value.match(rgx)) field.wrong = true;
    }
  }

  cantSendMail() {
    return this.fields.find(
      (field: any) => field.required && field.model == '',
    );
  }

  isMobileDevice(): boolean {
    const userAgent = navigator.userAgent;
    return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
      userAgent.toLowerCase(),
    );
  }

  getPackages() {
    let retour: any = [];
    let mariees = this.services.mariees.fr;
    let invitees = this.services.invitees.fr;

    if (this.trad == 'en') {
      mariees = this.services.mariees.en;
      invitees = this.services.invitees.en;
    }

    mariees.forEach((m: any) => retour.push(m));
    invitees.forEach((i: any) => retour.push(i));

    return retour;
  }

  sendMail() {
    this.nbmail++;
    if (isDevMode()) console.log('sendmail');
    let msg = '';
    this.fields.forEach((field: any) => {
      field.model = field.model.replace('"', "'");
      console.log(field.trad, field.nom, field.model);
      if (field.model != '')
        msg =
          msg +
          (this.trad == 'fr' ? field.trad : field.nom) +
          ' : ' +
          field.model +
          ' \r\n';
    });

    const dataToSend = {
      from: this.fields[2].model,
      subject: this.fields[0].model + ' - ' + this.fields[4].model,
      message: encodeURIComponent(msg),
    };
    if (isDevMode()) console.log(dataToSend);

    const to = (this.settings && this.settings.contactEmail) || '';
    const subject = dataToSend.subject;
    const body = dataToSend.message;

    const mailtoLink = `mailto:${to}?subject=${subject}&body=${body}`;
    window.location.href = mailtoLink;
  }

  cleanFields() {
    this.fields.forEach((f: any) => (f.model = ''));
  }

  openInsta() {
    const url = (this.settings && this.settings.instagramUrl) || '';
    if (url) window.open(url, '_blank');
  }

  openSite(nb: any) {
    if (nb == 0) {
      window.open(
        'https://www.leblogdemadamec.fr/blog-mariage-lifestyle/mariage-couture-a-labbaye-saint-eusebe/',
        '_blank',
      );
    } else if (nb == 1) {
      window.open('https://www.instagram.com/p/CqBidpiMqcn/', '_blank');
    } else if (nb == 2) {
      window.open(
        'https://caratsandcake.com/wedding/selina-and-nick',
        '_blank',
      );
    } else if (nb == 3) {
      window.open(
        'https://wedvibes.media/real-weddings/a-sunlit-wedding-among-the-vineyards-of-southern-france/?fbclid=PAb21jcAOJMItleHRuA2FlbQIxMQBzcnRjBmFwcF9pZA81NjcwNjczNDMzNTI0MjcAAafUsmFS7fWuwyRuGeHrDveP6ClbCvHO97mMNJjJMLGZBPQLj1yRf89hTWrZyg_aem_o9cFXs_rI720gnRPla_vGw&brid=ILWH8RwN-MYwkr0Z5WgiOg',
        '_blank',
      );
    } else if (nb == 4) {
      window.open(
        'https://www.lasoeurdelamariee.com/mariage-dolce-vita-declaration-damour-a-la-mediterranee/',
        '_blank',
      );
    } else if (nb == 5) {
      window.open(
        'https://www.mariages.net/esthetique-coiffure-mariage/cloe-chaudron--e211061',
        '_blank',
      );
    } else if (nb == 6) {
      window.open(
        'https://albe-editions.com/inspiration-aesthetic-of-love-un-mariage-au-chateau-de-taulignan/',
        '_blank',
      );
    }
  }

  clickMenu(menu: any, scroll: any = 0) {
    const now = Date.now();
    const temps = now - this.timeonapage;
    this.timeonapage = now;
    this.page.temps += temps;

    this.successmail = false;
    this.showMenu = false;
    var content: any = document.getElementById('middle-content');
    content.style.opacity = 0;

    let int = setInterval(() => {
      this.page = this.topmenu.find((m: any) => m.en == menu)!;
      if (this.page.en == 'Home') this.addListener();
      window.scrollTo(0, scroll);
      content.style.opacity = 1;
      const elements = document.querySelectorAll('.enter-from-direction');
      elements.forEach((el) => {
        this.renderer.removeClass(el, 'enter-from-direction');
      });
      clearInterval(int);
    }, 600);
  }

  clickPackage(service: any) {
    this.clickMenu('Contact', 1300);
    this.fields.find((field: any) => field.nom == 'Desired Package').model =
      service[1] + ' : ' + service[2];
  }

  addListener() {
    let inter = setInterval(() => {
      clearInterval(inter);
      const swipeDiv = document.getElementById('swipeDiv');
      if (isDevMode()) console.log(swipeDiv);
      if (!swipeDiv) return;

      let startX = 0;
      let startY = 0;
      let distX = 0;
      let distY = 0;
      const threshold = 50; // Distance minimale en pixels pour être considéré comme un glissement
      const restraint = 100; // Distance maximale en pixels pour le déplacement vertical toléré
      const allowedTime = 300; // Temps maximum en millisecondes pour le glissement
      let startTime = 0;

      swipeDiv.addEventListener(
        'touchstart',
        function (e) {
          if (isDevMode()) console.log('touchstart');
          const touchObj = e.changedTouches[0];
          startX = touchObj.pageX;
          startY = touchObj.pageY;
          startTime = new Date().getTime();
        },
        false,
      );

      swipeDiv.addEventListener(
        'touchend',
        (e: any) => {
          if (isDevMode()) console.log('touchend');
          const touchObj = e.changedTouches[0];
          distX = touchObj.pageX - startX; // Distance horizontale parcourue
          distY = touchObj.pageY - startY; // Distance verticale parcourue
          const elapsedTime = new Date().getTime() - startTime; // Temps écoulé
          if (elapsedTime <= allowedTime) {
            // Vérifie si le temps écoulé est dans les limites
            if (Math.abs(distX) >= threshold && Math.abs(distY) <= restraint) {
              // Vérifie si la distance horizontale est suffisante et la distance verticale tolérable
              if (distX < 0) {
                if (this.avisClicked < this.listeavis.length - 1)
                  this.avisClicked++;
              } else if (distX > 0) {
                if (this.avisClicked > 0) this.avisClicked--;
              }
            }
          }
        },
        false,
      );
    }, 1000);
  }

  getDomainTrad(i: number): string {
    return this.trads[this.trad]['domain_' + i];
  }

  getWeddingTrad(i: number): string {
    return this.trads[this.trad]['wedding_' + i];
  }

  getPhotographerTrad(i: number): string {
    return this.trads[this.trad]['photographer_' + i];
  }

  getDecoTrad(i: number): string {
    return this.trads[this.trad]['deco_' + i];
  }

  openLink(link: any) {
    window.open(link, '_blank');
  }

  // URL d'une icône de prestation : un nom sans extension reçoit « .png »
  // (compatibilité avec l'existant) ; un fichier téléversé garde son extension.
  iconSrc(name: string): string {
    const base = 'https://cloechaudronbeauty.com/backend/assets/';
    if (!name) return base;
    return base + (name.indexOf('.') >= 0 ? name : name + '.png');
  }

  // URL d'une image "en dur" du site, surchargeable via le mode admin (images[key]).
  siteImg(key: string, def: string): string {
    const v = this.images ? this.images[key] : '';
    return 'https://cloechaudronbeauty.com/backend/assets/' + (v && v.length ? v : def);
  }

  // 5 appuis rapides sur le logo ouvrent le mode admin (accès sur téléphone).
  secretTap() {
    const now = Date.now();
    this.logoTaps = now - this.lastLogoTap < 800 ? this.logoTaps + 1 : 1;
    this.lastLogoTap = now;
    if (this.logoTaps >= 5) {
      this.logoTaps = 0;
      this.adminPanel?.openPanel();
    }
  }

  loadSiteData() {
    this.http
      .get<any>(this.baseapi + 'getccbdata.php')
      .subscribe((res) => {
        if (isDevMode()) console.log('data:', res);
        this.topmenu = res.topmenu;
        this.galleries = res.galleries;
        this.lists = res.lists;
        this.fields = res.fields;
        this.listeavis = res.listeavis;
        this.services = res.services;
        this.faq = res.faq;
        this.trads = res.trads;
        this.domains = res.domains;
        this.weddings = res.weddings;
        this.photographers = res.photographers;
        this.decos = res.decos;
        this.portfolio = res.portfolio;
        this.topportfolio = res.topportfolio;
        this.images = res.images || {};
        this.settings = { ...this.settings, ...(res.settings || {}) };

        // Regroupe les références pour le mode admin (édition en direct + sauvegarde).
        this.adminData = {
          topmenu: this.topmenu,
          galleries: this.galleries,
          lists: this.lists,
          fields: this.fields,
          listeavis: this.listeavis,
          services: this.services,
          faq: this.faq,
          trads: this.trads,
          domains: this.domains,
          weddings: this.weddings,
          photographers: this.photographers,
          decos: this.decos,
          portfolio: this.portfolio,
          topportfolio: this.topportfolio,
          images: this.images,
          settings: this.settings,
        };

        this.page = this.topmenu[0];
        this.addListener();
      });
  }

  onDateSelected(event: any) {
    this.fields[4].model = event;
  }

  getCalendarMsg() {
    if (
      this.datesArray.some(
        (d: any) =>
          d.date === this.fields[4].model ||
          (d.essai && d.essai === this.fields[4].model) ||
          (d.linkedDates && d.linkedDates.includes(this.fields[4].model)),
      )
    ) {
      if (this.trad == 'fr')
        return 'Cette date est déjà en partie réservée, je ferai mon possible pour vous accompagner sous réserve de disponibilité.';
      else
        return 'This date is already partially booked; I will do my best to accommodate you, subject to availability.';
    } else {
      return '&nbsp;';
    }
  }

  onScroll(event: any) {
    const target = event.target;

    const scrollLeft = target.scrollLeft;
    const maxScroll = target.scrollWidth - target.clientWidth;

    this.isAtStart = scrollLeft === 0;
    this.isAtEnd = scrollLeft >= maxScroll;
  }

  moveportfolio(div: HTMLElement, i: any) {
    const offset = window.innerWidth * 0.5;
    if (i == -1) div.scrollBy({ left: -offset, behavior: 'smooth' });
    else div.scrollBy({ left: offset, behavior: 'smooth' });
  }
}
