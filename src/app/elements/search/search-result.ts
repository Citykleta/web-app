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
import midpoint from '@turf/midpoint';

export interface SearchResultInstance {
    toOption(): TemplateResult;

    toPoint(): GeoCoord;

    toString(): string;

    header(): TemplateResult;

    address(): TemplateResult;
}


// todo better composition
export const fromLine = (item: BlockSearchResult | StreetSearchResult): { toPoint(): GeoCoord } => ({
    toPoint() {
        const line = decodeLine(item.geometry.coordinates);
        const points = [line[0], line[line.length - 1]]
            .map(p => p.reverse());
        const center = midpoint(points[0], points[1])
            .geometry
            .coordinates;
        return {
            lng: center[1],
            lat: center[0]
        };
    }
});

const createCornerSearchResult = (item: CornerSearchResult): SearchResultInstance => {
    return {
        toOption() {
            return html`esquina entre <strong>${item.streets[0]}</strong> y <strong>${item.streets[1]}</strong>,<em class="municipality">${item.municipality}</em>`;
        },
        toPoint() {
            return {
                lng: item.geometry.coordinates[0],
                lat: item.geometry.coordinates[1]
            };
        },
        toString() {
            return `esquina ${item.streets[0]} y ${item.streets[1]}, ${item.municipality}`;
        },
        header() {
            return html`${item.streets[0]} y ${item.streets[1]}`;
        },
        address() {
            return this.toOption();
        }
    };
};

const createBlockSearchResult = (item: BlockSearchResult): SearchResultInstance => {
    return Object.assign(fromLine(item), {
        toOption() {
            return html`<strong>${item.name}</strong> entre <strong>${item.intersections[0].name}</strong> y <strong>${item.intersections[1].name}</strong>,<em class="municipality">${item.municipality}</em>`;
        },
        toString() {
            return `${item.name} e/ ${item.intersections[0].name} y ${item.intersections[1].name}, ${item.municipality}`;
        },
        header() {
            return html`Cuadra en ${item.name}`;
        },
        address() {
            return this.toOption();
        }
    });
};

const createStreetSearchResult = (item: StreetSearchResult): SearchResultInstance => {
    return Object.assign(fromLine(item), {
        toOption() {
            return html`<strong>${item.name}</strong>,<em class="municipality">${item.municipality}</em>`;
        },
        toString() {
            return `${item.name}, ${item.municipality}`;
        },
        header(): TemplateResult {
            return html`${item.name}`;
        },
        address(): TemplateResult {
            return this.toOption();
        }
    });
};

const createPointOfInterestSearchResult = (item: PointOfInterestSearchResult): SearchResultInstance => {
    return {
        toOption() {
            return html`${item.name},<em class="municipality">${item.municipality}</em>`;
        },
        toPoint() {
            const [lng, lat] = item.geometry.coordinates;
            return {
                lng,
                lat
            };
        },
        toString() {
            return `${item.name}, ${item.municipality}`;
        },
        header() {
            return html`${item.name}`;
        },
        address() {
            const {address = {}} = item;
            const addressPart = [
                address.street,
                address.number ? `#${address.number}` : ''
            ]
                .filter(Boolean)
                .join(' ');

            return html`${addressPart ? addressPart + ', ' : ''}<em>${item.municipality}</em>`;
        }

    };
};

const createLnLatSearchResult = (item: GeoCoordSearchResult): SearchResultInstance => {
    return {
        toOption(): TemplateResult {
            return html`${truncate(item.lng)},${truncate(item.lat)}`;
        },
        toPoint() {
            return item;
        },
        toString(): string {
            return `${truncate(item.lng)},${truncate(item.lat)}`;
        },
        header(): TemplateResult {
            return html`Geo Point`;
        },
        address(): TemplateResult {
            return html``;
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
