/**
 * HTML for the map incident popup (readable hierarchy + details).
 */

import { memphisAreaName } from "@/lib/memphis-areas";
import {
  escapeHtml,
  formatIncidentDateParts,
  titleCaseCategory,
} from "@/lib/format";

export type IncidentPopupInput = {
  id: string;
  category: string;
  crimeType: string;
  reportedAt: string;
  lat: number;
  lng: number;
};

export function buildIncidentPopupHtml(incident: IncidentPopupInput): string {
  const category = escapeHtml(titleCaseCategory(incident.category));
  const crimeType = escapeHtml(incident.crimeType || "Offense type unavailable");
  const { date, time } = formatIncidentDateParts(incident.reportedAt);
  const area = escapeHtml(`Near ${memphisAreaName(incident.lat, incident.lng)}`);
  const detailsId = `incident-details-${escapeHtml(incident.id).replaceAll(/[^a-zA-Z0-9_-]/g, "")}`;

  return `
    <div class="incident-popup">
      <p class="incident-popup-title">${category}</p>
      <p class="incident-popup-subtitle">${crimeType}</p>
      <ul class="incident-popup-meta">
        <li>
          <span class="incident-popup-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M7 2h2v2h6V2h2v2h3a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h3V2zm12 8H5v9h14v-9zm0-2V6H5v2h14z"/></svg>
          </span>
          <span>${escapeHtml(date)}</span>
        </li>
        <li>
          <span class="incident-popup-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20zm1 5h-2v6l5 3 1-1.7-4-2.3V7z"/></svg>
          </span>
          <span>${escapeHtml(time)}</span>
        </li>
        <li>
          <span class="incident-popup-icon is-pin" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M12 2a7 7 0 0 1 7 7c0 5.25-7 13-7 13S5 14.25 5 9a7 7 0 0 1 7-7zm0 9.5A2.5 2.5 0 1 0 12 6a2.5 2.5 0 0 0 0 5.5z"/></svg>
          </span>
          <span>${area}</span>
        </li>
      </ul>
      <button type="button" class="incident-popup-details" data-details-target="${detailsId}">
        View details <span aria-hidden="true">→</span>
      </button>
      <div id="${detailsId}" class="incident-popup-extra" hidden>
        <p><span>Report ID</span> ${escapeHtml(incident.id)}</p>
        <p><span>Coordinates</span> ${incident.lat.toFixed(4)}, ${incident.lng.toFixed(4)}</p>
      </div>
    </div>
  `;
}
