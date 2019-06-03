import {
    BlockSearchResult,
    CornerSearchResult,
    decodeLine,
    GeoCoord,
    GeoCoordSearchResult,
    PointOfInterestSearchResult,
    SearchResult,
    StreetSearchResult,
    truncate
} from '../../utils';
import {html, TemplateResult} from 'lit-html';

export interface SearchResultInstance {
    toOption(): TemplateResult;

    center(): GeoCoord;

    toString(): string;
}

const createCornerSearchResult = (item: CornerSearchResult): SearchResultInstance => {
    return {
        toOption() {
            return html`corner between <strong>${item.streets[0]}</strong> and <strong>${item.streets[1]}</strong>, <em class="municipality">${item.municipality}</em>`;
        },
        center() {
            return {
                lng: item.geometry.coordinates[0],
                lat: item.geometry.coordinates[1]
            };
        },
        toString() {
            return `esquina ${item.streets[0]} y ${item.streets[1]}, ${item.municipality}`;
        }
    };
};

const createBlockSearchResult = (item: BlockSearchResult): SearchResultInstance => {
    return {
        toOption() {
            return html`<strong>${item.name}</strong> between <strong>${item.intersections[0].name}</strong> and <strong>${item.intersections[1].name}</strong>, <em class="municipality">${item.municipality}</em>`;
        },
        center() {
            const line = decodeLine(item.geometry.coordinates);
            return {
                lng: line[0][0],
                lat: line[0][1]
            };
        },
        toString() {
            return `${item.name} e/ ${item.intersections[0].name} y ${item.intersections[1].name}, ${item.municipality}`;
        }
    };
};

const createStreetSearchResult = (item: StreetSearchResult): SearchResultInstance => {
    return {
        toOption() {
            return html`<strong>${item.name}</strong>, <em class="municipality">${item.municipality}</em>`;
        },
        center() {
            const line = decodeLine(item.geometry.coordinates);
            return {
                lng: line[0][0],
                lat: line[0][1]
            };
        },
        toString() {
            return `${item.name}, ${item.municipality}`;
        }
    };
};

const createPointOfInterestSearchResult = (item: PointOfInterestSearchResult): SearchResultInstance => {
    return {
        toOption() {
            return html`${item.name}, <em class="municipality">${item.municipality}</em>`;
        },
        center() {
            const [lng, lat] = item.geometry.coordinates;
            return {
                lng,
                lat
            };
        },
        toString(): string {
            return `${item.name}, ${item.municipality}`;
        }
    };
};

const createLnLatSearchResult = (item: GeoCoordSearchResult): SearchResultInstance => {
    return {
        toOption(): TemplateResult {
            return html`${truncate(item.lng)},${truncate(item.lat)}`;
        },
        center() {
            return item;
        },
        toString(): string {
            return `${truncate(item.lng)},${truncate(item.lat)}`;
        }
    };
};

export const createSearchResultInstance = (item: SearchResult): SearchResultInstance => {
    switch (item.type) {
        case 'corner':
            return createCornerSearchResult(<CornerSearchResult>item);
        case 'street_block':
            return createBlockSearchResult(<BlockSearchResult>item);
        case 'street':
            return createStreetSearchResult(<StreetSearchResult>item);
        case 'point_of_interest':
            return createPointOfInterestSearchResult(<PointOfInterestSearchResult>item);
        case 'lng_lat':
            return createLnLatSearchResult(<GeoCoordSearchResult>item);
        default:
            throw new Error(`unknown search result type "${item.type}"`);
    }
};
