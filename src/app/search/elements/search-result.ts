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
import {decodeLineString} from '../../map/layers/suggestions-layer';

export interface SearchResultInstance {
    toOptionElement(): TemplateResult;

    toDetailElement(): TemplateResult;

    toPoint(): GeoCoord;

    toString(): string;

    // todo set the output type
    toGeoFeature(): any;
}

// todo better composition
export const fromLine = (item: BlockSearchResult | StreetSearchResult): { toPoint(): GeoCoord, toGeoFeature(): any } => ({
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
    },
    toGeoFeature() {
        return decodeLineString(item.geometry);
    }
});

const createCornerSearchResult = (item: CornerSearchResult): SearchResultInstance => {
    return {
        toOptionElement() {
            return html`esquina entre <strong>${item.streets[0]}</strong> y <strong>${item.streets[1]}</strong>,<em class="municipality">${item.municipality}</em>`;
        },
        toDetailElement() {
            return html`
<citykleta-location .location=${item}>
    <span slot="title">${item.streets[0] + ' y ' + item.streets[1]}</span>
</citykleta-location>`;
        },
        toPoint() {
            return {
                lng: item.geometry.coordinates[0],
                lat: item.geometry.coordinates[1]
            };
        },
        toGeoFeature() {
            return item.geometry;
        },
        toString() {
            return `esquina ${item.streets[0]} y ${item.streets[1]}, ${item.municipality}`;
        }
    };
};

const createBlockSearchResult = (item: BlockSearchResult): SearchResultInstance => {
    return Object.assign(fromLine(item), {
        toOptionElement() {
            return html`<strong>${item.name}</strong> entre <strong>${item.intersections[0].name}</strong> y <strong>${item.intersections[1].name}</strong>,<em class="municipality">${item.municipality}</em>`;
        },
        toDetailElement() {
            return html`
<citykleta-location .location=${item}>
    <span slot="title">Cuadra en ${item.name}</span>
</citykleta-location>`;
        },
        toString() {
            return `${item.name} e/ ${item.intersections[0].name} y ${item.intersections[1].name}, ${item.municipality}`;
        }
    });
};

const createStreetSearchResult = (item: StreetSearchResult): SearchResultInstance => {
    return Object.assign(fromLine(item), {
        toOptionElement() {
            return html`<strong>${item.name}</strong>,<em class="municipality">${item.municipality}</em>`;
        },
        toDetailElement() {
            return html`
<citykleta-location .location=${item}></citykleta-location>`;
        },
        toString() {
            return `${item.name}, ${item.municipality}`;
        }
    });
};

const createPointOfInterestSearchResult = (item: PointOfInterestSearchResult): SearchResultInstance => {
    return {
        toOptionElement() {
            return html`${item.name},<em class="municipality">${item.municipality}</em>`;
        },
        toDetailElement() {
            const {address = {}} = item;
            const addressPart = [
                address.street,
                address.number ? `#${address.number}` : ''
            ]
                .filter(Boolean)
                .join(' ');

            return html`
<citykleta-location .location=${item}>
    <div slot="address">${html`${addressPart ? addressPart + ', ' : ''}<em>${item.municipality}</em>`}</div>
</citykleta-location>`;
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
        toGeoFeature() {
            return item.geometry;
        }
    };
};

const createLnLatSearchResult = (item: GeoCoordSearchResult): SearchResultInstance => {
    return {
        toOptionElement(): TemplateResult {
            return html`Pointed location <at></at><em class="municipality">${truncate(item.lng)}, ${truncate(item.lat)}</em>`;
        },
        toDetailElement() {
            return html`
<citykleta-location .location=${item}>
    <span slot="title">Unknown place</span>
</citykleta-location>`;
        },
        toPoint() {
            return {
                lng: item.lng,
                lat: item.lat
            };
        },
        toString(): string {
            return `Pointed location at ${truncate(item.lng)},${truncate(item.lat)}`;
        },
        toGeoFeature() {
            return {
                type: 'Point',
                coordinates: [item.lng, item.lat]
            };
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
