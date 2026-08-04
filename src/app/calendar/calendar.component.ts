
import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, OnInit, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-calendar',
  imports: [CommonModule, FormsModule],
  templateUrl: './calendar.component.html',
  styleUrl: './calendar.component.scss'
})
export class CalendarComponent implements OnInit {
  @Input() availableDates: string[] = []; // format 'DD/MM/YYYY'
  @Input() selectedDate: any; // format 'DD/MM/YYYY'
  @Output() dateSelected = new EventEmitter<string>();

  currentDate = new Date();
  displayMonth: any;
  displayYear: any;
  weeks: any[] = [];


  ngOnInit() {
    // convertir availableDates en tableau de strings 'DD/MM/YYYY'
    this.displayMonth = this.currentDate.getMonth();
    this.displayYear = this.currentDate.getFullYear();
    this.generateCalendar();
  }

  generateCalendar() {
    const firstDay = new Date(this.displayYear, this.displayMonth, 1).getDay();
    const lastDate = new Date(this.displayYear, this.displayMonth + 1, 0).getDate();
    const weeks = [];
    let week = [];

    // ajustement pour démarrer la semaine le lundi
    const offset = firstDay === 0 ? 6 : firstDay - 1;

    // jours vides avant le 1er du mois
    for (let i = 0; i < offset; i++) {
      week.push(null);
    }

    for (let day = 1; day <= lastDate; day++) {
      const dateObj = new Date(this.displayYear, this.displayMonth, day);
      const dateStr = this.formatDate(dateObj);
      const isPast = dateObj < new Date(this.todayWithoutTime());
      const isAvailable = this.availableDates.some((d:any) =>
        d.date === dateStr
        || (d.essai && d.essai === dateStr)
        || (d.linkedDates && d.linkedDates.includes(dateStr))
      );

      week.push({ day, isPast, isAvailable, dateStr });

      if (week.length === 7) {
        weeks.push(week);
        week = [];
      }
    }

    if (week.length > 0) {
      while (week.length < 7) week.push(null);
      weeks.push(week);
    }

    this.weeks = weeks;
  }

  todayWithoutTime() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  formatDate(date: Date) {
    const d = ('0' + date.getDate()).slice(-2);
    const m = ('0' + (date.getMonth() + 1)).slice(-2);
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
  }

  selectDate(dayObj: any) {
    if (!dayObj || dayObj.isPast) return;
    this.dateSelected.emit(dayObj.dateStr);
  }

  prevMonth() {
    this.displayMonth--;
    if (this.displayMonth < 0) {
      this.displayMonth = 11;
      this.displayYear--;
    }
    this.generateCalendar();
  }

  nextMonth() {
    this.displayMonth++;
    if (this.displayMonth > 11) {
      this.displayMonth = 0;
      this.displayYear++;
    }
    this.generateCalendar();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['selectedDate'] && this.selectedDate) {
      // Vérifie que le format est exactement dd/mm/yyyy
      const regex = /^([0-2]\d|3[01])\/(0\d|1[0-2])\/\d{4}$/;
      if (regex.test(this.selectedDate)) {
        const parts = this.selectedDate.split('/');
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);

        this.displayMonth = month;
        this.displayYear = year;
        this.generateCalendar();
      }
    }
  }

}
