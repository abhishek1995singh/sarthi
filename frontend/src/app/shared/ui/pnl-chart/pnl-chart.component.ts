import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChartConfiguration, ChartOptions } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { PnLBucket } from '../../../core/models/models';

/**
 * Income vs cost bars with a profit line overlay, for the Reports "P&L" tab.
 * Colors are read from the active theme's CSS variables at render time.
 */
@Component({
  selector: 'app-pnl-chart',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  template: `
    <div class="pnl-chart-wrap">
      <canvas
        baseChart
        [type]="'bar'"
        [data]="chartData"
        [options]="chartOptions">
      </canvas>
    </div>
  `,
  styles: [`
    .pnl-chart-wrap {
      position: relative;
      height: 240px;
    }
    @media (min-width: 900px) {
      .pnl-chart-wrap { height: 320px; }
    }
  `]
})
export class PnlChartComponent implements OnChanges {
  @Input() buckets: PnLBucket[] = [];

  chartData: ChartConfiguration<'bar'>['data'] = { labels: [], datasets: [] };
  chartOptions: ChartOptions<'bar'> = {};

  ngOnChanges(): void {
    const style = getComputedStyle(document.documentElement);
    const success = style.getPropertyValue('--color-success').trim() || '#1a9e5c';
    const danger = style.getPropertyValue('--color-danger').trim() || '#d64545';
    const primary = style.getPropertyValue('--color-primary').trim() || '#c2661a';
    const muted = style.getPropertyValue('--color-text-muted').trim() || '#8a8a8a';
    const gridColor = style.getPropertyValue('--color-border-subtle').trim() || 'rgba(0,0,0,0.08)';

    this.chartData = {
      labels: this.buckets.map(b => b.label),
      datasets: [
        {
          type: 'bar',
          label: 'Income',
          data: this.buckets.map(b => b.income),
          backgroundColor: success,
          borderRadius: 4,
          order: 2
        },
        {
          type: 'bar',
          label: 'Cost',
          data: this.buckets.map(b => b.cost),
          backgroundColor: danger,
          borderRadius: 4,
          order: 2
        },
        {
          type: 'line',
          label: 'Profit',
          data: this.buckets.map(b => b.profit),
          borderColor: primary,
          backgroundColor: primary,
          tension: 0.3,
          pointRadius: 3,
          order: 1
        }
      ]
    } as ChartConfiguration<'bar'>['data'];

    this.chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      scales: {
        x: { grid: { display: false }, ticks: { color: muted } },
        y: {
          grid: { color: gridColor },
          ticks: {
            color: muted,
            callback: (value) => '₹' + Number(value).toLocaleString('en-IN')
          }
        }
      },
      plugins: {
        legend: { position: 'top', labels: { color: muted, boxWidth: 12, boxHeight: 12 } },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: ₹${Number(ctx.parsed.y).toLocaleString('en-IN')}`
          }
        }
      }
    };
  }
}
